import { useCallback, useEffect, useState } from 'react'
import { lienTelephone, serveurMairie as serveur } from '../services/serveur.ts'

type Ligne = {
  id: string
  type: 'protection_civile' | 'entreprise'
  details: Record<string, string>
  statut: 'a_verifier' | 'verifiee' | 'refusee'
  prenom: string
  nom: string
  telephone: string
  created_at: string
}

// Rôles déclarés par les habitants : bénévoles de la protection civile et entreprises sous convention.
// La cellule de crise vérifie (liste de l'association, conventions signées) avant de les mobiliser.
export default function PanneauHabilitations({ communeId }: { communeId: string }) {
  const client = serveur!
  const [lignes, setLignes] = useState<Ligne[] | null>(null)
  const [message, setMessage] = useState('')

  const charger = useCallback(async () => {
    const { data, error } = await client.from('habilitations').select('*').eq('commune_id', communeId).order('created_at')
    // Table absente sur un serveur sans cette fonction : le panneau reste masqué
    setLignes(error ? null : (data as Ligne[]))
  }, [client, communeId])

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    void charger()
    const canal = client
      .channel(`habilitations-mairie-${communeId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habilitations', filter: `commune_id=eq.${communeId}` }, () => void charger())
      .subscribe()
    return () => {
      void client.removeChannel(canal)
    }
  }, [client, communeId, charger])

  if (!lignes) return null

  const decider = async (l: Ligne, statut: 'verifiee' | 'refusee') => {
    const { error } = await client.from('habilitations').update({ statut }).eq('id', l.id)
    setMessage(error ? "Échec : la décision n'a pas été enregistrée." : '')
  }

  const nomComplet = (l: Ligne) => [l.prenom, l.nom].filter(Boolean).join(' ')
  const aVerifier = lignes.filter((l) => l.statut === 'a_verifier')
  const benevoles = lignes.filter((l) => l.type === 'protection_civile' && l.statut === 'verifiee')
  const entreprises = lignes.filter((l) => l.type === 'entreprise' && l.statut === 'verifiee')

  return (
    <section className="mairie-panneau" aria-labelledby="titre-habilitations">
      <h2 id="titre-habilitations">Protection civile et entreprises partenaires</h2>

      {aVerifier.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h3 style={{ fontSize: 15, margin: 0 }}>À vérifier ({aVerifier.length})</h3>
          {aVerifier.map((l) => (
            <div key={l.id} className="mairie-demande" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <strong>
                {l.type === 'protection_civile' ? 'Bénévole protection civile' : 'Entreprise partenaire'} · {l.type === 'entreprise' ? l.details.entreprise : nomComplet(l)}
              </strong>
              <span style={{ fontSize: 14 }}>
                {l.type === 'protection_civile'
                  ? `N° de bénévole ${l.details.numero} · à confirmer auprès de l'association`
                  : `SIRET ${l.details.siret} · contact ${nomComplet(l)} · à confirmer dans les conventions`}
              </span>
              {l.type === 'entreprise' && <span style={{ fontSize: 14 }}>Matériel : {l.details.materiel}</span>}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="mairie-bouton mairie-bouton--principal" onClick={() => void decider(l, 'verifiee')}>
                  Confirmer
                </button>
                <button type="button" className="mairie-bouton" onClick={() => void decider(l, 'refusee')}>
                  Refuser
                </button>
                <a className="mairie-bouton" href={lienTelephone(l.telephone)} style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                  Appeler
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 style={{ fontSize: 15, margin: 0 }}>Bénévoles formés ({benevoles.length})</h3>
      {benevoles.length === 0 ? (
        <p style={{ fontSize: 14 }}>Aucun bénévole confirmé pour l'instant.</p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
          {benevoles.map((l) => (
            <li key={l.id}>
              {nomComplet(l)} · <a href={lienTelephone(l.telephone)}>{l.telephone}</a>
            </li>
          ))}
        </ul>
      )}

      <h3 style={{ fontSize: 15, margin: 0 }}>Matériel des entreprises sous convention ({entreprises.length})</h3>
      {entreprises.length === 0 ? (
        <p style={{ fontSize: 14 }}>Aucune entreprise confirmée pour l'instant.</p>
      ) : (
        entreprises.map((l) => (
          <div key={l.id} className="mairie-demande" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <strong>{l.details.entreprise}</strong>
            <span style={{ fontSize: 14 }}>{l.details.materiel}</span>
            <span style={{ fontSize: 14 }}>
              Contact : {nomComplet(l)} · <a href={lienTelephone(l.telephone)}>{l.telephone}</a>
            </span>
          </div>
        ))
      )}
      {message && (
        <p role="status" style={{ fontSize: 14 }}>
          {message}
        </p>
      )}
    </section>
  )
}
