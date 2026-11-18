-- Nom de famille facultatif sur la demande d'aide (compte express, en plus du prénom).
-- Jamais obligatoire : une demande n'est jamais bloquée. L'app envoie la demande sans le nom
-- tant que cette migration n'est pas lancée.
alter table public.demandes
  add column if not exists nom text not null default '' check (length(nom) <= 60);
