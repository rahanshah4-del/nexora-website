import { lazy, Suspense } from 'react'
import AppErrorBoundary from './AppErrorBoundary.jsx'
import AppRouter from '../AppRouter.jsx'
import CrmProviderShell from './CrmProviderShell.jsx'
import { useLocation } from 'react-router-dom'

const ROOT_AUTH_PREFIXES = ['/login', '/signup', '/verify-email', '/workspace', '/upgrade-business', '/admin']
const WORKSPACE_PROVIDER_PREFIXES = ['/workspace']
const RootAuthProviderShell = lazy(() => import('./RootAuthProviderShell.jsx'))
const WorkspaceProviderShell = lazy(() => import('./WorkspaceProviderShell.jsx'))

function RouteScopedProviders({ children }) {
  const location = useLocation()
  const pathname = location.pathname || '/'
  const needsCrmProviders = pathname === '/app' || pathname.startsWith('/app/')
  const needsWorkspaceProvider = WORKSPACE_PROVIDER_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  const needsRootAuthProvider = ROOT_AUTH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))

  if (needsCrmProviders) {
    // CrmProviderShell is inlined to avoid the lazy chunk waterfall.
    // Auth/User/Theme providers initialize immediately on first render.
    return <CrmProviderShell>{children}</CrmProviderShell>
  }

  if (needsWorkspaceProvider) {
    return (
      <Suspense fallback={<div className="min-h-dvh bg-white"><style>{`@keyframes sK{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}@keyframes sF{0%{opacity:0}100%{opacity:1}}@media(prefers-reduced-motion:reduce){.sS{display:none!important}.sB{opacity:.15!important}}.sW{overflow:hidden;position:relative}.sS{position:absolute;inset:0;background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,.6) 50%,transparent 100%);animation:sK 1.8s ease-in-out infinite}.sB{border-radius:.75rem;background:#e2e8f0;animation:sF .4s ease-out both}`}</style><div className="mx-auto max-w-md px-5 pt-12"><div className="flex flex-col items-center gap-4 pt-16"><div className="h-7 w-32 sB sW" style={{animationDelay:'.05s'}}><div className="sS" /></div><div className="h-4 w-48 sB sW" style={{animationDelay:'.12s'}}><div className="sS" /></div><div className="mt-4 h-10 w-full sB sW" style={{animationDelay:'.18s'}}><div className="sS" /></div><div className="h-10 w-full sB sW" style={{animationDelay:'.22s'}}><div className="sS" /></div></div></div></div>}>
        <WorkspaceProviderShell>{children}</WorkspaceProviderShell>
      </Suspense>
    )
  }

  if (needsRootAuthProvider) {
    return (
      <Suspense fallback={<div className="min-h-dvh bg-white"><style>{`@keyframes sK{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}@keyframes sF{0%{opacity:0}100%{opacity:1}}@media(prefers-reduced-motion:reduce){.sS{display:none!important}.sB{opacity:.15!important}}.sW{overflow:hidden;position:relative}.sS{position:absolute;inset:0;background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,.6) 50%,transparent 100%);animation:sK 1.8s ease-in-out infinite}.sB{border-radius:.75rem;background:#e2e8f0;animation:sF .4s ease-out both}`}</style><div className="mx-auto max-w-md px-5 pt-12"><div className="flex flex-col items-center gap-4 pt-16"><div className="h-7 w-32 sB sW" style={{animationDelay:'.05s'}}><div className="sS" /></div><div className="h-4 w-48 sB sW" style={{animationDelay:'.12s'}}><div className="sS" /></div><div className="mt-4 h-10 w-full sB sW" style={{animationDelay:'.18s'}}><div className="sS" /></div><div className="h-10 w-full sB sW" style={{animationDelay:'.22s'}}><div className="sS" /></div></div></div></div>}>
        <RootAuthProviderShell>{children}</RootAuthProviderShell>
      </Suspense>
    )
  }

  return <AppErrorBoundary>{children}</AppErrorBoundary>
}

export default function AppProviders() {
  return (
    <RouteScopedProviders>
      <AppRouter />
    </RouteScopedProviders>
  )
}
