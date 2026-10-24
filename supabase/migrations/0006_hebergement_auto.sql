-- Vigipop — hébergement : proposition automatique, la mairie supervise
-- À coller dans Supabase → SQL Editor → Run, après 0005_hebergement.sql.
--
-- Dès qu'une demande coche « Hébergement », le serveur propose le foyer disponible le plus
-- proche qui a assez de places. S'il refuse (ou si la mairie annule), le suivant est sollicité.
-- L'hébergeur garde le dernier mot ; la mairie peut annuler ou proposer un autre foyer.

create function public.attribuer_hebergement(p_demande uuid)
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
  -- Déjà une proposition en cours ou acceptée
  if exists (select 1 from public.hebergements h where h.demande_id = d.id and h.statut in ('proposee', 'acceptee')) then
    return;
  end if;
  -- Seules comptent les disponibilités données pendant la crise en cours
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
    -- Jamais deux fois le même foyer pour la même demande
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
    -- Une autre proposition vient d'être faite en même temps : rien à faire
    null;
  end;
end;
$$;

-- Appelée uniquement par les déclencheurs ci-dessous
revoke execute on function public.attribuer_hebergement(uuid) from public, anon, authenticated;

-- La mairie relance la recherche automatique pour une demande
create function public.relancer_hebergement(p_demande uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.demandes d where d.id = p_demande and public.est_coordinateur(d.commune_id)) then
    raise exception 'Réservé aux coordinateurs de la commune';
  end if;
  perform public.attribuer_hebergement(p_demande);
end;
$$;

grant execute on function public.relancer_hebergement(uuid) to authenticated;

-- Nouvelle demande, ou « Ma situation a changé » avec un besoin d'hébergement
create function public.hebergement_auto_demande()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.attribuer_hebergement(new.id);
  return null;
end;
$$;

create trigger demandes_hebergement_auto after insert or update of besoins, personnes, statut on public.demandes
  for each row execute function public.hebergement_auto_demande();

-- Refus ou désistement de l'hébergeur : on sollicite le foyer suivant.
-- Quand c'est la mairie qui annule, elle choisit elle-même la suite (foyer précis ou relance).
create function public.hebergement_auto_relance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.statut is distinct from new.statut
     and (new.statut = 'refusee' or (new.statut = 'annulee' and not public.est_coordinateur(new.commune_id))) then
    perform public.attribuer_hebergement(new.demande_id);
  end if;
  return null;
end;
$$;

create trigger hebergements_auto_relance after update of statut on public.hebergements
  for each row execute function public.hebergement_auto_relance();

-- Un nouveau foyer se déclare : on lui propose les demandes encore sans solution, les plus anciennes d'abord
create function public.hebergement_auto_volontaire()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  dem uuid;
begin
  if not new.disponible or not ('heb' = any (new.ressources)) or new.places_hebergement < 1 then
    return null;
  end if;
  for dem in
    select d.id from public.demandes d
    where d.commune_id = new.commune_id and 'heb' = any (d.besoins) and d.statut <> 'close'
      and not exists (select 1 from public.hebergements h where h.demande_id = d.id and h.statut in ('proposee', 'acceptee'))
    order by d.created_at
  loop
    perform public.attribuer_hebergement(dem);
  end loop;
  return null;
end;
$$;

create trigger volontaires_hebergement_auto after insert or update of disponible, ressources, places_hebergement, lat, lng on public.volontaires
  for each row execute function public.hebergement_auto_volontaire();
