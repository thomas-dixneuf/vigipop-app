import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Icone from './Icone.tsx'

// Bleu clair : l'ambre reste réservé aux consignes de crise et l'orange à l'urgence.
// Bandeau affiché en haut de l'app tant que le téléphone n'a pas de réseau : l'habitant sait
// qu'il peut continuer, et que ses envois partiront tout seuls au retour du réseau.
export default function BandeauHorsLigne() {
  const [horsLigne, setHorsLigne] = useState(!navigator.onLine)
  const { pathname } = useLocation()

  useEffect(() => {
    const maj = () => setHorsLigne(!navigator.onLine)
    window.addEventListener('online', maj)
    window.addEventListener('offline', maj)
    return () => {
      window.removeEventListener('online', maj)
      window.removeEventListener('offline', maj)
    }
  }, [])

  // L'espace mairie a besoin du serveur : il affiche ses propres messages
  if (!horsLigne || pathname.startsWith('/mairie')) return null

  return (
    <div
      role="status"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        background: 'var(--bleu-clair)',
        color: 'var(--bleu-nuit)',
        borderBottom: '1px solid var(--bleu-nuit)',
        padding: 'calc(10px + env(safe-area-inset-top)) 16px 10px',
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        justifyContent: 'center',
        fontSize: 14,
        lineHeight: 1.4,
      }}
    >
      <span style={{ flexShrink: 0, marginTop: 1 }}>
        <Icone nom="alerte" taille={18} couleur="var(--bleu-nuit)" />
      </span>
      <p style={{ maxWidth: 440 }}>
        <strong>Vous êtes hors ligne.</strong> Vous pouvez continuer à utiliser Vigipop : vos demandes et vos réponses
        partiront automatiquement dès le retour du réseau.
      </p>
    </div>
  )
}
