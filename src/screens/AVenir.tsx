import { Link } from 'react-router-dom'
import BarreNav from '../components/BarreNav.tsx'
import Icone from '../components/Icone.tsx'

// Écran provisoire pour les parties prévues aux prochains incréments
export default function AVenir({ titre, onglet }: { titre: string; onglet?: 'carte' | 'profil' }) {
  return (
    <div className="ecran">
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 8px' }}>
        {!onglet && (
          <Link
            to="/accueil"
            aria-label="Retour"
            style={{ width: 44, height: 44, borderRadius: 22, background: 'var(--blanc)', border: '1px solid var(--bordure)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bleu)' }}
          >
            <Icone nom="retour" taille={20} epaisseur={2.4} />
          </Link>
        )}
        <h1 style={{ fontSize: 21, fontWeight: 800, color: 'var(--bleu-nuit)' }}>{titre}</h1>
      </header>
      <main className="contenu" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--bleu-nuit)' }}>Bientôt disponible</p>
        <p className="texte-doux" style={{ maxWidth: 280 }}>Cet écran arrive dans une prochaine version du prototype.</p>
      </main>
      {onglet && <BarreNav />}
    </div>
  )
}
