import type { SupabaseClient } from '@supabase/supabase-js'
import { centreCommune, commune, communesDemo, lieuxDemo, rayonCommuneDemo, missionsDemo, risques, zonesDemo, zonesRisqueDemo } from '../data/fictif.ts'

// Serveur local de présentation (VITE_SERVEUR_LOCAL=1) : imite le client Supabase dans le navigateur,
// pour relier l'app habitant et l'espace mairie sur un même ordinateur, sans réseau.
// Données fictives uniquement, gardées dans ce navigateur (localStorage). Rien n'est envoyé.

type Ligne = Record<string, unknown>
type Base = Record<string, Ligne[]>
type Evenement = { table: string; type: 'INSERT' | 'UPDATE' | 'DELETE'; lignes: Ligne[] }

const CLE = 'vigipop-serveur-local-v4'
export const COMMUNE_LOCALE = '00000000-0000-4000-8000-000000000001'
const COORDINATEUR = 'coordinateur-cholet'

const maintenant = (decalageMinutes = 0) => new Date(Date.now() + decalageMinutes * 60000).toISOString()
const identifiant = () => crypto.randomUUID()

// Volontaires fictifs, disponibles dès qu'une crise est déclenchée
const volontairesFictifs = [
  { prenom: 'Karim', ressources: ['vehicule', 'mainoeuvre'], lat: 47.0612, lng: -0.8868 },
  { prenom: 'Léa', ressources: ['heb'], places_hebergement: 3, lat: 47.0641, lng: -0.8771 },
  { prenom: 'Hugo', ressources: ['materiel', 'mainoeuvre'], lat: 47.0503, lng: -0.8822 },
  { prenom: 'Nadia', ressources: ['competences', 'temps'], lat: 47.0598, lng: -0.8712 },
  { prenom: 'Bernard', ressources: ['vehicule'], lat: 47.0457, lng: -0.8901 },
]

// Demandes fictives reçues dans les premières minutes de la crise, autour de la Moine
const demandesFictives = [
  { situation: 'bloque', besoins: ['eau', 'med'], personnes: 2, personne_vulnerable: true, prenom: 'Martine', position: '47.0569, -0.8838', minutes: -9 },
  { situation: 'evac', besoins: ['transport'], personnes: 4, personne_vulnerable: false, prenom: 'Sofia', position: '47.0561, -0.8791', minutes: -7 },
  { situation: 'sinistre', besoins: ['heb', 'animaux'], personnes: 3, personne_vulnerable: false, prenom: 'Paul', position: '47.0581, -0.8872', minutes: -5 },
  { situation: 'blesse', besoins: ['med'], personnes: 1, personne_vulnerable: true, prenom: 'Jean', position: '47.0537, -0.8766', minutes: -2 },
]

