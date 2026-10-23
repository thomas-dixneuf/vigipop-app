import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { ressourcesParDefaut, type BesoinId, type RessourceId, type SituationId } from '../data/fictif'
import {
  assurerSession,
  COMMUNE_ID,
  heure,
  serveur,
  type CriseServeur,
  type LieuServeur,
  type MissionServeur,
  type StatutDemande,
} from '../services/serveur'

export type Mode = 'veille' | 'crise'

export type Demande = {
  id: string
  reference: string
  situation: SituationId
  besoins: BesoinId[]
  personnes: number
  personneVulnerable: boolean
  position: string
  envoyeeA: string
  // Faux tant que la demande n'a pas pu partir (pas de réseau)
  envoyee: boolean
  statut: StatutDemande
}

export type Utilisateur = {
  prenom: string
  telephone: string
  commune: string
}

export type Alerte = { titre: string; consigne: string; heure: string }

// Réponse du volontaire à la mission proposée par le coordinateur
export type ReponseMission = 'en-attente' | 'acceptee' | 'refusee'

type Etat = {
  mode: Mode
  // Alerte de la mairie ; gardée en mémoire pour rester lisible sans réseau
  alerte: Alerte | null
  lieux: LieuServeur[] | null
  missionServeur: MissionServeur | null
  enSecurite: boolean
  demande: Demande | null
  utilisateur: Utilisateur | null
  ressources: RessourceId[]
  disponible: boolean
  mission: ReponseMission
  // Mission à laquelle se rapporte la réponse : une nouvelle mission repart « en attente »
  missionRepondue: string | null
  // Faux tant que la mairie n'a pas reçu la disponibilité ou la réponse (pas de réseau)
  disponibiliteEnvoyee: boolean
  reponseEnvoyee: boolean
  // Visite guidée de l'accueil, proposée une fois après l'inscription
  visiteAFaire: boolean
  // Compte connu sur ce téléphone, gardé après déconnexion pour simuler le serveur
  dernierUtilisateur: Utilisateur | null
}

type AppStateValue = Etat & {
  basculerMode: () => void
  declarerEnSecurite: () => void
  enregistrerDemande: (demande: Omit<Demande, 'id' | 'statut' | 'envoyee'> & { id?: string }) => void
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
  alerte: null,
  lieux: null,
  missionServeur: null,
  enSecurite: false,
  demande: null,
  utilisateur: null,
  ressources: ressourcesParDefaut,
  disponible: false,
  mission: 'en-attente',
  missionRepondue: null,
  disponibiliteEnvoyee: true,
  reponseEnvoyee: true,
  visiteAFaire: false,
  dernierUtilisateur: null,
}

// Mode démo local : alerte fictive affichée quand on simule la crise
const alerteDemo: Alerte = {
  titre: 'Crue de [RIVIÈRE] — vigilance rouge',
  consigne: "montez à l'étage, ne prenez pas votre voiture.",
  heure: '14:05',
}

function lireEtat(): Etat {
  try {
    const brut = localStorage.getItem(CLE_STOCKAGE)
    if (!brut) return etatInitial
    const etat = { ...etatInitial, ...JSON.parse(brut) } as Etat
    // Demandes enregistrées par une version précédente du prototype
    if (etat.demande && !etat.demande.id) etat.demande = { ...etat.demande, id: crypto.randomUUID(), statut: 'transmise' }
    return etat
  } catch {
    return etatInitial
  }
}

// Fin de crise : on efface tout ce qui était propre à cet événement
function finDeCrise(e: Etat): Etat {
  return {
    ...e,
    mode: 'veille',
    alerte: null,
    enSecurite: false,
    demande: null,
    disponible: false,
    mission: 'en-attente',
    missionRepondue: null,
    disponibiliteEnvoyee: true,
    reponseEnvoyee: true,
  }
}

