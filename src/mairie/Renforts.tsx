import { useState } from 'react'
import { lienTelephone, serveurMairie as serveur, type MissionServeur } from '../services/serveur.ts'
import { distanceLisible, distanceMetres, type Coordonnees } from '../outils/carte.ts'
import type { Benevole, Entreprise, StatutBenevole, StatutEntreprise } from './Partenaires.tsx'
import { aidantsPour, benevolesPourMission, correspondances, libelleBesoin, libelleRessource, type Engagement, type Volontaire } from './aidants.ts'

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
  // Fiche d'une demande : les 5 premiers, sans filtres
  compact?: boolean
  titre?: string
  // Hébergement : les foyers volontaires sont déjà listés à part
  sansVolontaires?: boolean
  // Besoin présélectionné (clic dans le tableau des besoins)
  besoinInitial?: string
  // Fiche d'une demande : appeler, mobiliser ou solliciter fait passer la demande « en cours »
  onAgir?: () => void
  // Mission déjà envoyée pour ce besoin : volontaires et Protection civile passent par elle, reste le matériel
  seulementMateriel?: boolean
}

// Liste unique des aidants, avec le geste utile pour chacun : appeler, mobiliser, solliciter le matériel
export function QuiPeutAider({ volontaires, benevoles, entreprises, engagements, enCrise, besoin: besoinImpose, position, compact = false, titre, sansVolontaires = false, besoinInitial = '', onAgir, seulementMateriel = false }: Props) {
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
  const limite = compact ? 5 : Infinity

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

  // Une seule liste : volontaires, bénévoles et entreprises mélangés, les libres d'abord puis les plus proches.
  // L'étiquette dit qui est qui ; les filtres servent seulement à resserrer la liste.
  type Ligne = { cle: string; sorte: Exclude<Source, ''>; rang: number; distance: number; contenu: React.ReactNode }
  const lignes: Ligne[] = []
  if (!sansVolontaires && !seulementMateriel)
    for (const v of vols) {
      const m = distance(v)
      const deja = occupe(v.auteur)
      lignes.push({
        cle: `v-${v.auteur}`,
        sorte: 'volontaires',
        rang: deja.length > 0 ? 1 : 0,
        distance: m ?? Infinity,
        contenu: (
          <>
            <span className="mairie-aidant-texte">
              <span>
                <span className="mairie-sorte mairie-sorte--volontaire">Volontaire</span> <strong>{[v.prenom, v.nom].filter(Boolean).join(' ') || 'Volontaire'}</strong>
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
          </>
        ),
      })
    }
  if (!seulementMateriel)
    for (const b of bens)
      lignes.push({
        cle: `b-${b.id}`,
        sorte: 'benevoles',
        rang: rangBenevole[b.statut],
        distance: Infinity,
        contenu: (
          <>
            <span className="mairie-aidant-texte">
              <span>
                <span className="mairie-sorte mairie-sorte--benevole">Protection civile</span> <strong>{b.nom}</strong>
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
          </>
        ),
      })
  for (const e of ents)
    lignes.push({
      cle: `e-${e.id}`,
      sorte: 'entreprises',
      rang: rangEntreprise[e.statut],
      distance: Infinity,
      contenu: (
        <>
          <span className="mairie-aidant-texte">
            <span>
              <span className="mairie-sorte mairie-sorte--entreprise">Entreprise · matériel</span> <strong>{e.nom}</strong>
            </span>
            <span className="mairie-aidant-etiquettes">
              <span className={`mairie-etiquette${e.statut === 'disponible' ? '' : ' mairie-etiquette--ok'}`}>
                {e.statut === 'disponible' ? 'Disponible' : e.statut === 'sollicitee' ? 'Sollicitée' : 'Matériel engagé'}
              </span>
              {e.materiel.filter((m) => !besoin || correspondances[besoin]?.materiel.includes(m)).map((m) => (
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
                Solliciter le matériel
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
        </>
      ),
    })
  lignes.sort((x, y) => x.rang - y.rang || x.distance - y.distance)
  const nombre = (sorte: Exclude<Source, ''>) => lignes.filter((l) => l.sorte === sorte).length
  const filtrees = lignes.filter((l) => !source || l.sorte === source)
  const affichees = filtrees.slice(0, limite)
  const filtres: { id: Exclude<Source, ''>; titre: string }[] = [
    ...(sansVolontaires ? [] : [{ id: 'volontaires' as const, titre: 'Volontaires' }]),
    { id: 'benevoles', titre: 'Protection civile' },
    { id: 'entreprises', titre: 'Entreprises (matériel)' },
  ]

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
              Tout le monde ({lignes.length})
            </button>
            {filtres.map((f) => (
              <button key={f.id} type="button" className="mairie-bouton" aria-pressed={source === f.id} onClick={() => setSource(f.id)}>
                {f.titre} ({nombre(f.id)})
              </button>
            ))}
          </div>
        </div>
      )}
      {filtrees.length === 0 ? (
        <p className="texte-doux" style={{ fontSize: 14 }}>
          {compact
            ? 'Personne d’enregistré ne peut répondre à ce besoin : orientez vers un lieu d’accueil ou appelez les secours.'
            : enCrise
              ? 'Personne pour ce besoin dans cette liste.'
              : 'Les volontaires se déclarent pendant une crise ; la Protection civile et les entreprises se gèrent dans leurs onglets.'}
        </p>
      ) : (
        <ul className="mairie-aidants">
          {affichees.map((l) => (
            <li key={l.cle} className="mairie-aidant">
              {l.contenu}
            </li>
          ))}
        </ul>
      )}
      {compact && filtrees.length > limite && (
        <span className="texte-doux" style={{ fontSize: 13 }}>
          et {filtrees.length - limite} autre{filtrees.length - limite > 1 ? 's' : ''} dans la liste « Qui peut aider »
        </span>
      )}
      {message && (
        <p role="status" style={{ fontSize: 14 }}>
          {message}
        </p>
      )}
    </div>
  )
}

