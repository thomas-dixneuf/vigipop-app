import { Link } from 'react-router-dom'
import BoutonDemo from '../components/BoutonDemo.tsx'
import Icone from '../components/Icone.tsx'
import Logo from '../components/Logo.tsx'
import { useAppState } from '../state/AppState.tsx'

const lienClair = { color: 'var(--cyan)', fontSize: 15, fontWeight: 700, minHeight: 44, display: 'flex', alignItems: 'center' } as const

export default function Lancement() {
  const { utilisateur, mode, alerte } = useAppState()
  // Sans compte, seul le mode crise ouvre l'app (accès d'urgence)
  const urgenceSansCompte = !utilisateur && mode === 'crise'

  return (
    <div
      className="ecran ecran--sombre"
      style={{ alignItems: 'center', justifyContent: 'space-between', padding: `${urgenceSansCompte ? 32 : 96}px 28px 32px`, gap: 24 }}
    >
      <Logo taille={urgenceSansCompte ? 160 : 280} slogan />

      {urgenceSansCompte ? (
        <section role="alert" style={{ width: '100%', background: 'var(--blanc)', color: 'var(--texte)', borderRadius: 16, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 800, color: 'var(--urgence)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
            <Icone nom="alerte" taille={16} epaisseur={2.4} />
            Mode crise activé par la mairie
          </span>
          <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--bleu-nuit)' }}>{alerte?.titre}</span>
          <span style={{ fontSize: 14, lineHeight: 1.4 }}>
            Vous pouvez demander de l'aide <strong>sans créer de compte</strong>.
          </span>
        </section>
      ) : (
        <p style={{ textAlign: 'center', fontSize: 17, lineHeight: 1.5, color: 'var(--bleu-voile)', maxWidth: 300 }}>
          Signaler sa situation, trouver de l'aide, aider ses voisins.
        </p>
      )}

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        {utilisateur ? (
          <Link to="/accueil" className="bouton bouton--clair" style={{ width: '100%', fontSize: 18 }}>
            {utilisateur.prenom ? `Continuer, ${utilisateur.prenom}` : 'Continuer'}
          </Link>
        ) : urgenceSansCompte ? (
          <>
            <Link to="/signaler" className="bouton bouton--urgence" style={{ width: '100%', fontSize: 18 }}>
              J'ai besoin d'aide
            </Link>
            <Link to="/accueil" className="bouton bouton--clair" style={{ width: '100%', fontSize: 16 }}>
              Voir les consignes et lieux ouverts
            </Link>
            <Link to="/inscription" style={lienClair}>
              Créer un compte pour aider
            </Link>
          </>
        ) : (
          <>
            <Link to="/inscription" className="bouton bouton--clair" style={{ width: '100%', fontSize: 18 }}>
              Créer mon compte
            </Link>
            <Link to="/connexion" style={lienClair}>
              J'ai déjà un compte
            </Link>
          </>
        )}

        {/* Le 112 reste joignable même sans compte et sans crise déclarée */}
        <a href="tel:112" style={{ ...lienClair, color: 'var(--blanc)', fontWeight: 400, fontSize: 14 }}>
          Danger immédiat ?&nbsp;<strong style={{ color: 'var(--consigne)' }}>Appelez le 112</strong>
        </a>
        {!utilisateur && <BoutonDemo sombre />}
      </div>
    </div>
  )
}
