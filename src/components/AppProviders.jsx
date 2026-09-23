import { lazy, Suspense } from 'react'
import AppErrorBoundary from './AppErrorBoundary.jsx'
import AppRouter, { PageSkeleton } from '../AppRouter.jsx'
import { useLocation } from 'react-router-dom'
import { MultiCurrencyProvider } from '../context/MultiCurrencyProvider.jsx'

const ROOT_AUTH_PREFIXES = ['/login', '/signup', '/verify-email', '/workspace', '/upgrade-business', '/admin']
const WORKSPACE_PROVIDER_PREFIXES = ['/workspace']
const MULTI_CURRENCY_PREFIXES = ['/pricing', '/upgrade-business']
const RootAuthProviderShell = lazy(() => import('./RootAuthProviderShell.jsx'))
const WorkspaceProviderShell = lazy(() => import('./WorkspaceProviderShell.jsx'))
const CrmProviderShell = lazy(() => import('./CrmProviderShell.jsx'))

function RouteScopedProviders({ children }) {
  const location = useLocation()
  const pathname = location.pathname || '/'
  const needsCrmProviders = pathname === '/app' || pathname.startsWith('/app/') || pathname.startsWith('/pos-till/')
  const needsWorkspaceProvider = WORKSPACE_PROVIDER_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  const needsRootAuthProvider = ROOT_AUTH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))

  if (needsCrmProviders) {
    // Same skeleton the /app pages show while their own chunk loads, so the two
    // loading states read as one instead of flashing between different layouts.
    return (
      <Suspense fallback={<PageSkeleton />}>
        <CrmProviderShell>{children}</CrmProviderShell>
      </Suspense>
    )
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
  const location = useLocation()
  const pathname = location.pathname || '/'
  const needsMultiCurrency = MULTI_CURRENCY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))

  const app = (
    <RouteScopedProviders>
      <AppRouter />
    </RouteScopedProviders>
  )

  return needsMultiCurrency ? <MultiCurrencyProvider>{app}</MultiCurrencyProvider> : app
}
