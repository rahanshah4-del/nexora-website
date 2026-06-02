const CACHE_NAME = 'nexora-pwa-v2'
const CACHE_URLS = ['/', '/nexora-logo.jpg', '/nexora-logo.png', '/index.html']
const OFFLINE_HTML = '<!doctype html><html><body><h1>Nexora is offline</h1><p>Please reconnect and try again.</p></body></html>'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CACHE_URLS)),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName)),
      ),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return
  }

  const url = new URL(event.request.url)

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('/index.html'))
        .then((response) => response || new Response(OFFLINE_HTML, {
          status: 503,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        })),
    )
    return
  }

  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(event.request))
    return
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse
      }
      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse
          }
          const responseClone = networkResponse.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone))
          return networkResponse
        })
        .catch(() => new Response('', { status: 504, statusText: 'Gateway Timeout' }))
    }),
  )
})
