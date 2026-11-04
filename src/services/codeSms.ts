import { assurerSession, serveur } from './serveur.ts'

// Connexion par code SMS (docs/SMS.md, section 2). Supabase envoie et vérifie le code.
// Désactivée tant que VITE_CONNEXION_SMS n'est pas à 1 : démo, n'importe quel code passe.
export const connexionSmsActive = !!serveur && import.meta.env.VITE_CONNEXION_SMS === '1'

// Type de code attendu par Supabase : « sms » (connexion) ou « phone_change » (numéro rattaché
// au compte déjà ouvert sur ce téléphone, pour garder les demandes déjà envoyées)
export type TypeCode = 'sms' | 'phone_change'

// 06 12 34 56 78 → +33612345678
export function numeroInternational(numero: string) {
  const chiffres = numero.replace(/[\s.-]/g, '')
  return chiffres.startsWith('+') ? chiffres : `+33${chiffres.replace(/^0/, '')}`
}

const messageErreur = (message: string) =>
  /rate|seconds|too many/i.test(message)
    ? 'Trop de demandes de code. Patientez une minute avant de réessayer.'
    : /not found|signups not allowed|user not found/i.test(message)
      ? "Aucun compte n'existe avec ce numéro. Créez votre compte."
      : "Le code n'a pas pu être envoyé. Vérifiez le numéro, ou réessayez dans un instant."

export async function envoyerCode(telephone: string, nouveauNumero: boolean): Promise<{ type: TypeCode } | { erreur: string }> {
  if (!connexionSmsActive || !serveur) return { type: 'sms' }
  const phone = numeroInternational(telephone)
  try {
    if (nouveauNumero) {
      // Inscription ou changement de numéro : on rattache le numéro à la session de ce téléphone
      await assurerSession(serveur)
      const { error } = await serveur.auth.updateUser({ phone })
      if (!error) return { type: 'phone_change' }
      // Numéro déjà utilisé par un compte : c'est une connexion
      if (!/already|registered|exists/i.test(error.message)) return { erreur: messageErreur(error.message) }
    }
    const { error } = await serveur.auth.signInWithOtp({ phone, options: { shouldCreateUser: false } })
    return error ? { erreur: messageErreur(error.message) } : { type: 'sms' }
  } catch {
    return { erreur: "Pas de réseau pour l'instant. Réessayez dès que possible : vos demandes d'aide, elles, partent sans compte." }
  }
}

export async function verifierCode(telephone: string, code: string, type: TypeCode): Promise<string | null> {
  if (!connexionSmsActive || !serveur) return null
  try {
    const { error } = await serveur.auth.verifyOtp({ phone: numeroInternational(telephone), token: code, type })
    return error ? 'Code incorrect ou expiré. Vérifiez le SMS, ou demandez un nouveau code.' : null
  } catch {
    return "Pas de réseau pour l'instant. Réessayez dès que possible."
  }
}
