import { MemoryRouter, Route, Routes } from 'react-router-dom'
import App from '../App.tsx'
import Logo from '../components/Logo.tsx'
import MairieApp from '../mairie/MairieApp.tsx'
import { reinitialiserPresentation } from '../services/serveurLocal.ts'

// Vue de présentation sur grand écran : l'app habitant (téléphone) et l'espace mairie côte à côte,
// reliés par le serveur local. Chaque côté a son propre routeur, comme deux appareils.
export default function Presentation({ commune }: { commune: string }) {
  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bleu-nuit)', color: 'var(--blanc)' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '10px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Logo taille={36} />
          <span style={{ fontSize: 17, fontWeight: 800 }}>Vigipop · Ville de {commune}</span>
        </div>
        <button
          type="button"
          onClick={() => window.confirm('Remettre la présentation à zéro (crise, demandes, compte) ?') && reinitialiserPresentation()}
          style={{ minHeight: 44, padding: '0 16px', borderRadius: 22, border: '1px solid rgba(178,216,222,.5)', background: 'transparent', color: 'var(--bleu-clair)', fontSize: 13, fontWeight: 700 }}
        >
          Réinitialiser
        </button>
      </header>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 24, padding: '0 24px 20px' }}>
        <section aria-label="Application habitant" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--bleu-clair)' }}>Application habitant</span>
          <div
            className="cadre-telephone"
            style={{
              width: 410,
              flex: 1,
              maxHeight: 864,
              border: '10px solid #081f2c',
              borderRadius: 40,
              overflow: 'hidden',
              background: 'var(--fond)',
              color: 'var(--texte)',
              // Les éléments « fixes » de l'app (notifications, visite) restent dans le téléphone
              transform: 'translateZ(0)',
            }}
          >
            <div style={{ height: '100%', overflowY: 'auto' }}>
              <MemoryRouter initialEntries={['/']}>
                <App />
              </MemoryRouter>
            </div>
          </div>
        </section>
        <section aria-label="Espace mairie" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--bleu-clair)' }}>Espace mairie</span>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', borderRadius: 16, background: 'var(--fond)', color: 'var(--texte)', transform: 'translateZ(0)' }}>
            <MemoryRouter initialEntries={['/mairie']}>
              <Routes>
                <Route path="*" element={<MairieApp />} />
              </Routes>
            </MemoryRouter>
          </div>
        </section>
      </div>
    </div>
  )
}
