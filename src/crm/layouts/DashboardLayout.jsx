import '../index.css'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiOutlineChartBar,
  HiOutlineDocumentText,
  HiOutlineShieldCheck,
  HiOutlineSparkles,
  HiOutlineUserGroup,
} from 'react-icons/hi2'
import Sidebar from '../components/sidebar/Sidebar.jsx'
import TopNav from '../components/navbar/TopNav.jsx'
import ProductSelectionModal from '../components/product/ProductSelectionModal.jsx'
import OnboardingWizard from '../components/onboarding/OnboardingWizard.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import PageLoader from '../components/ui/PageLoader.jsx'
import { MaintenanceBlock } from '../../components/MaintenanceMode.jsx'
import PasskeySetupPrompt from '../../components/security/PasskeySetupPrompt.jsx'
import usePlatformMaintenance from '../../hooks/usePlatformMaintenance.js'
import { isUserCustomVerified } from '../../lib/authRouteState.js'
import {
  businessWorkspaceForSelection,
  businessWorkspaceForType,
  isDeveloperOwnerAccount,
  moduleByRoute,
  normalizeBusinessType,
  routeAllowedByBusinessType,
  routeAllowedByPlan,
} from '../data/moduleAccess.js'
import { useAuth } from '../hooks/useAuth.js'
import { useUser } from '../hooks/useUser.js'
import { useWorkspaceAccess } from '../hooks/useWorkspaceAccess.js'
import useScreenSize from '../hooks/useScreenSize.js'
import {
  buildWorkspaceSession,
  isValidWorkspace,
  persistWorkspaceSession,
  readSelectedWorkspace,
  saveSelectedWorkspace,
  workspaceRoute,
} from '../lib/workspaceSession.js'
import { setStorageScope } from '../lib/localDataEvents.js'
import { goToWorkspace } from '../../lib/workspaceNavigation.js'
import { safeTrackMetaEventOnce } from '../../lib/metaPixel.js'
import logoUrl from '../../assets/logo/nexora-logo.svg'
import ReviewPromptModal from '../../components/review/ReviewPromptModal.jsx'
import useReviewPrompt from '../hooks/useReviewPrompt.js'

const WORKSPACE_INACTIVITY_LIMIT_MS = 15 * 60 * 1000

function traceDashboardLoop(event, payload = {}) {
  if (import.meta.env.DEV) {
    console.log(`[DashboardRouteTrace] ${event}`, payload)
  }
}

