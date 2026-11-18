import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { besoins as listeBesoins, situations } from '../data/fictif.ts'
import { heure, serveurMairie as serveur, type CriseServeur, type DemandeServeur, type StatutDemande } from '../services/serveur.ts'

// Repli papier du plan communal de sauvegarde : la liste des demandes s'imprime ou
// s'exporte (tableur), pour continuer à travailler si le réseau de la mairie tombe.

const libelleStatut: Record<StatutDemande, string> = {
  transmise: 'À traiter',
  prise_en_charge: 'Prise en charge',
  aide_organisee: 'Aide organisée',
  close: 'Close',
}

const libelleSituation = (id: string) => situations.find((s) => s.id === id)?.label ?? id
const libellesBesoins = (ids: string[]) => ids.map((b) => listeBesoins.find((l) => l.id === b)?.label ?? b).join(', ')
const dateHeure = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

// Les cas les plus graves d'abord, puis les plus anciens (même règle que le tableau de bord)
function priorite(d: DemandeServeur) {
  const base = { blesse: 0, evac: 1, bloque: 2, sinistre: 3 }[d.situation] ?? 3
  return base - (d.personne_vulnerable ? 0.5 : 0)
}

// Impression : seul le bloc demandé est imprimé, le reste de la page est masqué (voir mairie.css)
function imprimer(bloc: 'liste' | 'bilan') {
  document.body.dataset.imprimer = bloc
  const fin = () => {
    delete document.body.dataset.imprimer
    window.removeEventListener('afterprint', fin)
  }
  window.addEventListener('afterprint', fin)
  // Laisse le temps au navigateur d'afficher le bloc avant d'ouvrir la fenêtre d'impression
  window.setTimeout(() => window.print(), 50)
}

function telecharger(nom: string, contenu: string) {
  // BOM : Excel lit correctement les accents
  const fichier = new Blob(['﻿' + contenu], { type: 'text/csv;charset=utf-8' })
  const lien = document.createElement('a')
  lien.href = URL.createObjectURL(fichier)
  lien.download = nom
  lien.click()
  window.setTimeout(() => URL.revokeObjectURL(lien.href), 1000)
}

