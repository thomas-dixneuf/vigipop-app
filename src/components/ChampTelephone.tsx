import { champ, libelle, numeroValide } from '../outils/formulaire.ts'

export default function ChampTelephone({ valeur, onChange }: { valeur: string; onChange: (v: string) => void }) {
  const invalide = valeur !== '' && !numeroValide(valeur)
  return (
    <label style={libelle}>
      Numéro de mobile
      <input
        type="tel"
        inputMode="tel"
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        placeholder="06 XX XX XX XX"
        autoComplete="tel"
        aria-invalid={invalide}
        style={champ}
      />
      {invalide && (
        <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--danger)' }}>Entrez un numéro de mobile (06 ou 07).</span>
      )}
    </label>
  )
}
