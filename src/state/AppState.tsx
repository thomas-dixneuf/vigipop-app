import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { commune as communeDemo, missionsDemo, ressourcesParDefaut, type BesoinId, type RessourceId, type SituationId } from '../data/fictif'
import {
  assurerSession,
  COMMUNE_ID,
  heure,
  serveur,
  type CriseServeur,
  type LieuServeur,
  type MissionServeur,
  type ZoneServeur,
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
  // Pour que la mairie puisse rappeler ; facultatif, jamais bloquant
  prenom: string
  telephone: string
  envoyeeA: string
  // Faux tant que la demande n'a pas pu partir (pas de réseau)
  envoyee: boolean
  statut: StatutDemande
  // Ce que la mairie a prévu (« aide organisée »)
  reponseMairie?: string
}

export type Utilisateur = {
  prenom: string
  // Nom de famille : facultatif, complété dans « Mes informations »
  nom?: string
  telephone: string
  commune: string
}

// Ce qu'une personne sans compte a déjà saisi : repris pour pré-remplir l'inscription
export type Contact = { prenom: string; telephone: string }

// Logement proposé par un volontaire hébergeur : visible par la mairie seulement
export type Accueil = { places: number; adresse: string; lat: number | null; lng: number | null }

// Notification de l'app : la clé évite d'annoncer deux fois le même événement
export type NotificationApp = { cle: string; titre: string; texte: string; lien: string; heure: string; lue: boolean; urgente?: boolean }

export type Alerte = { titre: string; consigne: string; heure: string; id?: string }

// Réponse du volontaire à la mission proposée par le coordinateur
export type ReponseMission = 'en-attente' | 'acceptee'
type ReponseAEnvoyer = { mission: string; reponse: 'acceptee' | 'refusee' }

type Etat = {
  mode: Mode
  // Alerte de la mairie ; gardée en mémoire pour rester lisible sans réseau
  alerte: Alerte | null
  lieux: LieuServeur[] | null
  // Zones à éviter tracées par la mairie (null : pas encore chargées, mode démo)
  zones: ZoneServeur[] | null
  // Missions ouvertes par la mairie (toutes catégories)
  missions: MissionServeur[]
  enSecurite: boolean
  demande: Demande | null
  utilisateur: Utilisateur | null
  contact: Contact | null
  ressources: RessourceId[]
  accueil: Accueil
  disponible: boolean
  missionAcceptee: string | null
  // Missions déclinées : la suivante de ses catégories est proposée à la place
  missionsRefusees: string[]
  // Faux tant que la mairie n'a pas reçu la disponibilité (pas de réseau)
  disponibiliteEnvoyee: boolean
  // Réponses aux missions en attente de réseau
  reponsesAEnvoyer: ReponseAEnvoyer[]
  // Centre de notifications, les plus récentes d'abord
  notifications: NotificationApp[]
  // Notifications effacées par l'habitant : jamais réannoncées
  notificationsEffacees: string[]
  // Visite guidée de l'accueil, proposée une fois après l'inscription
  visiteAFaire: boolean
  // Compte connu sur ce téléphone, gardé après déconnexion pour simuler le serveur
  dernierUtilisateur: Utilisateur | null
  // Nom officiel de la commune, tel que la mairie l'a enregistré (gardé pour le hors-ligne)
  nomCommune: string | null
  // Risques de la commune saisis par la mairie (null : pas encore chargés)
  risques: string[] | null
  // Visite guidée déjà vue sur ce téléphone : jamais reproposée d'office
  visiteFaite: boolean
  // « Ce que je peux offrir » enregistré au moins une fois
  offresEnregistrees: boolean
  // Crise terminée alors qu'une demande était en cours : on demande si l'aide est toujours nécessaire
  apresCrise: boolean
}

