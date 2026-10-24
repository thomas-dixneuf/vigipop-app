import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Icone from './Icone.tsx'
import { abonnerPush, afficherAlerte, etatAlertes } from '../outils/alertes.ts'
import { COMMUNE_ID, serveur, type MonHebergementServeur, type PropositionHebergementServeur } from '../services/serveur.ts'
import { useAppState, type NotificationApp } from '../state/AppState.tsx'

type Evenement = Omit<NotificationApp, 'heure' | 'lue'>

const suiviDemande: Record<string, [string, string]> = {
  prise_en_charge: ['Votre demande est prise en charge', 'La cellule de crise de la mairie s’occupe de votre demande.'],
  aide_organisee: ['Aide organisée pour votre demande', 'Ouvrez le suivi pour voir ce qui est prévu.'],
  close: ['Votre demande est close', 'Si la situation change, signalez-la à nouveau.'],
}

// Observe ce qui change (crise, demande, mission, hébergement) et l'annonce : dans le centre de
// notifications, par un bandeau si l'app est à l'écran, sinon par une alerte du téléphone.
export default function Notifieur() {
  const { pathname } = useLocation()
  const espaceMairie = pathname.startsWith('/mairie')
  const { mode, alerte, demande, disponible, ressources, utilisateur, missionServeur, mission, notifications, ajouterNotification } = useAppState()
  const [bandeau, setBandeau] = useState<Evenement | null>(null)
  const derniereCrise = useRef<{ id: string; titre: string } | null>(null)

  const annoncer = useRef<(e: Evenement) => void>(() => undefined)
  useEffect(() => {
    annoncer.current = (e: Evenement) => {
      if (espaceMairie || !ajouterNotification(e)) return
      if (document.visibilityState === 'visible') setBandeau(e)
      else void afficherAlerte(e)
    }
  }, [ajouterNotification, espaceMairie])

  // Crise : déclenchement, nouvelle consigne, fin
  useEffect(() => {
    if (mode === 'crise' && alerte) {
      const id = alerte.id ?? alerte.titre
      const dejaVue = notifications.some((n) => n.cle.startsWith(`crise:${id}:`))
      derniereCrise.current = { id, titre: alerte.titre }
      annoncer.current({
        cle: `crise:${id}:${alerte.consigne}`,
        titre: dejaVue ? 'Nouvelle consigne de la mairie' : 'Mode crise activé par la mairie',
        texte: dejaVue ? alerte.consigne : `${alerte.titre} — ${alerte.consigne}`,
        lien: '/accueil',
        urgente: true,
      })
    } else if (mode === 'veille' && derniereCrise.current) {
      const fin = derniereCrise.current
      derniereCrise.current = null
      annoncer.current({ cle: `fin:${fin.id}`, titre: 'Fin de la crise', texte: `La mairie a levé l'alerte : ${fin.titre}`, lien: '/accueil' })
    }
    // Seuls le mode et l'alerte comptent ; la liste des notifications sert de mémoire
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, alerte?.id, alerte?.titre, alerte?.consigne])

  // Suivi de la demande d'aide
  useEffect(() => {
    if (!demande?.envoyee || !suiviDemande[demande.statut]) return
    const [titre, texte] = suiviDemande[demande.statut]
    annoncer.current({ cle: `demande:${demande.id}:${demande.statut}`, titre, texte, lien: '/demande' })
  }, [demande?.id, demande?.envoyee, demande?.statut])

  // Mission proposée à un volontaire disponible
  useEffect(() => {
    if (!disponible || !missionServeur || mission === 'acceptee') return
    annoncer.current({
      cle: `mission:${missionServeur.id}`,
      titre: 'Nouvelle mission proposée',
      texte: `${missionServeur.titre} · rendez-vous ${missionServeur.rendez_vous}`,
      lien: '/mission',
    })
  }, [disponible, missionServeur, mission])

  // Hébergement : propositions reçues (hébergeur) et foyer trouvé (personne sinistrée)
  const hebergeur = !!serveur && !!utilisateur && disponible && ressources.includes('heb')
  const demandeHeb = demande?.envoyee && demande.besoins.includes('heb') ? demande.id : null
  useEffect(() => {
    if (!serveur || (!hebergeur && !demandeHeb)) return
    const client = serveur
    const verifier = async () => {
      if (hebergeur) {
        const { data } = await client.rpc('mes_propositions_hebergement')
        for (const p of (data ?? []) as PropositionHebergementServeur[]) {
          if (p.statut === 'proposee')
            annoncer.current({
              cle: `heb-proposee:${p.id}`,
              titre: "Demande d'hébergement",
              texte: `Pouvez-vous accueillir ${p.personnes} personne${p.personnes > 1 ? 's' : ''} sinistrée${p.personnes > 1 ? 's' : ''} ? Répondez dans Vigipop.`,
              lien: '/accueil',
              urgente: true,
            })
        }
      }
      if (demandeHeb) {
        const { data } = await client.rpc('mon_hebergement', { p_demande: demandeHeb })
        const h = ((data ?? []) as MonHebergementServeur[])[0]
        if (h?.statut === 'acceptee')
          annoncer.current({
            cle: `heb-trouve:${demandeHeb}`,
            titre: 'Hébergement trouvé',
            texte: `${h.prenom || 'Un habitant'} accepte de vous accueillir : adresse et itinéraire dans Vigipop.`,
            lien: '/demande',
            urgente: true,
          })
      }
    }
    void verifier()
    const canal = client
      .channel(`notifieur-${demandeHeb ?? 'hebergeur'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hebergements' }, () => void verifier())
      .subscribe()
    const minuteur = window.setInterval(() => void verifier(), 60000)
    return () => {
      void client.removeChannel(canal)
      window.clearInterval(minuteur)
    }
  }, [hebergeur, demandeHeb])

  // Alertes déjà autorisées : on (ré)abonne ce téléphone au push à chaque ouverture
  useEffect(() => {
    if (serveur && !espaceMairie && etatAlertes() === 'granted') void abonnerPush(serveur, COMMUNE_ID)
  }, [espaceMairie])

  // Le bandeau disparaît seul au bout de quelques secondes
  useEffect(() => {
    if (!bandeau) return
    const minuteur = window.setTimeout(() => setBandeau(null), 8000)
    return () => window.clearTimeout(minuteur)
  }, [bandeau])

  if (!bandeau || espaceMairie) return null
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 'calc(10px + env(safe-area-inset-top))',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(420px, calc(100% - 24px))',
        zIndex: 1000,
        background: bandeau.urgente ? 'var(--bleu-nuit)' : 'var(--blanc)',
        color: bandeau.urgente ? 'var(--blanc)' : 'var(--texte)',
        border: '1px solid var(--bordure)',
        borderRadius: 16,
        boxShadow: '0 6px 24px rgba(14,58,82,.25)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 10px 10px 14px',
      }}
    >
      <span style={{ color: bandeau.urgente ? 'var(--consigne)' : 'var(--bleu)', flexShrink: 0 }}>
        <Icone nom="cloche" taille={20} epaisseur={2.2} />
      </span>
      <Link to={bandeau.lien} onClick={() => setBandeau(null)} style={{ flex: 1, minWidth: 0, color: 'inherit', textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 2, minHeight: 44, justifyContent: 'center' }}>
        <strong style={{ fontSize: 15 }}>{bandeau.titre}</strong>
        <span style={{ fontSize: 13, opacity: 0.85, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bandeau.texte}</span>
      </Link>
      <button
        type="button"
        aria-label="Fermer"
        onClick={() => setBandeau(null)}
        style={{ width: 44, height: 44, border: 'none', background: 'transparent', color: 'inherit', fontSize: 22, flexShrink: 0 }}
      >
        ×
      </button>
    </div>
  )
}
