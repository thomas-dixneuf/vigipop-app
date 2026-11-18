import { useEffect, useState } from 'react'

// Événement proposé par Chrome et Edge quand la page peut être installée comme une application
type InvitationInstallation = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

// Bouton « Installer sur cet ordinateur » : visible seulement dans la version mairie dédiée (VITE_VUE=mairie),
// quand le navigateur le permet et que l'application n'est pas déjà ouverte en fenêtre installée
export default function BoutonInstaller() {
  const [invitation, setInvitation] = useState<InvitationInstallation | null>(null)

  useEffect(() => {
    const recevoir = (e: Event) => {
      e.preventDefault()
      setInvitation(e as InvitationInstallation)
    }
    const installee = () => setInvitation(null)
    window.addEventListener('beforeinstallprompt', recevoir)
    window.addEventListener('appinstalled', installee)
    return () => {
      window.removeEventListener('beforeinstallprompt', recevoir)
      window.removeEventListener('appinstalled', installee)
    }
  }, [])

  if (import.meta.env.VITE_VUE !== 'mairie' || !invitation) return null
  return (
    <button
      type="button"
      className="mairie-bouton"
      onClick={() => {
        void invitation.prompt()
        void invitation.userChoice.finally(() => setInvitation(null))
      }}
    >
      Installer sur cet ordinateur
    </button>
  )
}