function formatAccessDate(value) {
  const date = typeof value?.toDate === 'function' ? value.toDate() : value instanceof Date ? value : value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

function TrialAccessBlock({ expired, subscriptionExpired, trialEndsAt, onBackToWorkspace, onUpgrade }) {
  const endLabel = formatAccessDate(trialEndsAt)
  const eyebrow = expired ? (subscriptionExpired ? 'Subscription expired' : 'Trial expired') : 'Package inactive'
  const title = expired
    ? subscriptionExpired
      ? 'Your workspace subscription has expired ⏳'
      : 'Your 7-day trial has ended ⏳'
    : 'Unlock your Nexora workspace ✨'
  const description = expired && subscriptionExpired
    ? 'Renew or upgrade your package to continue managing your complete business workspace.'
    : expired
      ? `Your Nexora CRM trial${endLabel ? ` ended on ${endLabel}` : ''}. Choose a package to keep your team moving without losing momentum.`
      : 'Choose an active package to continue managing your business with Nexora CRM.'
  const workspaceFeatures = [
    { icon: HiOutlineUserGroup, label: 'Customers & leads', tone: 'bg-sky-50 text-sky-700' },
    { icon: HiOutlineDocumentText, label: 'Invoices & billing', tone: 'bg-amber-50 text-amber-700' },
    { icon: HiOutlineChartBar, label: 'Reports & insights', tone: 'bg-violet-50 text-violet-700' },
    { icon: HiOutlineShieldCheck, label: 'Secure cloud data', tone: 'bg-emerald-50 text-emerald-700' },
  ]
  return (
    <div className="nexora-bg grid min-h-dvh place-items-center overflow-x-hidden px-4 py-8 sm:px-6">
      <motion.div
        className="w-full max-w-3xl overflow-hidden rounded-[1.6rem] border border-white/90 bg-white/95 shadow-[0_28px_90px_-44px_rgba(15,23,42,0.5)]"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <div className="h-1.5 bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-500" />
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <img className="h-12 w-12 shrink-0 rounded-xl border border-slate-200 bg-slate-950 object-contain p-1.5 shadow-sm" src={logoUrl} alt="Nexora Solution" />
              <div className="min-w-0">
                <p className="truncate text-sm font-black uppercase text-slate-950">Nexora Solution</p>
                <p className="text-xs font-semibold text-slate-500">Business Operating System</p>
              </div>
            </div>
            <Badge variant={expired ? 'danger' : 'warning'} className="gap-1.5 px-3 py-1.5 font-bold">
              <span aria-hidden="true">⏳</span> {eyebrow}
            </Badge>
          </div>

          <div className="mt-8 max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 text-xs font-black uppercase text-sky-700">
              <HiOutlineSparkles className="h-4 w-4" /> Your next chapter starts here
            </div>
            <h1 className="text-3xl font-black text-slate-950">{title}</h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">{description}</p>
          </div>

          <div className="mt-7 border-y border-slate-200 py-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {workspaceFeatures.map(({ icon: Icon, label, tone }) => (
                <div key={label} className="flex min-w-0 items-center gap-3">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tone}`}><Icon className="h-4 w-4" /></span>
                  <span className="text-sm font-bold text-slate-700">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">
            <HiOutlineShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
            <div><p className="text-sm font-black">Your workspace data is safe 🔒</p><p className="mt-0.5 text-xs leading-5 text-emerald-800">Customers, invoices, leads and reports remain securely stored while access is paused.</p></div>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button className="h-12 rounded-xl px-5" type="button" onClick={onUpgrade}>
              Upgrade & Continue <span aria-hidden="true">🚀</span> <HiOutlineArrowRight className="h-4 w-4" />
            </Button>
            <Button className="h-12 rounded-xl px-5" variant="subtle" type="button" onClick={onBackToWorkspace}>
              <HiOutlineArrowLeft className="h-4 w-4" /> Back to Workspace
            </Button>
            <p className="text-xs font-semibold text-slate-400 sm:ml-auto">Secure billing · Instant activation</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function AccountBlockedBlock({ onBackToWorkspace }) {
  return (
    <div className="nexora-bg grid min-h-dvh place-items-center overflow-x-hidden px-4 py-8 sm:px-6">
      <motion.div
        className="w-full max-w-3xl overflow-hidden rounded-[1.6rem] border border-rose-100 bg-white/95 shadow-[0_28px_90px_-44px_rgba(190,18,60,0.28)]"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <div className="h-1.5 bg-gradient-to-r from-rose-500 via-orange-400 to-amber-400" />
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-rose-50 text-3xl shadow-sm ring-1 ring-rose-100" aria-hidden="true">
                🔒
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-black uppercase text-slate-950">Nexora workspace access</p>
                <p className="text-xs font-semibold text-slate-500">Security status check</p>
              </div>
            </div>
            <Badge variant="danger" className="gap-1.5 px-3 py-1.5 font-bold">
              <span aria-hidden="true">🚫</span> Access blocked
            </Badge>
          </div>

          <div className="mt-8 max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-black uppercase text-rose-700 ring-1 ring-rose-100">
              <span aria-hidden="true">⚠️</span>
              Account paused by admin
            </div>
            <h1 className="text-3xl font-black text-slate-950">
              Your account is blocked. Contact administrator.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
              CRM access has been disabled for this account. Ask your workspace owner or Nexora administrator to restore access.
            </p>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {[
              ['🛡️', 'Data stays safe', 'Your workspace records remain secured.'],
              ['👤', 'Admin review', 'Owner/admin can reactivate access.'],
              ['🔔', 'Status update', 'You can return once access is restored.'],
            ].map(([emoji, title, text]) => (
              <div key={title} className="rounded-2xl border border-rose-100 bg-rose-50/55 p-4">
                <p className="text-2xl" aria-hidden="true">{emoji}</p>
                <p className="mt-3 text-sm font-black text-slate-950">{title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
            <HiOutlineShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-black">Need access restored?</p>
              <p className="mt-0.5 text-xs leading-5 text-amber-900">Contact the workspace owner or backend administrator and ask them to activate your account from Command Center.</p>
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button className="h-12 rounded-xl px-5" variant="subtle" type="button" onClick={onBackToWorkspace}>
              <span aria-hidden="true">⬅️</span> Back to Workspace
            </Button>
            <p className="text-xs font-semibold text-slate-400 sm:ml-auto">Protected mode · Access paused</p>
          </div>
        </div>
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
          Coming soon
        </Badge>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
          We are preparing this feature for your account.
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Nexora is building and activating more workspace tools for this module. It will be available soon with a smoother, more useful experience.
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
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('nexora-sidebar-collapsed') === 'true'
  })
  const [productModalOpen, setProductModalOpen] = useState(false)
  const [selectedWorkspace, setSelectedWorkspace] = useState(null)
  const [sessionInfo, setSessionInfo] = useState(null)
  const { user, ready } = useAuth()
  const reviewPrompt = useReviewPrompt()
  const {
    userDoc,
    loading: userLoading,
    isStaff,
    workspaceId,
    businessType,
    businessWorkspaceId,
    allowedBusinessTypes,
    specialModuleAccess,
    allModulesAccess,
    accessPlan,
    isTrialActive,
    isTrialExpired,
    isSubscriptionExpired,
    isWorkspaceExpired,
    hasActiveWorkspaceSubscription,
    trialEndsAt,
    isBlocked,
    firebaseUser,
    workspaceDoc,
    isAdmin: userIsAdmin,
    isOwner: userIsOwner,
    role: userRole,
    accessStatusReady,
  } = useUser()
  const workspaceAccess = useWorkspaceAccess()
  const screen = useScreenSize()
  const navigate = useNavigate()
  const location = useLocation()
  const persistedKeyRef = useRef('')

  const toggleCollapse = useCallback(() => setCollapsed((c) => !c), [])

  useEffect(() => {
    const collapseForFocusedPage = () => setCollapsed(true)
    window.addEventListener('nexora:collapse-sidebar', collapseForFocusedPage)
    return () => window.removeEventListener('nexora:collapse-sidebar', collapseForFocusedPage)
  }, [])

  const userId = user?.uid ?? null
  const isAuthenticated = Boolean(userId)

  useEffect(() => {
    if (!ready || !isAuthenticated || userLoading || !location.pathname.startsWith('/app')) return undefined
    let timer = null
    let expired = false
    let lastReset = 0
    const expireSession = async () => {
      if (expired) return
      if (document.hidden) {
        resetTimer()
        return
      }
      expired = true
      // Do not call Firebase signOut here: auth persistence is shared across tabs,
      // so an idle POS tab would log out the owner's previous dashboard tab too.
      navigate('/login', { replace: true, state: { reason: 'workspace_inactivity' } })
    }
    const resetTimer = () => {
      if (expired) return
      // Throttle: mousemove/scroll fire dozens of times per second — rebuilding
      // the timeout that often burns main-thread time (INP). Once per 5s is
      // ample resolution against a multi-minute inactivity limit.
      const now = Date.now()
      if (timer && now - lastReset < 5000) return
      lastReset = now
      if (timer) window.clearTimeout(timer)
      timer = window.setTimeout(expireSession, WORKSPACE_INACTIVITY_LIMIT_MS)
    }
    const events = ['click', 'keydown', 'mousemove', 'mousedown', 'touchstart', 'scroll', 'wheel']
    const handleVisibilityChange = () => {
      if (!document.hidden) resetTimer()
    }
    events.forEach((eventName) => window.addEventListener(eventName, resetTimer, { passive: true }))
    document.addEventListener('visibilitychange', handleVisibilityChange)
    resetTimer()
    return () => {
      if (timer) window.clearTimeout(timer)
      events.forEach((eventName) => window.removeEventListener(eventName, resetTimer))
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isAuthenticated, location.pathname, navigate, ready, userLoading])

  const hasActiveAccess = Boolean(hasActiveWorkspaceSubscription || isTrialActive)
  const billingRenewalRoute = location.pathname === '/app/subscriptions' || location.pathname.startsWith('/app/subscriptions/')
  const developerOverride = isDeveloperOwnerAccount(userDoc, firebaseUser)
  const workspaceOnboardingCompleted = userDoc?.onboardingCompleted === true || workspaceDoc?.onboardingCompleted === true
  const workspaceOnboardingResolved = Boolean(userDoc || workspaceDoc)
  const passkeyEmailVerified = isUserCustomVerified({
    ...firebaseUser,
    emailVerifiedCustom: userDoc?.emailVerifiedCustom === true || workspaceDoc?.emailVerifiedCustom === true,
  })
  const moduleEnteredForPasskey = Boolean(
    workspaceOnboardingCompleted ||
      userDoc?.currentBusinessType ||
      userDoc?.selectedBusinessType ||
      userDoc?.businessType ||
      workspaceDoc?.currentBusinessType ||
      workspaceDoc?.selectedBusinessType ||
      workspaceDoc?.businessType ||
      businessType,
  )
  // CRITICAL: Only businessType fields — never selectedWorkspace (UI selection).
  // selectedWorkspace is a workspace ID ("general-crm"), not a business type string.
  // Using it here would resolve to "General CRM" / Nexora Sales Hub via normalizeBusinessType,
  // which incorrectly overwrites Transport/Rental and other primary modules.
  // Likewise, selectedBusinessType and currentBusinessType are UI/temp fields
  // that must never participate in primary module identity.
  const lockedWorkspaceSource =
    userDoc?.primaryBusinessType ||
    workspaceDoc?.primaryBusinessType ||
    userDoc?.businessType ||
    workspaceDoc?.businessType
  const lockedWorkspaceId = businessWorkspaceId || (workspaceOnboardingCompleted && lockedWorkspaceSource ? businessWorkspaceForType(lockedWorkspaceSource).id : '')
  const teamOverride = workspaceAccess.isAdmin || workspaceAccess.hasPermission('settingsAccess')
  const crmAccessBlocked =
    ready &&
    isAuthenticated &&
    !userLoading &&
    Boolean(userDoc) &&
    !hasActiveAccess &&
    !developerOverride &&
    !billingRenewalRoute
  const accountBlocked = ready && isAuthenticated && !userLoading && accessStatusReady && Boolean(userDoc) && isBlocked
  const currentModule = moduleByRoute(location.pathname)
  const isOwnerAdmin = Boolean(developerOverride || userIsOwner || userIsAdmin || workspaceAccess.isAdmin)
  const normalizedBusinessType = normalizeBusinessType(businessType)
  const maintenanceContext = useMemo(
    () => ({ surface: 'workspace', module: normalizedBusinessType }),
    [normalizedBusinessType],
  )
  const maintenance = usePlatformMaintenance(maintenanceContext)
  const isCompactPosRoute = location.pathname === '/app/orders'
  const isStandalonePosBillingRoute = location.pathname === '/app/pos'
  const staffAccount = Boolean(userDoc?.isStaff === true || workspaceAccess.isStaff)
  const accessReady = Boolean(!workspaceAccess.loading && workspaceAccess.accessReady !== false)
  const staffModuleGranted = Boolean(
    !isOwnerAdmin &&
    staffAccount &&
    currentModule &&
    (
      currentModule.alwaysEnabled ||
      (accessReady && workspaceAccess.hasModulePermission(currentModule.key, 'view'))
    ),
  )
  const allowedModules = useMemo(
    () =>
      Array.from(new Set([
        'dashboard',
        ...workspaceAccess.permissionKeys
        .filter((item) => item.action === 'view' && workspaceAccess.hasModulePermission(item.moduleKey, 'view'))
        .map((item) => item.moduleKey),
      ])),
    [workspaceAccess],
  )
  const routePlanBlocked =
    ready &&
    isAuthenticated &&
    !userLoading &&
    Boolean(userDoc) &&
    Boolean(currentModule) &&
    !isOwnerAdmin &&
    !staffModuleGranted &&
    !routeAllowedByPlan(location.pathname, accessPlan, { developerOverride, teamOverride, businessType })
  const routeBusinessBlocked =
    ready &&
    isAuthenticated &&
    !userLoading &&
    Boolean(userDoc) &&
    Boolean(currentModule) &&
    !isOwnerAdmin &&
    !staffModuleGranted &&
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
    accessReady &&
    !developerOverride &&
    !isOwnerAdmin &&
    !currentModule.alwaysEnabled &&
    !staffModuleGranted &&
    !workspaceAccess.hasModulePermission(currentModule.key, 'view')
  const onboardingOpen = Boolean(ready && userId && !userLoading && !isStaff && workspaceOnboardingResolved && !workspaceOnboardingCompleted)

  useEffect(() => {
    console.log('[Role Access] role', workspaceAccess.role)
    console.log('[Role Access] isOwnerAdmin', isOwnerAdmin)
    console.log('[Role Access] isStaff', workspaceAccess.isStaff)
    console.log('[Role Access] allowed modules', allowedModules)
  }, [allowedModules, isOwnerAdmin, workspaceAccess.isStaff, workspaceAccess.role])

  useEffect(() => {
    if (!ready || userLoading || !currentModule) return
    const permissionKey = `module.${currentModule.key}.view`
    const base = {
      source: 'DashboardLayout',
      path: location.pathname,
      role: userRole || workspaceAccess.role || '',
      workspaceId: workspaceId || '',
      moduleKey: currentModule.key,
      permissionKey,
      isOwnerAdmin,
      userIsOwner,
      userIsAdmin,
      workspaceAccessAdmin: workspaceAccess.isAdmin,
      accessPlan,
      businessType,
    }
    if (routePermissionBlocked) {
      console.warn('[Sales Hub Access Denied]', {
        ...base,
        denialReason: workspaceAccess.loading ? 'permissions_loading' : 'missing_module_view_permission',
      })
    }
    if (routePlanBlocked) {
      console.warn('[Sales Hub Access Denied]', {
        ...base,
        denialReason: 'plan_restriction',
      })
    }
    if (routeBusinessBlocked) {
      console.warn('[Sales Hub Access Denied]', {
        ...base,
        denialReason: 'business_type_restriction',
      })
    }
  }, [
    accessPlan,
    businessType,
    currentModule,
    isOwnerAdmin,
    location.pathname,
    ready,
    routeBusinessBlocked,
    routePermissionBlocked,
    routePlanBlocked,
    userIsAdmin,
    userIsOwner,
    userLoading,
    userRole,
    workspaceAccess.isAdmin,
    workspaceAccess.loading,
    workspaceAccess.role,
    workspaceId,
  ])

  useEffect(() => {
    if (!ready || userLoading) return
    console.log('[Workspace State]', {
      source: 'DashboardLayout',
      userId: userId || '',
      workspaceId: workspaceId || '',
      userDocExists: Boolean(userDoc),
      workspaceDocExists: Boolean(workspaceDoc),
      userOnboardingCompleted: userDoc?.onboardingCompleted === true,
      workspaceOnboardingCompleted: workspaceDoc?.onboardingCompleted === true,
      onboardingCompleted: workspaceOnboardingCompleted,
      onboardingResolved: workspaceOnboardingResolved,
      selectedWorkspace: userDoc?.selectedWorkspace || workspaceDoc?.selectedWorkspace || '',
      selectedBusinessType: userDoc?.selectedBusinessType || workspaceDoc?.selectedBusinessType || '',
      currentBusinessType: userDoc?.currentBusinessType || workspaceDoc?.currentBusinessType || '',
      businessType,
      allowedBusinessTypes,
      enabledModules: Array.isArray(userDoc?.enabledModules) ? userDoc.enabledModules : workspaceDoc?.enabledModules || [],
      lockedWorkspaceId,
    })
    console.log('[Workspace Access]', {
      source: 'DashboardLayout',
      selectedWorkspace,
      lockedWorkspaceId,
      businessWorkspaceId,
      businessType,
      allowedBusinessTypes,
      allModulesAccess,
      specialModuleAccess,
    })
    console.log('[Business Type]', {
      source: 'DashboardLayout',
      businessType,
      lockedWorkspaceId,
      businessWorkspaceId,
    })
    console.log('[Current Business Type]', {
      source: 'DashboardLayout',
      userCurrentBusinessType: userDoc?.currentBusinessType || '',
      workspaceCurrentBusinessType: workspaceDoc?.currentBusinessType || '',
      resolvedBusinessType: businessType,
    })
    console.log('[Selected Workspace]', {
      source: 'DashboardLayout',
      selectedWorkspace,
      userSelectedWorkspace: userDoc?.selectedWorkspace || '',
      workspaceSelectedWorkspace: workspaceDoc?.selectedWorkspace || '',
      lockedWorkspaceId,
    })
    console.log('[Workspace Route Decision]', {
      source: 'DashboardLayout',
      path: location.pathname,
      lockedWorkspaceId,
      businessWorkspaceId,
      businessType,
      routeBusinessBlocked,
      routePermissionBlocked,
      routePlanBlocked,
      onboardingOpen,
    })
    console.log('[Workspace Wizard Reason]', {
      open: onboardingOpen,
      reason: onboardingOpen
        ? !userDoc && !workspaceDoc
          ? 'missing_user_and_workspace_docs'
          : 'onboarding_not_completed'
        : workspaceOnboardingCompleted
          ? 'onboarding_completed'
          : 'not_ready_or_staff',
      userOnboardingCompleted: userDoc?.onboardingCompleted === true,
      workspaceOnboardingCompleted: workspaceDoc?.onboardingCompleted === true,
      workspaceOnboardingResolved,
    })
  }, [
    allowedBusinessTypes,
    businessType,
    businessWorkspaceId,
    location.pathname,
    lockedWorkspaceId,
    onboardingOpen,
    ready,
    routeBusinessBlocked,
    routePermissionBlocked,
    routePlanBlocked,
    selectedWorkspace,
    allModulesAccess,
    specialModuleAccess,
    userDoc,
    userId,
    userLoading,
    workspaceDoc,
    workspaceId,
    workspaceOnboardingCompleted,
    workspaceOnboardingResolved,
  ])

  useEffect(() => {
    if (!ready || userLoading) return
    if (normalizeBusinessType(businessType) !== 'Retail / POS') return
    console.log('[Retail POS Access]', {
      source: 'DashboardLayout',
      businessType: normalizeBusinessType(businessType),
      lockedWorkspaceId,
      accessPlan,
      developerOverride,
      path: location.pathname,
    })
  }, [accessPlan, businessType, developerOverride, location.pathname, lockedWorkspaceId, ready, userLoading])

  useEffect(() => {
    if (screen.isMobile || screen.isTablet) {
      Promise.resolve().then(() => setMobileOpen(false))
    }
  }, [screen.isMobile, screen.isTablet])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('nexora-sidebar-collapsed', collapsed ? 'true' : 'false')
  }, [collapsed])

  const effectiveSidebarCollapsed = screen.isMobile || screen.isTablet ? true : collapsed

  useEffect(() => {
    if (!ready || !userId || userLoading) return
    if (!developerOverride && !lockedWorkspaceId) {
      Promise.resolve().then(() => {
        setSelectedWorkspace(null)
        setSessionInfo(null)
        setProductModalOpen(false)
      })
      return
    }

    const selected = developerOverride ? readSelectedWorkspace(userId) : lockedWorkspaceId
    if (!developerOverride && selected && readSelectedWorkspace(userId) !== selected) {
      saveSelectedWorkspace(userId, selected)
    }
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
    const targetRoute = workspaceRoute(workspace)
    const selectedBusiness = businessWorkspaceForSelection(workspace)
    const selectedBusinessType = normalizeBusinessType(selectedBusiness?.type)
    const normalizedAllowedBusinessTypes = Array.isArray(allowedBusinessTypes)
      ? allowedBusinessTypes.map(normalizeBusinessType)
      : []
    const workspaceAllowed =
      developerOverride ||
      workspace === lockedWorkspaceId ||
      allModulesAccess ||
      normalizedAllowedBusinessTypes.includes(selectedBusinessType)
    console.log('[Module Click]', {
      source: 'DashboardLayout',
      workspace,
      selectedBusinessType,
      lockedWorkspaceId,
    })
    console.log('[Workspace Access]', {
      source: 'DashboardLayout.selectWorkspace',
      workspaceAllowed,
      developerOverride,
      allModulesAccess,
      specialModuleAccess,
      allowedBusinessTypes: normalizedAllowedBusinessTypes,
      lockedWorkspaceId,
      selectedBusinessType,
    })
    console.log('[Business Type]', {
      source: 'DashboardLayout.selectWorkspace',
      selectedBusinessType,
      currentBusinessType: businessType,
    })
    console.log('[Current Business Type]', {
      source: 'DashboardLayout.selectWorkspace',
      workspaceCurrentBusinessType: workspaceDoc?.currentBusinessType || '',
      userCurrentBusinessType: userDoc?.currentBusinessType || '',
      nextBusinessType: selectedBusinessType,
    })
    console.log('[Selected Workspace]', {
      source: 'DashboardLayout.selectWorkspace',
      workspace,
      lockedWorkspaceId,
      currentSelectedWorkspace: selectedWorkspace,
    })
    console.log('[Route Target]', {
      source: 'DashboardLayout.selectWorkspace',
      selectedWorkspace: workspace,
      businessType: selectedBusinessType,
      target: targetRoute,
    })
    if (!workspaceAllowed) {
      console.log('[Workspace Module Open]', {
        source: 'DashboardLayout',
        workspace,
        lockedWorkspaceId,
        blocked: true,
        reason: 'workspace_not_allowed',
      })
      console.log('[Navigation Blocked]', {
        source: 'DashboardLayout.selectWorkspace',
        reason: 'workspace_not_allowed',
        workspace,
        lockedWorkspaceId,
        selectedBusinessType,
        target: '/workspace',
      })
      setProductModalOpen(false)
      navigate('/workspace', { replace: true })
      return
    }
    console.log('[Workspace Module Open]', {
      source: 'DashboardLayout',
      workspace,
      lockedWorkspaceId,
      route: targetRoute,
      blocked: false,
    })
    console.log('[Navigation Attempt]', {
      source: 'DashboardLayout.selectWorkspace',
      selectedWorkspace: workspace,
      businessType: selectedBusinessType,
      target: targetRoute,
    })
    saveSelectedWorkspace(userId, workspace)
    setSelectedWorkspace(workspace)
    setProductModalOpen(false)
    markModalSeen()

    setStorageScope(workspaceId, userId)

    const nextSession = buildWorkspaceSession({ user, userDoc, selectedWorkspace: workspace, workspaceId })
    setSessionInfo(nextSession)
    persistedKeyRef.current = `${nextSession.sessionId}:${nextSession.selectedWorkspace}:${nextSession.planType}:${nextSession.trialStatus}`
    persistWorkspaceSession(nextSession).catch(() => {})

    navigate(targetRoute, { replace: true })
  }, [
    allowedBusinessTypes,
    allModulesAccess,
    businessType,
    developerOverride,
    lockedWorkspaceId,
    markModalSeen,
    navigate,
    selectedWorkspace,
    specialModuleAccess,
    user,
    userDoc,
    userId,
    workspaceDoc,
    workspaceId,
  ])

  const continueLastWorkspace = useCallback(() => {
    const workspace = developerOverride ? selectedWorkspace || readSelectedWorkspace(userId) : lockedWorkspaceId
    if (!workspace) {
      navigate('/workspace', { replace: true })
      return
    }
    selectWorkspace(workspace)
  }, [developerOverride, lockedWorkspaceId, navigate, selectWorkspace, selectedWorkspace, userId])

  const firstAllowedRoute = useMemo(() => {
    const allowedSet = new Set(allowedModules)
    const roleValue = String(userDoc?.role || workspaceAccess.role || '').trim().toLowerCase()
    const cashierPriority = normalizedBusinessType === 'Restaurant POS'
      ? ['orders', 'ordersKot', 'tables']
      : ['pos', 'posOrders']
    const cashierModule = staffAccount && roleValue === 'cashier'
      ? cashierPriority.find((moduleKey) => allowedSet.has(moduleKey))
      : ''
    if (cashierModule) {
      return workspaceAccess.permissionKeys.find((item) => item.action === 'view' && item.moduleKey === cashierModule && item.route && !item.comingSoon)?.route || '/app/pos'
    }
    const staffPreferredModule = staffAccount
      ? workspaceAccess.permissionKeys.find((item) => item.action === 'view' && !['dashboard', 'customers'].includes(item.moduleKey) && allowedSet.has(item.moduleKey) && item.route && !item.comingSoon)
      : null
    const module = staffPreferredModule || workspaceAccess.permissionKeys.find((item) => item.action === 'view' && allowedSet.has(item.moduleKey) && item.route && !item.comingSoon)
    return module?.route || '/app/dashboard'
  }, [allowedModules, normalizedBusinessType, staffAccount, userDoc?.role, workspaceAccess.permissionKeys, workspaceAccess.role])

  const backToWorkspace = useCallback(() => {
    if (!isOwnerAdmin && workspaceAccess.isStaff) {
      navigate(firstAllowedRoute, { replace: true })
      return
    }
    goToWorkspace(navigate, location)
  }, [firstAllowedRoute, isOwnerAdmin, location, navigate, workspaceAccess.isStaff])

  useEffect(() => {
    traceDashboardLoop('route-state', {
      pathname: location.pathname,
      role: userDoc?.role || workspaceAccess.role || '',
      staffId: userDoc?.staffId || workspaceAccess.staffId || '',
      workspaceId,
      businessType,
      enabledModules: Array.isArray(userDoc?.enabledModules) ? userDoc.enabledModules : [],
      permissions: workspaceAccess.permissions,
      allowedModules,
      firstAllowedRoute,
      currentModule: currentModule?.key || '',
      accessReady,
      routePermissionBlocked,
      routeBusinessBlocked,
      routePlanBlocked,
    })
    if (!accessReady || !routePermissionBlocked || !staffAccount) return
    if (location.pathname === firstAllowedRoute) return
    traceDashboardLoop('navigate', {
      reason: 'route_permission_blocked',
      from: location.pathname,
      to: firstAllowedRoute,
    })
    navigate(firstAllowedRoute, { replace: true })
  }, [accessReady, allowedModules, businessType, currentModule?.key, firstAllowedRoute, location.pathname, navigate, routeBusinessBlocked, routePermissionBlocked, routePlanBlocked, staffAccount, userDoc?.enabledModules, userDoc?.role, userDoc?.staffId, workspaceAccess, workspaceId])

  useEffect(() => {
    if (!staffAccount || isOwnerAdmin || !accessReady) return
    const roleValue = String(userDoc?.role || workspaceAccess.role || '').trim().toLowerCase()
    const cashierCustomerRoute = roleValue === 'cashier' && location.pathname === '/app/customers'
    if (!cashierCustomerRoute) return
    if (firstAllowedRoute === location.pathname) return
    traceDashboardLoop('navigate', {
      reason: 'cashier_customer_route_blocked',
      from: location.pathname,
      to: firstAllowedRoute,
    })
    navigate(firstAllowedRoute, { replace: true })
  }, [accessReady, firstAllowedRoute, isOwnerAdmin, location.pathname, navigate, staffAccount, userDoc?.role, workspaceAccess.role])

  const openProductSwitcher = useCallback(() => {
    setProductModalOpen(true)
  }, [])

  if (ready && isAuthenticated && (userLoading || !accessStatusReady)) {
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
        expired={isTrialExpired || isSubscriptionExpired || isWorkspaceExpired}
        subscriptionExpired={isSubscriptionExpired || (isWorkspaceExpired && !isTrialExpired)}
        trialEndsAt={trialEndsAt}
        onBackToWorkspace={backToWorkspace}
        onUpgrade={() => { safeTrackMetaEventOnce('InitiateCheckout', undefined, 'nexora_meta_initiatecheckout', 'session'); navigate('/upgrade-business', { state: { fromUpgradeBusiness: true } }) }}
      />
    )
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
        onUpgrade={() => { safeTrackMetaEventOnce('InitiateCheckout', undefined, 'nexora_meta_initiatecheckout', 'session'); navigate('/upgrade-business', { state: { fromUpgradeBusiness: true } }) }}
      />
    )
  }

  if (maintenance.active) {
    if (isStandalonePosBillingRoute) {
      return (
        <div className="min-h-dvh bg-slate-50 text-slate-950">
          <MaintenanceBlock state={maintenance} compact />
        </div>
      )
    }

    return (
      <div
        className="nexora-bg crm-shell min-h-dvh overflow-x-clip"
        data-screen-size={screen.breakpoint}
        data-sidebar={effectiveSidebarCollapsed ? 'collapsed' : 'expanded'}
        data-business-type={normalizedBusinessType}
      >
        {isCompactPosRoute ? null : <Sidebar collapsed={effectiveSidebarCollapsed} onToggleCollapse={toggleCollapse} onSwitchProduct={openProductSwitcher} />}
        <div
          className="app-main relative z-10 flex min-h-dvh min-w-0 flex-col print:ml-0"
        >
          {isCompactPosRoute ? null : (
            <TopNav collapsed={effectiveSidebarCollapsed} onOpenSidebar={() => setMobileOpen(true)} onSwitchProduct={openProductSwitcher} />
          )}
          <main className="crm-main min-w-0 flex-1 overflow-x-clip px-3 pb-5 pt-4 sm:px-5 lg:px-6 lg:pb-6 lg:pt-5">
            <MaintenanceBlock state={maintenance} compact />
          </main>
        </div>
      </div>
    )
  }

  if (isStandalonePosBillingRoute) {
    return (
      <div className="min-h-dvh bg-slate-50 text-slate-950">
        <Outlet />
      </div>
    )
  }

  return (
    <div
      className="nexora-bg crm-shell min-h-dvh overflow-x-clip"
      data-screen-size={screen.breakpoint}
      data-sidebar={effectiveSidebarCollapsed ? 'collapsed' : 'expanded'}
      data-business-type={normalizedBusinessType}
      data-compact-pos={isCompactPosRoute ? 'true' : 'false'}
    >
      {isCompactPosRoute ? null : <Sidebar collapsed={effectiveSidebarCollapsed} onToggleCollapse={toggleCollapse} onSwitchProduct={openProductSwitcher} />}

      <div
        className="app-main relative z-10 flex min-h-dvh min-w-0 flex-col print:ml-0"
      >
        {isCompactPosRoute ? null : (
          <TopNav collapsed={effectiveSidebarCollapsed} onOpenSidebar={() => setMobileOpen(true)} onSwitchProduct={openProductSwitcher} />
        )}

        <main className={`crm-main min-w-0 flex-1 overflow-x-clip print:p-0 ${
          isCompactPosRoute ? 'px-3 pb-3 pt-2 sm:px-4 lg:px-4 lg:pb-3 lg:pt-2' : 'px-3 pb-5 pt-4 sm:px-5 lg:px-6 lg:pb-6 lg:pt-5'
        }`}>
          <div className="workspace-fluid-container mx-auto min-w-0 print:max-w-none">
            <Outlet />
            <p className={`mt-6 pb-1 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 print:hidden ${isCompactPosRoute ? 'hidden' : ''}`}>
              NEXORA SOLUTION — All rights reserved 2019-2026.
            </p>
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

      <PasskeySetupPrompt
        emailVerified={passkeyEmailVerified}
        enabled={Boolean(
          ready &&
            isAuthenticated &&
            passkeyEmailVerified &&
            moduleEnteredForPasskey &&
            hasActiveAccess &&
            !isBlocked &&
            !onboardingOpen &&
            !productModalOpen &&
            !isCompactPosRoute,
        )}
      />

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            className="fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-[1px] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
          >
            <div className="flex h-full max-w-[19rem] p-3 sm:p-4" onClick={(e) => e.stopPropagation()}>
              <Sidebar mobile onNavigate={() => setMobileOpen(false)} onSwitchProduct={openProductSwitcher} />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ── Apple-style review prompt (appears after 3-4 days of usage) ── */}
      <ReviewPromptModal
        open={reviewPrompt.showPrompt}
        onClose={reviewPrompt.handleClose}
        onSubmit={reviewPrompt.handleSubmit}
        submitting={reviewPrompt.submitting}
        submitError={reviewPrompt.submitError}
        workspaceName={workspaceDoc?.workspaceName || workspaceDoc?.companyName || workspaceDoc?.businessName || 'Nexora'}
      />
    </div>
  )
}
