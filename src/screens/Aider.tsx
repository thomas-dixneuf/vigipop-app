import { useNavigate } from 'react-router-dom'
import ChampAdresse from '../components/ChampAdresse.tsx'
import EnTeteRetour from '../components/EnTeteRetour.tsx'
import Icone from '../components/Icone.tsx'
import { ressources } from '../data/fictif.ts'
import { useAppState } from '../state/AppState.tsx'

export default function Aider() {
  const navigate = useNavigate()
  const { mode, ressources: actives, basculerRessource, seRendreDisponible, seRendreIndisponible, enregistrerOffres, disponible, accueil, definirAccueil } = useAppState()
  const enCrise = mode === 'crise'

  const valider = () => {
    if (enCrise) {
      seRendreDisponible()
      navigate('/mission')
    } else {
      enregistrerOffres()
      navigate('/accueil')
    }
  }

  return (
    <div className="ecran">
      <EnTeteRetour retour="/accueil">
        <h1 style={{ fontSize: 21, fontWeight: 800, color: 'var(--bleu-nuit)' }}>Ce que je peux offrir</h1>
        <span className="texte-doux">Mobilisé uniquement si la mairie vous sollicite</span>
      </EnTeteRetour>

      <main className="contenu" style={{ paddingTop: 10 }}>
        <p style={{ fontSize: 15, lineHeight: 1.45 }}>
          Touchez les aides que vous pouvez apporter. Vous pouvez en choisir plusieurs et les changer à tout moment : la mairie ne vous
          proposera que des missions de ces types.
        </p>

        <section aria-label="Mes types d'aide" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ressources.map((r) => {
            const active = actives.includes(r.id)
            return (
              <button
                key={r.id}
                type="button"
                aria-pressed={active}
                onClick={() => basculerRessource(r.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  minHeight: 64,
                  padding: '12px 14px',
                  borderRadius: 16,
                  textAlign: 'left',
                  border: `2px solid ${active ? 'var(--bleu)' : 'var(--bordure)'}`,
                  background: active ? 'var(--bleu-voile)' : 'var(--blanc)',
                  color: 'var(--texte)',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `2px solid ${active ? 'var(--bleu)' : '#8da3ae'}`,
                    background: active ? 'var(--bleu)' : 'var(--blanc)',
                    color: 'var(--blanc)',
                  }}
                >
                  {active && <Icone nom="valide" taille={16} epaisseur={3} />}
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{r.label}</span>
                  <span className="texte-doux">
                    {r.id === 'heb' ? `${accueil.places} place${accueil.places > 1 ? 's' : ''} · chez moi` : `Par exemple : ${r.detail}`}
                  </span>
                </span>
              </button>
            )
          })}
        </section>

        {actives.includes('heb') && (
          <section aria-label="Mon offre d'hébergement" className="carte" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <strong style={{ fontSize: 15, color: 'var(--bleu-nuit)' }}>Hébergement : combien de personnes pouvez-vous accueillir ?</strong>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                type="button"
                className="bouton bouton--clair"
                style={{ width: 52, minHeight: 52, padding: 0, fontSize: 24 }}
                aria-label="Une place de moins"
                disabled={accueil.places <= 1}
                onClick={() => definirAccueil({ places: accueil.places - 1 })}
              >
                −
              </button>
              <span aria-live="polite" style={{ fontSize: 18, fontWeight: 800, minWidth: 90, textAlign: 'center' }}>
                {accueil.places} place{accueil.places > 1 ? 's' : ''}
              </span>
              <button
                type="button"
                className="bouton bouton--clair"
                style={{ width: 52, minHeight: 52, padding: 0, fontSize: 24 }}
                aria-label="Une place de plus"
                disabled={accueil.places >= 20}
                onClick={() => definirAccueil({ places: accueil.places + 1 })}
              >
                +
              </button>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700 }}>Adresse du logement où vous accueilleriez</span>
            <ChampAdresse
              variante="app"
              valeurInitiale={accueil.adresse}
              verifieeInitialement={accueil.lat !== null}
              onTexte={(adresse) => definirAccueil({ adresse })}
              onChoix={(r) => definirAccueil(r ? { adresse: r.libelle, lat: r.lat, lng: r.lng } : { lat: null, lng: null })}
            />
            <span className="texte-doux" style={{ lineHeight: 1.4 }}>
              Elle ne sera donnée à une personne sinistrée qu'après votre accord.
            </span>
          </section>
        )}
      </main>

      <footer style={{ position: 'sticky', bottom: 0, padding: '12px 20px calc(18px + env(safe-area-inset-bottom))', background: 'var(--blanc)', borderTop: '1px solid var(--bordure)', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button type="button" className="bouton bouton--principal" style={{ fontSize: 18 }} onClick={valider} disabled={actives.length === 0}>
          {enCrise ? (disponible ? 'Enregistrer mes types d’aide' : 'Je suis disponible maintenant') : 'Enregistrer mes offres'}
        </button>
        {enCrise && disponible && (
          <button
            type="button"
            className="bouton bouton--contour"
            onClick={() => {
              seRendreIndisponible()
              navigate('/accueil')
            }}
          >
            Je ne suis plus disponible
          </button>
        )}
        {actives.length === 0 && (
          <span className="texte-doux" style={{ fontSize: 12, textAlign: 'center' }}>
            Choisissez au moins un type d'aide.
          </span>
        )}
      </footer>
    </div>
  )
}
