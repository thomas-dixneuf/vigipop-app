import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Chemins relatifs : l'app fonctionne quel que soit le dossier d'hébergement
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'logo.png', 'logo-slogan.png'],
      workbox: {
        // Le prototype embarque Supabase et la carte : une seule archive, gardée hors ligne
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // Clic sur une alerte système → ouverture de l'app sur l'écran concerné
        importScripts: ['sw-alertes.js'],
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
        name: 'Vigipop',
        short_name: 'Vigipop',
        description: "Signaler sa situation, trouver de l'aide, aider ses voisins.",
        lang: 'fr',
        start_url: './',
        display: 'standalone',
        orientation: 'portrait',
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
})
