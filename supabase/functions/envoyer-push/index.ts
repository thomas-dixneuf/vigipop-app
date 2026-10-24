// Vigipop — fonction serveur « envoyer-push » (Supabase Edge Function, Deno)
// Appelée par le webhook de la table notifications_push : envoie l'alerte aux téléphones abonnés.
// GET renvoie la clé publique VAPID dont l'app a besoin pour s'abonner.
//
// Secrets à créer dans Supabase (Edge Functions → Secrets) : VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
// VAPID_SUJET (ex. mailto:contact@vigipop.fr). SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont
// fournis automatiquement par Supabase : la clé de service ne quitte jamais le serveur.
import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const clePublique = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const clePrivee = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const sujet = Deno.env.get('VAPID_SUJET') ?? 'mailto:contact@vigipop.fr'

const entetes = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Content-Type': 'application/json',
}

const repondre = (corps: unknown, status = 200) => new Response(JSON.stringify(corps), { status, headers: entetes })

Deno.serve(async (requete) => {
  if (requete.method === 'OPTIONS') return new Response('ok', { headers: entetes })
  if (requete.method === 'GET') return repondre({ cle_publique: clePublique })
  if (!clePublique || !clePrivee) return repondre({ erreur: 'Clés VAPID manquantes' }, 500)

  // On ne fait confiance qu'à l'identifiant reçu : la notification est relue en base,
  // et une notification déjà envoyée n'est jamais renvoyée.
  const corps = await requete.json().catch(() => null)
  const id = corps?.record?.id
  if (typeof id !== 'number') return repondre({ erreur: 'Identifiant manquant' }, 400)

  const base = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: notif } = await base.from('notifications_push').select('*').eq('id', id).is('envoyee_a', null).maybeSingle()
  if (!notif) return repondre({ envoyees: 0 })
  await base.from('notifications_push').update({ envoyee_a: new Date().toISOString() }).eq('id', id)

  let requeteAbonnes = base.from('abonnements_push').select('endpoint, p256dh, auth').eq('commune_id', notif.commune_id)
  if (notif.destinataires) requeteAbonnes = requeteAbonnes.in('auteur', notif.destinataires)
  const { data: abonnes } = await requeteAbonnes

  webpush.setVapidDetails(sujet, clePublique, clePrivee)
  const message = JSON.stringify({ cle: notif.cle, titre: notif.titre, texte: notif.texte, lien: notif.lien })
  let envoyees = 0
  await Promise.all(
    (abonnes ?? []).map(async (a) => {
      try {
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
