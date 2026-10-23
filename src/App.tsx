import { Navigate, Route, Routes } from 'react-router-dom'
import AccesProtege from './components/AccesProtege.tsx'
import Accueil from './screens/Accueil.tsx'
import Aider from './screens/Aider.tsx'
import Code from './screens/Code.tsx'
import Connexion from './screens/Connexion.tsx'
import Confirmation from './screens/Confirmation.tsx'
import Lancement from './screens/Lancement.tsx'
import MairieApp from './mairie/MairieApp.tsx'
import Inscription from './screens/Inscription.tsx'
import Mission from './screens/Mission.tsx'
import Pourquoi from './screens/Pourquoi.tsx'
import Profil from './screens/Profil.tsx'
import AVenir from './screens/AVenir.tsx'
import Signaler from './screens/Signaler.tsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Lancement />} />
      <Route path="/inscription" element={<Inscription />} />
      <Route path="/connexion" element={<Connexion />} />
      <Route path="/code" element={<Code />} />
      <Route path="/pourquoi/:etape" element={<Pourquoi />} />
      {/* Sans compte : accessible seulement en mode crise, pour ne jamais bloquer un appel à l'aide */}
      <Route path="/accueil" element={<AccesProtege><Accueil /></AccesProtege>} />
      <Route path="/signaler" element={<AccesProtege><Signaler /></AccesProtege>} />
      <Route path="/demande" element={<AccesProtege><Confirmation /></AccesProtege>} />
      <Route path="/carte" element={<AccesProtege><AVenir titre="Carte" onglet="carte" /></AccesProtege>} />
      <Route path="/profil" element={<AccesProtege><Profil /></AccesProtege>} />
      <Route path="/notifications" element={<AccesProtege><AVenir titre="Notifications" /></AccesProtege>} />
      {/* Se proposer comme volontaire demande toujours un compte : la mairie doit savoir qui vient */}
      <Route path="/aider" element={<AccesProtege compteObligatoire><Aider /></AccesProtege>} />
      <Route path="/mission" element={<AccesProtege compteObligatoire><Mission /></AccesProtege>} />
      {/* Espace mairie : tableau de bord des coordinateurs (compte e-mail + mot de passe) */}
      <Route path="/mairie" element={<MairieApp />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
