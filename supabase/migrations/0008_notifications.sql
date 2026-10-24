-- Vigipop — notifications push (app fermée)
-- À coller dans Supabase → SQL Editor → Run, après 0007_missions_ciblees.sql.
-- Puis suivre docs/NOTIFICATIONS.md : clés, fonction « envoyer-push », webhook.
--
-- Les événements importants sont écrits dans une file (notifications_push) par des déclencheurs.
-- Un webhook Supabase appelle la fonction « envoyer-push » à chaque nouvelle ligne : elle envoie
-- l'alerte aux téléphones abonnés. Complète FR-Alert, ne le remplace jamais.

-- Téléphones abonnés aux alertes (un par navigateur)
create table public.abonnements_push (
  endpoint text primary key check (length(endpoint) between 10 and 1000),
  auteur uuid not null default auth.uid(),
  commune_id uuid not null references public.communes (id) on delete cascade,
  p256dh text not null check (length(p256dh) <= 200),
  auth text not null check (length(auth) <= 100),
  created_at timestamptz not null default now()
);

alter table public.abonnements_push enable row level security;

create policy "habitant s abonne" on public.abonnements_push for insert to authenticated
  with check (auteur = auth.uid());
create policy "habitant met a jour son abonnement" on public.abonnements_push for update to authenticated
  using (auteur = auth.uid()) with check (auteur = auth.uid());
create policy "habitant voit son abonnement" on public.abonnements_push for select to authenticated
  using (auteur = auth.uid());
create policy "habitant se desabonne" on public.abonnements_push for delete to authenticated
  using (auteur = auth.uid());

-- File des alertes à envoyer. Lue seulement par la fonction serveur (clé de service, côté Supabase).
create table public.notifications_push (
  id bigint generated always as identity primary key,
  commune_id uuid not null references public.communes (id) on delete cascade,
  -- null : tous les abonnés de la commune
  destinataires uuid[],
  cle text not null,
  titre text not null,
  texte text not null default '',
  lien text not null default '/accueil',
  created_at timestamptz not null default now(),
  envoyee_a timestamptz
);

alter table public.notifications_push enable row level security;
-- Aucune règle : ni l'app ni la mairie ne lisent ou n'écrivent cette file directement.

create function public.mettre_en_file(p_commune uuid, p_destinataires uuid[], p_cle text, p_titre text, p_texte text, p_lien text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications_push (commune_id, destinataires, cle, titre, texte, lien)
  select p_commune, p_destinataires, p_cle, left(p_titre, 120), left(p_texte, 300), p_lien
  -- Liste de destinataires vide : personne à prévenir
  where p_destinataires is null or cardinality(p_destinataires) > 0;
$$;

revoke execute on function public.mettre_en_file(uuid, uuid[], text, text, text, text) from public, anon, authenticated;

-- Crise : déclenchement, nouvelle consigne, fin → tous les habitants abonnés
create function public.push_crise()
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
      'Fin de la crise', 'La mairie a levé l''alerte : ' || new.titre, '/accueil');
  elsif new.active and new.consigne is distinct from old.consigne then
    perform public.mettre_en_file(new.commune_id, null, 'crise:' || new.id || ':' || new.consigne,
      'Nouvelle consigne de la mairie', new.consigne, '/accueil');
  end if;
  return null;
end;
$$;

create trigger crises_push after insert or update on public.crises
  for each row execute function public.push_crise();

-- Suivi de la demande d'aide → son auteur
create function public.push_demande()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.statut is distinct from old.statut and new.statut in ('prise_en_charge', 'aide_organisee', 'close') then
    perform public.mettre_en_file(new.commune_id, array[new.auteur], 'demande:' || new.id || ':' || new.statut,
      case new.statut
        when 'prise_en_charge' then 'Votre demande est prise en charge'
        when 'aide_organisee' then 'Aide organisée pour votre demande'
        else 'Votre demande est close' end,
      'Demande ' || new.reference || ' · ouvrez Vigipop pour le détail.', '/demande');
  end if;
  return null;
end;
$$;

create trigger demandes_push after update of statut on public.demandes
  for each row execute function public.push_demande();

-- Nouvelle mission → volontaires disponibles qui offrent ce type d'aide
create function public.push_mission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  debut timestamptz;
begin
  select c.declenchee_a into debut from public.crises c where c.commune_id = new.commune_id and c.active;
  if debut is null then
    return null;
  end if;
  perform public.mettre_en_file(new.commune_id,
    array(select v.auteur from public.volontaires v
          where v.commune_id = new.commune_id and v.disponible and v.updated_at >= debut
            and (new.categorie = '' or new.categorie = any (v.ressources))),
    'mission:' || new.id, 'Nouvelle mission proposée', new.titre || ' · rendez-vous ' || new.rendez_vous, '/mission');
  return null;
end;
$$;

create trigger missions_push after insert on public.missions
  for each row execute function public.push_mission();

-- Hébergement : proposition → hébergeur ; accord → personne hébergée
create function public.push_hebergement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  demandeur uuid;
begin
  if new.statut = 'proposee' and (tg_op = 'INSERT' or old.statut is distinct from new.statut) then
    perform public.mettre_en_file(new.commune_id, array[new.hebergeur], 'heb-proposee:' || new.id,
      'Demande d''hébergement', 'Pouvez-vous accueillir ' || new.personnes || ' personne(s) sinistrée(s) ? Répondez dans Vigipop.', '/accueil');
  elsif new.statut = 'acceptee' and tg_op = 'UPDATE' and old.statut is distinct from new.statut then
    select d.auteur into demandeur from public.demandes d where d.id = new.demande_id;
    perform public.mettre_en_file(new.commune_id, array[demandeur], 'heb-trouve:' || new.demande_id,
      'Hébergement trouvé', 'Un habitant accepte de vous accueillir : adresse et itinéraire dans Vigipop.', '/demande');
  end if;
  return null;
end;
$$;

create trigger hebergements_push after insert or update of statut on public.hebergements
  for each row execute function public.push_hebergement();
