-- Exercice d'entraînement : la mairie déclenche une crise marquée « exercice ».
-- Même parcours pour les habitants, mais chaque alerte et notification est signalée comme un exercice.

alter table public.crises
  add column exercice boolean not null default false;

create or replace function public.push_crise()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  prefixe text := case when new.exercice then 'EXERCICE — ' else '' end;
begin
  if tg_op = 'INSERT' then
    if new.active then
      perform public.mettre_en_file(new.commune_id, null, 'crise:' || new.id || ':' || new.consigne,
        case when new.exercice then 'Exercice lancé par la mairie' else 'Mode crise activé par la mairie' end,
        prefixe || new.titre || ' — ' || new.consigne, '/accueil');
    end if;
  elsif old.active and not new.active then
    perform public.mettre_en_file(new.commune_id, null, 'fin:' || new.id,
      case when new.exercice then 'Fin de l''exercice' else 'Fin de la crise' end,
      case when new.exercice
        then 'La mairie a terminé l''exercice : ' || new.titre || '. Merci de votre participation.'
        else 'La mairie a levé l''alerte : ' || new.titre || '. Si vous avez encore besoin d''aide, mettez à jour votre situation dans Vigipop.'
      end,
      '/accueil');
  elsif new.active and new.consigne is distinct from old.consigne then
    perform public.mettre_en_file(new.commune_id, null, 'crise:' || new.id || ':' || new.consigne,
      prefixe || 'Nouvelle consigne de la mairie', new.consigne, '/accueil');
  end if;
  return null;
end;
$$;
