import { Link } from 'react-router-dom'
import Logo from '../components/Logo.tsx'
import { useAppState } from '../state/AppState.tsx'

export default function Lancement() {
  const { utilisateur } = useAppState()
  // Déjà inscrit : on va droit à l'accueil
  const suite = utilisateur ? '/accueil' : '/inscription'

  return (
    <div
      className="ecran ecran--sombre"
      style={{ alignItems: 'center', justifyContent: 'space-between', padding: '96px 28px 48px', gap: 32 }}
    >
      <Logo taille={280} slogan />
      <p style={{ textAlign: 'center', fontSize: 17, lineHeight: 1.5, color: 'var(--bleu-voile)', maxWidth: 300 }}>
        Signaler sa situation, trouver de l'aide, aider ses voisins.
      </p>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <Link to={suite} className="bouton bouton--clair" style={{ width: '100%', fontSize: 18 }}>
          {utilisateur ? (utilisateur.prenom ? `Continuer, ${utilisateur.prenom}` : 'Continuer') : 'Créer mon compte'}
        </Link>
        {!utilisateur && (
          <Link
            to="/connexion"
            style={{ color: 'var(--cyan)', fontSize: 15, fontWeight: 700, minHeight: 44, display: 'flex', alignItems: 'center' }}
          >
            J'ai déjà un compte
          </Link>
        )}
      </div>
    </div>
  )
}
