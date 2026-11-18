import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import CarteInteractive, { type Repere } from '../components/CarteInteractive.tsx'
import Logo from '../components/Logo.tsx'
import ChampAdresse from '../components/ChampAdresse.tsx'
import BoutonInstaller from './BoutonInstaller.tsx'
import PanneauPush from './PanneauPush.tsx'
import { PanneauBenevoles, PanneauEntreprises, type Benevole, type Entreprise } from './Partenaires.tsx'
import { ActionsListe, PanneauBilan } from './Rapports.tsx'
import { ecrireCache, effacerCacheMairie, lireCache } from './cache.ts'
import { besoins as listeBesoins, centreCommune, libelleLieu, ressources as listeRessources, situations } from '../data/fictif.ts'
import {
  heure,
  lienTelephone,
  serveurMairie as serveur,
  type CriseServeur,
  type DemandeServeur,
  type LieuServeur,
  type MissionServeur,
  type BesoinEntraide,
  type StatutDemande,
  type StatutHebergement,
  type ZoneRisqueServeur,
  type ZoneServeur,
} from '../services/serveur.ts'
import { chercherAdresse, couleurLieu, distanceLisible, distanceMetres, estPlace, zonesDepuisGeoJSON, type ResultatAdresse, type ZoneImportee } from '../outils/carte.ts'

export type Coordinateur = { nom: string; communeId: string; communeNom: string }

type Reponse = { mission_id: string; prenom: string; reponse: 'acceptee' | 'refusee' }
type Volontaire = {
  auteur: string
  prenom: string
  nom?: string
  telephone: string
  ressources: string[]
  places_hebergement: number
  adresse: string
  lat: number | null
  lng: number | null
  updated_at: string
}
type Hebergement = { id: string; demande_id: string; hebergeur: string; personnes: number; statut: StatutHebergement; updated_at: string }
type Entraide = { id: string; demande_id: string; besoin: BesoinEntraide; aidant: string; statut: StatutHebergement; updated_at: string }
type Evenement = { id: number; action: string; details: Record<string, string>; created_at: string }

type PositionCommune = { lat: number; lng: number; rayon_km: number }

type Donnees = {
  crise: CriseServeur | null
  risques: string[]
  // Centre et rayon de la commune (migration 0015) ; absent : pas encore placée
  position?: PositionCommune | null
  // Répartition automatique de l'hébergement (migration 0018) ; activée si la colonne n'existe pas encore
  hebergementAuto?: boolean
  demandes: DemandeServeur[]
  lieux: LieuServeur[]
  missions: MissionServeur[]
  reponses: Reponse[]
  volontaires: Volontaire[]
  hebergements: Hebergement[]
  entraides: Entraide[]
  zones: ZoneServeur[]
  zonesRisque: ZoneRisqueServeur[]
  journal: Evenement[]
  // Partenaires (migration 0017) ; absents d'une liste gardée avant la mise à jour
  entreprises?: Entreprise[]
  benevoles?: Benevole[]
}

// Pages de l'espace mairie, regroupées par sujet : les habitants, les renforts, la commune
type Page = '' | 'demandes' | 'volontaires' | 'benevoles' | 'entreprises' | 'lieux' | 'parametres' | 'bilan'
const groupesPages: { groupe: string; pages: { id: Page; titre: string }[] }[] = [
  { groupe: '', pages: [{ id: '', titre: 'Accueil' }] },
  {
    groupe: 'Habitants',
    pages: [
      { id: 'demandes', titre: 'Ont besoin d’aide' },
      { id: 'volontaires', titre: 'Proposent leur aide' },
    ],
  },
  {
    groupe: 'Renforts',
    pages: [
      { id: 'benevoles', titre: 'Protection civile' },
      { id: 'entreprises', titre: 'Entreprises conventionnées' },
    ],
  },
  {
    groupe: 'Commune',
    pages: [
      { id: 'lieux', titre: 'Lieux d’accueil' },
      { id: 'bilan', titre: 'Journal et bilan' },
      { id: 'parametres', titre: 'Paramètres de la ville' },
    ],
  },
]
const toutesPages = groupesPages.flatMap((g) => g.pages)
// Hors crise, l'espace mairie ne montre que les informations de la mairie (lieux, risques, renforts, journal).
// Les pages des habitants n'apparaissent qu'en crise, ou s'il reste une demande ouverte à traiter.
const pagesHabitants: Page[] = ['demandes', 'volontaires']
function pagesVisibles(donnees: Donnees): Page[] {
  const demandeOuverte = donnees.demandes.some((d) => d.statut === 'transmise' || d.statut === 'prise_en_charge')
  return toutesPages
    .map((p) => p.id)
    .filter((id) => !pagesHabitants.includes(id) || !!donnees.crise || (id === 'demandes' && demandeOuverte))
}
// Une phrase sous le titre de chaque page : à quoi elle sert, en une lecture
const descriptionsPages: Record<Page, string> = {
  '': '',
  demandes: 'Les demandes d’aide envoyées par les habitants. Traitez-les dans l’ordre : prendre en charge, organiser l’aide, prévenir l’habitant.',
  volontaires:
    'Les habitants volontaires, prêts à aider leurs voisins. Hébergement, transport et matériel leur sont proposés automatiquement ; pour le reste (eau, médicaments, animaux…), envoyez une mission.',
  benevoles: 'Les bénévoles formés de l’association (réserve communale, Protection civile…) : la mairie les connaît et les appelle directement.',
  entreprises: 'Les entreprises qui ont signé une convention pour prêter du matériel ou des engins pendant une crise.',
  lieux: 'Gymnases, salles et points d’eau : seuls les lieux ouverts s’affichent chez les habitants.',
  parametres: 'Réglages rarement modifiés : risques connus de la commune (DICRIM), périmètre pour les visiteurs, alertes sur les téléphones.',
  bilan: 'Tout ce que la cellule de crise a fait, et le bilan à transmettre (sans nom ni numéro).',
}

// Les cas les plus graves d'abord, puis les plus anciens
function priorite(d: DemandeServeur) {
  const base = { blesse: 0, evac: 1, bloque: 2, sinistre: 3 }[d.situation] ?? 3
  return base - (d.personne_vulnerable ? 0.5 : 0)
}

const libelleStatut: Record<StatutDemande, string> = {
  transmise: 'À traiter',
  prise_en_charge: 'Prise en charge',
  aide_organisee: 'Aide organisée',
  close: 'Close',
}

const modelesCrise = [
  { nom: 'Crue', titre: 'Crue de [RIVIÈRE] — vigilance rouge', consigne: "Montez à l'étage, ne prenez pas votre voiture." },
  { nom: 'Tempête', titre: 'Tempête — vents violents', consigne: 'Restez chez vous, éloignez-vous des fenêtres et des arbres.' },
  { nom: 'Incendie', titre: 'Feu de forêt à proximité', consigne: 'Fermez portes et volets, préparez-vous à évacuer sur consigne.' },
]

const libelleAction: Record<string, string> = {
  crise_declenchee: 'Crise déclenchée',
  crise_terminee: 'Crise terminée',
  crise_modifiee: 'Consigne modifiée',
  statut_demande: 'Statut de demande',
  mission_creee: 'Mission proposée',
  mission_close: 'Mission close',
  hebergement_proposee: 'Hébergement proposé',
  hebergement_acceptee: 'Hébergement accepté',
  hebergement_refusee: 'Hébergement refusé',
  hebergement_annulee: 'Hébergement annulé',
  hebergement_declinee: 'Hébergement décliné par la personne',
  entraide_proposee: 'Volontaire sollicité',
  entraide_acceptee: 'Aide acceptée',
  entraide_refusee: 'Aide refusée',
  entraide_annulee: 'Aide annulée',
  sms_recu: 'Demande reçue par SMS',
  sms_doublon: 'SMS en double ignoré',
  entreprise_sollicitee: 'Entreprise sollicitée',
  entreprise_engagee: 'Matériel engagé',
  entreprise_disponible: 'Entreprise de nouveau disponible',
  benevole_mobilise: 'Bénévole mobilisé',
  benevole_disponible: 'Bénévole disponible',
  benevole_indisponible: 'Bénévole indisponible',
  sms_fusionne: 'Demande SMS rejointe par l\'app',
}

