import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from '../components/sidebar/Sidebar.jsx'
import TopNav from '../components/navbar/TopNav.jsx'
import ProductSelectionModal from '../components/product/ProductSelectionModal.jsx'
import OnboardingWizard from '../components/onboarding/OnboardingWizard.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import PageLoader from '../components/ui/PageLoader.jsx'
import {
  businessWorkspaceForType,
  isDeveloperOwnerAccount,
  moduleByRoute,
  routeAllowedByBusinessType,
  routeAllowedByPlan,
} from '../data/moduleAccess.js'
import { useAuth } from '../hooks/useAuth.js'
import { useUser } from '../hooks/useUser.js'
import { useWorkspaceAccess } from '../hooks/useWorkspaceAccess.js'
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
    <div className="nexora-bg grid min-h-screen place-items-center overflow-x-hidden px-4 py-8">
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

function formatAccessDate(value) {
  const date = typeof value?.toDate === 'function' ? value.toDate() : value instanceof Date ? value : value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

function isActivePlanStatus(status) {
  return ['active', 'paid', 'approved', 'current'].includes(String(status || '').trim().toLowerCase())
}

function TrialAccessBlock({ expired, trialEndsAt, onBackToWorkspace, onUpgrade }) {
  const endLabel = formatAccessDate(trialEndsAt)
  return (
    <div className="nexora-bg grid min-h-dvh place-items-center overflow-x-hidden px-4 py-10">
      <motion.div
        className="w-full max-w-xl rounded-[1.6rem] border border-white/85 bg-white/95 p-6 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.55)]"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <Badge variant={expired ? 'danger' : 'warning'} className="font-semibold">
          {expired ? 'Trial expired' : 'Package inactive'}
        </Badge>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
          {expired ? 'Your 7-day trial has expired' : 'CRM access needs an active package'}
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          {expired
            ? `Your Nexora CRM trial${endLabel ? ` ended on ${endLabel}` : ''}. Upgrade to continue using CRM data, customers, invoices, leads, and reports.`
            : 'Return to Workspace or choose an active package to continue using Nexora CRM.'}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button className="h-11 rounded-2xl" type="button" onClick={onUpgrade}>
            Upgrade Package
          </Button>
          <Button className="h-11 rounded-2xl" variant="subtle" type="button" onClick={onBackToWorkspace}>
            Back to Workspace
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

function AccountBlockedBlock({ onBackToWorkspace }) {
  return (
    <div className="nexora-bg grid min-h-dvh place-items-center overflow-x-hidden px-4 py-10">
      <motion.div
        className="w-full max-w-xl rounded-[1.6rem] border border-rose-100 bg-white/95 p-6 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.55)]"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <Badge variant="danger" className="font-semibold">
          Access blocked
        </Badge>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
          Your account is blocked. Contact administrator.
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          CRM access has been disabled for this account. Ask your workspace owner or administrator to restore access.
        </p>
        <Button className="mt-6 h-11 rounded-2xl" variant="subtle" type="button" onClick={onBackToWorkspace}>
          Back to Workspace
        </Button>
      </motion.div>
    </div>
  )
}

function UpgradeRequiredBlock({ moduleLabel, onBackToDashboard, onUpgrade }) {
  return (
    <div className="nexora-bg grid min-h-dvh place-items-center overflow-x-hidden px-4 py-10">
      <motion.div
        className="w-full max-w-xl rounded-[1.6rem] border border-white/85 bg-white/95 p-6 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.55)]"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <Badge variant="warning" className="font-semibold">
          Upgrade required
        </Badge>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">Upgrade Required</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          {moduleLabel || 'This module'} is not included in your current package. Upgrade to open this CRM route.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button className="h-11 rounded-2xl" type="button" onClick={onUpgrade}>
            Upgrade Package
          </Button>
          <Button className="h-11 rounded-2xl" variant="subtle" type="button" onClick={onBackToDashboard}>
            Back to Dashboard
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

function BusinessModuleBlock({ onBackToWorkspace }) {
  return (
    <div className="nexora-bg grid min-h-dvh place-items-center overflow-x-hidden px-4 py-10">
      <motion.div
        className="w-full max-w-xl rounded-[1.6rem] border border-white/85 bg-white/95 p-6 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.55)]"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <Badge variant="warning" className="font-semibold">
          Not included
        </Badge>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
          This module is not enabled for your account.
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          This module is not enabled for your account. Contact Nexora support.
        </p>
        <Button className="mt-6 h-11 rounded-2xl" variant="subtle" type="button" onClick={onBackToWorkspace}>
          Back to Workspace
        </Button>
      </motion.div>
    </div>
  )
}

function PermissionBlock({ onBackToWorkspace }) {
  return (
    <div className="nexora-bg grid min-h-dvh place-items-center overflow-x-hidden px-4 py-10">
      <motion.div
        className="w-full max-w-xl rounded-[1.6rem] border border-white/85 bg-white/95 p-6 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.55)]"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <Badge variant="warning" className="font-semibold">
          Permission required
        </Badge>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
          You do not have permission to open this module.
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Ask an owner or admin to enable this module for your selected business workspace.
        </p>
        <Button className="mt-6 h-11 rounded-2xl" variant="subtle" type="button" onClick={onBackToWorkspace}>
          Back to Workspace
        </Button>
      </motion.div>
    </div>
  )
}

function ComingSoonBlock({ onBackToWorkspace }) {
  return (
    <div className="nexora-bg grid min-h-dvh place-items-center overflow-x-hidden px-4 py-10">
      <motion.div
        className="w-full max-w-xl rounded-[1.6rem] border border-white/85 bg-white/95 p-6 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.55)]"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <Badge variant="info" className="font-semibold">
          Coming soon
        </Badge>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">This module is not available yet</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          This workspace module is still marked coming soon and cannot be opened directly.
        </p>
        <Button className="mt-6 h-11 rounded-2xl" variant="subtle" type="button" onClick={onBackToWorkspace}>
          Back to Workspace
        </Button>
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
  const {
    userDoc,
    loading: userLoading,
    isStaff,
    workspaceId,
    businessType,
    allowedBusinessTypes,
    specialModuleAccess,
    allModulesAccess,
    accessPlan,
    isTrialActive,
    isTrialExpired,
    trialEndsAt,
    isBlocked,
    firebaseUser,
  } = useUser()
  const workspaceAccess = useWorkspaceAccess()
  const navigate = useNavigate()
  const location = useLocation()
  const persistedKeyRef = useRef('')

  const toggleCollapse = useCallback(() => setCollapsed((c) => !c), [])
  const userId = user?.uid ?? null
  const isAuthenticated = Boolean(userId)
  const hasActiveAccess =
    isTrialActive ||
    isActivePlanStatus(userDoc?.planStatus) ||
    accessPlan === 'Basic' ||
    accessPlan === 'Business' ||
    accessPlan === 'Enterprise'
  const developerOverride = isDeveloperOwnerAccount(userDoc, firebaseUser)
  const lockedWorkspaceId = businessWorkspaceForType(userDoc?.selectedBusinessType || userDoc?.businessType).id
  const teamOverride = workspaceAccess.isAdmin || workspaceAccess.hasPermission('settingsAccess')
  const crmAccessBlocked = ready && isAuthenticated && !userLoading && Boolean(userDoc) && !isStaff && !hasActiveAccess && !developerOverride
  const accountBlocked = ready && isAuthenticated && !userLoading && Boolean(userDoc) && isBlocked
  const currentModule = moduleByRoute(location.pathname)
  const routePlanBlocked =
    ready &&
    isAuthenticated &&
    !userLoading &&
    Boolean(userDoc) &&
    Boolean(currentModule) &&
    !routeAllowedByPlan(location.pathname, accessPlan, { developerOverride, teamOverride })
  const routeBusinessBlocked =
    ready &&
    isAuthenticated &&
    !userLoading &&
    Boolean(userDoc) &&
    Boolean(currentModule) &&
    !routeAllowedByBusinessType(location.pathname, businessType, {
      developerOverride,
      allowedBusinessTypes,
      allModulesAccess: allModulesAccess || specialModuleAccess && Array.isArray(allowedBusinessTypes) && allowedBusinessTypes.length >= 6,
    })
  const comingSoonBlocked =
    ready &&
    isAuthenticated &&
    !userLoading &&
    !developerOverride &&
    (location.pathname === '/app/restaurant-pos' || currentModule?.comingSoon)
  const routePermissionBlocked =
    ready &&
    isAuthenticated &&
    !userLoading &&
    Boolean(userDoc) &&
    Boolean(currentModule) &&
    !developerOverride &&
    ((currentModule?.key === 'team' && !teamOverride && !workspaceAccess.hasModulePermission('team', 'view')) ||
      (workspaceAccess.isStaff && !workspaceAccess.hasModulePermission(currentModule.key, 'view')))
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

    const selected = developerOverride ? readSelectedWorkspace(userId) : lockedWorkspaceId
    const nextSession = buildWorkspaceSession({ user, userDoc, selectedWorkspace: selected, workspaceId })

    Promise.resolve().then(() => {
      setSelectedWorkspace((current) => (current === selected ? current : selected))
      setSessionInfo(nextSession)
      setProductModalOpen(false)
    })

    const persistKey = `${nextSession.sessionId}:${nextSession.selectedWorkspace}:${nextSession.planType}:${nextSession.trialStatus}`
    if (persistedKeyRef.current !== persistKey) {
      persistedKeyRef.current = persistKey
      persistWorkspaceSession(nextSession).catch(() => {})
    }

  }, [developerOverride, lockedWorkspaceId, ready, user, userDoc, userId, userLoading, workspaceId])

  const markModalSeen = useCallback(() => {
    if (!sessionInfo?.sessionId || !userId) return
    sessionStorage.setItem(`nexoraWorkspaceModalSeen:${userId}:${sessionInfo.sessionId}`, 'true')
  }, [sessionInfo, userId])

  const selectWorkspace = useCallback((workspace) => {
    if (!userId || !isValidWorkspace(workspace)) return
    if (!developerOverride && workspace !== lockedWorkspaceId) {
      setProductModalOpen(false)
      navigate('/workspace', { replace: true })
      return
    }
    saveSelectedWorkspace(userId, workspace)
    setSelectedWorkspace(workspace)
    setProductModalOpen(false)
    markModalSeen()

    const nextSession = buildWorkspaceSession({ user, userDoc, selectedWorkspace: workspace, workspaceId })
    setSessionInfo(nextSession)
    persistedKeyRef.current = `${nextSession.sessionId}:${nextSession.selectedWorkspace}:${nextSession.planType}:${nextSession.trialStatus}`
    persistWorkspaceSession(nextSession).catch(() => {})

    navigate(workspaceRoute(workspace), { replace: true })
  }, [developerOverride, lockedWorkspaceId, markModalSeen, navigate, user, userDoc, userId, workspaceId])

  const continueLastWorkspace = useCallback(() => {
    const workspace = developerOverride ? selectedWorkspace || readSelectedWorkspace(userId) || 'general-crm' : lockedWorkspaceId
    selectWorkspace(workspace)
  }, [developerOverride, lockedWorkspaceId, selectWorkspace, selectedWorkspace, userId])

  const backToWorkspace = useCallback(() => {
    console.log('[Back To Workspace]', { source: 'crm-layout', route: '/workspace' })
    navigate('/workspace')
  }, [navigate])

  const openProductSwitcher = useCallback(() => {
    setProductModalOpen(true)
  }, [])

  if (ready && isAuthenticated && userLoading) {
    return (
      <div className="nexora-bg grid min-h-dvh place-items-center overflow-x-hidden px-4 py-10">
        <PageLoader stage="permissions" businessType={userDoc?.businessType} />
      </div>
    )
  }

  if (accountBlocked) {
    return <AccountBlockedBlock onBackToWorkspace={backToWorkspace} />
  }

  if (crmAccessBlocked) {
    return (
      <TrialAccessBlock
        expired={isTrialExpired}
        trialEndsAt={trialEndsAt}
        onBackToWorkspace={backToWorkspace}
        onUpgrade={() => navigate('/upgrade-business', { state: { fromUpgradeBusiness: true } })}
      />
    )
  }

  if (mobileBlocked) {
    return <MobileAppAccessBlock />
  }

  if (routeBusinessBlocked) {
    return <BusinessModuleBlock onBackToWorkspace={backToWorkspace} />
  }

  if (routePermissionBlocked) {
    return <PermissionBlock onBackToWorkspace={backToWorkspace} />
  }

  if (comingSoonBlocked) {
    return <ComingSoonBlock onBackToWorkspace={backToWorkspace} />
  }

  if (routePlanBlocked) {
    return (
      <UpgradeRequiredBlock
        moduleLabel={currentModule?.label}
        onBackToDashboard={() => navigate('/app/dashboard')}
        onUpgrade={() => navigate('/upgrade-business', { state: { fromUpgradeBusiness: true } })}
      />
    )
  }

  return (
    <div className="nexora-bg crm-shell min-h-dvh overflow-x-clip">
      <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} onSwitchProduct={openProductSwitcher} />

      <div
        className={`app-main relative z-10 flex min-h-dvh min-w-0 flex-col print:ml-0 ${
          collapsed ? 'lg:ml-[72px]' : 'lg:ml-[236px]'
        }`}
      >
        <TopNav collapsed={collapsed} onOpenSidebar={() => setMobileOpen(true)} onSwitchProduct={openProductSwitcher} />

        <main className="crm-main min-w-0 flex-1 overflow-x-clip px-3 pb-5 pt-4 print:p-0 sm:px-5 lg:px-6 lg:pb-6 lg:pt-5">
          <div className="mx-auto w-full max-w-[1440px] min-w-0 print:max-w-none">
            <Outlet />
          </div>
        </main>
      </div>

      <ProductSelectionModal
        open={productModalOpen && !onboardingOpen}
        session={sessionInfo}
        selectedWorkspace={selectedWorkspace}
        developerOverride={developerOverride}
        lockedWorkspaceId={lockedWorkspaceId}
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
