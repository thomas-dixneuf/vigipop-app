-- Vigipop — missions liées aux demandes, bénévoles de la Protection civile mobilisés sur une mission
-- À coller dans Supabase → SQL Editor → Run, après 0020_demande_suivie_par.sql.

-- Mission créée pour une demande d'aide (eau, médicaments) quand la cellule s'en occupe.
-- L'adresse de l'habitant n'est jamais dans la mission : la cellule la donne au volontaire qui accepte.
alter table public.missions
  add column if not exists demande_id uuid references public.demandes (id) on delete set null;

create index if not exists missions_demande on public.missions (demande_id);

-- Bénévole de la Protection civile mobilisé sur une mission précise (vide : mobilisé sans mission)
alter table public.benevoles_association
  add column if not exists mission_id uuid references public.missions (id) on delete set null;
