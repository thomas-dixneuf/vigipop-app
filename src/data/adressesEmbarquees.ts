import type { ResultatAdresse } from '../outils/carte'
import { centreCommune, commune, communesDemo } from './fictif'

// Liste de secours, embarquée dans l'app : utilisée quand la Base Adresse Nationale ne répond pas
// (pas de réseau, maquette publiée sans accès à Internet). Les choix restent ainsi vérifiés.
// Prototype générique : adresses FICTIVES de la commune démo ; une maquette de ville met ici ses rues.

const [lat, lng] = centreCommune
const rues = [
  'rue des Lilas',
  'rue de la Mairie',
  'avenue de la Gare',
  'place de l’Église',
  'rue du Moulin',
  'chemin des Prés',
  'boulevard de la République',
  'rue Victor Hugo',
  'impasse des Tilleuls',
  'rue Pasteur',
]

export const adressesEmbarquees: ResultatAdresse[] = rues.flatMap((rue, i) =>
  [1, 8, 15, 24].map((numero, j) => ({
    libelle: `${numero} ${rue} ${commune}`,
    lat: lat + (i - 5) * 0.0012 + j * 0.0002,
    lng: lng + (j - 2) * 0.0015 + i * 0.0003,
  })),
)

// Communes : la commune démo, la ville voisine fictive et les grandes villes (centre approximatif)
export const communesEmbarquees: ResultatAdresse[] = [
  { libelle: commune, lat, lng },
  ...communesDemo.map((c) => ({ libelle: c.nom, lat: c.centre[0], lng: c.centre[1] })),
  { libelle: 'Angers', lat: 47.4736, lng: -0.5542 },
  { libelle: 'Bordeaux', lat: 44.8378, lng: -0.5792 },
  { libelle: 'Brest', lat: 48.3904, lng: -4.4861 },
  { libelle: 'Caen', lat: 49.1829, lng: -0.3707 },
  { libelle: 'Cholet', lat: 47.0599, lng: -0.8797 },
  { libelle: 'Clermont-Ferrand', lat: 45.7772, lng: 3.087 },
  { libelle: 'Dijon', lat: 47.322, lng: 5.0415 },
  { libelle: 'Grenoble', lat: 45.1885, lng: 5.7245 },
  { libelle: 'La Rochelle', lat: 46.1603, lng: -1.1511 },
  { libelle: 'La Roche-sur-Yon', lat: 46.6705, lng: -1.426 },
  { libelle: 'Le Havre', lat: 49.4944, lng: 0.1079 },
  { libelle: 'Le Mans', lat: 48.0061, lng: 0.1996 },
  { libelle: 'Lille', lat: 50.6292, lng: 3.0573 },
  { libelle: 'Limoges', lat: 45.8336, lng: 1.2611 },
  { libelle: 'Lyon', lat: 45.764, lng: 4.8357 },
  { libelle: 'Marseille', lat: 43.2965, lng: 5.3698 },
  { libelle: 'Metz', lat: 49.1193, lng: 6.1757 },
  { libelle: 'Montpellier', lat: 43.6108, lng: 3.8767 },
  { libelle: 'Nantes', lat: 47.2184, lng: -1.5536 },
  { libelle: 'Nice', lat: 43.7102, lng: 7.262 },
  { libelle: 'Niort', lat: 46.3237, lng: -0.4588 },
  { libelle: 'Orléans', lat: 47.9029, lng: 1.9093 },
  { libelle: 'Paris', lat: 48.8566, lng: 2.3522 },
  { libelle: 'Perpignan', lat: 42.6887, lng: 2.8948 },
  { libelle: 'Poitiers', lat: 46.5802, lng: 0.3404 },
  { libelle: 'Reims', lat: 49.2583, lng: 4.0317 },
  { libelle: 'Rennes', lat: 48.1173, lng: -1.6778 },
  { libelle: 'Rouen', lat: 49.4432, lng: 1.0999 },
  { libelle: 'Saint-Étienne', lat: 45.4397, lng: 4.3872 },
  { libelle: 'Saumur', lat: 47.26, lng: -0.0769 },
  { libelle: 'Strasbourg', lat: 48.5734, lng: 7.7521 },
  { libelle: 'Toulon', lat: 43.1242, lng: 5.928 },
  { libelle: 'Toulouse', lat: 43.6047, lng: 1.4442 },
  { libelle: 'Tours', lat: 47.3941, lng: 0.6848 },
]
