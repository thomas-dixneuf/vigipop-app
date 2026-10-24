-- Vigipop — transport et matériel : proposition automatique au volontaire le plus proche
-- À coller dans Supabase → SQL Editor → Run, après 0010_corrections_tests.sql.
--
-- Même principe que l'hébergement (0006) pour les paires évidentes :
--   besoin « Transport » → volontaire qui propose un véhicule
--   besoin « Matériel »  → volontaire qui propose du matériel
-- Le serveur sollicite le volontaire disponible le plus proche ; il accepte ou refuse.
-- S'il refuse, le suivant est sollicité. La mairie supervise, annule ou relance.
-- Les coordonnées ne sont échangées qu'après l'accord, jamais avant.
-- Les autres besoins (eau, médicaments, animaux) passent par le tableau de la mairie.

create table public.entraides (
  id uuid primary key default gen_random_uuid(),
  commune_id uuid not null references public.communes (id) on delete cascade,
  demande_id uuid not null references public.demandes (id) on delete cascade,
  besoin text not null check (besoin in ('transport', 'materiel')),
  aidant uuid not null references public.volontaires (auteur) on delete cascade,
  statut text not null default 'proposee' check (statut in ('proposee', 'acceptee', 'refusee', 'annulee')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Une seule sollicitation en cours ou acceptée par demande et par besoin
create unique index entraides_une_par_besoin on public.entraides (demande_id, besoin)
  where statut in ('proposee', 'acceptee');
create index entraides_aidant on public.entraides (aidant);

create trigger entraides_updated before update on public.entraides
  for each row execute function public.toucher_updated_at();

-- Le volontaire ne peut que répondre : accepter, refuser, ou se désister après avoir accepté
create function public.proteger_entraide()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.est_coordinateur(old.commune_id) then
    return new;
  end if;
  if old.statut <> 'proposee' and not (old.statut = 'acceptee' and new.statut = 'annulee') then
    raise exception 'Cette sollicitation n''attend plus de réponse';
  end if;
  if new.statut not in ('acceptee', 'refusee', 'annulee') then
    raise exception 'Réponse invalide';
  end if;
  new.commune_id := old.commune_id;
  new.demande_id := old.demande_id;
  new.besoin := old.besoin;
  new.aidant := old.aidant;
  return new;
end;
$$;

create trigger entraides_proteger before update on public.entraides
  for each row execute function public.proteger_entraide();

alter table public.entraides enable row level security;

create policy "coordinateur gere les entraides" on public.entraides for all to authenticated
  using (public.est_coordinateur(commune_id)) with check (public.est_coordinateur(commune_id));
create policy "aidant voit ses sollicitations" on public.entraides for select to authenticated
  using (aidant = auth.uid());
create policy "aidant repond" on public.entraides for update to authenticated
  using (aidant = auth.uid()) with check (aidant = auth.uid());
create policy "demandeur voit ses entraides" on public.entraides for select to authenticated
  using (exists (select 1 from public.demandes d where d.id = demande_id and d.auteur = auth.uid()));

alter publication supabase_realtime add table public.entraides;

-- Ressource du volontaire qui répond à chaque besoin
create function public.ressource_pour_besoin(p_besoin text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_besoin when 'transport' then 'vehicule' when 'materiel' then 'materiel' end;
$$;

create function public.attribuer_entraide(p_demande uuid, p_besoin text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.demandes;
  debut timestamptz;
  ressource text := public.ressource_pour_besoin(p_besoin);
  choisi uuid;
begin
  select * into d from public.demandes where id = p_demande;
  if d.id is null or ressource is null or not (p_besoin = any (d.besoins)) or d.statut = 'close' then
    return;
  end if;
  if exists (select 1 from public.entraides e where e.demande_id = d.id and e.besoin = p_besoin and e.statut in ('proposee', 'acceptee')) then
    return;
  end if;
  select c.declenchee_a into debut from public.crises c where c.commune_id = d.commune_id and c.active;
  if debut is null then
    return;
  end if;

  select v.auteur into choisi
  from public.volontaires v
  left join lateral (
    select (regexp_match(d.position, '^\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\s*$'))::float8[] as p
  ) pos on true
  where v.commune_id = d.commune_id
    and v.disponible
    and v.updated_at >= debut
    and ressource = any (v.ressources)
    and v.auteur is distinct from d.auteur
    -- Une sollicitation à la fois par volontaire : personne n'est submergé
    and not exists (select 1 from public.entraides e where e.aidant = v.auteur and e.statut = 'proposee')
    -- Jamais deux fois le même volontaire pour le même besoin d'une demande
    and not exists (select 1 from public.entraides e where e.demande_id = d.id and e.besoin = p_besoin and e.aidant = v.auteur)
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
    insert into public.entraides (commune_id, demande_id, besoin, aidant)
    values (d.commune_id, d.id, p_besoin, choisi);
  exception when unique_violation then
    null;
  end;
end;
$$;

revoke execute on function public.attribuer_entraide(uuid, text) from public, anon, authenticated;

-- Toutes les paires d'une demande
create function public.attribuer_entraides(p_demande uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.attribuer_entraide(p_demande, 'transport');
  perform public.attribuer_entraide(p_demande, 'materiel');
end;
$$;

revoke execute on function public.attribuer_entraides(uuid) from public, anon, authenticated;

-- La mairie relance la recherche pour une demande
create function public.relancer_entraides(p_demande uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.demandes d where d.id = p_demande and public.est_coordinateur(d.commune_id)) then
    raise exception 'Réservé aux coordinateurs de la commune';
  end if;
  perform public.attribuer_entraides(p_demande);
end;
$$;

grant execute on function public.relancer_entraides(uuid) to authenticated;

-- Nouvelle demande ou mise à jour : on sollicite ; un besoin retiré libère la sollicitation en attente
create function public.entraide_auto_demande()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    update public.entraides e set statut = 'annulee'
    where e.demande_id = new.id and e.statut = 'proposee'
      and (new.statut = 'close' or not (e.besoin = any (new.besoins)));
  end if;
  perform public.attribuer_entraides(new.id);
  return null;
end;
$$;

create trigger demandes_entraide_auto after insert or update of besoins, statut on public.demandes
  for each row execute function public.entraide_auto_demande();

-- Refus ou désistement du volontaire : le suivant est sollicité, et le volontaire libéré
-- reçoit la demande suivante qui attend. Annulation par la mairie : elle choisit la suite.
create function public.entraide_auto_relance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  dem uuid;
  ressources text[];
begin
  if old.statut is distinct from new.statut and new.statut in ('refusee', 'annulee', 'acceptee') then
    if new.statut = 'refusee' or (new.statut = 'annulee' and not public.est_coordinateur(new.commune_id)) then
      perform public.attribuer_entraide(new.demande_id, new.besoin);
    end if;
    -- Le volontaire n'a plus de sollicitation en attente : la plus ancienne demande sans aide lui revient
    select v.ressources into ressources from public.volontaires v where v.auteur = new.aidant;
    for dem in
      select d.id from public.demandes d
      where d.commune_id = new.commune_id and d.statut <> 'close'
        and (('transport' = any (d.besoins) and 'vehicule' = any (ressources))
             or ('materiel' = any (d.besoins) and 'materiel' = any (ressources)))
      order by d.created_at
    loop
      perform public.attribuer_entraides(dem);
    end loop;
  end if;
  return null;
end;
$$;

create trigger entraides_auto_relance after update of statut on public.entraides
  for each row execute function public.entraide_auto_relance();

-- Un volontaire se rend disponible : on lui propose les demandes en attente, les plus anciennes d'abord
create function public.entraide_auto_volontaire()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  dem uuid;
begin
  if not new.disponible then
    -- Indisponible : ses sollicitations en attente passent au suivant
    update public.entraides e set statut = 'refusee' where e.aidant = new.auteur and e.statut = 'proposee';
    return null;
  end if;
  if not (new.ressources && array['vehicule', 'materiel']) then
    return null;
  end if;
  for dem in
    select d.id from public.demandes d
    where d.commune_id = new.commune_id and d.statut <> 'close' and d.besoins && array['transport', 'materiel']
    order by d.created_at
  loop
    perform public.attribuer_entraides(dem);
  end loop;
  return null;
end;
$$;

create trigger volontaires_entraide_auto after insert or update of disponible, ressources, lat, lng on public.volontaires
  for each row execute function public.entraide_auto_volontaire();

-- Accord du volontaire : la demande passe au moins « prise en charge »
create function public.entraide_suivi_demande()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.statut = 'acceptee' and old.statut is distinct from new.statut then
    perform set_config('vigipop.suivi_auto', 'on', true);
    update public.demandes d set statut = 'prise_en_charge'
    where d.id = new.demande_id and d.statut = 'transmise';
    perform set_config('vigipop.suivi_auto', '', true);
  end if;
  return null;
end;
$$;

create trigger entraides_suivi_demande after update of statut on public.entraides
  for each row execute function public.entraide_suivi_demande();

-- Côté volontaire : la sollicitation, avec les coordonnées une fois acceptée.
-- Avant l'accord : seulement la distance arrondie, jamais la position exacte.
create function public.mes_entraides()
returns table (id uuid, besoin text, statut text, personnes integer, personne_vulnerable boolean,
               distance_km numeric, prenom text, telephone text, lieu text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.besoin, e.statut, d.personnes, d.personne_vulnerable,
         case when pos.p is not null and v.lat is not null and v.lng is not null then
           round((111.2 * sqrt(power(v.lat - pos.p[1], 2) + power((v.lng - pos.p[2]) * cos(radians(pos.p[1])), 2)))::numeric, 1)
         end,
         case when e.statut = 'acceptee' then d.prenom else '' end,
         case when e.statut = 'acceptee' then d.telephone else '' end,
         case when e.statut = 'acceptee' then d.position else '' end,
         e.created_at
  from public.entraides e
  join public.demandes d on d.id = e.demande_id
  join public.volontaires v on v.auteur = e.aidant
  left join lateral (
    select (regexp_match(d.position, '^\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\s*$'))::float8[] as p
  ) pos on true
  where e.aidant = auth.uid() and e.statut in ('proposee', 'acceptee') and d.statut <> 'close'
  order by e.created_at desc;
$$;

-- Côté personne aidée : qui vient, seulement après l'accord
create function public.mes_aidants(p_demande uuid)
returns table (besoin text, statut text, prenom text, telephone text)
language sql
stable
security definer
set search_path = ''
as $$
  select e.besoin, e.statut,
         case when e.statut = 'acceptee' then v.prenom else '' end,
         case when e.statut = 'acceptee' then v.telephone else '' end
  from public.entraides e
  join public.demandes d on d.id = e.demande_id
  join public.volontaires v on v.auteur = e.aidant
  where e.demande_id = p_demande and d.auteur = auth.uid() and e.statut in ('proposee', 'acceptee');
$$;

grant execute on function public.mes_entraides() to authenticated;
grant execute on function public.mes_aidants(uuid) to authenticated;

-- Journal
create function public.journaliser_entraide()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.statut is distinct from old.statut then
    insert into public.journal (commune_id, auteur, action, details)
    select new.commune_id, auth.uid(), 'entraide_' || new.statut,
           jsonb_build_object('demande', d.reference, 'besoin', new.besoin)
    from public.demandes d where d.id = new.demande_id;
  end if;
  return new;
end;
$$;

create trigger entraides_journal after insert or update on public.entraides
  for each row execute function public.journaliser_entraide();

-- Alertes du téléphone : sollicitation → volontaire ; accord → personne aidée
create function public.push_entraide()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  demandeur uuid;
begin
  if coalesce(current_setting('vigipop.fin_crise', true), '') = 'on' then
    return null;
  end if;
  if new.statut = 'proposee' and (tg_op = 'INSERT' or old.statut is distinct from new.statut) then
    perform public.mettre_en_file(new.commune_id, array[new.aidant], 'entraide-proposee:' || new.id,
      case new.besoin when 'transport' then 'Un habitant a besoin d''être transporté' else 'Un habitant a besoin de matériel' end,
      'Pouvez-vous aider ? Répondez dans Vigipop.', '/accueil');
  elsif new.statut = 'acceptee' and tg_op = 'UPDATE' and old.statut is distinct from new.statut then
    select d.auteur into demandeur from public.demandes d where d.id = new.demande_id;
    perform public.mettre_en_file(new.commune_id, array[demandeur], 'entraide-trouvee:' || new.demande_id || ':' || new.besoin,
      case new.besoin when 'transport' then 'Un volontaire vient vous chercher' else 'Un volontaire apporte du matériel' end,
      'Son prénom et son numéro sont dans Vigipop.', '/demande');
  end if;
  return null;
end;
$$;

create trigger entraides_push after insert or update of statut on public.entraides
  for each row execute function public.push_entraide();

-- Fin de crise : les sollicitations en attente tombent aussi
create or replace function public.clore_demandes_fin_de_crise()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.active and not new.active then
    perform set_config('vigipop.fin_crise', 'on', true);
    update public.demandes set statut = 'close'
    where commune_id = new.commune_id and statut <> 'close';
    update public.hebergements set statut = 'annulee'
    where commune_id = new.commune_id and statut = 'proposee';
    update public.entraides set statut = 'annulee'
    where commune_id = new.commune_id and statut = 'proposee';
    perform set_config('vigipop.fin_crise', '', true);
  end if;
  return null;
end;
$$;