const cellule = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`

function csvDemandes(demandes: DemandeServeur[]) {
  const entetes = ['Référence', 'Reçue', 'Canal', 'Statut', 'Situation', 'Personnes', 'Vulnérable', 'Besoins', 'Lieu', 'Prénom', 'Téléphone', 'Réponse de la mairie']
  const lignes = demandes.map((d) =>
    [
      d.reference,
      dateHeure(d.created_at),
      d.source === 'sms' ? `SMS : ${d.message_sms ?? ''}` : 'App',
      libelleStatut[d.statut],
      libelleSituation(d.situation),
      d.personnes,
      d.personne_vulnerable ? 'oui' : 'non',
      libellesBesoins(d.besoins),
      d.position,
      d.prenom,
      d.telephone,
      d.reponse_mairie ?? '',
    ]
      .map(cellule)
      .join(';'),
  )
  // Point-virgule : séparateur attendu par Excel en français
  return [entetes.map(cellule).join(';'), ...lignes].join('\r\n')
}

export function ActionsListe({ demandes, communeNom }: { demandes: DemandeServeur[]; communeNom: string }) {
  const [imprimeLe, setImprimeLe] = useState('')
  const ouvertes = demandes.filter((d) => d.statut !== 'close').sort((a, b) => priorite(a) - priorite(b) || a.created_at.localeCompare(b.created_at))
  const exporter = () => {
    const jour = new Date().toISOString().slice(0, 10)
    telecharger(`vigipop-demandes-${jour}.csv`, csvDemandes(demandes))
  }
  return (
    <>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="mairie-bouton" onClick={() => {
            setImprimeLe(dateHeure(new Date().toISOString()))
            imprimer('liste')
          }}
          disabled={ouvertes.length === 0}
        >
          Imprimer la liste
        </button>
        <button type="button" className="mairie-bouton" onClick={exporter} disabled={demandes.length === 0}>
          Exporter (tableur)
        </button>
      </div>
      {createPortal(
        <div className="impression impression-liste">
          <h1>Demandes d'aide en cours · {communeNom}</h1>
          <p>
            Imprimé le {imprimeLe} · {ouvertes.length} demande{ouvertes.length > 1 ? 's' : ''} ouverte
            {ouvertes.length > 1 ? 's' : ''}, les plus graves en premier. Document confidentiel : à détruire après la crise.
          </p>
          <table>
            <thead>
              <tr>
                <th>Fait</th>
                <th>Réf. · heure</th>
                <th>Situation</th>
                <th>Pers.</th>
                <th>Besoins</th>
                <th>Lieu</th>
                <th>Contact</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {ouvertes.map((d) => (
                <tr key={d.id}>
                  <td className="impression-case">☐</td>
                  <td>
                    {d.reference}
                    <br />
                    {heure(d.created_at)}
                  </td>
                  <td>
                    <strong>{libelleSituation(d.situation)}</strong>
                    {d.personne_vulnerable ? <><br />Personne vulnérable</> : null}
                    {d.source === 'sms' ? <><br />Reçue par SMS : {d.message_sms}</> : null}
                  </td>
                  <td>{d.personnes}</td>
                  <td>{libellesBesoins(d.besoins)}</td>
                  <td>{d.position}</td>
                  <td>
                    {d.prenom}
                    {d.telephone ? <><br />{d.telephone}</> : null}
                  </td>
                  <td>{libelleStatut[d.statut]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
        document.body,
      )}
    </>
  )
}

// ─── Bilan de crise : ce que la mairie présente ensuite à son conseil municipal ───

type CriseBilan = CriseServeur & { terminee_a: string | null }
type Statistiques = {
  demandes: DemandeServeur[]
  delais: number[]
  missions: number
  hebergements: number
  entraides: number
}

function mediane(valeurs: number[]) {
  if (valeurs.length === 0) return null
  const tri = [...valeurs].sort((a, b) => a - b)
  const m = Math.floor(tri.length / 2)
  return tri.length % 2 ? tri.at(m)! : (tri.at(m - 1)! + tri.at(m)!) / 2
}

function duree(minutes: number | null) {
  if (minutes === null) return '—'
  if (minutes < 60) return `${Math.round(minutes)} min`
  const h = Math.floor(minutes / 60)
  return `${h} h ${String(Math.round(minutes % 60)).padStart(2, '0')}`
}

export function PanneauBilan({ communeId, communeNom }: { communeId: string; communeNom: string }) {
  const [crises, setCrises] = useState<CriseBilan[] | null>(null)
  const [choix, setChoix] = useState('')
  const [stats, setStats] = useState<Statistiques | null>(null)
  const [imprimeLe, setImprimeLe] = useState('')

  useEffect(() => {
    if (!serveur) return
    void serveur
      .from('crises')
      .select('id, titre, consigne, active, declenchee_a, terminee_a')
      .eq('commune_id', communeId)
      .order('declenchee_a', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        const liste = (data as CriseBilan[] | null) ?? []
        setCrises(liste)
        if (liste.length) setChoix((c) => c || liste[0].id)
      })
  }, [communeId])

  const crise = crises?.find((c) => c.id === choix) ?? null

  useEffect(() => {
    if (!serveur || !crise) return
    const client = serveur
    const debut = crise.declenchee_a
    const fin = crise.terminee_a ?? new Date().toISOString()
    let annule = false
    void Promise.all([
      client.from('demandes').select('*').eq('commune_id', communeId).gte('created_at', debut).lte('created_at', fin),
      client.from('journal').select('action, details, created_at').eq('commune_id', communeId).gte('created_at', debut).lte('created_at', fin).limit(5000),
      client.from('hebergements').select('statut, created_at').eq('commune_id', communeId).gte('created_at', debut).lte('created_at', fin),
      client.from('entraides').select('statut, created_at').eq('commune_id', communeId).gte('created_at', debut).lte('created_at', fin),
    ]).then(([demandes, journal, hebergements, entraides]) => {
      if (annule) return
      const liste = (demandes.data as DemandeServeur[] | null) ?? []
      const evenements = (journal.data as { action: string; details: Record<string, string>; created_at: string }[] | null) ?? []
      // Délai de prise en charge : du dépôt de la demande à son premier passage « prise en charge »
      const premierePrise = new Map<string, string>()
      for (const e of [...evenements].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
        if (e.action === 'statut_demande' && e.details.vers !== 'transmise' && !premierePrise.has(e.details.demande)) {
          premierePrise.set(e.details.demande, e.created_at)
        }
      }
      const delais = liste.flatMap((d) => {
        const prise = premierePrise.get(d.reference)
        return prise ? [(Date.parse(prise) - Date.parse(d.created_at)) / 60000] : []
      })
      setStats({
        demandes: liste,
        delais,
        missions: evenements.filter((e) => e.action === 'mission_creee').length,
        hebergements: ((hebergements.data as { statut: string }[] | null) ?? []).filter((h) => h.statut === 'acceptee').length,
        entraides: ((entraides.data as { statut: string }[] | null) ?? []).filter((h) => h.statut === 'acceptee').length,
      })
    })
    return () => {
      annule = true
    }
  }, [crise, communeId])

  if (!crises) return null

  const d = stats?.demandes ?? []
  const lignes: [string, string | number][] = [
    ['Demandes reçues', d.length],
    ['Personnes concernées', d.reduce((n, x) => n + x.personnes, 0)],
    ['Dont demandes avec une personne vulnérable', d.filter((x) => x.personne_vulnerable).length],
    ['Demandes avec aide organisée ou closes', d.filter((x) => x.statut === 'aide_organisee' || x.statut === 'close').length],
    ['Délai médian de prise en charge', duree(mediane(stats?.delais ?? []))],
    ['Missions proposées aux volontaires', stats?.missions ?? 0],
    ['Hébergements solidaires acceptés', stats?.hebergements ?? 0],
    ['Transports et prêts de matériel acceptés', stats?.entraides ?? 0],
  ]
  const parSituation = situations.map((s) => [s.label, d.filter((x) => x.situation === s.id).length] as const)
  const parBesoin = listeBesoins.map((b) => [b.label, d.filter((x) => x.besoins.includes(b.id)).length] as const)
  const periode = crise ? `du ${dateHeure(crise.declenchee_a)} ${crise.terminee_a ? `au ${dateHeure(crise.terminee_a)}` : '(en cours)'}` : ''

  const contenu = (
    <>
      <table className="mairie-bilan">
        <tbody>
          {lignes.map(([libelle, valeur]) => (
            <tr key={libelle}>
              <th scope="row">{libelle}</th>
              <td>{valeur}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mairie-face-a-face">
        <table className="mairie-bilan">
          <caption>Par situation</caption>
          <tbody>
            {parSituation.map(([l, n]) => (
              <tr key={l}>
                <th scope="row">{l}</th>
                <td>{n}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table className="mairie-bilan">
          <caption>Besoins exprimés</caption>
          <tbody>
            {parBesoin.map(([l, n]) => (
              <tr key={l}>
                <th scope="row">{l}</th>
                <td>{n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )

  return (
    <section className="mairie-panneau" aria-labelledby="titre-bilan">
      <h2 id="titre-bilan">Bilan de crise</h2>
      {crises.length === 0 ? (
        <p className="texte-doux">Aucune crise déclenchée pour l'instant. Le bilan apparaîtra ici.</p>
      ) : (
        <>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="texte-doux">Crise</span>
            <select className="mairie-champ" value={choix} onChange={(e) => setChoix(e.target.value)}>
              {crises.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.titre} · {dateHeure(c.declenchee_a)}
                  {c.active ? ' (en cours)' : ''}
                </option>
              ))}
            </select>
          </label>
          {stats ? contenu : <p className="texte-doux">Calcul du bilan…</p>}
          <p className="texte-doux" style={{ fontSize: 13 }}>
            Chiffres tirés des demandes et du journal de la crise. Aucune donnée nominative dans le bilan.
          </p>
          <button type="button" className="mairie-bouton" onClick={() => {
              setImprimeLe(dateHeure(new Date().toISOString()))
              imprimer('bilan')
            }}
            disabled={!stats}
          >
            Imprimer le bilan
          </button>
          {stats &&
            crise &&
            createPortal(
              <div className="impression impression-bilan">
                <h1>Bilan de crise · {communeNom}</h1>
                <p>
                  {crise.titre}, {periode}.
                </p>
                {contenu}
                <p>Source : Vigipop, demandes et journal de la cellule de crise. Imprimé le {imprimeLe}.</p>
              </div>,
              document.body,
            )}
        </>
      )}
    </section>
  )
}
