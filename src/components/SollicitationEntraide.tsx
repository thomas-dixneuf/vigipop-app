import { useCallback, useEffect, useState } from 'react'
import Icone from './Icone.tsx'
import { lienTelephone, serveur, type SollicitationServeur, type StatutHebergement } from '../services/serveur.ts'
import { useAppState } from '../state/AppState.tsx'

const titres = {
  transport: { question: 'Pouvez-vous transporter', accepte: 'Vous transportez' },
  materiel: { question: 'Pouvez-vous apporter du matériel à', accepte: 'Vous apportez du matériel à' },
}

// Lien d'itinéraire en voiture vers la personne : coordonnées « lat, lng » ou adresse saisie
function itineraire(lieu: string) {
  const destination = /^\s*-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?\s*$/.test(lieu) ? lieu.replace(/\s/g, '') : encodeURIComponent(lieu)
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`
}

// Côté volontaire : un habitant proche a besoin d'un transport ou de matériel, le volontaire accepte ou refuse.
// Avant l'accord : seulement la distance. Après : prénom, numéro et lieu de la personne.
export default function SollicitationEntraide() {
  const { utilisateur, mode } = useAppState()
  const [sollicitations, setSollicitations] = useState<SollicitationServeur[]>([])
  const [erreur, setErreur] = useState('')
  const actif = !!serveur && !!utilisateur && mode === 'crise'

  const charger = useCallback(async () => {
    if (!serveur) return
    const { data, error } = await serveur.rpc('mes_entraides')
    if (!error) setSollicitations(data as SollicitationServeur[])
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
        .channel(`aidant-${uid}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'entraides', filter: `aidant=eq.${uid}` }, () => void charger())
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
    const { error } = await serveur.from('entraides').update({ statut }).eq('id', id)
    if (error) setErreur('Réponse non envoyée. Vérifiez le réseau et réessayez, ou appelez la mairie.')
    void charger()
  }

  if (!actif || sollicitations.length === 0) return null

  return (
    <>
      {sollicitations.map((s) => {
        const nb = `${s.personnes} personne${s.personnes > 1 ? 's' : ''}`
        const titre = titres[s.besoin]
        return (
          <section
            key={s.id}
            aria-label={s.besoin === 'transport' ? 'Demande de transport' : 'Demande de matériel'}
            className="carte"
            style={{ display: 'flex', flexDirection: 'column', gap: 10, borderColor: 'var(--bleu)', borderWidth: 2 }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 800, color: 'var(--bleu)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
              <Icone nom={s.besoin === 'transport' ? 'itineraire' : 'main'} taille={16} epaisseur={2.4} />
              {s.statut === 'acceptee' ? (s.besoin === 'transport' ? 'Transport accepté' : 'Matériel accepté') : 'Un habitant proche a besoin de vous'}
            </span>
            {s.statut === 'proposee' ? (
              <>
                <strong style={{ fontSize: 18, lineHeight: 1.3, color: 'var(--bleu-nuit)' }}>
                  {titre.question} {s.besoin === 'transport' ? nb : `un foyer de ${nb}`} ?
                </strong>
                <span style={{ fontSize: 14 }}>
                  {s.distance_km !== null ? `À environ ${String(s.distance_km).replace('.', ',')} km de vous.` : 'Distance inconnue.'}
                  {s.personne_vulnerable ? ' Dont une personne vulnérable.' : ''}
                </span>
                <span className="texte-doux" style={{ lineHeight: 1.4 }}>
                  Si vous acceptez, vous recevrez le prénom, le numéro et le lieu de la personne, et elle recevra votre prénom et votre numéro.
                </span>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    className="bouton"
                    style={{ flex: 1, border: '2px solid var(--bordure)', background: 'var(--blanc)', color: 'var(--texte)', fontWeight: 700, fontSize: 16 }}
                    onClick={() => void repondre(s.id, 'refusee')}
                  >
                    Je ne peux pas
                  </button>
                  <button type="button" className="bouton bouton--principal" style={{ flex: 1.4 }} onClick={() => void repondre(s.id, 'acceptee')}>
                    J'accepte
                  </button>
                </div>
              </>
            ) : (
              <>
                <strong style={{ fontSize: 18, lineHeight: 1.3, color: 'var(--bleu-nuit)' }}>
                  {titre.accepte} {s.prenom || 'la personne'} ({nb})
                </strong>
                {s.lieu && (
                  <a href={itineraire(s.lieu)} target="_blank" rel="noreferrer" className="bouton bouton--principal" style={{ minHeight: 48, fontSize: 16 }}>
                    <Icone nom="itineraire" taille={18} /> Itinéraire jusqu'à {s.prenom || 'la personne'}
                  </a>
                )}
                {s.telephone ? (
                  <a href={lienTelephone(s.telephone)} className="bouton bouton--clair" style={{ minHeight: 48, fontSize: 16 }}>
                    <Icone nom="telephone" taille={18} /> Appeler {s.prenom || 'la personne'} · {s.telephone}
                  </a>
                ) : (
                  <span className="texte-doux">Aucun numéro laissé : la mairie vous tiendra au courant.</span>
                )}
                <span className="texte-doux" style={{ lineHeight: 1.4 }}>
                  Ne prenez la route que si c'est sans danger. Évitez les zones en rouge sur la carte.
                </span>
                <button
                  type="button"
                  className="bouton bouton--contour"
                  style={{ minHeight: 48, fontSize: 15 }}
                  onClick={() => window.confirm('Vous désister ? Un autre volontaire sera sollicité.') && void repondre(s.id, 'annulee')}
                >
                  Je ne peux plus y aller
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
