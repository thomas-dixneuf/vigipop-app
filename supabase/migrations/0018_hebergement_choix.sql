-- Vigipop — hébergement : la mairie choisit l'automatique, la personne sinistrée peut demander un autre foyer
-- À coller dans Supabase → SQL Editor → Run, après 0017_partenaires.sql.
--
-- 1. Répartition automatique réglable par la mairie (communes.hebergement_auto, activée par défaut).
--    Désactivée : aucun foyer n'est sollicité tout seul ; la mairie propose elle-même (foyer précis ou
--    « Proposer automatiquement » pour une demande).
-- 2. Une fois qu'un foyer a accepté, la personne sinistrée voit l'offre et peut répondre « Ne me convient pas ».
--    Le foyer est libéré et prévenu, et le foyer disponible suivant est sollicité (jamais deux fois le même),
--    jusqu'à ce qu'elle trouve un hébergement qui lui convient.

alter table public.communes add column hebergement_auto boolean not null default true;
grant update (hebergement_auto) on public.communes to authenticated;

alter table public.hebergements drop constraint hebergements_statut_check;
alter table public.hebergements add constraint hebergements_statut_check
  check (statut in ('proposee', 'acceptee', 'refusee', 'annulee', 'declinee'));

-- Même recherche qu'en 0006, sauf quand la mairie a coupé l'automatique (p_manuel : c'est la mairie qui demande)
drop function public.attribuer_hebergement(uuid);
create function public.attribuer_hebergement(p_demande uuid, p_manuel boolean default false)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.demandes;
  debut timestamptz;
  choisi uuid;
begin
  select * into d from public.demandes where id = p_demande;
  if d.id is null or not ('heb' = any (d.besoins)) or d.statut = 'close' then
    return;
  end if;
  if not p_manuel and not coalesce((select c.hebergement_auto from public.communes c where c.id = d.commune_id), true) then
    return;
  end if;
  if exists (select 1 from public.hebergements h where h.demande_id = d.id and h.statut in ('proposee', 'acceptee')) then
    return;
  end if;
  select c.declenchee_a into debut from public.crises c where c.commune_id = d.commune_id and c.active;
  if debut is null then
    return;
  end if;

  select v.auteur into choisi
  from public.volontaires v
  left join lateral (
    select coalesce(sum(h.personnes), 0) as occupees
    from public.hebergements h
    where h.hebergeur = v.auteur and h.statut in ('proposee', 'acceptee')
  ) o on true
  left join lateral (
    select (regexp_match(d.position, '^\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\s*$'))::float8[] as p
  ) pos on true
  where v.commune_id = d.commune_id
    and v.disponible
    and v.updated_at >= debut
    and 'heb' = any (v.ressources)
    and v.auteur is distinct from d.auteur
    and v.places_hebergement - o.occupees >= least(d.personnes, 20)
    -- Jamais deux fois le même foyer pour la même demande (refusé, ou décliné par la personne)
    and not exists (select 1 from public.hebergements h where h.demande_id = d.id and h.hebergeur = v.auteur)
  order by
    case when pos.p is not null and v.lat is not null and v.lng is not null
      then power(v.lat - pos.p[1], 2) + power((v.lng - pos.p[2]) * cos(radians(pos.p[1])), 2)
    end asc nulls last,
    v.updated_at
  limit 1;

  if choisi is null then
    return;
  end if;
  begin
    insert into public.hebergements (commune_id, demande_id, hebergeur, personnes)
    values (d.commune_id, d.id, choisi, least(d.personnes, 20));
  exception when unique_violation then
    null;
  end;
end;
$$;

revoke execute on function public.attribuer_hebergement(uuid, boolean) from public, anon, authenticated;

create or replace function public.relancer_hebergement(p_demande uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.demandes d where d.id = p_demande and public.est_coordinateur(d.commune_id)) then
    raise exception 'Réservé aux coordinateurs de la commune';
  end if;
  perform public.attribuer_hebergement(p_demande, true);
end;
$$;

-- Refus de l'hébergeur ou « Ne me convient pas » de la personne : foyer suivant (si l'automatique est activé)
create or replace function public.hebergement_auto_relance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.statut is distinct from new.statut
     and (new.statut in ('refusee', 'declinee') or (new.statut = 'annulee' and not public.est_coordinateur(new.commune_id))) then
    perform public.attribuer_hebergement(new.demande_id);
  end if;
  return null;
