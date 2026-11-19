# Vigipop — consignes pour Claude Code

Vigipop est une startup à impact social : identification, localisation et assistance des
personnes sinistrées lors de catastrophes. Cette app est la partie citoyenne. Elle complète
les secours et l'alerte officielle (FR-Alert), elle ne les remplace jamais.

## Règles produit (non négociables)
- **Données fictives uniquement** dans ce prototype (`src/data/fictif.ts`). Jamais de vraies
  données d'habitants avant la validation RGPD.
- **Le 112 reste visible** sur tout le parcours sinistré.
- Deux états : **veille** (préparation) et **crise** (déclenchée par la mairie). La barre de
  navigation reste identique dans les deux.
- Un signalement ne doit **jamais être bloqué** par la connexion, le réseau ou le GPS :
  saisie d'adresse en secours, envoi différé hors ligne.
- Connexion prévue par code SMS, sans mot de passe.
- **Sans compte, l'app n'est accessible qu'en mode crise** (`src/components/AccesProtege.tsx`) :
  signalement, consignes, lieux ouverts. Se proposer comme volontaire exige toujours un compte.
  Le 112 reste affiché sur l'écran de lancement, avec ou sans compte. Exception : la **carte**
  (`#/carte`) est consultable sans compte à tout moment, pour repérer les secours avant une crise.
- **Compte express** : sans compte, la demande d'aide propose prénom, nom de famille (migration 0019) et numéro de
  rappel, « fortement conseillés » mais jamais bloquants. Ces informations pré-remplissent l'inscription proposée
  après l'envoi ; le compte créé reste lié à la même demande.
- **Carte** : fond OpenStreetMap (Leaflet), adresses officielles via la Base Adresse Nationale,
  « Itinéraire » ouvre Google Maps. Jamais d'adresse privée (hébergement chez l'habitant) sur
  la carte des habitants : seulement un nombre de foyers. Le serveur propose automatiquement le
  foyer le plus proche (répartition automatique désactivable par la mairie, migration 0018), l'hébergeur accepte ou
  refuse, puis la personne sinistrée voit l'offre et peut la décliner : le foyer suivant lui est proposé (jamais deux
  fois le même). La mairie supervise et peut réattribuer.
  En crise, « Mes trajets » au-dessus de la carte : foyer qui m'héberge (après accord), mission acceptée, personne que je
  transporte ou à qui j'apporte du matériel, chacun avec son itinéraire (`src/outils/mesTrajets.ts`).
  Zones à éviter (zones touchées le jour J) tracées par la mairie, en rouge plein. Zones exposées aux risques connus (TIM fourni par la
  commune, DICRIM) : tracées ou importées en GeoJSON par la mairie, permanentes, en pointillés bleu nuit ; en crise elles s'estompent et une légende distingue « zone touchée aujourd'hui » de « zone exposée connue ».
- **Missions ciblées** : une mission a un type d'aide ; un volontaire ne reçoit que celles des
  types qu'il propose. Après un refus, la suivante de ses types lui est proposée. L'hébergement
  ne passe jamais par une mission (mise en relation dédiée). La cellule ajoute à une mission des bénévoles de la
  Protection civile (migration 0021) ; les entreprises conventionnées ne font jamais de mission, elles prêtent du matériel.
  Quand la cellule agit sur une demande eau ou médicaments, la mission est créée automatiquement (liée à la demande,
  sans l'adresse de l'habitant, donnée par téléphone au volontaire qui accepte).
- **Qui peut aider** : une seule liste mélangée (volontaires, Protection civile, entreprises pour le matériel), étiquetée
  par sorte, les libres et les plus proches d'abord. Les entreprises ne répondent qu'au besoin « Matériel ». En crise, la page
  « Demandes et aidants » n'a pas d'onglets ; « Besoins à couvrir » dit pour chaque besoin par qui et comment il est réglé.
- **Types d'aide** (mairie) : repris du formulaire « J'ai besoin d'aide » (Secours blessé/évacuation, Bloqué(e) chez soi,
  Hébergement, Eau & repas, Médicaments, Transport, Matériel), une couleur par type (`.mairie-type--*`), filtre au-dessus
  des demandes et étiquettes sur chaque demande.