export default function TableauDeBord({ coordinateur }: { coordinateur: Coordinateur }) {
  const client = serveur!
  const commune = coordinateur.communeId
  // Dernière liste reçue, gardée sur l'ordinateur : affichée tout de suite, et si le serveur ne répond plus
  const [donnees, setDonnees] = useState<Donnees | null>(() => lireCache<Donnees>(`tableau-${commune}`)?.valeur ?? null)
  // Première connexion de la mairie : elle renseigne d'abord les risques de sa commune
  const [passageTermine, setPassageTermine] = useState(false)
  const premierPassage = !passageTermine && !!donnees && donnees.risques.length === 0
  const setPremierPassage = (v: boolean) => setPassageTermine(!v)
  const [copieDu, setCopieDu] = useState<string | null>(() => lireCache<Donnees>(`tableau-${commune}`)?.a ?? null)
  const [erreur, setErreur] = useState('')
  // Mission pré-remplie depuis le tableau des besoins
  const [modeleMission, setModeleMission] = useState<ModeleMission | null>(null)

  const charger = useCallback(async () => {
    const [crise, demandes, lieux, missions, reponses, volontaires, hebergements, zones, journal, communeLue, entraides, zonesRisque, entreprises, benevoles] = await Promise.all([
      client.from('crises').select('id, titre, consigne, active, declenchee_a').eq('commune_id', commune).eq('active', true).maybeSingle(),
      client.from('demandes').select('*').eq('commune_id', commune).order('created_at', { ascending: false }).limit(300),
      client.from('lieux').select('*').eq('commune_id', commune).order('nom'),
      client.from('missions').select('*').eq('commune_id', commune).eq('active', true).order('created_at', { ascending: false }),
      client.from('reponses_mission').select('mission_id, prenom, reponse'),
      client.from('volontaires').select('*').eq('commune_id', commune).eq('disponible', true).order('updated_at', { ascending: false }),
      client.from('hebergements').select('id, demande_id, hebergeur, personnes, statut, updated_at').eq('commune_id', commune).order('created_at'),
      client.from('zones_danger').select('id, nom, consigne, points').eq('commune_id', commune).eq('active', true).order('created_at'),
      client.from('journal').select('id, action, details, created_at').eq('commune_id', commune).order('id', { ascending: false }).limit(50),
      client.from('communes').select('*').eq('id', commune).maybeSingle(),
      // Absente tant que la migration 0011 n'est pas lancée : le tableau reste utilisable
      client.from('entraides').select('id, demande_id, besoin, aidant, statut, updated_at').eq('commune_id', commune).order('created_at'),
      // Absente tant que la migration 0012 n'est pas lancée
      client.from('zones_risque').select('id, risque, nom, consigne, source, points').eq('commune_id', commune).order('created_at'),
      // Absentes tant que la migration 0017 n'est pas lancée
      client.from('entreprises_convention').select('*').eq('commune_id', commune).order('nom'),
      client.from('benevoles_association').select('*').eq('commune_id', commune).order('nom'),
    ])
    const echec = [crise, demandes, lieux, missions, reponses, volontaires, hebergements, zones, journal].find((r) => r.error)
    if (echec) {
      setErreur(navigator.onLine ? 'Connexion au serveur perdue.' : 'Vous êtes hors ligne.')
      setCopieDu(lireCache(`tableau-${commune}`)?.a ?? null)
      return
    }
    setErreur('')
    setCopieDu(null)
    const criseActive = crise.data as CriseServeur | null
    const lues: Donnees = {
      crise: criseActive,
      risques: (communeLue.data as { risques?: string[] } | null)?.risques ?? [],
      hebergementAuto: (communeLue.data as { hebergement_auto?: boolean } | null)?.hebergement_auto ?? true,
      position: (() => {
        const c = communeLue.data as { lat?: number | null; lng?: number | null; rayon_km?: number | null } | null
        return c?.lat != null && c?.lng != null ? { lat: c.lat, lng: c.lng, rayon_km: Number(c.rayon_km ?? 5) } : null
      })(),
      demandes: demandes.data as DemandeServeur[],
      lieux: lieux.data as LieuServeur[],
      missions: missions.data as MissionServeur[],
      reponses: reponses.data as Reponse[],
      zones: zones.data as ZoneServeur[],
      zonesRisque: (zonesRisque.data as ZoneRisqueServeur[] | null) ?? [],
      hebergements: hebergements.data as Hebergement[],
      entraides: (entraides.data as Entraide[] | null) ?? [],
      // Seules comptent les disponibilités données pendant la crise en cours
      volontaires: criseActive ? (volontaires.data as Volontaire[]).filter((v) => v.updated_at >= criseActive.declenchee_a) : [],
      journal: journal.data as Evenement[],
      entreprises: (entreprises.data as Entreprise[] | null) ?? [],
      benevoles: (benevoles.data as Benevole[] | null) ?? [],
    }
    setDonnees(lues)
    ecrireCache(`tableau-${commune}`, lues)
  }, [client, commune])

  // Tout changement (habitant ou autre coordinateur) recharge le tableau en direct
  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    void charger()
    const filtre = `commune_id=eq.${commune}`
    const canal = client.channel(`mairie-${commune}`)
    for (const table of ['crises', 'demandes', 'lieux', 'missions', 'volontaires', 'hebergements', 'entraides', 'zones_danger', 'zones_risque', 'entreprises_convention', 'benevoles_association']) {
      canal.on('postgres_changes', { event: '*', schema: 'public', table, filter: filtre }, () => void charger())
    }
    canal.on('postgres_changes', { event: '*', schema: 'public', table: 'reponses_mission' }, () => void charger())
    canal.subscribe()
    const minuteur = window.setInterval(() => void charger(), 30000)
    // Retour du réseau : mise à jour immédiate, sans attendre les 30 s
    const enLigne = () => void charger()
    window.addEventListener('online', enLigne)
    return () => {
      void client.removeChannel(canal)
      window.clearInterval(minuteur)
      window.removeEventListener('online', enLigne)
    }
  }, [client, commune, charger])

  const location = useLocation()
  const page = (location.pathname.replace(/^\/mairie\/?/, '').split('/')[0] || '') as Page
  const centre: [number, number] = donnees?.position ? [donnees.position.lat, donnees.position.lng] : centreCommune

  return (
    <div className="mairie">
      <header className="mairie-barre">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Logo taille={40} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Le nom vient du compte de la mairie : pas de renommage ici */}
            <strong>Vigipop · {coordinateur.communeNom}</strong>
            <span style={{ fontSize: 13, color: 'var(--bleu-clair)' }}>Cellule de crise · {coordinateur.nom}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {donnees?.crise ? (
            <span className="mairie-etiquette mairie-etiquette--urgent">Mode crise actif</span>
          ) : (
            <span className="mairie-etiquette">Veille</span>
          )}
          <BoutonInstaller />
          <button
            type="button"
            className="mairie-bouton"
            onClick={() => {
              effacerCacheMairie()
              void client.auth.signOut()
            }}
          >
            Se déconnecter
          </button>
        </div>
      </header>

      {erreur && (
        <p role="alert" style={{ background: 'var(--urgence-pale)', color: 'var(--urgence-fonce)', padding: '10px 24px', fontWeight: 700 }}>
          {erreur}{' '}
          {donnees && copieDu
            ? `Vous voyez la liste enregistrée sur cet ordinateur à ${heure(copieDu)} : imprimez-la si la coupure dure. Les changements reprendront au retour du réseau.`
            : donnees
              ? 'Vous voyez la dernière liste reçue : imprimez-la si la coupure dure. Nouvel essai automatique.'
              : 'Nouvel essai automatique.'}
        </p>
      )}

      {!donnees ? (
        <p style={{ padding: 24 }}>Chargement…</p>
      ) : premierPassage && !donnees.crise ? (
        <PremierPassage risques={donnees.risques} communeId={commune} communeNom={coordinateur.communeNom} onEnregistre={() => void charger()} onTermine={() => setPremierPassage(false)} />
      ) : !pagesVisibles(donnees).includes(page) ? (
        <Navigate to="/mairie" replace />
      ) : (
        <div className="mairie-cadre">
          <Navigation page={page} donnees={donnees} />
          <main className="mairie-page" aria-labelledby="titre-page">
            <h1 id="titre-page" className="mairie-titre-page">
              {toutesPages.find((p) => p.id === page)?.titre ?? 'Accueil'}
            </h1>
            {descriptionsPages[page] && <p className="mairie-description-page">{descriptionsPages[page]}</p>}
            {page === '' && (
              <div className="mairie-contenu">
                <div className="mairie-colonne">
                  {donnees.crise && <AFaire donnees={donnees} />}
                  {!donnees.crise && pagesVisibles(donnees).includes('demandes') && (
                    <section className="mairie-panneau" style={{ borderColor: 'var(--urgence)', borderWidth: 2 }}>
                      <h2>Demande d’aide reçue hors crise</h2>
                      <p style={{ margin: 0, fontSize: 14 }}>Un habitant a demandé de l’aide alors qu’aucune crise n’est déclenchée.</p>
                      <Link to="/mairie/demandes" className="mairie-bouton mairie-bouton--principal" style={{ alignSelf: 'flex-start', textDecoration: 'none' }}>
                        Voir la demande
                      </Link>
                    </section>
                  )}
                  {donnees.crise && <Compteurs demandes={donnees.demandes} />}
                  {/* Hors crise, la carte de l'accueil sert aussi à tracer ou importer les zones exposées aux risques */}
                  <CarteMairie
                    mode={donnees.crise ? 'crise' : 'risques'}
                    lieux={donnees.lieux}
                    demandes={donnees.crise ? donnees.demandes : []}
                    zones={donnees.zones}
                    zonesRisque={donnees.zonesRisque}
                    risques={donnees.risques}
                    communeId={commune}
                    centre={centre}
                  />
                </div>
                <div className="mairie-colonne">
                  <PanneauCrise crise={donnees.crise} communeId={commune} />
                  {!donnees.crise && <Preparation donnees={donnees} />}
                </div>
              </div>
            )}
            {page === 'demandes' && (
              <div className="mairie-pile">
                <Demandes demandes={donnees.demandes} depuis={donnees.crise?.declenchee_a ?? null} communeNom={coordinateur.communeNom} />
              </div>
            )}
            {page === 'volontaires' && (
              <div className="mairie-contenu">
                <div className="mairie-colonne">
                  <PanneauBesoins
                    demandes={donnees.demandes}
                    volontaires={donnees.volontaires}
                    onMission={(m) => {
                      setModeleMission({ ...m, numero: Date.now() })
                      window.setTimeout(() => document.getElementById('titre-missions')?.scrollIntoView({ behavior: 'smooth' }), 50)
                    }}
                  />
                  <PanneauMissions
                    key={modeleMission?.numero ?? 0}
                    modele={modeleMission}
                    missions={donnees.missions}
                    reponses={donnees.reponses}
                    volontaires={donnees.volontaires}
                    communeId={commune}
                  />
                  <h2 className="mairie-intertitre">3. Proposé automatiquement aux volontaires</h2>
                  <PanneauHebergement
                    demandes={donnees.demandes}
                    volontaires={donnees.volontaires}
                    hebergements={donnees.hebergements}
                    communeId={commune}
                    auto={donnees.hebergementAuto ?? true}
                    onAuto={() => void charger()}
                  />
                  <PanneauEntraides demandes={donnees.demandes} volontaires={donnees.volontaires} entraides={donnees.entraides} communeId={commune} />
                </div>
                <div className="mairie-colonne">
                  <PanneauVolontaires volontaires={donnees.volontaires} enCrise={!!donnees.crise} />
                </div>
              </div>
            )}
            {page === 'benevoles' && (
              <div className="mairie-pile">
                <PanneauBenevoles benevoles={donnees.benevoles ?? []} communeId={commune} enCrise={!!donnees.crise} />
              </div>
            )}
            {page === 'entreprises' && (
              <div className="mairie-pile">
                <PanneauEntreprises entreprises={donnees.entreprises ?? []} communeId={commune} enCrise={!!donnees.crise} />
              </div>
            )}
            {page === 'lieux' && (
              <div className="mairie-pile">
                <PanneauLieux lieux={donnees.lieux} communeId={commune} />
              </div>
            )}
            {page === 'parametres' && (
              <div className="mairie-contenu">
                <div className="mairie-colonne">
                  <PanneauRisques risques={donnees.risques} communeId={commune} onEnregistre={() => void charger()} />
                  <PanneauPosition position={donnees.position ?? null} communeId={commune} communeNom={coordinateur.communeNom} onEnregistre={() => void charger()} />
                </div>
                <div className="mairie-colonne">
                  <PanneauPush />
                </div>
              </div>
            )}
            {page === 'bilan' && (
              <div className="mairie-contenu">
                <div className="mairie-colonne">
                  <PanneauBilan communeId={commune} communeNom={coordinateur.communeNom} />
                </div>
                <div className="mairie-colonne">
                  <PanneauJournal journal={donnees.journal} />
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  )
}

// Menu des pages : la crise d'abord, avec le nombre de choses qui attendent la cellule
function Navigation({ page, donnees }: { page: Page; donnees: Donnees }) {
  const attente: Partial<Record<Page, number>> = {
    demandes: donnees.demandes.filter((d) => d.statut === 'transmise').length,
  }
  const visibles = pagesVisibles(donnees)
  const lien = (p: { id: Page; titre: string }) => (
    <Link key={p.id} to={p.id ? `/mairie/${p.id}` : '/mairie'} className="mairie-nav-lien" aria-current={page === p.id ? 'page' : undefined}>
      {p.titre}
      {attente[p.id] ? <span className="mairie-nav-compteur">{attente[p.id]}</span> : null}
    </Link>
  )
  return (
    <nav className="mairie-nav" aria-label="Pages de l'espace mairie">
      {groupesPages.map((g) => {
        // Hors crise, le menu ne montre que les informations de la mairie
        const pages = g.pages.filter((p) => visibles.includes(p.id) && (!!donnees.crise || !pagesHabitants.includes(p.id)))
        if (!pages.length) return null
        return (
          <div key={g.groupe || 'accueil'} className="mairie-nav-bloc">
            {g.groupe && <span className="mairie-nav-groupe">{g.groupe}</span>}
            {pages.map(lien)}
          </div>
        )
      })}
      {!donnees.crise && (
        <p className="mairie-nav-note">Les habitants qui ont besoin d’aide et ceux qui proposent leur aide apparaissent ici dès que le mode crise est déclenché.</p>
      )}
    </nav>
  )
}

// Accueil en crise : ce qui attend une action, du plus urgent au moins urgent, chacun avec son bouton
function AFaire({ donnees }: { donnees: Donnees }) {
  const aTraiter = donnees.demandes.filter((d) => d.statut === 'transmise')
  const prioritaires = aTraiter.filter((d) => priorite(d) < 2).length
  const lieuxOuverts = donnees.lieux.filter((l) => l.ouvert).length
  const benevoles = donnees.benevoles ?? []
  const mobilises = benevoles.filter((b) => b.statut === 'mobilise').length
  const disponibles = benevoles.filter((b) => b.statut === 'disponible').length
  const entreprises = donnees.entreprises ?? []
  const engagees = entreprises.filter((e) => e.statut !== 'disponible').length
  const gestes: { texte: string; detail: string; lien: string; bouton: string; urgent?: boolean }[] = [
    aTraiter.length > 0
      ? {
          texte: `${aTraiter.length} demande${aTraiter.length > 1 ? 's' : ''} à traiter`,
          detail: prioritaires > 0 ? `dont ${prioritaires} prioritaire${prioritaires > 1 ? 's' : ''} (blessé, évacuation, personne fragile)` : 'les plus graves en premier',
          lien: '/mairie/demandes',
          bouton: 'Traiter les demandes',
          urgent: true,
        }
      : { texte: 'Aucune demande en attente', detail: 'les nouvelles arrivent ici en direct', lien: '/mairie/demandes', bouton: 'Voir les demandes' },
    {
      texte: `${lieuxOuverts} lieu${lieuxOuverts > 1 ? 'x' : ''} d'accueil ouvert${lieuxOuverts > 1 ? 's' : ''} sur ${donnees.lieux.length}`,
      detail: 'les habitants voient seulement les lieux ouverts',
      lien: '/mairie/lieux',
      bouton: 'Ouvrir ou fermer un lieu',
    },
    {
      texte: `Protection civile : ${mobilises} bénévole${mobilises > 1 ? 's' : ''} mobilisé${mobilises > 1 ? 's' : ''}`,
      detail: `${disponibles} encore disponible${disponibles > 1 ? 's' : ''} dans l'association`,
      lien: '/mairie/benevoles',
      bouton: 'Appeler la protection civile',
    },
    {
      texte: `${engagees} entreprise${engagees > 1 ? 's' : ''} conventionnée${engagees > 1 ? 's' : ''} sollicitée${engagees > 1 ? 's' : ''}`,
      detail: `${entreprises.length} sous convention pour prêter du matériel`,
      lien: '/mairie/entreprises',
      bouton: 'Demander du matériel',
    },
  ]
  return (
    <section className="mairie-panneau" aria-labelledby="titre-a-faire" style={{ borderColor: 'var(--urgence)', borderWidth: 2 }}>
      <h2 id="titre-a-faire">À faire maintenant</h2>
      {gestes.map((g) => (
        <div key={g.lien} className="mairie-geste">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <strong style={{ color: g.urgent ? 'var(--urgence-fonce)' : 'var(--bleu-nuit)' }}>{g.texte}</strong>
            <span className="texte-doux" style={{ fontSize: 13 }}>
              {g.detail}
            </span>
          </div>
          <Link to={g.lien} className={`mairie-bouton${g.urgent ? ' mairie-bouton--urgence' : ''}`} style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
            {g.bouton}
          </Link>
        </div>
      ))}
    </section>
  )
}

// Accueil en veille : ce qui doit être prêt avant une crise
function Preparation({ donnees }: { donnees: Donnees }) {
  const points = [
    { ok: donnees.risques.length > 0, texte: 'Risques de la commune renseignés', lien: '/mairie/parametres' },
    { ok: donnees.zonesRisque.length > 0, texte: 'Zones exposées aux risques tracées sur la carte', lien: '/mairie' },
    { ok: donnees.lieux.length > 0, texte: "Lieux d'accueil et de secours enregistrés", lien: '/mairie/lieux' },
    { ok: (donnees.benevoles ?? []).length > 0, texte: 'Bénévoles de la protection civile enregistrés', lien: '/mairie/benevoles' },
    { ok: (donnees.entreprises ?? []).length > 0, texte: 'Entreprises conventionnées enregistrées', lien: '/mairie/entreprises' },
  ]
  return (
    <section className="mairie-panneau" aria-labelledby="titre-preparation">
      <h2 id="titre-preparation">Être prêt avant la crise</h2>
      {points.map((p) => (
        <Link key={p.texte} to={p.lien} className="mairie-geste" style={{ textDecoration: 'none', color: 'inherit' }}>
          <span>
            <span aria-hidden="true" style={{ marginRight: 8, fontWeight: 800, color: p.ok ? 'var(--bleu)' : 'var(--urgence-fonce)' }}>
              {p.ok ? '✓' : '!'}
            </span>
            {p.texte}
            <span className="sr-only">{p.ok ? ' : fait' : ' : à faire'}</span>
          </span>
          <span className="texte-doux" style={{ fontSize: 13 }}>
            {p.ok ? 'Voir' : 'Compléter'}
          </span>
        </Link>
      ))}
    </section>
  )
}

function Compteurs({ demandes }: { demandes: DemandeServeur[] }) {
  const ouvertes = demandes.filter((d) => d.statut !== 'close')
  const personnes = ouvertes.reduce((n, d) => n + d.personnes, 0)
  const items = [
    ['À traiter', demandes.filter((d) => d.statut === 'transmise').length],
    ['Prises en charge', demandes.filter((d) => d.statut === 'prise_en_charge').length],
    ['Personnes concernées', personnes],
    ['Vulnérables', ouvertes.filter((d) => d.personne_vulnerable).length],
  ] as const
  return (
    <section className="mairie-compteurs" aria-label="Synthèse">
      {items.map(([libelle, valeur]) => (
        <div key={libelle} className="mairie-compteur">
          <strong>{valeur}</strong>
          <span className="texte-doux">{libelle}</span>
        </div>
      ))}
    </section>
  )
}

type Filtre = 'a-traiter' | 'en-cours' | 'terminees'

// Demandes terminées : celles de la crise en cours, ou des dernières 48 h hors crise.
// À la fin d'une crise, le serveur clôt les demandes encore ouvertes (migration 0010).
function Demandes({ demandes, depuis, communeNom }: { demandes: DemandeServeur[]; depuis: string | null; communeNom: string }) {
  const [filtre, setFiltre] = useState<Filtre>('a-traiter')
  const [organisation, setOrganisation] = useState<{ id: string; texte: string } | null>(null)
  const [ouverture] = useState(() => Date.now())
  const limite = depuis ?? new Date(ouverture - 48 * 3600 * 1000).toISOString()
  const visibles = demandes
    .filter((d) =>
      filtre === 'a-traiter'
        ? d.statut === 'transmise'
        : filtre === 'en-cours'
          ? d.statut === 'prise_en_charge'
          : ['aide_organisee', 'close'].includes(d.statut) && d.updated_at >= limite,
    )
    .sort((a, b) => priorite(a) - priorite(b) || a.created_at.localeCompare(b.created_at))

  const changerStatut = async (id: string, statut: StatutDemande) => {
    await serveur!.from('demandes').update({ statut }).eq('id', id)
  }

  // « Aide organisée » : la mairie dit à l'habitant ce qui est prévu ; il le lit dans l'app
  const organiser = async (e: FormEvent) => {
    e.preventDefault()
    if (!organisation || organisation.texte.trim().length < 3) return
    const { error } = await serveur!
      .from('demandes')
      .update({ statut: 'aide_organisee', reponse_mairie: organisation.texte.trim() })
      .eq('id', organisation.id)
    if (!error) setOrganisation(null)
  }

  return (
    <section className="mairie-panneau" aria-labelledby="titre-demandes">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h2 id="titre-demandes">Demandes d'aide</h2>
      </div>
      <div className="mairie-etapes" role="group" aria-label="Étapes de traitement des demandes">
        {(
          [
            ['a-traiter', '1. À traiter', demandes.filter((d) => d.statut === 'transmise').length],
            ['en-cours', '2. Prises en charge', demandes.filter((d) => d.statut === 'prise_en_charge').length],
            ['terminees', '3. Terminées', demandes.filter((d) => ['aide_organisee', 'close'].includes(d.statut) && d.updated_at >= limite).length],
          ] as const
        ).map(([id, libelle, nombre]) => (
          <button key={id} type="button" className="mairie-etape" aria-pressed={filtre === id} onClick={() => setFiltre(id)}>
            <strong>{nombre}</strong>
            <span>{libelle}</span>
          </button>
        ))}
      </div>
      <p className="mairie-consigne-etape">
        {filtre === 'a-traiter'
          ? 'Les plus graves sont en haut. Appelez la personne si elle a laissé un numéro, puis cliquez sur « Prendre en charge ».'
          : filtre === 'en-cours'
            ? "Organisez l'aide (hébergement, transport, mission, protection civile…), puis cliquez sur « Aide organisée » pour dire à l'habitant ce qui est prévu."
            : "Demandes dont l'aide est organisée ou qui sont closes. « Rouvrir » si la situation change."}
      </p>
      <ActionsListe demandes={demandes} communeNom={communeNom} />

      {visibles.length === 0 && <p className="texte-doux">Aucune demande dans cette catégorie.</p>}

      {visibles.map((d) => {
        const urgent = d.situation === 'blesse' || d.situation === 'evac'
        const coords = d.position.match(/^\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\s*$/)
        return (
          <article key={d.id} className="mairie-demande" style={{ borderLeftColor: urgent ? 'var(--urgence)' : 'var(--bleu)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 16 }}>
                {situations.find((s) => s.id === d.situation)?.label ?? d.situation}
              </strong>
              <span className="texte-doux">
                {d.reference} · {heure(d.created_at)} · {libelleStatut[d.statut]}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {urgent && <span className="mairie-etiquette mairie-etiquette--urgent">Prioritaire</span>}
              {d.personne_vulnerable && <span className="mairie-etiquette mairie-etiquette--urgent">Personne vulnérable</span>}
              {d.source === 'sms' && <span className="mairie-etiquette">Reçue par SMS</span>}
              <span className="mairie-etiquette">
                {d.personnes} personne{d.personnes > 1 ? 's' : ''}
              </span>
              {d.besoins.map((b) => (
                <span key={b} className="mairie-etiquette">
                  {listeBesoins.find((x) => x.id === b)?.label ?? b}
                </span>
              ))}
            </div>
            {d.message_sms && (
              <blockquote style={{ fontSize: 14, background: 'var(--bleu-voile)', borderRadius: 8, padding: '8px 10px', whiteSpace: 'pre-line' }}>
                <span className="texte-doux">SMS reçu :</span> {d.message_sms}
              </blockquote>
            )}
            <div style={{ fontSize: 14 }}>
              Position :{' '}
              {coords ? (
                <a href={`https://www.openstreetmap.org/?mlat=${coords[1]}&mlon=${coords[2]}#map=17/${coords[1]}/${coords[2]}`} target="_blank" rel="noreferrer">
                  {d.position} (voir sur la carte)
                </a>
              ) : (
                d.position
              )}
            </div>
            <div style={{ fontSize: 14 }}>
              Contact :{' '}
              {d.telephone ? (
                <>
                  {d.prenom || 'Sans prénom'} ·{' '}
                  <a href={`tel:${d.telephone.replace(/[\s.-]/g, '')}`} style={{ fontWeight: 700 }}>
                    Appeler le {d.telephone}
                  </a>
                </>
              ) : (
                <span className="texte-doux">{d.prenom ? `${d.prenom} · ` : ''}aucun numéro laissé</span>
              )}
            </div>
            {d.reponse_mairie && (
              <div style={{ fontSize: 14, background: 'var(--bleu-voile)', borderRadius: 8, padding: '8px 10px' }}>
                <strong>Message envoyé à l'habitant :</strong> {d.reponse_mairie}
              </div>
            )}
            {organisation?.id === d.id ? (
              <form onSubmit={(e) => void organiser(e)} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, fontWeight: 700 }}>
                  Ce qui est prévu (envoyé à l'habitant)
                  <textarea
                    className="mairie-champ"
                    value={organisation.texte}
                    maxLength={300}
                    autoFocus
                    placeholder="Ex. : un volontaire passe vous chercher à 15 h avec un véhicule. Restez joignable."
                    onChange={(e) => setOrganisation({ id: d.id, texte: e.target.value })}
                  />
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="submit" className="mairie-bouton mairie-bouton--principal" disabled={organisation.texte.trim().length < 3}>
                    Envoyer à l'habitant
                  </button>
                  <button type="button" className="mairie-bouton" onClick={() => setOrganisation(null)}>
                    Annuler
                  </button>
                </div>
              </form>
            ) : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {d.statut === 'transmise' && (
                <button type="button" className="mairie-bouton mairie-bouton--principal" onClick={() => void changerStatut(d.id, 'prise_en_charge')}>
                  Prendre en charge
                </button>
              )}
              {d.statut === 'prise_en_charge' && (
                <button type="button" className="mairie-bouton mairie-bouton--principal" onClick={() => setOrganisation({ id: d.id, texte: d.reponse_mairie ?? '' })}>
                  Aide organisée…
                </button>
              )}
              {d.statut !== 'close' && (
                <button type="button" className="mairie-bouton" onClick={() => void changerStatut(d.id, 'close')}>
                  Clore
                </button>
              )}
              {d.statut === 'aide_organisee' && (
                <button type="button" className="mairie-bouton" onClick={() => setOrganisation({ id: d.id, texte: d.reponse_mairie ?? '' })}>
                  Modifier le message
                </button>
              )}
              {d.statut === 'close' && (
                <button type="button" className="mairie-bouton" onClick={() => void changerStatut(d.id, 'transmise')}>
                  Rouvrir
                </button>
              )}
            </div>
            )}
          </article>
        )
      })}
    </section>
  )
}

function PanneauCrise({ crise, communeId }: { crise: CriseServeur | null; communeId: string }) {
  const [titre, setTitre] = useState(crise?.titre ?? '')
  const [consigne, setConsigne] = useState(crise?.consigne ?? '')
  const [confirme, setConfirme] = useState(false)
  const [message, setMessage] = useState('')

  const declencher = async (e: FormEvent) => {
    e.preventDefault()
    if (!confirme) return
    const { error } = await serveur!.from('crises').insert({ commune_id: communeId, titre: titre.trim(), consigne: consigne.trim() })
    setMessage(error ? "Échec du déclenchement : vérifiez la connexion." : '')
    setConfirme(false)
  }

  const modifier = async () => {
    if (!crise) return
    const { error } = await serveur!.from('crises').update({ titre: titre.trim(), consigne: consigne.trim() }).eq('id', crise.id)
    setMessage(error ? 'Échec de la modification.' : 'Consigne mise à jour chez les habitants.')
  }

  const terminer = async () => {
    if (!crise || !window.confirm(
        "Terminer la crise ? Les habitants repasseront en mode veille. Les demandes encore ouvertes seront closes et chaque habitant concerné sera invité à mettre à jour sa situation s'il a encore besoin d'aide.",
      )) return
    const { error } = await serveur!.from('crises').update({ active: false, terminee_a: new Date().toISOString() }).eq('id', crise.id)
    setMessage(error ? 'Échec : la crise est toujours active.' : '')
  }

  const valide = titre.trim().length >= 3 && consigne.trim().length >= 3

  return (
    <section className="mairie-panneau" aria-labelledby="titre-crise" style={crise ? { borderColor: 'var(--urgence)', borderWidth: 2 } : undefined}>
      <h2 id="titre-crise">{crise ? `Crise en cours depuis ${heure(crise.declenchee_a)}` : 'Déclencher le mode crise'}</h2>
      {!crise && (
        <div className="mairie-onglets" aria-label="Modèles">
          {modelesCrise.map((m) => (
            <button
              key={m.nom}
              type="button"
              className="mairie-bouton"
              onClick={() => {
                setTitre(m.titre)
                setConsigne(m.consigne)
              }}
            >
              {m.nom}
            </button>
          ))}
        </div>
      )}
      <form onSubmit={declencher} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, fontWeight: 700 }}>
          Alerte affichée aux habitants
          <input className="mairie-champ" value={titre} maxLength={140} onChange={(e) => setTitre(e.target.value)} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, fontWeight: 700 }}>
          Consigne
          <textarea className="mairie-champ" value={consigne} maxLength={400} onChange={(e) => setConsigne(e.target.value)} />
        </label>
        {crise ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="mairie-bouton mairie-bouton--principal" disabled={!valide} onClick={() => void modifier()}>
              Mettre à jour la consigne
            </button>
            <button type="button" className="mairie-bouton" onClick={() => void terminer()}>
              Terminer la crise
            </button>
          </div>
        ) : (
          <>
            {/* Double confirmation : un déclenchement par erreur alerterait toute la commune */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14, lineHeight: 1.4 }}>
              <input type="checkbox" checked={confirme} onChange={(e) => setConfirme(e.target.checked)} style={{ width: 20, height: 20, margin: 0, flexShrink: 0 }} />
              Je confirme : tous les habitants de la commune verront cette alerte.
            </label>
            <button type="submit" className="mairie-bouton mairie-bouton--urgence" disabled={!valide || !confirme}>
              Déclencher le mode crise
            </button>
          </>
        )}
      </form>
      {message && (
        <p role="status" style={{ fontSize: 14 }}>
          {message}
        </p>
      )}
    </section>
  )
}

