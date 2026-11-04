import { Link } from 'react-router-dom'
import Icone from './Icone.tsx'
import { useAppState } from '../state/AppState.tsx'
import { lienItineraire } from '../outils/carte.ts'
import { centresDeLaZone, pointDuQuartier } from '../outils/rassemblement.ts'

// Où aller selon son adresse : point de rassemblement du quartier, puis centre d'hébergement de la zone (DICRIM)
export default function CarteRassemblement() {
  const { quartier, mode, lieux } = useAppState()
  const point = pointDuQuartier(quartier)
  const crise = mode === 'crise'

  if (!point) {
    return (
      <Link
        to="/quartier"
        className="carte"
        style={{ textDecoration: 'none', color: 'var(--texte)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderColor: 'var(--bleu)', borderWidth: crise ? 2 : 1 }}
      >
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <strong style={{ color: 'var(--bleu-nuit)' }}>Où aller en cas d'évacuation ?</strong>
          <span className="texte-doux">Indiquez votre adresse pour connaître votre point de rassemblement</span>
        </span>
        <Icone nom="fleche" taille={18} />
      </Link>
    )
  }

  const ouverts = centresDeLaZone(point.zone, lieux).filter((l) => l.ouvert)
  return (
    <section className="carte" style={{ display: 'flex', flexDirection: 'column', gap: 8, borderColor: 'var(--bleu)', borderWidth: crise ? 2 : 1 }}>
      <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--bleu)', textTransform: 'uppercase', letterSpacing: 0.6 }}>
        {crise ? 'Si vous devez quitter votre domicile' : 'Votre point de rassemblement'}
      </span>
      <strong style={{ fontSize: 17, color: 'var(--bleu-nuit)', lineHeight: 1.3 }}>{point.nom}</strong>
      <span className="texte-doux" style={{ lineHeight: 1.4 }}>
        Quartier {point.quartier} · zone {point.zone === 'nord' ? 'Nord' : 'Sud'} Moine. Vos besoins y sont recensés avant tout hébergement.
      </span>
      {crise && ouverts.length > 0 && (
        <span style={{ fontSize: 14, lineHeight: 1.4 }}>
          Centre d'hébergement ouvert pour votre zone : <strong>{ouverts.map((l) => l.nom).join(', ')}</strong>
        </span>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <a className="bouton bouton--principal" style={{ flex: 1 }} href={lienItineraire(point)} target="_blank" rel="noreferrer">
          Itinéraire
        </a>
        <Link to="/quartier" className="bouton bouton--contour" style={{ flex: 1 }}>
          Détails
        </Link>
      </div>
    </section>
  )
}
