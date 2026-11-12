import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import ChampAdresse from '../components/ChampAdresse.tsx'
import ChampTelephone from '../components/ChampTelephone.tsx'
import EnTeteRetour from '../components/EnTeteRetour.tsx'
import TexteLegal from '../components/TexteLegal.tsx'
import { conditions, confidentialite, enBrefConditions, enBrefConfidentialite } from '../data/textesLegaux.tsx'
import { champ, libelle, numeroValide, type EtatCode } from '../outils/formulaire.ts'
import { useAppState } from '../state/AppState.tsx'

const lienTexte = { background: 'none', border: 'none', padding: 0, minHeight: 44, color: 'var(--bleu)', fontSize: 13, fontWeight: 700, textDecoration: 'underline' } as const

export default function Inscription() {
  const navigate = useNavigate()
  const suite = (useLocation().state as { suite?: string } | null)?.suite
  // Ce qui a été saisi sans compte (demande d'aide) est repris
  const { contact } = useAppState()
  const [prenom, setPrenom] = useState(contact?.prenom ?? '')
  const [telephone, setTelephone] = useState(contact?.telephone ?? '')
  // Commune choisie dans la liste officielle (jamais un nom tapé au hasard)
  const [commune, setCommune] = useState<string | null>(null)
  // Texte ouvert par-dessus le formulaire, pour ne pas perdre ce qui est déjà saisi
  const [texte, setTexte] = useState<'conditions' | 'confidentialite' | null>(null)

  const valide = prenom.trim() !== '' && numeroValide(telephone) && commune !== null

  const envoyer = (e: FormEvent) => {
    e.preventDefault()
    if (!valide) return
    const etat: EtatCode = { prenom: prenom.trim(), telephone, commune: commune ?? '', nouveauCompte: true, suite }
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
          <input type="text" value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Prénom" autoComplete="given-name" style={champ} />
        </label>
        <ChampTelephone valeur={telephone} onChange={setTelephone} />
        <ChampAdresse variante="app" commune obligatoire libelleChamp="Ma commune" onChoix={(r) => setCommune(r?.libelle ?? null)} />
        {/* Information, pas consentement : la mairie traite ces données pour une mission d'intérêt public (RGPD 6.1.e) */}
        <p style={{ fontSize: 13, lineHeight: 1.4, color: 'var(--texte-doux)', margin: 0 }}>
          En créant votre compte, vous acceptez les conditions d'utilisation. Votre commune utilise votre prénom et votre numéro
          pour vous joindre en cas de crise ; vous pouvez les modifier ou supprimer votre compte à tout moment.
        </p>
        <span style={{ display: 'flex', gap: 16, marginTop: -8 }}>
          <button type="button" onClick={() => setTexte('conditions')} style={lienTexte}>
            Conditions d'utilisation
          </button>
          <button type="button" onClick={() => setTexte('confidentialite')} style={lienTexte}>
            Vos données
          </button>
        </span>

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

      {texte && (
        <div role="dialog" aria-modal="true" aria-label={texte === 'conditions' ? "Conditions d'utilisation" : 'Vos données'} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'var(--fond)', overflowY: 'auto' }}>
          <div className="ecran" style={{ minHeight: '100%' }}>
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '20px 20px 8px' }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--bleu-nuit)' }}>{texte === 'conditions' ? "Conditions d'utilisation" : 'Vos données'}</h1>
              <button type="button" className="bouton bouton--contour" onClick={() => setTexte(null)} style={{ minHeight: 44, width: 'auto', padding: '0 16px', fontSize: 15 }}>
                Fermer
              </button>
            </header>
            <main className="contenu" style={{ paddingTop: 8 }}>
              {texte === 'conditions' ? (
                <TexteLegal enBref={enBrefConditions} paragraphes={conditions} />
              ) : (
                <TexteLegal enBref={enBrefConfidentialite} paragraphes={confidentialite} />
              )}
            </main>
          </div>
        </div>
      )}
    </div>
  )
}
