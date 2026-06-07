import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  HiOutlineArrowRight,
  HiOutlineBell,
  HiOutlineBriefcase,
  HiOutlineBuildingLibrary,
  HiOutlineBuildingOffice2,
  HiOutlineChartBarSquare,
  HiOutlineCheckCircle,
  HiOutlineChatBubbleLeftRight,
  HiOutlineChevronDown,
  HiOutlineChevronRight,
  HiOutlineCog6Tooth,
  HiOutlineGlobeAlt,
  HiOutlineHomeModern,
  HiOutlineInformationCircle,
  HiOutlineMagnifyingGlass,
  HiOutlineBars3,
  HiOutlinePlus,
  HiOutlineSquares2X2,
  HiOutlineUserGroup,
  HiOutlineUsers,
  HiOutlineXMark,
} from 'react-icons/hi2'
import { FiLogOut } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { doc, getDoc, getDocFromCache, getDocFromServer, serverTimestamp, setDoc } from 'firebase/firestore'
import logoUrl from '../../assets/logo/nexora-logo.svg'
import useAuth from '../../context/useAuth.js'
import { auth, db } from '../../lib/firebase.js'
import PageLoader from '../../crm/components/ui/PageLoader.jsx'
import { workspacePermissionDefaults } from '../../lib/roles.js'
import { normalizeWorkspaceName, resolveWorkspaceName, saveStoredWorkspaceName } from '../../lib/workspaceName.js'
import {
  businessWorkspaceCatalog,
  businessWorkspaceForId,
  businessWorkspaceForType,
  businessTypes,
  getRecommendedModules,
  isDeveloperOwnerAccount,
  labelForBusinessModule,
  normalizeBusinessType,
  packageNameForPlan,
} from '../../crm/data/moduleAccess.js'
import { saveSelectedWorkspace } from '../../crm/lib/workspaceSession.js'
import { clientSafeMessage, reportTechnicalError } from '../../lib/errorHandler.js'
import { sendCustomVerificationEmail } from '../../lib/emailVerificationService.js'
import { trackAnalyticsEvent } from '../../lib/analyticsTracking.js'
import { VERIFY_EMAIL_ROUTE, getAuthRouteState, isUserCustomVerified, shouldShowWorkspaceSelection } from '../../lib/authRouteState.js'
import { resolveProfileDisplay } from '../../lib/profileDisplay.js'

import { clearAllUserCache } from '../../lib/authIsolation.js'

const workspaceIconMap = {
  'General CRM': { icon: HiOutlineUserGroup, iconTone: 'bg-blue-50 text-blue-600', color: 'bg-blue-600' },
  'Retail / POS': { icon: HiOutlineBriefcase, iconTone: 'bg-orange-50 text-orange-500', color: 'bg-amber-500' },
  'School ERP': { icon: HiOutlineBuildingLibrary, iconTone: 'bg-emerald-50 text-emerald-600', color: 'bg-emerald-500' },
  'Property ERP': { icon: HiOutlineHomeModern, iconTone: 'bg-violet-50 text-violet-600', color: 'bg-violet-600' },
  'Restaurant POS': { icon: HiOutlineBuildingOffice2, iconTone: 'bg-rose-50 text-rose-600', color: 'bg-rose-500' },
  'WhatsApp CRM': { icon: HiOutlineChatBubbleLeftRight, iconTone: 'bg-green-50 text-green-600', color: 'bg-green-500' },
}

const moduleAccess = businessWorkspaceCatalog.map((workspace) => ({
  name: workspace.title,
  type: workspace.type,
  detail: workspace.description,
  ...(workspaceIconMap[workspace.type] || workspaceIconMap['General CRM']),
  active: true,
  route: workspace.route,
}))

const workspaces = businessWorkspaceCatalog.map((workspace) => ({
  ...workspace,
  name: workspace.title,
  displayId: workspace.id.toUpperCase(),
  plan: 'Current Package',
  planTone: 'bg-blue-50 text-blue-700',
  status: 'Available',
  statusTone: 'bg-emerald-50 text-emerald-700',
  active: true,
  ...(workspaceIconMap[workspace.type] || workspaceIconMap['General CRM']),
}))

const languageOptions = ['English', 'Urdu', 'Arabic', 'Hindi', 'Bengali']
const regionOptions = ['Pakistan', 'India', 'Bangladesh', 'Middle East', 'Europe']
const currencyOptions = ['PKR', 'INR', 'BDT', 'AED', 'SAR', 'USD', 'EUR']
const CRM_TRIAL_DAYS = 7
const CRM_DASHBOARD_ROUTE = '/app/dashboard'

function onboardingErrorMessage(error) {
  const raw = String(error?.message || error || '')
  const code = String(error?.code || '')
  if (/permission-denied|missing or insufficient permissions/i.test(`${code} ${raw}`)) {
    return 'We could not create your first workspace with the current account session. Please refresh and try again, or sign in again.'
  }
  return clientSafeMessage(error, 'Could not create workspace right now.', { context: 'Workspace onboarding' })
}

const featureStrip = [
  {
    title: 'Centralized Access',
    text: 'Access all your workspaces from one place',
    icon: HiOutlineUsers,
  },
  {
    title: 'Secure & Private',
    text: 'Your data is 100% secure and private',
    icon: HiOutlineCog6Tooth,
  },
  {
    title: 'Multiple Modules',
    text: 'Use only the modules you need',
    icon: HiOutlineSquares2X2,
  },
  {
    title: 'Real-time Sync',
    text: 'All data is synced in real-time',
    icon: HiOutlineChartBarSquare,
  },
]

const sampleNotifications = [
  {
    title: 'CRM workspace active',
    text: 'Nexora CRM Workspace is ready to use.',
    tone: 'text-emerald-600 bg-emerald-50',
    icon: HiOutlineCheckCircle,
  },
  {
    title: 'Trial expires in 7 days',
    text: 'Your workspace trial period is 7 days from activation.',
    tone: 'text-amber-600 bg-amber-50',
    icon: HiOutlineBell,
  },
  {
    title: 'Other modules coming soon',
    text: 'School ERP, Property ERP, POS, and more will be available soon.',
    tone: 'text-blue-600 bg-blue-50',
    icon: HiOutlineInformationCircle,
  },
]

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function firstCleanString(...values) {
  for (const value of values) {
    if (Array.isArray(value)) {
      const nested = firstCleanString(...value)
      if (nested) return nested
      continue
    }
    const cleaned = cleanString(value)
    if (cleaned) return cleaned
  }
  return ''
}

function withTimeout(promise, ms, label) {
  let timeoutId = null
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = globalThis.setTimeout(() => {
      const error = new Error(`Timed out loading ${label}`)
      error.code = 'server-read-timeout'
      reject(error)
    }, ms)
  })

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) globalThis.clearTimeout(timeoutId)
  })
}

function missingDocSnapshot(path) {
  return {
    exists: () => false,
    data: () => null,
    id: path.split('/').pop() || '',
  }
}

async function getFreshDoc(ref, path) {
  try {
    const snap = await withTimeout(getDocFromServer(ref), 6000, path)
    console.log('[Workspace Read] server success', { path, exists: snap.exists() })
    return snap
  } catch (error) {
    console.warn('[Workspace Read] server fallback', {
      path,
      code: error?.code || '',
      message: error?.message || String(error || ''),
    })
    try {
      const snap = await withTimeout(getDocFromCache(ref), 1500, `${path} cache`)
      console.log('[Workspace Read] cache fallback result', { path, exists: snap.exists() })
      return snap
    } catch (cacheError) {
      console.warn('[Workspace Read] cache fallback failed', {
        path,
        code: cacheError?.code || '',
        message: cacheError?.message || String(cacheError || ''),
      })
      return missingDocSnapshot(path)
    }
  }
}

function resolveSavedWorkspaceModule({ accountData, workspaceData, onboardingCompleted }) {
  const workspaceIdSource = firstCleanString(workspaceData?.selectedWorkspace, accountData?.selectedWorkspace)
  const workspaceFromId = workspaceIdSource ? businessWorkspaceForId(workspaceIdSource) : null
  const allowedBusinessTypeSource = firstCleanString(workspaceData?.allowedBusinessTypes, accountData?.allowedBusinessTypes)
  const businessTypeSource = firstCleanString(
    workspaceFromId?.type,
    workspaceData?.primaryBusinessType,
    accountData?.primaryBusinessType,
    workspaceData?.selectedBusinessType,
    workspaceData?.currentBusinessType,
    workspaceData?.businessType,
    accountData?.selectedBusinessType,
    accountData?.currentBusinessType,
    accountData?.businessType,
    allowedBusinessTypeSource,
  )
  const businessType = businessTypeSource ? normalizeBusinessType(businessTypeSource) : ''
  const catalogWorkspace = workspaceFromId || (businessType ? businessWorkspaceForType(businessType) : null)
  const selectedWorkspace = workspaceIdSource || cleanString(catalogWorkspace?.id)
  const allowedBusinessTypes = Array.from(new Set([
    businessType,
    ...(Array.isArray(workspaceData?.allowedBusinessTypes) ? workspaceData.allowedBusinessTypes : []),
    ...(Array.isArray(accountData?.allowedBusinessTypes) ? accountData.allowedBusinessTypes : []),
  ].filter(Boolean).map(normalizeBusinessType)))
  const complete = Boolean(businessType && selectedWorkspace)
  const recoveredFromModuleFields = complete && !onboardingCompleted

  return {
    businessType,
    selectedWorkspace,
    allowedBusinessTypes,
    complete,
    stale: !complete,
    source: !complete && !onboardingCompleted
      ? 'onboarding_incomplete'
      : recoveredFromModuleFields
        ? 'recovered_business_fields'
        : workspaceFromId
          ? 'selectedWorkspace'
          : businessTypeSource === allowedBusinessTypeSource
            ? 'allowedBusinessTypes'
            : businessTypeSource
              ? 'businessType'
              : 'missing_saved_module',
  }
}

function onboardingModuleSelection(workspaceOrType) {
  const catalogWorkspace = typeof workspaceOrType === 'string'
    ? businessWorkspaceForType(workspaceOrType)
    : businessWorkspaceForType(workspaceOrType?.type || workspaceOrType?.id || workspaceOrType?.title)
  const businessTypeLabel = normalizeBusinessType(catalogWorkspace.type)
  const businessTypeId = catalogWorkspace.id
  const enabledModules = getRecommendedModules(businessTypeLabel)

  return {
    businessTypeLabel,
    businessTypeId,
    selectedWorkspace: businessTypeId,
    enabledModules,
    selectedFeatures: enabledModules.map((key) => labelForBusinessModule(key, businessTypeLabel)),
    redirectTarget: catalogWorkspace.route || CRM_DASHBOARD_ROUTE,
  }
}

function timestampToDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value?.toDate === 'function') return value.toDate()
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 86400000)
}

function formatDate(value) {
  const date = timestampToDate(value)
  if (!date) return 'Not set'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

function initialsFor(name, email) {
  const source = cleanString(name) || cleanString(email) || 'Nexora User'
  const initials = source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
  return initials || 'NU'
}

function trialSourceDate(workspaceData, accountData, user) {
  return (
    workspaceData?.trialStart ||
    workspaceData?.trialStartedAt ||
    accountData?.trialStart ||
    accountData?.trialStartedAt ||
    workspaceData?.createdAt ||
    accountData?.createdAt ||
    user?.metadata?.creationTime ||
    null
  )
}

function resolveTrialEnd(workspaceData, accountData, user) {
  const explicitEnd = workspaceData?.trialEndsAt || accountData?.trialEndsAt
  if (explicitEnd) return explicitEnd
  const start = timestampToDate(trialSourceDate(workspaceData, accountData, user))
  return start ? addDays(start, CRM_TRIAL_DAYS) : addDays(new Date(), CRM_TRIAL_DAYS)
}

function trialCountdown(value, nowMs) {
  const end = timestampToDate(value)
  if (!end) {
    return { expired: false, label: 'Trial: 7 days left', detail: '7 days left', daysLeft: CRM_TRIAL_DAYS }
  }
  const diffMs = end.getTime() - nowMs
  if (diffMs <= 0) return { expired: true, label: 'Trial: expired', detail: `Expired on ${formatDate(end)}`, daysLeft: 0 }
  if (diffMs < 86400000) return { expired: false, label: 'Trial: expires today', detail: `Expires today · ${formatDate(end)}`, daysLeft: 0 }
  const daysLeft = Math.ceil(diffMs / 86400000)
  return { expired: false, label: `Trial: ${daysLeft} days left`, detail: `${daysLeft} days left · ends ${formatDate(end)}`, daysLeft }
}

function VerificationBadge({ verified, compact = false }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-bold ${
        compact ? 'text-[10px]' : 'text-[11px]'
      } ${verified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}
    >
      {verified ? <HiOutlineCheckCircle className="h-3.5 w-3.5" /> : null}
      {verified ? 'Verified ✅' : 'Not Verified ⚠️'}
    </span>
  )
}

