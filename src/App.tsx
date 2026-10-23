import { Navigate, Route, Routes } from 'react-router-dom'
import Accueil from './screens/Accueil.tsx'
import Confirmation from './screens/Confirmation.tsx'
import Lancement from './screens/Lancement.tsx'
import AVenir from './screens/AVenir.tsx'
import Signaler from './screens/Signaler.tsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Lancement />} />
      <Route path="/accueil" element={<Accueil />} />
      <Route path="/signaler" element={<Signaler />} />
      <Route path="/demande" element={<Confirmation />} />
      <Route path="/carte" element={<AVenir titre="Carte" onglet="carte" />} />
      <Route path="/profil" element={<AVenir titre="Mon profil" onglet="profil" />} />
      <Route path="/notifications" element={<AVenir titre="Notifications" />} />
      <Route path="/aider" element={<AVenir titre="Je veux aider" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
