import { useCallback, useEffect, useState, type FormEvent } from 'react'
import CarteInteractive, { type Repere } from '../components/CarteInteractive.tsx'
import Logo from '../components/Logo.tsx'
import ChampAdresse from '../components/ChampAdresse.tsx'
import { besoins as listeBesoins, centreCommune, libelleLieu, ressources as listeRessources, situations } from '../data/fictif.ts'
import {
  heure,
  lienTelephone,
  serveur,
  type CriseServeur,
  type DemandeServeur,
  type LieuServeur,
  type MissionServeur,
  type StatutDemande,
  type StatutHebergement,
  type ZoneServeur,
} from '../services/serveur.ts'
import { couleurLieu, distanceLisible, distanceMetres, estPlace, type ResultatAdresse } from '../outils/carte.ts'

export type Coordinateur = { nom: string; communeId: string; communeNom: string }

type Reponse = { mission_id: string; prenom: string; reponse: 'acceptee' | 'refusee' }
type Volontaire = {
  auteur: string
  prenom: string
  telephone: string
  ressources: string[]
  places_hebergement: number
  adresse: string
  lat: number | null
  lng: number | null
  updated_at: string
}
type Hebergement = { id: string; demande_id: string; hebergeur: string; personnes: number; statut: StatutHebergement; updated_at: string }
type Evenement = { id: number; action: string; details: Record<string, string>; created_at: string }

type Donnees = {
  crise: CriseServeur | null
  demandes: DemandeServeur[]
  lieux: LieuServeur[]
  missions: MissionServeur[]
  reponses: Reponse[]
  volontaires: Volontaire[]
  hebergements: Hebergement[]
  zones: ZoneServeur[]
  journal: Evenement[]
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
}

