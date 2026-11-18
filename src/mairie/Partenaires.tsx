import { useState, type FormEvent } from 'react'
import { lienTelephone, serveurMairie as serveur } from '../services/serveur.ts'

// Partenaires de la commune (migration 0017), gérés par la mairie seule, jamais visibles des habitants :
// - entreprises sous convention, qui prêtent du matériel ou des engins pendant une crise ;
// - bénévoles d'une association engagée (réserve communale de sécurité civile, Protection civile…).

export type StatutEntreprise = 'disponible' | 'sollicitee' | 'engagee'
export type Entreprise = {
  id: string
  nom: string
  siret: string
  contact: string
  telephone: string
  materiel: string[]
  precisions: string
  convention_fin: string | null
  statut: StatutEntreprise
  updated_at: string
}

export type StatutBenevole = 'disponible' | 'mobilise' | 'indisponible'
export type Benevole = {
  id: string
  nom: string
  telephone: string
  association: string
  qualifications: string[]
  statut: StatutBenevole
  updated_at: string
}

const materiels = [
  'Engins de chantier',
  'Pompes et motopompes',
  'Groupes électrogènes',
  'Camions et transport',
  'Sacs de sable et barrières',
  'Bâches et mise à l’abri',
  'Eau et vivres',
  'Lits et couvertures',
  'Outillage et déblaiement',
]

const qualifications = [
  'Secourisme (PSE1 / PSE2)',
  'Logistique',
  'Accueil et hébergement',
  'Conduite poids lourd',
  'Transmissions radio',
  'Soutien psychologique',
  'Déblaiement et bricolage',
]

const libelleStatutEntreprise: Record<StatutEntreprise, string> = {
  disponible: 'Disponible',
  sollicitee: 'Sollicitée',
  engagee: 'Matériel engagé',
}
const libelleStatutBenevole: Record<StatutBenevole, string> = {
  disponible: 'Disponible',
  mobilise: 'Mobilisé',
  indisponible: 'Indisponible',
}

const aujourdhui = () => new Date().toISOString().slice(0, 10)
const dateLisible = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

