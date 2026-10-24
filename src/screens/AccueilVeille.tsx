import { Link, useNavigate } from 'react-router-dom'
import BarreNav from '../components/BarreNav.tsx'
import BoutonDemo from '../components/BoutonDemo.tsx'
import VisiteGuidee from '../components/VisiteGuidee.tsx'
import { useAppState } from '../state/AppState.tsx'
import EnTete from '../components/EnTete.tsx'
import Icone from '../components/Icone.tsx'
import { lieuxDemo, risques as risquesDemo } from '../data/fictif.ts'
import { etatAlertes } from '../outils/alertes.ts'
import { serveur } from '../services/serveur.ts'

export default function AccueilVeille() {
  const navigate = useNavigate()
  const { visiteAFaire, lieux, risques, utilisateur, ressources, offresEnregistrees, apresCrise, repondreApresCrise } = useAppState()
  // Seulement ce que la mairie a renseigné (les exemples fictifs restent pour le mode démo)
  const lieuxAccueil = (serveur ? (lieux ?? []) : lieuxDemo).filter((l) => l.type === 'accueil').slice(0, 2)
  const risquesCommune = serveur ? (risques ?? []) : risquesDemo

  // Préparation : chaque étape vaut autant ; la prochaine non faite est proposée
  const etapes = [
    { faite: !!utilisateur, texte: 'Créez votre compte', lien: '/inscription' },
    { faite: !!utilisateur?.nom?.trim(), texte: 'Complétez vos informations (nom de famille)', lien: '/profil/infos' },
    { faite: offresEnregistrees && ressources.length > 0, texte: 'Indiquez ce que vous pourriez offrir ou prêter', lien: '/aider' },
    { faite: etatAlertes() === 'granted', texte: 'Activez les alertes sur ce téléphone', lien: '/notifications' },
  ]
  const faites = etapes.filter((e) => e.faite).length
  const preparation = Math.round((faites / etapes.length) * 100)
  const prochaine = etapes.find((e) => !e.faite)

  return (
    <div className="ecran">
      {visiteAFaire && <VisiteGuidee />}
      <EnTete />
      <main className="contenu">
        {apresCrise && (
          <section role="alert" className="carte" style={{ display: 'flex', flexDirection: 'column', gap: 10, borderColor: 'var(--bleu)', borderWidth: 2 }}>
            <strong style={{ fontSize: 17, color: 'var(--bleu-nuit)' }}>La crise est terminée. Avez-vous encore besoin d'aide ?</strong>
            <span className="texte-doux" style={{ lineHeight: 1.4 }}>
              Votre demande a été close avec la fin de la crise. Si votre situation n'est pas réglée, dites-le à la mairie.
            </span>
            <button
              type="button"
              className="bouton bouton--principal"
              onClick={() => navigate('/signaler')}
            >
              Oui, mettre à jour ma situation
            </button>
            <button type="button" className="bouton bouton--contour" onClick={() => repondreApresCrise(false)}>
              Non, tout va bien
            </button>
          </section>
        )}

        <section data-visite="alerte" style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bleu-voile)', borderRadius: 16, padding: '14px 16px' }}>
          <span style={{ width: 40, height: 40, borderRadius: 20, background: 'var(--blanc)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bleu)' }}>
            <Icone nom="bouclier" />
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--bleu-nuit)' }}>Aucune alerte en cours</span>
            <span className="texte-doux">Votre mairie vous préviendra ici en cas de crise</span>
          </span>
        </section>

        <Link
          to={prochaine?.lien ?? '/aider'}
          data-visite="preparation"
          style={{ textDecoration: 'none', color: 'var(--blanc)', background: 'var(--bleu)', borderRadius: 20, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 18, fontWeight: 800 }}>Ma préparation</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--cyan)' }}>{preparation} %</span>
          </span>
          <span
            role="progressbar"
            aria-label="Ma préparation"
            aria-valuenow={preparation}
            aria-valuemin={0}
            aria-valuemax={100}
            style={{ display: 'block', height: 8, borderRadius: 4, background: 'var(--bleu-nuit)', overflow: 'hidden' }}
          >
            <span style={{ display: 'block', width: `${preparation}%`, height: 8, background: 'var(--cyan)' }} />
          </span>
          <span style={{ fontSize: 14, color: 'var(--bleu-voile)', lineHeight: 1.4 }}>
            {prochaine ? `Prochaine étape (${faites}/${etapes.length}) : ${prochaine.texte.toLowerCase()} →` : 'Vous êtes prêt. Vous pouvez modifier vos offres à tout moment →'}
          </span>
        </Link>

        {risquesCommune.length > 0 && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 className="titre-section">Les risques de ma commune</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {risquesCommune.map((r) => (
                <span
                  key={r}
                  style={{ minHeight: 44, padding: '0 14px', borderRadius: 22, background: 'var(--blanc)', border: '1px solid var(--bordure)', color: 'var(--bleu-nuit)', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center' }}
                >
                  {r}
                </span>
              ))}
            </div>
          </section>
        )}

        {lieuxAccueil.length > 0 && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 className="titre-section">Lieux d'accueil prévus</h2>
            <div style={{ display: 'flex', gap: 10 }}>
              {lieuxAccueil.map((l) => (
                <Link key={l.id} to="/carte" className="carte" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, textDecoration: 'none', color: 'var(--texte)' }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{l.nom}</span>
                  <span className="texte-doux">{l.adresse || l.distance}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Hors crise, pas de signalement : le 112 reste le bon réflexe */}
        <a
          href="tel:112"
          data-visite="signaler"
          className="carte"
          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, color: 'var(--texte)', fontSize: 14, lineHeight: 1.4 }}
        >
          <Icone nom="telephone" couleur="var(--danger)" epaisseur={2} />
          <span>
            Pas de crise en cours sur votre commune. <strong style={{ color: 'var(--danger)' }}>En cas d'urgence, appelez le 112.</strong>
          </span>
        </a>

        <BoutonDemo />
      </main>
      <BarreNav />
    </div>
  )
}