end;
$$;

-- La personne sinistrée peut aussi répondre, mais seulement « ne me convient pas » à une offre acceptée
create or replace function public.proteger_hebergement()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.est_coordinateur(old.commune_id) then
    return new;
  end if;
  if old.statut = 'acceptee' and new.statut = 'declinee'
     and exists (select 1 from public.demandes d where d.id = old.demande_id and d.auteur = auth.uid()) then
    null;
  elsif old.statut <> 'proposee' and not (old.statut = 'acceptee' and new.statut = 'annulee') then
    raise exception 'Cette proposition n''attend plus de réponse';
  elsif new.statut not in ('acceptee', 'refusee', 'annulee') then
    raise exception 'Réponse invalide';
  end if;
  new.commune_id := old.commune_id;
  new.demande_id := old.demande_id;
  new.hebergeur := old.hebergeur;
  new.personnes := old.personnes;
  return new;
end;
$$;

-- « Ne me convient pas » : appelé par la personne sinistrée depuis l'app
create function public.decliner_hebergement(p_demande uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.hebergements h set statut = 'declinee', updated_at = now()
  from public.demandes d
  where h.demande_id = p_demande and d.id = h.demande_id and d.auteur = auth.uid() and h.statut = 'acceptee';
  if not found then
    raise exception 'Aucun hébergement accepté pour cette demande';
  end if;
end;
$$;

revoke execute on function public.decliner_hebergement(uuid) from public, anon;
grant execute on function public.decliner_hebergement(uuid) to authenticated;

-- Notifications : l'hébergeur est prévenu qu'il est libéré
create or replace function public.push_hebergement()
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
    perform public.mettre_en_file(new.commune_id, array[demandeur], 'heb-trouve:' || new.id,
      'Hébergement trouvé', 'Un habitant accepte de vous accueillir : adresse et itinéraire dans Vigipop.', '/demande');
  elsif new.statut = 'declinee' and tg_op = 'UPDATE' and old.statut is distinct from new.statut then
    perform public.mettre_en_file(new.commune_id, array[new.hebergeur], 'heb-declinee:' || new.id,
      'Hébergement : merci', 'La personne a trouvé une autre solution. Vos places sont de nouveau libres.', '/accueil');
  end if;
  return null;
end;
$$;

-- Offre déclinée : la demande redevient « prise en charge » tant qu'aucun autre foyer n'a accepté
create or replace function public.hebergement_suivi_demande()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.statut = 'acceptee' and old.statut is distinct from new.statut then
    perform set_config('vigipop.suivi_auto', 'on', true);
    update public.demandes d
    set statut = case when d.besoins <@ array['heb'] then 'aide_organisee' else 'prise_en_charge' end
    where d.id = new.demande_id and d.statut in ('transmise', 'prise_en_charge')
      and d.statut is distinct from (case when d.besoins <@ array['heb'] then 'aide_organisee' else 'prise_en_charge' end);
    perform set_config('vigipop.suivi_auto', '', true);
  elsif new.statut = 'declinee' and old.statut is distinct from new.statut then
    perform set_config('vigipop.suivi_auto', 'on', true);
    update public.demandes d set statut = 'prise_en_charge'
    where d.id = new.demande_id and d.statut = 'aide_organisee'
      and not exists (select 1 from public.hebergements h where h.demande_id = d.id and h.statut = 'acceptee');
    perform set_config('vigipop.suivi_auto', '', true);
  end if;
  return null;
end;
$$;