// Position GPS envoyée par l'habitant (« lat, lng ») ; une adresse saisie n'est pas placée
function coordonneesDemande(d: DemandeServeur) {
  const m = d.position.match(/^\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\s*$/)
  return m ? { lat: Number(m[1]), lng: Number(m[2]) } : null
}

type PropsCarte = {
  lieux: LieuServeur[]
  demandes: DemandeServeur[]
  zones: ZoneServeur[]
  zonesRisque: ZoneRisqueServeur[]
  risques: string[]
  communeId: string
  centre: [number, number]
  // Crise : demandes et zones à éviter ; risques : zones permanentes du TIM et du DICRIM
  // veille : simple consultation (lieux, zones exposées), sans demandes ni tracé
  mode: 'crise' | 'risques' | 'veille'
}

// Zone tracée à la main : à éviter (crise en cours, rouge) ou exposée à un risque du TIM (permanente)
type Trace = { type: 'danger' | 'risque'; points: [number, number][] }

function CarteMairie({ lieux, demandes, zones, zonesRisque, risques, communeId, centre, mode }: PropsCarte) {
  // Chaque clic sur la carte ajoute un point du contour
  const [trace, setTrace] = useState<Trace | null>(null)
  const [nom, setNom] = useState('')
  const [consigne, setConsigne] = useState('')
  // Zones de risque : risque concerné et document d'origine
  const choixRisques = [...risques, ...risquesSuggeres.filter((r) => !risques.some((x) => x.toLowerCase() === r.toLowerCase()))]
  const [risque, setRisque] = useState('')
  const [source, setSource] = useState('TIM')
  const [importees, setImportees] = useState<ZoneImportee[] | null>(null)
  const [message, setMessage] = useState('')
  const ajouterPoint = useCallback((p: [number, number]) => setTrace((t) => (t ? { ...t, points: [...t.points, p] } : t)), [])
  const risqueChoisi = risque || choixRisques[0] || ''

  const commencer = (type: Trace['type']) => {
    setImportees(null)
    setMessage('')
    setTrace({ type, points: [] })
  }

  const enregistrer = async (e: FormEvent) => {
    e.preventDefault()
    if (!trace || trace.points.length < 3) return
    const { error } =
      trace.type === 'danger'
        ? await serveur!.from('zones_danger').insert({ commune_id: communeId, nom: nom.trim(), consigne: consigne.trim(), points: trace.points })
        : await serveur!.from('zones_risque').insert({
            commune_id: communeId,
            risque: risqueChoisi,
            nom: nom.trim(),
            consigne: consigne.trim(),
            source: source.trim() || 'TIM',
            points: trace.points,
          })
    if (error) {
      setMessage("Échec : la zone n'a pas été publiée.")
      return
    }
    setMessage(
      trace.type === 'danger'
        ? 'Zone publiée : elle apparaît en rouge chez les habitants.'
        : 'Zone de risque publiée : les habitants la voient en pointillés, en veille comme en crise.',
    )
    setTrace(null)
    setNom('')
    setConsigne('')
  }

  // Fichier GeoJSON fourni avec le TIM, ou exporté de Géorisques / QGIS
  const lireFichier = async (fichier: File | undefined) => {
    if (!fichier) return
    setTrace(null)
    try {
      const zonesLues = zonesDepuisGeoJSON(await fichier.text())
      if (zonesLues.length === 0) {
        setMessage('Aucun polygone trouvé dans ce fichier.')
        return
      }
      setImportees(zonesLues.slice(0, 50))
      setMessage(zonesLues.length > 50 ? 'Seules les 50 premières zones du fichier seront importées.' : '')
    } catch (err) {
      setImportees(null)
      setMessage(
        err instanceof Error && err.message === 'coordonnees'
          ? 'Coordonnées non reconnues : le fichier doit être en degrés (WGS84, EPSG:4326), pas en Lambert 93.'
          : 'Fichier illisible : choisissez un fichier GeoJSON (.geojson ou .json).',
      )
    }
  }

  const importer = async () => {
    if (!importees) return
    const lignes = importees.map((z) => ({
      commune_id: communeId,
      risque: risqueChoisi,
      nom: z.nom.length >= 3 ? z.nom : `Zone ${z.nom}`,
      consigne: consigne.trim(),
      source: source.trim() || 'TIM',
      points: z.points,
    }))
    const { error } = await serveur!.from('zones_risque').insert(lignes)
    if (error) {
      setMessage("Échec : les zones n'ont pas été importées. La migration 0012 est-elle lancée ?")
      return
    }
    setMessage(`${lignes.length} zone${lignes.length > 1 ? 's' : ''} de risque importée${lignes.length > 1 ? 's' : ''}.`)
    setImportees(null)
    setConsigne('')
  }

  const retirer = async (z: ZoneServeur) => {
    if (!window.confirm(`Retirer la zone « ${z.nom} » de la carte des habitants ?`)) return
    const { error } = await serveur!.from('zones_danger').update({ active: false }).eq('id', z.id)
    setMessage(error ? 'Échec : la zone est toujours affichée.' : '')
  }

  const retirerRisque = async (z: ZoneRisqueServeur) => {
    if (!window.confirm(`Supprimer la zone de risque « ${z.nom} » ? Elle disparaîtra de la carte des habitants.`)) return
    const { error } = await serveur!.from('zones_risque').delete().eq('id', z.id)
    setMessage(error ? 'Échec : la zone est toujours affichée.' : '')
  }

  // Champs propres aux zones de risque, communs au tracé et à l'import
  const champsRisque = (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, fontWeight: 700, flex: 1, minWidth: 160 }}>
        Risque
        <select className="mairie-champ" value={risqueChoisi} onChange={(e) => setRisque(e.target.value)}>
          {choixRisques.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, fontWeight: 700, flex: 1, minWidth: 160 }}>
        Source
        <input className="mairie-champ" value={source} maxLength={120} placeholder="TIM 2024, DICRIM 2022…" onChange={(e) => setSource(e.target.value)} />
      </label>
    </div>
  )

  const ouvertes = demandes.filter((d) => d.statut !== 'close' && d.statut !== 'aide_organisee')
  const reperes: Repere[] = [
    ...lieux.filter(estPlace).map((l) => ({
      id: `lieu-${l.id}`,
      lat: l.lat,
      lng: l.lng,
      couleur: couleurLieu[l.type],
      titre: `${l.nom} · ${l.ouvert ? 'ouvert' : 'fermé'}`,
      attenue: !l.ouvert,
    })),
    ...(mode === 'risques' ? [] : ouvertes).flatMap((d) => {
      const c = coordonneesDemande(d)
      if (!c) return []
      const urgent = d.situation === 'blesse' || d.situation === 'evac' || d.personne_vulnerable
      return [{ id: `demande-${d.id}`, ...c, couleur: urgent ? '#c2410c' : '#e9a23b', titre: `${d.reference} · ${libelleStatut[d.statut]}` }]
    }),
  ]
  const sansPosition = ouvertes.filter((d) => !coordonneesDemande(d)).length
  return (
    <section className="mairie-panneau" aria-labelledby="titre-carte">
      <h2 id="titre-carte">Carte de la commune</h2>
      {mode === 'risques' && (
        <p className="texte-doux" style={{ fontSize: 14, lineHeight: 1.5 }}>
          Zones connues pour être exposées (inondation, barrage, site industriel…), reprises des cartes que la préfecture envoie à la mairie
          (TIM, transmission d'informations au maire) ou du DICRIM. Les habitants les voient en pointillés, toute l'année.
        </p>
      )}
      <CarteInteractive
        reperes={reperes}
        zones={zones}
        zonesRisque={zonesRisque}
        trace={trace?.points}
        couleurTrace={trace?.type === 'risque' ? '#0e3a52' : undefined}
        onClicCarte={trace ? ajouterPoint : undefined}
        centre={centre}
        hauteur={380}
      />
      <div className="texte-doux" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 13 }}>
        {mode === 'crise' && <Legende couleur="#c2410c" texte="Demande prioritaire" />}
        {mode === 'crise' && <Legende couleur="#e9a23b" texte="Autre demande" />}
        <Legende couleur={couleurLieu.accueil} texte="Accueil" />
        <Legende couleur={couleurLieu.soins} texte="Secours" />
        <Legende couleur={couleurLieu.eau} texte="Eau" />
        {mode === 'crise' && <Legende couleur="#d92d20" texte="Zone à éviter" />}
        <Legende couleur="#86ddff" texte="Zone exposée à un risque" />
      </div>
      {trace ? (
        <form onSubmit={enregistrer} style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--bordure)', paddingTop: 12 }}>
          <p style={{ fontSize: 14, fontWeight: 700 }}>
            {trace.type === 'risque' ? 'Zone exposée à un risque : r' : 'Zone à éviter : r'}eprenez le contour en cliquant sur la carte ({trace.points.length} point
            {trace.points.length > 1 ? 's' : ''}, 3 minimum).
          </p>
          {trace.type === 'risque' && champsRisque}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, fontWeight: 700 }}>
            Nom de la zone
            <input
              className="mairie-champ"
              value={nom}
              maxLength={120}
              placeholder={trace.type === 'risque' ? 'Zone inondable du bord de rivière' : 'Quartier du bord de rivière'}
              onChange={(e) => setNom(e.target.value)}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, fontWeight: 700 }}>
            Consigne
            <input
              className="mairie-champ"
              value={consigne}
              maxLength={300}
              placeholder={trace.type === 'risque' ? "En cas d'alerte crue, montez à l'étage." : 'Ne pas circuler, même à pied.'}
              onChange={(e) => setConsigne(e.target.value)}
            />
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="submit"
              className={trace.type === 'danger' ? 'mairie-bouton mairie-bouton--urgence' : 'mairie-bouton mairie-bouton--principal'}
              disabled={trace.points.length < 3 || nom.trim().length < 3 || (trace.type === 'risque' && !risqueChoisi)}
            >
              Publier la zone
            </button>
            <button type="button" className="mairie-bouton" disabled={trace.points.length === 0} onClick={() => setTrace({ ...trace, points: trace.points.slice(0, -1) })}>
              Retirer le dernier point
            </button>
            <button type="button" className="mairie-bouton" onClick={() => setTrace(null)}>
              Annuler
            </button>
          </div>
        </form>
      ) : importees ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--bordure)', paddingTop: 12 }}>
          <p style={{ fontSize: 14, fontWeight: 700 }}>
            {importees.length} zone{importees.length > 1 ? 's' : ''} trouvée{importees.length > 1 ? 's' : ''} : {importees.map((z) => z.nom).slice(0, 4).join(', ')}
            {importees.length > 4 ? '…' : ''}
          </p>
          {champsRisque}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, fontWeight: 700 }}>
            Consigne (facultative, pour toutes les zones)
            <input className="mairie-champ" value={consigne} maxLength={300} onChange={(e) => setConsigne(e.target.value)} />
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="mairie-bouton mairie-bouton--principal" disabled={!risqueChoisi} onClick={() => void importer()}>
              Importer sur la carte
            </button>
            <button type="button" className="mairie-bouton" onClick={() => setImportees(null)}>
              Annuler
            </button>
          </div>
        </div>
      ) : mode === 'veille' ? null : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {mode === 'crise' ? (
            <button type="button" className="mairie-bouton" onClick={() => commencer('danger')}>
              Tracer une zone à éviter
            </button>
          ) : (
            <button type="button" className="mairie-bouton" onClick={() => commencer('risque')}>
              Tracer une zone exposée
            </button>
          )}
          {mode === 'risques' && (
          <label className="mairie-bouton" style={{ cursor: 'pointer', position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            Importer une carte (fichier GeoJSON)
            <input
              type="file"
              accept=".geojson,.json,application/geo+json,application/json"
              style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
              onChange={(e) => {
                void lireFichier(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </label>
          )}
        </div>
      )}
      {mode === 'crise' && zones.map((z) => (
        <div key={z.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14 }}>
            <strong style={{ color: 'var(--danger)' }}>{z.nom}</strong>
            {z.consigne ? <span className="texte-doux"> · {z.consigne}</span> : null}
          </span>
          <button type="button" className="mairie-bouton" onClick={() => void retirer(z)}>
            Retirer
          </button>
        </div>
      ))}
      {mode === 'risques' && zonesRisque.map((z) => (
        <div key={z.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14 }}>
            <strong style={{ color: 'var(--bleu-nuit)' }}>
              {z.risque} · {z.nom}
            </strong>
            <span className="texte-doux">
              {z.consigne ? ` · ${z.consigne}` : ''} · {z.source}
            </span>
          </span>
          <button type="button" className="mairie-bouton" onClick={() => void retirerRisque(z)}>
            Supprimer
          </button>
        </div>
      ))}
      {message && (
        <p role="status" style={{ fontSize: 14 }}>
          {message}
        </p>
      )}
      {mode === 'crise' && sansPosition > 0 && (
        <p className="texte-doux" style={{ fontSize: 13 }}>
          {sansPosition} demande{sansPosition > 1 ? 's' : ''} sans GPS (adresse saisie à la main) : voir la liste.
        </p>
      )}
    </section>
  )
}

