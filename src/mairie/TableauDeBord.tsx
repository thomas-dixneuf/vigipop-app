import { useCallback, useEffect, useState, type FormEvent } from 'react'
import Logo from '../components/Logo.tsx'
import { besoins as listeBesoins, libelleLieu, ressources as listeRessources, situations } from '../data/fictif.ts'
import {
  heure,
  serveur,
  type CriseServeur,
  type DemandeServeur,
  type LieuServeur,
  type MissionServeur,
  type StatutDemande,
} from '../services/serveur.ts'

export type Coordinateur = { nom: string; communeId: string; communeNom: string }

type Reponse = { mission_id: string; prenom: string; reponse: 'acceptee' | 'refusee' }
type Volontaire = { auteur: string; prenom: string; ressources: string[]; updated_at: string }
type Evenement = { id: number; action: string; details: Record<string, string>; created_at: string }

type Donnees = {
  crise: CriseServeur | null
  demandes: DemandeServeur[]
  lieux: LieuServeur[]
  missions: MissionServeur[]
  reponses: Reponse[]
  volontaires: Volontaire[]
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
}

export default function TableauDeBord({ coordinateur }: { coordinateur: Coordinateur }) {
  const client = serveur!
  const commune = coordinateur.communeId
  const [donnees, setDonnees] = useState<Donnees | null>(null)
  const [erreur, setErreur] = useState('')

  const charger = useCallback(async () => {
    const [crise, demandes, lieux, missions, reponses, volontaires, journal] = await Promise.all([
      client.from('crises').select('id, titre, consigne, active, declenchee_a').eq('commune_id', commune).eq('active', true).maybeSingle(),
      client.from('demandes').select('*').eq('commune_id', commune).order('created_at', { ascending: false }).limit(300),
      client.from('lieux').select('*').eq('commune_id', commune).order('nom'),
      client.from('missions').select('*').eq('commune_id', commune).eq('active', true).order('created_at', { ascending: false }),
      client.from('reponses_mission').select('mission_id, prenom, reponse'),
      client.from('volontaires').select('auteur, prenom, ressources, updated_at').eq('commune_id', commune).eq('disponible', true).order('updated_at', { ascending: false }),
      client.from('journal').select('id, action, details, created_at').eq('commune_id', commune).order('id', { ascending: false }).limit(12),
    ])
    const echec = [crise, demandes, lieux, missions, reponses, volontaires, journal].find((r) => r.error)
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
    for (const table of ['crises', 'demandes', 'lieux', 'missions', 'volontaires']) {
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
            <Demandes demandes={donnees.demandes} />
          </div>
          <div className="mairie-colonne">
            <PanneauCrise crise={donnees.crise} communeId={commune} />
            <PanneauLieux lieux={donnees.lieux} />
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

function PanneauLieux({ lieux }: { lieux: LieuServeur[] }) {
  const basculer = (l: LieuServeur) => void serveur!.from('lieux').update({ ouvert: !l.ouvert }).eq('id', l.id)
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
    </section>
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
