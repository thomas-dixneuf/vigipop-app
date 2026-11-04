import { useEffect, useRef } from 'react'
import { serveur, serveurLocal, serveurMairie } from '../services/serveur.ts'
import { basculerCriseLocale } from '../services/serveurLocal.ts'
import { useAppState } from '../state/AppState.tsx'
import { presentation } from './BoutonDemo.tsx'

// Version de présentation : geste discret pour déclencher ou terminer la crise, sur tous les écrans
// (appui long sur le logo Vigipop, ou Maj + C). Avec le serveur local, c'est la « mairie » qui
// déclenche et l'app habitant suit, comme en vrai.
export default function RaccourciCrise() {
  const { basculerMode } = useAppState()
  const basculer = useRef(basculerMode)
  useEffect(() => {
    basculer.current = basculerMode
  }, [basculerMode])

  useEffect(() => {
    if (!presentation || (serveur && !serveurLocal)) return
    const basculerCrise = () => (serveurLocal ? void basculerCriseLocale(serveurMairie!) : basculer.current())
    let minuteur: number | undefined
    const annuler = () => window.clearTimeout(minuteur)
    const appui = (e: PointerEvent) => {
      if (!(e.target instanceof HTMLImageElement) || !e.target.alt.startsWith('Vigipop')) return
      annuler()
      minuteur = window.setTimeout(basculerCrise, 800)
    }
    const touche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null
      if (e.shiftKey && e.key.toLowerCase() === 'c' && !cible?.closest('input, textarea')) basculerCrise()
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

  return null
}
