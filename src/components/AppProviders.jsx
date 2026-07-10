import { lazy, Suspense } from 'react'
import AppErrorBoundary from './AppErrorBoundary.jsx'
import AppRouter from '../AppRouter.jsx'
import { useLocation } from 'react-router-dom'

const ROOT_AUTH_PREFIXES = ['/login', '/signup', '/verify-email', '/workspace', '/upgrade-business', '/admin']
const CrmProviderShell = lazy(() => import('./CrmProviderShell.jsx'))
const RootAuthProviderShell = lazy(() => import('./RootAuthProviderShell.jsx'))

function RouteScopedProviders({ children }) {
  const location = useLocation()
  const pathname = location.pathname || '/'
  const needsCrmProviders = pathname === '/app' || pathname.startsWith('/app/')
  const needsRootAuthProvider = ROOT_AUTH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))

  if (needsCrmProviders) {
    return (
      <Suspense fallback={null}>
        <CrmProviderShell>{children}</CrmProviderShell>
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
