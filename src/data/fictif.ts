import type { LieuServeur, MissionServeur, ZoneRisqueServeur, ZoneServeur } from '../services/serveur'

// Données de démonstration : tout est fictif tant que la phase RGPD n'est pas validée.
// Ne jamais remplacer par de vraies données d'habitants dans ce prototype.

// Maquette adaptée à Cholet (branche maquette/cholet) : habitants, demandes et volontaires restent fictifs
export const commune = 'Cholet'

// Risques repris du DICRIM de Cholet (édition septembre 2022)
export const risques = [
  'Inondation de la Moine',
  'Rupture de barrage (Verdon, Ribou)',
  'Transport de matières dangereuses',
  'Vents violents, canicule, grand froid',
  'Retrait-gonflement des argiles',
  'Séisme (aléa modéré)',
]

// Lieux réels de Cholet : les six centres d'hébergement d'urgence du DICRIM (p. 24) et la Croix-Rouge.
// Positions et adresses tirées d'OpenStreetMap. Places, horaires et ouverture restent un scénario de démo.
export const centreCommune: [number, number] = [47.0525, -0.8835]

export const lieuxDemo: LieuServeur[] = [
  { id: 'rambourg', type: 'accueil', nom: 'Salle Rambourg', details: "centre d'hébergement d'urgence · zone Nord Moine", distance: '1,6 km', places: 80, ouvert: true, adresse: 'Rue de Rambourg, 49300 Cholet', lat: 47.06614, lng: -0.88481 },
  { id: 'mocrat', type: 'accueil', nom: 'Salle polyvalente Mocrat', details: "centre d'hébergement d'urgence · zone Nord Moine", distance: '2,4 km', places: 60, ouvert: false, adresse: 'Avenue de Mocrat, 49300 Cholet', lat: 47.06233, lng: -0.89642 },
  { id: 'jeune-france', type: 'accueil', nom: 'Complexe sportif Jeune France', details: "centre d'hébergement d'urgence · zone Nord Moine", distance: '1,5 km', places: 100, ouvert: false, adresse: '47 Rue Alphonse Darmaillacq, 49300 Cholet', lat: 47.06464, lng: -0.87403 },
  // Pour ces deux centres, le DICRIM ne donne que la rue : position approximative sur la rue
  { id: 'demiannay', type: 'accueil', nom: 'Salle de sports René Demiannay', details: "centre d'hébergement d'urgence · zone Sud Moine", distance: '900 m', places: 50, ouvert: true, adresse: 'Boulevard de Richelieu, 49300 Cholet', lat: 47.04479, lng: -0.87888 },
  { id: 'puy-saint-bonnet', type: 'accueil', nom: 'Salle polyvalente du Puy-Saint-Bonnet', details: "centre d'hébergement d'urgence · zone Sud Moine", distance: '6,3 km', places: 30, ouvert: false, adresse: 'Rue Victor Ménard, Le Puy-Saint-Bonnet, 49300 Cholet', lat: 46.99602, lng: -0.8916 },
  { id: 'eau', type: 'eau', nom: 'Gymnase Joachim du Bellay', details: "eau potable en bouteilles · centre d'hébergement zone Sud Moine", distance: '1,5 km', places: null, ouvert: true, adresse: '2 Square de Liré, 49300 Cholet', lat: 47.03928, lng: -0.88594 },
  { id: 'soins', type: 'soins', nom: 'Croix-Rouge française', details: 'premiers soins', distance: '1,4 km', places: null, ouvert: true, adresse: '22 Rue de la Hollande, 49300 Cholet', lat: 47.05981, lng: -0.871 },
]

// Zone à éviter du scénario de démo, tracée le long du lit de la Moine (tracé OpenStreetMap)
export const zonesDemo: ZoneServeur[] = [
  {
    id: 'zone-demo',
    nom: 'Bords de la Moine inondés',
    consigne: 'Ne pas circuler, même à pied : courant fort.',
    points: [
      [47.0586, -0.889],
      [47.059, -0.8827],
      [47.0572, -0.8792],
      [47.056, -0.8763],
      [47.0546, -0.8774],
      [47.0558, -0.8805],
      [47.0574, -0.883],
      [47.0571, -0.889],
    ],
  },
]

// Zone inondable approximative autour de la Moine : la carte du DICRIM (p. 25) est une image,
// à remplacer par le tracé officiel (TIM ou Géorisques) importé par la mairie
export const zonesRisqueDemo: ZoneRisqueServeur[] = [
  {
    id: 'risque-demo',
    risque: 'Inondation',
    nom: 'Zone inondable de la Moine (tracé approximatif)',
    consigne: "En cas d'alerte crue, rejoignez les points hauts. N'allez pas chercher les enfants à l'école : ils sont pris en charge.",
    source: 'DICRIM de Cholet 2022, tracé approximatif',
    points: [
      [47.0597, -0.8936],
      [47.059, -0.8896],
      [47.0596, -0.8827],
      [47.0578, -0.879],
      [47.0563, -0.876],
      [47.0505, -0.8728],
      [47.049, -0.8755],
      [47.0532, -0.8775],
      [47.0548, -0.878],
      [47.0552, -0.8806],
      [47.0566, -0.8832],
      [47.0566, -0.8896],
      [47.0577, -0.894],
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
  { id: 'competences', label: 'Compétences', detail: 'Secourisme (PSC1, SST)' },
  { id: 'temps', label: 'Temps disponible', detail: 'Soirs et week-ends' },
] as const

export type RessourceId = (typeof ressources)[number]['id']

// Rien de coché d'office : chacun choisit ce qu'il peut vraiment apporter
export const ressourcesParDefaut: RessourceId[] = []

// Missions de démonstration : chaque volontaire ne voit que celles de ses catégories d'aide
export const missionsDemo: MissionServeur[] = [
  {
    id: 'demo-vehicule',
    titre: "Distribution d'eau aux habitants des bords de la Moine",
    coordinateur: 'Julien',
    rendez_vous: '15:00',
    duree: '2 h',
    equipe: '4 volontaires',
    ressource: 'Véhicule',
    categorie: 'vehicule',
    lieu: 'Gymnase Joachim du Bellay',
    consignes: "N'entrez jamais dans une zone inondée. Gilet fourni sur place. Suivez uniquement les consignes du coordinateur.",
  },
  {
    id: 'demo-mainoeuvre',
    titre: 'Déblayer une cour d’école du quartier Val de Moine',
    coordinateur: 'Julien',
    rendez_vous: '16:30',
    duree: '3 h',
    equipe: '6 volontaires',
    ressource: "Main-d'œuvre",
    categorie: 'mainoeuvre',
    lieu: 'Quartier Val de Moine Nord',
    consignes: 'Gants et bottes obligatoires. Ne touchez à aucun câble électrique.',
  },
]
