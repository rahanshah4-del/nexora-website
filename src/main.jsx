import { Component, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'

/* Root-level error boundary to catch lazy-load failures (stale chunks, SW cache, etc.) */
class RootErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <main className="grid min-h-screen place-items-center bg-slate-50 px-4 text-slate-950" style={{ fontFamily: 'system-ui, sans-serif' }}>
          <section className="w-full max-w-xl rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-rose-600">Nexora</p>
            <h1 className="mt-3 text-2xl font-black tracking-tight">Page could not finish loading</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              A runtime error was caught while loading the app. This is often caused by a stale cache or service worker.
            </p>
            <pre className="mt-4 max-h-44 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-rose-100">
              {this.state.error?.message || String(this.state.error)}
            </pre>
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white" onClick={() => window.location.reload()}>
                Reload Page
              </button>
              <button type="button" className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700" onClick={() => { navigator.serviceWorker?.getRegistrations?.().then((r) => r.forEach((reg) => reg.unregister())).then(() => window.location.reload()) }}>
                Clear Cache &amp; Reload
              </button>
            </div>
          </section>
        </main>
      )
    }
    return this.props.children
  }
}

import AppProviders from './components/AppProviders.jsx'

/* Remove static hero shell before React mounts for instant mobile FCP */
const shell = document.getElementById('s-shell')
if (shell) {
  shell.style.setProperty('transition', 'opacity 100ms ease')
  shell.style.opacity = '0'
  setTimeout(() => { shell.style.display = 'none' }, 120)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<div className="grid min-h-screen place-items-center bg-white"><style>{`@keyframes applePulse{0%,100%{opacity:0.35;transform:scale(0.96)}50%{opacity:0.75;transform:scale(1.04)}}@keyframes appleSlideUp{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:translateY(0)}}@media(prefers-reduced-motion:reduce){.ap-init{animation:none!important;opacity:0.25!important}}.ap-init{animation:appleSlideUp .6s ease-out both}.ap-init-pulse{animation:applePulse 2s ease-in-out infinite}`}</style><div className="flex flex-col items-center gap-3 ap-init"><div className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200/80 bg-white shadow-sm"><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none"><path d="M12 4a8 8 0 100 16 8 8 0 000-16zm0 12a4 4 0 110-8 4 4 0 010 8z" fill="#0b82c5" fillOpacity="0.9"/></svg></div><div className="h-2 w-16 rounded-xl bg-slate-100 ap-init-pulse" /></div></div>}>
          <AppProviders />
        </Suspense>
      </BrowserRouter>
    </RootErrorBoundary>
  </StrictMode>,
)

const SERVICE_WORKER_RESET_KEY = 'nexora-sw-reset-v3'

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
