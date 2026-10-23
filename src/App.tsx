import { Navigate, Route, Routes } from 'react-router-dom'
import Accueil from './screens/Accueil.tsx'
import Aider from './screens/Aider.tsx'
import Code from './screens/Code.tsx'
import Connexion from './screens/Connexion.tsx'
import Confirmation from './screens/Confirmation.tsx'
import Lancement from './screens/Lancement.tsx'
import Mission from './screens/Mission.tsx'
import AVenir from './screens/AVenir.tsx'
import Signaler from './screens/Signaler.tsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Lancement />} />
      <Route path="/connexion" element={<Connexion />} />
      <Route path="/code" element={<Code />} />
      {/* Accueil et signalement restent accessibles sans compte : rien ne doit bloquer un appel à l'aide */}
      <Route path="/accueil" element={<Accueil />} />
      <Route path="/signaler" element={<Signaler />} />
      <Route path="/demande" element={<Confirmation />} />
      <Route path="/carte" element={<AVenir titre="Carte" onglet="carte" />} />
      <Route path="/profil" element={<AVenir titre="Mon profil" onglet="profil" />} />
      <Route path="/notifications" element={<AVenir titre="Notifications" />} />
      <Route path="/aider" element={<Aider />} />
      <Route path="/mission" element={<Mission />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
