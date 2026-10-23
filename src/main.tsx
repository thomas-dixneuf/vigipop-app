import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AppStateProvider } from './state/AppState.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppStateProvider>
      {/* HashRouter : fonctionne sur n'importe quel hébergement statique */}
      <HashRouter>
        <App />
      </HashRouter>
    </AppStateProvider>
  </StrictMode>,
)
