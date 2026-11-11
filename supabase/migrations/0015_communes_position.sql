-- Vigipop — services de la ville où l'on se trouve
-- À coller dans Supabase → SQL Editor → Run, après 0014_rgpd.sql.
--
-- Avec son accord, le téléphone de l'habitant demande « dans quelle commune Vigipop suis-je ? »
-- pour afficher les lieux, risques et alertes de la ville qu'il visite.
-- La position envoyée sert au calcul et n'est JAMAIS enregistrée : aucune table, aucun journal.
-- Rien n'est collecté pour des statistiques de passage (idée à valider avec la CNIL d'abord).

-- 1. Centre et rayon de chaque commune, renseignés par la mairie
alter table public.communes
  add column lat double precision check (lat between -90 and 90),
  add column lng double precision check (lng between -180 and 180),
  add column rayon_km numeric(4, 1) not null default 5 check (rayon_km between 0.5 and 50);

grant update (lat, lng, rayon_km) on public.communes to authenticated;
-- La règle « coordinateur renomme sa commune » (0009) limite déjà la mise à jour à sa propre commune

-- 2. Commune Vigipop la plus proche dont le rayon couvre la position (aucune ligne : zone sans Vigipop)
create function public.commune_a_proximite(p_lat double precision, p_lng double precision)
returns table (id uuid, nom text, lat double precision, lng double precision)
language sql
stable
set search_path = ''
as $$
  select c.id, c.nom, c.lat, c.lng
  from (
    select c.id, c.nom, c.lat, c.lng, c.rayon_km,
      -- Distance à vol d'oiseau en km (haversine)
      6371 * 2 * asin(least(1, sqrt(
        power(sin(radians(p_lat - c.lat) / 2), 2)
        + cos(radians(p_lat)) * cos(radians(c.lat)) * power(sin(radians(p_lng - c.lng) / 2), 2)
      ))) as distance_km
    from public.communes c
    where c.lat is not null and c.lng is not null
  ) c
  where p_lat between -90 and 90 and p_lng between -180 and 180
    and c.distance_km <= c.rayon_km
  order by c.distance_km
  limit 1;
$$;

revoke execute on function public.commune_a_proximite(double precision, double precision) from public;
grant execute on function public.commune_a_proximite(double precision, double precision) to anon, authenticated;

-- Commune de démonstration : centre fictif du prototype (src/data/fictif.ts)
update public.communes set lat = 47.0585, lng = -0.88
where id = '00000000-0000-4000-8000-000000000001' and lat is null;
