import { useEffect, useMemo } from 'react'
import Header from '../../components/Header.jsx'
import { MaintenanceBlock } from '../../components/MaintenanceMode.jsx'
import PublicAnalytics from '../../components/PublicAnalytics.jsx'
import usePlatformMaintenance from '../../hooks/usePlatformMaintenance.js'
import PublicFooter from './PublicFooter.jsx'
import TawkChat from './TawkChat.jsx'

export default function PublicPageShell({ children }) {
  const maintenanceContext = useMemo(() => ({ surface: 'website' }), [])
  const maintenance = usePlatformMaintenance(maintenanceContext)

  useEffect(() => {
    document.documentElement.classList.add('public-website')
    document.body.classList.add('public-website')

    return () => {
      document.documentElement.classList.remove('public-website')
      document.body.classList.remove('public-website')
    }
  }, [])

  return (
    <div className="marketing-page min-h-screen overflow-x-hidden bg-white text-slate-950">
      {maintenance.active ? <MaintenanceBlock state={maintenance} /> : null}
      {maintenance.active ? null : (
        <>
          <Header />
          <PublicAnalytics />
          <main>{children}</main>
          <PublicFooter />
          <TawkChat />
        </>
      )}
    </div>
  )
}
