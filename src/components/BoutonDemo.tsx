import { serveur } from '../services/serveur.ts'
import { useAppState } from '../state/AppState.tsx'

// Version de présentation (VITE_PRESENTATION) : aucun bouton « Démo » visible ; la crise se
// déclenche et se termine par un appui long sur le logo Vigipop, ou la touche Maj + C
export const presentation = import.meta.env.VITE_PRESENTATION === '1'

// Réservé aux démonstrations en mairie : simule le déclenchement de crise par la commune
export default function BoutonDemo({ sombre = false }: { sombre?: boolean }) {
  const { mode, basculerMode } = useAppState()
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
