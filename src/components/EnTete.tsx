import { Link } from 'react-router-dom'
import { commune } from '../data/fictif.ts'
import Icone from './Icone.tsx'
import Logo from './Logo.tsx'

export default function EnTete({ nonLues = 0 }: { nonLues?: number }) {
  return (
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Logo />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="texte-doux">Commune de</span>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{commune}</span>
        </div>
      </div>
      <Link
        to="/notifications"
        aria-label={nonLues ? `Notifications, ${nonLues} non lues` : 'Notifications'}
        style={{
          position: 'relative',
          width: 44,
          height: 44,
          borderRadius: 22,
          border: '1px solid var(--bordure)',
          background: 'var(--blanc)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--bleu)',
        }}
      >
        <Icone nom="cloche" taille={20} epaisseur={2} />
        {nonLues > 0 && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 20,
              height: 20,
              borderRadius: 10,
              background: 'var(--urgence)',
              border: '2px solid var(--fond)',
              color: 'var(--blanc)',
              fontSize: 11,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {nonLues}
          </span>
        )}
      </Link>
    </header>
  )
}