- **Paires automatiques** : besoin « Transport » → volontaire avec véhicule, « Matériel » → volontaire
  avec matériel, proposés au plus proche disponible (table `entraides`, une sollicitation à la fois par
  volontaire). Coordonnées échangées seulement après l'accord. Les autres besoins (eau, médicaments,
  animaux) passent par le tableau « Besoins et volontaires » de la mairie, qui crée une mission ciblée.
- **Notifications** : centre de notifications dans l'app, alertes du téléphone, push app fermée
  (`docs/NOTIFICATIONS.md`). Applications Android/iOS : push natif (Firebase / Apple, migration 0022) avec un
  message **anonyme** seulement (« Nouvelle alerte de votre commune »), jamais le contenu de l'alerte. Clé privée VAPID uniquement dans les secrets Supabase, jamais dans
  le dépôt ni dans une conversation. Complète FR-Alert, ne le remplace jamais.
- **SMS** : SMS de secours reçus dans le tableau de bord (`recevoir-sms`, migration 0013, sans doublon
  avec l'app) ; vrai code de connexion activé par `VITE_CONNEXION_SMS=1` (`docs/SMS.md`).
- **RGPD** : suppression de compte par l'habitant, effacement automatique chaque nuit (migration 0014),
  déconnexion qui ne garde que les informations publiques ; « Mon foyer » reste sur le téléphone.
- **Comptes inactifs** (migration 0016) : l'inactivité se juge sur l'**ouverture de l'app** (signalée une fois par jour,
  `etat_compte`), jamais sur les connexions. 3 ans sans ouverture → rappel J-30 puis J-7 (notification + SMS, file
  `sms_a_envoyer`), puis effacement ; jamais sans rappel réellement parti, ni pendant une crise de sa commune, ni avec une
  demande en cours. Au retour,
  message « votre compte a été effacé » et recréation pré-remplie. La demande d'aide n'exige jamais de compte.
- **Géolocalisation** (migration 0015) : avec l'accord de l'habitant (désactivé par défaut), l'app affiche les services
  de la commune Vigipop où il se trouve (`commune_a_proximite`, centre et rayon réglés par la mairie). La position sert
  au calcul et n'est **jamais enregistrée**. Une demande en cours reste suivie par sa commune (pas de bascule) ; les
  missions et l'abonnement aux alertes restent sur sa commune. Hors couverture : « cette ville n'utilise pas encore
  Vigipop », le 112 reste affiché. Les **statistiques de passage** sont un accord séparé, facultatif, jamais coché
  d'office : rien n'est collecté ni revendu tant que le cadre (agrégation, seuils, avis CNIL) n'est pas validé.
- **Adresses vérifiées** : toute saisie de commune ou d'adresse passe par `ChampAdresse` (liste du géocodeur officiel
  IGN/BAN ; sans réponse, liste embarquée `src/data/adressesEmbarquees.ts`). Inscription, profil, foyer, hébergement et
  mairie exigent un choix dans la liste ; le signalement accepte le texte tapé (jamais bloquant).
- **Localisation proposée au lancement** (une fois, refusable avec « Plus tard », jamais en mode crise sans compte).
- **Espace mairie en pages** (`#/mairie/...`), menu simple, chaque lien avec une ligne qui dit à quoi il sert : Accueil
  (en crise, « À faire maintenant » : un geste par ligne, avec son bouton) ; Demandes et aidants (`#/mairie/renforts`,
  une seule page en crise : à gauche les demandes, étapes 1. Nouvelles, 2. En cours, 3. Terminées, sans bouton « Prendre
  en charge » : la demande passe en cours au nom du membre de la cellule dès qu'il agit, migration 0020 ; sous chaque
  demande, « Qui peut aider ? » ; à droite besoins à couvrir + liste unique « Qui peut aider » ; dessous missions et
  propositions automatiques ; onglets Protection civile et Entreprises conventionnées pour les fiches ; hors crise
  « Renforts », ces deux onglets seuls, plus les demandes s'il en reste une ouverte) ; Lieux d'accueil ;
  Journal et bilan ; tout en bas du menu, « Paramètres » (risques du DICRIM, alertes). Hors crise, l'Accueil sert aussi à tracer ou importer les zones exposées et à
  régler le périmètre des visiteurs géolocalisés. À la première connexion, la mairie renseigne d'abord les risques de sa commune ; elle peut passer
  l'étape (« Je ne les connais pas encore ») : rappel permanent sur l'Accueil et écran de nouveau proposé chaque semaine. **Hors crise**, seules les infos de la
  mairie s'affichent (Demandes d'aide absente du menu ; une demande reçue hors crise s'annonce sur l'Accueil). Le nom de la commune vient du compte
  (pas de renommage) ; son centre est trouvé automatiquement. Pas de sigle sans explication (TIM → « zones exposées »).
