// Captures d'écran pour les fiches App Store et Google Play, en mode démo (données fictives).
// Usage : npm run captures  (construit l'app en mode démo sans serveur dans dist-captures/,
// puis écrit les images dans captures-stores/)
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const PORT = 4199
const URL = `http://localhost:${PORT}/`
const SORTIE = 'captures-stores'

// Tailles demandées par les stores : iPhone 6,9 pouces (1320 × 2868) et téléphone Android (1080 × 1920)
const FORMATS = [
  { nom: 'iphone-6.9', viewport: { width: 440, height: 956 }, deviceScaleFactor: 3 },
  { nom: 'android', viewport: { width: 360, height: 640 }, deviceScaleFactor: 3 },
]

const utilisateur = { prenom: 'Camille', telephone: '06 00 00 00 00', commune: 'Commune pilote' }
const alerte = {
  id: 'demo',
  titre: 'Crue de [RIVIÈRE] — vigilance rouge',
  consigne: "montez à l'étage, ne prenez pas votre voiture.",
  heure: '14:05',
}
const connecte = { utilisateur, visiteFaite: true, visiteAFaire: false, dernierUtilisateur: utilisateur }

// Chaque écran : état de démo à injecter, puis route à ouvrir
const ECRANS = [
  { nom: '01-lancement', etat: {}, route: '/' },
  { nom: '02-alerte-crise', etat: { ...connecte, mode: 'crise', alerte }, route: '/accueil' },
  { nom: '03-demande-aide', etat: { ...connecte, mode: 'crise', alerte }, route: '/signaler' },
  { nom: '04-carte', etat: { ...connecte, mode: 'crise', alerte }, route: '/carte' },
  { nom: '05-aider', etat: { ...connecte, mode: 'crise', alerte }, route: '/aider' },
  { nom: '06-preparation', etat: { ...connecte, mode: 'veille' }, route: '/accueil' },
]

async function attendreServeur() {
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(URL)).ok) return
    } catch {
      // serveur pas encore prêt
    }
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error(`Aperçu injoignable sur ${URL}`)
}

const apercu = spawn('npx', ['vite', 'preview', '--outDir', 'dist-captures', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
try {
  await attendreServeur()
  await mkdir(SORTIE, { recursive: true })
  const navigateur = await chromium.launch()
  for (const format of FORMATS) {
    for (const ecran of ECRANS) {
      const contexte = await navigateur.newContext({
        viewport: format.viewport,
        deviceScaleFactor: format.deviceScaleFactor,
        locale: 'fr-FR',
        geolocation: { latitude: 47.06, longitude: -0.88 },
        permissions: ['geolocation'],
      })
      await contexte.addInitScript((etat) => {
        if (!sessionStorage.getItem('captures')) {
          localStorage.setItem('vigipop-demo', JSON.stringify(etat))
          sessionStorage.setItem('captures', '1')
        }
      }, ecran.etat)
      const page = await contexte.newPage()
      await page.goto(URL + '#' + ecran.route)
      await page.waitForLoadState('networkidle').catch(() => {})
      await page.waitForTimeout(500)
      const fichier = `${SORTIE}/${format.nom}-${ecran.nom}.png`
      await page.screenshot({ path: fichier })
      console.log('✓', fichier)
      await contexte.close()
    }
  }
  await navigateur.close()
} finally {
  apercu.kill()
}
