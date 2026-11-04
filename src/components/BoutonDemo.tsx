import { useEffect, useRef } from 'react'
import { serveur } from '../services/serveur.ts'
import { useAppState } from '../state/AppState.tsx'

// Version de présentation (VITE_PRESENTATION) : aucun bouton « Démo » visible ; la crise se
// déclenche et se termine par un appui long sur le logo Vigipop, ou la touche Maj + C
export const presentation = import.meta.env.VITE_PRESENTATION === '1'

// Réservé aux démonstrations en mairie : simule le déclenchement de crise par la commune
export default function BoutonDemo({ sombre = false }: { sombre?: boolean }) {
  const { mode, basculerMode } = useAppState()
  const basculer = useRef(basculerMode)
  useEffect(() => {
    basculer.current = basculerMode
  }, [basculerMode])

  useEffect(() => {
    if (!presentation || serveur) return
    let minuteur: number | undefined
    const annuler = () => window.clearTimeout(minuteur)
    const appui = (e: PointerEvent) => {
      if (!(e.target instanceof HTMLImageElement) || !e.target.alt.startsWith('Vigipop')) return
      annuler()
      minuteur = window.setTimeout(() => basculer.current(), 800)
    }
    const touche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null
      if (e.shiftKey && e.key.toLowerCase() === 'c' && !cible?.closest('input, textarea')) basculer.current()
    }
    document.addEventListener('pointerdown', appui)
    document.addEventListener('pointerup', annuler)
    document.addEventListener('pointercancel', annuler)
    document.addEventListener('keydown', touche)
    return () => {
      annuler()
      document.removeEventListener('pointerdown', appui)
      document.removeEventListener('pointerup', annuler)
      document.removeEventListener('pointercancel', annuler)
      document.removeEventListener('keydown', touche)
    }
  }, [])

  // Avec le serveur, seule la mairie déclenche la crise (tableau de bord)
  if (serveur || presentation) return null
  return (
    <button
      type="button"
      onClick={basculerMode}
      style={{
        alignSelf: 'center',
        minHeight: 44,
        padding: '0 16px',
        borderRadius: 22,
        border: `1px dashed ${sombre ? 'var(--bleu-clair)' : 'var(--texte-doux)'}`,
        background: 'transparent',
        color: sombre ? 'var(--bleu-clair)' : 'var(--texte-doux)',
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      Démo : {mode === 'veille' ? 'simuler une crise déclenchée par la mairie' : 'revenir en mode veille'}
    </button>
  )
}
