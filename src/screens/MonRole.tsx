import { useState, type FormEvent } from 'react'
import BarreNav from '../components/BarreNav.tsx'
import EnTeteRetour from '../components/EnTeteRetour.tsx'
import { champ, libelle } from '../outils/formulaire.ts'
import { useAppState, type Habilitation, type TypeHabilitation } from '../state/AppState.tsx'

const titres: Record<TypeHabilitation, string> = {
  protection_civile: 'Bénévole de la protection civile',
  entreprise: 'Entreprise partenaire de la ville',
}

const textesStatut: Record<Habilitation['statut'], { texte: string; fond: string; couleur: string }> = {
  a_verifier: { texte: 'En attente de vérification par la mairie', fond: 'var(--bleu-voile)', couleur: 'var(--bleu-nuit)' },
  verifiee: { texte: '✓ Vérifié par la mairie', fond: 'var(--bleu)', couleur: 'var(--blanc)' },
  refusee: { texte: 'Non confirmé : contactez la mairie', fond: 'var(--urgence-pale)', couleur: 'var(--urgence-fonce)' },
}

function Statut({ h }: { h: Habilitation }) {
  const s = textesStatut[h.statut]
  return (
    <span role="status" style={{ alignSelf: 'flex-start', background: s.fond, color: s.couleur, borderRadius: 14, padding: '6px 12px', fontSize: 13, fontWeight: 700 }}>
      {!h.envoyee ? 'Envoi dès le retour du réseau' : s.texte}
    </span>
  )
}

// Rôle dans le dispositif communal : bénévole formé (protection civile) ou entreprise sous convention.
// La preuve reste hors de l'app : la mairie vérifie auprès de l'association ou de ses conventions.
export default function MonRole() {
  const { habilitations, demanderHabilitation, retirerHabilitation, communeAffichee } = useAppState()
  const pc = habilitations.find((h) => h.type === 'protection_civile')
  const ent = habilitations.find((h) => h.type === 'entreprise')
  const [ouvert, setOuvert] = useState<TypeHabilitation | null>(null)
  const [numero, setNumero] = useState('')
  const [entreprise, setEntreprise] = useState('')
  const [siret, setSiret] = useState('')
  const [materiel, setMateriel] = useState('')

  const siretChiffres = siret.replace(/\s/g, '')
  const siretValide = /^\d{14}$/.test(siretChiffres)

  const envoyerPc = (e: FormEvent) => {
    e.preventDefault()
    if (numero.trim().length < 3) return
    demanderHabilitation('protection_civile', { numero: numero.trim() })
    setOuvert(null)
  }
  const envoyerEntreprise = (e: FormEvent) => {
    e.preventDefault()
    if (entreprise.trim().length < 2 || !siretValide || materiel.trim().length < 3) return
    demanderHabilitation('entreprise', { entreprise: entreprise.trim(), siret: siretChiffres, materiel: materiel.trim() })
    setOuvert(null)
  }

  const bloc = (type: TypeHabilitation, h: Habilitation | undefined, description: string, resume: string | null) => (
    <section className="carte" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16 }}>
      <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--bleu-nuit)' }}>{titres[type]}</h2>
      <p style={{ fontSize: 14, lineHeight: 1.45 }}>{description}</p>
      {h && (
        <>
          {resume && <p style={{ fontSize: 14, fontWeight: 700 }}>{resume}</p>}
          <Statut h={h} />
        </>
      )}
      {ouvert !== type && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className={h ? 'bouton bouton--contour' : 'bouton bouton--clair'} style={{ flex: 1 }} onClick={() => setOuvert(type)}>
            {h ? 'Modifier' : "J'en fais partie"}
          </button>
          {h && (
            <button type="button" className="bouton bouton--contour" style={{ flex: 1 }} onClick={() => retirerHabilitation(type)}>
              Retirer
            </button>
          )}
        </div>
      )}
    </section>
  )

  return (
    <div className="ecran">
      <EnTeteRetour retour="/profil">
        <h1 style={{ fontSize: 21, fontWeight: 800, color: 'var(--bleu-nuit)' }}>Mon rôle dans la commune</h1>
        <span className="texte-doux">Vérifié par la mairie de {communeAffichee}</span>
      </EnTeteRetour>

      <main className="contenu" style={{ paddingTop: 12 }}>
        {bloc(
          'protection_civile',
          pc,
          "Vous êtes formé et membre de l'association de protection civile : la cellule de crise peut vous confier les missions qui demandent une formation.",
          pc ? `N° de bénévole : ${pc.details.numero}` : null,
        )}
        {ouvert === 'protection_civile' && (
          <form onSubmit={envoyerPc} className="carte" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
            <label style={libelle}>
              Numéro de bénévole (carte de membre)
              <input type="text" value={numero} onChange={(e) => setNumero(e.target.value)} maxLength={40} style={champ} autoComplete="off" />
            </label>
            <p className="texte-doux" style={{ lineHeight: 1.4 }}>
              La mairie vérifie ce numéro auprès de l'association. Aucun document n'est demandé dans l'application.
            </p>
            <button type="submit" className="bouton bouton--principal" disabled={numero.trim().length < 3}>
              Envoyer pour vérification
            </button>
            <button type="button" className="bouton bouton--contour" onClick={() => setOuvert(null)}>
              Annuler
            </button>
          </form>
        )}

        {bloc(
          'entreprise',
          ent,
          'Votre entreprise a signé une convention avec la ville pour louer du matériel en cas de sinistre : la cellule de crise vous contacte quand elle en a besoin.',
          ent ? `${ent.details.entreprise} · SIRET ${ent.details.siret}` : null,
        )}
        {ouvert === 'entreprise' && (
          <form onSubmit={envoyerEntreprise} className="carte" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
            <label style={libelle}>
              Nom de l'entreprise
              <input type="text" value={entreprise} onChange={(e) => setEntreprise(e.target.value)} maxLength={80} style={champ} autoComplete="organization" />
            </label>
            <label style={libelle}>
              SIRET (14 chiffres)
              <input type="text" inputMode="numeric" value={siret} onChange={(e) => setSiret(e.target.value)} maxLength={17} style={champ} autoComplete="off" />
            </label>
            {siret && !siretValide && <span className="texte-doux">Le SIRET compte 14 chiffres.</span>}
            <label style={libelle}>
              Matériel proposé à la location
              <textarea
                value={materiel}
                onChange={(e) => setMateriel(e.target.value)}
                maxLength={400}
                placeholder="Ex. : 4 pompes de relevage, 2 groupes électrogènes, mini-pelle avec chauffeur"
                style={{ ...champ, height: 96, padding: '10px 14px', resize: 'vertical' }}
              />
            </label>
            <p className="texte-doux" style={{ lineHeight: 1.4 }}>
              La mairie vérifie que l'entreprise figure dans ses conventions. Tarifs et facturation restent ceux de la convention.
            </p>
            <button type="submit" className="bouton bouton--principal" disabled={entreprise.trim().length < 2 || !siretValide || materiel.trim().length < 3}>
              Envoyer pour vérification
            </button>
            <button type="button" className="bouton bouton--contour" onClick={() => setOuvert(null)}>
              Annuler
            </button>
          </form>
        )}
      </main>
      <BarreNav />
    </div>
  )
}