- **Partenaires** (migration 0017, mairie seule) : entreprises sous convention (matériel, SIRET, fin de convention ;
  solliciter → matériel engagé → rendu) et bénévoles d'association type réserve communale / Protection civile
  (compétences ; mobiliser → fin de mission). Chaque changement de statut passe au journal.
- **Mairie hors ligne** : dernière liste gardée sur l'ordinateur (effacée à la déconnexion), impression
  et export des demandes, bilan de crise sans donnée nominative.
- **Textes** : écriture inclusive dans les questionnaires habitants (« Blessé(e) », « Sinistré(e) »). Pas de besoin
  « Animaux » dans la demande d'aide. « Je suis en sécurité » peut être annulé (avec confirmation).
- Accessibilité : zones tactiles ≥ 44 px, vrais `<button>` et `<a>`, contrastes AA.

## Charte
Variables dans `src/index.css`. Bleu nuit `#0E3A52`, cyan `#86DDFF`, bleu clair `#B2D8DE`.
L'**orange** (`--urgence`) est réservé aux gestes urgents ; l'**ambre** (`--consigne`) aux
consignes de crise. Police Open Sans (repli système).
Logos dans `public/` : `logo.png` (recadré, petites tailles), `logo-slogan.png` (lancement),
`icon-192.png` / `icon-512.png` (icône de l'app). Sources 2000 px dans les assets de la maquette.

## Maquettes de référence
- DA d'origine : https://claude.ai/artifact/Br6dZo449UJ3GGEw1iem4a
- Accents urgence (référence actuelle) : https://claude.ai/artifact/LYHinyv5K2VnWhE7x8tyHv

## Serveur
- Supabase (UE). Schéma et droits : `supabase/migrations/` ; mise en place : `docs/SUPABASE.md`.
- Toute nouvelle table : RLS activée, droits par commune via `public.est_coordinateur()`.
- Côté app : `src/services/serveur.ts` ; sans variables d'environnement, mode démo local.
- Démonstration hors ligne avec l'espace mairie : `VITE_SERVEUR_LOCAL=1` (faux serveur dans le navigateur,
  `src/services/serveurLocal.ts`, données fictives). Sans `VITE_VUE` : habitant et mairie côte à côte
  (`src/presentation/`) ; `VITE_VUE=mairie` : espace mairie seul (compte `mairie@demo.vigipop.fr` / `demo`).
- Espace mairie : `src/mairie/` (route `#/mairie`). Application installable sur ordinateur (`npm run build:mairie`,
  publiée avec l'app) : `mairie/` (serveur réel) et `demo-mairie/` (données fictives, hors ligne). Fichier à
  double-cliquer sans Internet : `npm run fichier:mairie` → `vigipop-mairie-hors-ligne.html`.

## Code
- React + TypeScript + Vite, PWA via `vite-plugin-pwa`, `HashRouter`.
- Applications Android et iOS : coque Capacitor (`android/`, `ios/`, `docs/APPLIS-NATIVES.md`), construites par le
  workflow « Applications Android et iOS ». Ne pas y mettre de logique : tout reste dans l'app web.
- Nommage et textes en français. Un écran par fichier dans `src/screens/`.
- Avant de livrer : `npm run build` et `npm run lint` doivent passer.
