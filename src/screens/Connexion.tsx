import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ChampEmail from '../components/ChampEmail.tsx'
import ChampPaysCommune from '../components/ChampPaysCommune.tsx'
import ChampTelephone from '../components/ChampTelephone.tsx'
import EnTeteRetour from '../components/EnTeteRetour.tsx'
import Logo from '../components/Logo.tsx'
import { numeroValide, type EtatCode } from '../outils/formulaire.ts'
import { useAppState } from '../state/AppState.tsx'
import { emailValide, envoyerCode, moyenCode, parSms } from '../services/codeConnexion.ts'

export default function Connexion() {
  const navigate = useNavigate()
  const { dernierUtilisateur: compte } = useAppState()
  const [email, setEmail] = useState(compte?.email ?? '')
  const [telephone, setTelephone] = useState(compte?.telephone ?? '')
  // Commune choisie dans la liste officielle : l'app affiche ensuite ses services, si elle utilise Vigipop
  const [pays, setPays] = useState(compte?.pays ?? 'FR')
  const [commune, setCommune] = useState<string | null>(compte?.commune || null)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')

  const valide = (parSms ? numeroValide(telephone, pays) : emailValide(email)) && commune !== null

  const envoyer = async (e: FormEvent) => {
    e.preventDefault()
    if (!valide || envoi) return
    setEnvoi(true)
    setErreur('')
    const resultat = await envoyerCode(parSms ? telephone : email, false)
    setEnvoi(false)
    if ('erreur' in resultat) return setErreur(resultat.erreur)
    // En vrai, le prénom et la commune viendront du serveur ; ici on reprend ceux du téléphone, et la commune choisie
    const adresse = email.trim().toLowerCase()
    const memeCompte =
      compte && (parSms ? compte.telephone.replace(/\D/g, '') === telephone.replace(/\D/g, '') : compte.email === adresse)
    const etat: EtatCode = {
      prenom: memeCompte ? compte.prenom : '',
      nom: memeCompte ? compte.nom : undefined,
      email: parSms ? (memeCompte ? (compte.email ?? '') : '') : adresse,
      telephone: parSms ? telephone : memeCompte ? compte.telephone : '',
      commune: commune ?? '',
      pays,
      nouveauCompte: false,
      typeCode: resultat.type,
    }
    navigate('/code', { state: etat })
  }

  return (
    <div className="ecran">
      <EnTeteRetour retour="/">
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--bleu-nuit)' }}>Se connecter</h1>
        <span className="texte-doux">Content de vous revoir</span>
      </EnTeteRetour>

      <form onSubmit={(e) => void envoyer(e)} className="contenu" style={{ paddingTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
          <Logo taille={80} />
        </div>
        {parSms ? <ChampTelephone valeur={telephone} onChange={setTelephone} pays={pays} /> : <ChampEmail valeur={email} onChange={setEmail} />}
        <ChampPaysCommune
          pays={pays}
          onPays={setPays}
          valeurInitiale={compte?.commune ?? ''}
          verifieeInitialement={!!compte?.commune}
          onCommune={setCommune}
        />

        {erreur && (
          <p role="alert" style={{ color: 'var(--danger)', fontSize: 14, fontWeight: 700 }}>
            {erreur}
          </p>
        )}
        <div style={{ flex: 1 }} />
        <button type="submit" className="bouton bouton--principal" disabled={!valide || envoi}>
          {envoi ? 'Envoi du code…' : 'Recevoir mon code'}
        </button>
        <span className="texte-doux" style={{ textAlign: 'center' }}>
          Vous recevrez un code à 6 chiffres {moyenCode}.
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
