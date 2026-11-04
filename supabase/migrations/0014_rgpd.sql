-- Vigipop — 0014 : droits RGPD des habitants et durée de conservation
--
-- 1. supprimer_mon_compte() : l'habitant efface lui-même son compte et tout ce qui s'y rattache
--    (droit à l'effacement), depuis « Mes informations ».
-- 2. effacer_donnees_expirees() : chaque nuit, efface ce qui n'a plus d'utilité
--    (minimisation). Durées proposées, à valider avec le juriste et la commune :
--      - demandes closes depuis 30 jours (et leurs mises en relation) ;
--      - comptes anonymes (téléphones sans compte) inactifs depuis 30 jours ;
--      - alertes déjà envoyées depuis 7 jours.
--    Le journal ne garde que des références (VG-1234), sans nom ni numéro : il reste pour le bilan.

create function public.supprimer_mon_compte()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  moi uuid := auth.uid();
begin
  if moi is null then
    raise exception 'Connexion requise';
  end if;
  -- Volontaire : ses mises en relation (hébergement, entraide) partent avec lui (cascade)
  delete from public.volontaires where auteur = moi;
  delete from public.reponses_mission where auteur = moi;
  delete from public.abonnements_push where auteur = moi;
  delete from public.demandes where auteur = moi;
  delete from auth.users where id = moi;
end;
$$;
revoke execute on function public.supprimer_mon_compte() from public, anon;
grant execute on function public.supprimer_mon_compte() to authenticated;

create function public.effacer_donnees_expirees()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.demandes where statut = 'close' and updated_at < now() - interval '30 days';
  delete from public.notifications_push where created_at < now() - interval '7 days';
  -- Téléphones sans compte : plus aucune demande ni fiche volontaire, inactifs depuis 30 jours
  delete from auth.users u
  where u.is_anonymous
    and coalesce(u.last_sign_in_at, u.created_at) < now() - interval '30 days'
    and not exists (select 1 from public.demandes d where d.auteur = u.id)
    and not exists (select 1 from public.volontaires v where v.auteur = u.id);
end;
$$;
revoke execute on function public.effacer_donnees_expirees() from public, anon, authenticated;

-- Effacement chaque nuit à 3 h 17 (extension pg_cron de Supabase).
-- Ignoré là où pg_cron n'existe pas (vérification automatique des PR).
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('vigipop-effacement', '17 3 * * *', 'select public.effacer_donnees_expirees()');
  end if;
end $$;