type AppStateValue = Etat & {
  // Mission proposée à ce volontaire : la plus récente de ses catégories, hors refus
  missionServeur: MissionServeur | null
  mission: ReponseMission
  // Nom affiché en haut de l'app : celui de la mairie, sinon celui du compte, sinon la démo
  communeAffichee: string
  basculerMode: () => void
  declarerEnSecurite: () => void
  enregistrerDemande: (demande: Omit<Demande, 'id' | 'statut' | 'envoyee'> & { id?: string }) => void
  connecter: (utilisateur: Utilisateur, nouveauCompte: boolean) => void
  lancerVisite: () => void
  terminerVisite: () => void
  deconnecter: () => void
  // Mise à jour des informations personnelles depuis le profil
  modifierUtilisateur: (modifs: Partial<Utilisateur>) => void
  basculerRessource: (id: RessourceId) => void
  definirAccueil: (accueil: Partial<Accueil>) => void
  seRendreDisponible: () => void
  seRendreIndisponible: () => void
  enregistrerOffres: () => void
  // Fin de crise : « tout va bien » (false) ou « j'ai encore besoin d'aide » (true)
  repondreApresCrise: (besoinAide: boolean) => void
  repondreMission: (reponse: 'acceptee' | 'refusee') => void
  reinitialiser: () => void
  // Ajoute une notification si son événement n'a pas déjà été annoncé ; vrai si elle est nouvelle
  ajouterNotification: (n: Omit<NotificationApp, 'heure' | 'lue'>) => boolean
  marquerNotificationsLues: () => void
  // cle absente : tout effacer
  effacerNotifications: (cle?: string) => void
}

const CLE_STOCKAGE = 'vigipop-demo'
const etatInitial: Etat = {
  mode: 'veille',
  alerte: null,
  lieux: null,
  zones: null,
  missions: [],
  enSecurite: false,
  demande: null,
  utilisateur: null,
  contact: null,
  ressources: ressourcesParDefaut,
  accueil: { places: 2, adresse: '', lat: null, lng: null },
  disponible: false,
  missionAcceptee: null,
  missionsRefusees: [],
  disponibiliteEnvoyee: true,
  reponsesAEnvoyer: [],
  notifications: [],
  notificationsEffacees: [],
  visiteAFaire: false,
  dernierUtilisateur: null,
  nomCommune: null,
  risques: null,
  visiteFaite: false,
  offresEnregistrees: false,
  apresCrise: false,
}

// Mode démo local : alerte fictive affichée quand on simule la crise
const alerteDemo: Alerte = {
  id: 'demo',
  titre: 'Crue de [RIVIÈRE] — vigilance rouge',
  consigne: "montez à l'étage, ne prenez pas votre voiture.",
  heure: '14:05',
}

// ouverture : premier chargement de l'app (et non simple synchronisation avec un autre onglet)
function lireEtat(ouverture = true): Etat {
  try {
    const brut = localStorage.getItem(CLE_STOCKAGE)
    if (!brut) return etatInitial
    const etat = { ...etatInitial, ...JSON.parse(brut) } as Etat
    // Demandes enregistrées par une version précédente du prototype
    if (etat.demande && !etat.demande.id) etat.demande = { ...etat.demande, id: crypto.randomUUID(), statut: 'transmise' }
    if (etat.demande) etat.demande = { ...etat.demande, prenom: etat.demande.prenom ?? '', telephone: etat.demande.telephone ?? '' }
    // Volontaire disponible : on renvoie sa fiche à chaque ouverture, pour que la mairie ait
    // toujours ses offres à jour (places d'hébergement ajoutées par une version plus récente)
    if (ouverture && etat.disponible) etat.disponibiliteEnvoyee = false
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
    // Une demande encore ouverte : l'accueil demandera si l'aide reste nécessaire
    apresCrise: !!e.demande && e.demande.statut !== 'close',
    disponible: false,
    missionAcceptee: null,
    missionsRefusees: [],
    disponibiliteEnvoyee: true,
  }
}

