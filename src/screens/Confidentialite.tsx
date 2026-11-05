import { useLocation } from 'react-router-dom'
import EnTeteRetour from '../components/EnTeteRetour.tsx'
import TexteLegal from '../components/TexteLegal.tsx'
import { confidentialite, enBrefConfidentialite } from '../data/textesLegaux.tsx'

// Politique de confidentialité : consultable sans compte, à tout moment
export default function Confidentialite() {
  const retour = (useLocation().state as { retour?: string } | null)?.retour ?? '/profil'
  return (
    <div className="ecran">
      <EnTeteRetour retour={retour}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--bleu-nuit)' }}>Vos données</h1>
        <span className="texte-doux">et votre vie privée</span>
      </EnTeteRetour>
      <main className="contenu" style={{ paddingTop: 8 }}>
        <TexteLegal enBref={enBrefConfidentialite} paragraphes={confidentialite} />
      </main>
    </div>
  )
}
