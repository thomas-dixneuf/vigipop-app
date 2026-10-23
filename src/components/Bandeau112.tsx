import Icone from './Icone.tsx'

// Le 112 reste visible sur tout le parcours sinistré : Vigipop complète les secours
export default function Bandeau112({ texte }: { texte?: string }) {
  return (
    <a
      href="tel:112"
      className="carte"
      style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, color: 'var(--texte)', fontSize: 14, lineHeight: 1.35 }}
    >
      <Icone nom="telephone" couleur="var(--danger)" epaisseur={2} />
      <span>
        <strong style={{ color: 'var(--danger)' }}>Danger immédiat ? Appelez le 112.</strong>{' '}
        {texte ?? 'Vigipop ne remplace pas les secours.'}
      </span>
    </a>
  )
}
