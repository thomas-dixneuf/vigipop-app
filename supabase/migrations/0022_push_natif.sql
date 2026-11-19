-- Vigipop — alertes « app fermée » dans les applications Android et iOS (push natif)
-- À coller dans Supabase → SQL Editor → Run, après 0021_missions_demandes.sql.
--
-- Un abonnement peut maintenant venir :
--   - d'un navigateur (push web, VAPID) : comme avant, plateforme « web » ;
--   - de l'application Android (jeton Firebase) : endpoint « android:<jeton> » ;
--   - de l'application iOS (jeton Apple) : endpoint « ios:<jeton> ».
-- Les applications reçoivent un message anonyme (« Nouvelle alerte de votre commune ») : ni Google
-- ni Apple ne voient le contenu des alertes. Le détail s'affiche dans l'app, depuis la cloche.

alter table public.abonnements_push
  add column plateforme text not null default 'web' check (plateforme in ('web', 'android', 'ios'));

-- Un jeton natif commence toujours par sa plateforme
alter table public.abonnements_push
  add constraint abonnements_push_endpoint_plateforme
  check (plateforme = 'web' or endpoint like plateforme || ':%');
