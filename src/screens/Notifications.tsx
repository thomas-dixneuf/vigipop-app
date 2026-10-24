import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import BarreNav from '../components/BarreNav.tsx'
import EnTeteRetour from '../components/EnTeteRetour.tsx'
import Icone from '../components/Icone.tsx'
import { abonnerPush, demanderAlertes, etatAlertes } from '../outils/alertes.ts'
import { COMMUNE_ID, serveur } from '../services/serveur.ts'
import { useAppState, type NotificationApp } from '../state/AppState.tsx'

export default function Notifications() {
  const { notifications, marquerNotificationsLues, effacerNotifications } = useAppState()
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
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span className="texte-doux" style={{ fontSize: 13 }}>Balayez une notification pour l'effacer</span>
              <button
                type="button"
                onClick={() => effacerNotifications()}
                style={{ minHeight: 44, padding: '0 12px', border: 'none', background: 'transparent', color: 'var(--bleu)', fontWeight: 700, fontSize: 14 }}
              >
                Tout effacer
              </button>
            </div>
            <ul aria-label="Notifications" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {notifications.map((n) => (
                <LigneNotification key={n.cle} notification={n} nouvelle={nouvelles.has(n.cle)} onEffacer={() => effacerNotifications(n.cle)} />
              ))}
            </ul>
          </>
        )}
      </main>
      <BarreNav />
    </div>
  )
}

// Seuil à partir duquel un balayage efface la notification
const SEUIL = 90

// Une notification : balayer à gauche ou à droite l'efface, la croix fait de même sans geste
function LigneNotification({ notification: n, nouvelle, onEffacer }: { notification: NotificationApp; nouvelle: boolean; onEffacer: () => void }) {
  const [decalage, setDecalage] = useState(0)
  const [glissement, setGlissement] = useState(false)
  const depart = useRef<{ x: number; y: number; horizontal: boolean } | null>(null)
  // Un balayage ne doit pas ouvrir la notification au relâchement
  const aGlisse = useRef(false)

  const relacher = () => {
    if (depart.current?.horizontal) {
      aGlisse.current = true
      if (Math.abs(decalage) > SEUIL) {
        setDecalage(Math.sign(decalage) * window.innerWidth)
        window.setTimeout(onEffacer, 180)
      } else setDecalage(0)
    }
    depart.current = null
    setGlissement(false)
  }

  return (
    <li style={{ position: 'relative', borderRadius: 16, background: 'var(--bordure)', overflow: 'hidden' }}>
      <span
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: decalage < 0 ? 'flex-end' : 'flex-start', padding: '0 18px', fontWeight: 700, color: 'var(--texte)' }}
      >
        Effacer
      </span>
      <Link
        to={n.lien}
        className="carte"
        draggable={false}
        onClick={(e) => {
          if (aGlisse.current) {
            e.preventDefault()
            aGlisse.current = false
          }
        }}
        onPointerDown={(e) => {
          depart.current = { x: e.clientX, y: e.clientY, horizontal: false }
          aGlisse.current = false
        }}
        onPointerMove={(e) => {
          const d = depart.current
          if (!d) return
          const dx = e.clientX - d.x
          const dy = e.clientY - d.y
          if (!d.horizontal) {
            if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
              d.horizontal = true
              setGlissement(true)
              e.currentTarget.setPointerCapture(e.pointerId)
            } else if (Math.abs(dy) > 10) {
              depart.current = null
              return
            } else return
          }
          setDecalage(dx)
        }}
        onPointerUp={relacher}
        onPointerCancel={relacher}
        style={{
          position: 'relative',
          textDecoration: 'none',
          color: 'var(--texte)',
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
          paddingRight: 52,
          touchAction: 'pan-y',
          userSelect: 'none',
          transform: `translateX(${decalage}px)`,
          transition: glissement ? 'none' : 'transform .18s ease-out',
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
      <button
        type="button"
        aria-label={`Effacer la notification : ${n.titre}`}
        onClick={onEffacer}
        style={{
          position: 'absolute',
          top: 4,
          right: 4,
          width: 44,
          height: 44,
          border: 'none',
          background: 'transparent',
          color: 'var(--texte-doux)',
          fontSize: 22,
          transform: `translateX(${decalage}px)`,
          transition: glissement ? 'none' : 'transform .18s ease-out',
        }}
      >
        ×
      </button>
    </li>
  )
}
