import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import Link from '../../components/AppLink.jsx'
import { HiOutlineArrowLeft, HiOutlineChevronRight } from 'react-icons/hi2'
import Header from '../../components/Header.jsx'
import { MaintenanceBlock } from '../../components/MaintenanceMode.jsx'
import PublicAnalytics from '../../components/PublicAnalytics.jsx'
import usePlatformMaintenance from '../../hooks/usePlatformMaintenance.js'
import PublicFooter from './PublicFooter.jsx'

const TawkChat = lazy(() => import('./TawkChat.jsx'))
const NewUserOfferPopup = lazy(() => import('../../components/NewUserOfferPopup.jsx'))
const StickyCTA = lazy(() => import('../../components/StickyCTA.jsx'))
const ExitIntentPopup = lazy(() => import('../../components/ExitIntentPopup.jsx'))
const AIAssistant = lazy(() => import('../../components/AIAssistant.jsx'))

export default function PublicPageShell({ children, backTo, backLabel, badge, badgeIcon: BadgeIcon }) {
  const maintenanceContext = useMemo(() => ({ surface: 'website' }), [])
  const maintenance = usePlatformMaintenance(maintenanceContext)
  const [chatReady, setChatReady] = useState(false)

  useEffect(() => {
    document.documentElement.classList.add('public-website')
    document.body.classList.add('public-website')

    /* Scroll-triggered card reveal (Apple-style) */
    let observer = null
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-revealed')
              observer.unobserve(entry.target)
            }
          })
        },
        { rootMargin: '60px', threshold: 0.05 },
      )
      document.querySelectorAll('[data-reveal]').forEach((el) => observer.observe(el))
    }

    return () => {
      document.documentElement.classList.remove('public-website')
      document.body.classList.remove('public-website')
      if (observer) observer.disconnect()
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
    <div className="marketing-page min-h-screen overflow-x-hidden bg-white text-slate-900">
      {maintenance.active ? <MaintenanceBlock state={maintenance} /> : null}
      {maintenance.active ? null : (
        <>
          <Header />
          <PublicAnalytics />

          {/* Slim breadcrumb bar — Apple/Linear style, sits below header */}
          {(backTo || badge) ? (
            <div className="sticky top-14 z-30 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl" style={{ WebkitBackdropFilter: 'saturate(180%) blur(20px)' }}>
              <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2 sm:px-6 lg:px-8">
                {backTo ? (
                  <Link
                    to={backTo}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700 -ml-2.5"
                  >
                    <HiOutlineArrowLeft className="h-3.5 w-3.5" />
                    {backLabel || 'Back'}
                  </Link>
                ) : null}
                {backTo && badge ? <HiOutlineChevronRight className="h-3 w-3 text-slate-300" /> : null}
                {badge ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    {BadgeIcon ? <BadgeIcon className="h-3 w-3" /> : null}
                    {badge}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          <main>{children}</main>
          <PublicFooter />
          {chatReady ? <Suspense fallback={null}><TawkChat /></Suspense> : null}
          <Suspense fallback={null}><NewUserOfferPopup /></Suspense>
          <Suspense fallback={null}><StickyCTA /></Suspense>
          <Suspense fallback={null}><ExitIntentPopup /></Suspense>
          <Suspense fallback={null}><AIAssistant /></Suspense>
        </>
      )}
    </div>
  )
}
