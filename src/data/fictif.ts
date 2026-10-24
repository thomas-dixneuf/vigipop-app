import type { LieuServeur, MissionServeur, ZoneServeur } from '../services/serveur'

// Données de démonstration : tout est fictif tant que la phase RGPD n'est pas validée.
// Ne jamais remplacer par de vraies données d'habitants dans ce prototype.

export const commune = '[VOTRE COMMUNE]'

export const risques = ['Inondation', 'Tempête', '[AUTRE RISQUE]']

// Lieux de démonstration, au même format que ceux du serveur
// Coordonnées fictives autour du centre de la commune démo
export const centreCommune: [number, number] = [47.0585, -0.88]

export const lieuxDemo: LieuServeur[] = [
  { id: 'gymnase', type: 'accueil', nom: '[NOM DU GYMNASE]', details: 'ouvert 24 h/24 · repas chauds', distance: '1,2 km', places: 80, ouvert: true, adresse: '[ADRESSE DU GYMNASE]', lat: 47.0612, lng: -0.8745 },
  { id: 'salle', type: 'accueil', nom: '[SALLE DES FÊTES]', details: 'lits de camp', distance: '2,4 km', places: 40, ouvert: false, adresse: '[ADRESSE DE LA SALLE]', lat: 47.0538, lng: -0.8871 },
  { id: 'eau', type: 'eau', nom: '[NOM DU LIEU]', details: 'eau potable en bouteilles', distance: '800 m', places: null, ouvert: true, adresse: "[ADRESSE DU POINT D'EAU]", lat: 47.0581, lng: -0.8802 },
  { id: 'soins', type: 'soins', nom: '[POSTE DE SECOURS]', details: 'Croix-Rouge · premiers soins', distance: '1,5 km', places: null, ouvert: true, adresse: '[ADRESSE DU POSTE]', lat: 47.0634, lng: -0.8856 },
]

// Zone à éviter fictive (bord de rivière inondé), affichée en mode crise de démo
export const zonesDemo: ZoneServeur[] = [
  {
    id: 'zone-demo',
    nom: 'Quartier [BORD DE RIVIÈRE] inondé',
    consigne: 'Ne pas circuler, même à pied : courant fort.',
    points: [
      [47.0569, -0.8838],
      [47.0592, -0.8829],
      [47.0601, -0.8771],
      [47.0583, -0.8752],
      [47.0561, -0.8786],
    ],
  },
]

// Hébergement solidaire chez l'habitant : un nombre, jamais d'adresse privée
export const hebergementsSolidairesDemo = 3

export const libelleLieu: Record<LieuServeur['type'], string> = {
  accueil: "Centre d'accueil",
  eau: "Distribution d'eau",
  soins: 'Secours',
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

// Missions de démonstration : chaque volontaire ne voit que celles de ses catégories d'aide
export const missionsDemo: MissionServeur[] = [
  {
    id: 'demo-vehicule',
    titre: "Distribution d'eau aux habitants du quartier [NOM]",
    coordinateur: '[PRÉNOM]',
    rendez_vous: '15:00',
    duree: '2 h',
    equipe: '4 volontaires',
    ressource: 'Véhicule',
    categorie: 'vehicule',
    lieu: '[SALLE DES FÊTES]',
    consignes: "N'entrez jamais dans une zone inondée. Gilet fourni sur place. Suivez uniquement les consignes du coordinateur.",
  },
  {
    id: 'demo-mainoeuvre',
    titre: 'Déblayer la cour de l’école [NOM]',
    coordinateur: '[PRÉNOM]',
    rendez_vous: '16:30',
    duree: '3 h',
    equipe: '6 volontaires',
    ressource: "Main-d'œuvre",
    categorie: 'mainoeuvre',
    lieu: '[ÉCOLE]',
    consignes: 'Gants et bottes obligatoires. Ne touchez à aucun câble électrique.',
  },
]
