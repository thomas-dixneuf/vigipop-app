import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icone from '../components/Icone.tsx'
import { besoins, commune, situations, type BesoinId, type SituationId } from '../data/fictif.ts'
import { useAppState } from '../state/AppState.tsx'

type Position =
  | { etat: 'recherche' }
  | { etat: 'trouvee'; texte: string; precision: number }
  | { etat: 'indisponible' }

function heureActuelle() {
  return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function nouvelleReference() {
  return `VG-${Math.floor(1000 + Math.random() * 9000)}`
}

export default function Signaler() {
  const navigate = useNavigate()
  const { demande, enregistrerDemande } = useAppState()

  // « Ma situation a changé » : on repart de la demande précédente
  const [situation, setSituation] = useState<SituationId | null>(demande?.situation ?? null)
  const [choix, setChoix] = useState<BesoinId[]>(demande?.besoins ?? [])
  const [personnes, setPersonnes] = useState(demande?.personnes ?? 1)
  const [vulnerable, setVulnerable] = useState(demande?.personneVulnerable ?? false)
  const [position, setPosition] = useState<Position>(() =>
    'geolocation' in navigator ? { etat: 'recherche' } : { etat: 'indisponible' },
  )
  const [adresseSaisie, setAdresseSaisie] = useState('')

  useEffect(() => {
    if (!('geolocation' in navigator)) return
    navigator.geolocation.getCurrentPosition(
      (p) =>
        setPosition({
          etat: 'trouvee',
          texte: `${p.coords.latitude.toFixed(5)}, ${p.coords.longitude.toFixed(5)}`,
          precision: Math.round(p.coords.accuracy),
        }),
      () => setPosition({ etat: 'indisponible' }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }, [])

  const basculerBesoin = (id: BesoinId) =>
    setChoix((liste) => (liste.includes(id) ? liste.filter((b) => b !== id) : [...liste, id]))

  const positionTexte =
    position.etat === 'trouvee' ? position.texte : adresseSaisie.trim() || null
  // La position est le minimum vital pour que la mairie puisse intervenir
  const peutEnvoyer = situation !== null && positionTexte !== null

  const envoyer = () => {
    if (!peutEnvoyer) return
    enregistrerDemande({
      reference: demande?.reference ?? nouvelleReference(),
      situation,
      besoins: choix,
      personnes,
      personneVulnerable: vulnerable,
      position: positionTexte,
      envoyeeA: heureActuelle(),
      envoyee: navigator.onLine,
    })
    navigate('/demande', { replace: true })
  }

  return (
    <div className="ecran">
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 8px' }}>
        <Link
          to="/accueil"
          aria-label="Retour"
          style={{ width: 44, height: 44, borderRadius: 22, background: 'var(--blanc)', border: '1px solid var(--bordure)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bleu)' }}
        >
          <Icone nom="retour" taille={20} epaisseur={2.4} />
        </Link>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h1 style={{ fontSize: 21, fontWeight: 800, color: 'var(--bleu-nuit)' }}>J'ai besoin d'aide</h1>
          <span className="texte-doux">3 questions · transmis à la cellule de crise de {commune}</span>
        </div>
      </header>

      <main className="contenu" style={{ gap: 18, paddingTop: 10 }}>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--bleu-nuit)' }}>1. Ma situation</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            {situations.map((s) => (
              <button key={s.id} type="button" className="puce" aria-pressed={situation === s.id} onClick={() => setSituation(s.id)}>
                {s.label}
              </button>
            ))}
          </div>
          {situation === 'blesse' && (
            <a
              href="tel:112"
              style={{ textDecoration: 'none', background: 'var(--danger)', color: 'var(--blanc)', borderRadius: 12, padding: '12px', fontSize: 15, fontWeight: 700 }}
            >
              Personne blessée : appelez d'abord le 112 →
            </a>
          )}
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--bleu-nuit)' }}>2. Ma position</h2>
          <div className="carte" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: 'var(--bleu)' }}>
              <Icone nom="pin" taille={28} />
            </span>
            {position.etat === 'recherche' && <span style={{ fontSize: 14 }}>Recherche de votre position…</span>}
            {position.etat === 'trouvee' && (
              <span style={{ fontSize: 14, lineHeight: 1.35 }}>
                <strong>Position GPS trouvée</strong>
                <br />
                <span className="texte-doux">
                  {position.texte} · précision {position.precision} m
                </span>
              </span>
            )}
            {position.etat === 'indisponible' && (
              <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 700 }}>
                GPS indisponible : indiquez votre adresse
                <input
                  type="text"
                  value={adresseSaisie}
                  onChange={(e) => setAdresseSaisie(e.target.value)}
                  placeholder="12 rue des Lilas"
                  autoComplete="street-address"
                  style={{ height: 48, border: '2px solid var(--bordure)', borderRadius: 12, padding: '0 12px', fontSize: 16 }}
                />
              </label>
            )}
          </div>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--bleu-nuit)' }}>
            3. Mes besoins <span style={{ fontWeight: 400, color: 'var(--texte-doux)', fontSize: 13 }}>(plusieurs choix)</span>
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {besoins.map((b) => (
              <button key={b.id} type="button" className="puce" aria-pressed={choix.includes(b.id)} onClick={() => basculerBesoin(b.id)}>
                {b.label}
              </button>
            ))}
          </div>
          <div className="carte" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 6px 6px 14px', marginTop: 4 }}>
            <span style={{ fontSize: 15 }}>Personnes avec moi (moi compris)</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button type="button" aria-label="Retirer une personne" onClick={() => setPersonnes((n) => Math.max(1, n - 1))} style={compteur}>
                −
              </button>
              <span aria-live="polite" style={{ width: 32, textAlign: 'center', fontSize: 18, fontWeight: 800 }}>
                {personnes}
              </span>
              <button type="button" aria-label="Ajouter une personne" onClick={() => setPersonnes((n) => Math.min(20, n + 1))} style={compteur}>
                +
              </button>
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, minHeight: 44 }}>
            <input type="checkbox" checked={vulnerable} onChange={(e) => setVulnerable(e.target.checked)} style={{ width: 20, height: 20, accentColor: 'var(--bleu)' }} />
            Dont une personne âgée, handicapée ou un enfant en bas âge
          </label>
        </section>
      </main>

      <footer style={{ position: 'sticky', bottom: 0, padding: '12px 20px calc(18px + env(safe-area-inset-bottom))', background: 'var(--blanc)', borderTop: '1px solid var(--bordure)', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button type="button" className="bouton bouton--urgence" style={{ fontSize: 18 }} onClick={envoyer} disabled={!peutEnvoyer}>
          Envoyer ma demande
        </button>
        <span className="texte-doux" style={{ fontSize: 12, textAlign: 'center' }}>
          {situation === null
            ? 'Choisissez votre situation pour envoyer.'
            : positionTexte === null && position.etat !== 'recherche'
              ? 'Indiquez votre adresse pour envoyer.'
              : 'Pas de réseau ? La demande partira dès que possible.'}
        </span>
      </footer>
    </div>
  )
}

const compteur = {
  width: 44,
  height: 44,
  borderRadius: 10,
  border: 'none',
  background: 'var(--bleu-voile)',
  color: 'var(--bleu-nuit)',
  fontSize: 22,
} as const
