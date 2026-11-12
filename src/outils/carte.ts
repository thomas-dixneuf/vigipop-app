import type { LieuServeur } from '../services/serveur.ts'
import { centreCommune } from '../data/fictif.ts'

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

// Recherche sans accents ni majuscules : « eglise » trouve « Église »
function normaliser(texte: string) {
  return texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’'-]/g, ' ')
}

// Liste embarquée (chargée seulement si besoin) : tous les mots tapés doivent s'y retrouver
async function chercherHorsLigne(texte: string, type?: 'municipality'): Promise<ResultatAdresse[]> {
  const { adressesEmbarquees, communesEmbarquees } = await import('../data/adressesEmbarquees')
  // « 12 bis rue Nationale » : le numéro est gardé dans le libellé, la position reste celle de la rue
  const numero = type ? null : texte.trim().match(/^(\d+\s*(?:bis|ter)?)[\s,]+/i)
  const mots = normaliser(numero ? texte.trim().slice(numero[0].length) : texte).split(/\s+/).filter(Boolean)
  return (type ? communesEmbarquees : adressesEmbarquees)
    .filter((a) => mots.every((m) => normaliser(a.libelle).includes(m)))
    .slice(0, 5)
    .map((a) => (numero ? { ...a, libelle: `${numero[1].trim()} ${a.libelle}` } : a))
}

// Géocodeur officiel de l'IGN, puis ancienne adresse de la Base Adresse Nationale (même format)
const SERVICES_ADRESSE = ['https://data.geopf.fr/geocodage/search/', 'https://api-adresse.data.gouv.fr/search/']

// Base Adresse Nationale : adresses officielles françaises, sans clé. Sans réponse (pas de réseau,
// maquette hors ligne), la liste embarquée prend le relais : le choix reste vérifié.
export async function chercherAdresse(texte: string, type?: 'municipality'): Promise<ResultatAdresse[]> {
  if (texte.trim().length < 2) return []
  // Adresse : les résultats proches de la commune d'abord (« 12 rue Nationale » à Cholet, pas à Lille)
  const filtre = type ? `&type=${type}` : `&lat=${centreCommune[0]}&lon=${centreCommune[1]}`
  for (const service of SERVICES_ADRESSE) {
    try {
      const reponse = await fetch(`${service}?q=${encodeURIComponent(texte)}&limit=5${filtre}`, { signal: AbortSignal.timeout(4000) })
      if (!reponse.ok) continue
      const donnees = (await reponse.json()) as {
        features: { properties: { label: string; postcode?: string; type?: string }; geometry: { coordinates: [number, number] } }[]
      }
      return donnees.features.map((f) => ({
        // Commune : code postal ajouté pour distinguer les homonymes
        libelle: type && f.properties.postcode ? `${f.properties.label} (${f.properties.postcode})` : f.properties.label,
        lng: f.geometry.coordinates[0],
        lat: f.geometry.coordinates[1],
      }))
    } catch {
      // Service injoignable : on essaie le suivant
    }
  }
  return chercherHorsLigne(texte, type)
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

// Points gardés au plus par contour importé (limite du serveur : 2000)
const POINTS_MAX = 2000

export type ZoneImportee = { nom: string; points: [number, number][] }

type Geometrie = { type: string; coordinates?: unknown; geometries?: Geometrie[] }
type Objet = { type: string; geometry?: Geometrie | null; properties?: Record<string, unknown> | null; features?: Objet[] }

// Contours d'un fichier GeoJSON (export Géorisques, QGIS, préfecture) : polygones et
// multipolygones, contour extérieur seulement. Les coordonnées doivent être en degrés (WGS84).
export function zonesDepuisGeoJSON(texte: string): ZoneImportee[] {
  const racine = JSON.parse(texte) as Objet
  const objets: Objet[] =
    racine.type === 'FeatureCollection' ? (racine.features ?? []) : racine.type === 'Feature' ? [racine] : [{ type: 'Feature', geometry: racine as Geometrie }]
  const zones: ZoneImportee[] = []
  objets.forEach((objet, i) => {
    const proprietes = objet.properties ?? {}
    const libelle = ['nom', 'name', 'NOM', 'libelle', 'LIBELLE', 'label'].map((c) => proprietes[c]).find((v) => typeof v === 'string' && v.trim())
    const nom = typeof libelle === 'string' ? libelle.trim().slice(0, 120) : `Zone ${i + 1}`
    const anneaux = anneauxExterieurs(objet.geometry ?? null)
    anneaux.forEach((anneau, j) => {
      const points = convertir(anneau)
      if (points.length >= 3) zones.push({ nom: anneaux.length > 1 ? `${nom} (${j + 1})`.slice(0, 120) : nom, points })
    })
  })
  return zones
}

function anneauxExterieurs(g: Geometrie | null): unknown[][] {
  if (!g) return []
  if (g.type === 'Polygon') return [(g.coordinates as unknown[][])[0]]
  if (g.type === 'MultiPolygon') return (g.coordinates as unknown[][][]).map((p) => p[0])
  if (g.type === 'GeometryCollection') return (g.geometries ?? []).flatMap(anneauxExterieurs)
  return []
}

// GeoJSON : [lng, lat] ; la carte : [lat, lng]. Contour refermé : le dernier point (doublon) est retiré.
function convertir(anneau: unknown[]): [number, number][] {
  const points = anneau.map((c) => {
    const [lng, lat] = c as [number, number]
    if (typeof lat !== 'number' || typeof lng !== 'number' || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      throw new Error('coordonnees')
    }
    return [Math.round(lat * 1e6) / 1e6, Math.round(lng * 1e6) / 1e6] as [number, number]
  })
  const [premier, dernier] = [points[0], points[points.length - 1]]
  if (points.length > 1 && premier[0] === dernier[0] && premier[1] === dernier[1]) points.pop()
  if (points.length <= POINTS_MAX) return points
  // Contour trop détaillé : un point sur n, largement suffisant à l'échelle d'une commune
  const pas = Math.ceil(points.length / POINTS_MAX)
  return points.filter((_, k) => k % pas === 0)
}

// Couleur des zones de risque : bleu nuit pour l'inondation et les autres risques, mauve et
// pointillés serrés pour la rupture de barrage (couleurs du DICRIM), pour les distinguer
// même quand elles se superposent
export function styleRisque(risque: string) {
  return /barrage/i.test(risque)
    ? { trait: '#6b3fa0', fond: '#d4b8f0', pointilles: '2 5', bordure: 'dotted', ordre: 0 }
    : { trait: '#0e3a52', fond: '#86ddff', pointilles: '6 5', bordure: 'dashed', ordre: 1 }
}
