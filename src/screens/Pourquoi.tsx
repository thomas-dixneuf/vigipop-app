import type { ReactNode } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'

const etapes: { titre: string; texte: string; illustration: ReactNode }[] = [
  {
    titre: 'En pleine crise, chaque minute compte',
    texte:
      "Lors d'une inondation ou d'une tempête, votre mairie doit savoir vite qui a besoin d'aide, et où. Avec Vigipop, vous lui transmettez votre situation en 30 secondes.",
    illustration: (
      <svg width="220" height="220" viewBox="0 0 240 240" role="img" aria-label="Une horloge : chaque minute compte">
        <circle cx="120" cy="120" r="110" fill="#B2D8DE" />
        <circle cx="120" cy="120" r="70" fill="#1B5B7A" />
        <circle cx="120" cy="120" r="56" fill="none" stroke="#86DDFF" strokeWidth="6" />
        <path d="M120 82v40l26 16" fill="none" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="198" cy="56" r="12" fill="#1B5B7A" />
        <circle cx="40" cy="190" r="8" fill="#1B5B7A" />
      </svg>
    ),
  },
  {
    titre: 'Vos voisins sont la première aide',
    texte:
      "Héberger une famille, prêter une pompe, conduire quelqu'un : la solidarité existe déjà. Vigipop aide votre commune à l'organiser, pour que l'aide arrive au bon endroit.",
    illustration: (
      <svg width="220" height="220" viewBox="0 0 240 240" role="img" aria-label="Des voisins qui s'entraident">
        <circle cx="120" cy="120" r="110" fill="#B2D8DE" />
        <circle cx="82" cy="98" r="22" fill="#1B5B7A" />
        <path d="M44 170a38 38 0 0 1 76 0z" fill="#1B5B7A" />
        <circle cx="158" cy="98" r="22" fill="#0E3A52" />
        <path d="M120 170a38 38 0 0 1 76 0z" fill="#0E3A52" />
        <path d="M120 66c-6-10-22-8-22 4 0 10 22 22 22 22s22-12 22-22c0-12-16-14-22-4z" fill="#86DDFF" />
      </svg>
    ),
  },
  {
    titre: 'Préparé avant, utile pendant',
    texte:
      "Indiquez dès aujourd'hui ce que vous pourriez offrir. Le jour où une catastrophe frappe, votre commune sait déjà sur qui compter. Vigipop ne remplace jamais les secours : en danger, appelez le 112.",
    illustration: (
      <svg width="220" height="220" viewBox="0 0 240 240" role="img" aria-label="Un bouclier : préparé à l'avance">
        <circle cx="120" cy="120" r="110" fill="#B2D8DE" />
        <path d="M120 52l52 20v40c0 36-26 60-52 72-26-12-52-36-52-72V72z" fill="#1B5B7A" />
        <path d="m96 120 16 16 32-34" fill="none" stroke="#86DDFF" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

export default function Pourquoi() {
  const numero = Number(useParams().etape)
  if (!(numero >= 1 && numero <= etapes.length)) return <Navigate to="/pourquoi/1" replace />

  const etape = etapes[numero - 1]
  const derniere = numero === etapes.length

  return (
    <div className="ecran" style={{ padding: '24px 24px calc(32px + env(safe-area-inset-bottom))' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--texte-doux)' }}>
          {numero} / {etapes.length}
        </span>
        {!derniere && (
          <Link to="/accueil" style={{ fontSize: 15, fontWeight: 700, minHeight: 44, display: 'flex', alignItems: 'center' }}>
            Passer
          </Link>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 240 }}>{etape.illustration}</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.2, color: 'var(--bleu-nuit)' }}>{etape.titre}</h1>
        <p style={{ fontSize: 16, lineHeight: 1.55, color: '#3d5563' }}>{etape.texte}</p>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }} aria-hidden="true">
        {etapes.map((_, i) => (
          <span
            key={i}
            style={{ width: i + 1 === numero ? 28 : 8, height: 8, borderRadius: 4, background: i + 1 === numero ? 'var(--bleu)' : 'var(--bleu-clair)' }}
          />
        ))}
      </div>
      <Link to={derniere ? '/accueil' : `/pourquoi/${numero + 1}`} className="bouton bouton--principal">
        {derniere ? "Découvrir l'application" : 'Suivant'}
      </Link>
    </div>
  )
}
