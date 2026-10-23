import { Link } from 'react-router-dom'
import Logo from '../components/Logo.tsx'

export default function Lancement() {
  return (
    <div
      className="ecran ecran--sombre"
      style={{ alignItems: 'center', justifyContent: 'space-between', padding: '96px 28px 48px', gap: 32 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <Logo taille={160} />
        <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: 0.5 }}>Vigipop</h1>
        <p style={{ color: 'var(--cyan)', fontWeight: 700 }}>Organiser l'imprévisible</p>
      </div>
      <p style={{ textAlign: 'center', fontSize: 17, lineHeight: 1.5, color: 'var(--bleu-voile)', maxWidth: 300 }}>
        Signaler sa situation, trouver de l'aide, aider ses voisins.
      </p>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        {/* La connexion par code SMS arrive au prochain incrément */}
        <Link to="/accueil" className="bouton bouton--clair" style={{ width: '100%', fontSize: 18 }}>
          Commencer
        </Link>
        <Link to="/accueil" style={{ color: 'var(--cyan)', fontSize: 15, fontWeight: 700, minHeight: 44, display: 'flex', alignItems: 'center' }}>
          J'ai déjà un compte
        </Link>
      </div>
    </div>
  )
}
