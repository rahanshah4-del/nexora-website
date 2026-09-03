import {
  HiOutlineArrowRightOnRectangle,
  HiOutlineCalendarDays,
  HiOutlineCog6Tooth,
  HiOutlineSquares2X2,
} from 'react-icons/hi2'
import Avatar from '../ui/Avatar.jsx'
import Badge from '../ui/Badge.jsx'
import Dropdown from '../ui/Dropdown.jsx'
import Button from '../ui/Button.jsx'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePreferences } from '../../hooks/usePreferences.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useUser } from '../../hooks/useUser.js'
import { useLocation, useNavigate } from 'react-router-dom'
import NotificationBell from '../notifications/NotificationBell.jsx'
import CloudSyncButton from '../system/CloudSyncButton.jsx'
import GlobalSearch from '../system/GlobalSearch.jsx'
import MobileBottomNav from './MobileBottomNav.jsx'
import { labelForBusinessType, packageNameForPlan } from '../../data/moduleAccess.js'
import { resolveWorkspaceName } from '../../../lib/workspaceName.js'
import { goToWorkspace } from '../../../lib/workspaceNavigation.js'
import { resolveProfileDisplay } from '../../../lib/profileDisplay.js'

function formatTrialDate(value) {
  const date = typeof value?.toDate === 'function' ? value.toDate() : value instanceof Date ? value : value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

function buildAccessLabel({ isTrialActive, isTrialExpired, trialDaysRemaining, trialEndsAt, plan, planStatus }) {
  if (isTrialExpired) return 'Trial expired'
  if (isTrialActive) {
    const days = Math.max(Number(trialDaysRemaining) || 0, 0)
    const endLabel = formatTrialDate(trialEndsAt)
    return `${days || 1} trial day${days === 1 ? '' : 's'} left${endLabel ? ` - ends ${endLabel}` : ''}`
  }
  return `${packageNameForPlan(plan)} ${planStatus || 'active'}`
}

function EmailVerificationBadge({ verified }) {
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${verified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
      {verified ? 'Verified ✅' : 'Not Verified ⚠️'}
    </span>
  )
}

function Toast({ message, onClose }) {
  return (
    <div className="glass fixed left-1/2 top-1/2 z-[110] w-[22rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-800 shadow-xl dark:text-emerald-200">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold">{message}</p>
        <button
          type="button"
          className="focus-ring rounded-xl px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-white/40 dark:text-slate-100 dark:hover:bg-white/10"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  )
}

const POS_STATUS_ROUTES = new Set([
  '/app/pos',
  '/app/pos-orders',
  '/app/pos-discounts',
  '/app/restaurant-pos',
  '/app/tables',
  '/app/orders-kot',
  '/app/kitchen-display',
  '/app/menu-management',
])

function PosLiveIndicator({ issue }) {
  const live = !issue
  const label = live ? 'Live' : 'Issue'
  const title = live ? 'POS is live and ready to start work' : 'POS has an issue. Check internet or account access.'
  const tone = live
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
    : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200'
  const dotTone = live ? 'bg-emerald-500' : 'bg-rose-500'

  return (
    <div
      className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-2xl border px-3 text-xs font-black uppercase ${tone}`}
      title={title}
      aria-label={title}
      role="status"
    >
      <span className="relative flex h-3 w-3 shrink-0" aria-hidden="true">
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${dotTone}`} />
        <span className={`relative inline-flex h-3 w-3 rounded-full ${dotTone}`} />
      </span>
      <span className="hidden sm:inline">{label}</span>
    </div>
  )
}

