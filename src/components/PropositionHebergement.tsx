import { useCallback, useEffect, useState } from 'react'
import Icone from './Icone.tsx'
import { lienTelephone, serveur, type PropositionHebergementServeur, type StatutHebergement } from '../services/serveur.ts'
import { useAppState } from '../state/AppState.tsx'

// Côté hébergeur : la mairie propose d'accueillir une famille, l'hébergeur accepte ou refuse.
// Les coordonnées de la personne n'apparaissent qu'après l'accord.
export default function PropositionHebergement() {
  const { utilisateur, mode } = useAppState()
  const [propositions, setPropositions] = useState<PropositionHebergementServeur[]>([])
  const [erreur, setErreur] = useState('')
  const actif = !!serveur && !!utilisateur && mode === 'crise'

  const charger = useCallback(async () => {
    if (!serveur) return
    const { data, error } = await serveur.rpc('mes_propositions_hebergement')
    if (!error) setPropositions(data as PropositionHebergementServeur[])
  }, [])

  useEffect(() => {
    if (!actif || !serveur) return
    const client = serveur
    let canal: ReturnType<typeof client.channel> | null = null
    let annule = false
    void client.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id
      if (!uid || annule) return
      void charger()
      canal = client
        .channel(`hebergeur-${uid}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'hebergements', filter: `hebergeur=eq.${uid}` }, () => void charger())
        .subscribe()
    })
    const auRetour = () => document.visibilityState === 'visible' && void charger()
    document.addEventListener('visibilitychange', auRetour)
    return () => {
      annule = true
      if (canal) void client.removeChannel(canal)
      document.removeEventListener('visibilitychange', auRetour)
    }
  }, [actif, charger])

  const repondre = async (id: string, statut: StatutHebergement) => {
    if (!serveur) return
    setErreur('')
    const { error } = await serveur.from('hebergements').update({ statut }).eq('id', id)
    if (error) setErreur("Réponse non envoyée. Vérifiez le réseau et réessayez, ou appelez la mairie.")
    void charger()
  }

  if (!actif || propositions.length === 0) return null

  return (
    <>
      {propositions.map((p) => {
        const nb = `${p.personnes} personne${p.personnes > 1 ? 's' : ''}`
        return (
          <section
            key={p.id}
            aria-label="Demande d'hébergement"
            className="carte"
            style={{ display: 'flex', flexDirection: 'column', gap: 10, borderColor: 'var(--bleu)', borderWidth: 2 }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 800, color: 'var(--bleu)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
              <Icone nom="accueil" taille={16} epaisseur={2.4} />
              {p.statut === 'acceptee' ? 'Vous hébergez' : 'Demande de la mairie'}
            </span>
            {p.statut === 'proposee' ? (
              <>
                <strong style={{ fontSize: 18, lineHeight: 1.3, color: 'var(--bleu-nuit)' }}>
                  Pouvez-vous accueillir {nb} sinistrée{p.personnes > 1 ? 's' : ''} chez vous ?
                </strong>
                {p.personne_vulnerable && <span style={{ fontSize: 14 }}>Dont une personne vulnérable.</span>}
                <span className="texte-doux" style={{ lineHeight: 1.4 }}>
                  Si vous acceptez, la personne recevra votre prénom, votre adresse et votre numéro, et vous recevrez les siens.
                </span>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    className="bouton"
                    style={{ flex: 1, border: '2px solid var(--bordure)', background: 'var(--blanc)', color: 'var(--texte)', fontWeight: 700, fontSize: 16 }}
                    onClick={() => void repondre(p.id, 'refusee')}
                  >
                    Je ne peux pas
                  </button>
                  <button type="button" className="bouton bouton--principal" style={{ flex: 1.4 }} onClick={() => void repondre(p.id, 'acceptee')}>
                    J'accepte
                  </button>
                </div>
              </>
            ) : (
              <>
                <strong style={{ fontSize: 18, lineHeight: 1.3, color: 'var(--bleu-nuit)' }}>
                  {p.prenom || 'La personne'} et ses proches arrivent chez vous ({nb})
                </strong>
                {p.telephone ? (
                  <a href={lienTelephone(p.telephone)} className="bouton bouton--clair" style={{ minHeight: 48, fontSize: 16 }}>
                    <Icone nom="telephone" taille={18} /> Appeler {p.prenom || 'la personne'} · {p.telephone}
                  </a>
                ) : (
                  <span className="texte-doux">Aucun numéro laissé : la mairie vous tiendra au courant.</span>
                )}
                <button
                  type="button"
                  className="bouton bouton--contour"
                  style={{ minHeight: 48, fontSize: 15 }}
                  onClick={() => window.confirm("Annuler l'hébergement ? La mairie cherchera une autre solution.") && void repondre(p.id, 'annulee')}
                >
                  Je ne peux plus accueillir
                </button>
              </>
            )}
            {erreur && (
              <p role="alert" style={{ color: 'var(--danger)', fontSize: 14 }}>
                {erreur}
              </p>
            )}
          </section>
        )
      })}
    </>
  )
}
