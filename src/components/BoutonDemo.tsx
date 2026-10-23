import { useAppState } from '../state/AppState.tsx'

// Réservé aux démonstrations en mairie : simule le déclenchement de crise par la commune
export default function BoutonDemo() {
  const { mode, basculerMode } = useAppState()
  return (
    <button
      type="button"
      onClick={basculerMode}
      style={{
        alignSelf: 'center',
        minHeight: 44,
        padding: '0 16px',
        borderRadius: 22,
        border: '1px dashed var(--texte-doux)',
        background: 'transparent',
        color: 'var(--texte-doux)',
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      Démo : {mode === 'veille' ? 'simuler une crise déclenchée par la mairie' : 'revenir en mode veille'}
    </button>
  )
}
