import { champ, libelle, numeroValide } from '../outils/formulaire.ts'
import { paysDe } from '../data/pays.ts'

// pays : code du pays du compte (France par défaut, numéro 06 / 07)
export default function ChampTelephone({ valeur, onChange, pays = 'FR' }: { valeur: string; onChange: (v: string) => void; pays?: string }) {
  const france = pays === 'FR'
  const invalide = valeur !== '' && !numeroValide(valeur, pays)
  return (
    <label style={libelle}>
      Numéro de mobile
      <input
        type="tel"
        inputMode="tel"
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        placeholder={france ? '06 XX XX XX XX' : `+${paysDe(pays).indicatif} …`}
        autoComplete="tel"
        aria-invalid={invalide}
        style={champ}
      />
      {invalide && (
        <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--danger)' }}>{france ? 'Entrez un numéro de mobile (06 ou 07).' : 'Entrez un numéro de mobile valide.'}</span>
      )}
    </label>
  )
}
