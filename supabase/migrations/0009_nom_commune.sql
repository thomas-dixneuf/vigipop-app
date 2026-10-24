-- Vigipop — nom de la commune modifiable par la mairie
-- À coller dans Supabase → SQL Editor → Run, après 0008_notifications.sql.
--
-- L'app des habitants affiche ce nom en haut de l'accueil (relu à chaque ouverture) ;
-- la mairie le corrige depuis son espace.

alter table public.communes
  add constraint communes_nom_longueur check (length(btrim(nom)) between 1 and 80);

-- Un coordinateur ne peut changer que le nom de sa propre commune
revoke update on public.communes from anon, authenticated;
grant update (nom) on public.communes to authenticated;

create policy "coordinateur renomme sa commune" on public.communes for update to authenticated
  using (public.est_coordinateur(id)) with check (public.est_coordinateur(id));

