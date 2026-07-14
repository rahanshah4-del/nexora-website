import { lazy, Suspense } from 'react'
import AppErrorBoundary from './AppErrorBoundary.jsx'
import AppRouter from '../AppRouter.jsx'
import { useLocation } from 'react-router-dom'

const ROOT_AUTH_PREFIXES = ['/login', '/signup', '/verify-email', '/workspace', '/upgrade-business', '/admin']
const WORKSPACE_PROVIDER_PREFIXES = ['/workspace']
const CrmProviderShell = lazy(() => import('./CrmProviderShell.jsx'))
const RootAuthProviderShell = lazy(() => import('./RootAuthProviderShell.jsx'))
const WorkspaceProviderShell = lazy(() => import('./WorkspaceProviderShell.jsx'))

function RouteScopedProviders({ children }) {
  const location = useLocation()
  const pathname = location.pathname || '/'
  const needsCrmProviders = pathname === '/app' || pathname.startsWith('/app/')
  const needsWorkspaceProvider = WORKSPACE_PROVIDER_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  const needsRootAuthProvider = ROOT_AUTH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))

  if (needsCrmProviders) {
    return (
      <Suspense fallback={null}>
        <CrmProviderShell>{children}</CrmProviderShell>
      </Suspense>
    )
  }

  // /workspace uses the root auth user but also renders the CRM support-tickets
  // widget, so it needs the CRM UserProvider stack nested inside the root shell.
  if (needsWorkspaceProvider) {
    return (
      <Suspense fallback={null}>
        <WorkspaceProviderShell>{children}</WorkspaceProviderShell>
      </Suspense>
    )
  }

  if (needsRootAuthProvider) {
    return (
      <Suspense fallback={null}>
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
