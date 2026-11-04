import { useEffect, useState, type CSSProperties } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import App from '../App.tsx'
import Logo from '../components/Logo.tsx'
import MairieApp from '../mairie/MairieApp.tsx'
import { reinitialiserPresentation } from '../services/serveurLocal.ts'

type Vue = 'habitant' | 'mairie'
const LARGEUR_COTE_A_COTE = 1100

// Vue de présentation : l'app habitant (téléphone) et l'espace mairie, reliés par le serveur local.
// Grand écran : côte à côte. Écran plus étroit : un sélecteur passe de l'un à l'autre.
// Chaque côté a son propre routeur, comme deux appareils.
export default function Presentation({ commune }: { commune: string }) {
  const [large, setLarge] = useState(() => window.innerWidth >= LARGEUR_COTE_A_COTE)
  const [vue, setVue] = useState<Vue>('habitant')
  // L'espace mairie n'est monté qu'une fois visible : sa carte se cadre sur une taille réelle
  const [mairieMontee, setMairieMontee] = useState(large)

  useEffect(() => {
    const maj = () => {
      const l = window.innerWidth >= LARGEUR_COTE_A_COTE
      setLarge(l)
      if (l) setMairieMontee(true)
    }
    window.addEventListener('resize', maj)
    return () => window.removeEventListener('resize', maj)
  }, [])

  // Les cartes d'un panneau caché doivent recalculer leur taille quand il réapparaît
  const choisir = (v: Vue) => {
    setVue(v)
    if (v === 'mairie') setMairieMontee(true)
    window.setTimeout(() => window.dispatchEvent(new Event('resize')), 50)
  }

  const libelle: CSSProperties = { fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--bleu-clair)' }
  const visible = (v: Vue) => large || vue === v

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bleu-nuit)', color: 'var(--blanc)' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: large ? '10px 24px' : '8px 12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Logo taille={large ? 36 : 30} />
          <span style={{ fontSize: large ? 17 : 15, fontWeight: 800 }}>Vigipop · {commune}</span>
        </div>
        {!large && (
          <div role="tablist" aria-label="Affichage" style={{ display: 'flex', background: 'rgba(255,255,255,.1)', borderRadius: 22, padding: 3 }}>
            {(['habitant', 'mairie'] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={vue === v}
                onClick={() => choisir(v)}
                style={{
                  minHeight: 44,
                  padding: '0 16px',
                  borderRadius: 20,
                  border: 'none',
                  background: vue === v ? 'var(--blanc)' : 'transparent',
                  color: vue === v ? 'var(--bleu-nuit)' : 'var(--bleu-clair)',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {v === 'habitant' ? 'Habitant' : 'Mairie'}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => window.confirm('Remettre la présentation à zéro (crise, demandes, compte) ?') && reinitialiserPresentation()}
          style={{ minHeight: 44, padding: '0 14px', borderRadius: 22, border: '1px solid rgba(178,216,222,.5)', background: 'transparent', color: 'var(--bleu-clair)', fontSize: 13, fontWeight: 700 }}
        >
          Réinitialiser
        </button>
      </header>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 24, padding: large ? '0 24px 20px' : 0 }}>
        <section
          aria-label="Application habitant"
          style={{ display: visible('habitant') ? 'flex' : 'none', flex: large ? undefined : 1, flexDirection: 'column', alignItems: 'center', gap: 8 }}
        >
          {large && <span style={libelle}>Application habitant</span>}
          <div
            className="cadre-telephone"
            style={{
              width: large ? 410 : '100%',
              flex: 1,
              minHeight: 0,
              maxHeight: large ? 864 : undefined,
              border: large ? '10px solid #081f2c' : 'none',
              borderRadius: large ? 40 : 0,
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
        <section aria-label="Espace mairie" style={{ display: visible('mairie') ? 'flex' : 'none', flex: 1, minWidth: 0, flexDirection: 'column', gap: 8 }}>
          {large && <span style={libelle}>Espace mairie</span>}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', borderRadius: large ? 16 : 0, background: 'var(--fond)', color: 'var(--texte)', transform: 'translateZ(0)' }}>
            {mairieMontee && (
              <MemoryRouter initialEntries={['/mairie']}>
                <Routes>
                  <Route path="*" element={<MairieApp />} />
                </Routes>
              </MemoryRouter>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