function SidebarItem({ icon: Icon, label, active = false, muted = false, onClick, collapsed = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`flex h-11 w-full items-center rounded-lg px-3 text-left text-[13px] font-semibold transition ${
        collapsed ? 'justify-center' : 'justify-between'
      } ${
        active
          ? 'bg-blue-600 text-white shadow-[0_10px_24px_-14px_rgba(37,99,235,0.85)]'
          : muted
            ? 'text-slate-300 hover:bg-white/7 hover:text-white'
            : 'text-slate-200 hover:bg-white/7 hover:text-white'
      }`}
    >
      <span className={`flex min-w-0 items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
        <Icon className="h-[18px] w-[18px] shrink-0" />
        {!collapsed && <span className="truncate">{label}</span>}
      </span>
      {!collapsed && <HiOutlineChevronRight className="h-4 w-4 shrink-0 opacity-80" />}
    </button>
  )
}

function NotificationDropdown({ notifications, onClose }) {
  return (
    <div className="absolute right-0 top-full z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-slate-200 bg-white p-3 text-slate-900 shadow-xl shadow-slate-950/10">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
        <div>
          <p className="text-sm font-bold text-slate-950">Notifications</p>
          <p className="mt-0.5 text-xs text-slate-500">{notifications.length} workspace updates</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          aria-label="Close notifications"
        >
          <HiOutlineXMark className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-2 space-y-1">
        {notifications.map((notification) => {
          const Icon = notification.icon
          return (
            <div key={notification.title} className="flex items-start gap-3 rounded-lg px-2 py-2 transition hover:bg-slate-50">
              <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${notification.tone}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-slate-900">{notification.title}</span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-500">{notification.text}</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WorkspaceCard({ workspace, index, emailVerified, selected, saving, onSelect }) {
  const navigate = useNavigate()
  const Icon = workspace.icon
  const disabled = !workspace.active

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: index * 0.03, ease: 'easeOut' }}
      className={`rounded-lg border bg-white p-4 shadow-[0_12px_32px_-26px_rgba(15,23,42,0.42)] ${
        selected ? 'border-blue-500 ring-1 ring-blue-100' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${workspace.iconTone}`}>
            <Icon className="h-7 w-7" />
          </span>
          <div className="min-w-0 pt-0.5">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h2 className="truncate text-[15px] font-bold leading-5 text-slate-950">{workspace.name}</h2>
              {selected && emailVerified ? <VerificationBadge verified compact /> : null}
            </div>
            <p className="mt-1 text-xs text-slate-500">Business type: {workspace.type}</p>
            {workspace.plan ? (
              <p className="mt-1 text-xs text-slate-500">
                Plan:{' '}
                <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${workspace.planTone}`}>
                  {workspace.plan}
                </span>
              </p>
            ) : null}
            {workspace.trialLabel ? (
              <p className={`mt-1 text-xs font-semibold ${workspace.trialExpired ? 'text-red-700' : 'text-blue-700'}`}>
                {workspace.trialLabel}
              </p>
            ) : null}
          </div>
        </div>
        {selected ? (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
            <HiOutlineArrowRight className="h-4 w-4 rotate-[-45deg]" />
          </span>
        ) : null}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-xs font-medium text-slate-500">
        <span className="flex items-center gap-1.5">
          <HiOutlineChartBarSquare className="h-4 w-4" />
          Status
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${workspace.statusTone}`}>
            {workspace.status}
          </span>
        </span>
      </div>

      <button
        type="button"
        disabled={disabled || saving}
        onClick={() => onSelect?.(workspace)}
        className={`mt-4 flex h-10 w-full items-center justify-center gap-3 rounded-lg border text-[13px] font-bold transition ${
          workspace.active
            ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
            : 'cursor-not-allowed border-slate-200 bg-white text-slate-700 opacity-70'
        }`}
      >
        {saving ? 'Saving...' : selected ? 'Enter Workspace' : 'Select Business'}
        <HiOutlineArrowRight className="h-4 w-4" />
      </button>
      {selected ? (
        <button
          type="button"
          onClick={() => navigate('/upgrade-business', { state: { fromUpgradeBusiness: true } })}
          className="mt-2 flex h-10 w-full items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-[13px] font-bold text-white shadow-sm transition hover:from-blue-700 hover:to-violet-700"
        >
          Upgrade Plan
        </button>
      ) : null}
    </motion.article>
  )
}

function WorkspaceListRow({ workspace, index, emailVerified, selected, saving, onSelect }) {
  const Icon = workspace.icon
  const disabled = !workspace.active

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.025, ease: 'easeOut' }}
      className={`flex flex-wrap items-center gap-3 rounded-lg border bg-white px-4 py-3 shadow-[0_12px_32px_-26px_rgba(15,23,42,0.42)] transition sm:flex-nowrap sm:gap-4 ${
        selected ? 'border-blue-500 ring-1 ring-blue-100' : 'border-slate-200'
      }`}
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${workspace.iconTone}`}>
        <Icon className="h-6 w-6" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-bold leading-5 text-slate-950">{workspace.name}</h3>
          {selected && emailVerified ? <VerificationBadge verified compact /> : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-500">Business type: {workspace.type}</p>
      </div>

      <div className="flex shrink-0 flex-col items-start gap-1.5 sm:w-[150px]">
        {workspace.plan ? (
          <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${workspace.planTone}`}>{workspace.plan}</span>
        ) : null}
        <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${workspace.statusTone}`}>{workspace.status}</span>
      </div>

      <div className="hidden w-[150px] shrink-0 md:block">
        {workspace.trialLabel ? (
          <p className={`text-xs font-semibold ${workspace.trialExpired ? 'text-red-700' : 'text-blue-700'}`}>
            {workspace.trialLabel}
          </p>
        ) : (
          <p className="text-xs text-slate-400">—</p>
        )}
      </div>

      <button
        type="button"
        disabled={disabled || saving}
        onClick={() => onSelect?.(workspace)}
        className={`flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border px-4 text-[13px] font-bold transition ${
          workspace.active
            ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
            : 'cursor-not-allowed border-slate-200 bg-white text-slate-700 opacity-70'
        }`}
      >
        {saving ? 'Saving...' : selected ? 'Enter Workspace' : 'Open Module'}
        <HiOutlineArrowRight className="h-4 w-4" />
      </button>
    </motion.div>
  )
}

function CreateWorkspaceListRow({ disabled, message, onOpen }) {
  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 shadow-[0_12px_32px_-26px_rgba(15,23,42,0.42)] sm:flex-nowrap sm:gap-4 ${
        disabled ? 'border-slate-200 bg-white' : 'border-blue-100 bg-blue-50/35'
      }`}
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${disabled ? 'bg-slate-100 text-slate-400' : 'bg-blue-100 text-blue-600'}`}>
        <HiOutlinePlus className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-bold leading-5 text-slate-950">Create New Workspace</h3>
        <p className="mt-0.5 truncate text-xs text-slate-600">
          {message || (disabled ? 'Workspace creation is already in progress.' : 'Start a separate 7-day Nexora CRM trial workspace.')}
        </p>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onOpen}
        className={`flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border px-4 text-[13px] font-bold transition ${
          disabled
            ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
            : 'border-blue-600 bg-white text-blue-600 hover:bg-blue-600 hover:text-white'
        }`}
      >
        {disabled ? 'Creating...' : 'Create Workspace'}
        <HiOutlineArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}

