import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import EnTeteRetour from '../components/EnTeteRetour.tsx'
import type { EtatCode } from '../outils/formulaire.ts'
import { useAppState } from '../state/AppState.tsx'
import { connexionSmsActive, envoyerCode, verifierCode } from '../services/codeSms.ts'

export default function Code() {
  const navigate = useNavigate()
  const { connecter, modifierUtilisateur, mode, visiteFaite } = useAppState()
  const etat = useLocation().state as EtatCode | null
  const [code, setCode] = useState('')
  const [renvoye, setRenvoye] = useState(false)
  const [verification, setVerification] = useState(false)
  const [erreur, setErreur] = useState('')

  if (!etat) return <Navigate to="/" replace />
  const { nouveauCompte, modification, suite: suiteDemandee, typeCode = 'sms', ...utilisateur } = etat

  const valide = /^\d{6}$/.test(code)

  const verifier = async (e: FormEvent) => {
    e.preventDefault()
    if (!valide || verification) return
    // Sans VITE_CONNEXION_SMS : démo, n'importe quel code à 6 chiffres est accepté
    setVerification(true)
    const probleme = await verifierCode(utilisateur.telephone, code, typeCode)
    setVerification(false)
    if (probleme) return setErreur(probleme)
    if (modification) {
      modifierUtilisateur(utilisateur)
      navigate('/profil/infos', { replace: true, state: { enregistre: true } })
      return
    }
    connecter(utilisateur, nouveauCompte)
    // Nouveau compte en veille : on explique d'abord pourquoi Vigipop compte, puis visite guidée.
    // En crise, la personne vient pour aider : on l'y emmène directement.
    const suite = suiteDemandee ?? (!nouveauCompte || visiteFaite ? '/accueil' : mode === 'crise' ? '/aider' : '/pourquoi/1')
    navigate(suite, { replace: true })
  }

  return (
    <div className="ecran">
      <EnTeteRetour retour={modification ? '/profil/infos' : nouveauCompte ? '/inscription' : '/connexion'}>
        <h1 style={{ fontSize: 21, fontWeight: 800, color: 'var(--bleu-nuit)' }}>Code de vérification</h1>
        <span className="texte-doux">Envoyé par SMS au {utilisateur.telephone}</span>
      </EnTeteRetour>

      <form onSubmit={(e) => void verifier(e)} className="contenu" style={{ paddingTop: 20, gap: 16 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, fontWeight: 700 }}>
          Code à 6 chiffres
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="••••••"
            autoFocus
            style={{ height: 64, border: '2px solid var(--bordure)', borderRadius: 14, textAlign: 'center', fontSize: 30, fontWeight: 800, letterSpacing: 12, background: 'var(--blanc)' }}
          />
        </label>

        {erreur && (
          <p role="alert" style={{ color: 'var(--danger)', fontSize: 14, fontWeight: 700 }}>
            {erreur}
          </p>
        )}
        {!connexionSmsActive && (
          <p style={{ fontSize: 13, color: 'var(--bleu-nuit)', background: 'var(--bleu-voile)', borderRadius: 12, padding: '10px 12px', lineHeight: 1.4 }}>
            <strong>Démo :</strong> aucun SMS n'est envoyé. Tapez n'importe quel code à 6 chiffres.
          </p>
        )}

        <button
          type="button"
          onClick={async () => {
            setErreur('')
            const resultat = await envoyerCode(utilisateur.telephone, nouveauCompte || !!modification)
            if ('erreur' in resultat) return setErreur(resultat.erreur)
            setRenvoye(true)
          }}
          disabled={renvoye} style={{ alignSelf: 'center', minHeight: 44, background: 'none', border: 'none', color: 'var(--bleu)', fontWeight: 700, fontSize: 15 }}>
          {renvoye ? 'Nouveau code envoyé' : "Je n'ai rien reçu, renvoyer le code"}
        </button>

        <div style={{ flex: 1 }} />
        <button type="submit" className="bouton bouton--principal" disabled={!valide || verification}>
          {verification ? 'Vérification…' : 'Valider'}
        </button>
      </form>
    </div>
  )
}
