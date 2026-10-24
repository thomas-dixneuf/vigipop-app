# Notifications Vigipop

Vigipop prévient les habitants de trois façons :

1. **Centre de notifications** (la cloche) : crise déclenchée, nouvelle consigne, fin de crise,
   suivi de la demande d'aide, demande d'hébergement, hébergement trouvé, mission proposée.
   Fonctionne sans aucun réglage.
2. **Bandeau ou alerte du téléphone quand l'app est ouverte** (ou en arrière-plan), une fois les
   alertes activées par l'habitant (cloche → « Activer les alertes »).
3. **Alerte app fermée (push)** : demande la configuration ci-dessous, une seule fois.

Vigipop complète l'alerte officielle FR-Alert, il ne la remplace jamais.

## Mettre en place le push (≈ 15 minutes, une seule fois)

La clé privée ne doit passer que par toi et Supabase : ne l'envoie à personne.

### 1. Créer la file des alertes
Supabase → **SQL Editor** (barre de gauche) → **New query** → colle
`supabase/migrations/0008_notifications.sql` → **Run**.

### 2. Créer les clés
Ouvre l'espace mairie (`…/vigipop-app/#/mairie`) et connecte-toi. En bas de la colonne de droite,
panneau **Alertes sur les téléphones** → **Générer les clés**. Deux clés s'affichent : laisse
l'onglet ouvert. Elles sont créées dans ton navigateur, rien n'est envoyé.

### 3. Enregistrer les clés dans Supabase
Supabase → **Edge Functions** (barre de gauche) → onglet **Secrets** → ajoute trois secrets,
puis **Save** :

| Nom | Valeur |
| --- | --- |
| `VAPID_PUBLIC_KEY` | la clé publique (bouton Copier) |
| `VAPID_PRIVATE_KEY` | la clé privée (bouton Copier) |
| `VAPID_SUJET` | `mailto:` suivi de ton e-mail, par exemple `mailto:contact@vigipop.fr` |

### 4. Créer la fonction d'envoi
Supabase → **Edge Functions** → **Deploy a new function** → **Via Editor**.
- Nom de la fonction : `envoyer-push` (exactement).
- Remplace tout le code par le contenu de `supabase/functions/envoyer-push/index.ts`.
- Clique sur **Deploy function**.

Puis, dans la fonction `envoyer-push` → onglet **Details** (ou **Settings**) → désactive
**Verify JWT** (« Enforce JWT verification ») → **Save changes**. La fonction ne fait que relire
en base une alerte déjà en file : un appel extérieur ne peut rien envoyer d'autre.

### 5. Brancher la file sur la fonction
Supabase → **Database** → **Webhooks** (selon la version : **Integrations** → **Database
Webhooks**). Active les webhooks si demandé, puis **Create a new hook** :
- Name : `envoi_push`
- Table : `notifications_push`
- Events : coche seulement **Insert**
- Type : **Supabase Edge Functions**, fonction `envoyer-push`, méthode **POST**
- **Create webhook**

### 6. Vérifier
Recharge l'espace mairie : le panneau **Alertes sur les téléphones** affiche « ✓ Actives ».

## Tester
1. Sur le téléphone, ouvre l'app → cloche → **Activer les alertes** → autorise.
   **iPhone** : ajoute d'abord Vigipop à l'écran d'accueil (Partager → Sur l'écran d'accueil),
   puis ouvre-le depuis l'icône ; Safari seul ne reçoit pas de push.
2. Ferme l'app.
3. Dans l'espace mairie, déclenche la crise : l'alerte arrive sur le téléphone en quelques
   secondes. Un clic l'ouvre sur le bon écran.

## Qui reçoit quoi
| Événement | Destinataires |
| --- | --- |
| Crise déclenchée, nouvelle consigne, fin de crise | tous les téléphones abonnés de la commune |
| Demande prise en charge, aide organisée, close | l'auteur de la demande |
| Demande d'hébergement | le foyer sollicité |
| Hébergement trouvé | la personne hébergée |
| Nouvelle mission | les volontaires disponibles qui offrent ce type d'aide |
