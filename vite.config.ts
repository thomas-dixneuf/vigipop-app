import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // VITE_VUE=mairie : application « Vigipop Mairie » à installer sur l'ordinateur de la cellule de crise
  // (publiée dans le sous-dossier mairie/, avec son propre manifeste et son propre service worker)
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const mairie = env.VITE_VUE === 'mairie'
  // Démonstration hors ligne (données fictives) : un nom distinct pour ne pas la confondre avec la vraie
  const demo = env.VITE_SERVEUR_LOCAL === '1' ? ' (démo)' : ''
  // APP_NATIVE=1 : version embarquée dans les applications Android et iOS (Capacitor, npm run natif:sync).
  // Les fichiers sont déjà dans l'application : pas de service worker (mise à jour par les stores).
  const natif = process.env.APP_NATIVE === '1'
  return {
    // Chemins relatifs : l'app fonctionne quel que soit le dossier d'hébergement
    base: './',
    // FICHIER_UNIQUE=1 : un seul script, pour le fichier hors ligne à double-cliquer (scripts/fichier-hors-ligne.mjs)
    build: process.env.FICHIER_UNIQUE === '1' ? { rollupOptions: { output: { inlineDynamicImports: true } } } : {},
    plugins: [
      react(),
      {
        // Titre de la fenêtre de l'application installée
        name: 'titre-mairie',
        transformIndexHtml: (html: string) =>
          mairie ? html.replace(/<title>[^<]*<\/title>/, `<title>Vigipop Mairie${demo}</title>`) : html,
      },
      VitePWA({
        disable: natif,
        registerType: 'autoUpdate',
        includeAssets: ['favicon.png', 'logo.png', 'logo-slogan.png'],
        workbox: {
          // Le prototype embarque Supabase et la carte : une seule archive, gardée hors ligne
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          // Clic sur une alerte système → ouverture de l'app sur l'écran concerné
          importScripts: ['sw-alertes.js'],
          // Les applications mairie publiées dans des sous-dossiers gardent leur propre page d'accueil
          navigateFallbackDenylist: mairie ? [] : [/\/mairie\//, /\/demo-mairie\//],
          runtimeCaching: [
            {
              // Zones de carte déjà consultées : encore visibles si le réseau tombe pendant la crise
              urlPattern: /^https:\/\/tile\.openstreetmap\.org\//,
              handler: 'CacheFirst',
              options: {
                cacheName: 'carte-tuiles',
                expiration: { maxEntries: 600, maxAgeSeconds: 14 * 24 * 3600 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        manifest: {
          ...(mairie
            ? {
                id: './#/mairie',
                name: `Vigipop Mairie${demo}`,
                short_name: `Vigipop Mairie${demo}`,
                description: 'Espace de la cellule de crise communale : demandes, carte, volontaires, alertes.',
                start_url: './#/mairie',
                orientation: 'any' as const,
              }
            : {
                // Identité stable de l'app installée (Windows, Microsoft Store) : ne plus la changer
                id: './',
                name: 'Vigipop',
                short_name: 'Vigipop',
                categories: ['utilities', 'news'],
                description: "Signaler sa situation, trouver de l'aide, aider ses voisins.",
                start_url: './',
                orientation: 'portrait' as const,
              }),
          lang: 'fr',
          display: 'standalone',
          background_color: '#1B5B7A',
          theme_color: '#0E3A52',
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
      }),
    ],
  }
})
