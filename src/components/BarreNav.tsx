import { NavLink } from 'react-router-dom'
import Icone, { type NomIcone } from './Icone.tsx'

const onglets: { vers: string; nom: NomIcone; libelle: string }[] = [
  { vers: '/accueil', nom: 'accueil', libelle: 'Accueil' },
  { vers: '/carte', nom: 'carte', libelle: 'Carte' },
  { vers: '/profil', nom: 'profil', libelle: 'Mon profil' },
]

// Conservée en mode crise, pour garder les mêmes repères qu'en veille
export default function BarreNav() {
  return (
    <nav
      aria-label="Navigation principale"
      style={{
        position: 'sticky',
        bottom: 0,
        display: 'flex',
        justifyContent: 'space-around',
        padding: '10px 12px calc(14px + env(safe-area-inset-bottom))',
        background: 'var(--blanc)',
        borderTop: '1px solid var(--bordure)',
      }}
    >
      {onglets.map((o) => (
        <NavLink
          key={o.vers}
          to={o.vers}
          data-visite={o.nom}
          style={({ isActive }) => ({
            textDecoration: 'none',
            color: isActive ? 'var(--bleu)' : 'var(--texte-doux)',
            fontWeight: isActive ? 800 : 400,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            minWidth: 64,
            minHeight: 44,
          })}
        >
          <Icone nom={o.nom} />
          {o.libelle}
        </NavLink>
      ))}
    </nav>
  )
}
