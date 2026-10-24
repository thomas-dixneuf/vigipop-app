import { useCallback, useEffect, useState } from 'react'
import Icone from './Icone.tsx'
import { lienTelephone, serveur, type AidantServeur, type BesoinEntraide } from '../services/serveur.ts'

const libelles: Record<BesoinEntraide, { recherche: string; trouve: string }> = {
  transport: { recherche: 'Recherche d’un volontaire avec un véhicule', trouve: 'vient vous chercher' },
  materiel: { recherche: 'Recherche d’un volontaire qui a du matériel', trouve: 'vous apporte du matériel' },
}

// Côté personne aidée : où en est la recherche d'un transport ou de matériel, puis qui vient
export default function AidantsTrouves({ demande, besoins }: { demande: string; besoins: BesoinEntraide[] }) {
  const [aidants, setAidants] = useState<AidantServeur[]>([])

  const charger = useCallback(async () => {
    if (!serveur) return
    const { data, error } = await serveur.rpc('mes_aidants', { p_demande: demande })
    if (!error) setAidants(data as AidantServeur[])
  }, [demande])

  useEffect(() => {
    if (!serveur) return
    const client = serveur
    // Chargement initial, puis à chaque réponse d'un volontaire (asynchrone : faux positif du linter)
    // eslint-disable-next-line react/set-state-in-effect
    void charger()
    const canal = client
      .channel(`entraides-${demande}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entraides', filter: `demande_id=eq.${demande}` }, () => void charger())
      .subscribe()
    window.addEventListener('online', charger)
    return () => {
      void client.removeChannel(canal)
      window.removeEventListener('online', charger)
    }
  }, [demande, charger])

  if (!serveur || besoins.length === 0) return null

  return (
    <>
      {besoins.map((b) => {
        const a = aidants.find((x) => x.besoin === b)
        if (a?.statut === 'acceptee')
          return (
            <section key={b} aria-label={`Aide trouvée : ${b}`} className="carte" style={{ display: 'flex', flexDirection: 'column', gap: 10, borderColor: 'var(--bleu)', borderWidth: 2 }}>
              <strong style={{ fontSize: 18, lineHeight: 1.3, color: 'var(--bleu-nuit)' }}>
                {a.prenom || 'Un volontaire'} {libelles[b].trouve}
              </strong>
              {a.telephone && (
                <a href={lienTelephone(a.telephone)} className="bouton bouton--clair" style={{ minHeight: 48, fontSize: 16 }}>
                  <Icone nom="telephone" taille={18} /> Appeler {a.prenom || 'le volontaire'} · {a.telephone}
                </a>
              )}
              <span className="texte-doux" style={{ lineHeight: 1.4 }}>
                Il a reçu votre prénom, votre numéro et votre position. Restez joignable.
              </span>
            </section>
          )
        return (
          <section key={b} role="status" aria-label={`Recherche : ${b}`} className="carte" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--bleu)', flexShrink: 0 }}>
              <Icone nom={b === 'transport' ? 'itineraire' : 'main'} taille={24} />
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <strong style={{ fontSize: 16, color: 'var(--bleu-nuit)' }}>
                {a ? `${b === 'transport' ? 'Un volontaire avec un véhicule' : 'Un volontaire qui a du matériel'} a été contacté` : libelles[b].recherche}
              </strong>
              <span className="texte-doux" style={{ lineHeight: 1.4 }}>
                {a ? 'Il doit confirmer. Son prénom et son numéro s’afficheront ici.' : 'Le plus proche disponible sera sollicité. La mairie suit votre demande.'}
              </span>
            </span>
          </section>
        )
      })}
    </>
  )
}
