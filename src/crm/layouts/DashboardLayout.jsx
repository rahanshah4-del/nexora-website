import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from '../components/sidebar/Sidebar.jsx'
import TopNav from '../components/navbar/TopNav.jsx'
import ProductSelectionModal from '../components/product/ProductSelectionModal.jsx'
import OnboardingWizard from '../components/onboarding/OnboardingWizard.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { useUser } from '../hooks/useUser.js'
import {
  buildWorkspaceSession,
  isValidWorkspace,
  persistWorkspaceSession,
  readSelectedWorkspace,
  saveSelectedWorkspace,
  workspaceRoute,
} from '../lib/workspaceSession.js'

function MobileAppAccessBlock() {
  return (
    <div className="nexora-bg grid min-h-screen place-items-center overflow-x-clip px-4 py-8">
      <motion.div
        className="w-full max-w-md overflow-hidden rounded-[1.8rem] border border-white/85 bg-white/95 p-6 text-center shadow-[0_24px_80px_-48px_rgba(15,23,42,0.55)]"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/15">
          <span className="text-lg font-semibold">N</span>
        </div>
        <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">NEXORA CRM</p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Desktop workspace required</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          NEXORA Business Suite is designed for desktop and tablet management. Please open on laptop/desktop for full CRM access.
        </p>
        <div className="mt-6 grid gap-2">
          <a
            href="/"
            className="focus-ring inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 transition hover:bg-sky-700"
          >
            Back to Website
          </a>
          <a
            href="/downloads/nexora-business-suite-windows.exe"
            className="focus-ring inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-sky-200 hover:text-sky-700"
          >
            Download Windows App
          </a>
        </div>
      </motion.div>
    </div>
  )
}

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [productModalOpen, setProductModalOpen] = useState(false)
  const [isMobileScreen, setIsMobileScreen] = useState(
    () => window.matchMedia?.('(max-width: 767px)')?.matches === true,
  )
  const [selectedWorkspace, setSelectedWorkspace] = useState(null)
  const [sessionInfo, setSessionInfo] = useState(null)
  const { user, ready } = useAuth()
  const { userDoc, loading: userLoading, isStaff, workspaceId } = useUser()
  const navigate = useNavigate()
  const persistedKeyRef = useRef('')

  const toggleCollapse = useCallback(() => setCollapsed((c) => !c), [])
  const userId = user?.uid ?? null
  const isAuthenticated = Boolean(userId)
  const mobileBlocked = ready && isAuthenticated && isMobileScreen
  const onboardingOpen = Boolean(ready && userId && !userLoading && !isStaff && userDoc?.onboardingCompleted !== true)

  useEffect(() => {
    const media = window.matchMedia?.('(max-width: 767px)')
    if (!media) return undefined

    const update = (event) => setIsMobileScreen(event.matches)
    media.addEventListener?.('change', update)
    return () => media.removeEventListener?.('change', update)
  }, [])

  useEffect(() => {
    if (!ready || !userId || userLoading) return

    const selected = readSelectedWorkspace(userId)
    const nextSession = buildWorkspaceSession({ user, userDoc, selectedWorkspace: selected, workspaceId })
    const modalSeenKey = `nexoraWorkspaceModalSeen:${userId}:${nextSession.sessionId}`
    const modalSeen = sessionStorage.getItem(modalSeenKey) === 'true'

    Promise.resolve().then(() => {
      setSelectedWorkspace((current) => (current === selected ? current : selected))
      setSessionInfo(nextSession)
    })

    const persistKey = `${nextSession.sessionId}:${nextSession.selectedWorkspace}:${nextSession.planType}:${nextSession.trialStatus}`
    if (persistedKeyRef.current !== persistKey) {
      persistedKeyRef.current = persistKey
      persistWorkspaceSession(nextSession).catch(() => {})
    }

    if (!modalSeen) {
      Promise.resolve().then(() => setProductModalOpen(true))
      return
    }

    if (!selected) {
      Promise.resolve().then(() => setProductModalOpen(true))
      return
    }

    if (selected === 'restaurant-pos') {
      Promise.resolve().then(() => setProductModalOpen(true))
      return
    }

    Promise.resolve().then(() => setProductModalOpen(false))
  }, [ready, user, userDoc, userId, userLoading, workspaceId])

  const markModalSeen = useCallback(() => {
    if (!sessionInfo?.sessionId || !userId) return
    sessionStorage.setItem(`nexoraWorkspaceModalSeen:${userId}:${sessionInfo.sessionId}`, 'true')
  }, [sessionInfo, userId])

  const selectWorkspace = useCallback((workspace) => {
    if (!userId || !isValidWorkspace(workspace)) return
    if (workspace === 'restaurant-pos') return
    saveSelectedWorkspace(userId, workspace)
    setSelectedWorkspace(workspace)
    setProductModalOpen(false)
    markModalSeen()

    const nextSession = buildWorkspaceSession({ user, userDoc, selectedWorkspace: workspace, workspaceId })
    setSessionInfo(nextSession)
    persistedKeyRef.current = `${nextSession.sessionId}:${nextSession.selectedWorkspace}:${nextSession.planType}:${nextSession.trialStatus}`
    persistWorkspaceSession(nextSession).catch(() => {})

    navigate(workspaceRoute(workspace), { replace: true })
  }, [markModalSeen, navigate, user, userDoc, userId, workspaceId])

  const continueLastWorkspace = useCallback(() => {
    const workspace = selectedWorkspace || readSelectedWorkspace(userId) || 'crm'
    selectWorkspace(workspace === 'restaurant-pos' ? 'crm' : workspace)
  }, [selectWorkspace, selectedWorkspace, userId])

  const openProductSwitcher = useCallback(() => {
    setProductModalOpen(true)
  }, [])

  if (mobileBlocked) {
    return <MobileAppAccessBlock />
  }

  return (
    <div className="nexora-bg min-h-screen overflow-x-clip">
      <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} onSwitchProduct={openProductSwitcher} />

      <div
        className={`relative z-10 min-h-screen min-w-0 print:ml-0 ${
          collapsed ? 'lg:ml-[72px]' : 'lg:ml-[236px]'
        }`}
      >
        <TopNav collapsed={collapsed} onOpenSidebar={() => setMobileOpen(true)} onSwitchProduct={openProductSwitcher} />

        <main className="min-w-0 overflow-x-clip overflow-y-visible px-3 pb-5 pt-4 print:p-0 sm:px-5 lg:px-6 lg:pb-6 lg:pt-5">
          <div className="mx-auto w-full max-w-[1440px] min-w-0 print:max-w-none">
            <Outlet />
          </div>
        </main>
      </div>

      <ProductSelectionModal
        open={productModalOpen && !onboardingOpen}
        session={sessionInfo}
        selectedWorkspace={selectedWorkspace}
        onSelect={selectWorkspace}
        onContinueLast={continueLastWorkspace}
        onClose={continueLastWorkspace}
      />

      <OnboardingWizard open={onboardingOpen} onComplete={() => setProductModalOpen(true)} />

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            className="fixed inset-0 z-50 bg-slate-950/35 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
          >
            <div className="h-full p-4" onClick={(e) => e.stopPropagation()}>
              <Sidebar mobile onNavigate={() => setMobileOpen(false)} onSwitchProduct={openProductSwitcher} />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
