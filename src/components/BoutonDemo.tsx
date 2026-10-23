import { serveur } from '../services/serveur.ts'
import { useAppState } from '../state/AppState.tsx'

// Réservé aux démonstrations en mairie : simule le déclenchement de crise par la commune
export default function BoutonDemo({ sombre = false }: { sombre?: boolean }) {
  const { mode, basculerMode } = useAppState()
  // Avec le serveur, seule la mairie déclenche la crise (tableau de bord)
  if (serveur) return null
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
