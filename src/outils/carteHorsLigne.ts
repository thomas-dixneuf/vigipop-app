// Carte de la commune gardée sur le téléphone, pour qu'elle reste lisible sans Internet.
// Les tuiles vont dans le même cache que celles déjà consultées (« carte-tuiles »,
// voir vite.config.ts) : la carte les y retrouve toute seule quand le réseau tombe.
//
// Volume volontairement modeste (~70 tuiles, une fois par semaine) pour respecter
// les règles d'usage des serveurs OpenStreetMap. En production, un serveur de tuiles
// dédié permettra de garder toute la commune à tous les niveaux de zoom.

const CACHE = 'carte-tuiles'
const CLE_DERNIER = 'vigipop-carte-hors-ligne'
const DELAI_MS = 7 * 24 * 3600 * 1000
const URL_TUILE = 'https://tile.openstreetmap.org'

// Zoom → nombre de tuiles de part et d'autre du centre
const ETENDUE: [zoom: number, rayon: number][] = [
  [12, 1],
  [13, 1],
  [14, 1],
  [15, 2],
  [16, 2],
]

function tuile(lat: number, lng: number, z: number) {
  const n = 2 ** z
  const x = Math.floor(((lng + 180) / 360) * n)
  const rad = (lat * Math.PI) / 180
  const y = Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n)
  return { x, y }
}

export function urlsCommune([lat, lng]: [number, number]) {
  const urls: string[] = []
  for (const [z, r] of ETENDUE) {
    const c = tuile(lat, lng, z)
    for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) urls.push(`${URL_TUILE}/${z}/${c.x + dx}/${c.y + dy}.png`)
  }
  return urls
}

function lireDernier() {
  try {
    return Number(localStorage.getItem(CLE_DERNIER)) || 0
  } catch {
    return 0
  }
}

// Ne bloque jamais rien : en cas d'échec, on réessaiera au prochain passage en ligne
export async function prechargerCarte(centre: [number, number]) {
  if (!('caches' in window) || Date.now() - lireDernier() < DELAI_MS) return
  try {
    const cache = await caches.open(CACHE)
    let manquees = 0
    // Une tuile à la fois : discret pour le serveur et pour la batterie
    for (const url of urlsCommune(centre)) {
      if (!navigator.onLine) return
      if (await cache.match(url)) continue
      try {
        const reponse = await fetch(url, { mode: 'cors' })
        if (reponse.ok) await cache.put(url, reponse)
        else manquees++
      } catch {
        manquees++
      }
    }
    if (manquees === 0) localStorage.setItem(CLE_DERNIER, String(Date.now()))
  } catch {
    // Stockage plein ou indisponible (navigation privée) : la carte en ligne reste utilisable
  }
}
