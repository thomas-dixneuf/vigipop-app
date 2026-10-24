# Brancher le serveur Supabase

Le serveur relie l'app des habitants et l'espace mairie (`#/mairie`). Sans lui, l'app
fonctionne en mode démo local, avec un bouton « Démo » pour simuler la crise.

**Données fictives uniquement** tant que la phase RGPD n'est pas validée.

## 1. Créer la base (une seule fois)

1. Supabase → ton projet → **SQL Editor** → **New query**.
2. Colle tout le contenu de `supabase/migrations/0001_init.sql`, puis clique sur **Run**.
   Le script crée les tables, les droits par commune, le temps réel, une « Commune démo »,
   3 lieux et une mission fictive.
3. Fais de même avec `supabase/migrations/0002_volontaires.sql` (volontaires disponibles,
   missions créées par la mairie), puis `0003_contact_demande.sql` (prénom et numéro de
   rappel dans les demandes), puis `0004_carte.sql` (position des lieux, zones à éviter,
   nombre de foyers d'hébergement solidaire), puis `0005_hebergement.sql` (mise en relation
   hébergeur ↔ sinistré, points de secours permanents), puis `0006_hebergement_auto.sql`
   (proposition automatique du foyer le plus proche), puis `0007_missions_ciblees.sql`
   (missions par type d'aide, demande qui avance quand l'hébergeur accepte), puis
   `0008_notifications.sql` (alertes push : suivre ensuite `docs/NOTIFICATIONS.md`), puis
   `0009_nom_commune.sql` (la mairie renomme sa commune, affichée en haut de l'app), puis
   `0010_corrections_tests.sql` (risques de la commune, adresse du rendez-vous des missions, message « aide organisée »,
   nom des volontaires, demandes closes à la fin de la crise). Chaque nouveau fichier de `supabase/migrations/` se lance
   une seule fois, dans l'ordre des numéros.

## 2. Autoriser les habitants sans mot de passe

**Authentication → Sign In / Providers** → active **Allow anonymous sign-ins**.
Chaque téléphone reçoit ainsi une session anonyme pour envoyer sa demande d'aide.
La connexion par SMS remplacera ce mécanisme plus tard.

## 3. Créer un compte coordinateur (mairie)

1. **Authentication → Users → Add user → Create new user** : e-mail et mot de passe,
   en cochant **Auto Confirm User**.
2. **SQL Editor**, en remplaçant l'e-mail :

   ```sql
   insert into public.coordinateurs (user_id, commune_id, nom)
   select id, '00000000-0000-4000-8000-000000000001', 'Mairie démo'
   from auth.users where email = 'maire@exemple.fr'
   on conflict (user_id) do update set commune_id = excluded.commune_id, nom = excluded.nom;
   ```

   La requête peut être relancée sans erreur. Pour vérifier :
   `select * from public.coordinateurs;`

## 4. Renseigner l'app

Dans `.env.production` (mise en ligne) ou `.env.local` (développement) :

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

La clé « publishable » (ou « anon ») est publique par conception : ce sont les règles RLS
du script qui protègent les données. **Ne jamais utiliser la clé `secret` ou `service_role`
dans l'app.**

## Démo à deux écrans

- Ordinateur : `…/vigipop-app/#/mairie`, connexion coordinateur.
- Téléphone : l'app habitants.

Le coordinateur déclenche la crise : le téléphone bascule en mode crise en quelques secondes.
L'habitant envoie une demande : elle apparaît en direct dans le tableau de bord. Le
coordinateur la prend en charge : le suivi se met à jour sur le téléphone.

Côté volontaire (avec un compte) : « Je veux aider » → « Je suis disponible maintenant ».
Le volontaire apparaît dans « Volontaires disponibles ». Le coordinateur crée une mission
(« Nouvelle mission ») : elle s'affiche sur le téléphone, et « J'accepte » fait monter le
compteur de volontaires confirmés.

Hébergement : le volontaire active « Hébergement temporaire », indique ses places et son
adresse, puis se rend disponible. Un habitant demande de l'aide en cochant « Hébergement ».
Le serveur propose aussitôt la demande au foyer disponible le plus proche : le volontaire
la reçoit sur son accueil et répond ; s'il refuse, le foyer suivant est sollicité. Le
panneau « Hébergement solidaire » de la mairie montre besoins et foyers face à face :
« Changer de foyer », « Choisir un foyer » ou « Proposer au plus proche ». S'il accepte, chacun voit le prénom
et le numéro de l'autre, et le sinistré voit l'adresse avec l'itinéraire. Rien avant l'accord.

Utilise deux appareils, ou une fenêtre de navigation privée : dans un même navigateur, la
session mairie remplace la session de l'habitant.
