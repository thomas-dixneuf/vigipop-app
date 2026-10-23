import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import Logo from '../components/Logo.tsx'
import { serveur } from '../services/serveur.ts'
import TableauDeBord, { type Coordinateur } from './TableauDeBord.tsx'
import './mairie.css'

// Point d'entrée de l'espace mairie (#/mairie) : connexion coordinateur, puis tableau de bord
export default function MairieApp() {
  const [session, setSession] = useState<Session | null>(null)
  const [coordinateur, setCoordinateur] = useState<Coordinateur | null | 'refuse'>(null)
  const [pret, setPret] = useState(false)

  useEffect(() => {
    if (!serveur) return
    const client = serveur
    void client.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setPret(true)
    })
    const { data } = client.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  // Un compte n'est coordinateur que s'il figure dans la table coordinateurs
  useEffect(() => {
    if (!serveur || !session || session.user.is_anonymous) return
    let annule = false
    void serveur
      .from('coordinateurs')
      .select('nom, commune_id, communes(nom)')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (annule) return
        if (!data) return setCoordinateur('refuse')
        const commune = data.communes as unknown as { nom: string } | null
        setCoordinateur({ nom: data.nom, communeId: data.commune_id, communeNom: commune?.nom ?? '' })
      })
    return () => {
      annule = true
    }
  }, [session])

  if (!serveur) {
    return (
      <Cadre>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--bleu-nuit)' }}>Serveur non configuré</h1>
        <p style={{ lineHeight: 1.5 }}>
          L'espace mairie a besoin du serveur Supabase. Renseignez <code>VITE_SUPABASE_URL</code> et{' '}
          <code>VITE_SUPABASE_ANON_KEY</code> (voir <code>.env.example</code>).
        </p>
      </Cadre>
    )
  }

  if (!pret) return null
  if (!session || session.user.is_anonymous) return <ConnexionMairie />

  if (coordinateur === 'refuse') {
    return (
      <Cadre>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--bleu-nuit)' }}>Accès réservé aux coordinateurs</h1>
        <p style={{ lineHeight: 1.5 }}>Ce compte n'est rattaché à aucune commune. Demandez à l'équipe Vigipop de l'ajouter.</p>
        <button type="button" className="mairie-bouton" onClick={() => void serveur!.auth.signOut()}>
          Se déconnecter
        </button>
      </Cadre>
    )
  }
  if (!coordinateur) return null

  return <TableauDeBord coordinateur={coordinateur} />
}

function Cadre({ children }: { children: React.ReactNode }) {
  return (
    <div className="mairie" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="mairie-panneau" style={{ width: 'min(440px, 100%)', gap: 16, padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Logo taille={48} />
          <span style={{ fontWeight: 800, color: 'var(--bleu-nuit)' }}>Vigipop · Espace mairie</span>
        </div>
        {children}
      </div>
    </div>
  )
}

function ConnexionMairie() {
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  const connecter = async (e: FormEvent) => {
    e.preventDefault()
    setEnvoi(true)
    setErreur('')
    const { error } = await serveur!.auth.signInWithPassword({ email: email.trim(), password: motDePasse })
    setEnvoi(false)
    if (error) setErreur('E-mail ou mot de passe incorrect.')
  }

  return (
    <Cadre>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--bleu-nuit)' }}>Connexion coordinateur</h1>
      <form onSubmit={connecter} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontWeight: 700, fontSize: 14 }}>
          E-mail
          <input className="mairie-champ" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontWeight: 700, fontSize: 14 }}>
          Mot de passe
          <input className="mairie-champ" type="password" autoComplete="current-password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} required />
        </label>
        {erreur && (
          <p role="alert" style={{ color: 'var(--danger)', fontSize: 14 }}>
            {erreur}
          </p>
        )}
        <button type="submit" className="mairie-bouton mairie-bouton--principal" disabled={envoi}>
          {envoi ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
      <Link to="/" style={{ fontSize: 14 }}>
        Retour à l'app habitants
      </Link>
    </Cadre>
  )
}
