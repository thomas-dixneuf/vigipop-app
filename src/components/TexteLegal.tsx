import type { Paragraphe } from '../data/textesLegaux.tsx'
import { avertissementProjet } from '../data/textesLegaux.tsx'

// Corps commun des pages « Vos données » et « Conditions d'utilisation »
export default function TexteLegal({ enBref, paragraphes }: { enBref: string; paragraphes: Paragraphe[] }) {
  return (
    <div className="texte-legal" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p className="texte-doux" style={{ fontStyle: 'italic' }}>{avertissementProjet}</p>
      <p className="carte" style={{ fontSize: 15, lineHeight: 1.5, padding: 14, background: 'var(--bleu-voile)', borderColor: 'transparent', color: 'var(--bleu-nuit)' }}>
        <strong>En bref. </strong>
        {enBref}
      </p>
      {paragraphes.map((p) => (
        <section key={p.titre} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--bleu-nuit)' }}>{p.titre}</h2>
          <div style={{ fontSize: 14, lineHeight: 1.55 }}>{p.contenu}</div>
        </section>
      ))}
      <p className="texte-doux">Dernière mise à jour : 5 novembre 2026 (projet).</p>
    </div>
  )
}
