import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useAppState } from '../state/AppState.tsx'

// Chaque étape éclaire un élément de l'accueil marqué data-visite="…"
const etapes = [
  {
    cible: 'alerte',
    titre: 'Les alertes de votre mairie arrivent ici',
    texte: "En cas de crise, cet écran change : consignes officielles, lieux ouverts et un bouton « Je suis en sécurité » pour rassurer la mairie.",
  },
  {
    cible: 'signaler',
    titre: "Besoin d'aide ? C'est ici.",
    texte: 'En cas de sinistre, signalez votre situation et votre position en 30 secondes. En danger immédiat, appelez toujours le 112.',
  },
  {
    cible: 'preparation',
    titre: 'Vous pouvez aussi aider',
    texte: 'Déclarez dès maintenant ce que vous pourriez offrir : logement, véhicule, matériel ou temps. Seule votre mairie pourra vous solliciter.',
  },
  {
    cible: 'carte',
    titre: 'Les lieux utiles autour de vous',
    texte: "La carte montre les centres d'accueil et les points d'aide ouverts près de chez vous.",
  },
]

type Cadre = { top: number; left: number; width: number; height: number }

export default function VisiteGuidee() {
  const { terminerVisite } = useAppState()
  const [index, setIndex] = useState(0)
  const [cadre, setCadre] = useState<Cadre | null>(null)
  const boutonRef = useRef<HTMLButtonElement>(null)
  const etape = etapes[index]
  const derniere = index === etapes.length - 1

  // Suit la position de l'élément éclairé (défilement, rotation de l'écran)
  useLayoutEffect(() => {
    const element = document.querySelector<HTMLElement>(`[data-visite="${etape.cible}"]`)
    if (!element) return
    element.scrollIntoView({ block: 'center' })
    const mesurer = () => {
      const r = element.getBoundingClientRect()
      setCadre({ top: r.top - 6, left: r.left - 6, width: r.width + 12, height: r.height + 12 })
    }
    mesurer()
    window.addEventListener('resize', mesurer)
    window.addEventListener('scroll', mesurer, true)
    return () => {
      window.removeEventListener('resize', mesurer)
      window.removeEventListener('scroll', mesurer, true)
    }
  }, [etape.cible])

  useEffect(() => {
    boutonRef.current?.focus()
  }, [index])

  useEffect(() => {
    const echap = (e: KeyboardEvent) => e.key === 'Escape' && terminerVisite()
    window.addEventListener('keydown', echap)
    return () => window.removeEventListener('keydown', echap)
  }, [terminerVisite])

  // La carte d'explication se place à l'opposé de l'élément éclairé
  const enBas = !cadre || cadre.top + cadre.height / 2 < window.innerHeight / 2

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="visite-titre" style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
      {/* Voile sombre percé autour de l'élément éclairé */}
      {cadre && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            ...cadre,
            borderRadius: 22,
            boxShadow: '0 0 0 4px var(--cyan), 0 0 0 9999px rgba(14, 58, 82, 0.72)',
            pointerEvents: 'none',
            transition: 'all 0.25s ease',
          }}
        />
      )}

      <section
        aria-live="polite"
        style={{
          position: 'fixed',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(448px, calc(100% - 32px))',
          ...(enBas ? { bottom: 'calc(16px + env(safe-area-inset-bottom))' } : { top: 16 }),
          background: 'var(--bleu-nuit)',
          color: 'var(--blanc)',
          borderRadius: 20,
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          boxShadow: '0 8px 24px rgba(15,42,56,0.35)',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Visite guidée · {index + 1} / {etapes.length}
        </span>
        <h2 id="visite-titre" style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.25 }}>
          {etape.titre}
        </h2>
        <p style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--bleu-voile)' }}>{etape.texte}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <button type="button" onClick={terminerVisite} style={{ background: 'none', border: 'none', color: 'var(--bleu-clair)', fontSize: 15, fontWeight: 700, minHeight: 44, padding: 0 }}>
            Passer
          </button>
          <button
            ref={boutonRef}
            type="button"
            onClick={() => (derniere ? terminerVisite() : setIndex((i) => i + 1))}
            className="bouton bouton--clair"
            style={{ minHeight: 48, fontSize: 16 }}
          >
            {derniere ? "C'est compris" : 'Suivant'}
          </button>
        </div>
      </section>
    </div>
  )
}
