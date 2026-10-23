import { useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import Icone from '../components/Icone.tsx'
import { besoins, centreLePlusProche, commune, situations } from '../data/fictif.ts'
import { useAppState } from '../state/AppState.tsx'

export default function Confirmation() {
  const { demande, marquerEnvoyee } = useAppState()

  // Envoi différé : la demande part dès que le téléphone retrouve du réseau
  useEffect(() => {
    if (!demande || demande.envoyee) return
    window.addEventListener('online', marquerEnvoyee)
    return () => window.removeEventListener('online', marquerEnvoyee)
  }, [demande, marquerEnvoyee])

  if (!demande) return <Navigate to="/accueil" replace />

  const situation = situations.find((s) => s.id === demande.situation)?.label
  const listeBesoins = besoins.filter((b) => demande.besoins.includes(b.id)).map((b) => b.label)

  const partager = async () => {
    const texte = `Je suis en contact avec la cellule de crise de ${commune} via Vigipop (réf. ${demande.reference}). Situation : ${situation}.`
    try {
      if (navigator.share) await navigator.share({ title: 'Vigipop', text: texte })
      else window.location.href = `sms:?&body=${encodeURIComponent(texte)}`
    } catch {
      // Partage annulé par l'utilisateur
    }
  }

  return (
    <div className="ecran">
      <header style={{ background: demande.envoyee ? 'var(--bleu)' : 'var(--bleu-nuit)', color: 'var(--blanc)', padding: '28px 20px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span style={{ width: 52, height: 52, borderRadius: 26, background: 'var(--bleu-nuit)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cyan)' }}>
          <Icone nom={demande.envoyee ? 'valide' : 'alerte'} taille={28} epaisseur={2.8} />
        </span>
        <h1 style={{ fontSize: 25, fontWeight: 800, lineHeight: 1.15 }} aria-live="polite">
          {demande.envoyee ? 'Demande transmise' : 'Demande enregistrée'}
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.45, color: 'var(--bleu-voile)' }}>
          {demande.envoyee
            ? `Reçue par la cellule de crise de ${commune} à ${demande.envoyeeA}. Restez joignable sur ce téléphone.`
            : "Pas de réseau pour l'instant. Elle partira automatiquement dès que le téléphone en retrouve."}
        </p>
      </header>

      <main className="contenu" style={{ paddingTop: 18 }}>
        <section aria-label="Suivi de la demande" className="carte" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="texte-doux" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Suivi de ma demande</span>
            <span>Réf. {demande.reference}</span>
          </div>
          <Etape etat={demande.envoyee ? 'fait' : 'en-cours'} titre="Transmise" detail={demande.envoyee ? demande.envoyeeA : 'en attente de réseau'} />
          <Etape etat={demande.envoyee ? 'en-cours' : 'a-venir'} titre="Prise en charge" detail={demande.envoyee ? 'en cours' : undefined} />
          <Etape etat="a-venir" titre="Aide organisée" />
          <p className="texte-doux" style={{ borderTop: '1px solid var(--bordure)', paddingTop: 10, lineHeight: 1.4 }}>
            {situation} · {demande.personnes} personne{demande.personnes > 1 ? 's' : ''}
            {demande.personneVulnerable ? ' dont une vulnérable' : ''}
            {listeBesoins.length ? ` · ${listeBesoins.join(', ')}` : ''}
          </p>
        </section>

        <section className="carte" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span className="texte-doux">Centre d'accueil le plus proche</span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--bleu-nuit)' }}>{centreLePlusProche.nom}</span>
              <span style={{ fontSize: 14, color: 'var(--texte-doux)' }}>{centreLePlusProche.details}</span>
            </div>
            <span style={{ background: 'var(--bleu-voile)', color: 'var(--bleu-nuit)', borderRadius: 8, padding: '4px 8px', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>
              {centreLePlusProche.places}
            </span>
          </div>
          <Link to="/carte" className="bouton bouton--clair" style={{ minHeight: 48, fontSize: 16 }}>
            Itinéraire
          </Link>
        </section>

        <button type="button" className="bouton bouton--principal" onClick={partager}>
          <Icone nom="message" taille={20} couleur="var(--cyan)" />
          Prévenir mes proches
        </button>

        <Link to="/signaler" style={{ textAlign: 'center', fontSize: 15, fontWeight: 700, padding: 12, minHeight: 44 }}>
          Ma situation a changé
        </Link>
        <Link to="/accueil" style={{ textAlign: 'center', fontSize: 15, fontWeight: 700, padding: 4, minHeight: 44 }}>
          Retour à l'accueil
        </Link>
      </main>

      <footer style={{ padding: '0 20px calc(24px + env(safe-area-inset-bottom))' }}>
        <a href="tel:112" className="carte" style={{ textDecoration: 'none', display: 'block', textAlign: 'center', fontSize: 14, color: 'var(--texte)' }}>
          Si la situation s'aggrave : <strong style={{ color: 'var(--danger)' }}>appelez le 112</strong>
        </a>
      </footer>
    </div>
  )
}

function Etape({ etat, titre, detail }: { etat: 'fait' | 'en-cours' | 'a-venir'; titre: string; detail?: string }) {
  const rond =
    etat === 'fait'
      ? { background: 'var(--bleu)', color: 'var(--blanc)' }
      : etat === 'en-cours'
        ? { border: '3px solid var(--bleu)', background: 'var(--bleu-clair)' }
        : { border: '2px dashed #8da3ae' }
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', color: etat === 'a-venir' ? 'var(--texte-doux)' : undefined }}>
      <span style={{ width: 26, height: 26, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, ...rond }}>
        {etat === 'fait' && <Icone nom="valide" taille={14} epaisseur={3} />}
      </span>
      <span style={{ fontSize: 15 }}>
        {etat === 'a-venir' ? titre : <strong>{titre}</strong>}
        {detail ? ` · ${detail}` : ''}
      </span>
    </div>
  )
}
