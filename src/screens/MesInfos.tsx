import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import BarreNav from '../components/BarreNav.tsx'
import ChampAdresse from '../components/ChampAdresse.tsx'
import ChampTelephone from '../components/ChampTelephone.tsx'
import EnTeteRetour from '../components/EnTeteRetour.tsx'
import Icone from '../components/Icone.tsx'
import { champ, libelle, numeroValide, type EtatCode } from '../outils/formulaire.ts'
import { useAppState } from '../state/AppState.tsx'

const chiffres = (numero: string) => numero.replace(/[\s.-]/g, '')

// Informations personnelles : affichées en lecture, modifiables sur demande.
// Un nouveau numéro se confirme par code SMS.
export default function MesInfos() {
  const navigate = useNavigate()
  const retourDuCode = !!(useLocation().state as { enregistre?: boolean } | null)?.enregistre
  const { utilisateur, ressources, accueil, modifierUtilisateur } = useAppState()
  const [edition, setEdition] = useState(false)
  const [prenom, setPrenom] = useState(utilisateur?.prenom ?? '')
  const [nom, setNom] = useState(utilisateur?.nom ?? '')
  const [telephone, setTelephone] = useState(utilisateur?.telephone ?? '')
  const [commune, setCommune] = useState(utilisateur?.commune ?? '')
  const [enregistre, setEnregistre] = useState(retourDuCode)

  if (!utilisateur) return null

  const nouveauNumero = chiffres(telephone) !== chiffres(utilisateur.telephone)
  const modifie =
    nouveauNumero || prenom.trim() !== utilisateur.prenom || nom.trim() !== (utilisateur.nom ?? '') || commune.trim() !== utilisateur.commune
  const valide = prenom.trim() !== '' && numeroValide(telephone) && commune.trim() !== ''

  const annuler = () => {
    setPrenom(utilisateur.prenom)
    setNom(utilisateur.nom ?? '')
    setTelephone(utilisateur.telephone)
    setCommune(utilisateur.commune)
    setEdition(false)
  }

  const enregistrer = (e: FormEvent) => {
    e.preventDefault()
    if (!valide) return
    if (!modifie) return setEdition(false)
    const infos = { prenom: prenom.trim(), nom: nom.trim(), commune: commune.trim() }
    if (nouveauNumero) {
      const etat: EtatCode = { ...infos, telephone, nouveauCompte: false, modification: true }
      navigate('/code', { state: etat })
      return
    }
    modifierUtilisateur(infos)
    setEnregistre(true)
    setEdition(false)
  }

  const hebergeur = ressources.includes('heb')

  return (
    <div className="ecran">
      <EnTeteRetour retour="/profil">
        <h1 style={{ fontSize: 21, fontWeight: 800, color: 'var(--bleu-nuit)' }}>Mes informations</h1>
        <span className="texte-doux">Vérifiez-les et corrigez-les à tout moment</span>
      </EnTeteRetour>

      <main className="contenu" style={{ paddingTop: 12 }}>
        {enregistre && !edition && (
          <p role="status" style={{ background: 'var(--bleu-voile)', color: 'var(--bleu-nuit)', borderRadius: 12, padding: '10px 14px', fontSize: 14, fontWeight: 700 }}>
            ✓ Informations enregistrées
          </p>
        )}

        {!edition ? (
          <>
            <dl className="carte" style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Info terme="Prénom" valeur={utilisateur.prenom} />
              <Info terme="Nom" valeur={utilisateur.nom || 'Non renseigné'} vide={!utilisateur.nom} />
              <Info terme="Numéro de mobile" valeur={utilisateur.telephone} />
              <Info terme="Commune" valeur={utilisateur.commune} />
            </dl>
            <button
              type="button"
              className="bouton bouton--clair"
              onClick={() => {
                setEnregistre(false)
                setEdition(true)
              }}
            >
              Modifier mes informations
            </button>
          </>
        ) : (
          <form onSubmit={enregistrer} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={libelle}>
              Prénom
              <input type="text" value={prenom} onChange={(e) => setPrenom(e.target.value)} autoComplete="given-name" maxLength={60} style={champ} />
            </label>
            <label style={libelle}>
              Nom
              <input type="text" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom de famille" autoComplete="family-name" maxLength={60} style={champ} />
            </label>
            <ChampTelephone valeur={telephone} onChange={setTelephone} />
            {nouveauNumero && numeroValide(telephone) && (
              <span className="texte-doux" style={{ marginTop: -6 }}>Un code SMS confirmera ce nouveau numéro.</span>
            )}
            <ChampAdresse
              variante="app"
              commune
              libelleChamp="Ma commune"
              valeurInitiale={utilisateur.commune}
              verifieeInitialement
              onTexte={setCommune}
              onChoix={(r) => r && setCommune(r.libelle)}
            />
            <button type="submit" className="bouton bouton--principal" disabled={!valide || !modifie}>
              {nouveauNumero ? 'Recevoir le code' : 'Enregistrer'}
            </button>
            <button type="button" className="bouton bouton--contour" onClick={annuler}>
              Annuler
            </button>
          </form>
        )}

        <section className="carte" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          <strong style={{ fontSize: 16, color: 'var(--bleu-nuit)' }}>Ce que la mairie voit</strong>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, lineHeight: 1.4 }}>
            <li>Votre nom et votre numéro, pour vous joindre en cas de crise.</li>
            <li>Vos demandes d'aide et leur suivi.</li>
            <li>Si vous êtes volontaire : l'aide que vous proposez et votre disponibilité.</li>
            {hebergeur && (
              <li>
                L'adresse du logement où vous pouvez héberger des sinistrés : {accueil.adresse || 'non renseignée'}. Elle n'est jamais montrée aux
                autres habitants, seulement à la personne que vous acceptez d'accueillir.
              </li>
            )}
          </ul>
          <Link to="/aider" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, fontWeight: 700, textDecoration: 'none' }}>
            Modifier ce que je peux offrir
            <Icone nom="fleche" taille={18} />
          </Link>
        </section>
      </main>
      <BarreNav />
    </div>
  )
}

function Info({ terme, valeur, vide = false }: { terme: string; valeur: string; vide?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <dt className="texte-doux">{terme}</dt>
      <dd style={{ margin: 0, fontSize: 16, fontWeight: vide ? 400 : 700, color: vide ? 'var(--texte-doux)' : 'var(--texte)' }}>{valeur}</dd>
    </div>
  )
}
