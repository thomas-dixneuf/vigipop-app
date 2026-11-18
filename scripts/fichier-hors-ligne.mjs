// Fichier hors ligne à double-cliquer : rassemble une version construite (index.html, script, styles, images)
// en un seul fichier HTML qui s'ouvre sans serveur ni Internet (file://).
// Usage : node scripts/fichier-hors-ligne.mjs <dossier construit> <fichier de sortie.html>
// Le dossier doit avoir été construit avec FICHIER_UNIQUE=1 (un seul script, sans import différé).
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [dossier, sortie] = process.argv.slice(2)
if (!dossier || !sortie) {
  console.error('Usage : node scripts/fichier-hors-ligne.mjs <dossier construit> <sortie.html>')
  process.exit(1)
}

const lire = (chemin) => readFileSync(join(dossier, chemin))
const types = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', svg: 'image/svg+xml', webp: 'image/webp' }
const enDonnees = (fichier) => {
  const ext = fichier.split('.').pop().toLowerCase()
  return `data:${types[ext]};base64,${lire(fichier).toString('base64')}`
}
// Images du dossier public (logos, fonds de carte embarqués) : remplacées par leur contenu dans le script
const images = readdirSync(dossier).filter((f) => types[f.split('.').pop().toLowerCase()])
const integrerImages = (texte) => {
  for (const image of images) texte = texte.split(`./${image}`).join(enDonnees(image))
  return texte
}

let html = lire('index.html').toString()
const scripts = [...html.matchAll(/<script type="module" crossorigin src="\.\/([^"]+)"><\/script>/g)]
const styles = [...html.matchAll(/<link rel="stylesheet" crossorigin href="\.\/([^"]+)">/g)]
if (scripts.length !== 1) throw new Error(`Un seul script attendu, ${scripts.length} trouvé(s) : construire avec FICHIER_UNIQUE=1`)
if (readdirSync(join(dossier, 'assets')).filter((f) => f.endsWith('.js')).length !== 1) {
  throw new Error('Le script charge d\'autres morceaux : construire avec FICHIER_UNIQUE=1')
}

for (const [balise, chemin] of styles) {
  html = html.replace(balise, () => `<style>${lire(chemin)}</style>`)
}
const code = integrerImages(lire(scripts[0][1]).toString()).replace(/<\/script/gi, '<\\/script')
html = html.replace(scripts[0][0], '')
// Le script en fin de page, après <div id="root">
html = html.replace('</body>', () => `<script type="module">${code}</script>\n  </body>`)
// Pas de manifeste ni de service worker : ils ne fonctionnent pas depuis un fichier local
html = html.replace(/<link rel="manifest"[^>]*>/, '').replace(/<script id="vite-plugin-pwa:register-sw"[^>]*><\/script>/, '')
html = html.replace(/href="\.\/(favicon\.png|icon-192\.png)"/g, (_, f) => `href="${enDonnees(f)}"`)

writeFileSync(sortie, html)
console.log(`${sortie} : ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(1)} Mo`)
