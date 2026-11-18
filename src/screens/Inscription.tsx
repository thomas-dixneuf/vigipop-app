import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import ChampAdresse from '../components/ChampAdresse.tsx'
import ChampTelephone from '../components/ChampTelephone.tsx'
import EnTeteRetour from '../components/EnTeteRetour.tsx'
import { champ, libelle, numeroValide, type EtatCode } from '../outils/formulaire.ts'
import { useAppState } from '../state/AppState.tsx'
import { envoyerCode } from '../services/codeSms.ts'

export default function Inscription() {
  const navigate = useNavigate()
  const etatNav = useLocation().state as { suite?: string; compteEfface?: boolean } | null
  const suite = etatNav?.suite
  // Ce qui a été saisi sans compte (demande d'aide) est repris
  const { contact } = useAppState()
  const [prenom, setPrenom] = useState(contact?.prenom ?? '')
  const [telephone, setTelephone] = useState(contact?.telephone ?? '')
  // Commune choisie dans la liste officielle (jamais un nom tapé au hasard)
  const [commune, setCommune] = useState<string | null>(null)
  const [consentement, setConsentement] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')

  const valide = prenom.trim() !== '' && numeroValide(telephone) && commune !== null && consentement

  const envoyer = async (e: FormEvent) => {
    e.preventDefault()
    if (!valide || envoi) return
    setEnvoi(true)
    setErreur('')
    // Le numéro est rattaché à la session de ce téléphone : le compte garde la demande déjà envoyée
    const resultat = await envoyerCode(telephone, true)
    setEnvoi(false)
    if ('erreur' in resultat) return setErreur(resultat.erreur)
    const etat: EtatCode = { prenom: prenom.trim(), telephone, commune: commune ?? '', nouveauCompte: true, suite, typeCode: resultat.type }
    navigate('/code', { state: etat })
  }

  return (
    <div className="ecran">
      <EnTeteRetour retour="/">
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--bleu-nuit)' }}>Créer mon compte</h1>
        <span className="texte-doux">1 minute · sans mot de passe</span>
      </EnTeteRetour>

      <form onSubmit={(e) => void envoyer(e)} className="contenu" style={{ paddingTop: 16 }}>
        {contact && (
          <p role="status" style={{ background: 'var(--bleu-voile)', color: 'var(--bleu-nuit)', borderRadius: 12, padding: '10px 14px', fontSize: 14, lineHeight: 1.4 }}>
            {etatNav?.compteEfface
              ? 'Nous avons repris votre prénom et votre numéro. Vérifiez-les et complétez.'
              : "Nous avons repris les informations de votre demande d'aide. Vérifiez-les et complétez."}
          </p>
        )}
        <label style={libelle}>
          Prénom
          <input type="text" value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Prénom" autoComplete="given-name" style={champ} />
        </label>
        <ChampTelephone valeur={telephone} onChange={setTelephone} />
        <ChampAdresse variante="app" commune obligatoire libelleChamp="Ma commune" onChoix={(r) => setCommune(r?.libelle ?? null)} />
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, lineHeight: 1.4, color: 'var(--texte-doux)' }}>
          <input
            type="checkbox"
            checked={consentement}
            onChange={(e) => setConsentement(e.target.checked)}
            style={{ width: 20, height: 20, margin: 0, accentColor: 'var(--bleu)', flexShrink: 0 }}
          />
          J'accepte que ma commune utilise ces informations pour me contacter en cas de crise.
        </label>

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
          Pas de mot de passe : un code à 6 chiffres vous est envoyé par SMS.
        </span>
        <p style={{ textAlign: 'center', fontSize: 15 }}>
          Déjà un compte ?{' '}
          <Link to="/connexion" style={{ fontWeight: 800 }}>
            Se connecter
          </Link>
        </p>
      </form>
    </div>
  )
}
