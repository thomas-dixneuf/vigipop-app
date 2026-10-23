import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Logo from '../components/Logo.tsx'
import { commune as communeDemo } from '../data/fictif.ts'

const champ = {
  height: 52,
  border: '2px solid var(--bordure)',
  borderRadius: 12,
  padding: '0 14px',
  fontSize: 16,
  background: 'var(--blanc)',
} as const

const libelle = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 700 } as const

// Numéro mobile français : 06 / 07, ou +33 6 / +33 7
function numeroValide(numero: string) {
  return /^(?:0|\+33)[67]\d{8}$/.test(numero.replace(/[\s.-]/g, ''))
}

export default function Connexion() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [onglet, setOnglet] = useState<'inscription' | 'connexion'>(
    params.get('onglet') === 'connexion' ? 'connexion' : 'inscription',
  )
  const [prenom, setPrenom] = useState('')
  const [telephone, setTelephone] = useState('')
  const [commune, setCommune] = useState('')
  const [consentement, setConsentement] = useState(false)

  const inscription = onglet === 'inscription'
  const valide = numeroValide(telephone) && (!inscription || (prenom.trim() !== '' && consentement))

  const envoyer = (e: FormEvent) => {
    e.preventDefault()
    if (!valide) return
    navigate('/code', {
      state: { prenom: prenom.trim() || 'Camille', telephone, commune: commune.trim() || communeDemo },
    })
  }

  const styleOnglet = (actif: boolean) =>
    ({
      minHeight: 44,
      borderRadius: 10,
      border: 'none',
      fontSize: 15,
      fontWeight: 800,
      background: actif ? 'var(--blanc)' : 'transparent',
      color: actif ? 'var(--bleu-nuit)' : 'var(--texte-doux)',
      boxShadow: actif ? '0 1px 3px rgba(15,42,56,0.15)' : 'none',
    }) as const

  return (
    <div className="ecran" style={{ padding: '36px 20px 24px', gap: 18 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <Logo taille={64} />
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--bleu-nuit)' }}>Bienvenue sur Vigipop</h1>
      </div>

      <div role="tablist" aria-label="Choix" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 4, background: 'var(--bleu-voile)', borderRadius: 14, padding: 4 }}>
        <button type="button" role="tab" aria-selected={inscription} onClick={() => setOnglet('inscription')} style={styleOnglet(inscription)}>
          Créer un compte
        </button>
        <button type="button" role="tab" aria-selected={!inscription} onClick={() => setOnglet('connexion')} style={styleOnglet(!inscription)}>
          Se connecter
        </button>
      </div>

      <form onSubmit={envoyer} style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        {inscription && (
          <label style={libelle}>
            Prénom
            <input type="text" value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Camille" autoComplete="given-name" style={champ} />
          </label>
        )}
        <label style={libelle}>
          Numéro de mobile
          <input
            type="tel"
            inputMode="tel"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            placeholder="06 12 34 56 78"
            autoComplete="tel"
            aria-invalid={telephone !== '' && !numeroValide(telephone)}
            style={champ}
          />
          {telephone !== '' && !numeroValide(telephone) && (
            <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--danger)' }}>Entrez un numéro de mobile (06 ou 07).</span>
          )}
        </label>
        {inscription && (
          <>
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
          </>
        )}

        <div style={{ flex: 1 }} />
        <button type="submit" className="bouton bouton--principal" disabled={!valide}>
          {inscription ? 'Créer mon compte' : 'Recevoir mon code'}
        </button>
        <span className="texte-doux" style={{ textAlign: 'center' }}>
          Pas de mot de passe : un code à 6 chiffres vous est envoyé par SMS.
        </span>
      </form>
    </div>
  )
}
