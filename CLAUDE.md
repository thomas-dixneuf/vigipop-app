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
- **Compte express** : sans compte, la demande d'aide propose un prénom et un numéro de rappel
  facultatifs (jamais bloquants). Ces informations pré-remplissent l'inscription proposée
  après l'envoi ; le compte créé reste lié à la même demande.
- **Carte** : fond OpenStreetMap (Leaflet), adresses officielles via la Base Adresse Nationale,
  « Itinéraire » ouvre Google Maps. Jamais d'adresse privée (hébergement chez l'habitant) sur
  la carte des habitants : seulement un nombre de foyers. Le serveur propose automatiquement le
  foyer le plus proche, l'hébergeur accepte ou refuse, la mairie supervise et peut réattribuer.
  Zones à éviter tracées par la mairie, en rouge. Zones exposées aux risques connus (TIM fourni par la
  commune, DICRIM) : tracées ou importées en GeoJSON par la mairie, permanentes, en pointillés bleu nuit.
- **Missions ciblées** : une mission a un type d'aide ; un volontaire ne reçoit que celles des
  types qu'il propose. Après un refus, la suivante de ses types lui est proposée. L'hébergement
  ne passe jamais par une mission (mise en relation dédiée).
- **Paires automatiques** : besoin « Transport » → volontaire avec véhicule, « Matériel » → volontaire
  avec matériel, proposés au plus proche disponible (table `entraides`, une sollicitation à la fois par
  volontaire). Coordonnées échangées seulement après l'accord. Les autres besoins (eau, médicaments,
  animaux) passent par le tableau « Besoins et volontaires » de la mairie, qui crée une mission ciblée.
- **Notifications** : centre de notifications dans l'app, alertes du téléphone, push app fermée
  (`docs/NOTIFICATIONS.md`). Clé privée VAPID uniquement dans les secrets Supabase, jamais dans
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
- **Mairie hors ligne** : dernière liste gardée sur l'ordinateur (effacée à la déconnexion), impression
  et export des demandes, bilan de crise sans donnée nominative.
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
- Espace mairie : `src/mairie/` (route `#/mairie`).

## Code
- React + TypeScript + Vite, PWA via `vite-plugin-pwa`, `HashRouter`.
- Nommage et textes en français. Un écran par fichier dans `src/screens/`.
- Avant de livrer : `npm run build` et `npm run lint` doivent passer.
