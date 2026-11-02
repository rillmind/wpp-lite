// Service worker só para as notificações do app (o Chrome do Android não mostra
// `new Notification()` sem ele). Não guarda nada em cache.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

// Clicar na notificação: traz a aba para frente e abre a conversa.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const jid = event.notification.data?.jid
  event.waitUntil(
    (async () => {
      const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const tab = tabs[0]
      if (tab) {
        await tab.focus()
        if (jid) tab.postMessage({ type: 'open-chat', jid })
      } else {
        await self.clients.openWindow('/')
      }
    })(),
  )
})
