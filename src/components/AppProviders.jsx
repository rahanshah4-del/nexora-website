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
      <Suspense fallback={<div className="grid min-h-dvh place-items-center bg-white"><div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-950" /></div>}>
        <WorkspaceProviderShell>{children}</WorkspaceProviderShell>
      </Suspense>
    )
  }

  if (needsRootAuthProvider) {
    return (
      <Suspense fallback={<div className="grid min-h-dvh place-items-center bg-white"><div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-950" /></div>}>
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
