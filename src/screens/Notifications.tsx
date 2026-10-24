import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import BarreNav from '../components/BarreNav.tsx'
import EnTeteRetour from '../components/EnTeteRetour.tsx'
import Icone from '../components/Icone.tsx'
import { abonnerPush, demanderAlertes, etatAlertes } from '../outils/alertes.ts'
import { COMMUNE_ID, serveur } from '../services/serveur.ts'
import { useAppState } from '../state/AppState.tsx'

export default function Notifications() {
  const { notifications, marquerNotificationsLues } = useAppState()
  // Les notifications non lues à l'ouverture restent en évidence pendant la visite
  const [nouvelles] = useState(() => new Set(notifications.filter((n) => !n.lue).map((n) => n.cle)))
  const [alertes, setAlertes] = useState(etatAlertes)

  useEffect(() => {
    marquerNotificationsLues()
    // Une seule fois à l'ouverture de l'écran
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activer = async () => {
    const reponse = await demanderAlertes()
    setAlertes(reponse === 'impossible' ? 'impossible' : reponse)
    if (reponse === 'granted' && serveur) void abonnerPush(serveur, COMMUNE_ID)
  }

  return (
    <div className="ecran">
      <EnTeteRetour retour="/accueil">
        <h1 style={{ fontSize: 21, fontWeight: 800, color: 'var(--bleu-nuit)' }}>Notifications</h1>
        <span className="texte-doux">Messages de la mairie et suivi de vos démarches</span>
      </EnTeteRetour>

      <main className="contenu" style={{ paddingTop: 10, gap: 10 }}>
        {alertes === 'default' && (
          <section className="carte" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <strong style={{ fontSize: 16, color: 'var(--bleu-nuit)' }}>Être prévenu sur ce téléphone</strong>
            <span className="texte-doux" style={{ lineHeight: 1.4 }}>
              Recevez une alerte quand la mairie déclenche une crise, change une consigne ou répond à votre demande, même app fermée.
            </span>
            <button type="button" className="bouton bouton--principal" style={{ minHeight: 48, fontSize: 16 }} onClick={() => void activer()}>
              <Icone nom="cloche" taille={18} /> Activer les alertes
            </button>
          </section>
        )}
        {alertes === 'denied' && (
          <p className="carte texte-doux" style={{ lineHeight: 1.4 }}>
            Les alertes sont bloquées pour Vigipop. Pour les recevoir, autorisez les notifications dans les réglages du navigateur ou du téléphone.
          </p>
        )}
        {alertes === 'impossible' && (
          <p className="carte texte-doux" style={{ lineHeight: 1.4 }}>
            Ce navigateur ne permet pas les alertes. Sur iPhone, ajoutez d'abord Vigipop à l'écran d'accueil (Partager → Sur l'écran d'accueil).
          </p>
        )}
        <p className="texte-doux" style={{ fontSize: 13, lineHeight: 1.4 }}>
          Vigipop complète l'alerte officielle FR-Alert, il ne la remplace pas. En cas de danger immédiat, appelez le 112.
        </p>

        {notifications.length === 0 ? (
          <p className="texte-doux" style={{ textAlign: 'center', padding: '24px 0' }}>Aucune notification pour le moment.</p>
        ) : (
          <ul aria-label="Notifications" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notifications.map((n) => {
              const nouvelle = nouvelles.has(n.cle)
              return (
                <li key={n.cle}>
                  <Link
                    to={n.lien}
                    className="carte"
                    style={{
                      textDecoration: 'none',
                      color: 'var(--texte)',
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                      borderLeft: `5px solid ${n.urgente ? 'var(--consigne)' : nouvelle ? 'var(--bleu)' : 'var(--bordure)'}`,
                    }}
                  >
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <strong style={{ fontSize: 15, color: 'var(--bleu-nuit)', fontWeight: nouvelle ? 800 : 700 }}>{n.titre}</strong>
                        <span className="texte-doux" style={{ flexShrink: 0 }}>{n.heure}</span>
                      </span>
                      <span style={{ fontSize: 14, lineHeight: 1.4 }}>{n.texte}</span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </main>
      <BarreNav />
    </div>
  )
}
