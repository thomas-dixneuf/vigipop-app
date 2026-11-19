// Vigipop — fonction serveur « envoyer-push » (Supabase Edge Function, Deno)
// Appelée par le webhook de la table notifications_push : envoie l'alerte aux téléphones abonnés.
// GET renvoie la clé publique VAPID dont l'app a besoin pour s'abonner.
//
// Secrets à créer dans Supabase (Edge Functions → Secrets) : VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
// VAPID_SUJET (ex. mailto:contact@vigipop.fr). SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont
// fournis automatiquement par Supabase : la clé de service ne quitte jamais le serveur.
//
// Applications Android et iOS (migration 0022, docs/APPLIS-NATIVES.md) : message ANONYME seulement,
// pour que ni Google ni Apple ne voient le contenu des alertes. Secrets facultatifs :
// - Android : FIREBASE_COMPTE_SERVICE (fichier JSON du compte de service Firebase, en entier) ;
// - iOS : APNS_CLE_P8 (contenu du fichier .p8), APNS_CLE_ID, APNS_EQUIPE_ID, APNS_BUNDLE (fr.vigipop.app).
import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import { importPKCS8, SignJWT } from 'npm:jose@5.9.6'

const clePublique = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const clePrivee = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const sujet = Deno.env.get('VAPID_SUJET') ?? 'mailto:contact@vigipop.fr'

const entetes = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Content-Type': 'application/json',
}

const repondre = (corps: unknown, status = 200) => new Response(JSON.stringify(corps), { status, headers: entetes })

// Texte unique des alertes natives : rien sur la personne ni sur la situation
const ANONYME = { titre: 'Vigipop', texte: 'Nouvelle alerte de votre commune. Ouvrez Vigipop pour la voir.' }

// Android : Firebase Cloud Messaging (API v1), jeton d'accès obtenu avec le compte de service
let accesFirebase: { jeton: string; expire: number; projet: string } | null = null
async function jetonFirebase() {
  if (accesFirebase && accesFirebase.expire > Date.now() + 60_000) return accesFirebase
  const compte = JSON.parse(Deno.env.get('FIREBASE_COMPTE_SERVICE') ?? 'null')
  if (!compte?.private_key) return null
  const cle = await importPKCS8(compte.private_key, 'RS256')
  const assertion = await new SignJWT({ scope: 'https://www.googleapis.com/auth/firebase.messaging' })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer(compte.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(cle)
  const reponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  })
  const donnees = await reponse.json()
  if (!donnees.access_token) return null
  accesFirebase = { jeton: donnees.access_token, expire: Date.now() + donnees.expires_in * 1000, projet: compte.project_id }
  return accesFirebase
}

