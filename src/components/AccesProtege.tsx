import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppState } from '../state/AppState.tsx'

// Sans compte, l'app n'est ouverte qu'en mode crise (règle produit du 23/10/2026).
// compteObligatoire : réservé aux comptes même en crise (ex. se proposer comme volontaire).
export default function AccesProtege({ children, compteObligatoire = false }: { children: ReactNode; compteObligatoire?: boolean }) {
  const { utilisateur, mode } = useAppState()
  if (utilisateur) return children
  if (mode === 'crise') return compteObligatoire ? <Navigate to="/inscription" replace /> : children
  return <Navigate to="/" replace />
}
