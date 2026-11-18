import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Bandeau112 from '../components/Bandeau112.tsx'
import BarreNav from '../components/BarreNav.tsx'
import CarteInteractive, { type Repere } from '../components/CarteInteractive.tsx'
import Icone from '../components/Icone.tsx'
import BandeauVille from '../components/BandeauVille.tsx'
import { hebergementsSolidairesDemo, libelleLieu, lieuxDemo, missionsDemo, zonesDemo, zonesRisqueDemo } from '../data/fictif.ts'
import { couleurLieu, dansZone, distanceLisible, distanceMetres, estPlace, lienItineraire, type Coordonnees } from '../outils/carte.ts'
import { serveur, type LieuServeur } from '../services/serveur.ts'
import { useMesTrajets } from '../outils/mesTrajets.ts'
import { useAppState } from '../state/AppState.tsx'

type Filtre = 'tous' | LieuServeur['type']

const filtres: [Filtre, string][] = [
  ['tous', 'Tout'],
  ['accueil', 'Centres d’accueil'],
  ['soins', 'Secours'],
  ['eau', 'Eau'],
]

const aucunLieu: LieuServeur[] = []

export default function Carte() {
  const {
    mode,
    lieux,
    zones: zonesServeur,
    zonesRisque: zonesRisqueServeur,
    missions,
    communeAffichee,
    communeActiveId,
    centreActif,
    communeVisitee,
    demande,
    utilisateur,
    missionServeur,
    mission: reponseMission,
  } = useAppState()
  const enCrise = mode === 'crise'
  // Arrivée depuis une mission acceptée : son point de rendez-vous est mis en avant.
  // En crise, une mission acceptée apparaît de toute façon dans « Mes trajets ».
  const idMission = (useLocation().state as { mission?: string } | null)?.mission
  const mission =
    (idMission ? (serveur ? missions : missionsDemo).find((m) => m.id === idMission) : null) ??
    (enCrise && reponseMission === 'acceptee' ? missionServeur : null) ??
    null
  // Démo locale : une zone fictive apparaît quand la crise est simulée
  const zones = zonesServeur ?? (enCrise && !serveur ? zonesDemo : [])
  // Zones exposées aux risques connus (TIM de la commune) : en veille comme en crise
  const zonesRisque = zonesRisqueServeur ?? (serveur ? [] : zonesRisqueDemo)
  const [filtre, setFiltre] = useState<Filtre>('tous')
  const [selection, setSelection] = useState<string | null>(idMission ? 'trajet-mission' : null)
  const [position, setPosition] = useState<Coordonnees | null>(null)
  const [solidaires, setSolidaires] = useState<number | null>(serveur ? null : hebergementsSolidairesDemo)

  // Position de l'habitant : facultative, la carte fonctionne sans
  useEffect(() => {
    if (!('geolocation' in navigator)) return
    const suivi = navigator.geolocation.watchPosition(
      (p) => setPosition({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 15000 },
    )
    return () => navigator.geolocation.clearWatch(suivi)
  }, [])

  // Hébergement solidaire : un nombre de foyers, jamais d'adresse
  useEffect(() => {
    if (!serveur || !enCrise) return
    const client = serveur
    const charger = () =>
      void client.rpc('hebergements_solidaires', { p_commune: communeActiveId }).then(({ data, error }) => !error && setSolidaires(data as number))
    charger()
    const minuteur = window.setInterval(charger, 60000)
    return () => window.clearInterval(minuteur)
  }, [enCrise, communeActiveId])

  const tous = lieux ?? (serveur ? aucunLieu : lieuxDemo)
  // En veille, on montre où se trouveront les lieux ; en crise, ouverts d'abord
  const visibles = useMemo(() => {
    const liste = tous.filter((l) => filtre === 'tous' || l.type === filtre)
    const distance = (l: LieuServeur) => (position && estPlace(l) ? distanceMetres(position, l) : Infinity)
    return [...liste].sort((a, b) => Number(b.ouvert) - Number(a.ouvert) || distance(a) - distance(b))
  }, [tous, filtre, position])

  // Rendez-vous : adresse placée par la mairie, sinon un lieu de la carte du même nom
  const rendezVous = useMemo(() => {
    if (!mission) return null
    if (mission.lat != null && mission.lng != null) return { lat: mission.lat, lng: mission.lng }
    const lieu = tous.find((l) => estPlace(l) && l.nom.trim().toLowerCase() === mission.lieu.trim().toLowerCase())
    return lieu && estPlace(lieu) ? { lat: lieu.lat, lng: lieu.lng } : null
  }, [mission, tous])
  // Mes trajets : hébergement trouvé, mission acceptée, personnes que j'aide (en crise seulement)
  const trajets = useMesTrajets({
    actif: enCrise,
    demande: demande?.envoyee && demande.statut !== 'close' ? demande.id : null,
    mission,
    rendezVous,
    commune: communeAffichee,
    connecte: !!utilisateur,
  })

  const reperes: Repere[] = useMemo(
    () => [
      ...trajets.flatMap((t) => (t.point ? [{ id: t.id, ...t.point, couleur: '#0e3a52', titre: `${t.bouton} · ${t.titre}` }] : [])),
      ...visibles.filter(estPlace).map((l) => ({
        id: l.id,
        lat: l.lat,
        lng: l.lng,
        couleur: couleurLieu[l.type],
        titre: `${l.nom} · ${enCrise ? (l.ouvert ? 'ouvert' : 'fermé') : libelleLieu[l.type]}`,
        attenue: enCrise && !l.ouvert,
      })),
    ],
    [visibles, enCrise, trajets],
  )

  const zoneActuelle = position ? zones.find((z) => dansZone(position, z.points)) : undefined
  const risquesIci = position ? zonesRisque.filter((z) => dansZone(position, z.points)) : []

  const choisir = useCallback((id: string) => {
    setSelection(id)
    document.getElementById(id.startsWith('trajet-') ? id : `lieu-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [])

  return (
    <div className="ecran">
      <header style={{ padding: '20px 20px 4px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--bleu-nuit)' }}>Carte</h1>
        <span className="texte-doux">
          {enCrise ? 'Secours et lieux ouverts par la mairie, en direct' : 'Secours et lieux prévus par la mairie en cas de crise'}
        </span>
      </header>

      <main className="contenu" style={{ paddingTop: 8, gap: 12 }}>
        {trajets.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="titre-section" style={{ fontSize: 13 }}>Mes trajets</span>
            <div role="group" aria-label="Mes trajets" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {trajets.map((t) => (
                <button key={t.id} type="button" className="puce puce--trajet" aria-pressed={selection === t.id} onClick={() => choisir(t.id)}>
                  <Icone nom={t.type === 'hebergement' ? 'accueil' : t.type === 'mission' ? 'main' : 'itineraire'} taille={16} /> {t.bouton}
                </button>
              ))}
            </div>
            <span className="titre-section" style={{ fontSize: 13, marginTop: 4 }}>Lieux de la mairie</span>
          </div>
        )}
        <div role="group" aria-label="Filtrer les lieux" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {filtres.map(([id, libelle]) => (
            <button key={id} type="button" className="puce" aria-pressed={filtre === id} onClick={() => setFiltre(id)}>
              {libelle}
            </button>
          ))}
        </div>

        <BandeauVille />

        {zoneActuelle && (
          <p role="alert" style={{ background: 'var(--danger)', color: 'var(--blanc)', borderRadius: 14, padding: '12px 14px', fontSize: 15, lineHeight: 1.4 }}>
            <strong>Vous êtes dans une zone à éviter : {zoneActuelle.nom}.</strong>
            {zoneActuelle.consigne ? ` ${zoneActuelle.consigne}` : ''} Éloignez-vous si vous pouvez le faire sans danger.
          </p>
        )}

        {!zoneActuelle && risquesIci.length > 0 && (
          <p className="carte" style={{ background: 'var(--bleu-voile)', fontSize: 15, lineHeight: 1.4 }}>
            <strong style={{ color: 'var(--bleu-nuit)' }}>
              Vous êtes dans une zone exposée : {risquesIci.map((z) => z.risque.toLowerCase()).filter((r, i, t) => t.indexOf(r) === i).join(', ')}.
            </strong>{' '}
            {risquesIci.find((z) => z.consigne)?.consigne ??
              (enCrise ? 'Suivez les consignes de la mairie.' : "Repérez dès maintenant le lieu d'accueil le plus proche.")}
          </p>
        )}

        <CarteInteractive
          reperes={reperes}
          zones={zones}
          zonesRisque={zonesRisque}
          centre={centreActif}
          position={position}
          selection={selection}
          onSelection={choisir}
          hauteur="42vh"
          attenuerRisques={enCrise}
        />

        {trajets.map((t) => (
          <section
            key={t.id}
            id={t.id}
            aria-label={t.bouton}
            className="carte"
            onClick={() => setSelection(t.id)}
            style={{ display: 'flex', flexDirection: 'column', gap: 8, borderColor: 'var(--bleu)', borderWidth: 2, outline: selection === t.id ? '3px solid var(--cyan)' : 'none' }}
          >
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--bleu)', textTransform: 'uppercase', letterSpacing: 0.8 }}>{t.bouton}</span>
            <strong style={{ fontSize: 17, color: 'var(--bleu-nuit)', lineHeight: 1.3 }}>{t.titre}</strong>
            <span style={{ fontSize: 14 }}>
              {t.detail}
              {position && t.point ? ` · à ${distanceLisible(distanceMetres(position, t.point))}` : ''}
            </span>
            {t.itineraire ? (
              <a href={t.itineraire} target="_blank" rel="noreferrer" className="bouton bouton--principal" style={{ minHeight: 48, fontSize: 16 }}>
                <Icone nom="itineraire" taille={18} /> Itinéraire
              </a>
            ) : (
              <span style={{ fontSize: 14, fontWeight: 700 }}>La cellule de crise vous appelle pour vous donner l'adresse.</span>
            )}
            {t.telephone && (
              <a href={`tel:${t.telephone.replace(/[\s.-]/g, '')}`} className="bouton bouton--contour" style={{ minHeight: 44, fontSize: 15 }}>
                Appeler {t.telephone}
              </a>
            )}
            {t.lien && (
              <Link to={t.lien} style={{ textAlign: 'center', fontWeight: 700, minHeight: 44, padding: 10 }}>
                Voir le détail de la mission
              </Link>
            )}
          </section>
        ))}

        {(zones.length > 0 || zonesRisque.length > 0) && (
          <div aria-label="Légende des zones" style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, lineHeight: 1.35 }}>
            {(enCrise || zones.length > 0) && (
              <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span aria-hidden="true" style={{ width: 22, height: 14, borderRadius: 3, background: 'rgba(217,45,32,.45)', border: '2px solid #b42318', flexShrink: 0 }} />
                <span>
                  <strong style={{ color: 'var(--danger)' }}>Rouge plein : zone touchée aujourd’hui</strong>, à éviter (indiquée par la mairie pendant la crise)
                </span>
              </span>
            )}
            {zonesRisque.length > 0 && (
              <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span aria-hidden="true" style={{ width: 22, height: 14, borderRadius: 3, background: 'rgba(134,221,255,.35)', border: '2px dashed #0e3a52', flexShrink: 0 }} />
                <span>
                  <strong style={{ color: 'var(--bleu-nuit)' }}>Pointillés bleus : zone exposée connue</strong>, toute l’année (pas forcément touchée
                  aujourd’hui)
                </span>
              </span>
            )}
            {enCrise && zones.length === 0 && (
              <span className="texte-doux">La mairie n’a pas encore signalé de zone touchée. Suivez ses consignes.</span>
            )}
          </div>
        )}

        {zones.length > 0 && (
          <section aria-label="Zones à éviter" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {zones.map((z) => (
              <div key={z.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, lineHeight: 1.4 }}>
                <span aria-hidden="true" style={{ width: 14, height: 14, marginTop: 3, borderRadius: 3, background: 'rgba(217,45,32,.35)', border: '2px solid #b42318', flexShrink: 0 }} />
                <span>
                  <strong style={{ color: 'var(--danger)' }}>Zone touchée, à éviter : {z.nom}</strong>
                  {z.consigne ? <span className="texte-doux"> · {z.consigne}</span> : null}
                </span>
              </div>
            ))}
          </section>
        )}

        {zonesRisque.length > 0 && (
          <section aria-label="Risques connus de la commune" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {zonesRisque.map((z) => (
              <div key={z.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, lineHeight: 1.4 }}>
                <span aria-hidden="true" style={{ width: 14, height: 14, marginTop: 3, borderRadius: 3, background: 'rgba(134,221,255,.45)', border: '2px dashed #0e3a52', flexShrink: 0 }} />
                <span>
                  <strong style={{ color: 'var(--bleu-nuit)' }}>
                    Zone exposée ({z.risque.toLowerCase()}) : {z.nom}
                  </strong>
                  <span className="texte-doux">
                    {z.consigne ? ` · ${z.consigne}` : ''} · Source : {z.source}
                  </span>
                </span>
              </div>
            ))}
          </section>
        )}

        {enCrise && solidaires !== null && !(communeVisitee && !serveur) && (
          <section className="carte" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--bleu)', flexShrink: 0 }}>
              <Icone nom="accueil" taille={24} />
            </span>
            <span style={{ fontSize: 14, lineHeight: 1.4 }}>
              <strong style={{ color: 'var(--bleu-nuit)' }}>
                Hébergement solidaire : {solidaires} foyer{solidaires > 1 ? 's' : ''} disponible{solidaires > 1 ? 's' : ''}
              </strong>
              <br />
              <span className="texte-doux">
                Des habitants proposent de vous accueillir. Pour leur sécurité, leur adresse n'est pas affichée : demandez un hébergement
                dans « J'ai besoin d'aide », la mairie vous orientera.
              </span>
            </span>
          </section>
        )}

        <section aria-label="Liste des lieux" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visibles.length === 0 && <p className="texte-doux">Aucun lieu de ce type pour le moment.</p>}
          {visibles.map((l) => {
            const metres = position && estPlace(l) ? distanceMetres(position, l) : null
            return (
              <article
                key={l.id}
                id={`lieu-${l.id}`}
                className="carte"
                onClick={() => setSelection(l.id)}
                style={{ display: 'flex', flexDirection: 'column', gap: 8, outline: selection === l.id ? '3px solid var(--cyan)' : 'none', opacity: enCrise && !l.ouvert ? 0.7 : 1 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span aria-hidden="true" style={{ width: 12, height: 12, borderRadius: 6, background: couleurLieu[l.type], flexShrink: 0 }} />
                      <strong style={{ fontSize: 16, color: 'var(--bleu-nuit)' }}>{l.nom}</strong>
                    </span>
                    <span className="texte-doux">
                      {libelleLieu[l.type]}
                      {l.details ? ` · ${l.details}` : ''}
                    </span>
                    {l.adresse && <span style={{ fontSize: 14 }}>{l.adresse}</span>}
                  </div>
                  <span style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {enCrise && (
                      <span style={{ fontSize: 13, fontWeight: 800, color: l.ouvert ? 'var(--bleu)' : 'var(--texte-doux)' }}>{l.ouvert ? 'Ouvert' : 'Fermé'}</span>
                    )}
                    <span className="texte-doux">{metres !== null ? distanceLisible(metres) : l.distance}</span>
                    {l.places !== null && <span className="texte-doux">{l.places} places</span>}
                  </span>
                </div>
                {estPlace(l) && (
                  <a
                    href={lienItineraire(l)}
                    target="_blank"
                    rel="noreferrer"
                    className="bouton bouton--clair"
                    style={{ minHeight: 44, fontSize: 15 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Icone nom="itineraire" taille={18} /> Itinéraire
                  </a>
                )}
              </article>
            )
          })}
        </section>

        {enCrise && <Bandeau112 />}
      </main>
      <BarreNav />
    </div>
  )
}
