-- Vigipop — partenaires de la commune : entreprises sous convention et bénévoles d'association
-- À coller dans Supabase → SQL Editor → Run, après les migrations précédentes.
--
-- Gérés par la cellule de crise seule (jamais visibles des habitants) :
-- - entreprises qui ont signé une convention pour prêter du matériel ou des engins en crise ;
-- - bénévoles d'une association engagée auprès de la commune (réserve communale de sécurité civile,
--   Protection civile…), que la mairie connaît et appelle directement.
-- Chaque sollicitation ou mobilisation passe au journal (exigence des mairies).

create table public.entreprises_convention (
  id uuid primary key default gen_random_uuid(),
  commune_id uuid not null references public.communes (id) on delete cascade,
  nom text not null check (length(nom) between 2 and 120),
  -- SIRET : 14 chiffres, ou vide si pas encore transmis
  siret text not null default '' check (siret ~ '^([0-9]{14})?$'),
  contact text not null default '' check (length(contact) <= 120),
  telephone text not null default '' check (length(telephone) <= 20),
  materiel text[] not null default '{}' check (cardinality(materiel) <= 20),
  precisions text not null default '' check (length(precisions) <= 300),
  -- Fin de validité de la convention : l'espace mairie signale celles à renouveler
  convention_fin date,
  statut text not null default 'disponible' check (statut in ('disponible', 'sollicitee', 'engagee')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.benevoles_association (
  id uuid primary key default gen_random_uuid(),
  commune_id uuid not null references public.communes (id) on delete cascade,
  nom text not null check (length(nom) between 2 and 120),
  telephone text not null default '' check (length(telephone) <= 20),
  association text not null default 'Réserve communale de sécurité civile' check (length(association) between 2 and 120),
  qualifications text[] not null default '{}' check (cardinality(qualifications) <= 20),
  statut text not null default 'disponible' check (statut in ('disponible', 'mobilise', 'indisponible')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index entreprises_convention_commune on public.entreprises_convention (commune_id);
create index benevoles_association_commune on public.benevoles_association (commune_id);

alter table public.entreprises_convention enable row level security;
alter table public.benevoles_association enable row level security;

create policy "coordinateur gere les entreprises" on public.entreprises_convention for all to authenticated
  using (public.est_coordinateur(commune_id)) with check (public.est_coordinateur(commune_id));
create policy "coordinateur gere les benevoles" on public.benevoles_association for all to authenticated
  using (public.est_coordinateur(commune_id)) with check (public.est_coordinateur(commune_id));

-- Mise à jour de updated_at et journal de chaque changement de statut
create function public.partenaire_modifie()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.statut is distinct from old.statut then
    insert into public.journal (commune_id, auteur, action, details)
    values (
      new.commune_id, auth.uid(),
      case when tg_table_name = 'entreprises_convention' then 'entreprise_' else 'benevole_' end || new.statut,
      jsonb_build_object('titre', new.nom)
    );
  end if;
  return new;
end;
$$;

create trigger entreprises_convention_modifiee before update on public.entreprises_convention
  for each row execute function public.partenaire_modifie();
create trigger benevoles_association_modifie before update on public.benevoles_association
  for each row execute function public.partenaire_modifie();

alter publication supabase_realtime add table public.entreprises_convention, public.benevoles_association;
