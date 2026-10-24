import type { LieuServeur } from '../services/serveur.ts'

export type Coordonnees = { lat: number; lng: number }

// Couleur des repères par type de lieu (charte : l'orange reste réservé à l'urgence)
export const couleurLieu: Record<LieuServeur['type'], string> = {
  accueil: '#1b5b7a',
  eau: '#2a8fbd',
  soins: '#b42318',
  autre: '#5b6b75',
}

// Guidage confié à l'app de navigation du téléphone (Google Maps, ou Plans sur iPhone)
export function lienItineraire({ lat, lng }: Coordonnees) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`
}

// Distance à vol d'oiseau, en mètres
export function distanceMetres(a: Coordonnees, b: Coordonnees) {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(h))
}

export function distanceLisible(metres: number) {
  return metres < 1000 ? `${Math.round(metres / 10) * 10} m` : `${(metres / 1000).toFixed(1).replace('.', ',')} km`
}

// Lieu situé sur la carte : coordonnées connues
export function estPlace(l: LieuServeur): l is LieuServeur & Coordonnees {
  return l.lat !== null && l.lng !== null
}

export type ResultatAdresse = { libelle: string; lat: number; lng: number }

// Base Adresse Nationale (data.gouv.fr) : adresses officielles françaises, sans clé
export async function chercherAdresse(texte: string, type?: 'municipality'): Promise<ResultatAdresse[]> {
  if (texte.trim().length < 3) return []
  const filtre = type ? `&type=${type}` : ''
  const reponse = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(texte)}&limit=5${filtre}`)
  if (!reponse.ok) return []
  const donnees = (await reponse.json()) as {
    features: { properties: { label: string }; geometry: { coordinates: [number, number] } }[]
  }
  return donnees.features.map((f) => ({ libelle: f.properties.label, lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] }))
}

// La position est-elle dans le polygone ? (lancer de rayon, suffisant à l'échelle d'une commune)
export function dansZone({ lat, lng }: Coordonnees, points: [number, number][]) {
  let dedans = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [yi, xi] = points[i]
    const [yj, xj] = points[j]
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) dedans = !dedans
  }
  return dedans
}
