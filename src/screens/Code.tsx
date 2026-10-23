import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import EnTeteRetour from '../components/EnTeteRetour.tsx'
import type { EtatCode } from '../outils/formulaire.ts'
import { useAppState } from '../state/AppState.tsx'

export default function Code() {
  const navigate = useNavigate()
  const { connecter, mode } = useAppState()
  const etat = useLocation().state as EtatCode | null
  const [code, setCode] = useState('')
  const [renvoye, setRenvoye] = useState(false)

  if (!etat) return <Navigate to="/" replace />
  const { nouveauCompte, suite: suiteDemandee, ...utilisateur } = etat

  const valide = /^\d{6}$/.test(code)

  const verifier = (e: FormEvent) => {
    e.preventDefault()
    if (!valide) return
    // Prototype : aucun SMS n'est envoyé, n'importe quel code à 6 chiffres est accepté
    connecter(utilisateur, nouveauCompte)
    // Nouveau compte en veille : on explique d'abord pourquoi Vigipop compte, puis visite guidée.
    // En crise, la personne vient pour aider : on l'y emmène directement.
    const suite = suiteDemandee ?? (!nouveauCompte ? '/accueil' : mode === 'crise' ? '/aider' : '/pourquoi/1')
    navigate(suite, { replace: true })
  }

  return (
    <div className="ecran">
      <EnTeteRetour retour={nouveauCompte ? '/inscription' : '/connexion'}>
        <h1 style={{ fontSize: 21, fontWeight: 800, color: 'var(--bleu-nuit)' }}>Code de vérification</h1>
        <span className="texte-doux">Envoyé par SMS au {utilisateur.telephone}</span>
      </EnTeteRetour>

      <form onSubmit={verifier} className="contenu" style={{ paddingTop: 20, gap: 16 }}>
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

        <p style={{ fontSize: 13, color: 'var(--bleu-nuit)', background: 'var(--bleu-voile)', borderRadius: 12, padding: '10px 12px', lineHeight: 1.4 }}>
          <strong>Démo :</strong> aucun SMS n'est envoyé. Tapez n'importe quel code à 6 chiffres.
        </p>

        <button type="button" onClick={() => setRenvoye(true)} disabled={renvoye} style={{ alignSelf: 'center', minHeight: 44, background: 'none', border: 'none', color: 'var(--bleu)', fontWeight: 700, fontSize: 15 }}>
          {renvoye ? 'Nouveau code envoyé' : "Je n'ai rien reçu, renvoyer le code"}
        </button>

        <div style={{ flex: 1 }} />
        <button type="submit" className="bouton bouton--principal" disabled={!valide}>
          Valider
        </button>
      </form>
    </div>
  )
}
