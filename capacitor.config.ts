import type { CapacitorConfig } from '@capacitor/cli'

// Applications Android et iOS : une simple « coque » autour de l'app web (dossier dist/).
// Toute modification du code de l'app est reprise en relançant `npm run natif:sync`
// (ou automatiquement par le workflow GitHub « Applications Android et iOS »).
const config: CapacitorConfig = {
  // Identifiant définitif dans les stores : ne plus le changer après la première publication
  appId: 'fr.vigipop.app',
  appName: 'Vigipop',
  webDir: 'dist',
  android: {
    // Fond affiché le temps que l'app se charge (bleu nuit de la charte)
    backgroundColor: '#0E3A52',
  },
  ios: {
    backgroundColor: '#0E3A52',
    contentInset: 'never',
  },
  plugins: {
    // Alerte reçue pendant que l'app est ouverte : elle s'affiche aussi en bandeau
    PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] },
  },
}

export default config
