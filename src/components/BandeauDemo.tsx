// Maquette de démonstration (serveur local) : rien n'est envoyé, tout reste dans ce navigateur
export default function BandeauDemo({ sombre = false }: { sombre?: boolean }) {
  return (
    <p
      role="note"
      style={{
        margin: 0,
        padding: '6px 12px',
        fontSize: 12,
        lineHeight: 1.4,
        textAlign: 'center',
        background: sombre ? 'rgba(255,255,255,.08)' : 'var(--bleu-voile)',
        color: sombre ? 'var(--bleu-clair)' : 'var(--bleu-nuit)',
        borderRadius: sombre ? 10 : 0,
      }}
    >
      <strong>Démonstration</strong> : personnes et demandes fictives. Ne saisissez pas de vraies informations, rien n'est envoyé.
    </p>
  )
}
