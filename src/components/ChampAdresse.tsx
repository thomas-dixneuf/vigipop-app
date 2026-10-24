import { useEffect, useState } from 'react'
import { champ, libelle } from '../outils/formulaire.ts'
import { chercherAdresse, type ResultatAdresse } from '../outils/carte.ts'

type Props = {
  // Adresse officielle choisie dans les suggestions, ou null si le texte a changé depuis
  onChoix: (r: ResultatAdresse | null) => void
  // Texte saisi : reste utilisable sans réseau, même sans suggestion choisie
  onTexte?: (texte: string) => void
  valeurInitiale?: string
  verifieeInitialement?: boolean
  variante?: 'mairie' | 'app'
}

// Saisie d'adresse avec suggestions de la Base Adresse Nationale (adresses officielles à jour)
export default function ChampAdresse({ onChoix, onTexte, valeurInitiale = '', verifieeInitialement = false, variante = 'mairie' }: Props) {
  const [texte, setTexte] = useState(valeurInitiale)
  const [suggestions, setSuggestions] = useState<ResultatAdresse[]>([])
  const [choisie, setChoisie] = useState<string | null>(verifieeInitialement ? valeurInitiale : null)
  const app = variante === 'app'

  useEffect(() => {
    if (choisie === texte) return
    let annule = false
    const minuteur = window.setTimeout(() => {
      chercherAdresse(texte)
        .then((r) => !annule && setSuggestions(r))
        .catch(() => !annule && setSuggestions([]))
    }, 250)
    return () => {
      annule = true
      window.clearTimeout(minuteur)
    }
  }, [texte, choisie])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={app ? libelle : { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, fontWeight: 700 }}>
        Adresse
        <input
          className={app ? undefined : 'mairie-champ'}
          style={app ? champ : undefined}
          value={texte}
          maxLength={200}
          placeholder="Commencez à taper l'adresse"
          autoComplete={app ? 'street-address' : 'off'}
          onChange={(e) => {
            setTexte(e.target.value)
            setChoisie(null)
            onChoix(null)
            onTexte?.(e.target.value)
          }}
        />
      </label>
      {choisie === null && suggestions.length > 0 && (
        <ul role="listbox" aria-label="Adresses suggérées" style={{ margin: 0, padding: 0, listStyle: 'none', border: '1px solid var(--bordure)', borderRadius: 10, overflow: 'hidden', background: 'var(--blanc)' }}>
          {suggestions.map((s) => (
            <li key={`${s.libelle}-${s.lat}`}>
              <button
                type="button"
                className={app ? undefined : 'mairie-bouton'}
                style={
                  app
                    ? { width: '100%', minHeight: 44, textAlign: 'left', border: 'none', borderBottom: '1px solid var(--bleu-voile)', background: 'var(--blanc)', padding: '10px 14px', fontSize: 15, color: 'var(--texte)' }
                    : { width: '100%', textAlign: 'left', border: 'none', borderRadius: 0, fontWeight: 400 }
                }
                onClick={() => {
                  setTexte(s.libelle)
                  setChoisie(s.libelle)
                  setSuggestions([])
                  onChoix(s)
                  onTexte?.(s.libelle)
                }}
              >
                {s.libelle}
              </button>
            </li>
          ))}
        </ul>
      )}
      {choisie !== null && <span className="texte-doux" style={{ fontSize: 13 }}>Adresse vérifiée (Base Adresse Nationale)</span>}
    </div>
  )
}
