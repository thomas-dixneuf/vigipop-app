import { useNavigate } from 'react-router-dom'
import EnTeteRetour from '../components/EnTeteRetour.tsx'
import Icone from '../components/Icone.tsx'
import { commune, ressources } from '../data/fictif.ts'
import { useAppState } from '../state/AppState.tsx'

export default function Aider() {
  const navigate = useNavigate()
  const { mode, ressources: actives, basculerRessource, seRendreDisponible } = useAppState()
  const enCrise = mode === 'crise'

  const valider = () => {
    if (enCrise) {
      seRendreDisponible()
      navigate('/mission')
    } else {
      navigate('/accueil')
    }
  }

  return (
    <div className="ecran">
      <EnTeteRetour retour="/accueil">
        <h1 style={{ fontSize: 21, fontWeight: 800, color: 'var(--bleu-nuit)' }}>Ce que je peux offrir</h1>
        <span className="texte-doux">Mobilisé uniquement si la mairie vous sollicite</span>
      </EnTeteRetour>

      <main className="contenu" style={{ paddingTop: 10 }}>
        <section aria-label="Mes ressources" className="carte" style={{ padding: 0, borderRadius: 16 }}>
          {ressources.map((r, i) => {
            const active = actives.includes(r.id)
            return (
              <div
                key={r.id}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 16px', borderBottom: i < ressources.length - 1 ? '1px solid var(--bleu-voile)' : 'none' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{r.label}</span>
                  <span className="texte-doux">{r.detail}</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={active}
                  aria-label={r.label}
                  onClick={() => basculerRessource(r.id)}
                  style={{ flexShrink: 0, width: 52, height: 32, borderRadius: 16, border: 'none', padding: 3, display: 'flex', justifyContent: active ? 'flex-end' : 'flex-start', background: active ? 'var(--bleu)' : '#a9bcc5' }}
                >
                  <span style={{ width: 26, height: 26, borderRadius: 13, background: 'var(--blanc)', display: 'block' }} />
                </button>
              </div>
            )
          })}
        </section>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px', color: 'var(--bleu)' }}>
          <Icone nom="bouclier" taille={20} epaisseur={2} />
          <span style={{ fontSize: 14, color: 'var(--bleu-nuit)' }}>Profil vérifié par la mairie de {commune}</span>
        </div>
      </main>

      <footer style={{ position: 'sticky', bottom: 0, padding: '12px 20px calc(18px + env(safe-area-inset-bottom))', background: 'var(--blanc)', borderTop: '1px solid var(--bordure)', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button type="button" className="bouton bouton--principal" style={{ fontSize: 18 }} onClick={valider} disabled={actives.length === 0}>
          {enCrise ? 'Je suis disponible maintenant' : 'Enregistrer mes offres'}
        </button>
        <span className="texte-doux" style={{ fontSize: 12, textAlign: 'center' }}>
          Votre adresse n'est visible que par les coordinateurs.
        </span>
      </footer>
    </div>
  )
}
