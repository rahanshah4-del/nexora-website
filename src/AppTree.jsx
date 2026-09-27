import { Component, StrictMode, Suspense, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import AppProviders from './components/AppProviders.jsx'
import { markLeftServerRenderedPage } from './lib/hydration.js'

/**
 * The whole app tree, shared by the browser entry (src/main.jsx, with
 * BrowserRouter) and the build-time server render (src/entry-server.jsx, with
 * StaticRouter). The two MUST render the same tree: prerendered pages are
 * hydrated, and any difference between this tree on the server and in the
 * browser makes React discard the server HTML and re-render from scratch.
 */

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

function RootFallback() {
  return (
    <div className="min-h-screen bg-white"><style>{`@keyframes sK{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}@keyframes sF{0%{opacity:0}100%{opacity:1}}@media(prefers-reduced-motion:reduce){.sS{display:none!important}.sB{opacity:.15!important}}.sW{overflow:hidden;position:relative}.sS{position:absolute;inset:0;background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,.6) 50%,transparent 100%);animation:sK 1.8s ease-in-out infinite}.sB{border-radius:.75rem;background:#e2e8f0;animation:sF .4s ease-out both}`}</style><div className="flex h-14 items-center justify-between border-b border-slate-100 px-5 sm:px-8"><div className="h-7 w-28 sB sW" style={{animationDelay:'.05s'}}><div className="sS" /></div><div className="flex items-center gap-3"><div className="h-7 w-20 sB sW" style={{animationDelay:'.1s'}}><div className="sS" /></div><div className="h-7 w-7 sB sW" style={{animationDelay:'.12s'}}><div className="sS" /></div></div></div><div className="mx-auto max-w-7xl px-5 sm:px-8"><div className="flex gap-8 pt-8"><div className="hidden w-56 shrink-0 space-y-3 lg:block"><div className="h-8 sB sW" style={{animationDelay:'.15s'}}><div className="sS" /></div><div className="h-8 sB sW" style={{animationDelay:'.2s'}}><div className="sS" /></div><div className="h-8 sB sW" style={{animationDelay:'.25s'}}><div className="sS" /></div></div><div className="min-w-0 flex-1 space-y-5"><div className="h-10 w-3/5 sB sW" style={{animationDelay:'.1s'}}><div className="sS" /></div><div className="h-4 w-full max-w-lg sB sW" style={{animationDelay:'.18s'}}><div className="sS" /></div><div className="h-4 w-2/3 sB sW" style={{animationDelay:'.22s'}}><div className="sS" /></div><div className="grid gap-4 sm:grid-cols-3"><div className="h-36 rounded-xl sB sW" style={{animationDelay:'.25s'}}><div className="sS" /></div><div className="h-36 rounded-xl sB sW" style={{animationDelay:'.3s'}}><div className="sS" /></div><div className="h-36 rounded-xl sB sW" style={{animationDelay:'.35s'}}><div className="sS" /></div></div></div></div></div></div>
  )
}

// Renders nothing. Ends the "hydrating server HTML" phase (lib/hydration.js) on
// the first in-app navigation away from the URL the document was loaded for.
function HydrationScope() {
  const { pathname } = useLocation()
  const initialPath = useRef(pathname)
  useEffect(() => {
    if (pathname !== initialPath.current) markLeftServerRenderedPage()
  }, [pathname])
  return null
}

export default function AppTree({ Router, routerProps = {} }) {
  return (
    <StrictMode>
      <RootErrorBoundary>
        <Router {...routerProps}>
          <HydrationScope />
          <Suspense fallback={<RootFallback />}>
            <AppProviders />
          </Suspense>
        </Router>
      </RootErrorBoundary>
    </StrictMode>
  )
}
