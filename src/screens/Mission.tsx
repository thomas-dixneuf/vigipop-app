import { Link, Navigate, useNavigate } from 'react-router-dom'
import EnTeteRetour from '../components/EnTeteRetour.tsx'
import Icone from '../components/Icone.tsx'
import PropositionHebergement from '../components/PropositionHebergement.tsx'
import SollicitationEntraide from '../components/SollicitationEntraide.tsx'
import { useAppState } from '../state/AppState.tsx'

const cellule = { padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 2 } as const
const separateur = '1px solid var(--bleu-voile)'

export default function Mission() {
  const navigate = useNavigate()
  const { mode, disponible, mission: reponse, repondreMission, missionServeur, ressources, communeAffichee: commune } = useAppState()

  // Une mission n'existe qu'en crise, pour un volontaire qui s'est dit disponible
  if (mode !== 'crise' || !disponible) return <Navigate to="/accueil" replace />

  // Aucune mission de ses catégories (ou toutes déclinées) : on attend la prochaine
  if (!missionServeur) return <EnAttenteDeMission hebergeurSeul={ressources.length === 1 && ressources[0] === 'heb'} />

  const mission = { ...missionServeur, rendezVous: missionServeur.rendez_vous }
  const acceptee = reponse === 'acceptee'

  // La mission suivante de ses catégories s'affiche aussitôt, s'il y en a une
  const refuser = () => repondreMission('refusee')

  return (
    <div className="ecran">
      <EnTeteRetour retour="/accueil">
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--bleu)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          {acceptee ? 'Mission acceptée' : 'Nouvelle mission'}
        </span>
        <span style={{ fontSize: 14, color: 'var(--texte-doux)' }}>Coordinateur · Mairie de {commune}</span>
      </EnTeteRetour>

      <main className="contenu" style={{ paddingTop: 10 }}>
        <PropositionHebergement />
        <SollicitationEntraide />
        <h1 style={{ fontSize: 25, fontWeight: 800, lineHeight: 1.2, color: 'var(--bleu-nuit)' }}>{mission.titre}</h1>

        {acceptee && (
          <p role="status" style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bleu)', color: 'var(--blanc)', borderRadius: 14, padding: '12px 14px', fontSize: 15, fontWeight: 700 }}>
            <Icone nom="valide" taille={20} couleur="var(--cyan)" epaisseur={2.6} />
            Le coordinateur vous attend à {mission.rendezVous}.
          </p>
        )}

        <section className="carte" style={{ padding: 0, borderRadius: 16, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          <div style={{ ...cellule, borderRight: separateur, borderBottom: separateur }}>
            <span className="texte-doux">Rendez-vous</span>
            <span style={{ fontSize: 17, fontWeight: 800 }}>{mission.rendezVous}</span>
          </div>
          <div style={{ ...cellule, borderBottom: separateur }}>
            <span className="texte-doux">Durée estimée</span>
            <span style={{ fontSize: 17, fontWeight: 800 }}>{mission.duree}</span>
          </div>
          <div style={{ ...cellule, borderRight: separateur }}>
            <span className="texte-doux">Équipe</span>
            <span style={{ fontSize: 17, fontWeight: 800 }}>{mission.equipe}</span>
          </div>
          <div style={cellule}>
            <span className="texte-doux">Votre ressource</span>
            <span style={{ fontSize: 17, fontWeight: 800 }}>{mission.ressource}</span>
          </div>
        </section>

        <section className="carte" style={{ padding: '14px 16px', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span className="texte-doux">Point de rendez-vous</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--bleu-nuit)' }}>{mission.lieu}</span>
            <span className="texte-doux">Demandez {mission.coordinateur}, coordinateur</span>
          </div>
          <Link
            to="/carte"
            state={{ mission: mission.id }}
            aria-label="Itinéraire vers le point de rendez-vous"
            style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--bleu-clair)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bleu-nuit)', flexShrink: 0 }}
          >
            <Icone nom="itineraire" epaisseur={2} />
          </Link>
        </section>

        <section style={{ background: 'var(--bleu-nuit)', borderRadius: 16, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--consigne)' }}>Consignes de sécurité</span>
          <span style={{ fontSize: 14, lineHeight: 1.45, color: 'var(--bleu-voile)' }}>{mission.consignes}</span>
        </section>

        {!acceptee && (
          <p className="texte-doux" style={{ lineHeight: 1.4 }}>
            Refuser cette mission ne vous retire pas : la suivante de vos types d'aide vous sera proposée. Pour ne plus être sollicité,{' '}
            <Link to="/aider">changez vos types d'aide ou indiquez que vous n'êtes plus disponible</Link>.
          </p>
        )}
      </main>

      <footer style={{ position: 'sticky', bottom: 0, padding: '12px 20px calc(18px + env(safe-area-inset-bottom))', background: 'var(--blanc)', borderTop: '1px solid var(--bordure)', display: 'flex', gap: 10 }}>
        {acceptee ? (
          <>
            <button type="button" className="bouton bouton--contour" style={{ flex: 1 }} onClick={refuser}>
              Me désister
            </button>
            <Link to="/carte" state={{ mission: mission.id }} className="bouton bouton--principal" style={{ flex: 1.4 }}>
              <Icone nom="itineraire" taille={18} /> Itinéraire
            </Link>
          </>
        ) : (
          <>
            <button type="button" className="bouton" style={{ flex: 1, border: '2px solid var(--bordure)', background: 'var(--blanc)', color: 'var(--texte)', fontWeight: 700, fontSize: 16 }} onClick={refuser}>
              Refuser cette mission
            </button>
            <button
              type="button"
              className="bouton bouton--principal"
              style={{ flex: 1.4 }}
              onClick={() => {
                repondreMission('acceptee')
                // Direction le point de rendez-vous, mission rappelée sous la carte
                navigate('/carte', { state: { mission: mission.id } })
              }}
            >
              J'accepte
            </button>
          </>
        )}
      </footer>
    </div>
  )
}

function EnAttenteDeMission({ hebergeurSeul }: { hebergeurSeul: boolean }) {
  const { communeAffichee: commune, seRendreIndisponible } = useAppState()
  return (
    <div className="ecran">
      <EnTeteRetour retour="/accueil">
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--bleu)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Vous êtes disponible
        </span>
        <span style={{ fontSize: 14, color: 'var(--texte-doux)' }}>Coordinateur · Mairie de {commune}</span>
      </EnTeteRetour>
      <main className="contenu" style={{ paddingTop: 10 }}>
        <PropositionHebergement />
        <SollicitationEntraide />
        <section role="status" className="carte" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Icone nom="valide" taille={24} couleur="var(--bleu)" epaisseur={2.4} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <strong style={{ fontSize: 17, color: 'var(--bleu-nuit)' }}>La mairie a reçu votre disponibilité</strong>
            <span className="texte-doux">
              {hebergeurSeul
                ? "Vous proposez un hébergement : une demande d'accueil s'affichera ici et sur votre accueil dès qu'une famille en aura besoin."
                : "Aucune mission ne correspond à ce que vous proposez pour le moment. Elle s'affichera ici dès que le coordinateur en ouvrira une."}
            </span>
          </div>
        </section>
        <Link to="/aider" className="bouton bouton--clair">
          Modifier mes types d'aide
        </Link>
        <button type="button" className="bouton bouton--contour" onClick={seRendreIndisponible}>
          Je ne suis plus disponible
        </button>
        <Link to="/accueil" style={{ textAlign: 'center', fontWeight: 700, padding: 12, minHeight: 44 }}>
          Retour à l'accueil
        </Link>
      </main>
    </div>
  )
}
