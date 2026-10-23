/*
 * Service worker for /tools/temp-mail/ only (scope /tools/temp-mail/), separate
 * from the site-wide /service-worker.js. It does two things:
 *  - shows a notification when the Worker sends a (payload-free) web push, using
 *    the address and API URL the page last handed over, and
 *  - answers navigations with a small offline page so the app can be installed.
 * It caches nothing else.
 */
const STATE_CACHE = 'tm-state'
const STATE_KEY = '/tools/temp-mail/__state'
const HOME = '/tools/temp-mail/'

self.addEventListener('install', () => { self.skipWaiting() })
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()) })

self.addEventListener('message', (event) => {
  const data = event.data
  if (!data || data.type !== 'state') return
  event.waitUntil((async () => {
    const cache = await caches.open(STATE_CACHE)
    if (!data.address) { await cache.delete(STATE_KEY); return }
    await cache.put(STATE_KEY, new Response(JSON.stringify({ address: data.address, api: data.api }), { headers: { 'content-type': 'application/json' } }))
  })())
})

async function loadState() {
  try {
    const hit = await (await caches.open(STATE_CACHE)).match(STATE_KEY)
    return hit ? await hit.json() : null
  } catch { return null }
}

async function describeLatest() {
  const fallback = { title: 'New mail', body: 'A message arrived in your temporary inbox.' }
  try {
    const state = await loadState()
    if (!state || !state.address || !/^https:\/\//.test(state.api || '')) return fallback
    const res = await fetch(`${state.api}/api/inbox/${encodeURIComponent(state.address)}`, { cache: 'no-store' })
    if (!res.ok) return fallback
    const message = (await res.json()).messages?.[0]
    if (!message) return fallback
    return {
      title: `New mail from ${message.fromName || message.fromAddress || 'unknown sender'}`,
      body: message.code ? `${message.subject}\nCode: ${message.code}` : message.subject,
    }
  } catch { return fallback }
}

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    // The page is open and in front: it already shows the mail itself.
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    if (windows.some((w) => w.visibilityState === 'visible' && w.focused)) return
    const { title, body } = await describeLatest()
    await self.registration.showNotification(title, {
      body,
      icon: '/nexora-pwa-install-192.png',
      badge: '/favicon-64x64.png',
      tag: 'tm-new-mail',
      renotify: true,
      data: { url: HOME },
    })
  })())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const open = windows.find((w) => new URL(w.url).pathname.startsWith(HOME))
    if (open) { await open.focus(); return }
    await self.clients.openWindow(HOME)
  })())
})

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return
  event.respondWith(fetch(event.request).catch(() => new Response(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title><body style="font:16px system-ui;display:grid;place-items:center;min-height:100vh;margin:0;color:#334155;text-align:center"><div><h1 style="font-size:20px">You are offline</h1><p>Temp Mail needs a connection to receive mail. Reconnect and reload.</p></div>',
    { status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } },
  )))
})