// Une mission ne se limite pas aux volontaires de l'app : la cellule y ajoute des bénévoles de la Protection civile.
// Les entreprises n'y figurent jamais (elles prêtent du matériel, sans mission).
export function RenfortsMission({ mission, benevoles, onAgir }: { mission: MissionServeur; benevoles: Benevole[]; onAgir?: () => void }) {
  const [message, setMessage] = useState('')
  const [ouvert, setOuvert] = useState(false)
  const surMission = benevoles.filter((b) => b.statut === 'mobilise' && b.mission_id === mission.id)
  const libres = benevolesPourMission(mission.categorie, benevoles).filter((b) => b.statut === 'disponible')

  const changer = async (b: Benevole, ajouter: boolean) => {
    if (ajouter) onAgir?.()
    const modif = ajouter ? { statut: 'mobilise', mission_id: mission.id } : { statut: 'disponible', mission_id: null }
    let { error } = await serveur!.from('benevoles_association').update(modif).eq('id', b.id)
    // Colonne mission_id absente tant que la migration 0021 n'est pas lancée : le statut change quand même
    if (error) ({ error } = await serveur!.from('benevoles_association').update({ statut: modif.statut }).eq('id', b.id))
    setMessage(error ? "Échec : le bénévole n'a pas été ajouté." : ajouter ? `${b.nom} ajouté à la mission. Appelez-le pour lui donner le rendez-vous.` : '')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
      <span>
        <strong>Protection civile :</strong>{' '}
        {surMission.length > 0 ? surMission.map((b) => b.nom).join(', ') : 'personne ajouté'}
        {libres.length > 0 && <span className="texte-doux"> · {libres.length} disponible{libres.length > 1 ? 's' : ''} pour ce type d’aide</span>}
      </span>
      {surMission.length > 0 && (
        <ul className="mairie-aidants">
          {surMission.map((b) => (
            <li key={b.id} className="mairie-aidant">
              <span className="mairie-aidant-texte">
                <span>
                  <span className="mairie-sorte mairie-sorte--benevole">Protection civile</span> <strong>{b.nom}</strong>
                </span>
              </span>
              <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {b.telephone && (
                  <a href={lienTelephone(b.telephone)} className="mairie-bouton" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                    Appeler · {b.telephone}
                  </a>
                )}
                <button type="button" className="mairie-bouton" onClick={() => void changer(b, false)}>
                  Retirer
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {libres.length > 0 &&
        (ouvert ? (
          <ul className="mairie-aidants">
            {libres.map((b) => (
              <li key={b.id} className="mairie-aidant">
                <span className="mairie-aidant-texte">
                  <span>
                    <span className="mairie-sorte mairie-sorte--benevole">Protection civile</span> <strong>{b.nom}</strong>
                  </span>
                  <span className="mairie-aidant-etiquettes">
                    {b.qualifications.map((q) => (
                      <span key={q} className="mairie-etiquette">
                        {q}
                      </span>
                    ))}
                  </span>
                </span>
                <button type="button" className="mairie-bouton mairie-bouton--principal" onClick={() => void changer(b, true)}>
                  Ajouter à la mission
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <button type="button" className="mairie-bouton" style={{ alignSelf: 'flex-start' }} onClick={() => setOuvert(true)}>
            Ajouter des bénévoles de la Protection civile
          </button>
        ))}
      {message && (
        <p role="status" style={{ fontSize: 14 }}>
          {message}
        </p>
      )}
    </div>
  )
}