export default function TableauDeBord({ coordinateur }: { coordinateur: Coordinateur }) {
  const client = serveur!
  const commune = coordinateur.communeId
  const [donnees, setDonnees] = useState<Donnees | null>(null)
  const [erreur, setErreur] = useState('')

  const charger = useCallback(async () => {
    const [crise, demandes, lieux, missions, reponses, volontaires, hebergements, zones, journal] = await Promise.all([
      client.from('crises').select('id, titre, consigne, active, declenchee_a').eq('commune_id', commune).eq('active', true).maybeSingle(),
      client.from('demandes').select('*').eq('commune_id', commune).order('created_at', { ascending: false }).limit(300),
      client.from('lieux').select('*').eq('commune_id', commune).order('nom'),
      client.from('missions').select('*').eq('commune_id', commune).eq('active', true).order('created_at', { ascending: false }),
      client.from('reponses_mission').select('mission_id, prenom, reponse'),
      client.from('volontaires').select('auteur, prenom, telephone, ressources, places_hebergement, adresse, lat, lng, updated_at').eq('commune_id', commune).eq('disponible', true).order('updated_at', { ascending: false }),
      client.from('hebergements').select('id, demande_id, hebergeur, personnes, statut, updated_at').eq('commune_id', commune).order('created_at'),
      client.from('zones_danger').select('id, nom, consigne, points').eq('commune_id', commune).eq('active', true).order('created_at'),
      client.from('journal').select('id, action, details, created_at').eq('commune_id', commune).order('id', { ascending: false }).limit(12),
    ])
    const echec = [crise, demandes, lieux, missions, reponses, volontaires, hebergements, zones, journal].find((r) => r.error)
    if (echec) {
      setErreur('Connexion au serveur perdue. Nouvel essai automatique.')
      return
    }
    setErreur('')
    const criseActive = crise.data as CriseServeur | null
    setDonnees({
      crise: criseActive,
      demandes: demandes.data as DemandeServeur[],
      lieux: lieux.data as LieuServeur[],
      missions: missions.data as MissionServeur[],
      reponses: reponses.data as Reponse[],
      zones: zones.data as ZoneServeur[],
      hebergements: hebergements.data as Hebergement[],
      // Seules comptent les disponibilités données pendant la crise en cours
      volontaires: criseActive ? (volontaires.data as Volontaire[]).filter((v) => v.updated_at >= criseActive.declenchee_a) : [],
      journal: journal.data as Evenement[],
    })
  }, [client, commune])

  // Tout changement (habitant ou autre coordinateur) recharge le tableau en direct
  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    void charger()
    const filtre = `commune_id=eq.${commune}`
    const canal = client.channel(`mairie-${commune}`)
    for (const table of ['crises', 'demandes', 'lieux', 'missions', 'volontaires', 'hebergements', 'zones_danger']) {
      canal.on('postgres_changes', { event: '*', schema: 'public', table, filter: filtre }, () => void charger())
    }
    canal.on('postgres_changes', { event: '*', schema: 'public', table: 'reponses_mission' }, () => void charger())
    canal.subscribe()
    const minuteur = window.setInterval(() => void charger(), 30000)
    return () => {
      void client.removeChannel(canal)
      window.clearInterval(minuteur)
    }
  }, [client, commune, charger])

  return (
    <div className="mairie">
      <header className="mairie-barre">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Logo taille={40} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
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
          <button type="button" className="mairie-bouton" onClick={() => void client.auth.signOut()}>
            Se déconnecter
          </button>
        </div>
      </header>

      {erreur && (
        <p role="alert" style={{ background: 'var(--urgence-pale)', color: 'var(--urgence-fonce)', padding: '10px 24px', fontWeight: 700 }}>
          {erreur}
        </p>
      )}

      {!donnees ? (
        <p style={{ padding: 24 }}>Chargement…</p>
      ) : (
        <main className="mairie-contenu">
          <div className="mairie-colonne">
            <Compteurs demandes={donnees.demandes} />
            <CarteMairie lieux={donnees.lieux} demandes={donnees.demandes} zones={donnees.zones} communeId={commune} />
            <PanneauHebergement demandes={donnees.demandes} volontaires={donnees.volontaires} hebergements={donnees.hebergements} communeId={commune} />
            <Demandes demandes={donnees.demandes} />
          </div>
          <div className="mairie-colonne">
            <PanneauCrise crise={donnees.crise} communeId={commune} />
            <PanneauLieux lieux={donnees.lieux} communeId={commune} />
            <PanneauVolontaires volontaires={donnees.volontaires} enCrise={!!donnees.crise} />
            <PanneauMissions missions={donnees.missions} reponses={donnees.reponses} communeId={commune} />
            <PanneauJournal journal={donnees.journal} />
          </div>
        </main>
      )}
    </div>
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

function Demandes({ demandes }: { demandes: DemandeServeur[] }) {
  const [filtre, setFiltre] = useState<Filtre>('a-traiter')
  const visibles = demandes
    .filter((d) =>
      filtre === 'a-traiter' ? d.statut === 'transmise' : filtre === 'en-cours' ? d.statut === 'prise_en_charge' : ['aide_organisee', 'close'].includes(d.statut),
    )
    .sort((a, b) => priorite(a) - priorite(b) || a.created_at.localeCompare(b.created_at))

  const changerStatut = async (id: string, statut: StatutDemande) => {
    await serveur!.from('demandes').update({ statut }).eq('id', id)
  }

  return (
    <section className="mairie-panneau" aria-labelledby="titre-demandes">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h2 id="titre-demandes">Demandes d'aide</h2>
        <div className="mairie-onglets" role="group" aria-label="Filtrer les demandes">
          {(
            [
              ['a-traiter', 'À traiter'],
              ['en-cours', 'En cours'],
              ['terminees', 'Terminées'],
            ] as const
          ).map(([id, libelle]) => (
            <button key={id} type="button" className="mairie-bouton" aria-pressed={filtre === id} onClick={() => setFiltre(id)}>
              {libelle}
            </button>
          ))}
        </div>
      </div>

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
              <span className="mairie-etiquette">
                {d.personnes} personne{d.personnes > 1 ? 's' : ''}
              </span>
              {d.besoins.map((b) => (
                <span key={b} className="mairie-etiquette">
                  {listeBesoins.find((x) => x.id === b)?.label ?? b}
                </span>
              ))}
            </div>
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
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {d.statut === 'transmise' && (
                <button type="button" className="mairie-bouton mairie-bouton--principal" onClick={() => void changerStatut(d.id, 'prise_en_charge')}>
                  Prendre en charge
                </button>
              )}
              {d.statut === 'prise_en_charge' && (
                <button type="button" className="mairie-bouton mairie-bouton--principal" onClick={() => void changerStatut(d.id, 'aide_organisee')}>
                  Aide organisée
                </button>
              )}
              {d.statut !== 'close' && (
                <button type="button" className="mairie-bouton" onClick={() => void changerStatut(d.id, 'close')}>
                  Clore
                </button>
              )}
              {d.statut === 'close' && (
                <button type="button" className="mairie-bouton" onClick={() => void changerStatut(d.id, 'transmise')}>
                  Rouvrir
                </button>
              )}
            </div>
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
    if (!crise || !window.confirm('Terminer la crise ? Les habitants repasseront en mode veille.')) return
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

type PropsCarte = { lieux: LieuServeur[]; demandes: DemandeServeur[]; zones: ZoneServeur[]; communeId: string }

function CarteMairie({ lieux, demandes, zones, communeId }: PropsCarte) {
  // Tracé d'une zone à éviter : chaque clic sur la carte ajoute un point du contour
  const [trace, setTrace] = useState<[number, number][] | null>(null)
  const [nom, setNom] = useState('')
  const [consigne, setConsigne] = useState('')
  const [message, setMessage] = useState('')
  const ajouterPoint = useCallback((p: [number, number]) => setTrace((t) => (t ? [...t, p] : t)), [])

  const enregistrer = async (e: FormEvent) => {
    e.preventDefault()
    if (!trace || trace.length < 3) return
    const { error } = await serveur!.from('zones_danger').insert({ commune_id: communeId, nom: nom.trim(), consigne: consigne.trim(), points: trace })
    if (error) {
      setMessage("Échec : la zone n'a pas été publiée.")
      return
    }
    setMessage('Zone publiée : elle apparaît en rouge chez les habitants.')
    setTrace(null)
    setNom('')
    setConsigne('')
  }

  const retirer = async (z: ZoneServeur) => {
    if (!window.confirm(`Retirer la zone « ${z.nom} » de la carte des habitants ?`)) return
    const { error } = await serveur!.from('zones_danger').update({ active: false }).eq('id', z.id)
    setMessage(error ? 'Échec : la zone est toujours affichée.' : '')
  }

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
    ...ouvertes.flatMap((d) => {
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
      <CarteInteractive
        reperes={reperes}
        zones={zones}
        trace={trace ?? undefined}
        onClicCarte={trace ? ajouterPoint : undefined}
        centre={centreCommune}
        hauteur={380}
      />
      <div className="texte-doux" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 13 }}>
        <Legende couleur="#c2410c" texte="Demande prioritaire" />
        <Legende couleur="#e9a23b" texte="Autre demande" />
        <Legende couleur={couleurLieu.accueil} texte="Accueil" />
        <Legende couleur={couleurLieu.soins} texte="Secours" />
        <Legende couleur={couleurLieu.eau} texte="Eau" />
        <Legende couleur="#d92d20" texte="Zone à éviter" />
      </div>
      {trace ? (
        <form onSubmit={enregistrer} style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--bordure)', paddingTop: 12 }}>
          <p style={{ fontSize: 14, fontWeight: 700 }}>
            Cliquez sur la carte pour tracer le contour ({trace.length} point{trace.length > 1 ? 's' : ''}, 3 minimum).
          </p>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, fontWeight: 700 }}>
            Nom de la zone
            <input className="mairie-champ" value={nom} maxLength={120} placeholder="Quartier du bord de rivière" onChange={(e) => setNom(e.target.value)} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, fontWeight: 700 }}>
            Consigne
            <input className="mairie-champ" value={consigne} maxLength={300} placeholder="Ne pas circuler, même à pied." onChange={(e) => setConsigne(e.target.value)} />
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="submit" className="mairie-bouton mairie-bouton--urgence" disabled={trace.length < 3 || nom.trim().length < 3}>
              Publier la zone
            </button>
            <button type="button" className="mairie-bouton" disabled={trace.length === 0} onClick={() => setTrace(trace.slice(0, -1))}>
              Retirer le dernier point
            </button>
            <button type="button" className="mairie-bouton" onClick={() => setTrace(null)}>
              Annuler
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="mairie-bouton" style={{ alignSelf: 'flex-start' }} onClick={() => setTrace([])}>
          Tracer une zone à éviter
        </button>
      )}
      {zones.map((z) => (
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
      {message && (
        <p role="status" style={{ fontSize: 14 }}>
          {message}
        </p>
      )}
      {sansPosition > 0 && (
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

const lieuVide = { nom: '', type: 'accueil' as LieuServeur['type'], details: '', places: '' }

function PanneauLieux({ lieux, communeId }: { lieux: LieuServeur[]; communeId: string }) {
  const [ouvert, setOuvert] = useState(false)
  const [lieu, setLieu] = useState(lieuVide)
  const [adresse, setAdresse] = useState<ResultatAdresse | null>(null)
  const [message, setMessage] = useState('')
  const basculer = (l: LieuServeur) => void serveur!.from('lieux').update({ ouvert: !l.ouvert }).eq('id', l.id)

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
      <h2 id="titre-lieux">Lieux d'accueil et d'aide</h2>
      {lieux.map((l) => (
        <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
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
            onClick={() => basculer(l)}
            className={`mairie-bouton${l.ouvert ? ' mairie-bouton--principal' : ''}`}
            style={{ minWidth: 92 }}
          >
            {l.ouvert ? 'Ouvert' : 'Fermé'}
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
          <ChampAdresse onChoix={setAdresse} />
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

const actif = (h: Hebergement) => h.statut === 'proposee' || h.statut === 'acceptee'

// Places restantes : on retire les personnes déjà proposées ou accueillies chez ce foyer
function placesRestantes(v: Volontaire, hebergements: Hebergement[]) {
  return v.places_hebergement - hebergements.filter((h) => h.hebergeur === v.auteur && actif(h)).reduce((n, h) => n + h.personnes, 0)
}

type PropsHebergement = { demandes: DemandeServeur[]; volontaires: Volontaire[]; hebergements: Hebergement[]; communeId: string }

// Besoins et foyers face à face. Le serveur propose seul le foyer le plus proche ;
// la mairie supervise : elle peut changer de foyer ou relancer la recherche.
function PanneauHebergement({ demandes, volontaires, hebergements, communeId }: PropsHebergement) {
  const besoins = demandes.filter((d) => d.statut !== 'close' && (d.besoins.includes('heb') || hebergements.some((h) => h.demande_id === d.id && actif(h))))
  const foyers = volontaires.filter((v) => v.ressources.includes('heb'))
  const reference = (id: string) => demandes.find((d) => d.id === id)?.reference ?? '?'
  return (
    <section className="mairie-panneau" aria-labelledby="titre-hebergement">
      <h2 id="titre-hebergement">Hébergement solidaire</h2>
      <p className="texte-doux" style={{ marginTop: -4 }}>
        Chaque demande est proposée automatiquement au foyer disponible le plus proche. L'hébergeur accepte ou refuse ; en cas de refus, le suivant est sollicité.
      </p>
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
                  {v.prenom || 'Volontaire'} · {restantes}/{v.places_hebergement} place{v.places_hebergement > 1 ? 's' : ''} libre{restantes > 1 ? 's' : ''}
                </strong>
                <span className="texte-doux">{v.adresse || 'Adresse non renseignée'}</span>
                {accueils.map((h) => (
                  <span key={h.id} style={{ fontSize: 14 }}>
                    {reference(h.demande_id)} · {h.personnes} pers. · {h.statut === 'acceptee' ? <strong>accepté</strong> : 'en attente de réponse'}
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
  const position = coordonneesDemande(demande)
  const nom = (auteur: string) => volontaires.find((v) => v.auteur === auteur)

  const restantes = (v: Volontaire) => placesRestantes(v, hebergements)
  const distance = (v: Volontaire) => (position && v.lat !== null && v.lng !== null ? distanceMetres(position, { lat: v.lat, lng: v.lng }) : null)
  const candidats = volontaires
    .filter((v) => v.ressources.includes('heb') && !refus.has(v.auteur) && restantes(v) >= demande.personnes)
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
        <span>
          <strong>Hébergement :</strong> {v?.prenom || 'Volontaire'}
          {v?.adresse ? ` · ${v.adresse}` : ''} ·{' '}
          {enCours.statut === 'acceptee' ? <strong>accepté, coordonnées échangées</strong> : 'en attente de sa réponse'}
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
        Volontaires disponibles <span className="mairie-etiquette">{volontaires.length}</span>
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
              {v.prenom || 'Volontaire'} <span className="texte-doux" style={{ fontWeight: 400 }}>· depuis {heure(v.updated_at)}</span>
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
  ressource: "Main-d'œuvre",
  equipe: '4 volontaires',
  consignes: "N'entrez jamais dans une zone inondée. Suivez uniquement les consignes du coordinateur.",
}

const champsMission: [keyof typeof missionVide, string][] = [
  ['titre', 'Mission'],
  ['rendez_vous', 'Heure de rendez-vous'],
  ['lieu', 'Point de rendez-vous'],
  ['coordinateur', 'Coordinateur sur place'],
  ['ressource', 'Ressource demandée'],
  ['equipe', 'Besoin'],
  ['duree', 'Durée estimée'],
]

function PanneauMissions({ missions, reponses, communeId }: { missions: MissionServeur[]; reponses: Reponse[]; communeId: string }) {
  const [ouvert, setOuvert] = useState(false)
  const [mission, setMission] = useState(missionVide)
  const [message, setMessage] = useState('')

  const proposer = async (e: FormEvent) => {
    e.preventDefault()
    const propre = Object.fromEntries(Object.entries(mission).map(([k, v]) => [k, v.trim()]))
    const { error } = await serveur!.from('missions').insert({ ...propre, commune_id: communeId })
    if (error) {
      setMessage("Échec : la mission n'a pas été proposée.")
      return
    }
    setMessage('Mission proposée aux volontaires disponibles.')
    setMission(missionVide)
    setOuvert(false)
  }

  const clore = async (m: MissionServeur) => {
    if (!window.confirm(`Clore la mission « ${m.titre} » ? Elle disparaîtra de l'app des volontaires.`)) return
    const { error } = await serveur!.from('missions').update({ active: false }).eq('id', m.id)
    setMessage(error ? 'Échec : la mission est toujours ouverte.' : '')
  }

  const valide = mission.titre.trim().length >= 3 && mission.rendez_vous.trim() !== '' && mission.lieu.trim() !== ''

  return (
    <section className="mairie-panneau" aria-labelledby="titre-missions">
      <h2 id="titre-missions">Missions volontaires</h2>
      {missions.length === 0 && <p className="texte-doux">Aucune mission ouverte.</p>}
      {missions.map((m, i) => {
        const acceptees = reponses.filter((r) => r.mission_id === m.id && r.reponse === 'acceptee')
        const refusees = reponses.filter((r) => r.mission_id === m.id && r.reponse === 'refusee').length
        return (
          <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <strong style={{ fontSize: 15 }}>{m.titre}</strong>
            <span className="texte-doux">
              {m.rendez_vous} · {m.lieu} · besoin : {m.equipe}
            </span>
            {/* L'app des volontaires n'affiche que la mission la plus récente */}
            {i > 0 && <span className="texte-doux">Remplacée dans l'app par la mission plus récente.</span>}
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

function PanneauJournal({ journal }: { journal: Evenement[] }) {
  return (
    <section className="mairie-panneau" aria-labelledby="titre-journal">
      <h2 id="titre-journal">Journal</h2>
      {journal.length === 0 && <p className="texte-doux">Aucune action enregistrée.</p>}
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {journal.map((j) => (
          <li key={j.id} style={{ fontSize: 13 }}>
            <span className="texte-doux">{heure(j.created_at)}</span> · {libelleAction[j.action] ?? j.action}
            {j.details.demande ? ` ${j.details.demande} → ${libelleStatut[j.details.vers as StatutDemande] ?? j.details.vers}` : ''}
            {j.details.titre && j.action !== 'statut_demande' ? ` : ${j.details.titre}` : ''}
          </li>
        ))}
      </ul>
    </section>
  )
}
