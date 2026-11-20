import type { CSSProperties } from 'react'
import { installerApp, useInstallationPossible } from '../outils/installation.ts'

// « Installer l'app » : visible seulement quand le navigateur le permet (Chrome, Edge sur ordinateur ou Android).
// Sur ordinateur, l'app s'ouvre ensuite dans sa propre fenêtre, avec son icône dans le menu Démarrer.
export default function BoutonInstallerApp({ className, style }: { className?: string; style?: CSSProperties }) {
  const possible = useInstallationPossible()
  if (!possible) return null
  return (
    <button type="button" className={className} onClick={() => void installerApp()} style={style}>
      Installer l'app sur cet appareil
    </button>
  )
}
