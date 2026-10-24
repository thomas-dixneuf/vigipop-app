// Chargé par le service worker de la PWA : un clic sur une alerte rouvre Vigipop sur le bon écran
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const lien = (event.notification.data && event.notification.data.lien) || '/accueil'
  const adresse = new URL(`./#${lien}`, self.registration.scope).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((fenetres) => {
      for (const fenetre of fenetres) {
        if ('focus' in fenetre) {
          if ('navigate' in fenetre) fenetre.navigate(adresse).catch(() => undefined)
          return fenetre.focus()
        }
      }
      return self.clients.openWindow(adresse)
    }),
  )
})

// Alerte envoyée par le serveur (fonction « envoyer-push »), même app fermée
self.addEventListener('push', (event) => {
  let message = { titre: 'Vigipop', texte: 'Nouvelle information de la mairie', lien: '/accueil', cle: 'vigipop' }
  try {
    message = { ...message, ...event.data.json() }
  } catch {
    // Message illisible : alerte générique
  }
  event.waitUntil(
    self.registration.showNotification(message.titre, {
      body: message.texte,
      tag: message.cle,
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      data: { lien: message.lien },
    }),
  )
})