function Legende({ couleur, texte }: { couleur: string; texte: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 5, background: couleur }} />
      {texte}
    </span>
  )
}

const risquesSuggeres = ['Inondation', 'Crue', 'Tempête', 'Canicule', 'Feu de forêt', 'Mouvement de terrain', 'Risque industriel', 'Séisme', 'Submersion marine', 'Neige et verglas']

// Risques connus de la commune (DICRIM) : affichés aux habitants en veille, pour se préparer
function PanneauRisques({ risques, communeId, onEnregistre }: { risques: string[]; communeId: string; onEnregistre: () => void }) {
  const [saisie, setSaisie] = useState('')
  const [message, setMessage] = useState('')
  const enregistrer = async (liste: string[]) => {
    const { error } = await serveur!.from('communes').update({ risques: liste }).eq('id', communeId)
    setMessage(error ? "Échec : les risques n'ont pas été enregistrés." : '')
    if (!error) onEnregistre()
  }
  const ajouter = (r: string) => {
    const propre = r.trim().slice(0, 60)
    if (propre.length < 2 || risques.some((x) => x.toLowerCase() === propre.toLowerCase()) || risques.length >= 12) return
    void enregistrer([...risques, propre])
    setSaisie('')
  }
  const suggestions = risquesSuggeres.filter((r) => !risques.some((x) => x.toLowerCase() === r.toLowerCase()))

  return (
    <section className="mairie-panneau" aria-labelledby="titre-risques">
      <h2 id="titre-risques">Risques de la commune</h2>
      <p className="texte-doux" style={{ margin: 0 }}>
        Affichés aux habitants hors crise pour qu'ils se préparent. Reprenez ceux de votre TIM ou DICRIM ; les zones exposées se
        placent sur la carte de la commune.
      </p>
      {risques.length === 0 && <p className="texte-doux">Aucun risque renseigné : la rubrique est masquée dans l'app.</p>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {risques.map((r) => (
          <button
            key={r}
            type="button"
            className="mairie-bouton mairie-bouton--principal"
            aria-label={`Retirer ${r}`}
            onClick={() => void enregistrer(risques.filter((x) => x !== r))}
          >
            {r} ×
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          ajouter(saisie)
        }}
        style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, fontWeight: 700, flex: 1, minWidth: 180 }}>
          Ajouter un risque
          <input className="mairie-champ" value={saisie} maxLength={60} onChange={(e) => setSaisie(e.target.value)} />
        </label>
        <button type="submit" className="mairie-bouton" disabled={saisie.trim().length < 2 || risques.length >= 12}>
          Ajouter
        </button>
      </form>
      {suggestions.length > 0 && risques.length < 12 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="texte-doux">Suggestions :</span>
          {suggestions.map((r) => (
            <button key={r} type="button" className="mairie-bouton" onClick={() => ajouter(r)}>
              + {r}
            </button>
          ))}
        </div>
      )}
      {message && (
        <p role="status" style={{ fontSize: 14 }}>
          {message}
        </p>
      )}
    </section>
  )
}