function baseInitiale(): Base {
  const c = COMMUNE_LOCALE
  const cree = maintenant(-60 * 24)
  return {
    // Centre et rayon (migration 0015) : la géolocalisation trouve la commune où l'on se trouve
    communes: [
      { id: c, nom: commune, risques, lat: centreCommune[0], lng: centreCommune[1], rayon_km: rayonCommuneDemo },
      ...communesDemo.map((v) => ({ id: v.id, nom: v.nom, risques: v.risques, lat: v.centre[0], lng: v.centre[1], rayon_km: v.rayonKm })),
    ],
    coordinateurs: [{ user_id: COORDINATEUR, nom: 'Cellule de crise communale', commune_id: c, communes: { nom: commune } }],
    lieux: [
      ...lieuxDemo.map((l) => ({ ...l, commune_id: c, created_at: cree })),
      ...communesDemo.flatMap((v) => v.lieux.map((l) => ({ ...l, commune_id: v.id, created_at: cree }))),
    ],
    zones_risque: zonesRisqueDemo.map((z) => ({ ...z, commune_id: c, created_at: cree })),
    // Zone à éviter du scénario : préparée, affichée seulement pendant la crise
    zones_danger: zonesDemo.map((z) => ({ ...z, id: 'zone-moine', commune_id: c, active: false, created_at: cree })),
    missions: missionsDemo.map((m) => ({ ...m, id: m.id.replace('demo-', 'mission-'), commune_id: c, active: true, created_at: cree })),
    volontaires: volontairesFictifs.map((v, i) => ({
      auteur: `volontaire-${i + 1}`,
      commune_id: c,
      nom: '',
      telephone: '06 00 00 00 0' + i,
      places_hebergement: 0,
      adresse: '',
      disponible: true,
      updated_at: cree,
      ...v,
    })),
    // Rôles déjà déclarés et vérifiés (protection civile, entreprises sous convention), et un à vérifier
    habilitations: [
      { prenom: 'Sylvie', nom: 'M.', type: 'protection_civile', details: { numero: 'PC49-0142' }, statut: 'verifiee' },
      { prenom: 'Thierry', nom: 'B.', type: 'protection_civile', details: { numero: 'PC49-0187' }, statut: 'verifiee' },
      { prenom: 'Claire', nom: 'D.', type: 'entreprise', statut: 'verifiee', details: { entreprise: 'Entreprise partenaire A', siret: '00000000000001', materiel: '4 pompes de relevage, 2 groupes électrogènes 20 kVA' } },
      { prenom: 'Olivier', nom: 'R.', type: 'entreprise', statut: 'verifiee', details: { entreprise: 'Entreprise partenaire B', siret: '00000000000002', materiel: 'Mini-pelle avec chauffeur, 2 bennes, barrières de chantier' } },
      { prenom: 'Marc', nom: 'L.', type: 'protection_civile', details: { numero: 'PC49-0203' }, statut: 'a_verifier' },
    ].map((h, i) => ({ ...h, id: `habilitation-${i + 1}`, auteur: `habitant-${i + 1}`, commune_id: c, telephone: '06 00 00 01 0' + i, created_at: cree, updated_at: cree })),
    crises: [],
    demandes: [],
    reponses_mission: [],
    hebergements: [],
    entraides: [],
    journal: [],
  }
}

function lire(): Base {
  try {
    const brut = localStorage.getItem(CLE)
    if (brut) return { ...baseInitiale(), ...JSON.parse(brut) }
  } catch {
    // Stockage indisponible : base en mémoire
  }
  return baseInitiale()
}

let base = lire()
const abonnes = new Set<(e: Evenement) => void>()

function enregistrer(evenements: Evenement[]) {
  try {
    localStorage.setItem(CLE, JSON.stringify(base))
  } catch {
    // Navigation privée : la démonstration marche quand même dans cette page
  }
  for (const e of evenements) for (const f of abonnes) f(e)
}

// Autre onglet (espace mairie ouvert à part) : on relit la base et on prévient les écrans
window.addEventListener('storage', (ev) => {
  if (ev.key !== CLE) return
  base = lire()
  for (const table of Object.keys(base)) for (const f of abonnes) f({ table, type: 'UPDATE', lignes: base[table] })
})

let compteurJournal = 1
function journal(action: string, details: Record<string, unknown>): Evenement {
  const ligne = { id: Date.now() + compteurJournal++, commune_id: COMMUNE_LOCALE, action, details, created_at: maintenant() }
  base.journal = [...base.journal, ligne]
  return { table: 'journal', type: 'INSERT', lignes: [ligne] }
}

let compteurReference = 1040
const reference = () => `VGP-${++compteurReference}`

// Ce que ferait le serveur autour d'une crise : zones, volontaires, premières demandes, journal
function aDeclenchement(crise: Ligne): Evenement[] {
  const ev: Evenement[] = []
  base.zones_danger = base.zones_danger.map((z) => (z.id === 'zone-moine' ? { ...z, active: true } : z))
  ev.push({ table: 'zones_danger', type: 'UPDATE', lignes: base.zones_danger })
  base.volontaires = base.volontaires.map((v) => (String(v.auteur).startsWith('volontaire-') ? { ...v, updated_at: maintenant(0.05) } : v))
  ev.push({ table: 'volontaires', type: 'UPDATE', lignes: base.volontaires })
  const nouvelles = demandesFictives.map(({ minutes, ...d }) => ({
    ...d,
    id: identifiant(),
    reference: reference(),
    commune_id: COMMUNE_LOCALE,
    telephone: '06 00 00 00 00',
    statut: 'transmise',
    reponse_mairie: '',
    created_at: maintenant(minutes),
    updated_at: maintenant(minutes),
  }))
  base.demandes = [...base.demandes, ...nouvelles]
  ev.push({ table: 'demandes', type: 'INSERT', lignes: nouvelles })
  ev.push(journal('crise_declenchee', { titre: crise.titre }))
  return ev
}

