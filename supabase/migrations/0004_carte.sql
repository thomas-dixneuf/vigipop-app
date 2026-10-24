-- Vigipop — carte : position des lieux et hébergement solidaire
-- À coller dans Supabase → SQL Editor → Run, après 0003_contact_demande.sql.

-- Adresse officielle (Base Adresse Nationale) et coordonnées de chaque lieu public
alter table public.lieux
  add column adresse text not null default '' check (length(adresse) <= 200),
  add column lat double precision check (lat between -90 and 90),
  add column lng double precision check (lng between -180 and 180);

-- Données fictives de la commune démo
update public.lieux set lat = 47.0612, lng = -0.8745, adresse = '[ADRESSE DU GYMNASE]'
  where commune_id = '00000000-0000-4000-8000-000000000001' and nom = '[NOM DU GYMNASE]';
update public.lieux set lat = 47.0538, lng = -0.8871, adresse = '[ADRESSE DE LA SALLE]'
  where commune_id = '00000000-0000-4000-8000-000000000001' and nom = '[SALLE DES FÊTES]';
update public.lieux set lat = 47.0581, lng = -0.8802, adresse = '[ADRESSE DU POINT D''EAU]'
  where commune_id = '00000000-0000-4000-8000-000000000001' and nom = '[NOM DU LIEU]';

-- Hébergement solidaire : les habitants voient seulement un nombre, jamais une adresse privée.
-- Compte les volontaires disponibles qui proposent un hébergement pendant la crise en cours.
create function public.hebergements_solidaires(p_commune uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.volontaires v
  join public.crises c on c.commune_id = v.commune_id and c.active
  where v.commune_id = p_commune
    and v.disponible
    and 'heb' = any (v.ressources)
    and v.updated_at >= c.declenchee_a;
$$;

grant execute on function public.hebergements_solidaires(uuid) to anon, authenticated;

-- Zones à éviter, tracées par la mairie et affichées en rouge sur la carte des habitants
create table public.zones_danger (
  id uuid primary key default gen_random_uuid(),
  commune_id uuid not null references public.communes (id) on delete cascade,
  nom text not null check (length(nom) between 3 and 120),
  consigne text not null default '' check (length(consigne) <= 300),
  -- Contour du polygone : [[lat, lng], …], au moins 3 points
  points jsonb not null check (jsonb_typeof(points) = 'array' and jsonb_array_length(points) between 3 and 200),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.zones_danger enable row level security;

create policy "zones lisibles" on public.zones_danger for select to anon, authenticated using (true);
create policy "coordinateur gere les zones" on public.zones_danger for all to authenticated
  using (public.est_coordinateur(commune_id)) with check (public.est_coordinateur(commune_id));

alter publication supabase_realtime add table public.zones_danger;
