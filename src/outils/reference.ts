// Référence d'une demande d'aide, lue au téléphone entre l'habitant, la mairie et les secours.
// 6 caractères sans ambiguïté (ni 0/O, ni 1/I/L) : environ 887 millions de possibilités, aucun doublon en pratique.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

export function nouvelleReference() {
  const valeurs = crypto.getRandomValues(new Uint32Array(6))
  const c = [...valeurs].map((v) => ALPHABET[v % ALPHABET.length]).join('')
  return `VG-${c.slice(0, 3)}-${c.slice(3)}`
}
