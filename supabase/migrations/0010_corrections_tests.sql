-- Vigipop — corrections après les tests du 24/10/2026
-- À coller dans Supabase → SQL Editor → Run, après 0009_nom_commune.sql.
--
-- 1. Risques de la commune, saisis par la mairie (affichés dans l'app seulement s'ils existent)
-- 2. Lieu de rendez-vous des missions placé sur la carte (adresse officielle)
-- 3. « Aide organisée » : la mairie écrit ce qui est prévu, l'habitant le lit dans l'app
-- 4. Nom de famille des volontaires
-- 5. Fin de crise : les demandes encore ouvertes sont closes, chaque habitant est invité
--    à refaire une demande s'il a encore besoin d'aide

-- 1. Risques
alter table public.communes
  add column risques text[] not null default '{}'
    check (cardinality(risques) <= 12);
grant update (risques) on public.communes to authenticated;

-- 2. Rendez-vous des missions
alter table public.missions
  add column adresse text not null default '' check (length(adresse) <= 200),
  add column lat double precision check (lat between -90 and 90),
  add column lng double precision check (lng between -180 and 180);

-- 3. Message de la mairie à l'habitant
alter table public.demandes
  add column reponse_mairie text not null default '' check (length(reponse_mairie) <= 300);

-- L'habitant ne modifie jamais le statut ni le message de la mairie (sauf avancée automatique)
create or replace function public.proteger_maj_demande()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.est_coordinateur(old.commune_id) then
    if coalesce(current_setting('vigipop.suivi_auto', true), '') <> 'on' then
      new.statut := old.statut;
    end if;
    new.auteur := old.auteur;
    new.commune_id := old.commune_id;
    new.reference := old.reference;
    new.reponse_mairie := old.reponse_mairie;
  end if;
  return new;
end;
$$;

-- Alerte du téléphone : le message de la mairie est repris dans le texte
create or replace function public.push_demande()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Fin de crise : un seul message pour toute la commune, pas un par demande
  if coalesce(current_setting('vigipop.fin_crise', true), '') = 'on' then
    return null;
  end if;
  if (new.statut is distinct from old.statut and new.statut in ('prise_en_charge', 'aide_organisee', 'close'))
     or (new.statut = 'aide_organisee' and new.reponse_mairie is distinct from old.reponse_mairie and new.reponse_mairie <> '') then
    perform public.mettre_en_file(new.commune_id, array[new.auteur],
      'demande:' || new.id || ':' || new.statut || ':' || md5(new.reponse_mairie),
      case new.statut
        when 'prise_en_charge' then 'Votre demande est prise en charge'
        when 'aide_organisee' then 'Aide organisée pour votre demande'
        else 'Votre demande est close' end,
      case when new.reponse_mairie <> '' then new.reponse_mairie
           else 'Demande ' || new.reference || ' · ouvrez Vigipop pour le détail.' end,
      '/demande');
  end if;
  return null;
end;
$$;

drop trigger demandes_push on public.demandes;
create trigger demandes_push after update of statut, reponse_mairie on public.demandes
  for each row execute function public.push_demande();

-- 4. Nom de famille
alter table public.volontaires
  add column nom text not null default '' check (length(nom) <= 60);

-- 5. Fin de crise
create or replace function public.push_crise()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.active then
      perform public.mettre_en_file(new.commune_id, null, 'crise:' || new.id || ':' || new.consigne,
        'Mode crise activé par la mairie', new.titre || ' — ' || new.consigne, '/accueil');
    end if;
  elsif old.active and not new.active then
    perform public.mettre_en_file(new.commune_id, null, 'fin:' || new.id,
      'Fin de la crise',
      'La mairie a levé l''alerte : ' || new.titre || '. Si vous avez encore besoin d''aide, mettez à jour votre situation dans Vigipop.',
      '/accueil');
  elsif new.active and new.consigne is distinct from old.consigne then
    perform public.mettre_en_file(new.commune_id, null, 'crise:' || new.id || ':' || new.consigne,
      'Nouvelle consigne de la mairie', new.consigne, '/accueil');
  end if;
  return null;
end;
$$;

create function public.clore_demandes_fin_de_crise()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.active and not new.active then
    perform set_config('vigipop.fin_crise', 'on', true);
    update public.demandes set statut = 'close'
    where commune_id = new.commune_id and statut <> 'close';
    -- Hébergements encore en attente de réponse : sans objet
    update public.hebergements set statut = 'annulee'
    where commune_id = new.commune_id and statut = 'proposee';
    perform set_config('vigipop.fin_crise', '', true);
  end if;
  return null;
end;
$$;

create trigger crises_fin_demandes after update of active on public.crises
  for each row execute function public.clore_demandes_fin_de_crise();
