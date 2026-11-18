// Commune choisie à l'inscription : « Cholet (49300) » → « Cholet »
export function nomDeCommune(libelle: string): string {
  return libelle.replace(/\s*\(.*\)\s*$/, '').trim()
}

const cle = (nom: string) =>
  nomDeCommune(nom)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[-'’\s]+/g, ' ')
    .trim()
    .toLowerCase()

export function memeCommune(a: string, b: string): boolean {
  return cle(a) !== '' && cle(a) === cle(b)
}

// Nom fictif de démonstration (« [VOTRE COMMUNE] ») : toute commune choisie y est rattachée
export const communeFictive = (nom: string) => nom.trim().startsWith('[')
