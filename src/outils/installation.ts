import { useSyncExternalStore } from 'react'

// Installation de l'app habitant depuis le navigateur (Chrome et Edge sur Windows, Mac, Linux et Android).
// Le navigateur envoie « beforeinstallprompt » une seule fois, souvent avant l'affichage de l'écran qui porte
// le bouton : on le garde ici dès le démarrage (import dans main.tsx).
type InvitationInstallation = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

let invitation: InvitationInstallation | null = null
const abonnes = new Set<() => void>()
const prevenir = () => abonnes.forEach((f) => f())

// Pas dans les applications Android/iOS (déjà installées) ni dans l'espace mairie (son propre bouton)
const concerne = typeof window !== 'undefined' && !('Capacitor' in window) && import.meta.env.VITE_VUE !== 'mairie'

if (concerne) {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    invitation = e as InvitationInstallation
    prevenir()
  })
  window.addEventListener('appinstalled', () => {
    invitation = null
    prevenir()
  })
}

function abonner(f: () => void) {
  abonnes.add(f)
  return () => abonnes.delete(f)
}

// true quand le navigateur accepte d'installer l'app (pas encore installée, ouverte dans un onglet)
export function useInstallationPossible() {
  return useSyncExternalStore(abonner, () => invitation !== null, () => false)
}

// Ouvre la fenêtre d'installation du navigateur ; elle ne peut servir qu'une fois
export async function installerApp() {
  const courante = invitation
  if (!courante) return
  await courante.prompt()
  await courante.userChoice.catch(() => undefined)
  invitation = null
  prevenir()
}