const AppStateContext = createContext<AppStateValue | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [etat, setEtat] = useState<Etat>(lireEtat)
  const [enLigne, setEnLigne] = useState(navigator.onLine)

  useEffect(() => {
    try {
      localStorage.setItem(CLE_STOCKAGE, JSON.stringify(etat))
    } catch {
      // Stockage indisponible (navigation privée) : l'app reste utilisable
    }
  }, [etat])

  useEffect(() => {
    const maj = () => setEnLigne(navigator.onLine)
    window.addEventListener('online', maj)
    window.addEventListener('offline', maj)
    return () => {
      window.removeEventListener('online', maj)
      window.removeEventListener('offline', maj)
    }
  }, [])

  // ─── Ce que décide la mairie : crise, lieux ouverts, mission ───
  const chargerCommune = useCallback(async () => {
    if (!serveur) return
    const [crise, lieux, mission] = await Promise.all([
      serveur.from('crises').select('id, titre, consigne, active, declenchee_a').eq('commune_id', COMMUNE_ID).eq('active', true).maybeSingle(),
      serveur.from('lieux').select('id, type, nom, details, distance, places, ouvert').eq('commune_id', COMMUNE_ID).order('nom'),
      serveur.from('missions').select('id, titre, rendez_vous, duree, lieu, coordinateur, ressource, equipe, consignes').eq('commune_id', COMMUNE_ID).eq('active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])
    // Sans réseau, on garde la dernière situation connue
    if (crise.error || lieux.error || mission.error) return
    const active = crise.data as CriseServeur | null
    const missionServeur = mission.data as MissionServeur | null
    setEtat((e) => {
      const suite = { ...e, lieux: lieux.data as LieuServeur[], missionServeur }
      // La mairie a remplacé ou clos la mission : la réponse précédente ne vaut plus
      if (e.missionRepondue && e.missionRepondue !== missionServeur?.id) {
        Object.assign(suite, { mission: 'en-attente', missionRepondue: null, reponseEnvoyee: true })
      }
      if (active) {
        return { ...suite, mode: 'crise', alerte: { titre: active.titre, consigne: active.consigne, heure: heure(active.declenchee_a) } }
      }
      return e.mode === 'crise' ? finDeCrise(suite) : suite
    })
  }, [])

  useEffect(() => {
    if (!serveur) return
    const client = serveur
    // Chargement initial, puis à chaque changement côté mairie (asynchrone : faux positif du linter)
    // eslint-disable-next-line react/set-state-in-effect
    void chargerCommune()
    const filtre = `commune_id=eq.${COMMUNE_ID}`
    const canal = client
      .channel(`commune-${COMMUNE_ID}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crises', filter: filtre }, () => void chargerCommune())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lieux', filter: filtre }, () => void chargerCommune())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'missions', filter: filtre }, () => void chargerCommune())
      .subscribe()
    const auRetour = () => document.visibilityState === 'visible' && void chargerCommune()
    document.addEventListener('visibilitychange', auRetour)
    window.addEventListener('online', chargerCommune)
    return () => {
      void client.removeChannel(canal)
      document.removeEventListener('visibilitychange', auRetour)
      window.removeEventListener('online', chargerCommune)
    }
  }, [chargerCommune])

  // ─── Envoi (et renvoi) de la demande d'aide ───
  const demande = etat.demande
  useEffect(() => {
    if (!demande || demande.envoyee || !enLigne) return
    let annule = false
    const marquer = () =>
      !annule &&
      setEtat((e) => (e.demande?.id === demande.id ? { ...e, demande: { ...e.demande, envoyee: true, envoyeeA: heure(new Date().toISOString()) } } : e))
    if (!serveur) {
      marquer()
      return
    }
    const client = serveur
    ;(async () => {
      try {
        await assurerSession(client)
        const { error } = await client.from('demandes').upsert({
          id: demande.id,
          commune_id: COMMUNE_ID,
          reference: demande.reference,
          situation: demande.situation,
          besoins: demande.besoins,
          personnes: demande.personnes,
          personne_vulnerable: demande.personneVulnerable,
          position: demande.position,
        })
        if (!error) marquer()
      } catch {
        // Réseau instable : nouvel essai au prochain retour en ligne
      }
    })()
    return () => {
      annule = true
    }
  }, [demande, enLigne])

  // ─── Suivi en direct du statut décidé par la mairie ───
  const idSuivi = demande?.envoyee ? demande.id : null
  useEffect(() => {
    if (!serveur || !idSuivi) return
    const client = serveur
    const appliquer = (statut: StatutDemande) =>
      setEtat((e) => (e.demande?.id === idSuivi ? { ...e, demande: { ...e.demande, statut } } : e))
    void client
      .from('demandes')
      .select('statut')
      .eq('id', idSuivi)
      .maybeSingle()
      .then(({ data }) => data && appliquer(data.statut as StatutDemande))
    const canal = client
      .channel(`demande-${idSuivi}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'demandes', filter: `id=eq.${idSuivi}` }, (p) =>
        appliquer((p.new as { statut: StatutDemande }).statut),
      )
      .subscribe()
    return () => {
      void client.removeChannel(canal)
    }
  }, [idSuivi])

  // ─── Disponibilité du volontaire, transmise à la mairie (renvoyée au retour du réseau) ───
  const { utilisateur, disponible, ressources, disponibiliteEnvoyee } = etat
  useEffect(() => {
    if (disponibiliteEnvoyee || !enLigne || !utilisateur) return
    let annule = false
    const marquer = () => !annule && setEtat((e) => ({ ...e, disponibiliteEnvoyee: true }))
    if (!serveur) {
      marquer()
      return
    }
    const client = serveur
    ;(async () => {
      try {
        const auteur = await assurerSession(client)
        const { error } = await client
          .from('volontaires')
          .upsert({ auteur, commune_id: COMMUNE_ID, prenom: utilisateur.prenom, ressources, disponible })
        if (!error) marquer()
      } catch {
        // Nouvel essai au prochain retour en ligne
      }
    })()
    return () => {
      annule = true
    }
  }, [disponibiliteEnvoyee, enLigne, utilisateur, disponible, ressources])

  // ─── Réponse à la mission proposée par la mairie ───
  const { mission: reponse, missionRepondue, reponseEnvoyee } = etat
  useEffect(() => {
    if (reponseEnvoyee || !enLigne || reponse === 'en-attente' || !missionRepondue) return
    let annule = false
    const marquer = () => !annule && setEtat((e) => ({ ...e, reponseEnvoyee: true }))
    if (!serveur) {
      marquer()
      return
    }
    const client = serveur
    ;(async () => {
      try {
        const auteur = await assurerSession(client)
        const { error } = await client
          .from('reponses_mission')
          .upsert({ mission_id: missionRepondue, auteur, prenom: utilisateur?.prenom ?? '', reponse })
        if (!error) marquer()
      } catch {
        // Nouvel essai au prochain retour en ligne
      }
    })()
    return () => {
      annule = true
    }
  }, [reponseEnvoyee, enLigne, reponse, missionRepondue, utilisateur])

  const value: AppStateValue = {
    ...etat,
    // Mode démo local uniquement : avec le serveur, c'est la mairie qui déclenche la crise
    basculerMode: () =>
      setEtat((e) => (e.mode === 'veille' ? { ...e, mode: 'crise', alerte: alerteDemo, enSecurite: false } : finDeCrise(e))),
    declarerEnSecurite: () => setEtat((e) => ({ ...e, enSecurite: true })),
    enregistrerDemande: ({ id, ...demande }) =>
      setEtat((e) => ({
        ...e,
        enSecurite: false,
        // « Ma situation a changé » : même demande, mise à jour côté mairie
        demande: { ...demande, id: id ?? crypto.randomUUID(), statut: id && e.demande?.id === id ? e.demande.statut : 'transmise', envoyee: false },
      })),
    connecter: (utilisateur, nouveauCompte) =>
      setEtat((e) => ({ ...e, utilisateur, dernierUtilisateur: utilisateur, visiteAFaire: nouveauCompte })),
    lancerVisite: () => setEtat((e) => ({ ...e, visiteAFaire: true })),
    terminerVisite: () => setEtat((e) => ({ ...e, visiteAFaire: false })),
    deconnecter: () => setEtat((e) => ({ ...e, utilisateur: null, visiteAFaire: false })),
    basculerRessource: (id) =>
      setEtat((e) => ({
        ...e,
        disponibiliteEnvoyee: e.disponibiliteEnvoyee && !e.disponible,
        ressources: e.ressources.includes(id) ? e.ressources.filter((r) => r !== id) : [...e.ressources, id],
      })),
    seRendreDisponible: () =>
      setEtat((e) => ({ ...e, disponible: true, disponibiliteEnvoyee: false, mission: 'en-attente', missionRepondue: null })),
    repondreMission: (reponse) =>
      setEtat((e) => ({
        ...e,
        mission: reponse,
        missionRepondue: e.missionServeur?.id ?? 'demo',
        reponseEnvoyee: false,
        disponible: reponse === 'acceptee',
        disponibiliteEnvoyee: reponse === 'acceptee' ? e.disponibiliteEnvoyee : false,
      })),
    reinitialiser: () => setEtat(etatInitial),
  }

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState doit être utilisé dans AppStateProvider')
  return ctx
}
