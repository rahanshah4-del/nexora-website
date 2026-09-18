// The BUILD_ID placeholder on the CACHE_NAME line below is substituted by
// scripts/prerender.mjs at build time with a hash of the sorted dist/assets/*
// filenames. (Written without its underscores here so the only literal
// occurrence of the token in this file is the one being substituted.) Those names are content-hashed by
// Vite, so the id changes if and only if a bundle actually changed: an identical
// rebuild keeps the cache, any real change evicts it.
//
// This used to be a hand-written label, and it is what the activate handler
// below compares against when deleting caches — so a release where nobody
// remembered to bump it evicted nothing and left visitors on the previous
// precached shell. That happened: the name sat unchanged from 2026-09-11
// through every deploy after it. It is wired to the build now so it cannot be
// forgotten, and the prerender FAILS THE BUILD if this token is missing.
//
// The literal token only ever reaches a browser in dev, where src/main.jsx
// registers no service worker at all (PROD-only) and purges any it finds.
const CACHE_NAME = 'nexora-pwa-__BUILD_ID__'
const CACHE_URLS = [
  // '/' is the shell, and the only HTML entry worth precaching: the navigate
  // handler's offline fallback reads exactly this key. '/index.html' used to sit
  // here too, but html_handling "force-trailing-slash" 307s it to '/', so the
  // entry only ever stored a redirected response that nothing read — and a
  // stored redirected response is what produces "a redirected response was used
  // for a request whose redirect mode is not follow" if anything ever did.
  '/',
  '/favicon.ico',
  '/favicon.svg',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/favicon-48x48.png',
  '/favicon-64x64.png',
  '/manifest.json',
  '/apple-touch-icon.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/nexora-pwa-install-180.png',
  '/nexora-pwa-install-192.png',
  '/nexora-pwa-install-512.png',
  '/nexora-brand-logo.png',
]
const OFFLINE_HTML = '<!doctype html><html><body><h1>Nexora is offline</h1><p>Please reconnect and try again.</p></body></html>'

// Which same-origin URLs may be served cache-first and written to the cache at
// runtime: Vite's content-hashed bundles under /assets/, and images/fonts. A
// content-hashed URL is immutable by construction, and an image at a stable
// path is replaced rather than edited, so neither can go stale in a way a user
// would notice. Anything else — HTML, JSON, XML, plain text — is served
// network-first below and never cached at runtime.
function isRuntimeCacheable(url) {
  return url.pathname.startsWith('/assets/') ||
    /\.(?:png|jpe?g|gif|svg|webp|avif|ico|woff2?)$/i.test(url.pathname)
}

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
    // Network-first, with the cached shell as an OFFLINE fallback only — never a
    // substitute for a response the server did send. The server is the only
    // thing that knows whether a URL is a real page: it answers a prerendered
    // route with that page, a client-only route with the SPA shell, and an
    // unknown URL with 404.html at status 404 (see worker/index.js). Every
    // response, that 404 included, is passed straight through. Falling back to a
    // precached '/' on anything else would re-create for real users the soft 404
    // just removed for crawlers — an unknown URL painting the homepage at 200.
    //
    // The fallback is keyed on '/' rather than '/index.html': html_handling
    // "force-trailing-slash" 307s /index.html to /, so '/' is the entry that
    // reliably holds the shell, and a stored redirected response is what
    // produces "a redirected response was used for a request whose redirect mode
    // is not follow". Both fallbacks sit inside .catch() so that a response from
    // the network can never be second-guessed.
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('/').then((cached) => cached || new Response(OFFLINE_HTML, {
          status: 503,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }))),
    )
    return
  }

  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(event.request).catch(() => new Response('', { status: 504, statusText: 'Gateway Timeout' })),
    )
    return
  }

  // Cache-first is only safe for a URL whose content can never change, which
  // means content-hashed bundles and images. This branch used to cache-first
  // EVERY same-origin GET and write it back with no bound and no expiry, so a
  // file served from a stable URL — /sitemap.xml, /rss.xml, /search-index.json,
  // /manifest.json — was pinned to its first-seen bytes for the life of the
  // cache, and the cache itself grew without limit (~2000 entries observed).
  if (isRuntimeCacheable(url)) {
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
    return
  }

  // Every other same-origin GET: network-first, and never written to the cache.
  // The precached entries in CACHE_URLS (/manifest.json and the icons) are still
  // reachable here as an offline fallback, so installability survives offline
  // without any URL being pinned to stale bytes while online.
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request).then((cached) => cached || new Response('', { status: 504, statusText: 'Gateway Timeout' }))),
  )
})
