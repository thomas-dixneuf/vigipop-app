-- Vigipop : base de démonstration (données fictives uniquement)
-- À coller dans Supabase → SQL Editor → New query → Run.
--
-- Qui peut faire quoi :
--   * tout le monde (même sans session) lit les crises, lieux et missions de sa commune ;
--   * un habitant (session anonyme ou compte) crée ses demandes et ne voit que les siennes ;
--   * un coordinateur (table coordinateurs) gère la crise, les demandes et les lieux de SA commune.

create extension if not exists pgcrypto;

-- ─── Tables ──────────────────────────────────────────────────────────────

create table public.communes (
  id uuid primary key default gen_random_uuid(),
  nom text not null
);

create table public.coordinateurs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  commune_id uuid not null references public.communes (id) on delete cascade,
  nom text not null
);

create table public.crises (
  id uuid primary key default gen_random_uuid(),
  commune_id uuid not null references public.communes (id) on delete cascade,
  titre text not null check (length(titre) between 3 and 140),
  consigne text not null check (length(consigne) between 3 and 400),
  active boolean not null default true,
  declenchee_par uuid default auth.uid(),
  declenchee_a timestamptz not null default now(),
  terminee_a timestamptz
);
-- Une seule crise active à la fois par commune
create unique index crises_une_active on public.crises (commune_id) where active;

create table public.lieux (
  id uuid primary key default gen_random_uuid(),
  commune_id uuid not null references public.communes (id) on delete cascade,
  type text not null check (type in ('accueil', 'eau', 'soins', 'autre')),
  nom text not null,
  details text not null default '',
  distance text not null default '',
  places integer check (places >= 0),
  ouvert boolean not null default false
);