function aFinDeCrise(crise: Ligne): Evenement[] {
  base.zones_danger = base.zones_danger.map((z) => ({ ...z, active: false }))
  base.demandes = base.demandes.map((d) => (d.statut === 'close' ? d : { ...d, statut: 'close', updated_at: maintenant() }))
  return [
    { table: 'zones_danger', type: 'UPDATE', lignes: base.zones_danger },
    { table: 'demandes', type: 'UPDATE', lignes: base.demandes },
    journal('crise_terminee', { titre: crise.titre }),
  ]
}

// Valeurs par défaut que poserait la base de données
function completer(table: string, ligne: Ligne): Ligne {
  const date = maintenant()
  const l: Ligne = { created_at: date, updated_at: date, ...ligne }
  if (!l.id && table !== 'volontaires' && table !== 'reponses_mission') l.id = identifiant()
  if (table === 'crises') Object.assign(l, { active: true, declenchee_a: date, ...ligne })
  if (table === 'demandes') Object.assign(l, { statut: 'transmise', reponse_mairie: '', ...ligne })
  if (['missions', 'zones_danger'].includes(table) && l.active === undefined) l.active = true
  if (['hebergements', 'entraides'].includes(table) && !l.statut) l.statut = 'proposee'
  return l
}

const cles: Record<string, string[]> = { volontaires: ['auteur'], reponses_mission: ['mission_id', 'auteur'] }
const memeLigne = (table: string, a: Ligne, b: Ligne) => (cles[table] ?? ['id']).every((k) => a[k] === b[k])

type Filtre = (l: Ligne) => boolean
type Resultat = { data: unknown; error: null }

class Requete implements PromiseLike<Resultat> {
  private filtres: Filtre[] = []
  private tri: { col: string; asc: boolean }[] = []
  private max = Infinity
  private unique = false
  private ecriture: { type: 'insert' | 'upsert' | 'update' | 'delete'; valeur?: Ligne | Ligne[] } | null = null
  private table: string

  constructor(table: string) {
    this.table = table
  }

  select() {
    return this
  }
  eq(col: string, v: unknown) {
    this.filtres.push((l) => l[col] === v)
    return this
  }
  neq(col: string, v: unknown) {
    this.filtres.push((l) => l[col] !== v)
    return this
  }
  in(col: string, v: unknown[]) {
    this.filtres.push((l) => v.includes(l[col]))
    return this
  }
  gte(col: string, v: unknown) {
    this.filtres.push((l) => String(l[col]) >= String(v))
    return this
  }
  order(col: string, options?: { ascending?: boolean }) {
    this.tri.push({ col, asc: options?.ascending !== false })
    return this
  }
  limit(n: number) {
    this.max = n
    return this
  }
  maybeSingle() {
    this.unique = true
    return this
  }
  single() {
    return this.maybeSingle()
  }
  insert(valeur: Ligne | Ligne[]) {
    this.ecriture = { type: 'insert', valeur }
    return this
  }
  upsert(valeur: Ligne | Ligne[]) {
    this.ecriture = { type: 'upsert', valeur }
    return this
  }
  update(valeur: Ligne) {
    this.ecriture = { type: 'update', valeur }
    return this
  }
  delete() {
    this.ecriture = { type: 'delete' }
    return this
  }