// Première connexion : la mairie indique les risques de sa commune avant tout le reste.
// Ensuite, ils se modifient dans « Paramètres de la ville ».
function PremierPassage({ risques, communeId, communeNom, onEnregistre, onTermine }: { risques: string[]; communeId: string; communeNom: string; onEnregistre: () => void; onTermine: () => void }) {
  return (
    <main className="mairie-page" style={{ maxWidth: 760, margin: '0 auto' }} aria-labelledby="titre-bienvenue">
      <h1 id="titre-bienvenue" className="mairie-titre-page">
        Bienvenue, {communeNom}
      </h1>
      <p className="mairie-description-page">
        Avant de commencer, indiquez les risques connus de votre commune, tels qu’ils figurent dans votre DICRIM. Les habitants les voient
        pour se préparer. Vous pourrez les modifier plus tard dans « Paramètres de la ville ».
      </p>
      <PanneauRisques risques={risques} communeId={communeId} onEnregistre={onEnregistre} />
      <button type="button" className="mairie-bouton mairie-bouton--principal" disabled={risques.length === 0} onClick={onTermine} style={{ alignSelf: 'flex-start', marginTop: 16 }}>
        {risques.length === 0 ? 'Ajoutez au moins un risque pour continuer' : 'Continuer vers l’espace mairie'}
      </button>
    </main>
  )
}

// Centre et rayon de la commune : un visiteur dans ce rayon voit les services de la commune
// (géolocalisation acceptée par l'habitant ; sa position n'est jamais enregistrée)
function PanneauPosition({ position, communeId, communeNom, onEnregistre }: { position: PositionCommune | null; communeId: string; communeNom: string; onEnregistre: () => void }) {
  const [centre, setCentre] = useState<ResultatAdresse | null>(null)
  // La mairie n'a pas à retaper le nom de sa propre commune : son centre est trouvé automatiquement
  const [centreAuto, setCentreAuto] = useState<ResultatAdresse | null>(null)
  const [deplacer, setDeplacer] = useState(false)
  useEffect(() => {
    if (position) return
    let annule = false
    chercherAdresse(communeNom, 'municipality')
      .then((r) => {
        const trouve = r.find((c) => c.libelle.toLowerCase().startsWith(communeNom.trim().toLowerCase())) ?? null
        if (!annule) setCentreAuto(trouve)
      })
      .catch(() => {})
    return () => {
      annule = true
    }
  }, [position, communeNom])
  const centreChoisi = centre ?? (position ? null : centreAuto)
  const [rayon, setRayon] = useState(String(position?.rayon_km ?? 5))
  const [message, setMessage] = useState('')
  const enregistrer = async (e: FormEvent) => {
    e.preventDefault()
    const km = Number(rayon.replace(',', '.'))
    if (!(km >= 0.5 && km <= 50)) return setMessage('Rayon entre 0,5 et 50 km.')
    const modifs = centreChoisi ? { lat: centreChoisi.lat, lng: centreChoisi.lng, rayon_km: km } : { rayon_km: km }
    const { data, error } = await serveur!.from('communes').update(modifs).eq('id', communeId).select('id')
    if (error || !data?.length) return setMessage('Non enregistré. Lancez d’abord la migration 0015 dans Supabase.')
    setMessage('Enregistré.')
    setCentre(null)
    setDeplacer(false)
    onEnregistre()
  }
  return (
    <section className="mairie-panneau" aria-labelledby="titre-position">
      <h2 id="titre-position">Visiteurs géolocalisés</h2>
      <p className="texte-doux" style={{ margin: 0 }}>
        Une personne de passage qui a activé la localisation voit vos lieux, vos risques et vos alertes dans ce rayon. Sa position
        reste sur son téléphone : elle n'est jamais enregistrée.
      </p>
      <p style={{ margin: 0, fontSize: 14 }}>
        {position
          ? `Centre placé · rayon ${String(position.rayon_km).replace('.', ',')} km`
          : centreAuto
            ? `Centre : ${centreAuto.libelle}, trouvé automatiquement. Choisissez le rayon puis enregistrez.`
            : 'Commune pas encore placée : les visiteurs ne voient pas vos services.'}
      </p>
      <form onSubmit={(e) => void enregistrer(e)} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {deplacer || (!position && !centreAuto) ? (
          <ChampAdresse commune onChoix={setCentre} libelleChamp={position || centreAuto ? 'Autre centre (facultatif)' : 'Centre : nom de la commune'} />
        ) : (
          <button type="button" className="mairie-bouton" onClick={() => setDeplacer(true)} style={{ alignSelf: 'flex-start' }}>
            Placer le centre ailleurs
          </button>
        )}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, fontWeight: 700, maxWidth: 160 }}>
          Rayon (km)
          <input className="mairie-champ" inputMode="decimal" value={rayon} onChange={(e) => setRayon(e.target.value)} />
        </label>
        <button type="submit" className="mairie-bouton mairie-bouton--principal" disabled={!position && !centreChoisi} style={{ alignSelf: 'flex-start' }}>
          Enregistrer
        </button>
      </form>
      {message && (
        <p role="status" style={{ fontSize: 14 }}>
          {message}
        </p>
      )}
    </section>
  )
}

