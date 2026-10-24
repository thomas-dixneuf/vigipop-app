// Alertes système du téléphone (Notification API + service worker de la PWA).
// Elles complètent le centre de notifications de l'app ; elles ne remplacent jamais FR-Alert.
import type { SupabaseClient } from '@supabase/supabase-js'
import { assurerSession } from '../services/serveur.ts'

export function alertesPossibles() {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator
}

export function etatAlertes(): NotificationPermission | 'impossible' {
  return alertesPossibles() ? Notification.permission : 'impossible'
}

export async function demanderAlertes() {
  if (!alertesPossibles()) return 'impossible' as const
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied' as const
  }
}

// Affichée par le service worker pour que le clic rouvre l'app sur le bon écran
export async function afficherAlerte({ cle, titre, texte, lien }: { cle: string; titre: string; texte: string; lien: string }) {
  if (etatAlertes() !== 'granted') return
  try {
    const enregistrement = await navigator.serviceWorker.getRegistration()
    if (enregistrement) {
      await enregistrement.showNotification(titre, { body: texte, tag: cle, icon: 'icon-192.png', badge: 'icon-192.png', data: { lien } })
      return
    }
    new Notification(titre, { body: texte, tag: cle, icon: 'icon-192.png' })
  } catch {
    // Alerte refusée par le système : la notification reste dans l'app
  }
}

function octetsDepuisBase64Url(texte: string) {
  const base64 = (texte + '='.repeat((4 - (texte.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
}

// Push « app fermée » : abonne ce téléphone auprès du serveur. Sans configuration serveur
// (clés VAPID absentes), on reste sur les alertes app ouverte, sans erreur.
export async function abonnerPush(client: SupabaseClient, communeId: string) {
  if (etatAlertes() !== 'granted' || !('PushManager' in window)) return false
  try {
    const enregistrement = await navigator.serviceWorker.ready
    let abonnement = await enregistrement.pushManager.getSubscription()
    if (!abonnement) {
      const { data, error } = await client.functions.invoke<{ cle_publique: string }>('envoyer-push', { method: 'GET' })
      if (error || !data?.cle_publique) return false
      abonnement = await enregistrement.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: octetsDepuisBase64Url(data.cle_publique) })
    }
    const cles = abonnement.toJSON().keys ?? {}
    const auteur = await assurerSession(client)
    const { error } = await client
      .from('abonnements_push')
      .upsert({ endpoint: abonnement.endpoint, auteur, commune_id: communeId, p256dh: cles.p256dh ?? '', auth: cles.auth ?? '' })
    return !error
  } catch {
    return false
  }
}
