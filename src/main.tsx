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
const coteACote = serveurLocal && import.meta.env.VITE_PRESENTATION === '1' && !location.hash.startsWith('#/mairie')

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
