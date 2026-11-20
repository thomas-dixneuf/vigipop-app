# Connexion des habitants : code reçu par e-mail

Pas de mot de passe. L'habitant tape son adresse e-mail et reçoit un **code à 6 chiffres**.
Choix de Thomas (20/11/2026) : l'e-mail est gratuit, le SMS coûte quelques centimes par code.

- Le **numéro de mobile** reste demandé à l'inscription : c'est le numéro que la mairie rappelle
  en cas de crise. Il n'est pas vérifié.
- Le compte créé reste lié aux demandes d'aide déjà envoyées depuis ce téléphone (la session
  anonyme reçoit l'adresse, elle n'est pas remplacée).
- Une demande d'aide n'exige jamais de compte.
- Sans réglage, l'app reste en **démo** : aucun e-mail n'est envoyé, n'importe quel code passe.

## Mettre en place les vrais e-mails (≈ 20 minutes, une fois)

### 1. Un service d'envoi d'e-mails (gratuit)
Supabase n'envoie lui-même que quelques e-mails par heure, et seulement aux membres du projet :
il faut brancher un service d'envoi. Conseil : **Brevo** (société française, 300 e-mails par jour
gratuits).
1. Crée un compte sur brevo.com avec l'adresse Vigipop.
2. **Expéditeurs, domaines** : ajoute l'adresse qui enverra les codes (par exemple
   `connexion@vigipop.fr`, ou ton Gmail Vigipop en attendant) et valide-la.
3. **SMTP et API** → onglet **SMTP** → **Générer une nouvelle clé SMTP**. Note le serveur
   (`smtp-relay.brevo.com`), le port (`587`), l'identifiant et la clé. **La clé est secrète : ne
   l'envoie à personne.**

### 2. Brancher Brevo dans Supabase
**Authentication** → **Emails** (ou **Settings**) → **SMTP Settings** → **Enable custom SMTP** :
- Sender email : l'adresse validée à l'étape 1 ; Sender name : `Vigipop`
- Host `smtp-relay.brevo.com`, port `587`, username et password : ceux de Brevo
- **Save**

### 3. Un code plutôt qu'un lien
**Authentication** → **Emails** → **Templates**. Dans les deux modèles ci-dessous, remplace le
texte par celui-ci (le code s'affiche à la place de `{{ .Token }}`), puis **Save** :

- **Magic Link** (connexion), sujet `Votre code de connexion Vigipop` :
  ```html
  <p>Bonjour,</p>
  <p>Votre code de connexion Vigipop : <strong style="font-size:24px">{{ .Token }}</strong></p>
  <p>Il expire dans 1 heure. Si vous n'avez rien demandé, ignorez cet e-mail.</p>
  ```
- **Change Email Address** (création du compte), sujet `Votre code Vigipop` :
  ```html
  <p>Bonjour,</p>
  <p>Votre code pour créer votre compte Vigipop : <strong style="font-size:24px">{{ .Token }}</strong></p>
  <p>Si vous n'avez rien demandé, ignorez cet e-mail.</p>
  ```

**Authentication** → **Sign In / Providers** → **Email** : vérifie que **Email** est activé et que
la longueur du code (**Email OTP Length**) est **6**.

### 4. Activer dans l'app
Dis à Claude « les e-mails sont branchés » : il ajoutera `VITE_CONNEXION_EMAIL=1` dans
`.env.production` (rien de secret).

## Plus tard
- **SMS à la place de l'e-mail** : `docs/SMS.md`, partie 2 (réglage caché, rien à refaire dans l'app).
- **Google / Apple** : boutons « Continuer avec Google / Apple » prévus ensuite. Sur iPhone, Apple
  impose « Se connecter avec Apple » dès qu'on propose Google.
