import { useState } from 'react'
import ChampAdresse from './ChampAdresse.tsx'
import { useAppState, type Foyer } from '../state/AppState.tsx'

const vide: Foyer = { adresse: '', personnes: 1, vulnerable: false }

// « Mon foyer » : préparé en veille, il pré-remplit la demande d'aide en crise (adresse si le GPS
// ne répond pas, nombre de personnes, personne vulnérable). Reste sur le téléphone : la mairie ne le
// reçoit qu'avec une demande d'aide.
export default function MonFoyer() {
  const { utilisateur, modifierUtilisateur } = useAppState()
  const foyer = utilisateur?.foyer
  const [edition, setEdition] = useState(false)
  const [brouillon, setBrouillon] = useState<Foyer>(foyer ?? vide)
  // Adresse choisie dans la liste officielle (ou laissée vide)
  const [adresseVerifiee, setAdresseVerifiee] = useState(true)

  if (!utilisateur) return null

  const enregistrer = () => {
    modifierUtilisateur({ foyer: { ...brouillon, adresse: brouillon.adresse.trim() } })
    setEdition(false)
  }

  return (
    <section className="carte" aria-labelledby="titre-foyer" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <strong id="titre-foyer" style={{ fontSize: 16, color: 'var(--bleu-nuit)' }}>
        Mon foyer
      </strong>
      <span className="texte-doux" style={{ lineHeight: 1.4 }}>
        Préparé maintenant, il remplit votre demande d'aide en cas de crise. Il reste sur ce téléphone : la mairie ne le voit que si vous
        demandez de l'aide.
      </span>

      {!edition ? (
        <>
          {foyer ? (
            <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 15, lineHeight: 1.4 }}>
              <li>{foyer.adresse || 'Adresse non renseignée'}</li>
              <li>
                {foyer.personnes} personne{foyer.personnes > 1 ? 's' : ''} au foyer
                {foyer.vulnerable ? ', dont une personne âgée, handicapée ou un enfant en bas âge' : ''}
              </li>
            </ul>
          ) : null}
          <button
            type="button"
            className="bouton bouton--clair"
            onClick={() => {
              setBrouillon(foyer ?? vide)
              setAdresseVerifiee(true)
              setEdition(true)
            }}
          >
            {foyer ? 'Modifier mon foyer' : 'Préparer mon foyer'}
          </button>
        </>
      ) : (
        <>
          <ChampAdresse
            variante="app"
            libelleChamp="Adresse du domicile"
            valeurInitiale={brouillon.adresse}
            verifieeInitialement={!!brouillon.adresse}
            obligatoire
            onTexte={(adresse) => setBrouillon((b) => ({ ...b, adresse }))}
            onChoix={(r) => {
              setAdresseVerifiee(!!r)
              if (r) setBrouillon((b) => ({ ...b, adresse: r.libelle }))
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 15 }}>Personnes au foyer</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                type="button"
                className="bouton bouton--contour"
                aria-label="Retirer une personne"
                style={{ minHeight: 44, width: 44, padding: 0 }}
                onClick={() => setBrouillon((b) => ({ ...b, personnes: Math.max(1, b.personnes - 1) }))}
              >
                −
              </button>
              <span aria-live="polite" style={{ width: 32, textAlign: 'center', fontSize: 18, fontWeight: 800 }}>
                {brouillon.personnes}
              </span>
              <button
                type="button"
                className="bouton bouton--contour"
                aria-label="Ajouter une personne"
                style={{ minHeight: 44, width: 44, padding: 0 }}
                onClick={() => setBrouillon((b) => ({ ...b, personnes: Math.min(20, b.personnes + 1) }))}
              >
                +
              </button>
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, minHeight: 44 }}>
            <input
              type="checkbox"
              checked={brouillon.vulnerable}
              onChange={(e) => setBrouillon((b) => ({ ...b, vulnerable: e.target.checked }))}
              style={{ width: 20, height: 20, accentColor: 'var(--bleu)' }}
            />
            Dont une personne âgée, handicapée ou un enfant en bas âge
          </label>
          <button type="button" className="bouton bouton--principal" onClick={enregistrer} disabled={!adresseVerifiee && brouillon.adresse.trim() !== ''}>
            Enregistrer
          </button>
          <button type="button" className="bouton bouton--contour" onClick={() => setEdition(false)}>
            Annuler
          </button>
        </>
      )}
    </section>
  )
}
