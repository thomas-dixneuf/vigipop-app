import { Link, useNavigate } from 'react-router-dom'
import BoutonDemo from '../components/BoutonDemo.tsx'
import Icone from '../components/Icone.tsx'
import Logo from '../components/Logo.tsx'
import { useAppState } from '../state/AppState.tsx'

const lienClair = { color: 'var(--cyan)', fontSize: 15, fontWeight: 700, minHeight: 44, display: 'flex', alignItems: 'center' } as const

export default function Lancement() {
  const navigate = useNavigate()
  const { utilisateur, mode, alerte, geoloc, activerGeoloc, geolocProposee, repondreGeoloc, compteEfface, oublierCompteEfface } = useAppState()
  // Sans compte, seul le mode crise ouvre l'app (accès d'urgence)
  const urgenceSansCompte = !utilisateur && mode === 'crise'
  const propositionGeoloc = !urgenceSansCompte && !geoloc && !geolocProposee

  return (
    <div
      className="ecran ecran--sombre"
      style={{ alignItems: 'center', justifyContent: 'space-between', padding: `${urgenceSansCompte || propositionGeoloc ? 32 : 96}px 28px 32px`, gap: 24 }}
    >
      <Logo taille={urgenceSansCompte || propositionGeoloc ? 160 : 280} slogan />

      {compteEfface && !utilisateur && (
        // Compte effacé après 3 ans sans ouverture de l'app et deux rappels (RGPD, migration 0016)
        <section aria-labelledby="titre-compte-efface" style={{ width: '100%', background: 'var(--blanc)', color: 'var(--texte)', borderRadius: 16, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <strong id="titre-compte-efface" style={{ fontSize: 17, color: 'var(--bleu-nuit)' }}>
            Votre compte a été effacé
          </strong>
          <span style={{ fontSize: 14, lineHeight: 1.4 }}>
            L'app n'avait pas été ouverte depuis 3 ans. Après deux rappels, votre compte a été effacé comme le prévoit notre
            politique de confidentialité (RGPD). En cas de crise, vous pouvez toujours demander de l'aide <strong>sans compte</strong>.
          </span>
          <Link to="/inscription" state={{ compteEfface: true }} className="bouton bouton--principal" onClick={oublierCompteEfface}>
            Recréer mon compte (1 minute)
          </Link>
          <button type="button" className="bouton bouton--contour" onClick={oublierCompteEfface}>
            Plus tard
          </button>
        </section>
      )}

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
      ) : propositionGeoloc ? (
        // Dès la première ouverture : refusable, et jamais un passage obligé (le 112 reste en dessous)
        <section
          aria-labelledby="titre-geoloc"
          style={{ width: '100%', background: 'var(--blanc)', color: 'var(--texte)', borderRadius: 16, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          <strong id="titre-geoloc" style={{ fontSize: 17, color: 'var(--bleu-nuit)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icone nom="pin" taille={18} /> Autoriser la localisation ?
          </strong>
          <span style={{ fontSize: 14, lineHeight: 1.4 }}>
            Vigipop vous montre les lieux d'accueil et les alertes de la commune où vous êtes, même en visite. Votre position sert
            seulement à trouver la commune : elle n'est jamais enregistrée.
          </span>
          <button type="button" className="bouton bouton--principal" onClick={() => repondreGeoloc(true)}>
            Autoriser la localisation
          </button>
          <button type="button" className="bouton bouton--contour" onClick={() => repondreGeoloc(false)}>
            Plus tard
          </button>
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
            <Link to="/carte" style={lienClair}>
              Voir la carte des secours
            </Link>
            {/* De passage, ou sa ville n'a pas Vigipop : la carte montre les services de la ville où l'on est */}
            {!geoloc && geolocProposee && (
              <button
                type="button"
                style={{ ...lienClair, background: 'none', border: 'none', textAlign: 'center', justifyContent: 'center' }}
                onClick={() => {
                  activerGeoloc(true)
                  navigate('/carte')
                }}
              >
                De passage ? Voir les services de la ville où je suis
              </button>
            )}
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
