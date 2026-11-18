-- Membre de la cellule de crise qui s'occupe de la demande. Rempli automatiquement par l'espace mairie
-- dès qu'il agit (appel, aidant proposé, bénévole mobilisé, entreprise sollicitée, message à l'habitant).
-- Pas affiché dans l'app de l'habitant. L'app fonctionne sans cette colonne (le statut change quand même).
alter table public.demandes
  add column if not exists suivie_par text not null default '' check (length(suivie_par) <= 120);
