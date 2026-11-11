import type { ReactNode } from 'react'
import { positionsDemo } from '../data/fictif.ts'
import { serveur, serveurLocal } from '../services/serveur.ts'
import { useAppState } from '../state/AppState.tsx'
import Icone from './Icone.tsx'

const petitBouton = {
  alignSelf: 'flex-start',
  minHeight: 44,
  padding: '0 14px',
  borderRadius: 22,
  border: '2px solid var(--bleu)',
  background: 'var(--blanc)',
  color: 'var(--bleu)',
  fontSize: 14,
  fontWeight: 700,
} as const

// Services de la ville où l'on se trouve : proposition d'activer la localisation, ville visitée,
// ou zone sans Vigipop. proposer : petit bouton de rappel tant que la localisation est coupée.
export default function BandeauVille({ proposer = false }: { proposer?: boolean }) {
  const { geoloc, activerGeoloc, localisation, localiser, communeVisitee, horsCouverture, revenirMaCommune, demande } = useAppState()

  if (!geoloc) {
    if (!proposer) return null
    // Petit rappel, tant que la localisation n'est pas activée (le détail est dans le profil)
    return (
      <button
        type="button"
        onClick={() => activerGeoloc(true)}
        aria-label="En visite dans une autre ville ? Activer la localisation pour voir ses services Vigipop"
        style={{
          alignSelf: 'flex-start',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minHeight: 44,
          padding: '0 14px',
          borderRadius: 22,
          border: '1px solid var(--bordure)',
          background: 'var(--blanc)',
          color: 'var(--bleu-nuit)',
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        <Icone nom="pin" taille={16} />
        En visite ailleurs ? <span style={{ color: 'var(--bleu)', textDecoration: 'underline' }}>Activer la localisation</span>
      </button>
    )
  }

  // Mode démo : on ne se déplace pas pendant une présentation, on simule le trajet
  // (chez soi → ville voisine équipée → ville sans Vigipop → chez soi)
  const suivante = positionsDemo[communeVisitee ? 2 : horsCouverture ? 0 : 1]
  // Maquette de présentation (serveur local) : même simulation, libellé sans « Démo »
  const simuler = (!serveur || serveurLocal) && (
    <button
      type="button"
      style={{ ...petitBouton, border: '1px dashed var(--texte-doux)', color: 'var(--texte-doux)', fontSize: 13 }}
      onClick={() => localiser(suivante.position)}
    >
      {serveurLocal ? 'Simuler un déplacement : ' : 'Démo : '}
      {suivante.libelle}
    </button>
  )

  let texte: ReactNode = null
  if (localisation === 'en-cours') texte = 'Recherche de la ville où vous êtes…'
  else if (localisation === 'refusee')
    texte = "Localisation refusée sur ce téléphone : Vigipop affiche votre commune. Autorisez-la dans les réglages pour voir les services des villes que vous visitez."
  else if (localisation === 'indisponible') texte = 'Position introuvable pour le moment : Vigipop affiche votre commune.'
  else if (communeVisitee)
    texte = (
      <>
        <strong style={{ color: 'var(--bleu-nuit)' }}>Vous êtes à {communeVisitee.nom}.</strong> Vigipop affiche ses lieux d'accueil, ses
        risques et ses alertes.
      </>
    )
  else if (horsCouverture)
    texte = (
      <>
        <strong style={{ color: 'var(--bleu-nuit)' }}>Cette ville n'utilise pas encore Vigipop.</strong> Dès que vous entrerez dans une
        commune équipée, ses services s'afficheront ici. En cas d'urgence, appelez le <a href="tel:112">112</a>.
      </>
    )
  // Une demande d'aide en cours reste suivie par sa commune : pas de changement de ville
  else if (demande && demande.statut !== 'close') texte = null

  if (!texte && !simuler) return null
  return (
    <section
      aria-live="polite"
      className="carte"
      style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--bleu-voile)', fontSize: 14, lineHeight: 1.4 }}
    >
      {texte && <span>{texte}</span>}
      {communeVisitee && !localisation && (
        <button type="button" style={petitBouton} onClick={revenirMaCommune}>
          Revenir à ma commune
        </button>
      )}
      {simuler}
    </section>
  )
}