const lieuVide = { nom: '', type: 'accueil' as LieuServeur['type'], details: '', places: '' }

function PanneauLieux({ lieux, communeId }: { lieux: LieuServeur[]; communeId: string }) {
  const [ouvert, setOuvert] = useState(false)
  const [lieu, setLieu] = useState(lieuVide)
  const [adresse, setAdresse] = useState<ResultatAdresse | null>(null)
  const [message, setMessage] = useState('')
  // La requête Supabase ne part qu'une fois attendue : sans await, rien n'était envoyé
  const basculer = async (l: LieuServeur) => {
    const { error } = await serveur!.from('lieux').update({ ouvert: !l.ouvert }).eq('id', l.id)
    setMessage(error ? "Échec : le lieu n'a pas changé d'état." : '')
  }
  const supprimer = async (l: LieuServeur) => {
    if (!window.confirm(`Supprimer « ${l.nom} » ? Il disparaîtra de la carte des habitants.`)) return
    const { error } = await serveur!.from('lieux').delete().eq('id', l.id)
    setMessage(error ? "Échec : le lieu n'a pas été supprimé." : 'Lieu supprimé.')
  }

  const ajouter = async (e: FormEvent) => {
    e.preventDefault()
    if (!adresse) return
    const { error } = await serveur!.from('lieux').insert({
      commune_id: communeId,
      type: lieu.type,
      nom: lieu.nom.trim(),
      details: lieu.details.trim(),
      places: lieu.places ? Number(lieu.places) : null,
      adresse: adresse.libelle,
      lat: adresse.lat,
      lng: adresse.lng,
      // Les secours (pompiers, poste médical) sont permanents ; les autres lieux s'ouvrent en crise
      ouvert: lieu.type === 'soins',
    })
    if (error) {
      setMessage("Échec : le lieu n'a pas été ajouté.")
      return
    }
    setMessage(lieu.type === 'soins' ? 'Point de secours ajouté, visible tout de suite par les habitants.' : 'Lieu ajouté, fermé par défaut : ouvrez-le quand il est prêt.')
    setLieu(lieuVide)
    setAdresse(null)
    setOuvert(false)
  }

  const valide = lieu.nom.trim().length >= 3 && adresse !== null

  return (
    <section className="mairie-panneau" aria-labelledby="titre-lieux">
      <h2 id="titre-lieux">Lieux d'accueil, d'aide et de secours</h2>
      <p className="texte-doux" style={{ margin: 0 }}>
        Centres d'accueil, points de distribution, pompiers, postes médicaux : ils apparaissent sur la carte des habitants.
      </p>
      {lieux.map((l) => (
        <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
            <strong style={{ fontSize: 15 }}>{l.nom}</strong>
            <span className="texte-doux">
              {libelleLieu[l.type]}
              {l.places !== null ? ` · ${l.places} places` : ''}
              {!estPlace(l) ? ' · pas encore sur la carte' : ''}
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={l.ouvert}
            aria-label={`${l.nom} ouvert`}
            onClick={() => void basculer(l)}
            className={`mairie-bouton${l.ouvert ? ' mairie-bouton--principal' : ''}`}
            style={{ minWidth: 92 }}
          >
            {l.ouvert ? 'Ouvert' : 'Fermé'}
          </button>
          <button type="button" className="mairie-bouton" aria-label={`Supprimer ${l.nom}`} onClick={() => void supprimer(l)}>
            Supprimer
          </button>
        </div>
      ))}
      {ouvert ? (
        <form onSubmit={ajouter} style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--bordure)', paddingTop: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, fontWeight: 700 }}>
            Nom du lieu
            <input className="mairie-champ" value={lieu.nom} maxLength={120} onChange={(e) => setLieu({ ...lieu, nom: e.target.value })} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, fontWeight: 700 }}>
            Type
            <select className="mairie-champ" value={lieu.type} onChange={(e) => setLieu({ ...lieu, type: e.target.value as LieuServeur['type'] })}>
              {(Object.keys(libelleLieu) as LieuServeur['type'][]).map((t) => (
                <option key={t} value={t}>
                  {libelleLieu[t]}
                </option>
              ))}
            </select>
          </label>
          <ChampAdresse onChoix={setAdresse} obligatoire />
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, fontWeight: 700 }}>
            Précisions (horaires, services)
            <input className="mairie-champ" value={lieu.details} maxLength={140} onChange={(e) => setLieu({ ...lieu, details: e.target.value })} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, fontWeight: 700 }}>
            Places (facultatif)
            <input className="mairie-champ" inputMode="numeric" value={lieu.places} onChange={(e) => setLieu({ ...lieu, places: e.target.value.replace(/\D/g, '') })} />
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="submit" className="mairie-bouton mairie-bouton--principal" disabled={!valide}>
              Ajouter le lieu
            </button>
            <button type="button" className="mairie-bouton" onClick={() => setOuvert(false)}>
              Annuler
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="mairie-bouton mairie-bouton--principal" style={{ alignSelf: 'flex-start' }} onClick={() => setOuvert(true)}>
          Ajouter un lieu
        </button>
      )}
      {message && (
        <p role="status" style={{ fontSize: 14 }}>
          {message}
        </p>
      )}
    </section>
  )
}

// Besoins sans mise en relation automatique : la mairie compare demandes et volontaires
// et lance une mission ciblée. Transport et matériel sont proposés automatiquement (0011).
const besoinsSuivis: { id: string; aides: string[]; auto?: string; mission?: { titre: string; categorie: string } }[] = [
  { id: 'heb', aides: ['heb'], auto: 'Proposé automatiquement (Hébergement solidaire)' },
  { id: 'transport', aides: ['vehicule'], auto: 'Proposé automatiquement au plus proche' },
  { id: 'materiel', aides: ['materiel'], auto: 'Proposé automatiquement au plus proche' },
  { id: 'eau', aides: ['mainoeuvre', 'vehicule'], mission: { titre: "Distribution d'eau et de repas", categorie: 'mainoeuvre' } },
  { id: 'med', aides: ['vehicule', 'competences'], mission: { titre: 'Livraison de médicaments', categorie: 'vehicule' } },
  { id: 'animaux', aides: ['temps', 'vehicule'], mission: { titre: "Prise en charge d'animaux", categorie: 'temps' } },
]

type PropsBesoins = { demandes: DemandeServeur[]; volontaires: Volontaire[]; onMission: (m: { titre: string; categorie: string }) => void }

