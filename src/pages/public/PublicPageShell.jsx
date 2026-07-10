import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import Header from '../../components/Header.jsx'
import { MaintenanceBlock } from '../../components/MaintenanceMode.jsx'
import PublicAnalytics from '../../components/PublicAnalytics.jsx'
import usePlatformMaintenance from '../../hooks/usePlatformMaintenance.js'
import PublicFooter from './PublicFooter.jsx'

const TawkChat = lazy(() => import('./TawkChat.jsx'))

export default function PublicPageShell({ children }) {
  const maintenanceContext = useMemo(() => ({ surface: 'website' }), [])
  const maintenance = usePlatformMaintenance(maintenanceContext)
  const [chatReady, setChatReady] = useState(false)

  useEffect(() => {
    document.documentElement.classList.add('public-website')
    document.body.classList.add('public-website')

    return () => {
      document.documentElement.classList.remove('public-website')
      document.body.classList.remove('public-website')
    }
  }, [])

  useEffect(() => {
    if (maintenance.active) return undefined
    let cancelled = false
    let idleId = null
    let timeoutId = null
    const showChat = () => {
      if (!cancelled) setChatReady(true)
    }
    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(showChat, { timeout: 5000 })
    } else {
      timeoutId = window.setTimeout(showChat, 3500)
    }
    return () => {
      cancelled = true
      if (idleId) window.cancelIdleCallback?.(idleId)
      if (timeoutId) window.clearTimeout(timeoutId)
    }
  }, [maintenance.active])

  return (
    <div className="marketing-page min-h-screen overflow-x-hidden bg-white text-slate-950">
      {maintenance.active ? <MaintenanceBlock state={maintenance} /> : null}
      {maintenance.active ? null : (
        <>
          <Header />
          <PublicAnalytics />
          <main>{children}</main>
          <PublicFooter />
          {chatReady ? <Suspense fallback={null}><TawkChat /></Suspense> : null}
        </>
      )}
    </div>
  )
}
