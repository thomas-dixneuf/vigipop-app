import { Link } from 'react-router-dom'
import Bandeau112 from '../components/Bandeau112.tsx'
import BarreNav from '../components/BarreNav.tsx'
import BoutonDemo from '../components/BoutonDemo.tsx'
import EnTete from '../components/EnTete.tsx'
import HebergementTrouve from '../components/HebergementTrouve.tsx'
import Icone from '../components/Icone.tsx'
import PropositionHebergement from '../components/PropositionHebergement.tsx'
import { libelleLieu, lieuxDemo } from '../data/fictif.ts'
import { serveur } from '../services/serveur.ts'
import { useAppState } from '../state/AppState.tsx'

const libelleStatut = {
  transmise: 'Transmise · en attente de prise en charge',
  prise_en_charge: 'Prise en charge par la mairie',
  aide_organisee: 'Aide organisée',
  close: 'Demande close',
} as const

const grosBouton = {
  textDecoration: 'none',
  borderRadius: 20,
  padding: '16px 18px',
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  minHeight: 80,
} as const

const pastille = {
  width: 48,
  height: 48,
  borderRadius: 24,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
} as const

export default function AccueilCrise() {
  const { demande, enSecurite, declarerEnSecurite, disponible, mission, missionServeur, alerte, lieux } = useAppState()
  const ouverts = (lieux ?? lieuxDemo).filter((l) => l.ouvert)

  return (
    <div className="ecran">
      <EnTete nonLues={3} />
      <main className="contenu" style={{ gap: 12 }}>
        <section role="alert" style={{ background: 'var(--bleu-nuit)', color: 'var(--blanc)', borderRadius: 16, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 800, color: 'var(--consigne)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
              <Icone nom="alerte" taille={16} epaisseur={2.4} />
              Mode crise activé
            </span>
            <span style={{ fontSize: 12, color: 'var(--bleu-clair)' }}>Mairie · {alerte?.heure}</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.25 }}>{alerte?.titre}</div>
          <div style={{ fontSize: 14, lineHeight: 1.4, color: 'var(--bleu-voile)' }}>
            <strong style={{ color: 'var(--consigne)' }}>Consigne :</strong> {alerte?.consigne}
          </div>
        </section>

        <PropositionHebergement />

        {demande && (
          <Link to="/demande" className="carte" style={{ textDecoration: 'none', color: 'var(--texte)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderColor: 'var(--bleu)', borderWidth: 2 }}>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <strong style={{ color: 'var(--bleu-nuit)' }}>Ma demande {demande.reference}</strong>
              <span className="texte-doux">{demande.envoyee ? libelleStatut[demande.statut] : 'En attente de réseau'}</span>
            </span>
            <Icone nom="fleche" taille={20} />
          </Link>
        )}
        {demande?.envoyee && <HebergementTrouve demande={demande.id} />}
        {!demande && (
          <h1 style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 800, lineHeight: 1.2, color: 'var(--bleu-nuit)' }}>
            {enSecurite ? 'Merci, vous êtes en sécurité.' : 'Êtes-vous en sécurité ?'}
          </h1>
        )}

        <Link to="/signaler" style={{ ...grosBouton, background: 'var(--urgence)', color: 'var(--blanc)' }}>
          <span style={{ ...pastille, background: 'var(--urgence-fonce)' }}>
            <Icone nom="sos" taille={24} />
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 20, fontWeight: 800 }}>J'ai besoin d'aide</span>
            <span style={{ fontSize: 14, color: 'var(--urgence-pale)' }}>Signaler ma situation en 30 secondes</span>
          </span>
        </Link>

        <Link to={disponible ? '/mission' : '/aider'} style={{ ...grosBouton, background: 'var(--bleu-clair)', color: 'var(--bleu-nuit)' }}>
          <span style={{ ...pastille, background: 'var(--blanc)', color: 'var(--bleu)' }}>
            <Icone nom="main" taille={24} />
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 20, fontWeight: 800 }}>{mission === 'acceptee' ? 'Ma mission' : 'Je veux aider'}</span>
            <span style={{ fontSize: 14, color: '#1b4a60' }}>
              {mission === 'acceptee'
                ? 'Acceptée · voir le rendez-vous'
                : disponible
                  ? missionServeur || !serveur
                    ? 'Une mission vous est proposée'
                    : 'Disponible · en attente d’une mission'
                  : 'Me rendre disponible pour une mission'}
            </span>
          </span>
        </Link>

        {!demande && (
          <button
            type="button"
            className="bouton bouton--contour"
            style={{ minHeight: 52, fontSize: 16 }}
            onClick={declarerEnSecurite}
            disabled={enSecurite}
          >
            <Icone nom="valide" taille={20} epaisseur={2.6} />
            {enSecurite ? 'Signalé à la mairie' : 'Je suis en sécurité'}
          </button>
        )}

        <Bandeau112 />

        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 className="titre-section">Ouvert maintenant</h2>
          <div style={{ display: 'flex', gap: 10 }}>
            {ouverts.length === 0 && <p className="texte-doux">Aucun lieu ouvert pour l'instant.</p>}
            {ouverts.slice(0, 2).map((o) => (
              <Link key={o.id} to="/carte" className="carte" style={{ textDecoration: 'none', color: 'var(--texte)', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{libelleLieu[o.type]}</span>
                <span className="texte-doux">{o.nom} · {o.distance}</span>
              </Link>
            ))}
          </div>
        </section>

        <BoutonDemo />
      </main>
      <BarreNav />
    </div>
  )
}
