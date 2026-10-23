// Styles et validations partagés par l'inscription et la connexion

export const champ = {
  height: 52,
  border: '2px solid var(--bordure)',
  borderRadius: 12,
  padding: '0 14px',
  fontSize: 16,
  background: 'var(--blanc)',
} as const

export const libelle = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 700 } as const

// Numéro mobile français : 06 / 07, ou +33 6 / +33 7
export function numeroValide(numero: string) {
  return /^(?:0|\+33)[67]\d{8}$/.test(numero.replace(/[\s.-]/g, ''))
}

// Ce que l'écran du code reçoit de l'inscription ou de la connexion
export type EtatCode = {
  prenom: string
  telephone: string
  commune: string
  nouveauCompte: boolean
}
