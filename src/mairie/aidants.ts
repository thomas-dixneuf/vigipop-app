import { besoins as listeBesoins, ressources as listeRessources } from '../data/fictif.ts'
import type { Benevole, Entreprise } from './Partenaires.tsx'

// Tous ceux qui peuvent aider, réunis : habitants volontaires, bénévoles de la Protection civile,
// entreprises conventionnées. Pour chaque besoin d'une demande, on sait qui peut y répondre.

export type Volontaire = {
  auteur: string
  prenom: string
  nom?: string
  telephone: string
  ressources: string[]
  places_hebergement: number
  adresse: string
  lat: number | null
  lng: number | null
  updated_at: string
}

// Ce qu'un aidant fait déjà (hébergement ou entraide en cours), pour ne pas le solliciter deux fois
export type Engagement = { aidant: string; reference: string; libelle: string }

// Pour chaque besoin d'habitant : ce qui y répond chez les volontaires, les bénévoles et les entreprises.
// Les entreprises conventionnées ne répondent qu'au besoin « Matériel ».
export const correspondances: Record<string, { ressources: string[]; qualifications: string[]; materiel: string[]; mission?: { titre: string; categorie: string } }> = {
  heb: { ressources: ['heb'], qualifications: ['Accueil et hébergement'], materiel: [] },
  // Les entreprises conventionnées prêtent du matériel ; elles ne font jamais de mission ni de transport de personnes
  transport: { ressources: ['vehicule'], qualifications: ['Conduite poids lourd', 'Logistique'], materiel: [] },
  materiel: {
    ressources: ['materiel'],
    qualifications: ['Logistique', 'Déblaiement et bricolage'],
    materiel: ['Pompes et motopompes', 'Groupes électrogènes', 'Outillage et déblaiement', 'Sacs de sable et barrières', 'Bâches et mise à l’abri', 'Engins de chantier'],
  },
  eau: { ressources: ['mainoeuvre', 'vehicule'], qualifications: ['Logistique'], materiel: [], mission: { titre: "Distribution d'eau et de repas", categorie: 'mainoeuvre' } },
  med: { ressources: ['vehicule', 'competences'], qualifications: ['Secourisme (PSE1 / PSE2)'], materiel: [], mission: { titre: 'Livraison de médicaments', categorie: 'vehicule' } },
  // Bloqué(e) chez soi : dégager l'accès, avec la Protection civile ou des volontaires (danger : 112)
  bloque: { ressources: ['mainoeuvre', 'materiel'], qualifications: ['Déblaiement et bricolage', 'Secourisme (PSE1 / PSE2)'], materiel: [] },
  // Blessé ou évacuation sans besoin coché : les secouristes
  secours: { ressources: ['competences'], qualifications: ['Secourisme (PSE1 / PSE2)', 'Soutien psychologique'], materiel: [] },
}

// Bénévoles de la Protection civile qui peuvent renforcer une mission, selon son type d'aide
export const qualificationsMission: Record<string, string[]> = {
  vehicule: ['Conduite poids lourd', 'Logistique'],
  materiel: ['Logistique', 'Déblaiement et bricolage'],
  mainoeuvre: ['Logistique', 'Déblaiement et bricolage', 'Accueil et hébergement'],
  competences: ['Secourisme (PSE1 / PSE2)', 'Soutien psychologique'],
}

// Bénévoles disponibles pour une mission (tous si la mission est ouverte à tous)
export function benevolesPourMission(categorie: string, benevoles: Benevole[]) {
  const q = qualificationsMission[categorie]
  return benevoles.filter((b) => b.statut !== 'indisponible' && (!q || q.some((x) => b.qualifications.includes(x))))
}

export const libelleBesoin = (id: string) =>
  id === 'secours' ? 'Secours (blessé, évacuation)' : id === 'bloque' ? 'Bloqué(e) chez soi' : (listeBesoins.find((b) => b.id === id)?.label ?? id)
export const libelleRessource = (id: string) => listeRessources.find((r) => r.id === id)?.label ?? id

export function aidantsPour(besoin: string, volontaires: Volontaire[], benevoles: Benevole[], entreprises: Entreprise[]) {
  const c = correspondances[besoin]
  if (!c) return { volontaires: [], benevoles: [], entreprises: [] }
  return {
    volontaires: volontaires.filter((v) => c.ressources.some((r) => v.ressources.includes(r))),
    benevoles: benevoles.filter((b) => b.statut !== 'indisponible' && (c.qualifications.length === 0 ? false : c.qualifications.some((q) => b.qualifications.includes(q)))),
    entreprises: entreprises.filter((e) => c.materiel.some((m) => e.materiel.includes(m))),
  }
}

