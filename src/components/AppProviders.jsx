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
      <Suspense fallback={<div className="grid min-h-dvh place-items-center bg-white"><style>{`@keyframes apP{0%,100%{opacity:0.35;transform:scale(0.96)}50%{opacity:0.75;transform:scale(1.04)}}@keyframes apS{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:translateY(0)}}@media(prefers-reduced-motion:reduce){.ap-i{animation:none!important;opacity:0.25!important}}.ap-i{animation:apS .6s ease-out both}.ap-p{animation:apP 2s ease-in-out infinite}`}</style><div className="flex flex-col items-center gap-3 ap-i"><div className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200/80 bg-white shadow-sm"><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none"><path d="M12 4a8 8 0 100 16 8 8 0 000-16zm0 12a4 4 0 110-8 4 4 0 010 8z" fill="#0b82c5" fillOpacity="0.9"/></svg></div><div className="h-2 w-16 rounded-xl bg-slate-100 ap-p" /></div></div>}>
        <WorkspaceProviderShell>{children}</WorkspaceProviderShell>
      </Suspense>
    )
  }

  if (needsRootAuthProvider) {
    return (
      <Suspense fallback={<div className="grid min-h-dvh place-items-center bg-white"><style>{`@keyframes apP{0%,100%{opacity:0.35;transform:scale(0.96)}50%{opacity:0.75;transform:scale(1.04)}}@keyframes apS{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:translateY(0)}}@media(prefers-reduced-motion:reduce){.ap-i{animation:none!important;opacity:0.25!important}}.ap-i{animation:apS .6s ease-out both}.ap-p{animation:apP 2s ease-in-out infinite}`}</style><div className="flex flex-col items-center gap-3 ap-i"><div className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200/80 bg-white shadow-sm"><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none"><path d="M12 4a8 8 0 100 16 8 8 0 000-16zm0 12a4 4 0 110-8 4 4 0 010 8z" fill="#0b82c5" fillOpacity="0.9"/></svg></div><div className="h-2 w-16 rounded-xl bg-slate-100 ap-p" /></div></div>}>
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
