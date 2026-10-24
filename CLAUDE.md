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
  Zones à éviter tracées par la mairie, en rouge.
- **Missions ciblées** : une mission a un type d'aide ; un volontaire ne reçoit que celles des
  types qu'il propose. Après un refus, la suivante de ses types lui est proposée. L'hébergement
  ne passe jamais par une mission (mise en relation dédiée).
- **Notifications** : centre de notifications dans l'app, alertes du téléphone, push app fermée
  (`docs/NOTIFICATIONS.md`). Clé privée VAPID uniquement dans les secrets Supabase, jamais dans
  le dépôt ni dans une conversation. Complète FR-Alert, ne le remplace jamais.
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
