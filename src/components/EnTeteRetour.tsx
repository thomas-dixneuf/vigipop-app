import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Icone from './Icone.tsx'

// En-tête des écrans secondaires : bouton retour + titre
export default function EnTeteRetour({ retour, children }: { retour: string; children: ReactNode }) {
  return (
    <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 8px' }}>
      <Link
        to={retour}
        aria-label="Retour"
        style={{ width: 44, height: 44, borderRadius: 22, background: 'var(--blanc)', border: '1px solid var(--bordure)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bleu)', flexShrink: 0 }}
      >
        <Icone nom="retour" taille={20} epaisseur={2.4} />
      </Link>
      <div style={{ display: 'flex', flexDirection: 'column' }}>{children}</div>
    </header>
  )
}
