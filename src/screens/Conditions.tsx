import { useLocation } from 'react-router-dom'
import EnTeteRetour from '../components/EnTeteRetour.tsx'
import TexteLegal from '../components/TexteLegal.tsx'
import { conditions, enBrefConditions } from '../data/textesLegaux.tsx'

// Conditions générales d'utilisation : consultables sans compte, à tout moment
export default function Conditions() {
  const retour = (useLocation().state as { retour?: string } | null)?.retour ?? '/profil'
  return (
    <div className="ecran">
      <EnTeteRetour retour={retour}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--bleu-nuit)' }}>Conditions d'utilisation</h1>
      </EnTeteRetour>
      <main className="contenu" style={{ paddingTop: 8 }}>
        <TexteLegal enBref={enBrefConditions} paragraphes={conditions} />
      </main>
    </div>
  )
}
