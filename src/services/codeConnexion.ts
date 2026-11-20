import { assurerSession, serveur } from './serveur.ts'

// Connexion sans mot de passe : un code à 6 chiffres reçu par e-mail (par défaut, gratuit) ou par SMS
// (payant, VITE_CONNEXION_PAR=sms). Supabase envoie et vérifie le code. Voir docs/CONNEXION.md.
// Le numéro de mobile est toujours demandé pour que la mairie puisse rappeler ; il n'est vérifié
// que si la connexion se fait par SMS.
export const connexionPar: 'email' | 'sms' = import.meta.env.VITE_CONNEXION_PAR === 'sms' ? 'sms' : 'email'
export const parSms = connexionPar === 'sms'

// Sans VITE_CONNEXION_EMAIL=1 (ou VITE_CONNEXION_SMS=1 pour le SMS) : démo, n'importe quel code passe
export const connexionActive =
  !!serveur && (parSms ? import.meta.env.VITE_CONNEXION_SMS === '1' : import.meta.env.VITE_CONNEXION_EMAIL === '1')

// Type de code attendu par Supabase : connexion (« email » / « sms »), ou adresse / numéro rattaché au compte
// déjà ouvert sur ce téléphone (« email_change » / « phone_change »), pour garder les demandes déjà envoyées
export type TypeCode = 'email' | 'email_change' | 'sms' | 'phone_change'

// Moyen de recevoir le code : « par e-mail à … » ou « par SMS au … »
export const moyenCode = parSms ? 'par SMS' : 'par e-mail'

export function emailValide(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())
}

// 06 12 34 56 78 → +33612345678
export function numeroInternational(numero: string) {
  const chiffres = numero.replace(/[\s.-]/g, '')
  return chiffres.startsWith('+') ? chiffres : `+33${chiffres.replace(/^0/, '')}`
}

// L'identifiant qui reçoit le code : l'adresse e-mail, ou le numéro en mode SMS
export const identifiant = ({ email, telephone }: { email?: string; telephone: string }) => (parSms ? telephone : (email ?? ''))

const normaliser = (valeur: string) => (parSms ? { phone: numeroInternational(valeur) } : { email: valeur.trim().toLowerCase() })

const messageErreur = (message: string) =>
  /rate|seconds|too many/i.test(message)
    ? 'Trop de demandes de code. Patientez une minute avant de réessayer.'
    : /not found|signups not allowed|user not found/i.test(message)
      ? `Aucun compte n'existe avec ${parSms ? 'ce numéro' : 'cette adresse'}. Créez votre compte.`
      : `Le code n'a pas pu être envoyé. Vérifiez ${parSms ? 'le numéro' : "l'adresse e-mail"}, ou réessayez dans un instant.`

export async function envoyerCode(valeur: string, nouveau: boolean): Promise<{ type: TypeCode } | { erreur: string }> {
  const connexion: TypeCode = parSms ? 'sms' : 'email'
  if (!connexionActive || !serveur) return { type: connexion }
  const cible = normaliser(valeur)
  try {
    if (nouveau) {
      // Inscription ou changement : rattaché à la session de ce téléphone (garde la demande déjà envoyée)
      await assurerSession(serveur)
      const { error } = await serveur.auth.updateUser(cible)
      if (!error) return { type: parSms ? 'phone_change' : 'email_change' }
      // Déjà utilisé par un compte : c'est une connexion
      if (!/already|registered|exists/i.test(error.message)) return { erreur: messageErreur(error.message) }
    }
    const { error } = await serveur.auth.signInWithOtp({ ...cible, options: { shouldCreateUser: false } })
    return error ? { erreur: messageErreur(error.message) } : { type: connexion }
  } catch {
    return { erreur: "Pas de réseau pour l'instant. Réessayez dès que possible : vos demandes d'aide, elles, partent sans compte." }
  }
}

export async function verifierCode(valeur: string, code: string, type: TypeCode): Promise<string | null> {
  if (!connexionActive || !serveur) return null
  try {
    const { error } = parSms
      ? await serveur.auth.verifyOtp({ phone: numeroInternational(valeur), token: code, type: type as 'sms' | 'phone_change' })
      : await serveur.auth.verifyOtp({ email: valeur.trim().toLowerCase(), token: code, type: type as 'email' | 'email_change' })
    return error
      ? `Code incorrect ou expiré. Vérifiez ${parSms ? 'le SMS' : "l'e-mail (et les courriers indésirables)"}, ou demandez un nouveau code.`
      : null
  } catch {
    return "Pas de réseau pour l'instant. Réessayez dès que possible."
  }
}
