import { useState } from 'react'
import { lienTelephone, serveurMairie as serveur } from '../services/serveur.ts'
import { distanceLisible, distanceMetres, type Coordonnees } from '../outils/carte.ts'
import type { Benevole, Entreprise, StatutBenevole, StatutEntreprise } from './Partenaires.tsx'
import { aidantsPour, correspondances, libelleBesoin, libelleRessource, type Engagement, type Volontaire } from './aidants.ts'

// Tous ceux qui peuvent aider, réunis : habitants volontaires, bénévoles de la Protection civile,
// entreprises conventionnées. Pour chaque besoin d'une demande, on sait qui peut y répondre.

type Source = '' | 'volontaires' | 'benevoles' | 'entreprises'

type Props = {
  volontaires: Volontaire[]
  benevoles: Benevole[]
  entreprises: Entreprise[]
  engagements: Engagement[]
  enCrise: boolean
  // Besoin imposé (fiche d'une demande) ; sinon la mairie choisit dans la liste
  besoin?: string
  // Position de la demande : les volontaires les plus proches d'abord
  position?: Coordonnees | null
  // Fiche d'une demande : les 3 premiers de chaque sorte, sans filtres
  compact?: boolean
  titre?: string
  // Hébergement : les foyers volontaires sont déjà listés à part
  sansVolontaires?: boolean
  // Besoin présélectionné (clic dans le tableau des besoins)
  besoinInitial?: string
  // Fiche d'une demande : appeler, mobiliser ou solliciter fait passer la demande « en cours »
  onAgir?: () => void
}

