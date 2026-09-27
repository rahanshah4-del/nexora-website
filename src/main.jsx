import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './styles/public-dark.css'
import './styles/public-dark-base.css'

import AppTree from './AppTree.jsx'
import { serverRenderedForThisUrl } from './lib/hydration.js'

/* Remove static hero shell before React mounts for instant mobile FCP */
const shell = document.getElementById('s-shell')
if (shell) {
  shell.style.setProperty('transition', 'opacity 100ms ease')
  shell.style.opacity = '0'
  setTimeout(() => { shell.style.display = 'none' }, 120)
}

/* Pages prerendered by src/entry-server.jsx carry data-ssr="<url>" on #root:
   at that URL their markup IS this React tree, so it is hydrated in place.
   Everything else is rendered fresh, as before: blog pages (hand-built HTML in
   scripts/prerender.mjs) and the app shell — which is the homepage's file, so
   it carries the homepage's data-ssr and must not be hydrated at /login etc. */
const rootElement = document.getElementById('root')
const app = <AppTree Router={BrowserRouter} />
if (serverRenderedForThisUrl()) {
  hydrateRoot(rootElement, app, {
    onRecoverableError(error) {
      // A hydration mismatch makes React drop the server HTML for (part of)
      // the page. Counted so it can be checked, and logged so it is noticed.
      window.__nexoraHydrationErrors = (window.__nexoraHydrationErrors || 0) + 1
      console.warn('[hydration]', error?.message || error)
    },
  })
} else {
  createRoot(rootElement).render(app)
}

// Bumping this forces clearStaleServiceWorkers() to run once more in every
// returning browser: unregister every service worker, delete every nexora-pwa-*
// cache, reload. Bumped to v4 with the 404/trailing-slash release — CACHE_NAME
// had gone unbumped for that deploy, so visitors were left holding a pre-deploy
// Cache Storage, and this is the only lever that clears them regardless of which
// service-worker instance currently controls the page. CACHE_NAME is wired to
// the build now (see public/service-worker.js), so this should not normally need
// touching again; it is the escape hatch for when caching state has to be reset
// unconditionally.
const SERVICE_WORKER_RESET_KEY = 'nexora-sw-reset-v4'

async function clearStaleServiceWorkers() {
  const registrations = await navigator.serviceWorker.getRegistrations?.()
  await Promise.all((registrations || []).map((registration) => registration.unregister()))
  if ('caches' in window) {
    const cacheNames = await caches.keys()
    await Promise.all(cacheNames.filter((name) => name.startsWith('nexora-pwa-')).map((name) => caches.delete(name)))
  }
}

if (import.meta.env.PROD && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (window.localStorage.getItem(SERVICE_WORKER_RESET_KEY) !== 'done') {
      clearStaleServiceWorkers()
        .then(() => {
          window.localStorage.setItem(SERVICE_WORKER_RESET_KEY, 'done')
          window.location.reload()
        })
        .catch(() => {
          window.localStorage.setItem(SERVICE_WORKER_RESET_KEY, 'done')
          navigator.serviceWorker.register('/service-worker.js').catch(() => {})
        })
      return
    }
    navigator.serviceWorker.register('/service-worker.js').catch(() => {})
  })
} else if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  clearStaleServiceWorkers().catch(() => {})
}
