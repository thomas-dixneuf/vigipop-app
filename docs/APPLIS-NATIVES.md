# Applications Android et iOS

Les applications Android et iOS sont une « coque » autour de l'app web (outil Capacitor).
**Le code de l'app ne change pas** : chaque modification de l'app est reprise dans les deux
applications à la construction suivante. Rien à faire de spécial pour continuer à modifier l'app.

## Comment elles sont construites
GitHub construit tout seul les applications à chaque mise à jour de `main`
(onglet **Actions** → workflow **Applications Android et iOS**). On peut aussi le lancer à la main :
**Run workflow**. En bas de la page d'un lancement terminé, rubrique **Artifacts** :

| Fichier | À quoi il sert |
| --- | --- |
| `vigipop-android-test-apk` | à installer directement sur un téléphone Android pour tester |
| `vigipop-android-play-store-aab` | le fichier à envoyer sur le Play Store |

iOS : Apple impose un Mac pour construire. GitHub en prête un (gratuit pour un dépôt public).
Sans compte Apple, il vérifie seulement que l'app se construit ; avec le compte, il l'enverra
directement sur TestFlight (test sur iPad/iPhone) puis l'App Store.

## Tester sur un téléphone Android dès maintenant
1. Sur le téléphone, ouvre https://github.com/thomas-dixneuf/vigipop-app/releases/download/android-test/vigipop-test.apk
   (toujours la dernière version de `main`).
2. Ouvre le fichier téléchargé → autorise « installer des applis inconnues » pour ton navigateur
   → **Installer**. Pour une nouvelle version, refais la même chose : elle remplace l'ancienne.

## Ce qui reste à faire quand les comptes existeront

### Google Play
1. Claude crée la **clé de signature « upload »** et te la remet (à garder précieusement, avec
   son mot de passe, dans un gestionnaire de mots de passe : elle prouve que les mises à jour viennent de toi).
2. GitHub → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**,
   quatre secrets : `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`,
   `ANDROID_KEY_PASSWORD` (valeurs données par Claude avec la clé).
3. Play Console → **Créer une application** (nom Vigipop, français, application gratuite).
4. Envoie à la main le premier fichier `.aab` (test interne, puis test fermé si compte personnel :
   12 testeurs pendant 14 jours avant de pouvoir publier).

### Apple App Store
1. App Store Connect → **Utilisateurs et accès** → **Intégrations** → **Clés API App Store Connect**
   → nouvelle clé, accès **Gestionnaire d'apps** (App Manager). Télécharge le fichier `.p8`
   (une seule fois possible) et note l'**ID de clé** et l'**ID de l'émetteur** (Issuer ID).
2. Developer → **Membership** : note le **Team ID** (10 caractères).
3. App Store Connect → **Apps** → **+** → nouvelle app, identifiant `fr.vigipop.app`.
4. GitHub → secrets (comme ci-dessus) : `APPLE_TEAM_ID`, `APPLE_API_KEY_ID`,
   `APPLE_API_ISSUER_ID`, `APPLE_API_KEY_P8` (tout le contenu du fichier `.p8`).
5. Lance le workflow : l'app arrive dans TestFlight, à installer sur l'iPad avec l'app TestFlight.

### Pour les deux, après la refonte du design
Captures d'écran (`npm run captures`), textes de la fiche, politique de confidentialité en ligne,
questionnaire sur les données collectées. Icônes et écran de démarrage : remplacer les images
de `assets/` puis `npx @capacitor/assets generate --android --ios`.

## Pour les développeurs
- `npm run natif:sync` : construit l'app web pour les applications (`APP_NATIVE=1`, sans service
  worker) et la copie dans `android/` et `ios/`.
- Identifiant `fr.vigipop.app` : ne plus le changer après la première publication.
- Numéro de version : `VERSION_NAME` dans `.github/workflows/applis-natives.yml` (à monter à chaque
  publication) ; le numéro de construction augmente tout seul.
- Notifications « app fermée » : voir la partie ci-dessous. Le code est dans `src/outils/alertes.ts`
  (plugin `@capacitor/push-notifications`) et `supabase/functions/envoyer-push/index.ts`.

## Alertes « app fermée » dans les applications (push natif)

Le push web (VAPID) ne fonctionne pas dans les applications. Elles utilisent le push natif :
Firebase (Google) pour Android, le service d'Apple pour iOS. **Choix de Thomas (19/11/2026) : messages
anonymes.** Le téléphone affiche seulement « Nouvelle alerte de votre commune. Ouvrez Vigipop pour la
voir. » ; le détail est dans la cloche, à l'ouverture. Google et Apple ne voient donc ni la consigne,
ni la demande, ni le nom de la personne. La version web garde son push (chiffré de bout en bout).

Sans les réglages ci-dessous, rien ne casse : l'app fonctionne, seule l'alerte app fermée manque.

### 1. Base de données (une fois)
Supabase → **SQL Editor** → colle `supabase/migrations/0022_push_natif.sql` → **Run**.
Puis **Edge Functions** → `envoyer-push` → remplace le code par celui de
`supabase/functions/envoyer-push/index.ts` → **Deploy**.

### 2. Android : projet Firebase (gratuit, ≈ 10 minutes, possible dès maintenant)
1. https://console.firebase.google.com avec le Gmail dédié Vigipop → **Créer un projet** → nom
   `Vigipop` → désactive Google Analytics (inutile) → **Créer**.
2. Dans le projet : icône Android → nom du package `fr.vigipop.app` → **Enregistrer l'application**
   → télécharge `google-services.json`. Ignore les étapes suivantes (déjà faites dans le code).
3. GitHub → **Settings** → **Secrets and variables** → **Actions** → **New repository secret** :
   nom `GOOGLE_SERVICES_JSON`, valeur : tout le contenu du fichier `google-services.json`.
4. Firebase → ⚙️ **Paramètres du projet** → **Comptes de service** → **Générer une nouvelle clé
   privée** → un fichier `.json` se télécharge. **C'est une clé secrète : ne l'envoie à personne.**
5. Supabase → **Edge Functions** → **Secrets** → nouveau secret `FIREBASE_COMPTE_SERVICE`, valeur :
   tout le contenu de ce fichier. Puis supprime le fichier de ton ordinateur.

### 3. iOS : clé Apple (quand le compte Apple Developer existe)
1. developer.apple.com → **Certificates, IDs & Profiles** → **Keys** → **+** → coche
   **Apple Push Notifications service (APNs)** → télécharge le fichier `.p8` (une seule fois possible).
2. Supabase → **Edge Functions** → **Secrets** : `APNS_CLE_P8` (contenu du `.p8`), `APNS_CLE_ID`
   (identifiant de la clé, 10 caractères), `APNS_EQUIPE_ID` (Team ID), `APNS_BUNDLE` = `fr.vigipop.app`.

### Tester
Installe l'app (APK de test Android, TestFlight pour iOS) → cloche → **Activer les alertes** →
autorise. Ferme l'app, puis déclenche une crise d'essai depuis l'espace mairie : le téléphone doit
afficher « Nouvelle alerte de votre commune ». Un appui ouvre l'app sur le bon écran.
