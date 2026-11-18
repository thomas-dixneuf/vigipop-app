import { useEffect, useState } from 'react'
import { serveur, type MissionServeur, type MonHebergementServeur, type SollicitationServeur } from '../services/serveur.ts'
import { lienItineraire, type Coordonnees } from './carte.ts'

// Destinations personnelles en crise, affichées sur la carte avec leur itinéraire :
// le foyer qui m'héberge (après l'accord de l'hébergeur), ma mission acceptée,
// les personnes que je transporte ou à qui j'apporte du matériel (après mon accord).
export type Trajet = {
  id: string
  type: 'hebergement' | 'mission' | 'entraide'
  // Libellé court du bouton au-dessus de la carte
  bouton: string
  titre: string
  detail: string
  point: Coordonnees | null
  itineraire: string
  telephone?: string
  lien?: string
}

const coordonnees = (texte: string): Coordonnees | null => {
  const m = texte.match(/^\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\s*$/)
  return m ? { lat: Number(m[1]), lng: Number(m[2]) } : null
}
const recherche = (texte: string, mode: 'walking' | 'driving' = 'walking') =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(texte)}&travelmode=${mode}`

function hebergementEnCache(demande: string): MonHebergementServeur | null {
  try {
    const brut = localStorage.getItem(`vigipop-hebergement-${demande}`)
    return brut ? (JSON.parse(brut) as MonHebergementServeur) : null
  } catch {
    return null
  }
}

type Entree = {
  actif: boolean
  demande: string | null
  mission: MissionServeur | null
  // Point de rendez-vous de la mission, déjà calculé par la carte (adresse ou lieu du même nom)
  rendezVous: Coordonnees | null
  commune: string
  connecte: boolean
}

export function useMesTrajets({ actif, demande, mission, rendezVous, commune, connecte }: Entree): Trajet[] {
  const [hebergement, setHebergement] = useState<MonHebergementServeur | null>(() => (demande ? hebergementEnCache(demande) : null))
  const [entraides, setEntraides] = useState<SollicitationServeur[]>([])

  useEffect(() => {
    if (!actif || !serveur || !demande) return
    let annule = false
    void serveur.rpc('mon_hebergement', { p_demande: demande }).then(({ data, error }) => {
      if (!annule && !error) setHebergement(((data as MonHebergementServeur[])[0] ?? null) as MonHebergementServeur | null)
    })
    return () => {
      annule = true
    }
  }, [actif, demande])

  useEffect(() => {
    if (!actif || !serveur || !connecte) return
    let annule = false
    void serveur.rpc('mes_entraides').then(({ data, error }) => {
      if (!annule && !error) setEntraides(data as SollicitationServeur[])
    })
    return () => {
      annule = true
    }
  }, [actif, connecte])

  if (!actif) return []
  const trajets: Trajet[] = []

  if (hebergement && hebergement.statut === 'acceptee' && (hebergement.adresse || hebergement.lat != null)) {
    const point = hebergement.lat != null && hebergement.lng != null ? { lat: hebergement.lat, lng: hebergement.lng } : null
    trajets.push({
      id: 'trajet-hebergement',
      type: 'hebergement',
      bouton: 'Mon hébergement',
      titre: `Chez ${hebergement.prenom || 'votre hébergeur'}`,
      detail: hebergement.adresse || 'Adresse sur la carte',
      point,
      itineraire: point ? lienItineraire(point) : recherche(`${hebergement.adresse}, ${commune}`),
      telephone: hebergement.telephone || undefined,
    })
  }

  if (mission) {
    trajets.push({
      id: 'trajet-mission',
      type: 'mission',
      bouton: 'Ma mission',
      titre: mission.titre,
      detail: `Rendez-vous ${mission.rendez_vous} · ${mission.lieu}${mission.adresse ? ` · ${mission.adresse}` : ''}`,
      point: rendezVous,
      itineraire: rendezVous ? lienItineraire(rendezVous) : recherche(`${mission.adresse || mission.lieu}, ${commune}`),
      lien: '/mission',
    })
  }

  for (const e of entraides.filter((x) => x.statut === 'acceptee' && x.lieu)) {
    const point = coordonnees(e.lieu)
    const qui = e.prenom || 'la personne'
    trajets.push({
      id: `trajet-entraide-${e.id}`,
      type: 'entraide',
      bouton: e.besoin === 'transport' ? `Transport · ${qui}` : `Matériel · ${qui}`,
      titre: e.besoin === 'transport' ? `Aller chercher ${qui}` : `Apporter du matériel à ${qui}`,
      detail: `${e.personnes} personne${e.personnes > 1 ? 's' : ''}${point ? '' : ` · ${e.lieu}`}`,
      point,
      // En voiture : véhicule ou matériel à apporter
      itineraire: point
        ? `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}&travelmode=driving`
        : recherche(`${e.lieu}, ${commune}`, 'driving'),
      telephone: e.telephone || undefined,
    })
  }
  return trajets
}