function CreateWorkspaceCard({ disabled, message, onOpen }) {
  return (
    <article
      className={`rounded-lg border p-4 shadow-[0_12px_32px_-26px_rgba(15,23,42,0.42)] ${
        disabled ? 'border-slate-200 bg-white' : 'border-blue-100 bg-blue-50/35'
      }`}
    >
      <div className="flex min-h-[110px] items-center gap-4">
        <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${disabled ? 'bg-slate-100 text-slate-400' : 'bg-blue-100 text-blue-600'}`}>
          <HiOutlinePlus className="h-7 w-7" />
        </span>
        <div>
          <h2 className="text-[15px] font-bold text-slate-950">Create New Workspace</h2>
          <p className="mt-1.5 text-sm leading-5 text-slate-600">
            {message || (disabled ? 'Workspace creation is already in progress.' : 'Start a separate 7-day Nexora CRM trial workspace.')}
          </p>
          {message ? <p className="mt-2 text-xs font-bold text-amber-700">{message}</p> : null}
        </div>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={onOpen}
        className={`mt-4 flex h-10 w-full items-center justify-center gap-3 rounded-lg border text-[13px] font-bold transition ${
          disabled
            ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
            : 'border-blue-600 bg-white text-blue-600 hover:bg-blue-600 hover:text-white'
        }`}
      >
        {disabled ? 'Creating...' : 'Create Workspace'}
        <HiOutlineArrowRight className="h-4 w-4" />
      </button>
    </article>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2 last:border-b-0">
      <span className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">{label}</span>
      <span className="max-w-[210px] text-right text-sm font-semibold text-slate-800">{value}</span>
    </div>
  )
}

function ModalShell({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <motion.section
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-2xl shadow-slate-950/20"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-slate-950">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
          >
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>
        {children}
      </motion.section>
    </div>
  )
}

function FieldLabel({ label, children }) {
  return (
    <label className="block min-w-0">
      <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      {children}
    </label>
  )
}

function formInputClass() {
  return 'mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
}

function OnboardingModal({ creating, message, form, onChange, onCreate, onClose, canClose, businessTypeLocked = false }) {
  const rawBusinessType = cleanString(form.businessType)
  const businessType = rawBusinessType ? normalizeBusinessType(rawBusinessType) : ''
  const isSchoolErp = businessType === 'School ERP'
  const workspaceTitle = businessType ? (isSchoolErp ? 'Setup School ERP Workspace' : `Setup ${businessType} Workspace`) : 'Setup Workspace'
  const nameLabel = isSchoolErp ? 'School Name' : 'Company / Business Name'
  const namePlaceholder = isSchoolErp ? 'Your school name' : 'Your company name'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-3 py-4 backdrop-blur-sm sm:px-5">
      <motion.section
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl shadow-slate-950/25"
      >
        <div className="border-b border-slate-100 bg-slate-950 px-5 py-4 text-white sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-200">Workspace onboarding</p>
              <h2 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">{workspaceTitle}</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                Set up one {businessType || 'selected module'} workspace first. Your 7-day Basic trial starts when this is saved.
              </p>
            </div>
            {canClose ? (
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white"
                aria-label="Close onboarding"
              >
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldLabel label={nameLabel}>
              <input
                value={form.companyName}
                onChange={(event) => onChange('companyName', event.target.value)}
                className={formInputClass()}
                placeholder={namePlaceholder}
              />
            </FieldLabel>
            <FieldLabel label="Owner Name">
              <input
                value={form.ownerName}
                onChange={(event) => onChange('ownerName', event.target.value)}
                className={formInputClass()}
                placeholder="Owner full name"
              />
            </FieldLabel>
            <FieldLabel label="Business Type">
              <select
                value={form.businessType}
                onChange={(event) => onChange('businessType', event.target.value)}
                disabled={businessTypeLocked}
                className={`${formInputClass()} ${businessTypeLocked ? 'cursor-not-allowed bg-slate-100 text-slate-500' : ''}`}
              >
                <option value="" disabled>
                  Select business module
                </option>
                {businessTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </FieldLabel>
            <FieldLabel label="Country">
              <select value={form.country} onChange={(event) => onChange('country', event.target.value)} className={formInputClass()}>
                {regionOptions.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </FieldLabel>
            <FieldLabel label="Currency">
              <select value={form.currency} onChange={(event) => onChange('currency', event.target.value)} className={formInputClass()}>
                {currencyOptions.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </FieldLabel>
            <FieldLabel label="Preferred Language">
              <select value={form.language} onChange={(event) => onChange('language', event.target.value)} className={formInputClass()}>
                {languageOptions.map((language) => (
                  <option key={language} value={language}>
                    {language}
                  </option>
                ))}
              </select>
            </FieldLabel>
            <FieldLabel label="Phone">
              <input
                value={form.phone}
                onChange={(event) => onChange('phone', event.target.value)}
                className={formInputClass()}
                placeholder="+92 300 0000000"
              />
            </FieldLabel>
            <FieldLabel label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(event) => onChange('email', event.target.value)}
                className={formInputClass()}
                placeholder="owner@company.com"
              />
            </FieldLabel>
            <FieldLabel label="Address">
              <textarea
                value={form.address}
                onChange={(event) => onChange('address', event.target.value)}
                className="mt-1.5 min-h-[92px] w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 sm:col-span-2"
                placeholder="Office or business address"
              />
            </FieldLabel>
            {isSchoolErp ? (
              <>
                <FieldLabel label="Academic Year">
                  <input
                    value={form.academicYear}
                    onChange={(event) => onChange('academicYear', event.target.value)}
                    className={formInputClass()}
                    placeholder="2026-2027"
                  />
                </FieldLabel>
                <FieldLabel label="Classes Range">
                  <input
                    value={form.classesRange}
                    onChange={(event) => onChange('classesRange', event.target.value)}
                    className={formInputClass()}
                    placeholder="Nursery to Grade 10"
                  />
                </FieldLabel>
                <FieldLabel label="Monthly Fee Setup Optional">
                  <input
                    value={form.monthlyFeeSetup}
                    onChange={(event) => onChange('monthlyFeeSetup', event.target.value)}
                    className={formInputClass()}
                    placeholder="Example: 5000 PKR per month"
                  />
                </FieldLabel>
              </>
            ) : null}
          </div>

          {message ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
              {message}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs font-semibold leading-5 text-slate-500">
            Creates an active Basic trial workspace without demo data.
          </p>
          <button
            type="button"
            disabled={creating}
            onClick={onCreate}
            className="flex h-11 w-full items-center justify-center rounded-lg bg-blue-600 px-5 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-65 sm:w-auto"
          >
            {creating ? 'Creating...' : 'Create Workspace'}
          </button>
        </div>
      </motion.section>
    </div>
  )
}

function SettingsModal({
  profile,
  selectedLanguage,
  selectedRegion,
  workspaceNameDraft,
  workspaceNameSaving,
  workspaceNameMessage,
  onWorkspaceNameChange,
  onSaveWorkspaceName,
  onLanguageChange,
  onRegionChange,
  onLogout,
  loggingOut,
  onClose,
}) {
  return (
    <ModalShell title="Settings" onClose={onClose}>
      <div className="px-5 py-4">
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-extrabold text-white">
            {profile.initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-950">{profile.name}</p>
            <p className="truncate text-xs font-semibold text-slate-700">{profile.roleLabel}</p>
            <p className="truncate text-xs text-slate-500">{profile.email}</p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 px-3">
          <DetailRow label="Workspace" value={profile.workspaceName} />
          <DetailRow label="Plan" value={profile.planLabel} />
          <DetailRow label="Trial" value={profile.trialLabel} />
          <DetailRow label="Language" value={selectedLanguage} />
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Workspace / Company Name</span>
            <input
              value={workspaceNameDraft}
              onChange={(event) => onWorkspaceNameChange(event.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              placeholder="Workspace name"
            />
          </label>
          {workspaceNameMessage ? <p className="mt-2 text-xs font-bold text-blue-700">{workspaceNameMessage}</p> : null}
          <button
            type="button"
            disabled={workspaceNameSaving}
            onClick={onSaveWorkspaceName}
            className="mt-3 flex h-10 w-full items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-65"
          >
            {workspaceNameSaving ? 'Saving...' : 'Save Workspace Name'}
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Language</span>
            <select
              value={selectedLanguage}
              onChange={(event) => onLanguageChange(event.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              {languageOptions.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Region</span>
            <select
              value={selectedRegion}
              onChange={(event) => onRegionChange(event.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              {regionOptions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="button"
          disabled={loggingOut}
          onClick={onLogout}
          className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-65"
        >
          <FiLogOut className="h-4 w-4" />
          {loggingOut ? 'Logging out...' : 'Logout'}
        </button>
      </div>
    </ModalShell>
  )
}

export default function WorkspaceSelection() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [selectedLanguage, setSelectedLanguage] = useState('English')
  const [selectedRegion, setSelectedRegion] = useState('Pakistan')
  const [languageOpen, setLanguageOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [viewMode, setViewMode] = useState(() => {
    try {
      return window.localStorage.getItem('nexora_workspace_view_mode') === 'list' ? 'list' : 'grid'
    } catch {
      return 'grid'
    }
  })
  const [createOpen, setCreateOpen] = useState(false)
  const [createMessage, setCreateMessage] = useState('')
  const [creatingWorkspace, setCreatingWorkspace] = useState(false)
  const [onboardingForm, setOnboardingForm] = useState(() => ({
    companyName: '',
    ownerName: '',
    businessType: '',
    country: 'Pakistan',
    currency: 'PKR',
    phone: '',
    email: '',
    address: '',
    language: 'English',
    academicYear: '',
    classesRange: '',
    monthlyFeeSetup: '',
  }))
  const [workspaceView, setWorkspaceView] = useState('enter')
  const [accountData, setAccountData] = useState(null)
  const [workspaceData, setWorkspaceData] = useState(null)
  const [accountLoading, setAccountLoading] = useState(true)
  const [accountReadDone, setAccountReadDone] = useState(false)
  const [workspaceReadDone, setWorkspaceReadDone] = useState(false)
  const [workspaceNameDraft, setWorkspaceNameDraft] = useState('')
  const [workspaceNameSaving, setWorkspaceNameSaving] = useState(false)
  const [workspaceNameMessage, setWorkspaceNameMessage] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [verificationSending, setVerificationSending] = useState(false)
  const [verificationMessage, setVerificationMessage] = useState('')
  const [businessTypeSaving, setBusinessTypeSaving] = useState('')

  const emailVerifiedCustom = accountData?.emailVerifiedCustom === true
  const emailVerified = isUserCustomVerified({ ...user, emailVerifiedCustom })

  useEffect(() => {
    console.log('[Auth Isolation] login uid', user?.uid || 'none')
    console.log('[Auth Isolation] auth state changed', {
      uid: user?.uid || 'none',
      email: user?.email || '',
      emailVerified: user?.emailVerified === true,
      loading: authLoading,
    })
  }, [user?.uid, user?.email, user?.emailVerified, authLoading])

  useEffect(() => {
    console.log('[WorkspaceSelection] mounted')
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 60000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem('nexora_workspace_view_mode', viewMode)
    } catch {
      // Ignore storage failures (private mode, quota, etc.)
    }
  }, [viewMode])

  useEffect(() => {
    let cancelled = false
    setAccountLoading(true)
    setAccountReadDone(false)
    setWorkspaceReadDone(false)

    async function loadAccount() {
      if (!db || !user?.uid) {
        if (!cancelled) {
          setAccountData(null)
          setWorkspaceData(null)
          setAccountReadDone(true)
          setWorkspaceReadDone(true)
          setAccountLoading(false)
        }
        return
      }

      const userPath = `users/${user.uid}`
      const userRef = doc(db, 'users', user.uid)
      console.log('[Workspace Loading] waitingFor', {
        waitingFor: 'accountData',
        userPath,
        authReady: Boolean(user?.uid),
        accountLoaded: false,
        workspaceLoaded: false,
        loadingFlag: 'accountLoading',
      })
      const userSnap = await getFreshDoc(userRef, userPath)
      if (!cancelled) setAccountReadDone(true)
      const nextAccount = userSnap.exists() ? userSnap.data() : null
      const workspaceId = cleanString(nextAccount?.workspaceId) || user.uid
      const workspacePath = `workspaces/${workspaceId}`
      console.log('[Workspace Loading] accountLoaded', {
        accountLoaded: true,
        userExists: userSnap.exists(),
        workspaceId,
      })
      console.log('[Workspace Loading] waitingFor', {
        waitingFor: 'workspaceData',
        workspacePath,
        authReady: Boolean(user?.uid),
        accountLoaded: true,
        workspaceLoaded: false,
        loadingFlag: 'accountLoading',
      })
      const workspaceSnap = await getFreshDoc(doc(db, 'workspaces', workspaceId), workspacePath)
      if (!cancelled) setWorkspaceReadDone(true)
      const nextWorkspace = workspaceSnap.exists() ? workspaceSnap.data() : null
      console.log('[Workspace Loading] workspaceLoaded', {
        workspaceLoaded: true,
        workspaceExists: workspaceSnap.exists(),
        workspaceId,
      })

      console.log('[Workspace Read]', {
        userPath,
        workspacePath,
        userExists: userSnap.exists(),
        workspaceExists: workspaceSnap.exists(),
        user: {
          onboardingCompleted: nextAccount?.onboardingCompleted === true,
          selectedWorkspace: cleanString(nextAccount?.selectedWorkspace),
          selectedBusinessType: cleanString(nextAccount?.selectedBusinessType),
          currentBusinessType: cleanString(nextAccount?.currentBusinessType),
          businessType: cleanString(nextAccount?.businessType),
          allowedBusinessTypes: Array.isArray(nextAccount?.allowedBusinessTypes) ? nextAccount.allowedBusinessTypes : [],
          enabledModules: Array.isArray(nextAccount?.enabledModules) ? nextAccount.enabledModules : [],
        },
        workspace: {
          onboardingCompleted: nextWorkspace?.onboardingCompleted === true,
          selectedWorkspace: cleanString(nextWorkspace?.selectedWorkspace),
          selectedBusinessType: cleanString(nextWorkspace?.selectedBusinessType),
          currentBusinessType: cleanString(nextWorkspace?.currentBusinessType),
          businessType: cleanString(nextWorkspace?.businessType),
          allowedBusinessTypes: Array.isArray(nextWorkspace?.allowedBusinessTypes) ? nextWorkspace.allowedBusinessTypes : [],
          enabledModules: Array.isArray(nextWorkspace?.enabledModules) ? nextWorkspace.enabledModules : [],
        },
      })
      console.log('[Workspace Debug] user doc', {
        uid: user.uid,
        exists: userSnap.exists(),
        workspaceId,
        emailVerifiedCustom: nextAccount?.emailVerifiedCustom === true,
        onboardingCompleted: nextAccount?.onboardingCompleted === true,
        selectedBusinessType: cleanString(nextAccount?.selectedBusinessType),
        currentBusinessType: cleanString(nextAccount?.currentBusinessType),
        businessType: cleanString(nextAccount?.businessType),
        selectedWorkspace: cleanString(nextAccount?.selectedWorkspace),
        allowedBusinessTypes: Array.isArray(nextAccount?.allowedBusinessTypes) ? nextAccount.allowedBusinessTypes : [],
        enabledModules: Array.isArray(nextAccount?.enabledModules) ? nextAccount.enabledModules : [],
      })
      console.log('[Workspace Debug] workspace doc', {
        workspaceId,
        exists: workspaceSnap.exists(),
        onboardingCompleted: nextWorkspace?.onboardingCompleted === true,
        selectedBusinessType: cleanString(nextWorkspace?.selectedBusinessType),
        currentBusinessType: cleanString(nextWorkspace?.currentBusinessType),
        businessType: cleanString(nextWorkspace?.businessType),
        selectedWorkspace: cleanString(nextWorkspace?.selectedWorkspace),
        allowedBusinessTypes: Array.isArray(nextWorkspace?.allowedBusinessTypes) ? nextWorkspace.allowedBusinessTypes : [],
        enabledModules: Array.isArray(nextWorkspace?.enabledModules) ? nextWorkspace.enabledModules : [],
      })

      if (!cancelled) {
        setAccountData(nextAccount)
        setWorkspaceData(nextWorkspace)
        console.log('[Workspace Loading] loadingFlag', {
          loadingFlag: 'accountLoading',
          value: false,
          accountLoaded: true,
          workspaceLoaded: true,
          waitingFor: 'none',
        })
        setAccountLoading(false)
      }
    }

    loadAccount().catch((error) => {
      reportTechnicalError(error, 'Workspace account load')
      if (!cancelled) {
        setAccountData(null)
        setWorkspaceData(null)
        setAccountReadDone(true)
        setWorkspaceReadDone(true)
        console.log('[Workspace Loading] loadingFlag', {
          loadingFlag: 'accountLoading',
          value: false,
          accountLoaded: true,
          workspaceLoaded: true,
          waitingFor: 'load_error_recovered',
          code: error?.code || '',
          message: error?.message || String(error || ''),
        })
        setAccountLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [user?.uid])

  useEffect(() => {
    const waitingFor = authLoading
      ? 'auth'
      : accountLoading && !accountReadDone
        ? 'accountData'
        : accountLoading && !workspaceReadDone
          ? 'workspaceData'
          : accountLoading
            ? 'state_commit'
            : 'none'

    console.log('[Workspace Loading] progress', {
      progress: authLoading ? 20 : accountLoading ? 50 : 100,
      stage: authLoading ? 'auth' : accountLoading ? 'workspace' : 'ready',
    })
    console.log('[Workspace Loading] waitingFor', {
      waitingFor,
    })
    console.log('[Workspace Loading] authReady', {
      authReady: !authLoading && Boolean(user?.uid),
      authLoading,
      uid: user?.uid || '',
    })
    console.log('[Workspace Loading] accountLoaded', {
      accountLoaded: accountReadDone,
      accountDocExists: Boolean(accountData),
    })
    console.log('[Workspace Loading] workspaceLoaded', {
      workspaceLoaded: workspaceReadDone,
      workspaceDocExists: Boolean(workspaceData),
    })
    console.log('[Workspace Loading] loadingFlag', {
      loadingFlag: authLoading ? 'authLoading' : accountLoading ? 'accountLoading' : 'none',
      authLoading,
      accountLoading,
    })
  }, [accountData, accountLoading, accountReadDone, authLoading, user?.uid, workspaceData, workspaceReadDone])

  useEffect(() => {
    if (authLoading || accountLoading || !user?.uid) return
    if (emailVerified) return

    console.log('[Workspace Route Decision]', {
      source: 'WorkspaceSelection',
      path: '/workspace',
      decision: 'redirect_verify_email',
      reason: 'email_not_verified',
    })
    console.log('[Navigation Blocked]', {
      source: 'WorkspaceSelection',
      reason: 'email_not_verified',
      target: VERIFY_EMAIL_ROUTE,
    })
    navigate(VERIFY_EMAIL_ROUTE, { replace: true })
  }, [accountLoading, authLoading, emailVerified, navigate, user?.uid])

  const onboardingCompleted = workspaceData?.onboardingCompleted === true || accountData?.onboardingCompleted === true
  const savedWorkspaceModule = useMemo(
    () => resolveSavedWorkspaceModule({ accountData, workspaceData, onboardingCompleted }),
    [accountData, onboardingCompleted, workspaceData],
  )

  const profile = useMemo(() => {
    const displayProfile = resolveProfileDisplay({
      firebaseUser: user,
      userDoc: accountData,
      preferenceProfile: null,
    })
    console.log('[Profile Display] auth email', displayProfile.authEmail)
    console.log('[Profile Display] user doc email', displayProfile.userDocEmail)
    console.log('[Profile Display] final display email', displayProfile.displayEmail)
    console.log('[Profile Display] final display name', displayProfile.displayName)
    console.log('[User Profile] fullName', displayProfile.fullName)
    console.log('[User Profile] displayName', displayProfile.rawDisplayName || displayProfile.displayName)
    console.log('[User Profile] profile source', displayProfile.profileSource)
    const email = displayProfile.displayEmail === 'No email' ? 'No email available' : displayProfile.displayEmail
    const name = displayProfile.displayName
    const role = cleanString(accountData?.role) || 'owner'
    const roleLabel = `${role.charAt(0).toUpperCase()}${role.slice(1)}`
    const plan = cleanString(workspaceData?.plan) || cleanString(accountData?.plan) || 'Free'
    const status = cleanString(workspaceData?.planStatus) || cleanString(accountData?.planStatus) || 'trial'
    const trialEndsAt = resolveTrialEnd(workspaceData, accountData, user)
    const countdown = trialCountdown(trialEndsAt, nowMs)
    const packageName = packageNameForPlan(plan)
    const normalizedStatus = status.toLowerCase()
    const normalizedPlan = plan.toLowerCase()
    const isBasicTrialPlan = packageName === 'Basic' || ['free', 'basic', 'trial'].includes(normalizedPlan)
    const isTrial =
      normalizedStatus.includes('trial') ||
      (normalizedStatus === 'expired' && isBasicTrialPlan) ||
      Boolean(workspaceData?.isTrialActive || accountData?.isTrialActive)
    const trialExpired = isTrial && countdown.expired
    const statusLabel = trialExpired ? 'Trial Expired' : isTrial ? 'Trial' : status ? status[0].toUpperCase() + status.slice(1) : ''
    const workspaceName = resolveWorkspaceName({
      workspaceData,
      accountData,
      userId: user?.uid,
      fallback: 'Nexora CRM',
    })
    const profileBusinessTypeSource = savedWorkspaceModule.businessType

    return {
      name,
      email,
      emailVerified,
      initials: initialsFor(name, email),
      role,
      roleLabel,
      workspaceName,
      planLabel: `${packageName}${statusLabel ? ` · ${statusLabel}` : ''}`,
      trialShortLabel: isTrial ? countdown.label : '',
      trialLabel: isTrial ? countdown.detail : `Ends ${formatDate(trialEndsAt)}`,
      trialExpired,
      isTrial,
      workspaceId: cleanString(workspaceData?.workspaceId) || cleanString(accountData?.workspaceId) || user?.uid || '',
      businessType: profileBusinessTypeSource ? normalizeBusinessType(profileBusinessTypeSource) : '',
    }
  }, [accountData, emailVerified, nowMs, onboardingCompleted, savedWorkspaceModule.businessType, user, workspaceData])

  const configuredBusinessType = savedWorkspaceModule.businessType
  const configuredSelectedWorkspace = savedWorkspaceModule.selectedWorkspace
  const recoveredWorkspaceModule = savedWorkspaceModule.complete && savedWorkspaceModule.source === 'recovered_business_fields'
  const workspaceFullyConfigured = Boolean((onboardingCompleted || recoveredWorkspaceModule) && savedWorkspaceModule.complete)
  const hasCrmWorkspace = workspaceFullyConfigured
  const developerOverride = isDeveloperOwnerAccount(accountData, user)
  const lockedBusinessType = configuredBusinessType
  const workspaceAllowedBusinessTypes = savedWorkspaceModule.allowedBusinessTypes
  const allModulesAccess = onboardingCompleted && (workspaceData?.allModulesAccess === true || accountData?.allModulesAccess === true)
  const specialModuleAccess = onboardingCompleted && (allModulesAccess || workspaceData?.specialModuleAccess === true || accountData?.specialModuleAccess === true)
  const allowedWorkspaceTypes = developerOverride || allModulesAccess
    ? businessTypes
    : specialModuleAccess
      ? workspaceAllowedBusinessTypes
      : lockedBusinessType
        ? [lockedBusinessType]
        : []
  const hasModuleLock = !developerOverride && hasCrmWorkspace && Boolean(lockedBusinessType)
  const shouldFilterModules = !developerOverride && workspaceFullyConfigured && allowedWorkspaceTypes.length > 0
  const onboardingSelectionMode = !developerOverride && (!workspaceFullyConfigured || savedWorkspaceModule.stale)
  const moduleLockMessage = 'This module is not enabled for your account. Contact Nexora support.'
  const needsWorkspaceOnboarding = !authLoading && !accountLoading && Boolean(user?.uid) && !hasCrmWorkspace
  const visibleModuleAccess = useMemo(
    () =>
      shouldFilterModules
        ? moduleAccess.filter((workspace) => allowedWorkspaceTypes.includes(normalizeBusinessType(workspace.type)))
        : moduleAccess,
    [allowedWorkspaceTypes, shouldFilterModules],
  )
  const visibleWorkspaces = useMemo(
    () => {
      const sourceWorkspaces = shouldFilterModules
        ? workspaces.filter((workspace) => allowedWorkspaceTypes.includes(normalizeBusinessType(workspace.type)))
        : workspaces

      return sourceWorkspaces.map((workspace) => {
        const selected = Boolean(lockedBusinessType) && (
          workspace.id === configuredSelectedWorkspace ||
          workspace.type === (lockedBusinessType || profile.businessType)
        )
        return workspace.active
          ? {
              ...workspace,
              name: workspace.title,
              workspaceRecordId: profile.workspaceId,
              plan: onboardingSelectionMode ? 'Setup Wizard' : profile.planLabel,
              trialLabel: onboardingSelectionMode ? '' : profile.trialShortLabel,
              trialExpired: profile.trialExpired,
              status: onboardingSelectionMode ? 'Select Module' : profile.trialExpired ? 'Trial Expired' : workspace.status,
              statusTone: onboardingSelectionMode ? 'bg-blue-50 text-blue-700' : profile.trialExpired ? 'bg-red-50 text-red-700' : workspace.statusTone,
              selected: onboardingSelectionMode ? false : selected,
            }
          : { ...workspace, selected }
      })
    },
    [allowedWorkspaceTypes, configuredSelectedWorkspace, lockedBusinessType, onboardingSelectionMode, profile.businessType, profile.planLabel, profile.trialExpired, profile.trialShortLabel, profile.workspaceId, shouldFilterModules],
  )
  const notificationCount = sampleNotifications.length
  const mustSelectModuleFirst = !developerOverride && !lockedBusinessType
  const createDisabled = creatingWorkspace || hasModuleLock || mustSelectModuleFirst
  const createWorkspaceMessage = hasModuleLock
    ? moduleLockMessage
    : mustSelectModuleFirst
      ? 'Select a business module above to start onboarding.'
      : createMessage

  useEffect(() => {
    if (authLoading || accountLoading) return

    const showWorkspaceSelection = shouldShowWorkspaceSelection(accountData, workspaceData)
    const decision = !user?.uid
      ? 'wait_for_auth'
      : !emailVerified
        ? 'blocked_until_email_verified'
        : !onboardingCompleted
          ? 'show_workspace_selection_onboarding_incomplete'
          : 'show_workspace_selection_onboarding_complete'

    console.log('[WorkspaceSelection] auth state', {
      uid: user?.uid || '',
      emailVerifiedCustom,
      onboardingCompleted,
    })
    console.log('[WorkspaceSelection] route decision', { decision })
    console.log('[Workspace Debug] verified state', {
      firebaseEmailVerified: user?.emailVerified === true,
      emailVerifiedCustom,
      emailVerified,
    })
    console.log('[Workspace Debug] onboarding state', {
      onboardingCompleted,
      configuredBusinessType,
      configuredSelectedWorkspace,
      workspaceFullyConfigured,
      savedModuleSource: savedWorkspaceModule.source,
      savedModuleStale: savedWorkspaceModule.stale,
      recoveredWorkspaceModule,
      hasCrmWorkspace,
      hasModuleLock,
      shouldFilterModules,
    })
    console.log('[Workspace State]', {
      source: 'WorkspaceSelection',
      uid: user?.uid || '',
      onboardingCompleted,
      selectedWorkspace: configuredSelectedWorkspace,
      selectedBusinessType: configuredBusinessType,
      currentBusinessType: cleanString(workspaceData?.currentBusinessType) || cleanString(accountData?.currentBusinessType),
      businessType: configuredBusinessType,
      allowedBusinessTypes: allowedWorkspaceTypes,
      enabledModules: Array.isArray(workspaceData?.enabledModules) ? workspaceData.enabledModules : accountData?.enabledModules || [],
      workspaceFullyConfigured,
      recoveredWorkspaceModule,
    })
    console.log('[Workspace Route Decision]', {
      source: 'WorkspaceSelection',
      path: '/workspace',
      decision,
      needsWorkspaceOnboarding,
      onboardingSelectionMode,
      hasModuleLock,
      lockedBusinessType,
    })
    console.log('[Workspace Wizard Reason]', {
      open: onboardingSelectionMode,
      reason: onboardingSelectionMode
        ? savedWorkspaceModule.stale
          ? 'saved_module_fields_missing'
          : 'onboarding_not_completed'
        : 'onboarding_completed',
      savedModuleSource: savedWorkspaceModule.source,
      savedModuleStale: savedWorkspaceModule.stale,
    })
    console.log('[Workspace Debug] available modules', {
      allowedWorkspaceTypes,
      visibleModules: visibleModuleAccess.map((workspace) => workspace.type),
      visibleWorkspaces: visibleWorkspaces.map((workspace) => ({
        id: workspace.id,
        type: workspace.type,
        selected: workspace.selected,
      })),
    })
    console.log('[Onboarding] state', {
      route: '/workspace',
      showWorkspaceSelection: true,
      previousShowWorkspaceSelection: showWorkspaceSelection,
      onboardingCompleted,
      businessType: configuredBusinessType,
      selectedWorkspace: configuredSelectedWorkspace,
      workspaceFullyConfigured,
      hasWorkspaceDoc: Boolean(workspaceData),
      hasAccountWorkspaceId: Boolean(accountData?.workspaceId),
    })
  }, [
    accountData,
    accountLoading,
    authLoading,
    configuredBusinessType,
    configuredSelectedWorkspace,
    emailVerified,
    emailVerifiedCustom,
    hasCrmWorkspace,
    hasModuleLock,
    lockedBusinessType,
    needsWorkspaceOnboarding,
    onboardingCompleted,
    onboardingSelectionMode,
    recoveredWorkspaceModule,
    savedWorkspaceModule.source,
    savedWorkspaceModule.stale,
    shouldFilterModules,
    user?.uid,
    visibleModuleAccess,
    visibleWorkspaces,
    workspaceData,
    workspaceFullyConfigured,
  ])

  useEffect(() => {
    if (!settingsOpen) {
      setWorkspaceNameDraft(profile.workspaceName)
      setWorkspaceNameMessage('')
    }
  }, [profile.workspaceName, settingsOpen])

  useEffect(() => {
    if (settingsOpen) setWorkspaceNameDraft(profile.workspaceName)
  }, [profile.workspaceName, settingsOpen])

  useEffect(() => {
    if (!user) return
    setOnboardingForm((current) => {
      const savedBusinessTypeSource = onboardingCompleted
        ? cleanString(workspaceData?.selectedBusinessType || workspaceData?.businessType || accountData?.selectedBusinessType || accountData?.businessType)
        : ''
      const formBusinessTypeSource = cleanString(current.businessType) || savedBusinessTypeSource

      return {
        ...current,
        ownerName: current.ownerName || cleanString(accountData?.fullName) || cleanString(accountData?.name) || cleanString(user.displayName),
        email: current.email || cleanString(accountData?.email) || cleanString(user.email).toLowerCase(),
        companyName:
          current.companyName ||
          cleanString(accountData?.workspaceName) ||
          cleanString(accountData?.company) ||
          cleanString(accountData?.companyName),
        businessType: formBusinessTypeSource ? normalizeBusinessType(formBusinessTypeSource) : '',
        country: current.country || selectedRegion,
        language: current.language || selectedLanguage,
      }
    })
  }, [accountData, onboardingCompleted, selectedLanguage, selectedRegion, user, workspaceData])

  const handleOnboardingFieldChange = useCallback((field, value) => {
    setOnboardingForm((current) => ({ ...current, [field]: value }))
    if (field === 'language') setSelectedLanguage(value)
    if (field === 'country') setSelectedRegion(value)
  }, [])

  const handleLogout = useCallback(async () => {
    if (loggingOut) return

    const currentUid = user?.uid || ''
    console.log('[Auth Isolation] logout uid', currentUid)

    setLoggingOut(true)
    try {
      if (auth) {
        // Clear all user-scoped caches BEFORE signOut
        clearAllUserCache(currentUid)

        // Force Firebase to fully sign out
        await signOut(auth)

        // Verify auth state is null after signOut
        const currentUser = auth.currentUser
        if (currentUser) {
          console.warn('[Auth Isolation] auth.currentUser still set after signOut', { uid: currentUser.uid })
          // Force a second signOut if needed
          await signOut(auth)
        }
        console.log('[Auth Isolation] auth.currentUser after signOut', auth.currentUser)
      }
    } catch (logoutError) {
      console.error('[Auth Isolation] signOut error', {
        code: logoutError?.code || '',
        message: logoutError?.message || '',
      })
    } finally {
      navigate('/login', { replace: true })
      setLoggingOut(false)
    }
  }, [loggingOut, navigate, user?.uid])

  const handleUpgradePlan = useCallback(() => {
    setProfileOpen(false)
    navigate('/upgrade-business', { state: { fromUpgradeBusiness: true } })
  }, [navigate])

  const isDesktopViewport = useCallback(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches,
    [],
  )

  const handleToggleSidebar = useCallback(() => {
    if (isDesktopViewport()) {
      setSidebarCollapsed((collapsed) => !collapsed)
    } else {
      setSidebarOpen((open) => !open)
    }
  }, [isDesktopViewport])

  const handleCloseSidebar = useCallback(() => {
    if (isDesktopViewport()) {
      setSidebarCollapsed(true)
    } else {
      setSidebarOpen(false)
    }
  }, [isDesktopViewport])

  const handleSendVerificationEmail = useCallback(async () => {
    if (emailVerified) {
      setVerificationMessage('Email is already verified.')
      return
    }
    const currentUser = auth?.currentUser || user
    if (!currentUser?.email) {
      setVerificationMessage('No email address is available for verification.')
      return
    }

    setVerificationSending(true)
    setVerificationMessage('')
    try {
      const emailResult = await sendCustomVerificationEmail(currentUser)
      if (!emailResult.ok) {
        setVerificationMessage(emailResult.error || 'Could not send verification email right now.')
        return
      }
      setVerificationMessage(emailResult.message || 'Verification email sent. Please check your inbox.')
    } catch (error) {
      setVerificationMessage(clientSafeMessage(error, 'Could not send verification email right now.', { context: 'Workspace email verification' }))
    } finally {
      setVerificationSending(false)
    }
  }, [emailVerified, user])

  const handleSaveWorkspaceName = useCallback(async () => {
    const cleanName = normalizeWorkspaceName(workspaceNameDraft, profile.workspaceName || 'Nexora CRM')
    const uid = user?.uid
    const workspaceId = cleanString(workspaceData?.workspaceId) || cleanString(accountData?.workspaceId) || uid
    const hasWorkspaceTarget = Boolean(workspaceData || accountData?.workspaceId)

    setWorkspaceNameSaving(true)
    setWorkspaceNameMessage('')
    saveStoredWorkspaceName(uid, cleanName)
    setWorkspaceNameDraft(cleanName)
    setAccountData((current) => ({
      ...(current || {}),
      workspaceName: cleanName,
      company: cleanName,
    }))
    if (hasWorkspaceTarget) {
      setWorkspaceData((current) => ({
        ...(current || {}),
        workspaceId: cleanString(current?.workspaceId) || workspaceId,
        workspaceName: cleanName,
        name: cleanName,
      }))
    }

    if (!db || !uid || !workspaceId) {
      setWorkspaceNameMessage('Saved on this device.')
      setWorkspaceNameSaving(false)
      return
    }

    try {
      const now = serverTimestamp()
      const writes = [
        setDoc(
          doc(db, 'users', uid),
          {
            workspaceName: cleanName,
            company: cleanName,
            updatedAt: now,
          },
          { merge: true },
        ),
      ]
      if (hasWorkspaceTarget) {
        writes.push(
          setDoc(
            doc(db, 'workspaces', workspaceId),
            {
              workspaceName: cleanName,
              name: cleanName,
              updatedAt: now,
              lastAccessedAt: now,
            },
            { merge: true },
          ),
        )
      }
      await Promise.all(writes)
      setWorkspaceNameMessage('Workspace name saved.')
    } catch (error) {
      setWorkspaceNameMessage(clientSafeMessage(error, 'Saved on this device. Cloud sync will retry when available.', { context: 'Workspace name save' }))
    } finally {
      setWorkspaceNameSaving(false)
    }
  }, [accountData?.workspaceId, profile.workspaceName, user?.uid, workspaceData, workspaceNameDraft])

  const handleSelectBusinessWorkspace = useCallback(async (workspace) => {
    console.log('[Module Click]', {
      source: 'WorkspaceSelection',
      workspaceId: workspace?.id || '',
      workspaceType: workspace?.type || '',
      workspaceActive: workspace?.active !== false,
      businessTypeSaving: businessTypeSaving || '',
    })
    console.log('[Workspace Module Click]', {
      source: 'WorkspaceSelection',
      workspaceId: workspace?.id || '',
      workspaceType: workspace?.type || '',
      workspaceActive: workspace?.active !== false,
      businessTypeSaving: businessTypeSaving || '',
      accountLoading,
      authLoading,
    })
    if (businessTypeSaving) {
      console.log('[Navigation Blocked]', {
        source: 'WorkspaceSelection',
        reason: 'module_save_in_progress',
        workspaceType: workspace?.type || '',
      })
      console.log('[Workspace Navigate Failed]', {
        source: 'WorkspaceSelection',
        reason: 'module_save_in_progress',
        workspaceType: workspace?.type || '',
      })
      return
    }
    if (!emailVerified) {
      console.log('[Workspace Debug] navigation blocked reason', {
        reason: 'email_not_verified',
        target: VERIFY_EMAIL_ROUTE,
      })
      console.log('[Navigation Blocked]', {
        source: 'WorkspaceSelection',
        reason: 'email_not_verified',
        target: VERIFY_EMAIL_ROUTE,
      })
      console.log('[Workspace Navigate Failed]', {
        source: 'WorkspaceSelection',
        reason: 'email_not_verified',
        target: VERIFY_EMAIL_ROUTE,
      })
      setCreateMessage('Please verify your email before creating a workspace.')
      navigate(getAuthRouteState({ ...user, emailVerifiedCustom: accountData?.emailVerifiedCustom }).route)
      return
    }

    const uid = user?.uid
    const workspaceId = cleanString(workspaceData?.workspaceId) || cleanString(accountData?.workspaceId) || uid
    const availableWorkspace = workspace?.active !== false && workspace?.type
    if (!availableWorkspace) {
      console.log('[Workspace Debug] navigation blocked reason', {
        reason: 'module_not_available',
        module: workspace?.type || workspace?.id || '',
      })
      console.log('[Navigation Blocked]', {
        source: 'WorkspaceSelection',
        reason: 'module_not_available',
        module: workspace?.type || workspace?.id || '',
      })
      console.log('[Workspace Navigate Failed]', {
        source: 'WorkspaceSelection',
        reason: 'module_not_available',
        module: workspace?.type || workspace?.id || '',
      })
      setCreateMessage('This module is coming soon.')
      return
    }
    const {
      businessTypeLabel,
      businessTypeId,
      selectedWorkspace,
      enabledModules,
      selectedFeatures,
      redirectTarget,
    } = onboardingModuleSelection(workspace)
    const businessType = businessTypeLabel
    const selectedBusinessType = normalizeBusinessType(businessType)
    const moduleAllowedForAccount =
      developerOverride ||
      allModulesAccess ||
      allowedWorkspaceTypes.includes(selectedBusinessType)
    console.log('[Workspace Access]', {
      source: 'WorkspaceSelection',
      moduleAllowedForAccount,
      developerOverride,
      allModulesAccess,
      specialModuleAccess,
      hasModuleLock,
      hasCrmWorkspace,
      onboardingCompleted,
      allowedWorkspaceTypes,
      visibleWorkspaces: visibleWorkspaces.map((item) => ({ id: item.id, type: item.type, selected: item.selected })),
    })
    console.log('[Business Type]', {
      source: 'WorkspaceSelection',
      requestedBusinessType: selectedBusinessType,
      configuredBusinessType,
      lockedBusinessType,
    })
    console.log('[Current Business Type]', {
      source: 'WorkspaceSelection',
      accountCurrentBusinessType: cleanString(accountData?.currentBusinessType),
      workspaceCurrentBusinessType: cleanString(workspaceData?.currentBusinessType),
      nextCurrentBusinessType: businessTypeId,
    })
    console.log('[Selected Workspace]', {
      source: 'WorkspaceSelection',
      configuredSelectedWorkspace,
      nextSelectedWorkspace: selectedWorkspace,
      savedAllowedBusinessTypes: workspaceAllowedBusinessTypes,
    })
    console.log('[Route Target]', {
      source: 'WorkspaceSelection',
      selectedWorkspace,
      businessType: selectedBusinessType,
      target: redirectTarget,
    })
    if (workspaceFullyConfigured && !moduleAllowedForAccount) {
      console.log('[Workspace Debug] navigation blocked reason', {
        reason: 'module_not_allowed',
        businessType,
        allowedWorkspaceTypes,
      })
      console.log('[Navigation Blocked]', {
        source: 'WorkspaceSelection',
        reason: 'module_not_allowed',
        businessType: selectedBusinessType,
        allowedWorkspaceTypes,
      })
      console.log('[Workspace Navigate Failed]', {
        source: 'WorkspaceSelection',
        reason: 'module_not_allowed',
        businessType: selectedBusinessType,
        allowedWorkspaceTypes,
      })
      setCreateMessage(moduleLockMessage)
      return
    }
    console.log('[Workspace Debug] selected module', {
      source: 'workspace-card',
      businessType,
      businessTypeId,
      selectedWorkspace,
      hasModuleLock,
      hasCrmWorkspace,
    })
    console.log('[Workspace Module Open]', {
      source: 'WorkspaceSelection',
      businessType,
      businessTypeId,
      selectedWorkspace,
      hasModuleLock,
      hasCrmWorkspace,
      redirectTarget,
    })
    console.log('[Onboarding] selected module', {
      source: 'workspace-card',
      businessType,
      businessTypeId,
      selectedWorkspace,
      redirectTarget,
    })
    const opensSavedModule =
      workspaceFullyConfigured &&
      moduleAllowedForAccount &&
      (developerOverride || hasModuleLock || hasCrmWorkspace || allModulesAccess || specialModuleAccess)
    if (opensSavedModule) {
      if (uid) saveSelectedWorkspace(uid, selectedWorkspace)
      console.log('[Workspace Debug] redirect target', {
        mode: 'open_saved_module',
        currentPath: '/workspace',
        selectedWorkspace,
        redirectTarget,
      })
      console.log('[Onboarding] redirect target', { redirectTarget })
      console.log('[Workspace Route Decision]', {
        source: 'WorkspaceSelection',
        mode: 'open_saved_module',
        selectedWorkspace,
        redirectTarget,
      })
      console.log('[Navigation Attempt]', {
        source: 'WorkspaceSelection',
        selectedWorkspace,
        currentPath: '/workspace',
        target: redirectTarget,
      })
      console.log('[Workspace Navigate]', {
        source: 'WorkspaceSelection',
        selectedWorkspace,
        target: redirectTarget,
        mode: 'open_saved_module',
      })
      navigate(redirectTarget)
      return
    }
    if (!developerOverride && !lockedBusinessType) {
      console.log('[Workspace Debug] navigation blocked reason', {
        reason: 'onboarding_required_missing_saved_module',
        businessType,
        selectedWorkspace,
      })
      console.log('[Navigation Blocked]', {
        source: 'WorkspaceSelection',
        reason: 'onboarding_required_missing_saved_module',
        businessType: selectedBusinessType,
        selectedWorkspace,
      })
      console.log('[Workspace Navigate Failed]', {
        source: 'WorkspaceSelection',
        reason: 'onboarding_required_missing_saved_module',
        businessType: selectedBusinessType,
        selectedWorkspace,
      })
      setCreateMessage('')
      setOnboardingForm((current) => ({
        ...current,
        businessType,
      }))
      trackAnalyticsEvent('onboarding_started', { userId: uid, email: user?.email || '', workspaceId, businessType: businessTypeId, moduleName: businessType, page: '/workspace' })
        .catch((analyticsError) => {
          console.warn('[Onboarding] onboarding_started analytics failed', { error: analyticsError?.message || analyticsError })
        })
      setCreateOpen(true)
      return
    }
    if (!hasCrmWorkspace && !workspaceData && !accountData?.workspaceId) {
      console.log('[Workspace Debug] navigation blocked reason', {
        reason: 'workspace_missing_before_module_open',
        businessType,
        selectedWorkspace,
      })
      console.log('[Navigation Blocked]', {
        source: 'WorkspaceSelection',
        reason: 'workspace_missing_before_module_open',
        businessType: selectedBusinessType,
        selectedWorkspace,
      })
      console.log('[Workspace Navigate Failed]', {
        source: 'WorkspaceSelection',
        reason: 'workspace_missing_before_module_open',
        businessType: selectedBusinessType,
        selectedWorkspace,
      })
      setCreateMessage('Create your company workspace first.')
      setOnboardingForm((current) => ({
        ...current,
        businessType,
      }))
      setCreateOpen(true)
      return
    }
    if (!uid || !workspaceId) {
      console.log('[Workspace Debug] navigation blocked reason', {
        reason: 'missing_uid_or_workspace_id',
        uid: uid || '',
        workspaceId: workspaceId || '',
      })
      console.log('[Workspace Debug] redirect target', { redirectTarget })
      console.log('[Onboarding] redirect target', { redirectTarget })
      console.log('[Navigation Attempt]', {
        source: 'WorkspaceSelection',
        reason: 'missing_uid_or_workspace_id_fallback',
        selectedWorkspace,
        target: redirectTarget,
      })
      console.log('[Workspace Navigate]', {
        source: 'WorkspaceSelection',
        reason: 'missing_uid_or_workspace_id_fallback',
        selectedWorkspace,
        target: redirectTarget,
      })
      navigate(redirectTarget)
      return
    }
    const now = serverTimestamp()

    setBusinessTypeSaving(workspace.type)
    setCreateMessage('')
    setAccountData((current) => ({
      ...(current || {}),
      businessType: businessTypeId,
      selectedBusinessType: businessTypeId,
      currentBusinessType: businessTypeId,
      primaryBusinessType: businessTypeId,
      allowedBusinessTypes: [businessTypeId],
      specialModuleAccess: false,
      allModulesAccess: false,
      selectedWorkspace,
      enabledModules,
      selectedFeatures,
      onboardingCompleted: true,
    }))
    setWorkspaceData((current) => ({
      ...(current || {}),
      workspaceId,
      businessType: businessTypeId,
      selectedBusinessType: businessTypeId,
      currentBusinessType: businessTypeId,
      primaryBusinessType: businessTypeId,
      allowedBusinessTypes: [businessTypeId],
      specialModuleAccess: false,
      allModulesAccess: false,
      selectedWorkspace,
      enabledModules,
      selectedFeatures,
      onboardingCompleted: true,
    }))
    saveSelectedWorkspace(uid, selectedWorkspace)

    try {
      if (!db) {
        console.log('[Onboarding] redirect target', { redirectTarget })
        navigate(redirectTarget)
        return
      }

      const workspaceRef = doc(db, 'workspaces', workspaceId)
      const workspaceSnap = await getDoc(workspaceRef)
      const workspaceExists = workspaceSnap.exists()
      console.log('[WorkspaceSelection] workspace exists', { workspaceId, workspaceExists })

      const workspaceUpdatePayload = {
        businessType: businessTypeId,
        currentBusinessType: businessTypeId,
        selectedBusinessType: businessTypeId,
        primaryBusinessType: businessTypeId,
        allowedBusinessTypes: [businessTypeId],
        specialModuleAccess: false,
        allModulesAccess: false,
        selectedWorkspace,
        workspaceId,
        ownerId: cleanString(workspaceData?.ownerId) || uid,
        enabledModules,
        selectedFeatures,
        onboardingCompleted: true,
        updatedAt: now,
        lastAccessedAt: now,
      }
      const workspacePayload = workspaceExists
        ? workspaceUpdatePayload
        : {
            ...workspaceUpdatePayload,
            userId: workspaceId,
            createdBy: uid,
            createdAt: now,
            plan: 'Basic',
            planStatus: 'trial',
            subscriptionStatus: 'trial',
            trialDays: CRM_TRIAL_DAYS,
            status: 'active',
            isTrialActive: true,
          }

      console.log(workspaceExists ? '[WorkspaceSelection] update payload' : '[WorkspaceSelection] create payload', workspacePayload)
      console.log('[Workspace Write]', {
        source: 'WorkspaceSelection.select',
        userPath: `users/${uid}`,
        workspacePath: `workspaces/${workspaceId}`,
        workspaceExists,
        user: {
          onboardingCompleted: true,
          selectedWorkspace,
          selectedBusinessType: businessTypeId,
          currentBusinessType: businessTypeId,
          businessType: businessTypeId,
          allowedBusinessTypes: [businessTypeId],
          enabledModules,
        },
        workspace: {
          onboardingCompleted: true,
          selectedWorkspace,
          selectedBusinessType: businessTypeId,
          currentBusinessType: businessTypeId,
          businessType: businessTypeId,
          allowedBusinessTypes: [businessTypeId],
          enabledModules,
        },
      })

      await Promise.all([
        setDoc(
          doc(db, 'users', uid),
          {
            businessType: businessTypeId,
            currentBusinessType: businessTypeId,
            selectedBusinessType: businessTypeId,
            primaryBusinessType: businessTypeId,
            allowedBusinessTypes: [businessTypeId],
            specialModuleAccess: false,
            allModulesAccess: false,
            selectedWorkspace,
            workspaceId,
            ownerId: uid,
            enabledModules,
            selectedFeatures,
            onboardingCompleted: true,
            updatedAt: now,
          },
          { merge: true },
        ),
        setDoc(
          workspaceRef,
          workspacePayload,
          { merge: true },
        ),
      ])
      console.log('[WorkspaceSelection] workspace save success', { workspaceId, workspaceExists })
      console.log('[Onboarding] saved workspace module', {
        workspaceId,
        businessType: businessTypeId,
        businessTypeLabel: businessType,
        selectedWorkspace,
        enabledModules,
      })
      trackAnalyticsEvent('workspace_selected', { userId: uid, email: user?.email || '', workspaceId, businessType: businessTypeId, moduleName: businessType, page: '/workspace' })
        .catch((analyticsError) => {
          console.warn('[Onboarding] workspace_selected analytics failed', { error: analyticsError?.message || analyticsError })
        })
      trackAnalyticsEvent('onboarding_completed', { userId: uid, email: user?.email || '', workspaceId, businessType: businessTypeId, moduleName: businessType, page: '/workspace' })
        .catch((analyticsError) => {
          console.warn('[Onboarding] onboarding_completed analytics failed', { error: analyticsError?.message || analyticsError })
        })
      console.log('[Onboarding] redirect target', { redirectTarget })
      console.log('[Navigation Attempt]', {
        source: 'WorkspaceSelection',
        selectedWorkspace,
        currentPath: '/workspace',
        target: redirectTarget,
      })
      console.log('[Workspace Navigate]', {
        source: 'WorkspaceSelection',
        selectedWorkspace,
        target: redirectTarget,
        mode: workspaceExists ? 'saved_module_after_update' : 'saved_module_after_create',
      })
      console.log('[Workspace Debug] redirect target', {
        mode: workspaceExists ? 'saved_module_after_update' : 'saved_module_after_create',
        currentPath: '/workspace',
        selectedWorkspace,
        redirectTarget,
      })
      console.log('[Workspace Route Decision]', {
        source: 'WorkspaceSelection',
        mode: workspaceExists ? 'saved_module_after_update' : 'saved_module_after_create',
        selectedWorkspace,
        redirectTarget,
      })
      navigate(redirectTarget)
    } catch (error) {
      console.error('[WorkspaceSelection] workspace save fail', {
        workspaceId,
        code: error?.code,
        message: error?.message,
      })
      console.log('[Workspace Debug] navigation blocked reason', {
        reason: 'workspace_save_failed',
        code: error?.code || '',
        message: error?.message || '',
      })
      console.log('[Navigation Blocked]', {
        source: 'WorkspaceSelection',
        reason: 'workspace_save_failed',
        code: error?.code || '',
        message: error?.message || '',
      })
      console.log('[Workspace Navigate Failed]', {
        source: 'WorkspaceSelection',
        reason: 'workspace_save_failed',
        code: error?.code || '',
        message: error?.message || '',
      })
      setCreateMessage(clientSafeMessage(error, 'Could not save business type right now.', { context: 'Business workspace selection' }))
    } finally {
      setBusinessTypeSaving('')
    }
  }, [
    accountData?.workspaceId,
    accountData?.currentBusinessType,
    allModulesAccess,
    accountLoading,
    authLoading,
    businessTypeSaving,
    configuredBusinessType,
    configuredSelectedWorkspace,
    emailVerified,
    hasCrmWorkspace,
    hasModuleLock,
    developerOverride,
    allowedWorkspaceTypes,
    lockedBusinessType,
    moduleLockMessage,
    navigate,
    onboardingCompleted,
    specialModuleAccess,
    user?.uid,
    visibleWorkspaces,
    workspaceFullyConfigured,
    workspaceAllowedBusinessTypes,
    workspaceData?.currentBusinessType,
    workspaceData,
    workspaceData?.ownerId,
    workspaceData?.workspaceId,
  ])

  const handleOpenCreate = useCallback(() => {
    if (!emailVerified) {
      setCreateMessage('Please verify your email before creating a workspace.')
      navigate(getAuthRouteState({ ...user, emailVerifiedCustom: accountData?.emailVerifiedCustom }).route)
      return
    }
    if (hasModuleLock) {
      setCreateMessage(moduleLockMessage)
      return
    }
    if (mustSelectModuleFirst) {
      setCreateMessage('Select a business module above to start onboarding.')
      return
    }
    setCreateMessage('')
    setCreateOpen(true)
  }, [accountData?.emailVerifiedCustom, emailVerified, hasModuleLock, moduleLockMessage, mustSelectModuleFirst, navigate, user])

  const handleCreateWorkspace = useCallback(async () => {
    if (creatingWorkspace) return
    console.log('[Workspace Create] start', {
      currentUserExists: Boolean(auth?.currentUser),
      authUid: auth?.currentUser?.uid || '',
      userUid: user?.uid || '',
      emailVerified,
      selectedBusinessType: onboardingForm.businessType || '',
    })
    if (!emailVerified) {
      setCreateMessage('Please verify your email before creating a workspace.')
      navigate(getAuthRouteState({ ...user, emailVerifiedCustom: accountData?.emailVerifiedCustom }).route)
      return
    }
    if (!db || !user?.uid) {
      setCreateMessage('Workspace cannot be created until Firebase is connected.')
      return
    }

    setCreatingWorkspace(true)
    setCreateMessage('')
    try {
      const uid = user.uid
      const email = cleanString(onboardingForm.email || user.email).toLowerCase()
      const ownerName = cleanString(onboardingForm.ownerName) || cleanString(user.displayName) || cleanString(email.split('@')[0])
      const companyName = cleanString(onboardingForm.companyName)
      if (!companyName || !ownerName || !email) {
        setCreateMessage('Company name, owner name, and email are required.')
        return
      }
      if (!cleanString(onboardingForm.businessType)) {
        setCreateMessage('Select a business module before saving your workspace.')
        return
      }

      const workspaceName = normalizeWorkspaceName(companyName, companyName)
      saveStoredWorkspaceName(uid, workspaceName)
      const {
        businessTypeLabel,
        businessTypeId,
        selectedWorkspace,
        enabledModules,
        selectedFeatures,
        redirectTarget,
      } = onboardingModuleSelection(onboardingForm.businessType)
      const businessType = businessTypeLabel
      console.log('[Onboarding] selected module', {
        source: 'workspace-modal',
        businessType,
        businessTypeId,
        selectedWorkspace,
        redirectTarget,
      })
      const country = cleanString(onboardingForm.country) || 'Pakistan'
      const currency = cleanString(onboardingForm.currency) || 'PKR'
      const phone = cleanString(onboardingForm.phone)
      const address = cleanString(onboardingForm.address)
      const academicYear = cleanString(onboardingForm.academicYear)
      const classesRange = cleanString(onboardingForm.classesRange)
      const monthlyFeeSetup = cleanString(onboardingForm.monthlyFeeSetup)
      const preferredLanguage = cleanString(onboardingForm.language) || 'English'
      const now = serverTimestamp()
      const trialEndsAt = addDays(new Date(), CRM_TRIAL_DAYS)
      const userRef = doc(db, 'users', uid)
      const userSnap = await getDoc(userRef)
      const existingAccount = userSnap.exists() ? userSnap.data() : null
      const existingWorkspaceId = cleanString(existingAccount?.workspaceId)
      const workspaceRef = existingWorkspaceId ? doc(db, 'workspaces', existingWorkspaceId) : doc(db, 'workspaces', uid)
      const workspaceId = workspaceRef.id
      const workspaceSnap = await getDoc(workspaceRef)
      const workspaceExists = workspaceSnap.exists()
      const isFirstUserProfile = !userSnap.exists()
      const authUid = auth?.currentUser?.uid || ''

      console.log('[Workspace Create] auth uid', {
        currentUserExists: Boolean(auth?.currentUser),
        authUid,
        userUid: uid,
        uidMatchesAuth: authUid === uid,
      })
      console.log('[Workspace Create] workspaceId', {
        workspaceId,
        existingWorkspaceId,
        ownerId: uid,
        ownerMatchesAuth: uid === authUid,
        createdBy: uid,
        createdByMatchesAuth: uid === authUid,
      })
      console.log('[Workspace Setup] existing workspace', {
        workspaceId,
        exists: workspaceExists,
      })

      const primaryBusinessType = businessTypeId
      const allowedBusinessTypes = [businessTypeId]
      const baseUserPayload = {
        uid,
        ownerId: uid,
        userId: uid,
        workspaceId,
        fullName: ownerName,
        displayName: ownerName,
        name: ownerName,
        email,
        role: 'owner',
        status: 'active',
        businessType: businessTypeId,
        selectedBusinessType: businessTypeId,
        currentBusinessType: businessTypeId,
        primaryBusinessType,
        allowedBusinessTypes,
        specialModuleAccess: false,
        allModulesAccess: false,
        selectedWorkspace,
        trialBusinessType: businessTypeId,
        enabledModules,
        selectedFeatures,
        onboardingCompleted: true,
        workspaceName,
        company: workspaceName,
        companyName: workspaceName,
        ownerName,
        country,
        currency,
        phone,
        address,
        preferredLanguage,
        academicYear,
        classesRange,
        monthlyFeeSetup,
        updatedAt: now,
        lastLoginAt: now,
      }
      const trialUserFields = {
        plan: 'Basic',
        planStatus: 'trial',
        subscriptionStatus: 'trial',
        billingCycle: 'monthly',
        trialStartAt: now,
        trialStartedAt: now,
        trialEndsAt,
        trialBusinessType: businessTypeId,
        isTrialActive: true,
        trialDays: CRM_TRIAL_DAYS,
      }
      const userOnboardingUpdatePayload = {
        businessType: businessTypeId,
        selectedBusinessType: businessTypeId,
        currentBusinessType: businessTypeId,
        primaryBusinessType,
        allowedBusinessTypes,
        specialModuleAccess: false,
        allModulesAccess: false,
        selectedWorkspace,
        trialBusinessType: businessTypeId,
        enabledModules,
        selectedFeatures,
        onboardingCompleted: true,
        workspaceName,
        company: workspaceName,
        companyName: workspaceName,
        ownerName,
        country,
        currency,
        phone,
        address,
        preferredLanguage,
        academicYear,
        classesRange,
        monthlyFeeSetup,
        updatedAt: now,
        lastLoginAt: now,
      }
      const userPayload = isFirstUserProfile
        ? {
            ...baseUserPayload,
            ...trialUserFields,
            createdAt: now,
            createdBy: uid,
            isAdmin: false,
          }
        : userOnboardingUpdatePayload
      const workspaceOnboardingUpdatePayload = {
        businessType: businessTypeId,
        currentBusinessType: businessTypeId,
        selectedBusinessType: businessTypeId,
        selectedWorkspace,
        allowedBusinessTypes,
        enabledModules,
        onboardingCompleted: true,
        updatedAt: now,
        lastAccessedAt: now,
      }
      const workspaceCreatePayload = {
        ownerId: uid,
        userId: workspaceId,
        workspaceId,
        name: workspaceName,
        workspaceName,
        company: workspaceName,
        companyName: workspaceName,
        ownerName,
        email,
        phone,
        address,
        country,
        currency,
        preferredLanguage,
        academicYear,
        classesRange,
        monthlyFeeSetup,
        plan: 'Basic',
        planStatus: 'trial',
        subscriptionStatus: 'trial',
        status: 'active',
        billingCycle: 'monthly',
        trialDays: CRM_TRIAL_DAYS,
        trialStartAt: now,
        trialStartedAt: now,
        trialEndsAt,
        isTrialActive: true,
        businessType: businessTypeId,
        selectedBusinessType: businessTypeId,
        currentBusinessType: businessTypeId,
        primaryBusinessType,
        allowedBusinessTypes,
        specialModuleAccess: false,
        allModulesAccess: false,
        selectedWorkspace,
        trialBusinessType: businessTypeId,
        enabledModules,
        selectedFeatures,
        onboardingCompleted: true,
        createdAt: now,
        createdBy: uid,
        updatedAt: now,
        lastAccessedAt: now,
      }
      const workspacePayload = workspaceExists ? workspaceOnboardingUpdatePayload : workspaceCreatePayload
      const ownerMembership = {
        uid,
        staffId: uid,
        ownerId: uid,
        userId: uid,
        workspaceId,
        name: ownerName,
        fullName: ownerName,
        displayName: ownerName,
        email,
        phone,
        role: 'owner',
        status: 'active',
        permissions: workspacePermissionDefaults('owner'),
        createdAt: now,
        createdBy: uid,
        updatedAt: now,
        updatedBy: uid,
      }
      const ownerPermissionPayload = {
        ...workspacePermissionDefaults('owner'),
        ownerId: uid,
        userId: uid,
        staffId: uid,
        workspaceId,
        role: 'owner',
        updatedAt: now,
        updatedBy: uid,
      }

      console.log('[Workspace Create] payload', {
        userPath: `users/${uid}`,
        workspacePath: `workspaces/${workspaceId}`,
        workspaceExists,
        staffPath: `workspaces/${workspaceId}/staff/${uid}`,
        teamMemberPath: `workspaces/${workspaceId}/teamMembers/${uid}`,
        permissionPath: `workspaces/${workspaceId}/permissions/${uid}`,
        userPayload,
        userOnboardingUpdatePayload,
        workspacePayload,
        workspaceOnboardingUpdatePayload,
        workspaceCreatePayload,
        ownerMembership,
        ownerPermissionPayload,
      })
      if (workspaceExists) {
        console.log('[Workspace Setup] onboarding update payload', workspaceOnboardingUpdatePayload)
      }
      console.log('[Workspace Write]', {
        source: 'WorkspaceSelection.create',
        userPath: `users/${uid}`,
        workspacePath: `workspaces/${workspaceId}`,
        workspaceExists,
        user: {
          onboardingCompleted: true,
          selectedWorkspace,
          selectedBusinessType: businessTypeId,
          currentBusinessType: businessTypeId,
          businessType: businessTypeId,
          allowedBusinessTypes,
          enabledModules,
        },
        workspace: {
          onboardingCompleted: true,
          selectedWorkspace,
          selectedBusinessType: businessTypeId,
          currentBusinessType: businessTypeId,
          businessType: businessTypeId,
          allowedBusinessTypes,
          enabledModules,
        },
      })

      await setDoc(userRef, userPayload, { merge: true })
      console.log('[Workspace Create] firestore write success', {
        path: `users/${uid}`,
        workspaceId,
        ownerId: uid,
        createdBy: uid,
      })
      await setDoc(workspaceRef, workspacePayload, { merge: true })
      console.log('[Workspace Create] firestore write success', {
        path: `workspaces/${workspaceId}`,
        workspaceId,
        ownerId: uid,
        createdBy: uid,
        mode: workspaceExists ? 'onboarding-update' : 'workspace-create',
      })
      if (workspaceExists) {
        console.log('[Workspace Setup] onboarding update success', {
          workspaceId,
          selectedWorkspace,
          businessType: businessTypeId,
        })
      }
      const membershipWrites = [
        setDoc(doc(db, 'workspaces', workspaceId, 'staff', uid), ownerMembership, { merge: true }),
        setDoc(doc(db, 'workspaces', workspaceId, 'teamMembers', uid), ownerMembership, { merge: true }),
      ]
      if (uid !== workspaceId) {
        membershipWrites.push(setDoc(
          doc(db, 'workspaces', workspaceId, 'permissions', uid),
          ownerPermissionPayload,
          { merge: true },
        ))
      } else {
        console.log('[Workspace Setup] skip owner permissions doc', {
          path: `workspaces/${workspaceId}/permissions/${uid}`,
          reason: 'owner inherits workspace manager access',
        })
      }
      await Promise.all(membershipWrites)
      console.log('[Workspace Create] firestore write success', {
        path: uid === workspaceId
          ? `workspaces/${workspaceId}/staff|teamMembers/${uid}`
          : `workspaces/${workspaceId}/staff|teamMembers|permissions/${uid}`,
        workspaceId,
        ownerId: uid,
        createdBy: uid,
      })
      saveSelectedWorkspace(uid, selectedWorkspace)
      console.log('[Onboarding] saved workspace module', {
        workspaceId,
        businessType: businessTypeId,
        businessTypeLabel: businessType,
        selectedWorkspace,
        enabledModules,
      })
      trackAnalyticsEvent('workspace_selected', { userId: uid, email, phone, workspaceId, businessType: businessTypeId, moduleName: businessType, page: '/workspace' })
        .catch((analyticsError) => {
          console.warn('[Onboarding] workspace_selected analytics failed', { error: analyticsError?.message || analyticsError })
        })
      trackAnalyticsEvent('onboarding_completed', { userId: uid, email, phone, workspaceId, businessType: businessTypeId, moduleName: businessType, page: '/workspace' })
        .catch((analyticsError) => {
          console.warn('[Onboarding] onboarding_completed analytics failed', { error: analyticsError?.message || analyticsError })
        })
      setAccountData((current) => (isFirstUserProfile ? userPayload : { ...(current || {}), ...userPayload }))
      setWorkspaceData((current) => (workspaceExists ? { ...(current || {}), ...workspaceOnboardingUpdatePayload } : workspaceCreatePayload))
      setCreateOpen(false)
      setSelectedLanguage(preferredLanguage)
      setSelectedRegion(country)
      setCreateMessage('')
      console.log('[Onboarding] redirect target', { redirectTarget })
      navigate(redirectTarget)
    } catch (error) {
      console.error('[Workspace Create] firestore write fail', {
        code: error?.code,
        message: error?.message,
      })
      console.error('[Workspace Create] error.code', error?.code)
      console.error('[Workspace Create] error.message', error?.message)
      setCreateMessage(onboardingErrorMessage(error))
    } finally {
      setCreatingWorkspace(false)
    }
  }, [creatingWorkspace, emailVerified, navigate, onboardingForm, user])

  if (authLoading) return <PageLoader stage="auth" />
  if (accountLoading) return <PageLoader stage="workspace" businessType={profile.businessType || onboardingForm.businessType} />

  return (
    <main className="min-h-screen overflow-x-clip bg-slate-50 text-slate-950">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside
          className={`bg-[#061a35] text-white transition-all duration-300 ease-in-out ${
            sidebarOpen
              ? 'translate-x-0'
              : '-translate-x-full'
          } lg:fixed lg:inset-y-0 lg:left-0 ${
            sidebarCollapsed ? 'lg:w-[68px]' : 'lg:w-[250px]'
          } ${
            sidebarCollapsed ? 'lg:translate-x-0' : 'lg:translate-x-0'
          } lg:overflow-y-auto ${
            sidebarOpen ? 'fixed inset-y-0 left-0 z-30 w-[250px]' : 'lg:z-20'
          }`}
          aria-label="Workspace sidebar"
        >
          <div className="flex min-h-full flex-col px-4 py-5">
            {/* Close button for mobile overlay */}
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Close sidebar"
            >
              <HiOutlineXMark className="h-5 w-5" />
            </button>

            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <img src={logoUrl} alt="Nexora" className="h-10 w-10 rounded-xl flex-shrink-0" />
                  {!sidebarCollapsed ? (
                    <p className="text-2xl font-extrabold tracking-[0.08em] text-white transition-opacity duration-200">NEXORA</p>
                  ) : null}
                </div>
                {!sidebarCollapsed && (
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-300">
                    Business Suite
                  </p>
                )}
              </div>
            </div>

            <div className={`relative ${sidebarCollapsed ? 'mt-6' : 'mt-6'}`}>
              <button
                type="button"
                onClick={() => setProfileOpen((open) => !open)}
                className={`w-full rounded-lg border border-white/10 bg-white/[0.04] text-left transition hover:bg-white/[0.07] ${
                  sidebarCollapsed ? 'flex justify-center p-2' : 'p-3'
                }`}
                aria-expanded={profileOpen}
                title={sidebarCollapsed ? `${profile.name}\n${profile.roleLabel}\n${profile.email}` : undefined}
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-extrabold text-white">
                    {profile.initials}
                  </span>
                  {!sidebarCollapsed && (
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="block truncate text-sm font-bold text-white">{authLoading ? 'Loading...' : profile.name}</span>
                        {profile.emailVerified ? <HiOutlineCheckCircle className="h-4 w-4 shrink-0 text-emerald-300" /> : null}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-slate-300">{profile.roleLabel}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-slate-400">{profile.email}</span>
                    </span>
                  )}
                  {!sidebarCollapsed && <HiOutlineChevronDown className="h-4 w-4 shrink-0 text-slate-300" />}
                </span>
              </button>

              {profileOpen ? (
                <div className="absolute left-0 right-0 top-full z-40 mt-2 rounded-lg border border-white/10 bg-white p-3 text-slate-900 shadow-xl shadow-slate-950/25">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-sm font-bold">{profile.name}</p>
                    {profile.emailVerified ? <HiOutlineCheckCircle className="h-4 w-4 shrink-0 text-emerald-600" /> : null}
                  </div>
                  <p className="mt-0.5 truncate text-xs font-semibold text-slate-700">{profile.roleLabel}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{profile.email}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <VerificationBadge verified={profile.emailVerified} />
                    {!profile.emailVerified ? (
                      <button
                        type="button"
                        disabled={verificationSending}
                        onClick={handleSendVerificationEmail}
                        className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {verificationSending ? 'Sending...' : 'Send Verification Email'}
                      </button>
                    ) : null}
                  </div>
                  {verificationMessage ? <p className="mt-2 text-xs font-semibold text-blue-700">{verificationMessage}</p> : null}
                  <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2">
                    <p className="truncate text-xs font-bold text-slate-700">{profile.workspaceName}</p>
                    <p className="text-xs font-bold text-slate-700">{profile.planLabel}</p>
                    {profile.trialShortLabel ? (
                      <p className="mt-0.5 text-xs text-slate-500">{profile.trialShortLabel}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={handleUpgradePlan}
                    className="mt-3 flex h-9 w-full items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-xs font-bold text-white shadow-sm transition hover:from-blue-700 hover:to-violet-700"
                  >
                    Upgrade Plan
                  </button>
                  <button
                    type="button"
                    disabled={loggingOut}
                    onClick={handleLogout}
                    className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 text-xs font-bold text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FiLogOut className="h-4 w-4" />
                    {loggingOut ? 'Logging out...' : 'Logout'}
                  </button>
                </div>
              ) : null}
            </div>

            {!sidebarCollapsed && (
            <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Package</p>
                  <p className="mt-1 truncate text-xs font-bold text-white">{profile.planLabel}</p>
                  {profile.trialShortLabel ? (
                    <p className="mt-1 text-[11px] font-semibold text-slate-300">{profile.trialShortLabel}</p>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={handleUpgradePlan}
                className="mt-3 flex h-9 w-full items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-xs font-bold text-white shadow-sm transition hover:from-blue-700 hover:to-violet-700"
              >
                Upgrade Plan
              </button>
            </div>
            )}

            <nav className={`${sidebarCollapsed ? 'mt-4 space-y-2' : 'mt-4 space-y-2'}`}>
              <SidebarItem
                icon={HiOutlineSquares2X2}
                label="Enter Workspace"
                active={workspaceView === 'enter'}
                onClick={() => setWorkspaceView('enter')}
                collapsed={sidebarCollapsed}
              />
              <SidebarItem
                icon={HiOutlineSquares2X2}
                label="All Workspaces"
                active={workspaceView === 'all'}
                onClick={() => setWorkspaceView('all')}
                collapsed={sidebarCollapsed}
              />
              <button
                type="button"
                disabled={createDisabled}
                onClick={handleOpenCreate}
                title={sidebarCollapsed ? 'Create New Workspace' : undefined}
                className={`flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-[13px] font-semibold transition ${
                  sidebarCollapsed ? 'justify-center' : ''
                } ${
                  createDisabled
                    ? 'cursor-not-allowed text-slate-400 opacity-80'
                    : 'text-slate-200 hover:bg-white/7 hover:text-white'
                }`}
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded bg-white/15 ${sidebarCollapsed ? 'h-7 w-7' : ''}`}>
                  <HiOutlinePlus className={`${sidebarCollapsed ? 'h-5 w-5' : 'h-4 w-4'}`} />
                </span>
                {!sidebarCollapsed && 'Create New Workspace'}
              </button>
            </nav>

            <div className="mt-4 border-t border-white/10 pt-4">
              {!sidebarCollapsed ? (
                <p className="px-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Your Module Access
                </p>
              ) : null}
              <div className={`${sidebarCollapsed ? 'space-y-2' : 'mt-3 space-y-2'}`}>
                {visibleModuleAccess.map((module) => {
                  const Icon = module.icon
                  const canOpenModule = Boolean(module.active && module.route)

                  return (
                    <button
                      type="button"
                      key={module.name}
                      disabled={!canOpenModule}
                      title={sidebarCollapsed ? module.name : undefined}
                      onClick={() => {
                        const workspace = businessWorkspaceForType(module.type)
                        if (canOpenModule) handleSelectBusinessWorkspace(workspace)
                      }}
                      className={`flex h-9 w-full items-center gap-3 rounded-lg px-2 text-left text-[13px] font-semibold ${
                        sidebarCollapsed ? 'justify-center' : ''
                      } ${
                        module.active ? 'text-white' : 'text-slate-300 opacity-75'
                      }`}
                      aria-disabled={module.disabled ? 'true' : undefined}
                    >
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${module.color}`}>
                        <Icon className="h-4 w-4 text-white" />
                      </span>
                      {!sidebarCollapsed && <span className="truncate">{module.name}</span>}
                      {!sidebarCollapsed && module.disabled ? (
                        <span className="ml-auto shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-300">
                          Soon
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
              {!sidebarCollapsed && hasModuleLock ? (
                <p className="mt-3 px-2 text-xs font-semibold leading-5 text-slate-300">
                  {moduleLockMessage}
                </p>
              ) : null}
            </div>

            <SidebarItem icon={HiOutlineCog6Tooth} label="Settings" muted onClick={() => setSettingsOpen(true)} collapsed={sidebarCollapsed} />

            <div className="mt-auto pt-6">
              <button
                type="button"
                title={sidebarCollapsed ? 'Need Help? Contact our support team' : undefined}
                className={`flex w-full items-center rounded-lg border border-white/10 bg-white/[0.04] text-left ${
                  sidebarCollapsed ? 'justify-center p-2' : 'justify-between p-3'
                }`}
              >
                <span className={`flex min-w-0 items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20">
                    <HiOutlineChatBubbleLeftRight className="h-5 w-5 text-slate-200" />
                  </span>
                  {!sidebarCollapsed && (
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-bold text-white">Need Help?</span>
                      <span className="block truncate text-[11px] text-slate-300">Contact our support team</span>
                    </span>
                  )}
                </span>
                {!sidebarCollapsed && <HiOutlineChevronRight className="h-4 w-4 shrink-0 text-slate-300" />}
              </button>
            </div>
          </div>
        </aside>

        {/* Sidebar overlay for mobile/tablet */}
        {sidebarOpen ? (
          <div
            className="fixed inset-0 z-20 bg-slate-950/45 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        ) : null}

        <section
          className={`min-w-0 flex-1 overflow-x-clip transition-all duration-300 ease-in-out ${
            sidebarCollapsed ? 'lg:ml-[68px]' : 'lg:ml-[250px]'
          }`}
        >
          <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-slate-200 bg-white px-5 lg:px-6">
            <div className="flex min-w-0 items-center gap-5">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100"
                onClick={handleToggleSidebar}
                aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              >
                <HiOutlineBars3 className="h-6 w-6" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold leading-6 text-slate-950">
                  {workspaceView === 'all' ? 'All Workspaces' : 'Enter Workspace'}
                </h1>
                <p className="mt-0.5 truncate text-sm text-slate-500">
                  {workspaceView === 'all' ? 'All Nexora modules on one page' : 'Select a workspace to continue'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="relative hidden sm:block">
                <button
                  type="button"
                  className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100"
                  onClick={() => setNotificationsOpen((open) => !open)}
                  aria-label="Open workspace notifications"
                  aria-expanded={notificationsOpen}
                >
                  <HiOutlineBell className="h-5 w-5" />
                  <span className="absolute right-1.5 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white">
                    {notificationCount}
                  </span>
                </button>
                {notificationsOpen ? (
                  <NotificationDropdown notifications={sampleNotifications} onClose={() => setNotificationsOpen(false)} />
                ) : null}
              </div>
              <span className="hidden h-8 w-px bg-slate-200 sm:block" />
              <div className="relative hidden md:block">
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-700"
                  onClick={() => setLanguageOpen((open) => !open)}
                  aria-expanded={languageOpen}
                >
                  <HiOutlineGlobeAlt className="h-5 w-5" />
                  {selectedLanguage}
                  <HiOutlineChevronDown className="h-4 w-4" />
                </button>
                {languageOpen ? (
                  <div className="absolute right-0 top-full z-30 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-2 text-sm shadow-xl shadow-slate-950/10">
                    <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      Language
                    </p>
                    <div className="space-y-1">
                      {languageOptions.map((language) => (
                        <button
                          key={language}
                          type="button"
                          className={`flex h-8 w-full items-center rounded-md px-2 text-left text-xs font-semibold ${
                            selectedLanguage === language ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                          onClick={() => {
                            setSelectedLanguage(language)
                            setLanguageOpen(false)
                          }}
                        >
                          {language}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 border-t border-slate-100 px-2 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      Region
                    </p>
                    <div className="space-y-1">
                      {regionOptions.map((region) => (
                        <button
                          key={region}
                          type="button"
                          className={`flex h-8 w-full items-center rounded-md px-2 text-left text-xs font-semibold ${
                            selectedRegion === region ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                          onClick={() => setSelectedRegion(region)}
                        >
                          {region}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              <span className="hidden h-8 w-px bg-slate-200 md:block" />
              <button
                type="button"
                disabled={loggingOut}
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FiLogOut className="h-5 w-5" />
                <span className="hidden sm:inline">{loggingOut ? 'Logging out...' : 'Logout'}</span>
              </button>
            </div>
          </header>

          <div className="px-5 py-5 lg:px-6">
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="relative min-h-[150px] rounded-lg border border-slate-200 bg-gradient-to-r from-blue-50 via-sky-50 to-blue-50 px-7 py-6 shadow-sm"
            >
              <div className="max-w-[520px]">
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">Welcome back, {profile.name.split(' ')[0]}.</h2>
                <p className="mt-3 max-w-sm text-sm leading-6 text-slate-600">
                  Select a workspace to access your business data and modules.
                </p>
              </div>

              <div className="pointer-events-none absolute bottom-0 right-8 hidden h-[145px] w-[360px] lg:block">
                <div className="absolute bottom-2 right-28 h-16 w-16 rounded-full bg-blue-600 shadow-[0_18px_35px_-22px_rgba(37,99,235,0.9)]" />
                <div className="absolute bottom-0 right-0 h-24 w-16 rounded-t-full bg-gradient-to-b from-emerald-200 to-slate-100" />
                <div className="absolute bottom-3 right-36 h-14 w-14 rounded-b-3xl rounded-t-lg bg-gradient-to-b from-blue-700 to-blue-500" />
                <div className="absolute bottom-4 right-40 h-5 w-10 rounded-full border-4 border-blue-700" />
                <div className="absolute bottom-0 right-44 h-4 w-20 rounded-full bg-slate-300/60 blur-sm" />
                <div className="absolute bottom-0 right-3 h-4 w-28 rounded-full bg-slate-300/50 blur-sm" />
                <div className="absolute bottom-5 right-11 h-14 w-12 rounded-b-lg bg-slate-200" />
                <div className="absolute bottom-[70px] right-10 h-16 w-3 rotate-[-18deg] rounded-full bg-emerald-300" />
                <div className="absolute bottom-[72px] right-23 h-16 w-3 rotate-[24deg] rounded-full bg-emerald-300" />
                <div className="absolute bottom-[72px] right-16 h-20 w-3 rounded-full bg-emerald-400" />
                <div className="absolute bottom-6 right-52 h-[110px] w-[150px] rounded-t-lg border-[10px] border-slate-800 bg-white shadow-xl">
                  <div className="grid h-full grid-cols-[42px_1fr] gap-2 bg-slate-50 p-2">
                    <div className="space-y-1.5">
                      <span className="block h-2 rounded bg-slate-200" />
                      <span className="block h-2 rounded bg-blue-100" />
                      <span className="block h-2 rounded bg-slate-200" />
                      <span className="block h-2 rounded bg-slate-200" />
                    </div>
                    <div className="space-y-2">
                      <span className="block h-2 rounded bg-slate-200" />
                      <div className="flex items-end gap-1">
                        <span className="h-8 w-2 rounded bg-blue-500" />
                        <span className="h-12 w-2 rounded bg-blue-600" />
                        <span className="h-6 w-2 rounded bg-blue-300" />
                        <span className="h-10 w-2 rounded bg-blue-500" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>

            {profile.trialShortLabel ? (
              <div
                className={`mt-4 flex flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
                  profile.trialExpired
                    ? 'border-red-200 bg-red-50 text-red-800'
                    : 'border-blue-100 bg-blue-50 text-blue-800'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-extrabold">{profile.trialShortLabel}</p>
                  <p className="mt-1 text-xs font-semibold">
                    {profile.trialExpired
                      ? 'Your 7-day workspace trial has expired. Upgrade your package to continue using paid workspace features.'
                      : 'Upgrade any time to keep your CRM workspace active after the trial.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleUpgradePlan}
                  className="flex h-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 px-4 text-sm font-bold text-white shadow-sm transition hover:from-blue-700 hover:to-violet-700"
                >
                  Upgrade Plan
                </button>
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-bold text-slate-950">
                {workspaceView === 'all' ? 'All Workspaces' : 'Your Workspaces'}
              </h2>
              <div className="flex items-center gap-3">
                <label className="relative block w-full sm:w-[270px]">
                  <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    placeholder="Search workspace..."
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <div className="flex h-10 rounded-lg border border-slate-200 bg-white p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`flex h-9 w-9 items-center justify-center rounded-md transition ${
                      viewMode === 'grid' ? 'border border-blue-300 text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-700'
                    }`}
                    aria-label="Grid view"
                    title="Grid View"
                  >
                    <HiOutlineSquares2X2 className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`flex h-9 w-9 items-center justify-center rounded-md transition ${
                      viewMode === 'list' ? 'border border-blue-300 text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-700'
                    }`}
                    aria-label="List view"
                    title="List View"
                  >
                    <HiOutlineBars3 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {viewMode === 'grid' ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visibleWorkspaces.map((workspace, index) => (
                  <WorkspaceCard
                    key={workspace.id}
                    workspace={workspace}
                    index={index}
                    emailVerified={profile.emailVerified}
                    selected={workspace.selected}
                    saving={businessTypeSaving === workspace.type}
                    onSelect={handleSelectBusinessWorkspace}
                  />
                ))}
                <CreateWorkspaceCard disabled={createDisabled} message={createWorkspaceMessage} onOpen={handleOpenCreate} />
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {visibleWorkspaces.map((workspace, index) => (
                  <WorkspaceListRow
                    key={workspace.id}
                    workspace={workspace}
                    index={index}
                    emailVerified={profile.emailVerified}
                    selected={workspace.selected}
                    saving={businessTypeSaving === workspace.type}
                    onSelect={handleSelectBusinessWorkspace}
                  />
                ))}
                <CreateWorkspaceListRow disabled={createDisabled} message={createWorkspaceMessage} onOpen={handleOpenCreate} />
              </div>
            )}

            <section className="mt-5 grid gap-4 rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm sm:grid-cols-2 xl:grid-cols-4">
              {featureStrip.map((feature) => {
                const Icon = feature.icon

                return (
                  <div key={feature.title} className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-xs font-bold text-blue-700">{feature.title}</h3>
                      <p className="mt-1 text-xs leading-4 text-slate-600">{feature.text}</p>
                    </div>
                  </div>
                )
              })}
            </section>

            <footer className="py-6 text-center text-xs font-medium text-slate-500">
              © 2025 Nexora Solutions. All rights reserved.
            </footer>
          </div>
        </section>
      </div>
      {createOpen ? (
        <OnboardingModal
          creating={creatingWorkspace}
          message={createMessage}
          form={onboardingForm}
          onChange={handleOnboardingFieldChange}
          onCreate={handleCreateWorkspace}
          onClose={() => setCreateOpen(false)}
          canClose={!needsWorkspaceOnboarding}
          businessTypeLocked={!developerOverride}
        />
      ) : null}
      {settingsOpen ? (
        <SettingsModal
          profile={profile}
          selectedLanguage={selectedLanguage}
          selectedRegion={selectedRegion}
          workspaceNameDraft={workspaceNameDraft}
          workspaceNameSaving={workspaceNameSaving}
          workspaceNameMessage={workspaceNameMessage}
          onWorkspaceNameChange={setWorkspaceNameDraft}
          onSaveWorkspaceName={handleSaveWorkspaceName}
          onLanguageChange={setSelectedLanguage}
          onRegionChange={setSelectedRegion}
          onLogout={handleLogout}
          loggingOut={loggingOut}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}
    </main>
  )
}