create table public.demandes (
  id uuid primary key default gen_random_uuid(),
  commune_id uuid not null references public.communes (id) on delete cascade,
  reference text not null,
  auteur uuid not null default auth.uid(),
  situation text not null check (situation in ('sinistre', 'bloque', 'evac', 'blesse')),
  besoins text[] not null default '{}',
  personnes integer not null default 1 check (personnes between 1 and 50),
  personne_vulnerable boolean not null default false,
  position text not null check (length(position) <= 200),
  statut text not null default 'transmise'
    check (statut in ('transmise', 'prise_en_charge', 'aide_organisee', 'close')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index demandes_commune on public.demandes (commune_id, created_at desc);

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  commune_id uuid not null references public.communes (id) on delete cascade,
  titre text not null,
  rendez_vous text not null,
  duree text not null default '',
  lieu text not null,
  coordinateur text not null default '',
  ressource text not null default '',
  equipe text not null default '',
  consignes text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.reponses_mission (
  mission_id uuid not null references public.missions (id) on delete cascade,
  auteur uuid not null default auth.uid(),
  prenom text not null default '',
  reponse text not null check (reponse in ('acceptee', 'refusee')),
  updated_at timestamptz not null default now(),
  primary key (mission_id, auteur)
);

-- Journal : qui a déclenché la crise, qui a changé un statut (exigence des mairies)
create table public.journal (
  id bigint generated always as identity primary key,
  commune_id uuid not null references public.communes (id) on delete cascade,
  auteur uuid,
  action text not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ─── Fonctions et déclencheurs ───────────────────────────────────────────

create function public.est_coordinateur(p_commune uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.coordinateurs c
    where c.user_id = auth.uid() and c.commune_id = p_commune
  );
$$;

create function public.journaliser()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'crises' then
    insert into public.journal (commune_id, auteur, action, details)
    values (
      new.commune_id, auth.uid(),
      case when tg_op = 'INSERT' then 'crise_declenchee'
           when not new.active then 'crise_terminee'
           else 'crise_modifiee' end,
      jsonb_build_object('crise', new.id, 'titre', new.titre, 'consigne', new.consigne)
    );
  elsif tg_table_name = 'demandes' and new.statut is distinct from old.statut then
    insert into public.journal (commune_id, auteur, action, details)
    values (new.commune_id, auth.uid(), 'statut_demande',
            jsonb_build_object('demande', new.reference, 'de', old.statut, 'vers', new.statut));
  end if;
  return new;
end;
$$;

create function public.toucher_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- L'habitant ne choisit ni son statut ni l'auteur de sa demande
create function public.proteger_demande()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.auteur := auth.uid();
  new.statut := 'transmise';
  return new;
end;
$$;

-- Un habitant peut corriger sa demande (« Ma situation a changé »), jamais son statut
create function public.proteger_maj_demande()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.est_coordinateur(old.commune_id) then
    new.statut := old.statut;
    new.auteur := old.auteur;
    new.commune_id := old.commune_id;
    new.reference := old.reference;
  end if;
  return new;
end;
$$;

create trigger demandes_proteger_maj before update on public.demandes
  for each row execute function public.proteger_maj_demande();
create trigger crises_journal after insert or update on public.crises
  for each row execute function public.journaliser();
create trigger demandes_journal after update on public.demandes
  for each row execute function public.journaliser();
create trigger demandes_updated before update on public.demandes
  for each row execute function public.toucher_updated_at();
create trigger demandes_proteger before insert on public.demandes
  for each row execute function public.proteger_demande();
create trigger reponses_updated before update on public.reponses_mission
  for each row execute function public.toucher_updated_at();

-- ─── Droits (Row Level Security) ─────────────────────────────────────────

alter table public.communes enable row level security;
alter table public.coordinateurs enable row level security;
alter table public.crises enable row level security;
alter table public.lieux enable row level security;
alter table public.demandes enable row level security;
alter table public.missions enable row level security;
alter table public.reponses_mission enable row level security;
alter table public.journal enable row level security;

create policy "communes lisibles" on public.communes for select to anon, authenticated using (true);

create policy "coordinateur voit sa fiche" on public.coordinateurs for select to authenticated
  using (user_id = auth.uid());

create policy "crises lisibles" on public.crises for select to anon, authenticated using (true);
create policy "coordinateur declenche" on public.crises for insert to authenticated
  with check (public.est_coordinateur(commune_id));
create policy "coordinateur modifie" on public.crises for update to authenticated
  using (public.est_coordinateur(commune_id)) with check (public.est_coordinateur(commune_id));

create policy "lieux lisibles" on public.lieux for select to anon, authenticated using (true);
create policy "coordinateur gere les lieux" on public.lieux for all to authenticated
  using (public.est_coordinateur(commune_id)) with check (public.est_coordinateur(commune_id));

create policy "habitant cree sa demande" on public.demandes for insert to authenticated
  with check (auteur = auth.uid());
create policy "habitant voit ses demandes, coordinateur celles de sa commune" on public.demandes
  for select to authenticated
  using (auteur = auth.uid() or public.est_coordinateur(commune_id));
create policy "coordinateur suit les demandes" on public.demandes for update to authenticated
  using (public.est_coordinateur(commune_id)) with check (public.est_coordinateur(commune_id));
create policy "habitant corrige sa demande" on public.demandes for update to authenticated
  using (auteur = auth.uid()) with check (auteur = auth.uid());

create policy "missions lisibles" on public.missions for select to anon, authenticated using (true);
create policy "coordinateur gere les missions" on public.missions for all to authenticated
  using (public.est_coordinateur(commune_id)) with check (public.est_coordinateur(commune_id));

create policy "volontaire repond" on public.reponses_mission for insert to authenticated
  with check (auteur = auth.uid());
create policy "volontaire change d'avis" on public.reponses_mission for update to authenticated
  using (auteur = auth.uid()) with check (auteur = auth.uid());
create policy "reponses visibles" on public.reponses_mission for select to authenticated
  using (
    auteur = auth.uid()
    or exists (select 1 from public.missions m
               where m.id = mission_id and public.est_coordinateur(m.commune_id))
  );

create policy "coordinateur lit le journal" on public.journal for select to authenticated
  using (public.est_coordinateur(commune_id));

-- ─── Temps réel ──────────────────────────────────────────────────────────

alter publication supabase_realtime add table
  public.crises, public.lieux, public.demandes, public.missions, public.reponses_mission;

-- ─── Données fictives ────────────────────────────────────────────────────

insert into public.communes (id, nom)
values ('00000000-0000-4000-8000-000000000001', 'Commune démo');

insert into public.lieux (commune_id, type, nom, details, distance, places, ouvert) values
  ('00000000-0000-4000-8000-000000000001', 'accueil', '[NOM DU GYMNASE]', 'ouvert 24 h/24 · repas chauds', '1,2 km', 80, false),
  ('00000000-0000-4000-8000-000000000001', 'accueil', '[SALLE DES FÊTES]', 'lits de camp', '2,4 km', 40, false),
  ('00000000-0000-4000-8000-000000000001', 'eau', '[NOM DU LIEU]', 'eau potable en bouteilles', '800 m', null, false);

insert into public.missions (commune_id, titre, rendez_vous, duree, lieu, coordinateur, ressource, equipe, consignes) values
  ('00000000-0000-4000-8000-000000000001',
   'Distribution d''eau aux habitants du quartier [NOM]', '15:00', '2 h', '[SALLE DES FÊTES]',
   '[PRÉNOM]', 'Véhicule', '4 volontaires',
   'N''entrez jamais dans une zone inondée. Gilet fourni sur place. Suivez uniquement les consignes du coordinateur.');
