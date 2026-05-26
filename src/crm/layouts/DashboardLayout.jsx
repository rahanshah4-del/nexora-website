import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from '../components/sidebar/Sidebar.jsx'
import TopNav from '../components/navbar/TopNav.jsx'
import ProductSelectionModal from '../components/product/ProductSelectionModal.jsx'
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

const MOBILE_NOTICE_KEY = 'nexora_crm_mobile_dashboard_notice_dismissed_v1'

function MobileDashboardNotice() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem(MOBILE_NOTICE_KEY) === 'true'
    const isMobile = window.matchMedia?.('(max-width: 767px)')?.matches
    if (!dismissed && isMobile) {
      const handle = window.setTimeout(() => setShow(true), 450)
      return () => window.clearTimeout(handle)
    }
    return undefined
  }, [])

  function dismiss() {
    localStorage.setItem(MOBILE_NOTICE_KEY, 'true')
    setShow(false)
  }

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/35 px-4 backdrop-blur-md md:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={dismiss}
        >
          <motion.div
            className="w-full max-w-sm overflow-hidden rounded-[1.6rem] border border-white/80 bg-white/[0.92] p-5 shadow-[0_28px_90px_-42px_rgba(15,23,42,0.65)] backdrop-blur-2xl"
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/15">
              <span className="text-lg font-semibold">N</span>
            </div>
            <div className="mt-4 text-center">
              <p className="text-base font-semibold text-slate-950">Best on desktop or tablet</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                For the best dashboard experience, please use a desktop or tablet device.
              </p>
            </div>
            <div className="mt-5 grid gap-2">
              <button
                type="button"
                className="focus-ring h-11 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 transition hover:bg-sky-700"
                onClick={dismiss}
              >
                Continue Anyway
              </button>
              <button
                type="button"
                className="focus-ring h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
                onClick={dismiss}
              >
                Open on Desktop Later
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [productModalOpen, setProductModalOpen] = useState(false)
  const [selectedWorkspace, setSelectedWorkspace] = useState(null)
  const [sessionInfo, setSessionInfo] = useState(null)
  const { user, ready } = useAuth()
  const { userDoc, loading: userLoading } = useUser()
  const location = useLocation()
  const navigate = useNavigate()
  const persistedKeyRef = useRef('')

  const toggleCollapse = () => setCollapsed((c) => !c)
  const userId = user?.uid ?? null

  useEffect(() => {
    if (!ready || !userId || userLoading) return

    const selected = readSelectedWorkspace(userId)
    const nextSession = buildWorkspaceSession({ user, userDoc, selectedWorkspace: selected })
    const modalSeenKey = `nexoraWorkspaceModalSeen:${userId}:${nextSession.sessionId}`
    const modalSeen = sessionStorage.getItem(modalSeenKey) === 'true'

    Promise.resolve().then(() => {
      setSelectedWorkspace(selected)
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
    if ((location.pathname === '/app' || location.pathname === '/app/dashboard') && selected === 'restaurant-pos') {
      navigate(workspaceRoute(selected), { replace: true })
    }
  }, [location.pathname, navigate, ready, user, userDoc, userId, userLoading])

  function markModalSeen() {
    if (!sessionInfo?.sessionId || !userId) return
    sessionStorage.setItem(`nexoraWorkspaceModalSeen:${userId}:${sessionInfo.sessionId}`, 'true')
  }

  function selectWorkspace(workspace) {
    if (!userId || !isValidWorkspace(workspace)) return
    if (workspace === 'restaurant-pos') return
    saveSelectedWorkspace(userId, workspace)
    setSelectedWorkspace(workspace)
    setProductModalOpen(false)
    markModalSeen()

    const nextSession = buildWorkspaceSession({ user, userDoc, selectedWorkspace: workspace })
    setSessionInfo(nextSession)
    persistedKeyRef.current = `${nextSession.sessionId}:${nextSession.selectedWorkspace}:${nextSession.planType}:${nextSession.trialStatus}`
    persistWorkspaceSession(nextSession).catch(() => {})

    navigate(workspaceRoute(workspace), { replace: true })
  }

  function continueLastWorkspace() {
    const workspace = selectedWorkspace || readSelectedWorkspace(userId) || 'crm'
    selectWorkspace(workspace === 'restaurant-pos' ? 'crm' : workspace)
  }

  function openProductSwitcher() {
    setProductModalOpen(true)
  }

  return (
    <div className="nexora-bg min-h-screen overflow-x-hidden">
      <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} onSwitchProduct={openProductSwitcher} />

      <div
        className={`relative z-10 flex min-h-screen min-w-0 flex-col transition-all duration-300 ${
          collapsed ? 'lg:ml-[72px]' : 'lg:ml-[236px]'
        }`}
      >
        <TopNav collapsed={collapsed} onOpenSidebar={() => setMobileOpen(true)} onSwitchProduct={openProductSwitcher} />

        <main className="min-w-0 flex-1 overflow-x-hidden px-3 py-4 transition-all duration-300 sm:px-5 lg:px-6 lg:py-5">
          <div className="mx-auto w-full max-w-[1440px] min-w-0">
            <Outlet />
          </div>
        </main>

        <footer className="min-w-0 px-3 pb-4 text-xs text-slate-500 dark:text-slate-400 sm:px-5 lg:px-6">
          <div className="mx-auto w-full max-w-[1440px]">
            © {new Date().getFullYear()} NEXORA SOLUTIONS — CRM Admin Dashboard
          </div>
        </footer>
      </div>

      <ProductSelectionModal
        open={productModalOpen}
        session={sessionInfo}
        selectedWorkspace={selectedWorkspace}
        onSelect={selectWorkspace}
        onContinueLast={continueLastWorkspace}
        onClose={continueLastWorkspace}
      />

      <MobileDashboardNotice />

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm lg:hidden"
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