function TopNav({ onOpenSidebar, onSwitchProduct }) {
  const { notifications, profile } = usePreferences()
  const { logout, busy } = useAuth()
  const { firebaseUser, userDoc, plan, role, businessType, isTrialActive, isTrialExpired, trialDaysRemaining, trialEndsAt, isBlocked } = useUser()
  const navigate = useNavigate()
  const location = useLocation()
  const [toast, setToast] = useState(null)
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  const businessTypeLabel = labelForBusinessType(businessType)

  // The header is `fixed` on mobile (see render below) so it stays put while
  // scrolling instead of moving with the page. Fixed removes it from normal
  // flow, so this measures its real (variable) height to reserve matching
  // space below it — the spacer only renders on mobile (`lg:hidden`), since
  // desktop keeps the header in normal flow via `lg:sticky`.
  const headerRef = useRef(null)
  const [mobileHeaderHeight, setMobileHeaderHeight] = useState(0)
  useEffect(() => {
    const el = headerRef.current
    if (!el) return undefined
    const updateHeight = () => setMobileHeaderHeight(el.offsetHeight)
    updateHeight()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateHeight)
      return () => window.removeEventListener('resize', updateHeight)
    }
    const observer = new ResizeObserver(updateHeight)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const showPosLiveIndicator = useMemo(() => {
    const normalizedBusiness = String(businessTypeLabel || '').toLowerCase()
    const isPosBusiness = normalizedBusiness.includes('restaurant') || normalizedBusiness.includes('retail') || normalizedBusiness.includes('pos')
    const isPosRoute = POS_STATUS_ROUTES.has(location.pathname) || location.pathname.startsWith('/app/restaurant-')
    return isPosBusiness || isPosRoute
  }, [businessTypeLabel, location.pathname])
  const posHasIssue = Boolean(!online || isBlocked || isTrialExpired)

  useEffect(() => {
    function handleOnline() {
      setOnline(true)
    }
    function handleOffline() {
      setOnline(false)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])
  const profileSummary = useMemo(
    () => {
      const planStatus = isTrialExpired ? 'expired' : userDoc?.planStatus || 'trial'
      const roleValue = String(role || 'owner').trim() || 'owner'
      const roleLabel = `${roleValue.charAt(0).toUpperCase()}${roleValue.slice(1)}`
      const displayProfile = resolveProfileDisplay({
        firebaseUser,
        userDoc,
        preferenceProfile: profile,
      })
      console.log('[Profile Display] auth email', displayProfile.authEmail)
      console.log('[Profile Display] user doc email', displayProfile.userDocEmail)
      console.log('[Profile Display] final display email', displayProfile.displayEmail)
      console.log('[Profile Display] final display name', displayProfile.displayName)
      console.log('[User Profile] fullName', displayProfile.fullName)
      console.log('[User Profile] displayName', displayProfile.rawDisplayName || displayProfile.displayName)
      console.log('[User Profile] profile source', displayProfile.profileSource)
      return {
        displayName: displayProfile.displayName,
        displayEmail: displayProfile.displayEmail,
        roleLabel,
        emailVerified: Boolean(firebaseUser?.emailVerified || userDoc?.emailVerified),
        workspaceName: resolveWorkspaceName({
          accountData: userDoc,
          userId: firebaseUser?.uid,
          fallback: profile.companyName || 'Nexora Workspace',
        }),
        planStatus,
        accessLabel: buildAccessLabel({ isTrialActive, isTrialExpired, trialDaysRemaining, trialEndsAt, plan, planStatus }),
        packageName: packageNameForPlan(plan),
      }
    },
    [
      firebaseUser?.displayName,
      firebaseUser?.email,
      firebaseUser?.uid,
      isTrialActive,
      isTrialExpired,
      plan,
      profile.companyName,
      profile.email,
      profile.ownerName,
      role,
      trialDaysRemaining,
      trialEndsAt,
      userDoc,
    ],
  )

  const handleLogout = useCallback(
    async (close) => {
      if (busy) return
      console.warn('[AUTO LOGOUT TRACE]', {
        file: 'src/crm/components/navbar/TopNav.jsx',
        function: 'handleLogout',
        reason: 'user_clicked_topnav_logout',
        route: window.location.pathname,
        uid: firebaseUser?.uid,
        email: firebaseUser?.email,
        time: new Date().toISOString(),
        stack: new Error().stack,
      })
      const ok = await logout()
      close()
      if (ok) {
        setToast('Logged out successfully')
        window.setTimeout(() => setToast(null), 1800)
        navigate('/login', { replace: true })
      }
    },
    [busy, firebaseUser?.email, firebaseUser?.uid, logout, navigate],
  )

  return (
    <>
      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}
      <header
        ref={headerRef}
        className="fixed inset-x-0 top-0 z-40 w-full px-3 pt-3 print:hidden sm:px-5 lg:sticky lg:inset-x-auto lg:px-6"
      >
        <div className="workspace-fluid-container mx-auto min-w-0 rounded-[1.35rem] border border-white/70 bg-white/[0.94] shadow-[0_16px_48px_-40px_rgba(15,23,42,0.45)] backdrop-blur-sm transition-colors duration-200 dark:border-slate-800 dark:bg-slate-950/90">
          <div className="flex min-h-[64px] min-w-0 items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4">
          <button
            type="button"
            className="focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10 lg:hidden"
            onClick={onOpenSidebar}
            aria-label="Open sidebar"
          >
            <span className="flex h-4 w-5 flex-col items-center justify-center gap-1.5">
              <span className="block h-0.5 w-5 rounded-full bg-current" />
              <span className="block h-0.5 w-5 rounded-full bg-current" />
            </span>
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-2.5 md:hidden">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-violet-600 text-sm font-black text-white shadow-sm shadow-sky-500/30">
              N
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[15px] font-black tracking-tight text-slate-900 dark:text-white">Nexora</p>
              <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{businessTypeLabel || 'Workspace'}</p>
            </div>
          </div>

          <div className="hidden min-w-0 flex-1 items-center gap-2 lg:flex">
            <CloudSyncButton />
            {isTrialActive ? (
              <div className="inline-flex h-10 items-center gap-2 rounded-xl border border-amber-200/60 bg-amber-50/80 px-3.5 text-xs font-bold text-amber-700 shadow-sm backdrop-blur-sm">
                <HiOutlineCalendarDays className="h-4 w-4" />
                <span className="hidden sm:inline">{profileSummary.accessLabel}</span>
                <span className="inline-flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              </div>
            ) : isTrialExpired ? (
              <div className="inline-flex h-10 items-center gap-2 rounded-xl border border-rose-200/60 bg-rose-50/80 px-3.5 text-xs font-bold text-rose-700 shadow-sm backdrop-blur-sm">
                <HiOutlineCalendarDays className="h-4 w-4" />
                <span className="hidden sm:inline">{profileSummary.accessLabel}</span>
              </div>
            ) : (
              <div className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200/60 bg-emerald-50/80 px-3.5 text-xs font-bold text-emerald-700 shadow-sm backdrop-blur-sm">
                <HiOutlineCalendarDays className="h-4 w-4" />
                <span className="hidden sm:inline">{profileSummary.accessLabel}</span>
              </div>
            )}
          </div>

          <div className="ml-auto flex min-w-0 shrink-0 items-center justify-end gap-1.5 sm:gap-2">
            <Button
              variant="subtle"
              className="hidden h-11 shrink-0 rounded-2xl px-4 text-sm font-extrabold lg:inline-flex"
              onClick={() => goToWorkspace(navigate, location)}
              type="button"
            >
              Back to Workspace
            </Button>
            <Button
              variant="subtle"
              className="hidden h-11 shrink-0 rounded-2xl px-4 text-sm font-extrabold xl:inline-flex"
              onClick={onSwitchProduct}
              type="button"
            >
              <span className="nexora-hd-icon h-8 w-8 rounded-xl border-cyan-200 bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-600 shadow-cyan-500/25">
                <HiOutlineSquares2X2 className="h-4 w-4" />
              </span>
              Switch Product
            </Button>
            {showPosLiveIndicator ? <PosLiveIndicator issue={posHasIssue} /> : null}
            <NotificationBell enabled={notifications.enabled} />

            <Dropdown
              panelClassName="w-80 p-2"
              trigger={() => (
                <button
                  className="inline-flex min-w-0 items-center gap-2.5 rounded-2xl border border-slate-200/60 bg-white/80 px-2 py-1.5 shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-slate-300 hover:bg-white hover:shadow-md active:scale-[0.98]"
                  type="button"
                  aria-label="Open profile menu"
                >
                  {profile.avatarDataUrl ? (
                    <img src={profile.avatarDataUrl} alt="" className="h-9 w-9 shrink-0 rounded-2xl object-cover ring-2 ring-slate-100" />
                  ) : (
                    <Avatar name={profileSummary.displayName} className="h-9 w-9 shrink-0 rounded-2xl ring-2 ring-slate-100" />
                  )}
                  <div className="hidden max-w-[14rem] min-w-0 text-left xl:block 2xl:max-w-[16rem]">
                    <p className="truncate text-[13px] font-bold text-slate-950">
                      {profileSummary.displayName}
                    </p>
                    <p className="truncate text-[11px] font-semibold text-slate-500">
                      {profileSummary.roleLabel}
                    </p>
                  </div>
                </button>
              )}
            >
              {({ close }) => (
                <div>
                  <div className="rounded-[1.15rem] border border-slate-200/80 bg-white/80 p-3 shadow-sm">
                    <div className="flex min-w-0 items-center gap-3">
                      {profile.avatarDataUrl ? (
                        <img src={profile.avatarDataUrl} alt="" className="h-12 w-12 shrink-0 rounded-2xl object-cover shadow-sm" />
                      ) : (
                        <Avatar name={profileSummary.displayName} className="h-12 w-12 shrink-0 rounded-2xl" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">{profileSummary.displayName}</p>
                        <p className="truncate text-xs font-semibold capitalize text-slate-700">{profileSummary.roleLabel}</p>
                        <p className="truncate text-xs text-slate-500">{profileSummary.displayEmail}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs">
                      <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                        <span className="text-slate-500">Email status</span>
                        <EmailVerificationBadge verified={profileSummary.emailVerified} />
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                        <span className="text-slate-500">Package status</span>
                        <span className="truncate font-semibold text-slate-900">{profileSummary.accessLabel}</span>
                      </div>
                      <button
                        type="button"
                        className="focus-ring flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:from-blue-700 hover:to-violet-700"
                        onClick={() => {
                          close()
                          navigate('/upgrade-business', { state: { fromUpgradeBusiness: true } })
                        }}
                      >
                        Upgrade Plan
                      </button>
                      <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                        <span className="text-slate-500">Workspace</span>
                        <span className="truncate font-semibold text-slate-900">{profileSummary.workspaceName}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                        <span className="text-slate-500">Role</span>
                        <span className="truncate font-semibold capitalize text-slate-900">{role || 'owner'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="my-2 h-px bg-slate-200/70 dark:bg-white/10" />
                  <button
                    className="focus-ring flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-white/70 dark:text-slate-100 dark:hover:bg-white/10"
                    onClick={() => {
                      close()
                      navigate('/app/settings#profile-settings')
                    }}
                    type="button"
                  >
                    <span className="nexora-hd-icon h-7 w-7 rounded-xl border-slate-300 bg-gradient-to-br from-slate-700 via-slate-900 to-indigo-950 shadow-slate-500/25">
                      <HiOutlineCog6Tooth className="h-4 w-4" />
                    </span>
                    Profile Settings
                  </button>
                  <div className="my-1 h-px bg-white/30 dark:bg-white/10" />
                  <button
                    className="focus-ring flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-600 hover:bg-rose-500/10 dark:text-rose-300"
                    onClick={() => handleLogout(close)}
                    disabled={busy}
                    type="button"
                  >
                    <span className="nexora-hd-icon h-7 w-7 rounded-xl border-rose-200 bg-gradient-to-br from-rose-500 via-pink-600 to-fuchsia-700 shadow-rose-500/25">
                      <HiOutlineArrowRightOnRectangle className="h-4 w-4" />
                    </span>
                    {busy ? 'Logging out…' : 'Logout'}
                  </button>
                </div>
              )}
            </Dropdown>
          </div>
          </div>
          <div className="px-3 pb-2.5 md:hidden">
            <GlobalSearch />
          </div>
        </div>
      </header>
      {/* Reserves the space the fixed mobile header would otherwise cover — see headerRef effect above. Desktop keeps its normal sticky flow via lg:sticky, so no spacer needed there. */}
      <div className="lg:hidden" style={{ height: mobileHeaderHeight }} aria-hidden="true" />
      <MobileBottomNav />
    </>
  )
}

export default memo(TopNav)
