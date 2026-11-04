import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AppStateProvider } from './state/AppState.tsx'
import Presentation from './presentation/Presentation.tsx'
import { commune } from './data/fictif.ts'
import { serveurLocal } from './services/serveur.ts'

// Présentation hors ligne : app habitant et espace mairie reliés (côte à côte ou au choix)
// VITE_VUE=habitant ou mairie : une seule des deux interfaces (lien séparé pour chacune)
// Maquette intégrée dans un cadre qui bloque les fenêtres de confirmation : window.confirm y répond
// « non » instantanément, sans rien afficher. Une réponse en moins de 50 ms ne vient pas d'un humain :
// on la considère comme un « oui » pour que les boutons restent utilisables pendant la démonstration.
if (import.meta.env.VITE_PRESENTATION === '1') {
  const confirmer = window.confirm.bind(window)
  window.confirm = (texte?: string) => {
    const debut = performance.now()
    const reponse = confirmer(texte)
    return reponse || performance.now() - debut < 50
  }
}

const vue = import.meta.env.VITE_VUE as 'habitant' | 'mairie' | undefined
if (vue === 'mairie' && !location.hash.startsWith('#/mairie')) location.replace('#/mairie')
const coteACote = serveurLocal && import.meta.env.VITE_PRESENTATION === '1' && !vue && !location.hash.startsWith('#/mairie')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppStateProvider>
      {coteACote ? (
        <Presentation commune={commune} />
      ) : (
        // HashRouter : fonctionne sur n'importe quel hébergement statique
        <HashRouter>
          <App />
        </HashRouter>
      )}
    </AppStateProvider>
  </StrictMode>,
)