const AppStateContext = createContext<AppStateValue | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [etat, setEtat] = useState<Etat>(() => lireEtat())
  const [enLigne, setEnLigne] = useState(navigator.onLine)
  // Clés déjà annoncées, lues de façon synchrone pour ne jamais notifier deux fois
  const dejaAnnoncees = useRef(new Set([...etat.notifications.map((n) => n.cle), ...etat.notificationsEffacees]))

  useEffect(() => {
    try {
      localStorage.setItem(CLE_STOCKAGE, JSON.stringify(etat))
    } catch {
      // Stockage indisponible (navigation privée) : l'app reste utilisable
    }
  }, [etat])

  // Autre onglet ou app installée sur le même téléphone (ex. espace mairie ouvert à côté) :
  // on reprend son état, sinon il écraserait le nôtre et déconnecterait l'habitant
  useEffect(() => {
    const synchroniser = (ev: StorageEvent) => {
      if (ev.key === CLE_STOCKAGE && ev.newValue) setEtat(lireEtat(false))
    }
    window.addEventListener('storage', synchroniser)
    return () => window.removeEventListener('storage', synchroniser)
  }, [])

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
    // Nom de la commune : à part, pour qu'un échec ne bloque jamais le reste
    void serveur
      .from('communes')
      .select('*')
      .eq('id', COMMUNE_ID)
      .maybeSingle()
      .then(({ data }) => {
        const commune = data as { nom: string; risques?: string[] } | null
        if (!commune) return
        const nom = commune.nom?.trim() || null
        const risques = commune.risques ?? []
        setEtat((e) =>
          e.nomCommune === nom && JSON.stringify(e.risques) === JSON.stringify(risques) ? e : { ...e, nomCommune: nom, risques },
        )
      })
    const [crise, lieux, mission, zones] = await Promise.all([
      serveur.from('crises').select('id, titre, consigne, active, declenchee_a').eq('commune_id', COMMUNE_ID).eq('active', true).maybeSingle(),
      serveur.from('lieux').select('id, type, nom, details, distance, places, ouvert, adresse, lat, lng').eq('commune_id', COMMUNE_ID).order('nom'),
      serveur.from('missions').select('*').eq('commune_id', COMMUNE_ID).eq('active', true).order('created_at', { ascending: false }),
      serveur.from('zones_danger').select('id, nom, consigne, points').eq('commune_id', COMMUNE_ID).eq('active', true),
    ])
    // Sans réseau, on garde la dernière situation connue
    if (crise.error || lieux.error || mission.error || zones.error) return
    const active = crise.data as CriseServeur | null
    const missions = mission.data as MissionServeur[]
    const ouvertes = new Set(missions.map((m) => m.id))
    setEtat((e) => {
      const suite = {
        ...e,
        lieux: lieux.data as LieuServeur[],
        zones: zones.data as ZoneServeur[],
        missions,
        // Missions closes par la mairie : on oublie les réponses qui s'y rapportaient
        missionAcceptee: e.missionAcceptee && ouvertes.has(e.missionAcceptee) ? e.missionAcceptee : null,
        missionsRefusees: e.missionsRefusees.filter((id) => ouvertes.has(id)),
      }
      if (active) {
        return { ...suite, mode: 'crise', alerte: { id: active.id, titre: active.titre, consigne: active.consigne, heure: heure(active.declenchee_a) } }
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'zones_danger', filter: filtre }, () => void chargerCommune())
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
          prenom: demande.prenom,
          telephone: demande.telephone,
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
    type Suivi = { statut: StatutDemande; reponse_mairie?: string }
    const appliquer = ({ statut, reponse_mairie }: Suivi) =>
      setEtat((e) => (e.demande?.id === idSuivi ? { ...e, demande: { ...e.demande, statut, reponseMairie: reponse_mairie ?? '' } } : e))
    void client
      .from('demandes')
      .select('*')
      .eq('id', idSuivi)
      .maybeSingle()
      .then(({ data }) => data && appliquer(data as Suivi))
    const canal = client
      .channel(`demande-${idSuivi}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'demandes', filter: `id=eq.${idSuivi}` }, (p) =>
        appliquer(p.new as Suivi),
      )
      .subscribe()
    return () => {
      void client.removeChannel(canal)
    }
  }, [idSuivi])

  // ─── Disponibilité du volontaire, transmise à la mairie (renvoyée au retour du réseau) ───
  const { utilisateur, disponible, ressources, accueil, disponibiliteEnvoyee } = etat
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
          .upsert({
            auteur,
            commune_id: COMMUNE_ID,
            prenom: utilisateur.prenom,
            nom: utilisateur.nom ?? '',
            telephone: utilisateur.telephone,
            ressources,
            disponible,
            // Le logement n'est transmis que si l'hébergement est proposé
            places_hebergement: ressources.includes('heb') ? accueil.places : 0,
            adresse: ressources.includes('heb') ? accueil.adresse : '',
            lat: ressources.includes('heb') ? accueil.lat : null,
            lng: ressources.includes('heb') ? accueil.lng : null,
          })
        if (!error) marquer()
      } catch {
        // Nouvel essai au prochain retour en ligne
      }
    })()
    return () => {
      annule = true
    }
  }, [disponibiliteEnvoyee, enLigne, utilisateur, disponible, ressources, accueil])

  // ─── Réponse à la mission proposée par la mairie ───
  const { reponsesAEnvoyer } = etat
  const aEnvoyer = reponsesAEnvoyer[0]
  useEffect(() => {
    if (!aEnvoyer || !enLigne) return
    let annule = false
    // Envoyées une par une, dans l'ordre : la suivante part dès que celle-ci est reçue
    const marquer = () =>
      !annule && setEtat((e) => ({ ...e, reponsesAEnvoyer: e.reponsesAEnvoyer.filter((r) => r !== aEnvoyer) }))
    if (!serveur || aEnvoyer.mission.startsWith('demo')) {
      marquer()
      return
    }
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
          .upsert({ mission_id: aEnvoyer.mission, auteur, prenom: utilisateur?.prenom ?? '', reponse: aEnvoyer.reponse })
        if (!error) marquer()
      } catch {
        // Nouvel essai au prochain retour en ligne
      }
    })()
    return () => {
      annule = true
    }
  }, [aEnvoyer, enLigne, utilisateur])

  const proposables = (serveur ? etat.missions : missionsDemo).filter(
    (m) => (m.categorie === '' || etat.ressources.includes(m.categorie as RessourceId)) && !etat.missionsRefusees.includes(m.id),
  )
  const missionServeur = proposables.find((m) => m.id === etat.missionAcceptee) ?? proposables[0] ?? null

  const value: AppStateValue = {
    ...etat,
    missionServeur,
    mission: missionServeur && missionServeur.id === etat.missionAcceptee ? 'acceptee' : 'en-attente',
    communeAffichee: etat.nomCommune || etat.utilisateur?.commune || communeDemo,
    // Mode démo local uniquement : avec le serveur, c'est la mairie qui déclenche la crise
    basculerMode: () =>
      setEtat((e) => (e.mode === 'veille' ? { ...e, mode: 'crise', alerte: alerteDemo, enSecurite: false } : finDeCrise(e))),
    declarerEnSecurite: () => setEtat((e) => ({ ...e, enSecurite: true })),
    enregistrerDemande: ({ id, ...demande }) =>
      setEtat((e) => ({
        ...e,
        enSecurite: false,
        apresCrise: false,
        contact: e.utilisateur || (!demande.prenom && !demande.telephone) ? e.contact : { prenom: demande.prenom, telephone: demande.telephone },
        // « Ma situation a changé » : même demande, mise à jour côté mairie
        demande: { ...demande, id: id ?? crypto.randomUUID(), statut: id && e.demande?.id === id ? e.demande.statut : 'transmise', envoyee: false },
      })),
    // La visite guidée n'est proposée d'office qu'une fois par téléphone
    connecter: (utilisateur, nouveauCompte) =>
      setEtat((e) => ({ ...e, utilisateur, dernierUtilisateur: utilisateur, contact: null, visiteAFaire: nouveauCompte && !e.visiteFaite })),
    lancerVisite: () => setEtat((e) => ({ ...e, visiteAFaire: true })),
    terminerVisite: () => setEtat((e) => ({ ...e, visiteAFaire: false, visiteFaite: true })),
    deconnecter: () => setEtat((e) => ({ ...e, utilisateur: null, visiteAFaire: false })),
    modifierUtilisateur: (modifs) =>
      setEtat((e) => {
        if (!e.utilisateur) return e
        const utilisateur = { ...e.utilisateur, ...modifs }
        // Volontaire disponible : la mairie reçoit aussitôt le nouveau prénom ou numéro
        return { ...e, utilisateur, dernierUtilisateur: utilisateur, disponibiliteEnvoyee: e.disponibiliteEnvoyee && !e.disponible }
      }),
    basculerRessource: (id) =>
      setEtat((e) => ({
        ...e,
        disponibiliteEnvoyee: e.disponibiliteEnvoyee && !e.disponible,
        ressources: e.ressources.includes(id) ? e.ressources.filter((r) => r !== id) : [...e.ressources, id],
      })),
    definirAccueil: (accueil) =>
      setEtat((e) => ({ ...e, disponibiliteEnvoyee: e.disponibiliteEnvoyee && !e.disponible, accueil: { ...e.accueil, ...accueil } })),
    seRendreDisponible: () =>
      setEtat((e) => ({ ...e, disponible: true, disponibiliteEnvoyee: false, offresEnregistrees: true })),
    // Retrait volontaire : la mairie ne le compte plus, sa mission acceptée est libérée
    seRendreIndisponible: () =>
      setEtat((e) => ({
        ...e,
        disponible: false,
        disponibiliteEnvoyee: false,
        missionAcceptee: null,
        reponsesAEnvoyer: e.missionAcceptee ? [...e.reponsesAEnvoyer, { mission: e.missionAcceptee, reponse: 'refusee' }] : e.reponsesAEnvoyer,
      })),
    enregistrerOffres: () => setEtat((e) => ({ ...e, offresEnregistrees: true })),
    repondreApresCrise: () => setEtat((e) => ({ ...e, apresCrise: false })),
    // Un refus ne retire pas le volontaire : la mission suivante de ses catégories lui est proposée
    repondreMission: (reponse) => {
      if (!missionServeur) return
      const id = missionServeur.id
      setEtat((e) => ({
        ...e,
        missionAcceptee: reponse === 'acceptee' ? id : e.missionAcceptee === id ? null : e.missionAcceptee,
        missionsRefusees: reponse === 'refusee' ? [...e.missionsRefusees.filter((m) => m !== id), id] : e.missionsRefusees.filter((m) => m !== id),
        reponsesAEnvoyer: [...e.reponsesAEnvoyer, { mission: id, reponse }],
      }))
    },
    reinitialiser: () => setEtat(etatInitial),
    ajouterNotification: (n) => {
      if (dejaAnnoncees.current.has(n.cle)) return false
      dejaAnnoncees.current.add(n.cle)
      setEtat((e) =>
        e.notifications.some((x) => x.cle === n.cle)
          ? e
          : { ...e, notifications: [{ ...n, heure: heure(new Date().toISOString()), lue: false }, ...e.notifications].slice(0, 40) },
      )
      return true
    },
    marquerNotificationsLues: () =>
      setEtat((e) => (e.notifications.some((n) => !n.lue) ? { ...e, notifications: e.notifications.map((n) => ({ ...n, lue: true })) } : e)),
    effacerNotifications: (cle) =>
      setEtat((e) => {
        const effacees = e.notifications.filter((n) => cle === undefined || n.cle === cle).map((n) => n.cle)
        return {
          ...e,
          notifications: e.notifications.filter((n) => !effacees.includes(n.cle)),
          notificationsEffacees: [...effacees, ...e.notificationsEffacees].slice(0, 200),
        }
      }),
  }

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState doit être utilisé dans AppStateProvider')
  return ctx
}
