import { Link, useNavigate } from 'react-router-dom'
import BarreNav from '../components/BarreNav.tsx'
import Icone from '../components/Icone.tsx'
import { commune as communeDemo } from '../data/fictif.ts'
import { useAppState } from '../state/AppState.tsx'

const ligne = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  minHeight: 56,
  padding: '0 16px',
  textDecoration: 'none',
  color: 'var(--texte)',
  fontSize: 15,
  fontWeight: 700,
  background: 'none',
  border: 'none',
  width: '100%',
  textAlign: 'left',
} as const

// Version simple du profil : la page complète (offres et prêts) viendra ensuite
export default function Profil() {
  const navigate = useNavigate()
  const { utilisateur, mode, lancerVisite, deconnecter } = useAppState()

  const revoirVisite = () => {
    lancerVisite()
    navigate('/accueil')
  }

  return (
    <div className="ecran">
      <header style={{ padding: '20px 20px 8px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--bleu-nuit)' }}>Mon profil</h1>
      </header>
      <main className="contenu">
        {utilisateur ? (
          <section className="carte" style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: 16 }}>
            <span style={{ fontSize: 18, fontWeight: 800 }}>{utilisateur.prenom || 'Mon compte'}</span>
            <span className="texte-doux">
              {utilisateur.telephone} · {utilisateur.commune || communeDemo}
            </span>
          </section>
        ) : (
          <section className="carte" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
            <span style={{ fontSize: 15, lineHeight: 1.4 }}>
              Créez un compte pour que votre mairie puisse vous joindre en cas de crise.
            </span>
            <Link to="/inscription" className="bouton bouton--principal">
              Créer mon compte
            </Link>
            <Link to="/connexion" style={{ textAlign: 'center', fontWeight: 700, minHeight: 44 }}>
              J'ai déjà un compte
            </Link>
          </section>
        )}

        <section className="carte" style={{ padding: 0, borderRadius: 16 }}>
          <Link to="/aider" style={{ ...ligne, borderBottom: '1px solid var(--bleu-voile)' }}>
            Ce que je peux offrir
            <Icone nom="fleche" taille={18} />
          </Link>
          {mode === 'veille' && (
            <button type="button" onClick={revoirVisite} style={{ ...ligne, borderBottom: '1px solid var(--bleu-voile)' }}>
              Revoir la visite guidée
              <Icone nom="fleche" taille={18} />
            </button>
          )}
          <Link to="/pourquoi/1" style={ligne}>
            Pourquoi Vigipop ?
            <Icone nom="fleche" taille={18} />
          </Link>
        </section>

        {utilisateur && (
          <button type="button" onClick={deconnecter} className="bouton bouton--contour" style={{ minHeight: 48, fontSize: 15 }}>
            Se déconnecter
          </button>
        )}
      </main>
      <BarreNav />
    </div>
  )
}
