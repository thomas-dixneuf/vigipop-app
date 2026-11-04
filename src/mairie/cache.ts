// Copie locale du tableau de bord : si le réseau de la mairie tombe, la cellule de crise
// garde sous les yeux la dernière liste reçue (et peut l'imprimer).
// Données personnelles : effacées à la déconnexion du coordinateur.

const PREFIXE = 'vigipop-mairie-'

export function lireCache<T>(cle: string): { a: string; valeur: T } | null {
  try {
    const brut = localStorage.getItem(PREFIXE + cle)
    return brut ? (JSON.parse(brut) as { a: string; valeur: T }) : null
  } catch {
    return null
  }
}

export function ecrireCache<T>(cle: string, valeur: T) {
  try {
    localStorage.setItem(PREFIXE + cle, JSON.stringify({ a: new Date().toISOString(), valeur }))
  } catch {
    // Stockage plein ou indisponible : le tableau de bord en ligne reste utilisable
  }
}

export function effacerCacheMairie() {
  try {
    for (const cle of Object.keys(localStorage)) if (cle.startsWith(PREFIXE)) localStorage.removeItem(cle)
  } catch {
    // Rien à effacer
  }
}
