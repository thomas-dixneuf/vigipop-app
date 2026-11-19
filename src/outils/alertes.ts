// Alertes système du téléphone (Notification API + service worker de la PWA).
// Elles complètent le centre de notifications de l'app ; elles ne remplacent jamais FR-Alert.
// Applications Android et iOS (Capacitor) : push natif (Firebase pour Android, Apple pour iOS),
// avec un message anonyme « Nouvelle alerte de votre commune » ; le détail s'affiche dans l'app.
import type { SupabaseClient } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { assurerSession } from '../services/serveur.ts'

const plateforme = Capacitor.getPlatform() as 'web' | 'android' | 'ios'
const natif = plateforme !== 'web'
// Android : le push n'existe que si l'app a été construite avec le fichier Firebase (VITE_PUSH_ANDROID=1),
// sinon l'inscription ferait planter l'app. iOS : rien à configurer dans l'app.
const pushNatifPossible = plateforme === 'ios' || (plateforme === 'android' && import.meta.env.VITE_PUSH_ANDROID === '1')
const CLE_ETAT_NATIF = 'vigipop-alertes-natif'

function lireEtatNatif(): NotificationPermission {
  try {
    const etat = localStorage.getItem(CLE_ETAT_NATIF)
    return etat === 'granted' || etat === 'denied' ? etat : 'default'
  } catch {
    return 'default'
  }
}

export function alertesPossibles() {
  if (natif) return pushNatifPossible
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator
}

export function etatAlertes(): NotificationPermission | 'impossible' {
  if (!alertesPossibles()) return 'impossible'
  return natif ? lireEtatNatif() : Notification.permission
}

export async function demanderAlertes() {
  if (!alertesPossibles()) return 'impossible' as const
  try {
    if (natif) {
      const { receive } = await PushNotifications.requestPermissions()
      const etat: NotificationPermission = receive === 'granted' ? 'granted' : receive === 'denied' ? 'denied' : 'default'
      try {
        localStorage.setItem(CLE_ETAT_NATIF, etat)
      } catch {
        // Stockage indisponible : on redemandera
      }
      return etat
    }
    return await Notification.requestPermission()
  } catch {
    return 'denied' as const
  }
}

// Affichée par le service worker pour que le clic rouvre l'app sur le bon écran
export async function afficherAlerte({ cle, titre, texte, lien }: { cle: string; titre: string; texte: string; lien: string }) {
  // Applications : app ouverte, l'alerte est déjà dans la cloche ; app fermée, c'est le push natif
  if (natif || etatAlertes() !== 'granted') return
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
  if (natif) return abonnerPushNatif(client, communeId)
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

// Clic sur une alerte native : ouverture de l'app sur l'écran concerné
let ecouteNative = false
function ecouterPushNatif() {
  if (ecouteNative) return
  ecouteNative = true
  void PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
    const lien = (notification.data as { lien?: unknown } | undefined)?.lien
    if (typeof lien === 'string' && lien.startsWith('/')) location.hash = `#${lien}`
  })
}

// Inscription du téléphone auprès de Firebase (Android) ou d'Apple (iOS) : le jeton obtenu est
// enregistré comme un abonnement (« android:… » ou « ios:… »). Aucune position, aucun nom.
async function abonnerPushNatif(client: SupabaseClient, communeId: string) {
  if (etatAlertes() !== 'granted') return false
  ecouterPushNatif()
  const ecoutes: Promise<{ remove: () => Promise<void> }>[] = []
  try {
    const jeton = await new Promise<string>((resolve, reject) => {
      window.setTimeout(() => reject(new Error('délai dépassé')), 20000)
      ecoutes.push(PushNotifications.addListener('registration', ({ value }) => resolve(value)))
      ecoutes.push(PushNotifications.addListener('registrationError', (erreur) => reject(erreur)))
      PushNotifications.register().catch(reject)
    })
    const auteur = await assurerSession(client)
    const { error } = await client
      .from('abonnements_push')
      .upsert({ endpoint: `${plateforme}:${jeton}`, plateforme, auteur, commune_id: communeId, p256dh: '', auth: '' })
    return !error
  } catch {
    return false
  } finally {
    for (const ecoute of ecoutes) void ecoute.then((e) => e.remove())
  }
}
