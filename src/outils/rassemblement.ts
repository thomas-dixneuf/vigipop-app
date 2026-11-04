import { centresParZone, lieuxDemo, pointsRassemblement, type PointRassemblement } from '../data/fictif.ts'
import type { LieuServeur } from '../services/serveur.ts'
import { distanceMetres, type Coordonnees } from './carte.ts'

export function pointDuQuartier(numero: string | null) {
  return pointsRassemblement.find((p) => p.numero === numero) ?? null
}

// Sans découpage officiel des quartiers : point de rassemblement le plus proche de l'adresse
export function pointLePlusProche(c: Coordonnees): PointRassemblement {
  return pointsRassemblement.reduce((meilleur, p) => (distanceMetres(c, p) < distanceMetres(c, meilleur) ? p : meilleur))
}

// Centres d'hébergement de la zone, avec leur état d'ouverture à jour (serveur, sinon scénario de démo)
export function centresDeLaZone(zone: PointRassemblement['zone'], lieux: LieuServeur[] | null) {
  const source = lieux && lieux.length > 0 ? lieux : lieuxDemo
  return centresParZone[zone]
    .map((id) => {
      const modele = lieuxDemo.find((l) => l.id === id)
      return source.find((l) => l.id === id || l.nom === modele?.nom) ?? modele
    })
    .filter((l): l is LieuServeur => !!l)
}
