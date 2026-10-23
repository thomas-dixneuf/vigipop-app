import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { ressourcesParDefaut, type BesoinId, type RessourceId, type SituationId } from '../data/fictif'

export type Mode = 'veille' | 'crise'

export type Demande = {
  reference: string
  situation: SituationId
  besoins: BesoinId[]
  personnes: number
  personneVulnerable: boolean
  position: string
  envoyeeA: string
  // Faux tant que la demande n'a pas pu partir (pas de réseau)
  envoyee: boolean
}

export type Utilisateur = {
  prenom: string
  telephone: string
  commune: string
}

// Réponse du volontaire à la mission proposée par le coordinateur
export type ReponseMission = 'en-attente' | 'acceptee' | 'refusee'

type Etat = {
  mode: Mode
  enSecurite: boolean
  demande: Demande | null
  utilisateur: Utilisateur | null
  ressources: RessourceId[]
  disponible: boolean
  mission: ReponseMission
  // Visite guidée de l'accueil, proposée une fois après l'inscription
  visiteAFaire: boolean
  // Compte connu sur ce téléphone, gardé après déconnexion pour simuler le serveur
  dernierUtilisateur: Utilisateur | null
}

type AppStateValue = Etat & {
  basculerMode: () => void
  declarerEnSecurite: () => void
  enregistrerDemande: (demande: Demande) => void
  marquerEnvoyee: () => void
  connecter: (utilisateur: Utilisateur, nouveauCompte: boolean) => void
  lancerVisite: () => void
  terminerVisite: () => void
  deconnecter: () => void
  basculerRessource: (id: RessourceId) => void
  seRendreDisponible: () => void
  repondreMission: (reponse: 'acceptee' | 'refusee') => void
  reinitialiser: () => void
}

const CLE_STOCKAGE = 'vigipop-demo'
const etatInitial: Etat = {
  mode: 'veille',
  enSecurite: false,
  demande: null,
  utilisateur: null,
  ressources: ressourcesParDefaut,
  disponible: false,
  mission: 'en-attente',
  visiteAFaire: false,
  dernierUtilisateur: null,
}

function lireEtat(): Etat {
  try {
    const brut = localStorage.getItem(CLE_STOCKAGE)
    return brut ? { ...etatInitial, ...JSON.parse(brut) } : etatInitial
  } catch {
    return etatInitial
  }
}

const AppStateContext = createContext<AppStateValue | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [etat, setEtat] = useState<Etat>(lireEtat)

  useEffect(() => {
    try {
      localStorage.setItem(CLE_STOCKAGE, JSON.stringify(etat))
    } catch {
      // Stockage indisponible (navigation privée) : l'app reste utilisable
    }
  }, [etat])

  const value: AppStateValue = {
    ...etat,
    // En vrai, c'est la mairie qui déclenche la crise ; ici un bouton démo suffit
    // Fin de crise : on efface tout ce qui était propre à cet événement
    basculerMode: () =>
      setEtat((e) => ({
        ...e,
        mode: e.mode === 'veille' ? 'crise' : 'veille',
        enSecurite: false,
        demande: null,
        disponible: false,
        mission: 'en-attente',
      })),
    declarerEnSecurite: () => setEtat((e) => ({ ...e, enSecurite: true })),
    enregistrerDemande: (demande) => setEtat((e) => ({ ...e, demande, enSecurite: false })),
    marquerEnvoyee: () =>
      setEtat((e) => (e.demande ? { ...e, demande: { ...e.demande, envoyee: true } } : e)),
    connecter: (utilisateur, nouveauCompte) =>
      setEtat((e) => ({ ...e, utilisateur, dernierUtilisateur: utilisateur, visiteAFaire: nouveauCompte })),
    lancerVisite: () => setEtat((e) => ({ ...e, visiteAFaire: true })),
    terminerVisite: () => setEtat((e) => ({ ...e, visiteAFaire: false })),
    deconnecter: () => setEtat((e) => ({ ...e, utilisateur: null, visiteAFaire: false })),
    basculerRessource: (id) =>
      setEtat((e) => ({
        ...e,
        ressources: e.ressources.includes(id) ? e.ressources.filter((r) => r !== id) : [...e.ressources, id],
      })),
    seRendreDisponible: () => setEtat((e) => ({ ...e, disponible: true, mission: 'en-attente' })),
    repondreMission: (reponse) =>
      setEtat((e) => ({ ...e, mission: reponse, disponible: reponse === 'acceptee' })),
    reinitialiser: () => setEtat(etatInitial),
  }

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState doit être utilisé dans AppStateProvider')
  return ctx
}
