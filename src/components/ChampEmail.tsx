import { champ, libelle } from '../outils/formulaire.ts'
import { emailValide } from '../services/codeConnexion.ts'

export default function ChampEmail({ valeur, onChange }: { valeur: string; onChange: (v: string) => void }) {
  const invalide = valeur !== '' && !emailValide(valeur)
  return (
    <label style={libelle}>
      Adresse e-mail
      <input
        type="email"
        inputMode="email"
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        placeholder="prenom.nom@exemple.fr"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={120}
        aria-invalid={invalide}
        style={champ}
      />
      {invalide && <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--danger)' }}>Entrez une adresse e-mail complète.</span>}
    </label>
  )
}
