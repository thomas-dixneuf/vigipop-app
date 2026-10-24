import { useEffect, useState } from 'react'
import { serveur } from '../services/serveur.ts'

const base64Url = (octets: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(octets)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

// Paire de clés VAPID créée dans ce navigateur : rien n'est envoyé nulle part.
// La clé privée se colle ensuite dans les secrets Supabase (voir docs/NOTIFICATIONS.md).
async function genererCles() {
  const paire = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
  const publique = await crypto.subtle.exportKey('raw', paire.publicKey)
  const privee = await crypto.subtle.exportKey('jwk', paire.privateKey)
  return { publique: base64Url(publique), privee: privee.d ?? '' }
}

// Réglage des alertes push : état de la configuration et création des clés
export default function PanneauPush() {
  const [etat, setEtat] = useState<'verification' | 'actif' | 'a-configurer'>('verification')
  const [cles, setCles] = useState<{ publique: string; privee: string } | null>(null)

  useEffect(() => {
    void serveur!.functions
      .invoke<{ cle_publique: string }>('envoyer-push', { method: 'GET' })
      .then(({ data, error }) => setEtat(!error && data?.cle_publique ? 'actif' : 'a-configurer'))
  }, [])

  return (
    <section className="mairie-panneau" aria-labelledby="titre-push">
      <h2 id="titre-push">Alertes sur les téléphones</h2>
      {etat === 'verification' && <p className="texte-doux">Vérification…</p>}
      {etat === 'actif' && (
        <p style={{ fontSize: 14 }}>
          <span className="mairie-etiquette mairie-etiquette--ok">✓ Actives</span> Les habitants qui ont activé les alertes sont prévenus même app fermée.
        </p>
      )}
      {etat === 'a-configurer' && (
        <>
          <p style={{ fontSize: 14, lineHeight: 1.5 }}>
            Les alertes app fermée ne sont pas encore configurées. Les habitants sont prévenus seulement quand l'app est ouverte. Suivez le
            guide <code>docs/NOTIFICATIONS.md</code>.
          </p>
          {!cles ? (
            <button type="button" className="mairie-bouton" style={{ alignSelf: 'flex-start' }} onClick={() => void genererCles().then(setCles)}>
              Générer les clés (étape 2 du guide)
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              <Cle nom="VAPID_PUBLIC_KEY" valeur={cles.publique} />
              <Cle nom="VAPID_PRIVATE_KEY" valeur={cles.privee} />
              <p style={{ color: 'var(--urgence-fonce)', fontWeight: 700 }}>
                Clé privée : à coller uniquement dans Supabase (Edge Functions → Secrets). Ne l'envoyez à personne, pas même à Claude.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function Cle({ nom, valeur }: { nom: string; valeur: string }) {
  const [copiee, setCopiee] = useState(false)
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontWeight: 700 }}>
      {nom}
      <span style={{ display: 'flex', gap: 6 }}>
        <input className="mairie-champ" readOnly value={valeur} style={{ flex: 1, fontFamily: 'monospace', fontSize: 12 }} onFocus={(e) => e.target.select()} />
        <button
          type="button"
          className="mairie-bouton"
          onClick={() => void navigator.clipboard.writeText(valeur).then(() => setCopiee(true))}
        >
          {copiee ? 'Copiée' : 'Copier'}
        </button>
      </span>
    </label>
  )
}
