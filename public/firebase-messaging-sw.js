// Web push service worker. Firebase Messaging registers this file at its own scope
// (/firebase-cloud-messaging-push-scope), so it never competes with /service-worker.js.
// Messages are data-only ({title, body, url, tag}); this worker shows them and opens the page on click.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try {
    const payload = event.data ? event.data.json() : {}
    data = payload.data || payload.notification || payload || {}
  } catch {
    data = {}
  }
  const title = String(data.title || 'Nexora').slice(0, 80)
  const options = {
    body: String(data.body || '').slice(0, 200),
    icon: '/android-chrome-192x192.png',
    badge: '/favicon-48x48.png',
    tag: String(data.tag || 'nexora'),
    data: { url: String(data.url || '/app/dashboard') },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const raw = (event.notification.data && event.notification.data.url) || '/app/dashboard'
  // Only ever open pages on this site.
  const target = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/app/dashboard'
  const url = new URL(target, self.location.origin).href
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of windows) {
      if (client.url.startsWith(self.location.origin) && 'focus' in client) {
        await client.focus()
        if ('navigate' in client) await client.navigate(url).catch(() => {})
        return
      }
    }
    await self.clients.openWindow(url)
  })())
})
