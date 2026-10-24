import { useCallback, useEffect, useState } from 'react'
import Icone from './Icone.tsx'
import { lienItineraire } from '../outils/carte.ts'
import { lienTelephone, serveur, type MonHebergementServeur } from '../services/serveur.ts'

const cle = (demande: string) => `vigipop-hebergement-${demande}`

function lireCache(demande: string): MonHebergementServeur | null {
  try {
    const brut = localStorage.getItem(cle(demande))
    return brut ? (JSON.parse(brut) as MonHebergementServeur) : null
  } catch {
    return null
  }
}

// Côté personne sinistrée : le foyer trouvé par la mairie, avec l'adresse une fois que l'hébergeur a accepté.
// Gardé sur le téléphone pour rester lisible sans réseau.
export default function HebergementTrouve({ demande }: { demande: string }) {
  const [hebergement, setHebergement] = useState<MonHebergementServeur | null>(() => lireCache(demande))

  const charger = useCallback(async () => {
    if (!serveur) return
    const { data, error } = await serveur.rpc('mon_hebergement', { p_demande: demande })
    if (error) return
    const h = ((data as MonHebergementServeur[])[0] ?? null) as MonHebergementServeur | null
    setHebergement(h)
    try {
      if (h) localStorage.setItem(cle(demande), JSON.stringify(h))
      else localStorage.removeItem(cle(demande))
    } catch {
      // Stockage indisponible : l'affichage reste à jour tant qu'il y a du réseau
    }
  }, [demande])

  useEffect(() => {
    if (!serveur) return
    const client = serveur
    // Chargement initial, puis à chaque réponse de l'hébergeur (asynchrone : faux positif du linter)
    // eslint-disable-next-line react/set-state-in-effect
    void charger()
    const canal = client
      .channel(`hebergement-${demande}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hebergements', filter: `demande_id=eq.${demande}` }, () => void charger())
      .subscribe()
    window.addEventListener('online', charger)
    return () => {
      void client.removeChannel(canal)
      window.removeEventListener('online', charger)
    }
  }, [demande, charger])

  if (!hebergement) return null

  if (hebergement.statut === 'proposee') {
    return (
      <section role="status" className="carte" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <span style={{ color: 'var(--bleu)', flexShrink: 0 }}>
          <Icone nom="accueil" taille={24} />
        </span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <strong style={{ fontSize: 16, color: 'var(--bleu-nuit)' }}>Un foyer d'accueil a été contacté</strong>
          <span className="texte-doux" style={{ lineHeight: 1.4 }}>
            La mairie attend sa confirmation. Son adresse s'affichera ici dès qu'il aura accepté.
          </span>
        </span>
      </section>
    )
  }

  const itineraire =
    hebergement.lat !== null && hebergement.lng !== null
      ? lienItineraire({ lat: hebergement.lat, lng: hebergement.lng })
      : hebergement.adresse
        ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(hebergement.adresse)}&travelmode=walking`
        : null

  return (
    <section aria-label="Hébergement trouvé" className="carte" style={{ display: 'flex', flexDirection: 'column', gap: 10, borderColor: 'var(--bleu)', borderWidth: 2 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 800, color: 'var(--bleu)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
        <Icone nom="accueil" taille={16} epaisseur={2.4} />
        Hébergement trouvé
      </span>
      <strong style={{ fontSize: 18, lineHeight: 1.3, color: 'var(--bleu-nuit)' }}>{hebergement.prenom || 'Un habitant'} vous accueille</strong>
      {hebergement.adresse && <span style={{ fontSize: 15 }}>{hebergement.adresse}</span>}
      {itineraire && (
        <a href={itineraire} target="_blank" rel="noreferrer" className="bouton bouton--principal" style={{ minHeight: 48, fontSize: 16 }}>
          <Icone nom="itineraire" taille={18} /> Itinéraire
        </a>
      )}
      {hebergement.telephone && (
        <a href={lienTelephone(hebergement.telephone)} className="bouton bouton--clair" style={{ minHeight: 48, fontSize: 16 }}>
          <Icone nom="telephone" taille={18} /> Appeler {hebergement.prenom || "l'hébergeur"} · {hebergement.telephone}
        </a>
      )}
      <span className="texte-doux" style={{ lineHeight: 1.4 }}>
        Ne prenez la route que si c'est sans danger. Évitez les zones en rouge sur la carte.
      </span>
    </section>
  )
}
