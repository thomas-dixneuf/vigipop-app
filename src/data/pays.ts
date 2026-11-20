// Pays proposés à la création du compte. Les communes ne sont vérifiées (Base Adresse Nationale)
// qu'en France, où Vigipop est déployé ; ailleurs, la commune est tapée librement.
export type Pays = { code: string; nom: string; indicatif: string }

export const PAYS: Pays[] = [
  { code: 'FR', nom: 'France', indicatif: '33' },
  { code: 'BE', nom: 'Belgique', indicatif: '32' },
  { code: 'CH', nom: 'Suisse', indicatif: '41' },
  { code: 'LU', nom: 'Luxembourg', indicatif: '352' },
  { code: 'MC', nom: 'Monaco', indicatif: '377' },
  { code: 'AD', nom: 'Andorre', indicatif: '376' },
  { code: 'DE', nom: 'Allemagne', indicatif: '49' },
  { code: 'ES', nom: 'Espagne', indicatif: '34' },
  { code: 'IT', nom: 'Italie', indicatif: '39' },
  { code: 'PT', nom: 'Portugal', indicatif: '351' },
  { code: 'NL', nom: 'Pays-Bas', indicatif: '31' },
  { code: 'GB', nom: 'Royaume-Uni', indicatif: '44' },
  { code: 'CA', nom: 'Canada', indicatif: '1' },
  { code: 'MA', nom: 'Maroc', indicatif: '212' },
  { code: 'DZ', nom: 'Algérie', indicatif: '213' },
  { code: 'TN', nom: 'Tunisie', indicatif: '216' },
  { code: 'SN', nom: 'Sénégal', indicatif: '221' },
  { code: 'CI', nom: "Côte d'Ivoire", indicatif: '225' },
]

export const PAYS_PAR_DEFAUT = 'FR'

export const paysDe = (code?: string) => PAYS.find((p) => p.code === (code || PAYS_PAR_DEFAUT)) ?? PAYS[0]