  private executer(): unknown {
    const t = this.table
    const lignes = base[t] ?? []
    const garde = (l: Ligne) => this.filtres.every((f) => f(l))
    let resultat: Ligne[]
    const ev: Evenement[] = []
    if (!this.ecriture) {
      resultat = lignes.filter(garde)
    } else if (this.ecriture.type === 'delete') {
      resultat = lignes.filter(garde)
      base[t] = lignes.filter((l) => !garde(l))
      ev.push({ table: t, type: 'DELETE', lignes: resultat })
    } else if (this.ecriture.type === 'update') {
      const modif = this.ecriture.valeur as Ligne
      resultat = []
      base[t] = lignes.map((l) => {
        if (!garde(l)) return l
        const n = { ...l, ...modif, updated_at: maintenant() }
        resultat.push(n)
        return n
      })
      ev.push({ table: t, type: 'UPDATE', lignes: resultat })
      for (const n of resultat) {
        if (t === 'crises' && modif.active === false) ev.push(...aFinDeCrise(n))
        else if (t === 'crises') ev.push(journal('crise_modifiee', { titre: n.titre }))
        if (t === 'demandes' && modif.statut) ev.push(journal('statut_demande', { reference: n.reference, statut: n.statut }))
      }
    } else {
      const valeurs = ([] as Ligne[]).concat(this.ecriture.valeur ?? [])
      resultat = []
      for (const v of valeurs) {
        const existante = this.ecriture.type === 'upsert' ? (base[t] ?? []).find((l) => memeLigne(t, l, v)) : undefined
        if (existante) {
          const n = { ...existante, ...v, updated_at: maintenant() }
          base[t] = base[t].map((l) => (l === existante ? n : l))
          resultat.push(n)
          ev.push({ table: t, type: 'UPDATE', lignes: [n] })
        } else {
          if (t === 'crises' && base.crises.some((c) => c.active)) continue
          const n = completer(t, v)
          if (t === 'demandes' && !n.reference) n.reference = reference()
          base[t] = [...(base[t] ?? []), n]
          resultat.push(n)
          ev.push({ table: t, type: 'INSERT', lignes: [n] })
          if (t === 'crises') ev.push(...aDeclenchement(n))
        }
      }
    }
    if (this.ecriture) enregistrer(ev)
    for (const { col, asc } of [...this.tri].reverse()) {
      resultat = [...resultat].sort((a, b) => {
        const x = a[col] as string | number
        const y = b[col] as string | number
        return (x < y ? -1 : x > y ? 1 : 0) * (asc ? 1 : -1)
      })
    }
    resultat = resultat.slice(0, this.max).map((l) => structuredClone(l))
    return this.unique ? (resultat[0] ?? null) : resultat
  }

  then<A = Resultat, B = never>(ok?: ((v: Resultat) => A | PromiseLike<A>) | null, ko?: ((e: unknown) => B | PromiseLike<B>) | null) {
    return new Promise<Resultat>((resoudre) => resoudre({ data: this.executer(), error: null })).then(ok, ko)
  }
}

// Fonctions du serveur appelées par l'app : réponses vides, sauf le nombre de foyers solidaires
// et la commune Vigipop la plus proche (même calcul que commune_a_proximite, migration 0015)
function rpc(nom: string, args?: Record<string, unknown>) {
  if (nom === 'commune_a_proximite') {
    const lat = Number(args?.p_lat)
    const lng = Number(args?.p_lng)
    const rad = Math.PI / 180
    const km = (c: Ligne) => {
      const dLat = (Number(c.lat) - lat) * rad
      const dLng = (Number(c.lng) - lng) * rad
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat * rad) * Math.cos(Number(c.lat) * rad) * Math.sin(dLng / 2) ** 2
      return 2 * 6371 * Math.asin(Math.sqrt(h))
    }
    const proche = base.communes
      .filter((c) => c.lat != null && c.lng != null && km(c) <= Number(c.rayon_km ?? 0))
      .sort((a, b) => km(a) - km(b))[0]
    return Promise.resolve({ data: proche ? [{ id: proche.id, nom: proche.nom, lat: proche.lat, lng: proche.lng }] : [], error: null })
  }
  const valeurs: Record<string, unknown> = { hebergements_solidaires: 3 }
  return Promise.resolve({ data: nom in valeurs ? valeurs[nom] : [], error: null })
}

type Ecoute = { table?: string; filtre?: [string, string]; type?: string; rappel: (p: { new: Ligne; eventType: string }) => void }

