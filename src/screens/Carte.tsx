import { useCallback, useEffect, useMemo, useState } from 'react'
import Bandeau112 from '../components/Bandeau112.tsx'
import BarreNav from '../components/BarreNav.tsx'
import CarteInteractive, { type Repere } from '../components/CarteInteractive.tsx'
import Icone from '../components/Icone.tsx'
import { centreCommune, hebergementsSolidairesDemo, libelleLieu, lieuxDemo, zonesDemo } from '../data/fictif.ts'
import { couleurLieu, dansZone, distanceLisible, distanceMetres, estPlace, lienItineraire, type Coordonnees } from '../outils/carte.ts'
import { COMMUNE_ID, serveur, type LieuServeur } from '../services/serveur.ts'
import { useAppState } from '../state/AppState.tsx'

type Filtre = 'tous' | LieuServeur['type']

const filtres: [Filtre, string][] = [
  ['tous', 'Tout'],
  ['accueil', 'Hébergement'],
  ['soins', 'Secours'],
  ['eau', 'Eau'],
]

export default function Carte() {
  const { mode, lieux, zones: zonesServeur } = useAppState()
  const enCrise = mode === 'crise'
  // Démo locale : une zone fictive apparaît quand la crise est simulée
  const zones = zonesServeur ?? (enCrise && !serveur ? zonesDemo : [])
  const [filtre, setFiltre] = useState<Filtre>('tous')
  const [selection, setSelection] = useState<string | null>(null)
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
      void client.rpc('hebergements_solidaires', { p_commune: COMMUNE_ID }).then(({ data, error }) => !error && setSolidaires(data as number))
    charger()
    const minuteur = window.setInterval(charger, 60000)
    return () => window.clearInterval(minuteur)
  }, [enCrise])

  const tous = lieux ?? lieuxDemo
  // En veille, on montre où se trouveront les lieux ; en crise, ouverts d'abord
  const visibles = useMemo(() => {
    const liste = tous.filter((l) => filtre === 'tous' || l.type === filtre)
    const distance = (l: LieuServeur) => (position && estPlace(l) ? distanceMetres(position, l) : Infinity)
    return [...liste].sort((a, b) => Number(b.ouvert) - Number(a.ouvert) || distance(a) - distance(b))
  }, [tous, filtre, position])

  const reperes: Repere[] = useMemo(
    () =>
      visibles.filter(estPlace).map((l) => ({
        id: l.id,
        lat: l.lat,
        lng: l.lng,
        couleur: couleurLieu[l.type],
        titre: `${l.nom} · ${enCrise ? (l.ouvert ? 'ouvert' : 'fermé') : libelleLieu[l.type]}`,
        attenue: enCrise && !l.ouvert,
      })),
    [visibles, enCrise],
  )

  const zoneActuelle = position ? zones.find((z) => dansZone(position, z.points)) : undefined

  const choisir = useCallback((id: string) => {
    setSelection(id)
    document.getElementById(`lieu-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [])

  return (
    <div className="ecran">
      <header style={{ padding: '20px 20px 4px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--bleu-nuit)' }}>Carte</h1>
        <span className="texte-doux">
          {enCrise ? 'Lieux ouverts par la mairie, mis à jour en direct' : 'Lieux prévus par la mairie en cas de crise'}
        </span>
      </header>

      <main className="contenu" style={{ paddingTop: 8, gap: 12 }}>
        <div role="group" aria-label="Filtrer les lieux" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {filtres.map(([id, libelle]) => (
            <button key={id} type="button" className="puce" aria-pressed={filtre === id} onClick={() => setFiltre(id)}>
              {libelle}
            </button>
          ))}
        </div>

        {zoneActuelle && (
          <p role="alert" style={{ background: 'var(--danger)', color: 'var(--blanc)', borderRadius: 14, padding: '12px 14px', fontSize: 15, lineHeight: 1.4 }}>
            <strong>Vous êtes dans une zone à éviter : {zoneActuelle.nom}.</strong>
            {zoneActuelle.consigne ? ` ${zoneActuelle.consigne}` : ''} Éloignez-vous si vous pouvez le faire sans danger.
          </p>
        )}

        <CarteInteractive
          reperes={reperes}
          zones={zones}
          centre={centreCommune}
          position={position}
          selection={selection}
          onSelection={choisir}
          hauteur="42vh"
        />

        {zones.length > 0 && (
          <section aria-label="Zones à éviter" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {zones.map((z) => (
              <div key={z.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, lineHeight: 1.4 }}>
                <span aria-hidden="true" style={{ width: 14, height: 14, marginTop: 3, borderRadius: 3, background: 'rgba(217,45,32,.35)', border: '2px solid #b42318', flexShrink: 0 }} />
                <span>
                  <strong style={{ color: 'var(--danger)' }}>Zone à éviter : {z.nom}</strong>
                  {z.consigne ? <span className="texte-doux"> · {z.consigne}</span> : null}
                </span>
              </div>
            ))}
          </section>
        )}

        {enCrise && solidaires !== null && (
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
