import { useAppState } from '../state/AppState.tsx'
import AccueilCrise from './AccueilCrise.tsx'
import AccueilVeille from './AccueilVeille.tsx'

export default function Accueil() {
  const { mode } = useAppState()
  return mode === 'crise' ? <AccueilCrise /> : <AccueilVeille />
}