// Liste unique des aidants, avec le geste utile pour chacun : appeler, mobiliser, solliciter
export function QuiPeutAider({ volontaires, benevoles, entreprises, engagements, enCrise, besoin: besoinImpose, position, compact = false, titre, sansVolontaires = false, besoinInitial = '', onAgir }: Props) {
  const [source, setSource] = useState<Source>('')
  const [besoinChoisi, setBesoinChoisi] = useState(besoinInitial)
  const [message, setMessage] = useState('')
  const besoin = besoinImpose ?? besoinChoisi

  const tri = besoin ? aidantsPour(besoin, volontaires, benevoles, entreprises) : { volontaires, benevoles, entreprises }
  const distance = (v: Volontaire) => (position && v.lat !== null && v.lng !== null ? distanceMetres(position, { lat: v.lat, lng: v.lng }) : null)
  const occupe = (id: string) => engagements.filter((e) => e.aidant === id)
  // Les libres d'abord, puis les plus proches
  const vols = [...tri.volontaires].sort((a, b) => occupe(a.auteur).length - occupe(b.auteur).length || (distance(a) ?? Infinity) - (distance(b) ?? Infinity))
  const rangBenevole: Record<StatutBenevole, number> = { disponible: 0, mobilise: 1, indisponible: 2 }
  const bens = [...tri.benevoles].sort((a, b) => rangBenevole[a.statut] - rangBenevole[b.statut])
  const rangEntreprise: Record<StatutEntreprise, number> = { disponible: 0, sollicitee: 1, engagee: 2 }
  const ents = [...tri.entreprises].sort((a, b) => rangEntreprise[a.statut] - rangEntreprise[b.statut])
  const limite = compact ? 3 : Infinity

  const statutBenevole = async (b: Benevole, statut: StatutBenevole) => {
    if (statut === 'mobilise') onAgir?.()
    const { error } = await serveur!.from('benevoles_association').update({ statut }).eq('id', b.id)
    setMessage(error ? "Échec : le statut n'a pas changé." : statut === 'mobilise' ? `${b.nom} est noté mobilisé. Appelez-le pour lui donner la mission.` : '')
  }
  const statutEntreprise = async (e: Entreprise, statut: StatutEntreprise) => {
    if (statut === 'sollicitee') onAgir?.()
    const { error } = await serveur!.from('entreprises_convention').update({ statut }).eq('id', e.id)
    setMessage(error ? "Échec : le statut n'a pas changé." : statut === 'sollicitee' ? `${e.nom} est notée sollicitée. Appelez son numéro d'astreinte.` : '')
  }

  const bouton = 'mairie-bouton'
  const appeler = (tel: string, libelle = 'Appeler') =>
    tel ? (
      <a href={lienTelephone(tel)} onClick={onAgir} className={bouton} style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
        {libelle} · {tel}
      </a>
    ) : null

  const sections: { id: Exclude<Source, ''>; titre: string; nombre: number; vide: string; contenu: React.ReactNode }[] = [
    {
      id: 'volontaires',
      titre: 'Habitants volontaires',
      nombre: vols.length,
      vide: enCrise ? 'Aucun volontaire disponible pour ce besoin.' : 'Les volontaires se déclarent pendant une crise.',
      contenu: vols.slice(0, limite).map((v) => {
        const m = distance(v)
        const deja = occupe(v.auteur)
        return (
          <li key={v.auteur} className="mairie-aidant">
            <span className="mairie-aidant-texte">
              <span>
                <strong>{[v.prenom, v.nom].filter(Boolean).join(' ') || 'Volontaire'}</strong>
                {m !== null ? <span className="texte-doux"> · à {distanceLisible(m)}</span> : null}
              </span>
              <span className="mairie-aidant-etiquettes">
                {v.ressources.map((r) => (
                  <span key={r} className="mairie-etiquette">
                    {libelleRessource(r)}
                    {r === 'heb' && v.places_hebergement > 0 ? ` · ${v.places_hebergement} places` : ''}
                  </span>
                ))}
                {deja.map((e) => (
                  <span key={e.reference + e.libelle} className="mairie-etiquette mairie-etiquette--ok">
                    {e.libelle} {e.reference}
                  </span>
                ))}
              </span>
            </span>
            {appeler(v.telephone)}
          </li>
        )
      }),
    },
    {
      id: 'benevoles',
      titre: 'Protection civile',
      nombre: bens.length,
      vide: besoin && correspondances[besoin]?.qualifications.length === 0 ? 'Pas de compétence de l’association pour ce besoin.' : 'Aucun bénévole avec cette compétence.',
      contenu: bens.slice(0, limite).map((b) => (
        <li key={b.id} className="mairie-aidant">
          <span className="mairie-aidant-texte">
            <span>
              <strong>{b.nom}</strong>
              <span className="texte-doux"> · {b.association || 'Association'}</span>
            </span>
            <span className="mairie-aidant-etiquettes">
              <span className={`mairie-etiquette${b.statut === 'mobilise' ? ' mairie-etiquette--ok' : ''}`}>
                {b.statut === 'disponible' ? 'Disponible' : b.statut === 'mobilise' ? 'Mobilisé' : 'Indisponible'}
              </span>
              {b.qualifications.map((q) => (
                <span key={q} className="mairie-etiquette">
                  {q}
                </span>
              ))}
            </span>
          </span>
          <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {appeler(b.telephone)}
            {enCrise && b.statut === 'disponible' && (
              <button type="button" className={`${bouton} mairie-bouton--principal`} onClick={() => void statutBenevole(b, 'mobilise')}>
                Mobiliser
              </button>
            )}
            {b.statut === 'mobilise' && (
              <button type="button" className={bouton} onClick={() => void statutBenevole(b, 'disponible')}>
                Fin de mission
              </button>
            )}
          </span>
        </li>
      )),
    },
    {
      id: 'entreprises',
      titre: 'Entreprises conventionnées',
      nombre: ents.length,
      vide: besoin && correspondances[besoin]?.materiel.length === 0 ? 'Pas de matériel d’entreprise pour ce besoin.' : 'Aucune entreprise ne prête ce matériel.',
      contenu: ents.slice(0, limite).map((e) => (
        <li key={e.id} className="mairie-aidant">
          <span className="mairie-aidant-texte">
            <strong>{e.nom}</strong>
            <span className="mairie-aidant-etiquettes">
              <span className={`mairie-etiquette${e.statut === 'disponible' ? '' : ' mairie-etiquette--ok'}`}>
                {e.statut === 'disponible' ? 'Disponible' : e.statut === 'sollicitee' ? 'Sollicitée' : 'Matériel engagé'}
              </span>
              {e.materiel.map((m) => (
                <span key={m} className="mairie-etiquette">
                  {m}
                </span>
              ))}
            </span>
          </span>
          <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {appeler(e.telephone)}
            {enCrise && e.statut === 'disponible' && (
              <button type="button" className={`${bouton} mairie-bouton--principal`} onClick={() => void statutEntreprise(e, 'sollicitee')}>
                Solliciter
              </button>
            )}
            {e.statut === 'sollicitee' && (
              <button type="button" className={`${bouton} mairie-bouton--principal`} onClick={() => void statutEntreprise(e, 'engagee')}>
                Matériel engagé
              </button>
            )}
            {e.statut === 'engagee' && (
              <button type="button" className={bouton} onClick={() => void statutEntreprise(e, 'disponible')}>
                Matériel rendu
              </button>
            )}
          </span>
        </li>
      )),
    },
  ]

  const affichees = sections.filter((s) => !(sansVolontaires && s.id === 'volontaires')).filter((s) => !source || s.id === source).filter((s) => !compact || s.nombre > 0)

  return (
    <div className="mairie-qui-aide">
      {titre && <h3 style={{ fontSize: 15 }}>{titre}</h3>}
      {!compact && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!besoinImpose && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, fontWeight: 700, maxWidth: 360 }}>
              Pour quel besoin ?
              <select className="mairie-champ" value={besoinChoisi} onChange={(e) => setBesoinChoisi(e.target.value)}>
                <option value="">Tous les aidants</option>
                {Object.keys(correspondances).map((b) => (
                  <option key={b} value={b}>
                    {libelleBesoin(b)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="mairie-onglets" role="group" aria-label="Qui afficher">
            <button type="button" className="mairie-bouton" aria-pressed={source === ''} onClick={() => setSource('')}>
              Tous ({vols.length + bens.length + ents.length})
            </button>
            {sections.map((s) => (
              <button key={s.id} type="button" className="mairie-bouton" aria-pressed={source === s.id} onClick={() => setSource(s.id)}>
                {s.titre} ({s.nombre})
              </button>
            ))}
          </div>
        </div>
      )}
      {compact && affichees.length === 0 && <p className="texte-doux">Personne d’enregistré ne peut répondre à ce besoin : orientez vers un lieu d’accueil ou appelez les secours.</p>}
      {affichees.map((s) => (
        <div key={s.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="mairie-qui-aide-source">
            {s.titre} <span className="texte-doux">({s.nombre})</span>
          </span>
          {s.nombre === 0 ? (
            <p className="texte-doux" style={{ fontSize: 14 }}>
              {s.vide}
            </p>
          ) : (
            <ul className="mairie-aidants">{s.contenu}</ul>
          )}
          {compact && s.nombre > limite && (
            <span className="texte-doux" style={{ fontSize: 13 }}>
              et {s.nombre - limite} autre{s.nombre - limite > 1 ? 's' : ''} dans la liste « Qui peut aider »
            </span>
          )}
        </div>
      ))}
      {message && (
        <p role="status" style={{ fontSize: 14 }}>
          {message}
        </p>
      )}
    </div>
  )
}
