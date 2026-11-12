-- Vigipop — 0016 : effacement des comptes inactifs, sans piéger les habitants
-- À coller dans Supabase → SQL Editor → Run, après 0015.
--
-- Vigipop est fait pour dormir des années sur le téléphone jusqu'au jour d'une catastrophe.
-- L'inactivité ne se juge donc pas sur les connexions (le code SMS n'est demandé qu'une fois),
-- mais sur l'OUVERTURE de l'app : une simple ouverture, même sans rien faire, garde le compte.
--
-- Calendrier (durées proposées, à valider avec le juriste et le DPO de la commune) :
--   - 3 ans sans ouverture - 30 jours : 1er rappel (notification + SMS)
--   - 3 ans sans ouverture - 7 jours  : 2e rappel (notification + SMS)
--   - 3 ans sans ouverture, et 2 rappels envoyés : effacement du compte
-- Jamais d'effacement pendant une crise dans sa commune, ni avec une demande d'aide en cours.
-- Jamais d'effacement sans rappel réellement parti : notification, ou SMS marqué envoyé par la passerelle.
-- Ouvrir l'app après un rappel annule tout et repart pour 3 ans.
-- La demande d'aide n'exige jamais de compte : un compte effacé ne bloque jamais un appel à l'aide.

-- Dernière ouverture de l'app par chaque habitant (aucune autre donnée)
create table public.activite_comptes (
  auteur uuid primary key references auth.users (id) on delete cascade,
  derniere_ouverture timestamptz not null default now(),
  -- 0 : aucun rappel ; 1 : rappel J-30 envoyé ; 2 : rappel J-7 envoyé
  rappels smallint not null default 0 check (rappels between 0 and 2),
  dernier_rappel timestamptz,
  -- Vrai si le dernier rappel a pu partir en notification (téléphone abonné aux alertes)
  notifie boolean not null default false
);
alter table public.activite_comptes enable row level security;
-- Aucune règle : lue et écrite seulement par les fonctions ci-dessous.

-- Comptes effacés pour inactivité : seulement l'identifiant technique (aucun nom ni numéro),
-- pour que l'app puisse dire « votre compte a été effacé » au lieu d'une erreur. Gardé 1 an.
create table public.comptes_effaces (
  id uuid primary key,
  efface_le timestamptz not null default now()
);
alter table public.comptes_effaces enable row level security;

-- SMS à envoyer par la passerelle SMS (à brancher, voir docs/SMS.md). Lue avec la clé de service.
create table public.sms_a_envoyer (
  id bigint generated always as identity primary key,
  telephone text not null check (length(telephone) <= 20),
  texte text not null check (length(texte) <= 320),
  created_at timestamptz not null default now(),
  envoye_a timestamptz
);
alter table public.sms_a_envoyer enable row level security;

