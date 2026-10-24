import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import BarreNav from '../components/BarreNav.tsx'
import ChampTelephone from '../components/ChampTelephone.tsx'
import EnTeteRetour from '../components/EnTeteRetour.tsx'
import Icone from '../components/Icone.tsx'
import { champ, libelle, numeroValide, type EtatCode } from '../outils/formulaire.ts'
import { useAppState } from '../state/AppState.tsx'

const chiffres = (numero: string) => numero.replace(/[\s.-]/g, '')

// Informations personnelles : les vérifier et les corriger. Un nouveau numéro se confirme par code SMS.
export default function MesInfos() {
  const navigate = useNavigate()
  const retourDuCode = !!(useLocation().state as { enregistre?: boolean } | null)?.enregistre
  const { utilisateur, ressources, accueil, communeAffichee, modifierUtilisateur } = useAppState()
  const [prenom, setPrenom] = useState(utilisateur?.prenom ?? '')
  const [telephone, setTelephone] = useState(utilisateur?.telephone ?? '')
  const [commune, setCommune] = useState(utilisateur?.commune ?? '')
  const [enregistre, setEnregistre] = useState(retourDuCode)

  if (!utilisateur) return null

  const nouveauNumero = chiffres(telephone) !== chiffres(utilisateur.telephone)
  const modifie = nouveauNumero || prenom.trim() !== utilisateur.prenom || commune.trim() !== utilisateur.commune
  const valide = prenom.trim() !== '' && numeroValide(telephone)

  const enregistrer = (e: FormEvent) => {
    e.preventDefault()
    if (!valide || !modifie) return
    const infos = { prenom: prenom.trim(), commune: commune.trim() || communeAffichee }
    if (nouveauNumero) {
      const etat: EtatCode = { ...infos, telephone, nouveauCompte: false, modification: true }
      navigate('/code', { state: etat })
      return
    }
    modifierUtilisateur(infos)
    setCommune(infos.commune)
    setEnregistre(true)
  }

  const hebergeur = ressources.includes('heb')

  return (
    <div className="ecran">
      <EnTeteRetour retour="/profil">
        <h1 style={{ fontSize: 21, fontWeight: 800, color: 'var(--bleu-nuit)' }}>Mes informations</h1>
        <span className="texte-doux">Vérifiez-les et corrigez-les à tout moment</span>
      </EnTeteRetour>

      <form onSubmit={enregistrer} className="contenu" style={{ paddingTop: 12 }}>
        {enregistre && !modifie && (
          <p role="status" style={{ background: 'var(--bleu-voile)', color: 'var(--bleu-nuit)', borderRadius: 12, padding: '10px 14px', fontSize: 14, fontWeight: 700 }}>
            ✓ Informations enregistrées
          </p>
        )}
        <label style={libelle}>
          Prénom
          <input type="text" value={prenom} onChange={(e) => setPrenom(e.target.value)} autoComplete="given-name" style={champ} />
        </label>
        <ChampTelephone valeur={telephone} onChange={setTelephone} />
        {nouveauNumero && numeroValide(telephone) && (
          <span className="texte-doux" style={{ marginTop: -6 }}>Un code SMS confirmera ce nouveau numéro.</span>
        )}
        <label style={libelle}>
          Ma commune
          <input type="text" value={commune} onChange={(e) => setCommune(e.target.value)} placeholder={communeAffichee} autoComplete="address-level2" style={champ} />
        </label>

        <button type="submit" className="bouton bouton--principal" disabled={!valide || !modifie}>
          {nouveauNumero ? 'Recevoir le code' : 'Enregistrer'}
        </button>

        <section className="carte" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          <strong style={{ fontSize: 16, color: 'var(--bleu-nuit)' }}>Ce que la mairie voit</strong>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, lineHeight: 1.4 }}>
            <li>Votre prénom et votre numéro, pour vous joindre en cas de crise.</li>
            <li>Vos demandes d'aide et leur suivi.</li>
            <li>Si vous êtes volontaire : l'aide que vous proposez et votre disponibilité.</li>
            {hebergeur && (
              <li>
                Votre adresse d'accueil ({accueil.adresse || 'non renseignée'}). Elle n'est jamais montrée aux autres habitants, seulement à la personne que vous acceptez d'héberger.
              </li>
            )}
          </ul>
          <Link to="/aider" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, fontWeight: 700, textDecoration: 'none' }}>
            Modifier ce que je peux offrir
            <Icone nom="fleche" taille={18} />
          </Link>
        </section>
      </form>
      <BarreNav />
    </div>
  )
}
