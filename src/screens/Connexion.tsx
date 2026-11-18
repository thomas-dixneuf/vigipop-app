import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ChampAdresse from '../components/ChampAdresse.tsx'
import ChampTelephone from '../components/ChampTelephone.tsx'
import EnTeteRetour from '../components/EnTeteRetour.tsx'
import Logo from '../components/Logo.tsx'
import { numeroValide, type EtatCode } from '../outils/formulaire.ts'
import { useAppState } from '../state/AppState.tsx'

export default function Connexion() {
  const navigate = useNavigate()
  const { dernierUtilisateur: compte } = useAppState()
  const [telephone, setTelephone] = useState(compte?.telephone ?? '')
  // Commune choisie dans la liste officielle : l'app affiche ensuite ses services, si elle utilise Vigipop
  const [commune, setCommune] = useState<string | null>(compte?.commune || null)

  const valide = numeroValide(telephone) && commune !== null

  const envoyer = (e: FormEvent) => {
    e.preventDefault()
    if (!valide) return
    // En vrai, le prénom et la commune viendront du serveur ; ici on reprend ceux du téléphone, et la commune choisie
    const memeCompte = compte && compte.telephone.replace(/\D/g, '') === telephone.replace(/\D/g, '')
    const etat: EtatCode = {
      prenom: memeCompte ? compte.prenom : '',
      nom: memeCompte ? compte.nom : undefined,
      telephone,
      commune: commune ?? '',
      nouveauCompte: false,
    }
    navigate('/code', { state: etat })
  }

  return (
    <div className="ecran">
      <EnTeteRetour retour="/">
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--bleu-nuit)' }}>Se connecter</h1>
        <span className="texte-doux">Content de vous revoir</span>
      </EnTeteRetour>

      <form onSubmit={envoyer} className="contenu" style={{ paddingTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
          <Logo taille={80} />
        </div>
        <ChampTelephone valeur={telephone} onChange={setTelephone} />
        <ChampAdresse
          variante="app"
          commune
          obligatoire
          libelleChamp="Ma commune"
          valeurInitiale={compte?.commune ?? ''}
          verifieeInitialement={!!compte?.commune}
          onChoix={(r) => setCommune(r?.libelle ?? null)}
        />

        <div style={{ flex: 1 }} />
        <button type="submit" className="bouton bouton--principal" disabled={!valide}>
          Recevoir mon code
        </button>
        <span className="texte-doux" style={{ textAlign: 'center' }}>
          Vous recevrez un code à 6 chiffres par SMS.
        </span>
        <p style={{ textAlign: 'center', fontSize: 15 }}>
          Pas encore de compte ?{' '}
          <Link to="/inscription" style={{ fontWeight: 800 }}>
            Créer un compte
          </Link>
        </p>
      </form>
    </div>
  )
}
