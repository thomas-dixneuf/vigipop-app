-- Vigipop — missions ciblées par catégorie d'aide, suivi de l'hébergement côté sinistré
-- À coller dans Supabase → SQL Editor → Run, après 0006_hebergement_auto.sql.

-- Catégorie d'aide demandée par la mission : seuls les volontaires qui l'offrent la reçoivent.
-- Vide : mission ouverte à tous (missions créées avant cette version).
alter table public.missions
  add column categorie text not null default ''
    check (categorie in ('', 'vehicule', 'materiel', 'mainoeuvre', 'competences', 'temps'));

update public.missions set categorie = 'vehicule' where ressource = 'Véhicule' and categorie = '';

-- Un habitant ne change jamais le statut de sa demande… sauf l'avancée automatique ci-dessous,
-- signalée par un réglage local à la transaction (inaccessible depuis l'app)
create or replace function public.proteger_maj_demande()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.est_coordinateur(old.commune_id) then
    if coalesce(current_setting('vigipop.suivi_auto', true), '') <> 'on' then
      new.statut := old.statut;
    end if;
    new.auteur := old.auteur;
    new.commune_id := old.commune_id;
    new.reference := old.reference;
  end if;
  return new;
end;
$$;

-- Hébergement accepté : la demande avance d'elle-même pour que le sinistré voie la suite
create function public.hebergement_suivi_demande()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.statut = 'acceptee' and old.statut is distinct from new.statut then
    -- Seul besoin : l'hébergement → aide organisée ; sinon la demande est au moins prise en charge
    perform set_config('vigipop.suivi_auto', 'on', true);
    update public.demandes d
    set statut = case when d.besoins <@ array['heb'] then 'aide_organisee' else 'prise_en_charge' end
    where d.id = new.demande_id and d.statut in ('transmise', 'prise_en_charge')
      and d.statut is distinct from (case when d.besoins <@ array['heb'] then 'aide_organisee' else 'prise_en_charge' end);
    perform set_config('vigipop.suivi_auto', '', true);
  end if;
  return null;
end;
$$;

create trigger hebergements_suivi_demande after update of statut on public.hebergements
  for each row execute function public.hebergement_suivi_demande();
