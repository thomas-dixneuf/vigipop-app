-- Vigipop — zones exposées aux risques connus de la commune
-- À coller dans Supabase → SQL Editor → Run, après 0011_entraide_auto.sql.
--
-- Contours repris du TIM (transmission d'informations au maire, établie par la préfecture
-- et fournie par la commune) ou du DICRIM. Contrairement aux zones à éviter (rouges, tracées
-- pendant une crise), elles sont permanentes : les habitants les voient aussi en veille,
-- pour savoir s'ils habitent une zone exposée et se préparer.
create table public.zones_risque (
  id uuid primary key default gen_random_uuid(),
  commune_id uuid not null references public.communes (id) on delete cascade,
  -- Risque concerné, au même libellé que la liste des risques de la commune (ex. « Inondation »)
  risque text not null check (length(risque) between 2 and 60),
  nom text not null check (length(nom) between 3 and 120),
  consigne text not null default '' check (length(consigne) <= 300),
  -- Document d'origine, affiché aux habitants (ex. « TIM 2024 »)
  source text not null default 'TIM' check (length(source) between 2 and 120),
  -- Contour du polygone : [[lat, lng], …] ; un import GeoJSON peut compter beaucoup de points
  points jsonb not null check (jsonb_typeof(points) = 'array' and jsonb_array_length(points) between 3 and 2000),
  created_at timestamptz not null default now()
);

create index zones_risque_commune on public.zones_risque (commune_id);

alter table public.zones_risque enable row level security;

-- Information publique : lisible sans compte, comme la carte
create policy "zones de risque lisibles" on public.zones_risque for select to anon, authenticated using (true);
create policy "coordinateur gere les zones de risque" on public.zones_risque for all to authenticated
  using (public.est_coordinateur(commune_id)) with check (public.est_coordinateur(commune_id));

alter publication supabase_realtime add table public.zones_risque;
