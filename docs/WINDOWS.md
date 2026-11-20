# Vigipop sur Windows

L'app habitant n'a pas besoin d'un logiciel `.exe` : c'est une application web installable (PWA).
Deux façons de l'installer sur un PC Windows.

## 1. Depuis le site (déjà possible, gratuit)

1. Ouvrir https://thomas-dixneuf.github.io/vigipop-app/ dans **Edge** ou **Chrome**.
2. Cliquer sur **« Installer l'app sur cet appareil »** (écran de lancement ou « Mon profil »), ou sur l'icône
   d'installation dans la barre d'adresse.
3. Vigipop s'ouvre dans sa propre fenêtre, avec son icône dans le menu Démarrer et sur la barre des tâches.
   Elle se met à jour toute seule et reste utilisable sans réseau (service worker).

Le bouton n'apparaît que quand le navigateur accepte l'installation (`src/outils/installation.ts`) : pas dans
Firefox ni Safari, pas si l'app est déjà installée, jamais dans les applications Android/iOS, et pas sur l'écran
d'accès d'urgence (crise sans compte), pour ne rien ajouter entre la personne et « J'ai besoin d'aide ».

Le site vitrine peut renvoyer vers ce lien avec un bouton « Installer sur mon ordinateur ».

## 2. Microsoft Store (à faire par Thomas, puis Claude)

Le Store emballe la même app web : aucune version à maintenir en plus, chaque mise à jour du site arrive
dans l'app du Store.

### Étape de Thomas : compte développeur

1. https://storedeveloper.microsoft.com → **compte individuel** (gratuit pour un particulier ; vérifier le prix
   affiché le jour de l'inscription). Pièce d'identité demandée pour la vérification.
2. Dans Partner Center : **Applications et jeux → Nouveau produit → Application MSIX ou PWA**, réserver le nom
   **Vigipop**.
3. Dans **Gestion des produits → Identité du produit**, copier trois valeurs et les donner à Claude (elles ne sont
   pas secrètes) : `Package/Identity/Name`, `Package/Identity/Publisher`, `Package/Properties/PublisherDisplayName`.

### Étape de Claude : le paquet

1. https://www.pwabuilder.com → adresse de l'app → **Package for stores → Windows**, avec les trois valeurs.
2. Le fichier `.msixbundle` obtenu est déposé dans la soumission Partner Center.

### Fiche du Store (après la refonte du design)

Captures d'écran (au moins une, 1366×768 ou plus), description, catégorie, classification par âge (questionnaire),
et **adresse de la politique de confidentialité** (obligatoire). Vérification par Microsoft : quelques jours.

### Point d'attention : l'adresse

L'app du Store pointe vers l'adresse du site. Si l'app quitte `thomas-dixneuf.github.io` pour un nom de domaine
Vigipop, il faudra refaire le paquet : mieux vaut publier sur le Store une fois l'adresse définitive choisie.

L'identité de l'app installée est fixée dans le manifeste (`id: './'`, `vite.config.ts`) : ne plus la changer.
