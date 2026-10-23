import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import ChampTelephone from '../components/ChampTelephone.tsx'
import EnTeteRetour from '../components/EnTeteRetour.tsx'
import { commune as communeDemo } from '../data/fictif.ts'
import { champ, libelle, numeroValide, type EtatCode } from '../outils/formulaire.ts'
import { useAppState } from '../state/AppState.tsx'

export default function Inscription() {
  const navigate = useNavigate()
  const suite = (useLocation().state as { suite?: string } | null)?.suite
  // Ce qui a été saisi sans compte (demande d'aide) est repris
  const { contact } = useAppState()
  const [prenom, setPrenom] = useState(contact?.prenom ?? '')
  const [telephone, setTelephone] = useState(contact?.telephone ?? '')
  const [commune, setCommune] = useState('')
  const [consentement, setConsentement] = useState(false)

  const valide = prenom.trim() !== '' && numeroValide(telephone) && consentement

  const envoyer = (e: FormEvent) => {
    e.preventDefault()
    if (!valide) return
    const etat: EtatCode = { prenom: prenom.trim(), telephone, commune: commune.trim() || communeDemo, nouveauCompte: true, suite }
    navigate('/code', { state: etat })
  }

  return (
    <div className="ecran">
      <EnTeteRetour retour="/">
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--bleu-nuit)' }}>Créer mon compte</h1>
        <span className="texte-doux">1 minute · sans mot de passe</span>
      </EnTeteRetour>

      <form onSubmit={envoyer} className="contenu" style={{ paddingTop: 16 }}>
        {contact && (
          <p role="status" style={{ background: 'var(--bleu-voile)', color: 'var(--bleu-nuit)', borderRadius: 12, padding: '10px 14px', fontSize: 14, lineHeight: 1.4 }}>
            Nous avons repris les informations de votre demande d'aide. Vérifiez-les et complétez.
          </p>
        )}
        <label style={libelle}>
          Prénom
          <input type="text" value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Camille" autoComplete="given-name" style={champ} />
        </label>
        <ChampTelephone valeur={telephone} onChange={setTelephone} />
        <label style={libelle}>
          Ma commune
          <input type="text" value={commune} onChange={(e) => setCommune(e.target.value)} placeholder={communeDemo} autoComplete="address-level2" style={champ} />
        </label>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, lineHeight: 1.4, color: 'var(--texte-doux)' }}>
          <input
            type="checkbox"
            checked={consentement}
            onChange={(e) => setConsentement(e.target.checked)}
            style={{ width: 20, height: 20, margin: 0, accentColor: 'var(--bleu)', flexShrink: 0 }}
          />
          J'accepte que ma commune utilise ces informations pour me contacter en cas de crise.
        </label>

        <div style={{ flex: 1 }} />
        <button type="submit" className="bouton bouton--principal" disabled={!valide}>
          Recevoir mon code
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
