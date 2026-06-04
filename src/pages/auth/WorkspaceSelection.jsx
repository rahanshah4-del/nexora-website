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
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import logoUrl from '../../assets/logo/nexora-logo.svg'
import useAuth from '../../context/useAuth.js'
import { auth, db } from '../../lib/firebase.js'
import PageLoader from '../../crm/components/ui/PageLoader.jsx'
import { workspacePermissionDefaults } from '../../lib/roles.js'
import { normalizeWorkspaceName, resolveWorkspaceName, saveStoredWorkspaceName } from '../../lib/workspaceName.js'
import {
  businessWorkspaceCatalog,
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
import { getAuthRouteState, isUserCustomVerified, shouldShowWorkspaceSelection } from '../../lib/authRouteState.js'

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

function SidebarItem({ icon: Icon, label, active = false, muted = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-11 w-full items-center justify-between rounded-lg px-3 text-left text-[13px] font-semibold transition ${
        active
          ? 'bg-blue-600 text-white shadow-[0_10px_24px_-14px_rgba(37,99,235,0.85)]'
          : muted
            ? 'text-slate-300 hover:bg-white/7 hover:text-white'
            : 'text-slate-200 hover:bg-white/7 hover:text-white'
      }`}
    >
      <span className="flex min-w-0 items-center gap-3">
        <Icon className="h-[18px] w-[18px] shrink-0" />
        <span className="truncate">{label}</span>
      </span>
      <HiOutlineChevronRight className="h-4 w-4 shrink-0 opacity-80" />
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
    console.log('[WorkspaceSelection] mounted')
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 60000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    let cancelled = false
    setAccountLoading(true)

    async function loadAccount() {
      if (!db || !user?.uid) {
        if (!cancelled) {
          setAccountData(null)
          setWorkspaceData(null)
          setAccountLoading(false)
        }
        return
      }

      const userSnap = await getDoc(doc(db, 'users', user.uid))
      const nextAccount = userSnap.exists() ? userSnap.data() : null
      const workspaceId = cleanString(nextAccount?.workspaceId) || user.uid
      const workspaceSnap = await getDoc(doc(db, 'workspaces', workspaceId))

      if (!cancelled) {
        setAccountData(nextAccount)
        setWorkspaceData(workspaceSnap.exists() ? workspaceSnap.data() : null)
        setAccountLoading(false)
      }
    }

    loadAccount().catch((error) => {
      reportTechnicalError(error, 'Workspace account load')
      if (!cancelled) {
        setAccountData(null)
        setWorkspaceData(null)
        setAccountLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [user?.uid])

  const onboardingCompleted = workspaceData?.onboardingCompleted === true || accountData?.onboardingCompleted === true

  const profile = useMemo(() => {
    const email = cleanString(accountData?.email) || cleanString(user?.email) || 'No email available'
    const name =
      cleanString(accountData?.fullName) ||
      cleanString(accountData?.name) ||
      cleanString(user?.displayName) ||
      cleanString(email.split('@')[0]) ||
      'Nexora User'
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
    const profileBusinessTypeSource = onboardingCompleted
      ? cleanString(workspaceData?.selectedBusinessType || workspaceData?.businessType || accountData?.selectedBusinessType || accountData?.businessType)
      : ''

    return {
      name,
      email,
      emailVerified,
      initials: initialsFor(name, email),
      role: cleanString(accountData?.role) || 'owner',
      workspaceName,
      planLabel: `${packageName}${statusLabel ? ` · ${statusLabel}` : ''}`,
      trialShortLabel: isTrial ? countdown.label : '',
      trialLabel: isTrial ? countdown.detail : `Ends ${formatDate(trialEndsAt)}`,
      trialExpired,
      isTrial,
      workspaceId: cleanString(workspaceData?.workspaceId) || cleanString(accountData?.workspaceId) || user?.uid || '',
      businessType: profileBusinessTypeSource ? normalizeBusinessType(profileBusinessTypeSource) : '',
    }
  }, [accountData, emailVerified, nowMs, onboardingCompleted, user, workspaceData])

  const configuredBusinessTypeSource = onboardingCompleted
    ? cleanString(
        workspaceData?.selectedBusinessType ||
          workspaceData?.businessType ||
          accountData?.selectedBusinessType ||
          accountData?.businessType,
      )
    : ''
  const configuredBusinessType = configuredBusinessTypeSource ? normalizeBusinessType(configuredBusinessTypeSource) : ''
  const configuredSelectedWorkspace = onboardingCompleted
    ? cleanString(workspaceData?.selectedWorkspace) || cleanString(accountData?.selectedWorkspace)
    : ''
  const workspaceFullyConfigured = Boolean(onboardingCompleted && configuredBusinessType && configuredSelectedWorkspace)
  const hasCrmWorkspace = workspaceFullyConfigured
  const developerOverride = isDeveloperOwnerAccount(accountData, user)
  const lockedBusinessTypeSource = onboardingCompleted
    ? cleanString(workspaceData?.primaryBusinessType) ||
      cleanString(accountData?.primaryBusinessType) ||
      cleanString(workspaceData?.selectedBusinessType) ||
      cleanString(workspaceData?.businessType) ||
      cleanString(accountData?.selectedBusinessType) ||
      cleanString(accountData?.businessType)
    : ''
  const lockedBusinessType = lockedBusinessTypeSource ? normalizeBusinessType(lockedBusinessTypeSource) : ''
  const workspaceAllowedBusinessTypes = onboardingCompleted
    ? Array.from(new Set([
        lockedBusinessType,
        ...(Array.isArray(workspaceData?.allowedBusinessTypes) ? workspaceData.allowedBusinessTypes : []),
        ...(Array.isArray(accountData?.allowedBusinessTypes) ? accountData.allowedBusinessTypes : []),
      ].filter(Boolean).map(normalizeBusinessType)))
    : []
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
  const onboardingSelectionMode = !developerOverride && !onboardingCompleted
  const moduleLockMessage = 'This module is not enabled for your account. Contact Nexora support.'
  const needsWorkspaceOnboarding = !authLoading && !accountLoading && Boolean(user?.uid) && !hasCrmWorkspace
  const visibleModuleAccess = useMemo(
    () =>
      hasModuleLock
        ? moduleAccess.filter((workspace) => allowedWorkspaceTypes.includes(normalizeBusinessType(workspace.type)))
        : moduleAccess,
    [allowedWorkspaceTypes, hasModuleLock],
  )
  const visibleWorkspaces = useMemo(
    () => {
      const sourceWorkspaces = hasModuleLock
        ? workspaces.filter((workspace) => allowedWorkspaceTypes.includes(normalizeBusinessType(workspace.type)))
        : workspaces

      return sourceWorkspaces.map((workspace) => {
        const selected = Boolean(lockedBusinessType) && workspace.type === (lockedBusinessType || profile.businessType)
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
    [allowedWorkspaceTypes, hasModuleLock, lockedBusinessType, onboardingSelectionMode, profile.businessType, profile.planLabel, profile.trialExpired, profile.trialShortLabel, profile.workspaceId],
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
    onboardingCompleted,
    user?.uid,
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

    setLoggingOut(true)
    try {
      if (auth) {
        await signOut(auth)
      }
    } finally {
      navigate('/login', { replace: true })
      setLoggingOut(false)
    }
  }, [loggingOut, navigate])

  const handleUpgradePlan = useCallback(() => {
    setProfileOpen(false)
    navigate('/upgrade-business', { state: { fromUpgradeBusiness: true } })
  }, [navigate])

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
    if (businessTypeSaving) return
    if (!emailVerified) {
      setCreateMessage('Please verify your email before creating a workspace.')
      navigate(getAuthRouteState({ ...user, emailVerifiedCustom: accountData?.emailVerifiedCustom }).route)
      return
    }

    const uid = user?.uid
    const workspaceId = cleanString(workspaceData?.workspaceId) || cleanString(accountData?.workspaceId) || uid
    const availableWorkspace = workspace?.active !== false && workspace?.type
    if (!availableWorkspace) {
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
    if (hasModuleLock && !allowedWorkspaceTypes.includes(businessType)) {
      setCreateMessage(moduleLockMessage)
      return
    }
    console.log('[Onboarding] selected module', {
      source: 'workspace-card',
      businessType,
      businessTypeId,
      selectedWorkspace,
      redirectTarget,
    })
    if (!developerOverride && !lockedBusinessType) {
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
      setCreateMessage('Create your company workspace first.')
      setOnboardingForm((current) => ({
        ...current,
        businessType,
      }))
      setCreateOpen(true)
      return
    }
    if (!uid || !workspaceId) {
      console.log('[Onboarding] redirect target', { redirectTarget })
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
      navigate(redirectTarget)
    } catch (error) {
      console.error('[WorkspaceSelection] workspace save fail', {
        workspaceId,
        code: error?.code,
        message: error?.message,
      })
      setCreateMessage(clientSafeMessage(error, 'Could not save business type right now.', { context: 'Business workspace selection' }))
    } finally {
      setBusinessTypeSaving('')
    }
  }, [
    accountData?.workspaceId,
    businessTypeSaving,
    emailVerified,
    hasCrmWorkspace,
    hasModuleLock,
    developerOverride,
    allowedWorkspaceTypes,
    lockedBusinessType,
    moduleLockMessage,
    navigate,
    user?.uid,
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
      const isFirstUserProfile = !userSnap.exists()

      const primaryBusinessType = businessTypeId
      const allowedBusinessTypes = [businessTypeId]
      const baseUserPayload = {
        uid,
        ownerId: uid,
        userId: uid,
        workspaceId,
        fullName: ownerName,
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
      const userPayload = isFirstUserProfile
        ? {
            ...baseUserPayload,
            ...trialUserFields,
            createdAt: now,
            createdBy: uid,
            isAdmin: false,
          }
        : baseUserPayload
      const workspacePayload = {
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
      const ownerMembership = {
        uid,
        staffId: uid,
        ownerId: uid,
        userId: uid,
        workspaceId,
        name: ownerName,
        fullName: ownerName,
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

      await setDoc(userRef, userPayload, { merge: true })
      await setDoc(workspaceRef, workspacePayload, { merge: true })
      await Promise.all([
        setDoc(doc(db, 'workspaces', workspaceId, 'staff', uid), ownerMembership, { merge: true }),
        setDoc(doc(db, 'workspaces', workspaceId, 'teamMembers', uid), ownerMembership, { merge: true }),
        setDoc(
          doc(db, 'workspaces', workspaceId, 'permissions', uid),
          {
            ...workspacePermissionDefaults('owner'),
            ownerId: uid,
            userId: uid,
            staffId: uid,
            workspaceId,
            role: 'owner',
            updatedAt: now,
            updatedBy: uid,
          },
          { merge: true },
        ),
      ])
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
      setAccountData(userPayload)
      setWorkspaceData(workspacePayload)
      setCreateOpen(false)
      setSelectedLanguage(preferredLanguage)
      setSelectedRegion(country)
      setCreateMessage('')
      console.log('[Onboarding] redirect target', { redirectTarget })
      navigate(redirectTarget)
    } catch (error) {
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
        <aside className="bg-[#061a35] text-white lg:fixed lg:inset-y-0 lg:left-0 lg:w-[250px] lg:overflow-y-auto">
          <div className="flex min-h-full flex-col px-4 py-5">
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <img src={logoUrl} alt="Nexora" className="h-10 w-10 rounded-xl" />
                  <p className="text-2xl font-extrabold tracking-[0.08em] text-white">NEXORA</p>
                </div>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-300">
                  Business Suite
                </p>
              </div>
            </div>

            <div className="relative mt-6">
              <button
                type="button"
                onClick={() => setProfileOpen((open) => !open)}
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] p-3 text-left transition hover:bg-white/[0.07]"
                aria-expanded={profileOpen}
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-extrabold text-white">
                    {profile.initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="block truncate text-sm font-bold text-white">{authLoading ? 'Loading...' : profile.name}</span>
                      {profile.emailVerified ? <HiOutlineCheckCircle className="h-4 w-4 shrink-0 text-emerald-300" /> : null}
                    </span>
                    <span className="mt-0.5 block truncate text-xs capitalize text-slate-300">{profile.role}</span>
                  </span>
                  <HiOutlineChevronDown className="h-4 w-4 shrink-0 text-slate-300" />
                </span>
              </button>

              {profileOpen ? (
                <div className="absolute left-0 right-0 top-full z-40 mt-2 rounded-lg border border-white/10 bg-white p-3 text-slate-900 shadow-xl shadow-slate-950/25">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-sm font-bold">{profile.name}</p>
                    {profile.emailVerified ? <HiOutlineCheckCircle className="h-4 w-4 shrink-0 text-emerald-600" /> : null}
                  </div>
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

            <nav className="mt-4 space-y-2">
              <SidebarItem
                icon={HiOutlineSquares2X2}
                label="Enter Workspace"
                active={workspaceView === 'enter'}
                onClick={() => setWorkspaceView('enter')}
              />
              <SidebarItem
                icon={HiOutlineSquares2X2}
                label="All Workspaces"
                active={workspaceView === 'all'}
                onClick={() => setWorkspaceView('all')}
              />
              <button
                type="button"
                disabled={createDisabled}
                onClick={handleOpenCreate}
                className={`flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-[13px] font-semibold transition ${
                  createDisabled
                    ? 'cursor-not-allowed text-slate-400 opacity-80'
                    : 'text-slate-200 hover:bg-white/7 hover:text-white'
                }`}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded bg-white/15">
                  <HiOutlinePlus className="h-4 w-4" />
                </span>
                Create New Workspace
              </button>
            </nav>

            <div className="mt-4 border-t border-white/10 pt-4">
              <p className="px-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Your Module Access
              </p>
              <div className="mt-3 space-y-2">
                {visibleModuleAccess.map((module) => {
                  const Icon = module.icon
                  const canOpenModule = Boolean(module.active && module.route)

                  return (
                    <button
                      type="button"
                      key={module.name}
                      disabled={!canOpenModule}
                      onClick={() => {
                        const workspace = businessWorkspaceForType(module.type)
                        if (canOpenModule) handleSelectBusinessWorkspace(workspace)
                      }}
                      className={`flex h-9 w-full items-center gap-3 rounded-lg px-2 text-left text-[13px] font-semibold ${
                        module.active ? 'text-white' : 'text-slate-300 opacity-75'
                      }`}
                      aria-disabled={module.disabled ? 'true' : undefined}
                    >
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${module.color}`}>
                        <Icon className="h-4 w-4 text-white" />
                      </span>
                      <span className="truncate">{module.name}</span>
                      {module.disabled ? (
                        <span className="ml-auto shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-300">
                          Soon
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
              {hasModuleLock ? (
                <p className="mt-3 px-2 text-xs font-semibold leading-5 text-slate-300">
                  {moduleLockMessage}
                </p>
              ) : null}
            </div>

            <SidebarItem icon={HiOutlineCog6Tooth} label="Settings" muted onClick={() => setSettingsOpen(true)} />

            <div className="mt-auto pt-6">
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] p-3 text-left"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20">
                    <HiOutlineChatBubbleLeftRight className="h-5 w-5 text-slate-200" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-bold text-white">Need Help?</span>
                    <span className="block truncate text-[11px] text-slate-300">Contact our support team</span>
                  </span>
                </span>
                <HiOutlineChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
              </button>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1 overflow-x-clip lg:ml-[250px]">
          <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-slate-200 bg-white px-5 lg:px-6">
            <div className="flex min-w-0 items-center gap-5">
              <button type="button" className="text-slate-700">
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
                  <button type="button" className="flex h-9 w-9 items-center justify-center rounded-md border border-blue-300 text-blue-600">
                    <HiOutlineSquares2X2 className="h-5 w-5" />
                  </button>
                  <button type="button" className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500">
                    <HiOutlineBars3 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

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
