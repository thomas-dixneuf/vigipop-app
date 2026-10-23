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
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Vigipop',
        short_name: 'Vigipop',
        description: "Signaler sa situation, trouver de l'aide, aider ses voisins.",
        lang: 'fr',
        start_url: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0E3A52',
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
