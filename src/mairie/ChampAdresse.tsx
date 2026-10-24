import { useEffect, useState } from 'react'
import { chercherAdresse, type ResultatAdresse } from '../outils/carte.ts'

// Saisie d'adresse avec suggestions de la Base Adresse Nationale (adresses officielles à jour)
export default function ChampAdresse({ onChoix }: { onChoix: (r: ResultatAdresse | null) => void }) {
  const [texte, setTexte] = useState('')
  const [suggestions, setSuggestions] = useState<ResultatAdresse[]>([])
  const [choisie, setChoisie] = useState<string | null>(null)

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
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, fontWeight: 700 }}>
        Adresse
        <input
          className="mairie-champ"
          value={texte}
          maxLength={200}
          placeholder="Commencez à taper l'adresse"
          autoComplete="off"
          onChange={(e) => {
            setTexte(e.target.value)
            setChoisie(null)
            onChoix(null)
          }}
        />
      </label>
      {choisie === null && suggestions.length > 0 && (
        <ul role="listbox" aria-label="Adresses suggérées" style={{ margin: 0, padding: 0, listStyle: 'none', border: '1px solid var(--bordure)', borderRadius: 10, overflow: 'hidden' }}>
          {suggestions.map((s) => (
            <li key={`${s.libelle}-${s.lat}`}>
              <button
                type="button"
                className="mairie-bouton"
                style={{ width: '100%', textAlign: 'left', border: 'none', borderRadius: 0, fontWeight: 400 }}
                onClick={() => {
                  setTexte(s.libelle)
                  setChoisie(s.libelle)
                  setSuggestions([])
                  onChoix(s)
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
