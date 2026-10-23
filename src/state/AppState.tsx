import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { BesoinId, SituationId } from '../data/fictif'

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

type Etat = {
  mode: Mode
  enSecurite: boolean
  demande: Demande | null
}

type AppStateValue = Etat & {
  basculerMode: () => void
  declarerEnSecurite: () => void
  enregistrerDemande: (demande: Demande) => void
  marquerEnvoyee: () => void
  reinitialiser: () => void
}

const CLE_STOCKAGE = 'vigipop-demo'
const etatInitial: Etat = { mode: 'veille', enSecurite: false, demande: null }

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
    basculerMode: () =>
      setEtat((e) => ({ ...e, mode: e.mode === 'veille' ? 'crise' : 'veille', enSecurite: false })),
    declarerEnSecurite: () => setEtat((e) => ({ ...e, enSecurite: true })),
    enregistrerDemande: (demande) => setEtat((e) => ({ ...e, demande, enSecurite: false })),
    marquerEnvoyee: () =>
      setEtat((e) => (e.demande ? { ...e, demande: { ...e.demande, envoyee: true } } : e)),
    reinitialiser: () => setEtat(etatInitial),
  }

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState doit être utilisé dans AppStateProvider')
  return ctx
}
