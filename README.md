# Vigipop — application citoyenne (prototype)

> Organiser l'imprévisible.

Prototype de l'application mobile Vigipop, construit à partir des maquettes du 22/10/2026.
C'est une **web app installable (PWA)** : elle s'ouvre dans le navigateur du téléphone et
s'ajoute à l'écran d'accueil comme une application, sans passer par les stores.

⚠️ **Toutes les données sont fictives.** Aucune vraie donnée d'habitant avant la phase
« Tests, sécurité et RGPD ». Les demandes restent sur le téléphone (stockage local).

## Ce que fait cette version (incrément 1)

- Écran de lancement
- Accueil **mode veille** : préparation, risques de la commune, lieux d'accueil
- Accueil **mode crise** (déclenché par la mairie) : alerte et consigne, « J'ai besoin d'aide »,
  « Je veux aider », « Je suis en sécurité », lieux ouverts
- Bouton **Démo** pour basculer veille / crise pendant les rendez-vous en mairie
- Parcours **« J'ai besoin d'aide »** : situation, position GPS (ou adresse si GPS indisponible),
  besoins, nombre de personnes, personne vulnérable
- Écran **« Demande transmise »** avec suivi, centre d'accueil, « Prévenir mes proches »
- **Sans réseau** : la demande est enregistrée et part automatiquement au retour du réseau
- Le **112** reste visible sur tout le parcours sinistré
- Barre de navigation conservée en mode crise

Carte, profil, notifications, « Je veux aider » et connexion par SMS sont des écrans
provisoires, prévus aux prochains incréments.

## Lancer le projet

Prérequis : [Node.js](https://nodejs.org) 22 ou plus.

```bash
npm install
npm run dev        # http://localhost:5173
```

Pour tester sur ton téléphone sur le même Wi-Fi : `npm run dev -- --host`, puis ouvre
l'adresse « Network » affichée.

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Version de production dans `dist/` |
| `npm run preview` | Prévisualiser la version de production |
| `npm run lint` | Vérifier le code |

## Mise en ligne

Chaque push sur `main` publie l'app sur GitHub Pages (`.github/workflows/deploy.yml`).
À activer une fois : **Settings → Pages → Source : GitHub Actions**.

## Organisation du code

```
src/
  data/fictif.ts       données de démonstration (commune, alerte, lieux…)
  state/AppState.tsx   mode veille/crise et demande en cours (stockée sur le téléphone)
  components/          barre de navigation, en-tête, bandeau 112, icônes…
  screens/             un fichier par écran
  index.css            couleurs de la charte (variables CSS)
```

## Stack

React + TypeScript + Vite, `vite-plugin-pwa` (installation et hors ligne), React Router.
À venir : Supabase hébergé en UE pour le serveur et le tableau de bord mairie.
