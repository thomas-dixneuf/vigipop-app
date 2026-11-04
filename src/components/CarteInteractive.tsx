import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Coordonnees } from '../outils/carte.ts'
import type { ZoneRisqueServeur, ZoneServeur } from '../services/serveur.ts'

export type Repere = Coordonnees & {
  id: string
  couleur: string
  titre: string
  // Repère estompé (lieu fermé, demande close)
  attenue?: boolean
}

type Props = {
  reperes: Repere[]
  centre: [number, number]
  position?: Coordonnees | null
  selection?: string | null
  onSelection?: (id: string) => void
  hauteur?: number | string
  // Zones à éviter, en rouge
  zones?: ZoneServeur[]
  // Zones exposées à un risque connu (TIM), en pointillés bleu nuit sous les zones rouges
  zonesRisque?: ZoneRisqueServeur[]
  // Couleur du tracé en cours (rouge : zone à éviter ; bleu nuit : zone de risque)
  couleurTrace?: string
  // Tracé en cours (espace mairie) et clic sur la carte pour l'allonger
  trace?: [number, number][]
  onClicCarte?: (point: [number, number]) => void
}

// Fond OpenStreetMap : gratuit, sans clé ; si les tuiles ne chargent pas (hors ligne),
// la liste des lieux affichée sous la carte reste utilisable.
export default function CarteInteractive({ reperes, centre, position, selection, onSelection, hauteur = 320, zones = [], zonesRisque = [], couleurTrace = '#b42318', trace, onClicCarte }: Props) {
  const conteneur = useRef<HTMLDivElement>(null)
  const carte = useRef<L.Map | null>(null)
  const calque = useRef<L.LayerGroup | null>(null)
  const cadree = useRef(false)
  const clic = useRef(onClicCarte)
  useEffect(() => {
    clic.current = onClicCarte
  }, [onClicCarte])

  useEffect(() => {
    if (!conteneur.current) return
    const instance = L.map(conteneur.current, { zoomControl: true, attributionControl: true }).setView(centre, 14)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(instance)
    calque.current = L.layerGroup().addTo(instance)
    instance.on('click', (e: L.LeafletMouseEvent) => clic.current?.([e.latlng.lat, e.latlng.lng]))
    carte.current = instance
    return () => {
      instance.remove()
      carte.current = null
      cadree.current = false
    }
    // Carte créée une seule fois ; le centre initial ne change pas ensuite
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const instance = carte.current
    const groupe = calque.current
    if (!instance || !groupe) return
    groupe.clearLayers()
    // Les zones d'abord, pour que les repères restent cliquables par-dessus ;
    // les zones de risque (permanentes) sous les zones à éviter (crise en cours)
    for (const z of zonesRisque) {
      L.polygon(z.points, { color: '#0e3a52', weight: 2, dashArray: '6 5', fillColor: '#86ddff', fillOpacity: 0.25 })
        .bindTooltip(`Risque ${z.risque.toLowerCase()} : ${z.nom}`, { sticky: true })
        .addTo(groupe)
    }
    for (const z of zones) {
      L.polygon(z.points, { color: '#b42318', weight: 2, fillColor: '#d92d20', fillOpacity: 0.3 })
        .bindTooltip(`Zone à éviter : ${z.nom}`, { sticky: true })
        .addTo(groupe)
    }
    if (trace && trace.length > 0) {
      L.polyline(trace.length > 2 ? [...trace, trace[0]] : trace, { color: couleurTrace, weight: 2, dashArray: '6 6' }).addTo(groupe)
      for (const p of trace) L.circleMarker(p, { radius: 4, color: couleurTrace, fillOpacity: 1 }).addTo(groupe)
    }
    for (const r of reperes) {
      const choisi = r.id === selection
      const taille = choisi ? 30 : 22
      const icone = L.divIcon({
        className: '',
        html: `<span style="display:block;width:${taille}px;height:${taille}px;border-radius:50%;background:${r.couleur};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);opacity:${r.attenue ? 0.45 : 1}"></span>`,
        iconSize: [taille, taille],
        iconAnchor: [taille / 2, taille / 2],
      })
      L.marker([r.lat, r.lng], { icon: icone, title: r.titre, keyboard: true, zIndexOffset: choisi ? 1000 : 0 })
        .on('click', () => onSelection?.(r.id))
        .addTo(groupe)
    }
    if (position) {
      L.circleMarker([position.lat, position.lng], { radius: 8, color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 })
        .bindTooltip('Vous êtes ici')
        .addTo(groupe)
    }
    // Premier affichage : on cadre tous les repères (et la position) une seule fois.
    // Les zones de risque n'entrent pas dans le cadrage : elles peuvent couvrir toute la commune.
    const points = [
      ...reperes.map((r) => L.latLng(r.lat, r.lng)),
      ...zones.flatMap((z) => z.points.map((p) => L.latLng(p[0], p[1]))),
      ...(position ? [L.latLng(position.lat, position.lng)] : []),
    ]
    if (!cadree.current && points.length > 0) {
      instance.fitBounds(L.latLngBounds(points), { padding: [30, 30], maxZoom: 16 })
      cadree.current = true
    }
  }, [reperes, position, selection, onSelection, zones, zonesRisque, couleurTrace, trace])

  useEffect(() => {
    const r = reperes.find((x) => x.id === selection)
    if (r && carte.current) carte.current.panTo([r.lat, r.lng])
  }, [selection, reperes])

  return (
    <div
      ref={conteneur}
      role="region"
      aria-label="Carte des lieux"
      style={{ cursor: onClicCarte ? 'crosshair' : undefined, height: hauteur, width: '100%', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--bordure)', background: 'var(--bleu-voile)', zIndex: 0 }}
    />
  )
}
