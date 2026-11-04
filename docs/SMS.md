# SMS de secours et code de connexion par SMS

Deux usages, une même passerelle SMS :

1. **SMS de secours** : quand Internet ne passe pas, l'app propose d'envoyer la demande par SMS
   (message pré-rédigé). Ces SMS arrivent dans le tableau de bord mairie avec l'étiquette
   « Reçue par SMS ».
2. **Code de connexion** : l'habitant reçoit un code à 6 chiffres pour se connecter, sans mot de
   passe (section 2).

Sans passerelle, rien ne casse : le SMS de secours part vers le numéro choisi (ou vers le
téléphone de la cellule de crise), et la connexion reste en mode démo.

## 1. Recevoir les SMS de secours dans le tableau de bord

### Choisir la passerelle
Il faut un **numéro capable de recevoir des SMS** et de les transmettre à une adresse web
(« webhook »). Twilio fonctionne directement (champs `From` et `Body`). Toute passerelle qui
envoie du JSON `{ "from": "...", "text": "..." }` fonctionne aussi (OVH, Brevo… à vérifier selon
l'offre). Coût : un numéro mobile virtuel coûte quelques euros par mois, plus quelques centimes
par SMS reçu (à vérifier sur le devis de la passerelle choisie).

### Mise en place
1. Lancer `supabase/migrations/0013_sms_secours.sql` dans **SQL Editor** (après 0012).
2. **Edge Functions → Secrets** : ajouter `SMS_CLE_WEBHOOK`, une longue chaîne aléatoire
   (par exemple 40 caractères). **Ne jamais la mettre dans le dépôt ni dans une conversation.**
3. **Edge Functions → Deploy a new function → Via Editor** : nom `recevoir-sms`, coller
   `supabase/functions/recevoir-sms/index.ts`, **Deploy function**. Puis dans la fonction,
   désactiver **Verify JWT** : la passerelle n'a pas de compte Supabase, c'est la clé dans
   l'adresse qui protège.
4. Dans la passerelle, régler l'adresse appelée à chaque SMS reçu :

   ```
   https://<projet>.supabase.co/functions/v1/recevoir-sms?commune=<id de la commune>&cle=<SMS_CLE_WEBHOOK>
   ```

   L'id de la commune se lit dans **Table Editor → communes**.
5. Mettre le numéro de la passerelle dans `.env.production` : `VITE_SMS_CELLULE=06…`.
   C'est vers ce numéro que l'app propose d'envoyer le SMS de secours.

### Ce qui se passe
- SMS pré-rédigé par l'app : référence, situation, besoins, nombre de personnes, lieu et prénom
  sont relus automatiquement.
- SMS libre (écrit à la main) : la demande est créée avec le texte complet, une référence
  `SMS-xxxx` et le numéro de l'expéditeur. La mairie lit le message et rappelle.
- Pas de doublon : si l'app réussit ensuite à envoyer la même demande (même référence, moins
  de 48 h), elle remplace la demande SMS en gardant ce que la mairie a déjà fait (statut,
  réponse). Un SMS reçu après la demande de l'app est seulement noté dans le journal.

## 2. Code de connexion par SMS

Supabase envoie lui-même le code (« OTP ») par la passerelle choisie.

1. **Authentication → Sign In / Providers → Phone** : activer, choisir le fournisseur SMS
   (Twilio, MessageBird, Vonage, Textlocal…) et renseigner ses identifiants **dans Supabase
   seulement**.
2. Dans **SMS message**, garder `{{ .Code }}` dans le texte, par exemple :
   `Vigipop : votre code de connexion est {{ .Code }}. Il expire dans 10 minutes.`
3. Dans `.env.production`, ajouter `VITE_CONNEXION_SMS=1`.

Tant que `VITE_CONNEXION_SMS` n'est pas à `1`, l'app garde la connexion de démonstration
(n'importe quel code à 6 chiffres passe) : pratique pour les rendez-vous en mairie.

Le compte créé par SMS reste lié aux demandes déjà envoyées depuis ce téléphone : la session
anonyme est rattachée au numéro, elle n'est pas remplacée.