-- Appelée par l'app à l'ouverture (une fois par jour au plus). Répond :
--   'actif'   : compte trouvé, ouverture enregistrée (les rappels sont annulés)
--   'efface'  : compte effacé pour inactivité → l'app l'explique et propose de le recréer
--   'inconnu' : rien à dire (session anonyme, autre téléphone…)
create function public.etat_compte(p_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_id is null then
    return 'inconnu';
  end if;
  if exists (select 1 from public.comptes_effaces where id = p_id) then
    return 'efface';
  end if;
  -- Seul le titulaire du compte peut enregistrer son ouverture
  if auth.uid() = p_id and exists (select 1 from auth.users where id = p_id) then
    insert into public.activite_comptes (auteur) values (p_id)
    on conflict (auteur) do update
      set derniere_ouverture = now(), rappels = 0, dernier_rappel = null, notifie = false;
    return 'actif';
  end if;
  return 'inconnu';
end;
$$;
revoke execute on function public.etat_compte(uuid) from public;
grant execute on function public.etat_compte(uuid) to anon, authenticated;

-- Rappels avant effacement : notification sur le téléphone (si abonné) ET SMS (toujours, le numéro
-- est vérifié à l'inscription). Appelée chaque nuit par effacer_donnees_expirees().
create function public.rappeler_comptes_inactifs()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c record;
  rappel smallint;
  date_effacement text;
  texte text;
begin
  for c in
    select u.id, u.phone,
           coalesce(a.derniere_ouverture, u.last_sign_in_at, u.created_at) as ouverture,
           coalesce(a.rappels, 0) as rappels
    from auth.users u
    left join public.activite_comptes a on a.auteur = u.id
    where not coalesce(u.is_anonymous, false)
      and (
        (coalesce(a.rappels, 0) = 0 and coalesce(a.derniere_ouverture, u.last_sign_in_at, u.created_at) < now() - interval '3 years' + interval '30 days')
        -- 2e rappel : à J-7, et jamais moins de 23 jours après le 1er (au moins 30 jours de préavis)
        or (a.rappels = 1 and a.derniere_ouverture < now() - interval '3 years' + interval '7 days'
            and a.dernier_rappel < now() - interval '23 days')
      )
  loop
    rappel := c.rappels + 1;
    -- Compte déjà inactif depuis plus longtemps (mise en service) : le préavis reste de 30 jours
    date_effacement := to_char(greatest(c.ouverture + interval '3 years',
      now() + case when rappel = 1 then interval '30 days' else interval '7 days' end), 'DD/MM/YYYY');
    texte := 'Vigipop : sans ouverture de l''app, votre compte sera effacé le ' || date_effacement
      || ' (RGPD). Pour le garder, ouvrez simplement l''app. Une demande d''aide reste toujours possible sans compte.';

    -- Notification sur chaque téléphone abonné, dans sa commune
    perform public.mettre_en_file(ab.commune_id, array[c.id], 'compte-inactif-' || rappel,
      'Gardez votre compte Vigipop', texte, '/accueil')
    from (select distinct commune_id from public.abonnements_push where auteur = c.id) ab;

    if coalesce(c.phone, '') <> '' then
      insert into public.sms_a_envoyer (telephone, texte) values ('+' || ltrim(c.phone, '+'), left(texte, 320));
    end if;

    insert into public.activite_comptes (auteur, derniere_ouverture, rappels, dernier_rappel, notifie)
    values (c.id, c.ouverture, rappel, now(), exists (select 1 from public.abonnements_push where auteur = c.id))
    on conflict (auteur) do update
      set rappels = rappel, dernier_rappel = now(),
          notifie = exists (select 1 from public.abonnements_push where auteur = c.id);
  end loop;
end;
$$;
revoke execute on function public.rappeler_comptes_inactifs() from public, anon, authenticated;

-- Effacement : 3 ans sans ouverture, 2 rappels envoyés, le dernier il y a au moins 7 jours.
create function public.effacer_comptes_inactifs()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  c record;
  nombre integer := 0;
begin
  for c in
    select a.auteur as id
    from public.activite_comptes a
    join auth.users u on u.id = a.auteur
    where not coalesce(u.is_anonymous, false)
      and a.rappels = 2
      and a.dernier_rappel < now() - interval '7 days'
      and a.derniere_ouverture < now() - interval '3 years'
      -- Le dernier rappel est vraiment parti : notification, ou SMS envoyé par la passerelle
      and (
        a.notifie
        or exists (
          select 1 from public.sms_a_envoyer s
          where s.telephone = '+' || ltrim(u.phone, '+')
            and s.envoye_a is not null
            and s.created_at >= a.dernier_rappel - interval '1 hour'
        )
      )
      -- Demande d'aide en cours : on attend qu'elle soit close
      and not exists (select 1 from public.demandes d where d.auteur = a.auteur and d.statut <> 'close')
      -- Crise en cours dans sa commune : on n'efface rien
      and not exists (
        select 1 from public.crises cr
        where cr.active and cr.commune_id in (
          select commune_id from public.abonnements_push where auteur = a.auteur
          union select commune_id from public.volontaires where auteur = a.auteur
        )
      )
  loop
    -- Mêmes effacements que supprimer_mon_compte() (0014)
    delete from public.volontaires where auteur = c.id;
    delete from public.reponses_mission where auteur = c.id;
    delete from public.abonnements_push where auteur = c.id;
    delete from public.demandes where auteur = c.id;
    insert into public.comptes_effaces (id) values (c.id) on conflict do nothing;
    delete from auth.users where id = c.id;
    nombre := nombre + 1;
  end loop;
  -- Trace gardée 1 an, puis oubliée
  delete from public.comptes_effaces where efface_le < now() - interval '1 year';
  delete from public.sms_a_envoyer where created_at < now() - interval '30 days';
  return nombre;
end;
$$;
revoke execute on function public.effacer_comptes_inactifs() from public, anon, authenticated;

-- Tâche de chaque nuit (0014) : on y ajoute les rappels puis l'effacement des comptes inactifs
create or replace function public.effacer_donnees_expirees()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.demandes where statut = 'close' and updated_at < now() - interval '30 days';
  delete from public.notifications_push where created_at < now() - interval '7 days';
  -- Téléphones sans compte : plus aucune demande ni fiche volontaire, inactifs depuis 30 jours
  delete from auth.users u
  where u.is_anonymous
    and coalesce(u.last_sign_in_at, u.created_at) < now() - interval '30 days'
    and not exists (select 1 from public.demandes d where d.auteur = u.id)
    and not exists (select 1 from public.volontaires v where v.auteur = u.id);
  -- Comptes : rappels d'abord, effacement ensuite (jamais sans deux rappels)
  perform public.rappeler_comptes_inactifs();
  perform public.effacer_comptes_inactifs();
end;
$$;
revoke execute on function public.effacer_donnees_expirees() from public, anon, authenticated;
