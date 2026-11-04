import type { LieuServeur, MissionServeur, ZoneRisqueServeur, ZoneServeur } from '../services/serveur'

// Données de démonstration : tout est fictif tant que la phase RGPD n'est pas validée.
// Ne jamais remplacer par de vraies données d'habitants dans ce prototype.

// Maquette adaptée à Cholet (branche maquette/cholet) : habitants, demandes et volontaires restent fictifs
export const commune = 'Cholet'

// Tous les risques du DICRIM de Cholet (3e édition, 2021), plus les installations industrielles
// soumises à autorisation ou classées Seveso recensées par Géorisques (consulté le 04/11/2026).
// Michelin retiré : usine de Cholet fermée (production arrêtée fin 2025), même si Géorisques la liste encore.
export const risques = [
  'Inondation de la Moine',
  'Rupture de barrage (Verdon, Ribou)',
  'Transport de matières dangereuses',
  'Risque industriel (Charal, entrepôt Carrefour Supply Chain)',
  "Dépôt d'explosifs (Puy-Saint-Bonnet)",
  'Vents violents, orages, canicule, grand froid',
  'Retrait-gonflement des argiles',
  'Séisme (aléa modéré)',
  'Radon',
  'Pollution des sols (SIS)',
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

// Zones exposées d'après la carte du DICRIM de Cholet (p. 25, « Zones inondables de la Moine et zones
// submergées en cas de rupture du barrage »), recalées sur le tracé OpenStreetMap de la Moine entre le
// barrage de Ribou et l'ouest de la ville. Tracé approximatif : la carte du DICRIM est une image et l'AZI
// de la Moine (DDT 49, 2004) n'est pas diffusé en flux. À remplacer par le fichier officiel de la mairie.
export const zonesRisqueDemo: ZoneRisqueServeur[] = [
  {
    id: 'risque-inondation-moine',
    risque: 'Inondation',
    nom: 'Zone inondable de la Moine',
    consigne: "En cas d'alerte crue, rejoignez les points hauts. N'allez pas chercher les enfants à l'école : ils sont pris en charge.",
    source: 'DICRIM de Cholet 2022 et AZI de la Moine, tracé approximatif',
    points: [
      [47.05377, -0.92522], [47.05471, -0.92592], [47.05529, -0.92534], [47.05525, -0.92454], [47.05471, -0.92365], [47.05496, -0.92269],
      [47.05531, -0.92219], [47.05532, -0.92128], [47.05567, -0.92021], [47.05611, -0.91988], [47.05631, -0.91884], [47.05661, -0.91858],
      [47.05731, -0.91668], [47.05745, -0.91467], [47.05714, -0.9131], [47.05584, -0.91138], [47.0554, -0.91124], [47.05499, -0.91147],
      [47.05476, -0.91181], [47.05469, -0.91247], [47.05351, -0.91185], [47.05239, -0.91006], [47.05244, -0.90875], [47.05338, -0.90883],
      [47.05402, -0.90842], [47.05495, -0.9084], [47.05564, -0.90781], [47.05573, -0.90666], [47.05596, -0.90614], [47.05593, -0.90523],
      [47.05621, -0.90452], [47.05605, -0.9036], [47.05704, -0.89983], [47.05756, -0.89988], [47.05788, -0.89956], [47.05811, -0.89844],
      [47.05863, -0.89781], [47.05896, -0.89675], [47.05931, -0.89332], [47.05831, -0.89157], [47.05819, -0.89098], [47.05847, -0.88946],
      [47.05799, -0.8886], [47.05777, -0.88771], [47.05831, -0.88451], [47.05881, -0.8828], [47.05838, -0.88032], [47.058, -0.87981],
      [47.05711, -0.87922], [47.05572, -0.87616], [47.05515, -0.87587], [47.05486, -0.87598], [47.05397, -0.87515], [47.05302, -0.87523],
      [47.05185, -0.87338], [47.05003, -0.87319], [47.04901, -0.87152], [47.04827, -0.87116], [47.04771, -0.86982], [47.04709, -0.86963],
      [47.04683, -0.86817], [47.04709, -0.86768], [47.04716, -0.86703], [47.04757, -0.86638], [47.0478, -0.864], [47.0476, -0.86322],
      [47.04696, -0.86234], [47.04626, -0.86215], [47.04583, -0.86274], [47.04497, -0.86309], [47.04329, -0.86311], [47.04288, -0.86253],
      [47.04224, -0.86244], [47.04123, -0.86135], [47.0406, -0.86124], [47.04002, -0.86164], [47.0396, -0.86148], [47.0393, -0.86072],
      [47.03885, -0.86043], [47.0384, -0.86054], [47.03719, -0.85923], [47.03582, -0.85898], [47.03566, -0.85834], [47.03505, -0.85795],
      [47.03433, -0.85656], [47.0339, -0.85636], [47.03352, -0.8557], [47.03315, -0.85563], [47.03249, -0.85458], [47.03112, -0.85365],
      [47.03045, -0.85366], [47.03008, -0.85417], [47.02961, -0.85401], [47.02904, -0.85437], [47.02846, -0.85428], [47.02813, -0.85458],
      [47.02738, -0.85352], [47.02648, -0.85315], [47.02596, -0.85332], [47.02545, -0.85195], [47.02461, -0.85178], [47.02397, -0.8494],
      [47.02447, -0.84834], [47.02446, -0.84763], [47.02411, -0.84714], [47.02362, -0.84715], [47.02267, -0.84896], [47.02291, -0.85092],
      [47.02362, -0.85298], [47.02402, -0.85348], [47.02472, -0.85372], [47.02481, -0.85433], [47.02515, -0.85485], [47.02604, -0.85537],
      [47.02657, -0.85523], [47.02697, -0.85549], [47.02731, -0.85617], [47.02797, -0.85653], [47.02862, -0.8563], [47.02918, -0.85657],
      [47.02975, -0.85622], [47.03034, -0.85641], [47.03103, -0.85567], [47.03161, -0.856], [47.03279, -0.85795], [47.03364, -0.85821],
      [47.03435, -0.85964], [47.03444, -0.86055], [47.03472, -0.86095], [47.03557, -0.86129], [47.03664, -0.86093], [47.03713, -0.86133],
      [47.03732, -0.86224], [47.03847, -0.86252], [47.0391, -0.86341], [47.04015, -0.86356], [47.04077, -0.86312], [47.04124, -0.86361],
      [47.04156, -0.8644], [47.04193, -0.86459], [47.04238, -0.86439], [47.043, -0.86497], [47.044, -0.86504], [47.04453, -0.86483],
      [47.04509, -0.86508], [47.04571, -0.86462], [47.0464, -0.86472], [47.04642, -0.86519], [47.04527, -0.86724], [47.0453, -0.86795],
      [47.04566, -0.86889], [47.04614, -0.87128], [47.04637, -0.87157], [47.047, -0.8716], [47.04757, -0.8728], [47.04832, -0.87307],
      [47.04952, -0.87496], [47.05128, -0.87533], [47.05251, -0.87701], [47.05292, -0.87718], [47.05362, -0.87699], [47.05459, -0.87798],
      [47.05511, -0.87808], [47.0558, -0.87939], [47.05613, -0.88052], [47.05732, -0.88137], [47.05752, -0.88263], [47.05666, -0.88608],
      [47.05651, -0.88785], [47.05713, -0.88997], [47.0569, -0.89088], [47.05711, -0.89221], [47.058, -0.894], [47.05758, -0.89544],
      [47.05767, -0.89659], [47.05706, -0.89719], [47.05674, -0.89785], [47.05629, -0.89808], [47.05587, -0.89889], [47.05473, -0.9035],
      [47.05477, -0.90425], [47.05451, -0.9048], [47.05459, -0.90552], [47.05435, -0.90652], [47.05374, -0.9065], [47.05323, -0.90697],
      [47.05168, -0.90698], [47.05112, -0.9074], [47.05087, -0.90824], [47.05125, -0.9109], [47.05269, -0.91327], [47.05477, -0.91447],
      [47.0554, -0.91448], [47.05588, -0.91411], [47.0561, -0.91427], [47.05615, -0.91567], [47.05505, -0.91814], [47.05445, -0.91842],
      [47.05413, -0.91894], [47.05401, -0.91963], [47.05424, -0.92027], [47.05405, -0.92124], [47.05358, -0.92154], [47.05334, -0.9222],
      [47.05339, -0.92399],
    ],
  },
  {
    id: 'risque-rupture-barrage',
    risque: 'Rupture de barrage',
    nom: 'Zone submergée en cas de rupture des barrages du Verdon et de Ribou',
    consigne: "Gagnez immédiatement les points hauts les plus proches ou, à défaut, les étages supérieurs d'un immeuble élevé et solide.",
    source: 'DICRIM de Cholet 2022 (PPI Verdon), tracé approximatif',
    points: [
      [47.05196, -0.92155], [47.05196, -0.92439], [47.05271, -0.92665], [47.05394, -0.92783], [47.05553, -0.92778], [47.05663, -0.9261],
      [47.05678, -0.92494], [47.05644, -0.92345], [47.05678, -0.92177], [47.05757, -0.92034], [47.05882, -0.91661], [47.05889, -0.91442],
      [47.05843, -0.91212], [47.05651, -0.90952], [47.05715, -0.90811], [47.05766, -0.90334], [47.05812, -0.90178], [47.05888, -0.9011],
      [47.06003, -0.89854], [47.06074, -0.89447], [47.06069, -0.89267], [47.05982, -0.89081], [47.0599, -0.88914], [47.05929, -0.88744],
      [47.06025, -0.88299], [47.05974, -0.87955], [47.05914, -0.87842], [47.05824, -0.87767], [47.05665, -0.87454], [47.05366, -0.87303],
      [47.05223, -0.87135], [47.05078, -0.87119], [47.04921, -0.86933], [47.04851, -0.86812], [47.04916, -0.86576], [47.0491, -0.86292],
      [47.0485, -0.8615], [47.04763, -0.86047], [47.04589, -0.86011], [47.04483, -0.86091], [47.04377, -0.86098], [47.04201, -0.85958],
      [47.04028, -0.85919], [47.03673, -0.85691], [47.03324, -0.85277], [47.03145, -0.8516], [47.02859, -0.85216], [47.02687, -0.85112],
      [47.0256, -0.84972], [47.02596, -0.84794], [47.02532, -0.84581], [47.02383, -0.84497], [47.02304, -0.84522], [47.02162, -0.84731],
      [47.02121, -0.84955], [47.02228, -0.85388], [47.02408, -0.85631], [47.02773, -0.85861], [47.03106, -0.85824], [47.03181, -0.85951],
      [47.03277, -0.86019], [47.03317, -0.86154], [47.03427, -0.863], [47.03605, -0.86324], [47.03638, -0.86385], [47.03876, -0.86546],
      [47.04038, -0.8656], [47.04093, -0.8663], [47.04388, -0.86711], [47.04391, -0.86852], [47.04496, -0.8725], [47.04901, -0.87693],
      [47.05056, -0.87728], [47.05163, -0.87873], [47.05329, -0.87921], [47.05425, -0.87998], [47.05472, -0.88132], [47.05588, -0.88275],
      [47.05523, -0.88583], [47.05507, -0.88814], [47.05564, -0.89245], [47.05638, -0.89435], [47.05616, -0.89558], [47.05479, -0.89737],
      [47.0531, -0.90464], [47.05056, -0.90541], [47.0495, -0.90738], [47.04972, -0.9109], [47.05032, -0.91267], [47.05189, -0.91504],
      [47.05406, -0.91636], [47.05324, -0.91719], [47.05262, -0.91874], [47.0526, -0.92002],
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