function PanneauBesoins({ demandes, volontaires, onMission }: PropsBesoins) {
  const ouvertes = demandes.filter((d) => d.statut !== 'close')
  return (
    <section className="mairie-panneau" aria-labelledby="titre-besoins">
      <h2 id="titre-besoins">1. Besoins à couvrir</h2>
      <p className="texte-doux" style={{ marginTop: -4 }}>
        Pour chaque besoin : combien de demandes l'attendent, et combien de volontaires peuvent y répondre. En rouge : personne ne peut aider,
        appelez la protection civile ou une entreprise conventionnée.
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table className="mairie-tableau" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left' }}>
              <th scope="col">Besoin</th>
              <th scope="col">Demandes</th>
              <th scope="col">Personnes</th>
              <th scope="col">Volontaires</th>
              <th scope="col">Réponse</th>
            </tr>
          </thead>
          <tbody>
            {besoinsSuivis.map((b) => {
              const concernees = ouvertes.filter((d) => d.besoins.includes(b.id))
              const personnes = concernees.reduce((n, d) => n + d.personnes, 0)
              const aidants = volontaires.filter((v) => b.aides.some((r) => v.ressources.includes(r))).length
              const manque = concernees.length > 0 && aidants === 0
              return (
                <tr key={b.id} style={{ borderTop: '1px solid var(--bordure)' }}>
                  <th scope="row" style={{ padding: '8px 6px 8px 0', textAlign: 'left' }}>
                    {listeBesoins.find((x) => x.id === b.id)?.label ?? b.id}
                  </th>
                  <td style={{ padding: 6, fontWeight: concernees.length ? 800 : 400 }}>{concernees.length}</td>
                  <td style={{ padding: 6 }}>{personnes}</td>
                  <td style={{ padding: 6, color: manque ? 'var(--urgence-fonce)' : undefined, fontWeight: manque ? 800 : 400 }}>
                    {aidants}
                    <span className="texte-doux" style={{ fontWeight: 400 }}> ({b.aides.map(libelleRessource).join(', ')})</span>
                  </td>
                  <td style={{ padding: 6 }}>
                    {b.auto ? (
                      <span className="texte-doux">{b.auto}</span>
                    ) : (
                      <button type="button" className="mairie-bouton" disabled={concernees.length === 0} onClick={() => b.mission && onMission(b.mission)}>
                        Créer une mission
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

const libelleEntraide: Record<BesoinEntraide, { titre: string; aide: string; ressource: string }> = {
  transport: { titre: 'Transport', aide: 'véhicule', ressource: 'vehicule' },
  materiel: { titre: 'Matériel', aide: 'matériel', ressource: 'materiel' },
}

type PropsEntraides = { demandes: DemandeServeur[]; volontaires: Volontaire[]; entraides: Entraide[]; communeId: string }

// Transport et matériel : suivi des sollicitations automatiques, annulation, relance ou choix d'un volontaire
function PanneauEntraides({ demandes, volontaires, entraides, communeId }: PropsEntraides) {
  const [message, setMessage] = useState('')
  const lignes = demandes
    .filter((d) => d.statut !== 'close')
    .flatMap((d) => (['transport', 'materiel'] as BesoinEntraide[]).filter((b) => d.besoins.includes(b)).map((b) => ({ d, b })))
  const enCours = (e: Entraide) => e.statut === 'proposee' || e.statut === 'acceptee'
  const nom = (id: string) => {
    const v = volontaires.find((x) => x.auteur === id)
    return v ? [v.prenom, v.nom].filter(Boolean).join(' ') || 'Volontaire' : 'Volontaire'
  }

  const annuler = async (e: Entraide) => {
    if (!window.confirm('Annuler cette mise en relation ? Le volontaire sera prévenu dans son app.')) return
    const { error } = await serveur!.from('entraides').update({ statut: 'annulee' }).eq('id', e.id)
    setMessage(error ? "Échec : la mise en relation n'a pas été annulée." : 'Annulée. Relancez la recherche ou choisissez un volontaire.')
  }
  const relancer = async (demande: string) => {
    const { error } = await serveur!.rpc('relancer_entraides', { p_demande: demande })
    setMessage(error ? 'Échec de la relance.' : 'Recherche relancée.')
  }
  const proposer = async (demande: string, besoin: BesoinEntraide, aidant: string) => {
    if (!aidant) return
    const { error } = await serveur!.from('entraides').insert({ commune_id: communeId, demande_id: demande, besoin, aidant })
    setMessage(error ? 'Échec : une sollicitation est peut-être déjà en cours.' : 'Volontaire sollicité.')
  }

  return (
    <section className="mairie-panneau" aria-labelledby="titre-entraides">
      <h2 id="titre-entraides">Transport et matériel prêtés par des volontaires</h2>
      <p className="texte-doux" style={{ marginTop: -4 }}>
        Chaque besoin est proposé automatiquement au volontaire disponible le plus proche. En cas de refus, le suivant est sollicité.
      </p>
      {lignes.length === 0 && <p className="texte-doux">Aucune demande de transport ou de matériel en cours.</p>}
      {lignes.map(({ d, b }) => {
        const e = entraides.find((x) => x.demande_id === d.id && x.besoin === b && enCours(x))
        const refus = entraides.filter((x) => x.demande_id === d.id && x.besoin === b && x.statut === 'refusee').length
        const deja = new Set(entraides.filter((x) => x.demande_id === d.id && x.besoin === b).map((x) => x.aidant))
        const candidats = volontaires.filter((v) => v.ressources.includes(libelleEntraide[b].ressource) && !deja.has(v.auteur))
        return (
          <article key={`${d.id}-${b}`} className="mairie-demande" style={{ borderLeftColor: d.personne_vulnerable ? 'var(--urgence)' : 'var(--bleu)' }}>
            <strong style={{ fontSize: 15 }}>
              {libelleEntraide[b].titre} · {d.reference} · {d.personnes} pers.{d.prenom ? ` · ${d.prenom}` : ''}
            </strong>
            {e ? (
              <span className={`mairie-etiquette ${e.statut === 'acceptee' ? 'mairie-etiquette--ok' : ''}`} style={{ alignSelf: 'flex-start' }}>
                {e.statut === 'acceptee' ? `✓ Accepté par ${nom(e.aidant)}` : `Proposé à ${nom(e.aidant)} · réponse attendue`}
              </span>
            ) : (
              <span className="texte-doux">
                {candidats.length === 0 ? `Aucun volontaire disponible avec ${libelleEntraide[b].aide}` : 'En attente d’un volontaire'}
                {refus > 0 ? ` · ${refus} refus` : ''}
              </span>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {e ? (
                <button type="button" className="mairie-bouton" onClick={() => void annuler(e)}>
                  Annuler
                </button>
              ) : (
                <>
                  <button type="button" className="mairie-bouton" onClick={() => void relancer(d.id)}>
                    Relancer la recherche
                  </button>
                  {candidats.length > 0 && (
                    <select
                      className="mairie-champ"
                      aria-label={`Choisir un volontaire pour ${d.reference}`}
                      value=""
                      onChange={(ev) => void proposer(d.id, b, ev.target.value)}
                      style={{ maxWidth: 240 }}
                    >
                      <option value="">Choisir un volontaire…</option>
                      {candidats.map((v) => (
                        <option key={v.auteur} value={v.auteur}>
                          {nom(v.auteur)}
                        </option>
                      ))}
                    </select>
                  )}
                </>
              )}
            </div>
          </article>
        )
      })}
      {message && (
        <p role="status" style={{ fontSize: 14 }}>
          {message}
        </p>
      )}
    </section>
  )
}

const actif = (h: Hebergement) => h.statut === 'proposee' || h.statut === 'acceptee'

// Places restantes : on retire les personnes déjà proposées ou accueillies chez ce foyer
function placesRestantes(v: Volontaire, hebergements: Hebergement[]) {
  return v.places_hebergement - hebergements.filter((h) => h.hebergeur === v.auteur && actif(h)).reduce((n, h) => n + h.personnes, 0)
}

type PropsHebergement = { demandes: DemandeServeur[]; volontaires: Volontaire[]; hebergements: Hebergement[]; communeId: string }

// Besoins et foyers face à face. Le serveur propose seul le foyer le plus proche ;
// la mairie supervise : elle peut changer de foyer ou relancer la recherche.
function PanneauHebergement({ demandes, volontaires, hebergements, communeId, auto, onAuto }: PropsHebergement & { auto: boolean; onAuto: () => void }) {
  const [messageAuto, setMessageAuto] = useState('')
  const basculerAuto = async () => {
    const { data, error } = await serveur!.from('communes').update({ hebergement_auto: !auto }).eq('id', communeId).select('id')
    setMessageAuto(error || !data?.length ? 'Non enregistré. Lancez d’abord la migration 0018 dans Supabase.' : '')
    onAuto()
  }
  const besoins = demandes.filter((d) => d.statut !== 'close' && (d.besoins.includes('heb') || hebergements.some((h) => h.demande_id === d.id && actif(h))))
  // Ceux qui accueillent déjà d'abord, puis ceux qui ont une réponse à donner, puis les disponibles
  const rang = (v: Volontaire) => {
    const siens = hebergements.filter((h) => h.hebergeur === v.auteur && actif(h))
    return siens.some((h) => h.statut === 'acceptee') ? 0 : siens.length > 0 ? 1 : 2
  }
  const foyers = volontaires.filter((v) => v.ressources.includes('heb')).sort((a, b) => rang(a) - rang(b))
  const reference = (id: string) => demandes.find((d) => d.id === id)?.reference ?? '?'
  return (
    <section className="mairie-panneau" aria-labelledby="titre-hebergement">
      <h2 id="titre-hebergement">Hébergement chez l'habitant</h2>
      <div className="mairie-reglage">
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <strong>Répartition automatique : {auto ? 'activée' : 'désactivée'}</strong>
          <span className="texte-doux">
            {auto
              ? "Chaque demande part seule au foyer disponible le plus proche. L'hébergeur accepte ou refuse ; la personne voit l'offre et peut demander un autre foyer, jusqu'à en trouver un qui lui convient."
              : 'Aucun foyer n’est sollicité tout seul : vous proposez vous-même un foyer pour chaque demande.'}
          </span>
        </span>
        <button type="button" className="mairie-bouton" onClick={() => void basculerAuto()}>
          {auto ? 'Désactiver' : 'Activer'}
        </button>
      </div>
      {messageAuto && <p role="status" style={{ fontSize: 14 }}>{messageAuto}</p>}
      <div className="mairie-face-a-face">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h3 style={{ fontSize: 15 }}>
            Besoins <span className="mairie-etiquette">{besoins.length}</span>
          </h3>
          {besoins.length === 0 && <p className="texte-doux">Aucune demande d'hébergement en cours.</p>}
          {besoins.map((d) => (
            <article key={d.id} className="mairie-demande" style={{ borderLeftColor: d.personne_vulnerable ? 'var(--urgence)' : 'var(--bleu)' }}>
              <strong style={{ fontSize: 15 }}>
                {d.reference} · {d.personnes} personne{d.personnes > 1 ? 's' : ''}
                {d.prenom ? ` · ${d.prenom}` : ''}
              </strong>
              {d.personne_vulnerable && <span className="mairie-etiquette mairie-etiquette--urgent" style={{ alignSelf: 'flex-start' }}>Personne vulnérable</span>}
              <HebergementDemande demande={d} volontaires={volontaires} hebergements={hebergements} communeId={communeId} />
            </article>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h3 style={{ fontSize: 15 }}>
            Foyers d'accueil <span className="mairie-etiquette">{foyers.length}</span>
          </h3>
          {foyers.length === 0 && <p className="texte-doux">Aucun volontaire ne propose d'hébergement pour l'instant.</p>}
          {foyers.map((v) => {
            const accueils = hebergements.filter((h) => h.hebergeur === v.auteur && actif(h))
            const restantes = placesRestantes(v, hebergements)
            return (
              <article key={v.auteur} className="mairie-demande" style={{ borderLeftColor: restantes > 0 ? 'var(--bleu)' : 'var(--bordure)' }}>
                <strong style={{ fontSize: 15 }}>
                  {v.prenom || 'Volontaire'} ·{' '}
                  {v.places_hebergement === 0
                    ? 'nombre de places non transmis'
                    : `${restantes}/${v.places_hebergement} place${v.places_hebergement > 1 ? 's' : ''} libre${restantes > 1 ? 's' : ''}`}
                </strong>
                <span className="texte-doux">{v.adresse || 'Adresse non renseignée'}</span>
                {accueils.map((h) => (
                  <span key={h.id} className={`mairie-etiquette ${h.statut === 'acceptee' ? 'mairie-etiquette--ok' : ''}`} style={{ alignSelf: 'flex-start' }}>
                    {h.statut === 'acceptee' ? '✓ Accueille' : 'Sollicité pour'} {reference(h.demande_id)} · {h.personnes} pers.
                    {h.statut === 'proposee' ? ' · réponse attendue' : ''}
                  </span>
                ))}
                {v.telephone && (
                  <a href={lienTelephone(v.telephone)} style={{ fontSize: 14, fontWeight: 700 }}>
                    Appeler le {v.telephone}
                  </a>
                )}
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// Suivi d'une demande : foyer proposé ou accepté, changement de foyer, relance de la recherche
function HebergementDemande({ demande, volontaires, hebergements, communeId }: { demande: DemandeServeur; volontaires: Volontaire[]; hebergements: Hebergement[]; communeId: string }) {
  const [ouvert, setOuvert] = useState(false)
  const [message, setMessage] = useState('')
  const lies = hebergements.filter((h) => h.demande_id === demande.id)
  const enCours = lies.find(actif)
  const refus = new Set(lies.filter((h) => h.statut === 'refusee').map((h) => h.hebergeur))
  // Offres que la personne a déclinées : ces foyers ne lui sont plus proposés
  const declines = new Set(lies.filter((h) => h.statut === 'declinee').map((h) => h.hebergeur))
  const position = coordonneesDemande(demande)
  const nom = (auteur: string) => volontaires.find((v) => v.auteur === auteur)

  const restantes = (v: Volontaire) => placesRestantes(v, hebergements)
  const distance = (v: Volontaire) => (position && v.lat !== null && v.lng !== null ? distanceMetres(position, { lat: v.lat, lng: v.lng }) : null)
  const candidats = volontaires
    .filter((v) => v.ressources.includes('heb') && !refus.has(v.auteur) && !declines.has(v.auteur) && restantes(v) >= demande.personnes)
    .sort((a, b) => (distance(a) ?? Infinity) - (distance(b) ?? Infinity))

  const proposer = async (v: Volontaire) => {
    setMessage('')
    const { error } = await serveur!
      .from('hebergements')
      .insert({ commune_id: communeId, demande_id: demande.id, hebergeur: v.auteur, personnes: Math.min(demande.personnes, 20) })
    if (error) setMessage("La proposition n'a pas pu être envoyée. Réessayez.")
    else setOuvert(false)
  }

  // Annulée par la mairie : pas de relance automatique, elle choisit la suite
  const changer = async (h: Hebergement) => {
    if (!window.confirm("Retirer ce foyer ? L'hébergeur et la personne ne verront plus les coordonnées. Vous choisirez ensuite un autre foyer.")) return
    await serveur!.from('hebergements').update({ statut: 'annulee' }).eq('id', h.id)
    setOuvert(true)
  }

  const relancer = async () => {
    setMessage('')
    const { error } = await serveur!.rpc('relancer_hebergement', { p_demande: demande.id })
    if (error) setMessage("La relance n'a pas pu être envoyée. Réessayez.")
    else setOuvert(false)
  }

  if (enCours) {
    const v = nom(enCours.hebergeur)
    return (
      <div style={{ fontSize: 14, display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--bleu-voile)', borderRadius: 10, padding: '8px 10px' }}>
        <span className={`mairie-etiquette ${enCours.statut === 'acceptee' ? 'mairie-etiquette--ok' : ''}`} style={{ alignSelf: 'flex-start' }}>
          {enCours.statut === 'acceptee' ? `✓ Hébergé chez ${v?.prenom || 'un volontaire'}` : `En attente de la réponse de ${v?.prenom || 'un volontaire'}`}
        </span>
        <span>
          {v?.adresse || 'Adresse non renseignée'}
          {enCours.statut === 'acceptee' ? ' · coordonnées échangées avec la personne' : ''}
        </span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {v?.telephone && (
            <a href={lienTelephone(v.telephone)} className="mairie-bouton" style={{ textDecoration: 'none' }}>
              Appeler l'hébergeur
            </a>
          )}
          <button type="button" className="mairie-bouton" onClick={() => void changer(enCours)}>
            Changer de foyer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontSize: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {refus.size > 0 && (
        <span className="texte-doux">
          Refusé par : {[...refus].map((a) => nom(a)?.prenom || 'un volontaire').join(', ')}
        </span>
      )}
      {declines.size > 0 && (
        <span className="texte-doux">
          Ne convenait pas à la personne : {[...declines].map((a) => nom(a)?.prenom || 'un volontaire').join(', ')}
        </span>
      )}
      <span>
        <strong>Hébergement :</strong> {candidats.length === 0 ? 'aucun foyer disponible pour le moment, la recherche reprendra dès qu’un foyer se déclare' : 'aucun foyer sollicité'}
      </span>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {/* Comme le serveur : jamais deux fois le même foyer pour une demande */}
        {candidats.some((v) => !lies.some((h) => h.hebergeur === v.auteur)) && (
          <button type="button" className="mairie-bouton mairie-bouton--principal" onClick={() => void relancer()}>
            Proposer au plus proche
          </button>
        )}
        <button type="button" className="mairie-bouton" aria-expanded={ouvert} onClick={() => setOuvert(!ouvert)}>
          {ouvert ? 'Fermer la liste' : 'Choisir un foyer'}
        </button>
      </div>
      {ouvert && (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {candidats.length === 0 && (
            <li className="texte-doux">
              Aucun foyer disponible avec {demande.personnes} place{demande.personnes > 1 ? 's' : ''}. Orientez vers un centre d'accueil.
            </li>
          )}
          {candidats.map((v) => {
            const m = distance(v)
            return (
              <li key={v.auteur} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', border: '1px solid var(--bordure)', borderRadius: 10, padding: '6px 10px' }}>
                <span>
                  <strong>{v.prenom || 'Volontaire'}</strong> · {restantes(v)} place{restantes(v) > 1 ? 's' : ''}
                  {m !== null ? ` · ${distanceLisible(m)}` : ''}
                  <br />
                  <span className="texte-doux">{v.adresse || 'Adresse non renseignée'}</span>
                </span>
                <button type="button" className="mairie-bouton mairie-bouton--principal" onClick={() => void proposer(v)}>
                  Proposer
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {message && <span role="alert" style={{ color: 'var(--urgence-fonce)', fontWeight: 700 }}>{message}</span>}
    </div>
  )
}

function libelleRessource(id: string) {
  return listeRessources.find((r) => r.id === id)?.label ?? id
}

function PanneauVolontaires({ volontaires, enCrise }: { volontaires: Volontaire[]; enCrise: boolean }) {
  return (
    <section className="mairie-panneau" aria-labelledby="titre-volontaires">
      <h2 id="titre-volontaires">
        Qui est disponible <span className="mairie-etiquette">{volontaires.length}</span>
      </h2>
      {volontaires.length === 0 && (
        <p className="texte-doux">
          {enCrise ? "Aucun volontaire disponible pour l'instant." : 'Les volontaires se déclarent pendant une crise.'}
        </p>
      )}
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {volontaires.map((v) => (
          <li key={v.auteur} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <strong style={{ fontSize: 15 }}>
              {[v.prenom, v.nom].filter(Boolean).join(' ') || 'Volontaire'} <span className="texte-doux" style={{ fontWeight: 400 }}>· depuis {heure(v.updated_at)}</span>
            </strong>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {v.ressources.map((r) => (
                <span key={r} className="mairie-etiquette">
                  {libelleRessource(r)}
                  {r === 'heb' && v.places_hebergement > 0 ? ` · ${v.places_hebergement} places` : ''}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

const missionVide = {
  titre: '',
  rendez_vous: '',
  duree: '2 h',
  lieu: '',
  coordinateur: '',
  categorie: 'mainoeuvre',
  equipe: '4 volontaires',
  consignes: "N'entrez jamais dans une zone inondée. Suivez uniquement les consignes du coordinateur.",
}

// L'hébergement passe par la mise en relation automatique, pas par une mission
const categoriesMission = listeRessources.filter((r) => r.id !== 'heb')

const champsMission: [Exclude<keyof typeof missionVide, 'categorie'>, string][] = [
  ['titre', 'Mission'],
  ['rendez_vous', 'Heure de rendez-vous'],
  ['lieu', 'Point de rendez-vous'],
  ['coordinateur', 'Coordinateur sur place'],
  ['equipe', 'Besoin'],
  ['duree', 'Durée estimée'],
]

type ModeleMission = { titre: string; categorie: string; numero: number }
type PropsMissions = { missions: MissionServeur[]; reponses: Reponse[]; volontaires: Volontaire[]; communeId: string; modele: ModeleMission | null }

function PanneauMissions({ missions, reponses, volontaires, communeId, modele }: PropsMissions) {
  const [ouvert, setOuvert] = useState(!!modele)
  const [mission, setMission] = useState(modele ? { ...missionVide, titre: modele.titre, categorie: modele.categorie } : missionVide)
  const [texteAdresse, setTexteAdresse] = useState('')
  const [adresse, setAdresse] = useState<ResultatAdresse | null>(null)
  const [message, setMessage] = useState('')

  const proposer = async (e: FormEvent) => {
    e.preventDefault()
    const propre = Object.fromEntries(Object.entries(mission).map(([k, v]) => [k, v.trim()]))
    // Adresse vérifiée : le volontaire voit le point de rendez-vous sur sa carte, avec l'itinéraire
    const position = adresse ? { adresse: adresse.libelle, lat: adresse.lat, lng: adresse.lng } : {}
    const { error } = await serveur!.from('missions').insert({ ...propre, ...position, ressource: libelleRessource(mission.categorie), commune_id: communeId })
    if (error) {
      setMessage("Échec : la mission n'a pas été proposée.")
      return
    }
    setMessage(`Mission proposée aux volontaires qui offrent : ${libelleRessource(mission.categorie)}.`)
    setMission(missionVide)
    setAdresse(null)
    setTexteAdresse('')
    setOuvert(false)
  }

  const clore = async (m: MissionServeur) => {
    if (!window.confirm(`Clore la mission « ${m.titre} » ? Elle disparaîtra de l'app des volontaires.`)) return
    const { error } = await serveur!.from('missions').update({ active: false }).eq('id', m.id)
    setMessage(error ? 'Échec : la mission est toujours ouverte.' : '')
  }

  // Adresse du rendez-vous facultative, mais vérifiée si elle est saisie
  const valide =
    mission.titre.trim().length >= 3 && mission.rendez_vous.trim() !== '' && mission.lieu.trim() !== '' && (adresse !== null || texteAdresse.trim() === '')

  return (
    <section className="mairie-panneau" aria-labelledby="titre-missions">
      <h2 id="titre-missions">2. Missions envoyées</h2>
      <p className="texte-doux" style={{ marginTop: -4 }}>
        Une mission part seulement aux volontaires qui proposent ce type d'aide. Suivez ici qui a accepté.
      </p>
      {missions.length === 0 && <p className="texte-doux">Aucune mission ouverte.</p>}
      {missions.map((m) => {
        const concernes = volontaires.filter((v) => m.categorie === '' || v.ressources.includes(m.categorie)).length
        const acceptees = reponses.filter((r) => r.mission_id === m.id && r.reponse === 'acceptee')
        const refusees = reponses.filter((r) => r.mission_id === m.id && r.reponse === 'refusee').length
        return (
          <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <strong style={{ fontSize: 15 }}>{m.titre}</strong>
            <span className="texte-doux">
              {m.rendez_vous} · {m.lieu}
              {m.adresse ? ` (${m.adresse})` : ' · pas sur la carte'} · besoin : {m.equipe}
            </span>
            <span className="texte-doux">
              Pour : {m.categorie ? libelleRessource(m.categorie) : 'tous les volontaires'} · {concernes} volontaire{concernes > 1 ? 's' : ''} disponible{concernes > 1 ? 's' : ''} dans cette catégorie
            </span>
            <span style={{ fontSize: 14 }}>
              <strong>{acceptees.length}</strong> volontaire{acceptees.length > 1 ? 's' : ''} confirmé{acceptees.length > 1 ? 's' : ''}
              {acceptees.length > 0 && ` : ${acceptees.map((r) => r.prenom || 'anonyme').join(', ')}`}
              {refusees > 0 && ` · ${refusees} indisponible${refusees > 1 ? 's' : ''}`}
            </span>
            <button type="button" className="mairie-bouton" style={{ alignSelf: 'flex-start' }} onClick={() => void clore(m)}>
              Clore la mission
            </button>
          </div>
        )
      })}
      {ouvert ? (
        <form onSubmit={proposer} style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--bordure)', paddingTop: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, fontWeight: 700 }}>
            Type d'aide demandée
            <select className="mairie-champ" value={mission.categorie} onChange={(e) => setMission({ ...mission, categorie: e.target.value })}>
              {categoriesMission.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
            <span className="texte-doux" style={{ fontWeight: 400 }}>Seuls les volontaires qui proposent ce type d'aide recevront la mission.</span>
          </label>
          {champsMission.map(([cle, libelle]) => (
            <label key={cle} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, fontWeight: 700 }}>
              {libelle}
              <input
                className="mairie-champ"
                value={mission[cle]}
                maxLength={140}
                placeholder={cle === 'rendez_vous' ? '15:00' : undefined}
                onChange={(e) => setMission({ ...mission, [cle]: e.target.value })}
              />
            </label>
          ))}
          <ChampAdresse onChoix={setAdresse} onTexte={setTexteAdresse} libelleChamp="Adresse du rendez-vous (pour la carte et l'itinéraire)" />
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, fontWeight: 700 }}>
            Consignes de sécurité
            <textarea className="mairie-champ" value={mission.consignes} maxLength={400} onChange={(e) => setMission({ ...mission, consignes: e.target.value })} />
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="submit" className="mairie-bouton mairie-bouton--principal" disabled={!valide}>
              Proposer aux volontaires
            </button>
            <button type="button" className="mairie-bouton" onClick={() => setOuvert(false)}>
              Annuler
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="mairie-bouton mairie-bouton--principal" style={{ alignSelf: 'flex-start' }} onClick={() => setOuvert(true)}>
          Nouvelle mission
        </button>
      )}
      {message && (
        <p role="status" style={{ fontSize: 14 }}>
          {message}
        </p>
      )}
    </section>
  )
}

function PanneauJournal({ journal, lienTout = false }: { journal: Evenement[]; lienTout?: boolean }) {
  return (
    <section className="mairie-panneau" aria-labelledby="titre-journal">
      <h2 id="titre-journal">{lienTout ? 'Dernières actions' : 'Journal'}</h2>
      {journal.length === 0 && <p className="texte-doux">Aucune action enregistrée.</p>}
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {journal.map((j) => (
          <li key={j.id} style={{ fontSize: 13 }}>
            <span className="texte-doux">{heure(j.created_at)}</span> · {libelleAction[j.action] ?? j.action}
            {j.details.demande ? ` ${j.details.demande}` : ''}
            {j.details.vers ? ` → ${libelleStatut[j.details.vers as StatutDemande] ?? j.details.vers}` : ''}
            {j.details.titre && j.action !== 'statut_demande' ? ` : ${j.details.titre}` : ''}
          </li>
        ))}
      </ul>
      {lienTout && journal.length > 0 && (
        <Link to="/mairie/bilan" style={{ fontSize: 14 }}>
          Tout le journal
        </Link>
      )}
    </section>
  )
}

