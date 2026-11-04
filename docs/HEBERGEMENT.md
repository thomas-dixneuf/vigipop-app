# Hébergement de l'app en France (sortie de GitHub Pages)

**Pourquoi.** L'app est aujourd'hui servie par GitHub Pages, sur des serveurs hors de l'Union
européenne. Les données des habitants, elles, sont déjà en UE (Supabase, région UE) : GitHub ne
sert que les fichiers de l'app. Mais les adresses IP des visiteurs passent par GitHub, et une
mairie demandera un hébergement en France. C'est un point de la cartographie RGPD du 26/10.

**Recommandation.** Servir l'app depuis l'hébergement OVH déjà prévu pour le site vitrine
(France), à l'adresse `https://<domaine>/application/`. Coût supplémentaire : aucun.

## Bascule, pas à pas
1. Dans GitHub (dépôt vigipop-app) → **Settings → Secrets and variables → Actions** : créer
   `FTP_SERVEUR`, `FTP_IDENTIFIANT`, `FTP_MOT_DE_PASSE` (identifiants FTP de l'hébergement OVH,
   espace client OVH → Hébergements → FTP-SSH). **Ne jamais les écrire dans une conversation.**
2. **Actions → « Mise en ligne (OVH, France) » → Run workflow.** L'app est déposée dans
   `www/application/`. WordPress continue de servir le reste du site.
3. Ouvrir `https://<domaine>/application/` sur un téléphone, installer l'app, vérifier la carte,
   une demande et l'espace mairie (`#/mairie`).
4. Mettre ce lien dans `site-vitrine/app/index.html` (`LIEN_WEB`).
5. Quand tout va bien : désactiver GitHub Pages (**Settings → Pages → Unpublish**) et passer
   `.github/workflows/deploy.yml` en lancement manuel. Les téléphones qui avaient installé
   l'ancienne adresse doivent réinstaller l'app depuis la nouvelle.

## À vérifier
- HTTPS actif sur le domaine (Let's Encrypt OVH) : sans HTTPS, ni installation ni alertes.
- Les alertes push sont liées à l'adresse : les habitants devront réactiver les alertes.
- Plus tard (apps des stores, Capacitor) : les fichiers de l'app sont dans l'app elle-même,
  cet hébergement ne sert alors qu'à la version web.
