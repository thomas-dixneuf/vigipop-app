import BarreNav from '../components/BarreNav.tsx'
import ChampAdresse from '../components/ChampAdresse.tsx'
import EnTeteRetour from '../components/EnTeteRetour.tsx'
import { pointsRassemblement } from '../data/fictif.ts'
import { lienItineraire } from '../outils/carte.ts'
import { centresDeLaZone, pointDuQuartier, pointLePlusProche } from '../outils/rassemblement.ts'
import { useAppState } from '../state/AppState.tsx'

// Orientation selon le lieu de résidence, d'après le DICRIM : quartier → point de rassemblement,
// zone Nord ou Sud Moine → centres d'hébergement. L'adresse sert au calcul et reste sur le téléphone.
export default function MonQuartier() {
  const { quartier, domicile, choisirQuartier, lieux, communeAffichee } = useAppState()
  const point = pointDuQuartier(quartier)
  const centres = point ? centresDeLaZone(point.zone, lieux) : []

  const zone = (z: 'nord' | 'sud') => (
    <fieldset style={{ border: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <legend style={{ fontSize: 14, fontWeight: 800, color: 'var(--bleu-nuit)', marginBottom: 6 }}>Zone {z === 'nord' ? 'Nord' : 'Sud'} Moine</legend>
      {pointsRassemblement
        .filter((p) => p.zone === z)
        .map((p) => (
          <button
            key={p.numero}
            type="button"
            aria-pressed={quartier === p.numero}
            className={quartier === p.numero ? 'bouton bouton--principal' : 'bouton bouton--contour'}
            style={{ justifyContent: 'space-between', textAlign: 'left' }}
            onClick={() => choisirQuartier(p.numero)}
          >
            {p.quartier}
          </button>
        ))}
    </fieldset>
  )

  return (
    <div className="ecran">
      <EnTeteRetour retour="/accueil">
        <h1 style={{ fontSize: 21, fontWeight: 800, color: 'var(--bleu-nuit)' }}>Où aller en cas d'évacuation</h1>
        <span className="texte-doux">D'après le DICRIM de {communeAffichee}</span>
      </EnTeteRetour>

      <main className="contenu" style={{ paddingTop: 12 }}>
        {point && (
          <section className="carte" style={{ display: 'flex', flexDirection: 'column', gap: 10, borderColor: 'var(--bleu)', borderWidth: 2 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--bleu)', textTransform: 'uppercase', letterSpacing: 0.6 }}>
              1 · Point de rassemblement du quartier {point.quartier}
            </span>
            <strong style={{ fontSize: 18, color: 'var(--bleu-nuit)' }}>{point.nom}</strong>
            <span style={{ fontSize: 14, lineHeight: 1.45 }}>
              Si la mairie demande d'évacuer, rejoignez ce lieu : vos besoins y sont recensés. Chez de la famille ou des proches, prévenez la
              mairie avec « J'ai besoin d'aide ».
            </span>
            {point.approximatif && <span className="texte-doux">Position approximative : centre du quartier.</span>}
            <a className="bouton bouton--principal" href={lienItineraire(point)} target="_blank" rel="noreferrer">
              Itinéraire
            </a>

            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--bleu)', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 6 }}>
              2 · Centres d'hébergement de la zone {point.zone === 'nord' ? 'Nord' : 'Sud'} Moine
            </span>
            <span className="texte-doux" style={{ lineHeight: 1.4 }}>Ouverts seulement sur décision de la cellule de crise.</span>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
              {centres.map((l) => (
                <li key={l.id}>
                  <strong>{l.nom}</strong>
                  {l.adresse ? ` · ${l.adresse.replace(/, 49300 Cholet$/, '')}` : ''}
                  {l.ouvert ? <strong style={{ color: 'var(--bleu)' }}> · ouvert</strong> : null}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="carte" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--bleu-nuit)' }}>{point ? 'Changer d’adresse' : 'Votre adresse'}</h2>
          <ChampAdresse
            variante="app"
            libelleChamp="Adresse de votre domicile"
            valeurInitiale={domicile?.adresse ?? ''}
            verifieeInitialement={!!domicile}
            onChoix={(r) => {
              if (!r) return
              choisirQuartier(pointLePlusProche(r).numero, { adresse: r.libelle, lat: r.lat, lng: r.lng })
            }}
          />
          <p className="texte-doux" style={{ lineHeight: 1.4, margin: 0 }}>
            Votre adresse reste sur ce téléphone. Sans réseau, choisissez directement votre quartier ci-dessous.
          </p>
        </section>

        <section className="carte" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--bleu-nuit)' }}>Ou choisissez votre quartier</h2>
          {zone('nord')}
          {zone('sud')}
        </section>
      </main>
      <BarreNav />
    </div>
  )
}
