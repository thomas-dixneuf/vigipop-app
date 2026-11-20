import { useState } from 'react'
import ChampAdresse from './ChampAdresse.tsx'
import { champ, libelle } from '../outils/formulaire.ts'
import { PAYS, PAYS_PAR_DEFAUT } from '../data/pays.ts'

type Props = {
  pays: string
  onPays: (code: string) => void
  // Commune valide (choisie dans la liste en France, tapée ailleurs), ou null
  onCommune: (commune: string | null) => void
  valeurInitiale?: string
  verifieeInitialement?: boolean
}

// Pays puis commune. En France, la commune est choisie dans la liste officielle (ChampAdresse) ;
// dans un autre pays, Vigipop n'a pas encore de communes : la commune est tapée librement.
export default function ChampPaysCommune({ pays, onPays, onCommune, valeurInitiale = '', verifieeInitialement = false }: Props) {
  // La valeur de départ ne vaut que pour le pays de départ
  const [paysInitial] = useState(pays)
  const initiale = pays === paysInitial ? valeurInitiale : ''
  const [texte, setTexte] = useState(pays === PAYS_PAR_DEFAUT ? '' : initiale)

  return (
    <>
      <label style={libelle}>
        Pays
        <select
          value={pays}
          onChange={(e) => {
            onPays(e.target.value)
            setTexte('')
            onCommune(null)
          }}
          autoComplete="country"
          style={champ}
        >
          {PAYS.map((p) => (
            <option key={p.code} value={p.code}>
              {p.nom}
            </option>
          ))}
        </select>
      </label>
      {pays === PAYS_PAR_DEFAUT ? (
        <ChampAdresse
          key={pays}
          variante="app"
          commune
          obligatoire
          libelleChamp="Ma commune"
          valeurInitiale={initiale}
          verifieeInitialement={verifieeInitialement && initiale !== ''}
          onChoix={(r) => onCommune(r?.libelle ?? null)}
        />
      ) : (
        <>
          <label style={libelle}>
            Ma commune
            <input
              type="text"
              value={texte}
              onChange={(e) => {
                setTexte(e.target.value)
                onCommune(e.target.value.trim() || null)
              }}
              placeholder="Nom de votre commune"
              autoComplete="address-level2"
              maxLength={80}
              style={champ}
            />
          </label>
          <span className="texte-doux" style={{ marginTop: -6 }}>
            Vigipop est pour l'instant utilisé par des communes françaises. Avec la localisation, l'app vous montre les services
            d'une ville Vigipop quand vous y êtes.
          </span>
        </>
      )}
    </>
  )
}
