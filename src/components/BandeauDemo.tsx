// Lien habitant seul : pas de mairie à côté, la crise se simule d'un appui long sur le logo (ou Maj + C)
const habitantSeul = import.meta.env.VITE_VUE === 'habitant' && import.meta.env.VITE_PRESENTATION === '1'

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
      {habitantSeul && ' Pour simuler une crise déclenchée par la mairie : appui long sur le logo Vigipop.'}
    </p>
  )
}
