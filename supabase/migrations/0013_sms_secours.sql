-- Vigipop — 0013 : demandes reçues par SMS (repli quand Internet ne passe pas)
--
-- L'app propose un SMS pré-rédigé quand la demande ne part pas. Une passerelle SMS
-- (Twilio, OVH…) transmet chaque SMS reçu à la fonction serveur « recevoir-sms »,
-- qui appelle recevoir_sms() ci-dessous avec la clé de service.
-- Doublons : si l'app envoie ensuite la même demande (même référence), elle remplace
-- la demande SMS en gardant ce que la mairie avait déjà fait (statut, réponse).

alter table public.demandes
  add column if not exists source text not null default 'app' check (source in ('app', 'sms')),
  add column if not exists message_sms text check (length(message_sms) <= 1600);

-- Une demande SMS n'a pas d'auteur connecté
alter table public.demandes alter column auteur drop not null;

-- Appelée seulement par la fonction serveur (clé de service), jamais par l'app
create function public.recevoir_sms(
  p_commune uuid,
  p_reference text,
  p_situation text,
  p_besoins text[],
  p_personnes integer,
  p_vulnerable boolean,
  p_position text,
  p_prenom text,
  p_telephone text,
  p_message text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  ref text := nullif(trim(p_reference), '');
begin
  -- La demande est déjà arrivée par l'app : le SMS est un doublon, on le note seulement
  if ref is not null and exists (
    select 1 from public.demandes
    where commune_id = p_commune and reference = ref and created_at > now() - interval '48 hours'
  ) then
    insert into public.journal (commune_id, action, details)
    values (p_commune, 'sms_doublon', jsonb_build_object('demande', ref));
    return ref;
  end if;

  ref := coalesce(ref, 'SMS-' || lpad((floor(random() * 10000))::int::text, 4, '0'));
  insert into public.demandes (
    commune_id, reference, situation, besoins, personnes, personne_vulnerable,
    position, prenom, telephone, source, message_sms
  ) values (
    p_commune,
    ref,
    case when p_situation in ('sinistre', 'bloque', 'evac', 'blesse') then p_situation else 'sinistre' end,
    coalesce(p_besoins, '{}'),
    least(greatest(coalesce(p_personnes, 1), 1), 50),
    coalesce(p_vulnerable, false),
    left(coalesce(nullif(trim(p_position), ''), 'Lieu non précisé : rappeler la personne'), 200),
    left(coalesce(p_prenom, ''), 60),
    left(coalesce(p_telephone, ''), 20),
    'sms',
    left(p_message, 1600)
  );
  insert into public.journal (commune_id, action, details)
  values (p_commune, 'sms_recu', jsonb_build_object('demande', ref));
  return ref;
end;
$$;
revoke execute on function public.recevoir_sms(uuid, text, text, text[], integer, boolean, text, text, text, text)
  from public, anon, authenticated;

-- L'app envoie la demande arrivée plus tôt par SMS : on garde une seule demande (celle de l'app,
-- que l'habitant peut suivre), avec ce que la mairie a déjà décidé.
-- Nom en « zz » : ce déclencheur passe après demandes_proteger (ordre alphabétique).
create function public.fusionner_demande_sms()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  sms public.demandes%rowtype;
begin
  if new.source <> 'app' then
    return new;
  end if;
  select * into sms from public.demandes
  where commune_id = new.commune_id and reference = new.reference and source = 'sms'
    and created_at > now() - interval '48 hours'
  order by created_at desc limit 1;
  if found then
    new.statut := sms.statut;
    if coalesce(new.reponse_mairie, '') = '' then
      new.reponse_mairie := sms.reponse_mairie;
    end if;
    new.message_sms := sms.message_sms;
    delete from public.demandes where id = sms.id;
    insert into public.journal (commune_id, action, details)
    values (new.commune_id, 'sms_fusionne', jsonb_build_object('demande', new.reference));
  end if;
  return new;
end;
$$;
create trigger demandes_zz_fusion_sms before insert on public.demandes
  for each row execute function public.fusionner_demande_sms();
