// Vigipop — fonction serveur « recevoir-sms » (Supabase Edge Function, Deno)
// La passerelle SMS de la commune (Twilio, OVH, Brevo…) appelle cette adresse à chaque SMS reçu :
//   https://<projet>.supabase.co/functions/v1/recevoir-sms?commune=<id de la commune>&cle=<SMS_CLE_WEBHOOK>
// Le SMS devient une demande dans le tableau de bord mairie (étiquette « Reçue par SMS »).
// S'il vient de l'app (message pré-rédigé), on en relit la référence, la situation, les besoins…
// Un SMS libre est gardé tel quel : la mairie lit le message et rappelle la personne.
//
// Secret à créer dans Supabase (Edge Functions → Secrets) : SMS_CLE_WEBHOOK (longue chaîne aléatoire).
// À déployer sans vérification de jeton : `supabase functions deploy recevoir-sms --no-verify-jwt`
// (la passerelle n'a pas de compte Supabase ; c'est la clé dans l'adresse qui protège).
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const situations: Record<string, string> = {
  'sinistré, en sécurité': 'sinistre',
  'bloqué chez moi': 'bloque',
  "besoin d'évacuation": 'evac',
  'personne blessée': 'blesse',
}
const besoins: Record<string, string> = {
  hébergement: 'heb',
  'eau & repas': 'eau',
  médicaments: 'med',
  transport: 'transport',
  matériel: 'materiel',
  animaux: 'animaux',
}

// Lecture du SMS pré-rédigé par l'app (voir src/screens/Confirmation.tsx)
export function lireSms(texte: string) {
  const ligne = (prefixe: string) =>
    texte
      .split(/\r?\n/)
      .find((l) => l.toLowerCase().startsWith(prefixe))
      ?.slice(prefixe.length)
      .trim() ?? ''
  const reference = texte.match(/réf\.?\s*(VG-\d{4})/i)?.[1]?.toUpperCase() ?? null
  const personnes = Number(texte.match(/(\d{1,2})\s+personnes?/i)?.[1] ?? '') || null
  return {
    reference,
    situation: situations[ligne('situation :').toLowerCase()] ?? null,
    besoins: ligne('besoins :')
      .split(',')
      .map((b) => besoins[b.trim().toLowerCase()])
      .filter(Boolean),
    personnes,
    vulnerable: /vulnérable/i.test(texte),
    position: ligne('lieu :'),
    prenom: ligne('prénom :'),
  }
}

async function lireRequete(requete: Request) {
  const type = requete.headers.get('content-type') ?? ''
  if (type.includes('application/json')) {
    const corps = await requete.json().catch(() => ({}))
    return { numero: String(corps.from ?? corps.numero ?? corps.sender ?? ''), texte: String(corps.text ?? corps.body ?? corps.message ?? '') }
  }
  // Formulaire (Twilio : From, Body)
  const champs = await requete.formData().catch(() => new FormData())
  return { numero: String(champs.get('From') ?? champs.get('from') ?? ''), texte: String(champs.get('Body') ?? champs.get('text') ?? '') }
}

Deno.serve(async (requete) => {
  const url = new URL(requete.url)
  const cle = Deno.env.get('SMS_CLE_WEBHOOK') ?? ''
  if (!cle || url.searchParams.get('cle') !== cle) return new Response('Accès refusé', { status: 403 })
  const commune = url.searchParams.get('commune') ?? ''
  if (!/^[0-9a-f-]{36}$/i.test(commune)) return new Response('Commune manquante', { status: 400 })

  const { numero, texte } = await lireRequete(requete)
  if (!texte.trim()) return new Response('SMS vide', { status: 400 })

  const sms = lireSms(texte)
  const base = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { error } = await base.rpc('recevoir_sms', {
    p_commune: commune,
    p_reference: sms.reference,
    p_situation: sms.situation,
    p_besoins: sms.besoins,
    p_personnes: sms.personnes,
    p_vulnerable: sms.vulnerable,
    p_position: sms.position,
    p_prenom: sms.prenom,
    p_telephone: numero.slice(0, 20),
    p_message: texte.slice(0, 1600),
  })
  if (error) return new Response('Erreur serveur', { status: 500 })
  // Réponse vide comprise par Twilio (aucun SMS renvoyé, pour ne rien facturer à l'habitant)
  return new Response('<Response/>', { headers: { 'Content-Type': 'text/xml' } })
})
