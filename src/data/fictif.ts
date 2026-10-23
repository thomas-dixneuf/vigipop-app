import type { LieuServeur } from '../services/serveur'

// Données de démonstration : tout est fictif tant que la phase RGPD n'est pas validée.
// Ne jamais remplacer par de vraies données d'habitants dans ce prototype.

export const commune = '[VOTRE COMMUNE]'

export const risques = ['Inondation', 'Tempête', '[AUTRE RISQUE]']

// Lieux de démonstration, au même format que ceux du serveur
export const lieuxDemo: LieuServeur[] = [
  { id: 'gymnase', type: 'accueil', nom: '[NOM DU GYMNASE]', details: 'ouvert 24 h/24 · repas chauds', distance: '1,2 km', places: 80, ouvert: true },
  { id: 'salle', type: 'accueil', nom: '[SALLE DES FÊTES]', details: 'lits de camp', distance: '2,4 km', places: 40, ouvert: false },
  { id: 'eau', type: 'eau', nom: '[NOM DU LIEU]', details: 'eau potable en bouteilles', distance: '800 m', places: null, ouvert: true },
]

export const libelleLieu: Record<LieuServeur['type'], string> = {
  accueil: "Centre d'accueil",
  eau: "Distribution d'eau",
  soins: 'Point de soins',
  autre: "Point d'aide",
}

export const situations = [
  { id: 'sinistre', label: 'Sinistré, en sécurité' },
  { id: 'bloque', label: 'Bloqué chez moi' },
  { id: 'evac', label: "Besoin d'évacuation" },
  { id: 'blesse', label: 'Personne blessée' },
] as const

export const besoins = [
  { id: 'heb', label: 'Hébergement' },
  { id: 'eau', label: 'Eau & repas' },
  { id: 'med', label: 'Médicaments' },
  { id: 'transport', label: 'Transport' },
  { id: 'materiel', label: 'Matériel' },
  { id: 'animaux', label: 'Animaux' },
] as const

export type SituationId = (typeof situations)[number]['id']
export type BesoinId = (typeof besoins)[number]['id']

export const ressources = [
  { id: 'heb', label: 'Hébergement temporaire', detail: "2 places · chambre d'amis" },
  { id: 'vehicule', label: 'Véhicule', detail: 'Voiture 5 places · permis B' },
  { id: 'materiel', label: 'Matériel', detail: 'Pompe, groupe électrogène, bâches' },
  // La main-d'œuvre fait partie des offres des volontaires (choix du 22/10/2026)
  { id: 'mainoeuvre', label: "Main-d'œuvre", detail: 'Déblayer, porter, nettoyer' },
  { id: 'competences', label: 'Compétences', detail: 'Secourisme (PSC1)' },
  { id: 'temps', label: 'Temps disponible', detail: 'Soirs et week-ends' },
] as const

export type RessourceId = (typeof ressources)[number]['id']

export const ressourcesParDefaut: RessourceId[] = ['heb', 'vehicule', 'mainoeuvre', 'competences', 'temps']

export const mission = {
  titre: "Distribution d'eau aux habitants du quartier [NOM]",
  coordinateur: '[PRÉNOM]',
  rendezVous: '15:00',
  duree: '2 h',
  equipe: '4 volontaires',
  ressource: 'Véhicule',
  lieu: '[SALLE DES FÊTES]',
  consignes:
    "N'entrez jamais dans une zone inondée. Gilet fourni sur place. Suivez uniquement les consignes du coordinateur.",
}
