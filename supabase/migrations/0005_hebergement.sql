-- Vigipop — hébergement solidaire : mise en relation encadrée par la mairie
-- À coller dans Supabase → SQL Editor → Run, après 0004_carte.sql.
--
-- Parcours : l'habitant demande un hébergement → la mairie propose un hébergeur →
-- l'hébergeur accepte → chacun voit alors les coordonnées de l'autre. Jamais avant.
-- Données fictives uniquement tant que la phase RGPD n'est pas validée.

-- Le logement proposé par le volontaire : visible par la mairie seulement
alter table public.volontaires
  add column telephone text not null default '' check (length(telephone) <= 20),
  add column places_hebergement integer not null default 0 check (places_hebergement between 0 and 20),
  add column adresse text not null default '' check (length(adresse) <= 200),
  add column lat double precision check (lat between -90 and 90),
  add column lng double precision check (lng between -180 and 180);

create table public.hebergements (
  id uuid primary key default gen_random_uuid(),
  commune_id uuid not null references public.communes (id) on delete cascade,
  demande_id uuid not null references public.demandes (id) on delete cascade,
  hebergeur uuid not null references public.volontaires (auteur) on delete cascade,
  personnes integer not null check (personnes between 1 and 20),
  statut text not null default 'proposee' check (statut in ('proposee', 'acceptee', 'refusee', 'annulee')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Une seule proposition en cours ou acceptée par demande
create unique index hebergements_un_par_demande on public.hebergements (demande_id)
  where statut in ('proposee', 'acceptee');

create trigger hebergements_updated before update on public.hebergements
  for each row execute function public.toucher_updated_at();

-- L'hébergeur ne peut que répondre (accepter ou refuser) à une proposition en cours
create function public.proteger_hebergement()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.est_coordinateur(old.commune_id) then
    return new;
  end if;
  if old.statut <> 'proposee' and not (old.statut = 'acceptee' and new.statut = 'annulee') then
    raise exception 'Cette proposition n''attend plus de réponse';
  end if;
  if new.statut not in ('acceptee', 'refusee', 'annulee') then
    raise exception 'Réponse invalide';
  end if;
  new.commune_id := old.commune_id;
  new.demande_id := old.demande_id;
  new.hebergeur := old.hebergeur;
  new.personnes := old.personnes;
  return new;
end;
$$;

create trigger hebergements_proteger before update on public.hebergements
  for each row execute function public.proteger_hebergement();

alter table public.hebergements enable row level security;

create policy "coordinateur gere les hebergements" on public.hebergements for all to authenticated
  using (public.est_coordinateur(commune_id)) with check (public.est_coordinateur(commune_id));
create policy "hebergeur voit ses propositions" on public.hebergements for select to authenticated
  using (hebergeur = auth.uid());
create policy "hebergeur repond" on public.hebergements for update to authenticated
  using (hebergeur = auth.uid()) with check (hebergeur = auth.uid());
create policy "demandeur voit son hebergement" on public.hebergements for select to authenticated
  using (exists (select 1 from public.demandes d where d.id = demande_id and d.auteur = auth.uid()));

alter publication supabase_realtime add table public.hebergements;

-- Côté hébergeur : la proposition, avec les coordonnées de la personne une fois acceptée
create function public.mes_propositions_hebergement()
returns table (id uuid, statut text, personnes integer, personne_vulnerable boolean, besoins text[],
               prenom text, telephone text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select h.id, h.statut, h.personnes, d.personne_vulnerable, d.besoins,
         case when h.statut = 'acceptee' then d.prenom else '' end,
         case when h.statut = 'acceptee' then d.telephone else '' end,
         h.created_at
  from public.hebergements h
  join public.demandes d on d.id = h.demande_id
  where h.hebergeur = auth.uid() and h.statut in ('proposee', 'acceptee')
  order by h.created_at desc;
$$;

-- Côté personne hébergée : où aller, seulement après l'accord de l'hébergeur
create function public.mon_hebergement(p_demande uuid)
returns table (statut text, prenom text, telephone text, adresse text, lat double precision, lng double precision)
language sql
stable
security definer
set search_path = ''
as $$
  select h.statut,
         case when h.statut = 'acceptee' then v.prenom else '' end,
         case when h.statut = 'acceptee' then v.telephone else '' end,
         case when h.statut = 'acceptee' then v.adresse else '' end,
         case when h.statut = 'acceptee' then v.lat end,
         case when h.statut = 'acceptee' then v.lng end
  from public.hebergements h
  join public.demandes d on d.id = h.demande_id
  join public.volontaires v on v.auteur = h.hebergeur
  where h.demande_id = p_demande and d.auteur = auth.uid() and h.statut in ('proposee', 'acceptee')
  limit 1;
$$;

grant execute on function public.mes_propositions_hebergement() to authenticated;
grant execute on function public.mon_hebergement(uuid) to authenticated;

-- Journal : propositions et réponses (exigence des mairies)
create function public.journaliser_hebergement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.statut is distinct from old.statut then
    insert into public.journal (commune_id, auteur, action, details)
    select new.commune_id, auth.uid(), 'hebergement_' || new.statut,
           jsonb_build_object('demande', d.reference, 'personnes', new.personnes)
    from public.demandes d where d.id = new.demande_id;
  end if;
  return new;
end;
$$;

create trigger hebergements_journal after insert or update on public.hebergements
  for each row execute function public.journaliser_hebergement();

-- Points de secours permanents (fictifs) : visibles sur la carte des habitants même hors crise
insert into public.lieux (commune_id, type, nom, details, distance, places, ouvert, adresse, lat, lng) values
  ('00000000-0000-4000-8000-000000000001', 'soins', '[CASERNE DES POMPIERS]', 'secours 24 h/24', '1,6 km', null, true, '[ADRESSE DE LA CASERNE]', 47.0655, -0.8838),
  ('00000000-0000-4000-8000-000000000001', 'soins', '[MAISON MÉDICALE]', 'premiers soins', '900 m', null, true, '[ADRESSE DE LA MAISON MÉDICALE]', 47.0567, -0.8735);
