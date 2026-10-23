-- Vigipop — moyen de rappeler la personne qui demande de l'aide
-- À coller dans Supabase → SQL Editor → Run, après 0002_volontaires.sql.
-- Facultatif côté habitant : une demande n'est jamais bloquée faute de numéro.
-- Visible uniquement par l'auteur et les coordinateurs de la commune (règles de 0001).

alter table public.demandes
  add column prenom text not null default '' check (length(prenom) <= 60),
  add column telephone text not null default '' check (length(telephone) <= 20);
