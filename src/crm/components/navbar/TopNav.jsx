import {
  HiOutlineArrowRightOnRectangle,
  HiOutlineCog6Tooth,
  HiOutlineSquares2X2,
} from 'react-icons/hi2'
import Avatar from '../ui/Avatar.jsx'
import Badge from '../ui/Badge.jsx'
import Dropdown from '../ui/Dropdown.jsx'
import Button from '../ui/Button.jsx'
import { memo, useCallback, useMemo, useState } from 'react'
import { usePreferences } from '../../hooks/usePreferences.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useUser } from '../../hooks/useUser.js'
import { useNavigate } from 'react-router-dom'
import NotificationBell from '../notifications/NotificationBell.jsx'
import BranchSwitcher from '../system/BranchSwitcher.jsx'
import OfflineStatus from '../system/OfflineStatus.jsx'
import GlobalSearch from '../system/GlobalSearch.jsx'
import { packageNameForPlan } from '../../data/moduleAccess.js'
import { resolveWorkspaceName } from '../../../lib/workspaceName.js'

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
    <div className="glass fixed right-4 top-4 z-[60] w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-800 dark:text-emerald-200">
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

function TopNav({ onOpenSidebar, onSwitchProduct }) {
  const { notifications, profile } = usePreferences()
  const { logout, busy } = useAuth()
  const { firebaseUser, userDoc, plan, role, businessType, isTrialActive, isTrialExpired, trialDaysRemaining, trialEndsAt } = useUser()
  const navigate = useNavigate()
  const [toast, setToast] = useState(null)
  const profileSummary = useMemo(
    () => {
      const planStatus = isTrialExpired ? 'expired' : userDoc?.planStatus || 'trial'
      return {
        displayName: userDoc?.fullName || userDoc?.name || profile.ownerName || firebaseUser?.displayName || 'Nexora User',
        displayEmail: userDoc?.email || profile.email || firebaseUser?.email || 'No email',
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
      trialDaysRemaining,
      trialEndsAt,
      userDoc,
    ],
  )

  const handleLogout = useCallback(
    async (close) => {
      if (busy) return
      const ok = await logout()
      close()
      if (ok) {
        setToast('Logged out successfully')
        window.setTimeout(() => setToast(null), 1800)
        navigate('/login', { replace: true })
      }
    },
    [busy, logout, navigate],
  )

  return (
    <>
      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}
      <header className="sticky top-0 z-40 w-full px-3 pt-3 print:hidden sm:px-5 lg:px-6">
        <div className="mx-auto flex min-h-[64px] w-full max-w-[1440px] min-w-0 flex-wrap items-center gap-2 rounded-[1.35rem] border border-white/70 bg-white/[0.94] px-3 py-2.5 shadow-[0_16px_48px_-40px_rgba(15,23,42,0.45)] backdrop-blur-sm transition-colors duration-200 dark:border-slate-800 dark:bg-slate-950/90 sm:gap-3 sm:px-4 xl:flex-nowrap">
          <button
            type="button"
            className="focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/10 lg:hidden"
            onClick={onOpenSidebar}
            aria-label="Open sidebar"
          >
            <span className="block h-4 w-5">
              <span className="block h-0.5 w-5 rounded bg-current" />
              <span className="mt-1.5 block h-0.5 w-5 rounded bg-current opacity-80" />
              <span className="mt-1.5 block h-0.5 w-5 rounded bg-current opacity-70" />
            </span>
          </button>

          <div className="order-3 hidden w-full min-w-0 lg:block xl:order-none xl:w-auto xl:flex-[0_1_320px] 2xl:flex-[0_1_360px]">
            <GlobalSearch />
          </div>

          <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:gap-2 xl:flex-none">
            <div className="hidden shrink-0 items-center gap-2 2xl:flex">
              <OfflineStatus />
              <BranchSwitcher />
            </div>
            <Badge
              variant="info"
              className="hidden h-9 max-w-[18rem] shrink-0 items-center truncate px-3 font-semibold lg:inline-flex"
              title={`Current Business: ${businessType}`}
            >
              <span className="truncate">Current Business: {businessType}</span>
            </Badge>
            <Badge
              variant={isTrialExpired ? 'danger' : isTrialActive ? 'warning' : 'success'}
              className="hidden h-9 max-w-[16rem] shrink-0 items-center truncate px-3 font-semibold lg:inline-flex"
              title={profileSummary.accessLabel}
            >
              <span className="truncate">{profileSummary.accessLabel}</span>
            </Badge>
            <Button
              variant="subtle"
              className="hidden h-10 shrink-0 rounded-2xl px-3 text-xs lg:inline-flex"
              onClick={() => {
                console.log('[Back To Workspace]', { source: 'topbar', route: '/workspace' })
                navigate('/workspace')
              }}
              type="button"
            >
              Back to Workspace
            </Button>
            <Button
              variant="subtle"
              className="hidden h-10 shrink-0 rounded-2xl px-3 text-xs xl:inline-flex"
              onClick={onSwitchProduct}
              type="button"
            >
              <HiOutlineSquares2X2 className="h-4 w-4" />
              Switch Product
            </Button>
            <NotificationBell enabled={notifications.enabled} />

            <Dropdown
              panelClassName="w-80 p-2"
              trigger={() => (
                <button
                  className="focus-ring inline-flex min-w-0 items-center gap-2 rounded-2xl border border-transparent px-1.5 py-1.5 transition hover:border-slate-200 hover:bg-white hover:shadow-sm dark:hover:bg-white/10 sm:px-2"
                  type="button"
                  aria-label="Open profile menu"
                >
                  {profile.avatarDataUrl ? (
                    <img src={profile.avatarDataUrl} alt="" className="h-9 w-9 shrink-0 rounded-2xl object-cover shadow-sm" />
                  ) : (
                    <Avatar name={profileSummary.displayName} className="h-9 w-9 shrink-0 rounded-2xl" />
                  )}
                  <div className="hidden max-w-[10rem] min-w-0 text-left xl:block">
                    <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                      {profileSummary.displayName}
                    </p>
                    <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-300">
                      {profileSummary.workspaceName}
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
                    <HiOutlineCog6Tooth className="h-4 w-4" />
                    Profile Settings
                  </button>
                  <div className="my-1 h-px bg-white/30 dark:bg-white/10" />
                  <button
                    className="focus-ring flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-600 hover:bg-rose-500/10 dark:text-rose-300"
                    onClick={() => handleLogout(close)}
                    disabled={busy}
                    type="button"
                  >
                    <HiOutlineArrowRightOnRectangle className="h-4 w-4" />
                    {busy ? 'Logging out…' : 'Logout'}
                  </button>
                </div>
              )}
            </Dropdown>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[1440px] px-0 pb-3 pt-2 md:hidden">
          <GlobalSearch className="max-w-none" />
        </div>
      </header>
    </>
  )
}

export default memo(TopNav)
