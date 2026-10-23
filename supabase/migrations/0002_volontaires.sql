-- Vigipop — volontaires disponibles et missions créées par la mairie
-- À coller dans Supabase → SQL Editor → Run, après 0001_init.sql.
-- Données fictives uniquement tant que la phase RGPD n'est pas validée.

-- Un volontaire se déclare disponible pendant une crise, avec ce qu'il peut offrir
create table public.volontaires (
  auteur uuid primary key default auth.uid(),
  commune_id uuid not null references public.communes (id) on delete cascade,
  prenom text not null default '' check (length(prenom) <= 60),
  ressources text[] not null default '{}',
  disponible boolean not null default true,
  updated_at timestamptz not null default now()
);

create trigger volontaires_updated before update on public.volontaires
  for each row execute function public.toucher_updated_at();

alter table public.volontaires enable row level security;

create policy "volontaire se declare" on public.volontaires for insert to authenticated
  with check (auteur = auth.uid());
create policy "volontaire met a jour sa disponibilite" on public.volontaires for update to authenticated
  using (auteur = auth.uid()) with check (auteur = auth.uid());
create policy "volontaire et coordinateur voient la disponibilite" on public.volontaires for select to authenticated
  using (auteur = auth.uid() or public.est_coordinateur(commune_id));

-- Journal : création et clôture des missions
create or replace function public.journaliser()
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
  -- Conditions imbriquées : PL/pgSQL n'évalue pas « and » en court-circuit sur les champs de new
  elsif tg_table_name = 'demandes' then
    if new.statut is distinct from old.statut then
      insert into public.journal (commune_id, auteur, action, details)
      values (new.commune_id, auth.uid(), 'statut_demande',
              jsonb_build_object('demande', new.reference, 'de', old.statut, 'vers', new.statut));
    end if;
  elsif tg_table_name = 'missions' then
    if tg_op = 'INSERT' then
      insert into public.journal (commune_id, auteur, action, details)
      values (new.commune_id, auth.uid(), 'mission_creee', jsonb_build_object('mission', new.id, 'titre', new.titre));
    elsif new.active is distinct from old.active then
      insert into public.journal (commune_id, auteur, action, details)
      values (new.commune_id, auth.uid(), 'mission_close', jsonb_build_object('mission', new.id, 'titre', new.titre));
    end if;
  end if;
  return new;
end;
$$;

create trigger missions_journal after insert or update on public.missions
  for each row execute function public.journaliser();

alter publication supabase_realtime add table public.volontaires;
