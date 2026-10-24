import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Serveur commun app citoyenne ↔ tableau de bord mairie (Supabase, hébergé en UE).
// Sans ces variables, l'app reste en mode démo local (bouton « Démo » pour la crise).
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
// Clé publique : « publishable » (nouveau nom chez Supabase) ou « anon » (ancien nom)
const cleAnon = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined

export const serveur: SupabaseClient | null = url && cleAnon ? createClient(url, cleAnon) : null

// Commune de démonstration créée par supabase/migrations/0001_init.sql
export const COMMUNE_ID = (import.meta.env.VITE_COMMUNE_ID as string | undefined) ?? '00000000-0000-4000-8000-000000000001'

export type StatutDemande = 'transmise' | 'prise_en_charge' | 'aide_organisee' | 'close'

export type CriseServeur = {
  id: string
  titre: string
  consigne: string
  active: boolean
  declenchee_a: string
}

export type LieuServeur = {
  id: string
  type: 'accueil' | 'eau' | 'soins' | 'autre'
  nom: string
  details: string
  distance: string
  places: number | null
  ouvert: boolean
  adresse: string
  lat: number | null
  lng: number | null
}

export type ZoneServeur = {
  id: string
  nom: string
  consigne: string
  points: [number, number][]
}

export type MissionServeur = {
  id: string
  titre: string
  rendez_vous: string
  duree: string
  lieu: string
  coordinateur: string
  ressource: string
  equipe: string
  consignes: string
  // Catégorie d'aide demandée (id de ressource) ; vide : ouverte à tous
  categorie: string
  // Point de rendez-vous placé sur la carte (missions créées depuis la migration 0010)
  adresse?: string
  lat?: number | null
  lng?: number | null
}

export type DemandeServeur = {
  id: string
  reference: string
  situation: string
  besoins: string[]
  personnes: number
  personne_vulnerable: boolean
  position: string
  prenom: string
  telephone: string
  statut: StatutDemande
  // Ce que la mairie a prévu, lu par l'habitant (migration 0010)
  reponse_mairie?: string
  created_at: string
  updated_at: string
}

// Les habitants n'ont pas de mot de passe : une session anonyme suffit pour envoyer une demande
export async function assurerSession(client: SupabaseClient) {
  const { data } = await client.auth.getSession()
  if (data.session) return data.session.user.id
  const { data: anonyme, error } = await client.auth.signInAnonymously()
  if (error) throw error
  return anonyme.user!.id
}

export function heure(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export type StatutHebergement = 'proposee' | 'acceptee' | 'refusee' | 'annulee'

// Proposition vue par l'hébergeur : coordonnées de la personne seulement après son accord
export type PropositionHebergementServeur = {
  id: string
  statut: StatutHebergement
  personnes: number
  personne_vulnerable: boolean
  besoins: string[]
  prenom: string
  telephone: string
  created_at: string
}

// Hébergement vu par la personne sinistrée : adresse seulement après l'accord de l'hébergeur
export type MonHebergementServeur = {
  statut: StatutHebergement
  prenom: string
  telephone: string
  adresse: string
  lat: number | null
  lng: number | null
}

// Transport et matériel : sollicitation automatique du volontaire le plus proche (migration 0011)
export type BesoinEntraide = 'transport' | 'materiel'

// Sollicitation vue par le volontaire : distance arrondie avant l'accord, coordonnées après
export type SollicitationServeur = {
  id: string
  besoin: BesoinEntraide
  statut: StatutHebergement
  personnes: number
  personne_vulnerable: boolean
  distance_km: number | null
  prenom: string
  telephone: string
  lieu: string
  created_at: string
}

// Volontaire vu par la personne aidée : prénom et numéro seulement après son accord
export type AidantServeur = {
  besoin: BesoinEntraide
  statut: StatutHebergement
  prenom: string
  telephone: string
}

export function lienTelephone(numero: string) {
  return `tel:${numero.replace(/[\s.-]/g, '')}`
}