// Renvoie false si le jeton n'existe plus (application désinstallée) : l'abonnement est alors oublié
async function envoyerAndroid(jeton: string, cle: string, lien: string) {
  const acces = await jetonFirebase()
  if (!acces) throw new Error('Firebase non configuré')
  const reponse = await fetch(`https://fcm.googleapis.com/v1/projects/${acces.projet}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${acces.jeton}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        token: jeton,
        notification: { title: ANONYME.titre, body: ANONYME.texte },
        data: { lien },
        android: { priority: 'HIGH', ttl: '21600s', collapse_key: cle.slice(0, 60), notification: { tag: cle.slice(0, 60) } },
      },
    }),
  })
  if (reponse.ok) return true
  // 404 UNREGISTERED : application désinstallée ou jeton périmé
  if (reponse.status === 404) return false
  throw new Error(`Firebase ${reponse.status}`)
}

// iOS : service Apple (APNs), jeton signé avec la clé .p8 du compte Apple Developer
let accesApple: { jeton: string; cree: number } | null = null
async function jetonApple() {
  if (accesApple && Date.now() - accesApple.cree < 40 * 60_000) return accesApple.jeton
  const p8 = Deno.env.get('APNS_CLE_P8')
  const idCle = Deno.env.get('APNS_CLE_ID')
  const equipe = Deno.env.get('APNS_EQUIPE_ID')
  if (!p8 || !idCle || !equipe) return null
  const cle = await importPKCS8(p8, 'ES256')
  const jeton = await new SignJWT({}).setProtectedHeader({ alg: 'ES256', kid: idCle }).setIssuer(equipe).setIssuedAt().sign(cle)
  accesApple = { jeton, cree: Date.now() }
  return jeton
}

async function envoyerIos(jeton: string, cle: string, lien: string) {
  const autorisation = await jetonApple()
  if (!autorisation) throw new Error('Apple non configuré')
  const serveurApple = Deno.env.get('APNS_SANDBOX') === '1' ? 'api.sandbox.push.apple.com' : 'api.push.apple.com'
  const reponse = await fetch(`https://${serveurApple}/3/device/${jeton}`, {
    method: 'POST',
    headers: {
      authorization: `bearer ${autorisation}`,
      'apns-topic': Deno.env.get('APNS_BUNDLE') ?? 'fr.vigipop.app',
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'apns-expiration': String(Math.floor(Date.now() / 1000) + 6 * 3600),
      'apns-collapse-id': cle.slice(0, 60),
    },
    body: JSON.stringify({ aps: { alert: { title: ANONYME.titre, body: ANONYME.texte }, sound: 'default' }, lien }),
  })
  if (reponse.ok) return true
  if (reponse.status === 410) return false
  const raison = (await reponse.json().catch(() => ({}))).reason
  if (raison === 'BadDeviceToken') return false
  throw new Error(`Apple ${reponse.status}`)
}

Deno.serve(async (requete) => {
  if (requete.method === 'OPTIONS') return new Response('ok', { headers: entetes })
  if (requete.method === 'GET') return repondre({ cle_publique: clePublique })

  // On ne fait confiance qu'à l'identifiant reçu : la notification est relue en base,
  // et une notification déjà envoyée n'est jamais renvoyée.
  const corps = await requete.json().catch(() => null)
  const id = corps?.record?.id
  if (typeof id !== 'number') return repondre({ erreur: 'Identifiant manquant' }, 400)

  const base = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: notif } = await base.from('notifications_push').select('*').eq('id', id).is('envoyee_a', null).maybeSingle()
  if (!notif) return repondre({ envoyees: 0 })
  await base.from('notifications_push').update({ envoyee_a: new Date().toISOString() }).eq('id', id)

  let requeteAbonnes = base.from('abonnements_push').select('endpoint, plateforme, p256dh, auth').eq('commune_id', notif.commune_id)
  if (notif.destinataires) requeteAbonnes = requeteAbonnes.in('auteur', notif.destinataires)
  const { data: abonnes } = await requeteAbonnes

  if (clePublique && clePrivee) webpush.setVapidDetails(sujet, clePublique, clePrivee)
  const message = JSON.stringify({ cle: notif.cle, titre: notif.titre, texte: notif.texte, lien: notif.lien })
  let envoyees = 0
  await Promise.all(
    (abonnes ?? []).map(async (a) => {
      try {
        if (a.plateforme === 'android' || a.plateforme === 'ios') {
          const jeton = a.endpoint.slice(a.plateforme.length + 1)
          const valide = a.plateforme === 'android' ? await envoyerAndroid(jeton, notif.cle, notif.lien) : await envoyerIos(jeton, notif.cle, notif.lien)
          if (valide) envoyees++
          else await base.from('abonnements_push').delete().eq('endpoint', a.endpoint)
          return
        }
        if (!clePublique || !clePrivee) return
        // Urgence haute : livrée tout de suite, même téléphone en veille
        await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, message, { TTL: 6 * 3600, urgency: 'high' })
        envoyees++
      } catch (erreur) {
        // Abonnement expiré ou révoqué : on l'oublie
        const code = (erreur as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) await base.from('abonnements_push').delete().eq('endpoint', a.endpoint)
      }
    }),
  )
  return repondre({ envoyees })
})
