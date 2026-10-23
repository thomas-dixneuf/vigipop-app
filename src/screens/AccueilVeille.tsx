import { Link } from 'react-router-dom'
import BarreNav from '../components/BarreNav.tsx'
import BoutonDemo from '../components/BoutonDemo.tsx'
import VisiteGuidee from '../components/VisiteGuidee.tsx'
import { useAppState } from '../state/AppState.tsx'
import EnTete from '../components/EnTete.tsx'
import Icone from '../components/Icone.tsx'
import { lieuxAccueil, risques } from '../data/fictif.ts'

const preparation = 60

export default function AccueilVeille() {
  const { visiteAFaire } = useAppState()
  return (
    <div className="ecran">
      {visiteAFaire && <VisiteGuidee />}
      <EnTete />
      <main className="contenu">
        <section data-visite="alerte" style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bleu-voile)', borderRadius: 16, padding: '14px 16px' }}>
          <span style={{ width: 40, height: 40, borderRadius: 20, background: 'var(--blanc)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bleu)' }}>
            <Icone nom="bouclier" />
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--bleu-nuit)' }}>Aucune alerte en cours</span>
            <span className="texte-doux">Votre mairie vous préviendra ici en cas de crise</span>
          </span>
        </section>

        <Link
          to="/aider"
          data-visite="preparation"
          style={{ textDecoration: 'none', color: 'var(--blanc)', background: 'var(--bleu)', borderRadius: 20, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 18, fontWeight: 800 }}>Ma préparation</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--cyan)' }}>{preparation} %</span>
          </span>
          <span
            role="progressbar"
            aria-label="Ma préparation"
            aria-valuenow={preparation}
            aria-valuemin={0}
            aria-valuemax={100}
            style={{ display: 'block', height: 8, borderRadius: 4, background: 'var(--bleu-nuit)', overflow: 'hidden' }}
          >
            <span style={{ display: 'block', width: `${preparation}%`, height: 8, background: 'var(--cyan)' }} />
          </span>
          <span style={{ fontSize: 14, color: 'var(--bleu-voile)', lineHeight: 1.4 }}>
            Prochaine étape : indiquez ce que vous pourriez offrir ou prêter →
          </span>
        </Link>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 className="titre-section">Les risques de ma commune</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {risques.map((r) => (
              <span
                key={r}
                style={{ minHeight: 44, padding: '0 14px', borderRadius: 22, background: 'var(--blanc)', border: '1px solid var(--bordure)', color: 'var(--bleu-nuit)', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center' }}
              >
                {r}
              </span>
            ))}
          </div>
          <span className="texte-doux">Les bons réflexes pour chaque risque, validés par la mairie.</span>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 className="titre-section">Lieux d'accueil prévus</h2>
          <div style={{ display: 'flex', gap: 10 }}>
            {lieuxAccueil.map((l) => (
              <div key={l.nom} className="carte" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{l.nom}</span>
                <span className="texte-doux">{l.distance} de chez vous</span>
              </div>
            ))}
          </div>
        </section>

        <Link
          to="/signaler"
          data-visite="signaler"
          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 52, padding: '0 16px', borderRadius: 16, border: '2px solid var(--urgence)', background: 'var(--blanc)', color: 'var(--urgence)', fontSize: 15, fontWeight: 800 }}
        >
          Une urgence ? Signaler ma situation
          <Icone nom="fleche" taille={20} epaisseur={2.4} />
        </Link>

        <BoutonDemo />
      </main>
      <BarreNav />
    </div>
  )
}