function canal() {
  const ecoutes: Ecoute[] = []
  let desabonner = () => {}
  const c = {
    on(_type: string, options: { event?: string; table?: string; filter?: string }, rappel: Ecoute['rappel']) {
      const m = options.filter?.match(/^(\w+)=eq\.(.+)$/)
      ecoutes.push({ table: options.table, filtre: m ? [m[1], m[2]] : undefined, type: options.event, rappel })
      return c
    },
    subscribe() {
      const f = (e: Evenement) => {
        for (const ec of ecoutes) {
          if (ec.table && ec.table !== e.table) continue
          if (ec.type && ec.type !== '*' && ec.type !== e.type) continue
          const lignes = ec.filtre ? e.lignes.filter((l) => String(l[ec.filtre![0]]) === ec.filtre![1]) : e.lignes
          // Rappel différé : comme le temps réel de Supabase, après la fin de l'écriture
          for (const l of lignes.length ? lignes : ec.filtre ? [] : [{}]) setTimeout(() => ec.rappel({ new: l, eventType: e.type }), 0)
        }
      }
      abonnes.add(f)
      desabonner = () => abonnes.delete(f)
      return c
    },
    retirer: () => desabonner(),
  }
  return c
}

// Un client par écran : l'habitant a une session anonyme, la mairie celle de son coordinateur
export function creerServeurLocal(role: 'habitant' | 'mairie'): SupabaseClient {
  type Session = { user: { id: string; is_anonymous: boolean; email?: string } }
  let session: Session | null =
    role === 'mairie' ? { user: { id: COORDINATEUR, is_anonymous: false, email: 'cellule.crise@cholet.fr' } } : null
  const ecouteurs = new Set<(e: string, s: Session | null) => void>()
  const changer = (s: Session | null) => {
    session = s
    for (const f of ecouteurs) f(s ? 'SIGNED_IN' : 'SIGNED_OUT', s)
  }
  const client = {
    from: (table: string) => new Requete(table),
    rpc,
    channel: () => canal(),
    removeChannel: (c: { retirer: () => void }) => {
      c.retirer()
      return Promise.resolve('ok')
    },
    functions: { invoke: () => Promise.resolve({ data: null, error: { message: 'Notifications push indisponibles hors ligne' } }) },
    auth: {
      getSession: () => Promise.resolve({ data: { session } }),
      onAuthStateChange: (f: (e: string, s: Session | null) => void) => {
        ecouteurs.add(f)
        return { data: { subscription: { unsubscribe: () => ecouteurs.delete(f) } } }
      },
      signInAnonymously: () => {
        changer({ user: { id: identifiant(), is_anonymous: true } })
        return Promise.resolve({ data: { user: session!.user, session }, error: null })
      },
      signInWithPassword: () => {
        changer({ user: { id: COORDINATEUR, is_anonymous: false, email: 'cellule.crise@cholet.fr' } })
        return Promise.resolve({ data: { user: session!.user, session }, error: null })
      },
      signOut: () => {
        changer(null)
        return Promise.resolve({ error: null })
      },
    },
  }
  return client as unknown as SupabaseClient
}

// Appui long sur le logo (présentation) : la mairie déclenche ou termine la crise du scénario
export async function basculerCriseLocale(client: SupabaseClient) {
  const { data } = await client.from('crises').select('*').eq('commune_id', COMMUNE_LOCALE).eq('active', true).maybeSingle()
  if (data) {
    await client.from('crises').update({ active: false, terminee_a: maintenant() }).eq('id', (data as Ligne).id)
  } else {
    await client.from('crises').insert({ commune_id: COMMUNE_LOCALE, titre: 'Crue de la Moine — vigilance rouge', consigne: 'Rejoignez les points hauts, ne prenez pas votre voiture.' })
  }
}

// Recommencer la présentation : base et téléphone de l'habitant remis à zéro
export function reinitialiserPresentation() {
  try {
    localStorage.removeItem(CLE)
    localStorage.removeItem('vigipop-demo')
  } catch {
    // Rien à effacer
  }
  location.reload()
}