function Choix({ options, choisis, onChange, legende }: { options: string[]; choisis: string[]; onChange: (v: string[]) => void; legende: string }) {
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <legend style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{legende}</legend>
      <div className="mairie-onglets">
        {options.map((o) => {
          const actif = choisis.includes(o)
          return (
            <button key={o} type="button" className="mairie-bouton" aria-pressed={actif} onClick={() => onChange(actif ? choisis.filter((c) => c !== o) : [...choisis, o])}>
              {o}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

function Champ({ libelle, ...props }: { libelle: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, fontWeight: 700, flex: 1, minWidth: 180 }}>
      {libelle}
      <input className="mairie-champ" {...props} />
    </label>
  )
}

function Filtres<T extends string>({ valeurs, valeur, onChange, libelle }: { valeurs: T[]; valeur: T | ''; onChange: (v: T | '') => void; libelle: string }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, fontWeight: 700, maxWidth: 360 }}>
      {libelle}
      <select className="mairie-champ" value={valeur} onChange={(e) => onChange(e.target.value as T | '')}>
        <option value="">Tout afficher</option>
        {valeurs.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    </label>
  )
}

// ─── Entreprises sous convention ─────────────────────────────────────────

const entrepriseVide = { nom: '', siret: '', contact: '', telephone: '', materiel: [] as string[], precisions: '', convention_fin: '' }

export function PanneauEntreprises({ entreprises, communeId, enCrise }: { entreprises: Entreprise[]; communeId: string; enCrise: boolean }) {
  const [filtre, setFiltre] = useState('')
  const [edition, setEdition] = useState<{ id: string | null; valeurs: typeof entrepriseVide } | null>(null)
  const [message, setMessage] = useState('')

  const visibles = entreprises.filter((e) => !filtre || e.materiel.includes(filtre))
  const engagees = entreprises.filter((e) => e.statut !== 'disponible').length
  const expirees = entreprises.filter((e) => e.convention_fin && e.convention_fin < aujourdhui()).length

  const enregistrer = async (ev: FormEvent) => {
    ev.preventDefault()
    if (!edition) return
    const v = edition.valeurs
    const ligne = {
      nom: v.nom.trim(),
      siret: v.siret.replace(/\s/g, ''),
      contact: v.contact.trim(),
      telephone: v.telephone.trim(),
      materiel: v.materiel,
      precisions: v.precisions.trim(),
      convention_fin: v.convention_fin || null,
    }
    const { error } = edition.id
      ? await serveur!.from('entreprises_convention').update(ligne).eq('id', edition.id)
      : await serveur!.from('entreprises_convention').insert({ ...ligne, commune_id: communeId })
    if (error) return setMessage("Échec : l'entreprise n'a pas été enregistrée. La migration 0017 est-elle lancée ?")
    setMessage(edition.id ? 'Fiche mise à jour.' : 'Entreprise ajoutée.')
    setEdition(null)
  }

  const changerStatut = async (e: Entreprise, statut: StatutEntreprise) => {
    const { error } = await serveur!.from('entreprises_convention').update({ statut }).eq('id', e.id)
    setMessage(error ? "Échec : le statut n'a pas changé." : '')
  }

  const supprimer = async (e: Entreprise) => {
    if (!window.confirm(`Retirer « ${e.nom} » des entreprises conventionnées ?`)) return
    const { error } = await serveur!.from('entreprises_convention').delete().eq('id', e.id)
    setMessage(error ? "Échec : l'entreprise est toujours dans la liste." : '')
  }

  const siretValide = !edition || edition.valeurs.siret.replace(/\s/g, '') === '' || /^\d{14}$/.test(edition.valeurs.siret.replace(/\s/g, ''))

  return (
    <section className="mairie-panneau" aria-labelledby="titre-entreprises">
      <h2 id="titre-entreprises">Entreprises conventionnées</h2>
      <p className="texte-doux" style={{ fontSize: 14, lineHeight: 1.5 }}>
        Entreprises qui ont signé une convention avec la commune pour prêter du matériel ou des engins en cas de crise. Appelez-les, puis
        notez où en est chaque demande : tout le monde dans la cellule de crise voit le même état.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span className="mairie-etiquette">{entreprises.length} conventionnée{entreprises.length > 1 ? 's' : ''}</span>
        {engagees > 0 && <span className="mairie-etiquette mairie-etiquette--ok">{engagees} sollicitée{engagees > 1 ? 's' : ''} ou engagée{engagees > 1 ? 's' : ''}</span>}
        {expirees > 0 && <span className="mairie-etiquette mairie-etiquette--urgent">{expirees} convention{expirees > 1 ? 's' : ''} à renouveler</span>}
      </div>
      <Filtres libelle="Matériel recherché" valeurs={materiels} valeur={filtre} onChange={setFiltre} />

      {edition ? (
        <form onSubmit={enregistrer} style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--bordure)', paddingTop: 12 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Champ libelle="Entreprise" required minLength={2} maxLength={120} value={edition.valeurs.nom} onChange={(e) => setEdition({ ...edition, valeurs: { ...edition.valeurs, nom: e.target.value } })} />
            <Champ
              libelle="SIRET (14 chiffres)"
              inputMode="numeric"
              maxLength={17}
              value={edition.valeurs.siret}
              aria-invalid={!siretValide}
              onChange={(e) => setEdition({ ...edition, valeurs: { ...edition.valeurs, siret: e.target.value } })}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Champ libelle="Contact" maxLength={120} placeholder="Nom de l'interlocuteur" value={edition.valeurs.contact} onChange={(e) => setEdition({ ...edition, valeurs: { ...edition.valeurs, contact: e.target.value } })} />
            <Champ libelle="Téléphone d'astreinte" type="tel" maxLength={20} value={edition.valeurs.telephone} onChange={(e) => setEdition({ ...edition, valeurs: { ...edition.valeurs, telephone: e.target.value } })} />
            <Champ libelle="Convention valable jusqu'au" type="date" value={edition.valeurs.convention_fin} onChange={(e) => setEdition({ ...edition, valeurs: { ...edition.valeurs, convention_fin: e.target.value } })} />
          </div>
          <Choix legende="Matériel prévu par la convention" options={materiels} choisis={edition.valeurs.materiel} onChange={(m) => setEdition({ ...edition, valeurs: { ...edition.valeurs, materiel: m } })} />
          <Champ
            libelle="Précisions"
            maxLength={300}
            placeholder="2 pelleteuses, 1 camion benne, délai d'intervention 2 h"
            value={edition.valeurs.precisions}
            onChange={(e) => setEdition({ ...edition, valeurs: { ...edition.valeurs, precisions: e.target.value } })}
          />
          {!siretValide && <p style={{ fontSize: 14, color: 'var(--urgence-fonce)' }}>Le SIRET compte 14 chiffres.</p>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="submit" className="mairie-bouton mairie-bouton--principal" disabled={edition.valeurs.nom.trim().length < 2 || edition.valeurs.materiel.length === 0 || !siretValide}>
              Enregistrer
            </button>
            <button type="button" className="mairie-bouton" onClick={() => setEdition(null)}>
              Annuler
            </button>
          </div>
        </form>
      ) : (
        <div>
          <button type="button" className="mairie-bouton mairie-bouton--principal" onClick={() => setEdition({ id: null, valeurs: entrepriseVide })}>
            Ajouter une entreprise
          </button>
        </div>
      )}

      {message && (
        <p role="status" style={{ fontSize: 14 }}>
          {message}
        </p>
      )}

      {visibles.length === 0 && <p className="texte-doux">{filtre ? 'Aucune entreprise ne prête ce matériel.' : 'Aucune entreprise conventionnée pour le moment.'}</p>}
      {visibles.map((e) => {
        const expiree = !!e.convention_fin && e.convention_fin < aujourdhui()
        return (
          <article key={e.id} className="mairie-demande" style={{ borderLeftColor: e.statut === 'disponible' ? 'var(--bleu-clair)' : 'var(--bleu)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <strong style={{ color: 'var(--bleu-nuit)' }}>{e.nom}</strong>
              <span className={`mairie-etiquette${e.statut === 'disponible' ? '' : ' mairie-etiquette--ok'}`}>{libelleStatutEntreprise[e.statut]}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {e.materiel.map((m) => (
                <span key={m} className="mairie-etiquette">
                  {m}
                </span>
              ))}
            </div>
            {e.precisions && <p style={{ fontSize: 14 }}>{e.precisions}</p>}
            <p className="texte-doux" style={{ fontSize: 13 }}>
              {e.contact || 'Contact non renseigné'}
              {e.siret ? ` · SIRET ${e.siret}` : ''}
              {e.convention_fin ? (
                <span style={expiree ? { color: 'var(--urgence-fonce)', fontWeight: 700 } : undefined}>
                  {' '}
                  · Convention {expiree ? 'expirée le' : "jusqu'au"} {dateLisible(e.convention_fin)}
                </span>
              ) : null}
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {e.telephone && (
                <a href={lienTelephone(e.telephone)} className="mairie-bouton" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                  Appeler · {e.telephone}
                </a>
              )}
              {enCrise && e.statut === 'disponible' && (
                <button type="button" className="mairie-bouton mairie-bouton--principal" onClick={() => void changerStatut(e, 'sollicitee')}>
                  Solliciter
                </button>
              )}
              {e.statut === 'sollicitee' && (
                <button type="button" className="mairie-bouton mairie-bouton--principal" onClick={() => void changerStatut(e, 'engagee')}>
                  Matériel engagé
                </button>
              )}
              {e.statut !== 'disponible' && (
                <button type="button" className="mairie-bouton" onClick={() => void changerStatut(e, 'disponible')}>
                  {e.statut === 'engagee' ? 'Matériel rendu' : 'Annuler la demande'}
                </button>
              )}
              {/* Pendant la crise, seuls les gestes utiles restent : appeler, solliciter, engager */}
              {!enCrise && (
              <button
                type="button"
                className="mairie-bouton"
                onClick={() =>
                  setEdition({
                    id: e.id,
                    valeurs: { nom: e.nom, siret: e.siret, contact: e.contact, telephone: e.telephone, materiel: e.materiel, precisions: e.precisions, convention_fin: e.convention_fin ?? '' },
                  })
                }
              >
                Modifier
              </button>
              )}
              {!enCrise && (
                <button type="button" className="mairie-bouton" onClick={() => void supprimer(e)}>
                  Retirer
                </button>
              )}
            </div>
          </article>
        )
      })}
    </section>
  )
}

// ─── Association de bénévoles ────────────────────────────────────────────

const benevoleVide = { nom: '', telephone: '', association: '', qualifications: [] as string[] }

export function PanneauBenevoles({ benevoles, communeId, enCrise }: { benevoles: Benevole[]; communeId: string; enCrise: boolean }) {
  const [filtre, setFiltre] = useState('')
  const [edition, setEdition] = useState<{ id: string | null; valeurs: typeof benevoleVide } | null>(null)
  const [message, setMessage] = useState('')

  const associations = [...new Set(benevoles.map((b) => b.association).filter(Boolean))]
  const visibles = benevoles.filter((b) => !filtre || b.qualifications.includes(filtre))
  const mobilises = benevoles.filter((b) => b.statut === 'mobilise').length
  const disponibles = benevoles.filter((b) => b.statut === 'disponible')

  const enregistrer = async (ev: FormEvent) => {
    ev.preventDefault()
    if (!edition) return
    const v = edition.valeurs
    const ligne = { nom: v.nom.trim(), telephone: v.telephone.trim(), association: v.association.trim() || 'Réserve communale de sécurité civile', qualifications: v.qualifications }
    const { error } = edition.id
      ? await serveur!.from('benevoles_association').update(ligne).eq('id', edition.id)
      : await serveur!.from('benevoles_association').insert({ ...ligne, commune_id: communeId })
    if (error) return setMessage("Échec : le bénévole n'a pas été enregistré. La migration 0017 est-elle lancée ?")
    setMessage(edition.id ? 'Fiche mise à jour.' : 'Bénévole ajouté.')
    setEdition(null)
  }

  const changerStatut = async (b: Benevole, statut: StatutBenevole) => {
    const { error } = await serveur!.from('benevoles_association').update({ statut }).eq('id', b.id)
    setMessage(error ? "Échec : le statut n'a pas changé." : '')
  }

  const mobiliserTous = async () => {
    const ids = visibles.filter((b) => b.statut === 'disponible').map((b) => b.id)
    if (ids.length === 0 || !window.confirm(`Marquer ${ids.length} bénévole${ids.length > 1 ? 's' : ''} comme mobilisé${ids.length > 1 ? 's' : ''} ? Pensez à les prévenir.`)) return
    const { error } = await serveur!.from('benevoles_association').update({ statut: 'mobilise' }).in('id', ids)
    setMessage(error ? 'Échec : la mobilisation n’a pas été enregistrée.' : '')
  }

  const supprimer = async (b: Benevole) => {
    if (!window.confirm(`Retirer ${b.nom} de la liste des bénévoles ?`)) return
    const { error } = await serveur!.from('benevoles_association').delete().eq('id', b.id)
    setMessage(error ? 'Échec : le bénévole est toujours dans la liste.' : '')
  }

  return (
    <section className="mairie-panneau" aria-labelledby="titre-benevoles">
      <h2 id="titre-benevoles">Bénévoles de la protection civile</h2>
      <p className="texte-doux" style={{ fontSize: 14, lineHeight: 1.5 }}>
        Personnes engagées auprès de la commune, formées et mobilisables en crise : réserve communale de sécurité civile, Protection civile, Croix-Rouge… À la
        différence des volontaires de l'app, la mairie les connaît et les appelle directement.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span className="mairie-etiquette">{benevoles.length} bénévole{benevoles.length > 1 ? 's' : ''}</span>
        <span className="mairie-etiquette">{disponibles.length} disponible{disponibles.length > 1 ? 's' : ''}</span>
        {mobilises > 0 && <span className="mairie-etiquette mairie-etiquette--ok">{mobilises} mobilisé{mobilises > 1 ? 's' : ''}</span>}
        {associations.map((a) => (
          <span key={a} className="mairie-etiquette">
            {a}
          </span>
        ))}
      </div>
      <Filtres libelle="Compétence recherchée" valeurs={qualifications} valeur={filtre} onChange={setFiltre} />

      {edition ? (
        <form onSubmit={enregistrer} style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--bordure)', paddingTop: 12 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Champ libelle="Prénom et nom" required minLength={2} maxLength={120} value={edition.valeurs.nom} onChange={(e) => setEdition({ ...edition, valeurs: { ...edition.valeurs, nom: e.target.value } })} />
            <Champ libelle="Téléphone" type="tel" maxLength={20} value={edition.valeurs.telephone} onChange={(e) => setEdition({ ...edition, valeurs: { ...edition.valeurs, telephone: e.target.value } })} />
          </div>
          <Champ
            libelle="Association"
            maxLength={120}
            list="associations-connues"
            placeholder="Réserve communale de sécurité civile"
            value={edition.valeurs.association}
            onChange={(e) => setEdition({ ...edition, valeurs: { ...edition.valeurs, association: e.target.value } })}
          />
          <datalist id="associations-connues">
            {[...new Set([...associations, 'Réserve communale de sécurité civile', 'Protection civile', 'Croix-Rouge française'])].map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
          <Choix legende="Compétences" options={qualifications} choisis={edition.valeurs.qualifications} onChange={(q) => setEdition({ ...edition, valeurs: { ...edition.valeurs, qualifications: q } })} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="submit" className="mairie-bouton mairie-bouton--principal" disabled={edition.valeurs.nom.trim().length < 2}>
              Enregistrer
            </button>
            <button type="button" className="mairie-bouton" onClick={() => setEdition(null)}>
              Annuler
            </button>
          </div>
        </form>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="mairie-bouton mairie-bouton--principal" onClick={() => setEdition({ id: null, valeurs: benevoleVide })}>
            Ajouter un bénévole
          </button>
          {enCrise && visibles.some((b) => b.statut === 'disponible') && (
            <button type="button" className="mairie-bouton" onClick={() => void mobiliserTous()}>
              Mobiliser les disponibles{filtre ? ` (${filtre})` : ''}
            </button>
          )}
        </div>
      )}

      {message && (
        <p role="status" style={{ fontSize: 14 }}>
          {message}
        </p>
      )}

      {visibles.length === 0 && <p className="texte-doux">{filtre ? 'Aucun bénévole avec cette compétence.' : 'Aucun bénévole enregistré pour le moment.'}</p>}
      {visibles.map((b) => (
        <article key={b.id} className="mairie-demande" style={{ borderLeftColor: b.statut === 'mobilise' ? 'var(--bleu)' : b.statut === 'disponible' ? 'var(--bleu-clair)' : 'var(--bordure)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <strong style={{ color: 'var(--bleu-nuit)' }}>{b.nom}</strong>
            <span className={`mairie-etiquette${b.statut === 'mobilise' ? ' mairie-etiquette--ok' : ''}`}>{libelleStatutBenevole[b.statut]}</span>
          </div>
          <p className="texte-doux" style={{ fontSize: 13 }}>
            {b.association}
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {b.qualifications.map((q) => (
              <span key={q} className="mairie-etiquette">
                {q}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {b.telephone && (
              <a href={lienTelephone(b.telephone)} className="mairie-bouton" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                Appeler · {b.telephone}
              </a>
            )}
            {enCrise && b.statut === 'disponible' && (
              <button type="button" className="mairie-bouton mairie-bouton--principal" onClick={() => void changerStatut(b, 'mobilise')}>
                Mobiliser
              </button>
            )}
            {b.statut === 'mobilise' && (
              <button type="button" className="mairie-bouton" onClick={() => void changerStatut(b, 'disponible')}>
                Fin de mission
              </button>
            )}
            {b.statut !== 'indisponible' ? (
              <button type="button" className="mairie-bouton" onClick={() => void changerStatut(b, 'indisponible')}>
                Indisponible
              </button>
            ) : (
              <button type="button" className="mairie-bouton" onClick={() => void changerStatut(b, 'disponible')}>
                De nouveau disponible
              </button>
            )}
            {!enCrise && (
              <button type="button" className="mairie-bouton" onClick={() => setEdition({ id: b.id, valeurs: { nom: b.nom, telephone: b.telephone, association: b.association, qualifications: b.qualifications } })}>
                Modifier
              </button>
            )}
            {!enCrise && (
              <button type="button" className="mairie-bouton" onClick={() => void supprimer(b)}>
                Retirer
              </button>
            )}
          </div>
        </article>
      ))}
    </section>
  )
}
