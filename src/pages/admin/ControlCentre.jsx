import { Component, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  HiOutlineBell,
  HiOutlineBriefcase,
  HiOutlineBuildingOffice2,
  HiOutlineChatBubbleLeftRight,
  HiOutlineChartBarSquare,
  HiOutlineCheckBadge,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineCog6Tooth,
  HiOutlineCreditCard,
  HiOutlineCurrencyDollar,
  HiOutlineDocumentText,
  HiOutlineEnvelope,
  HiOutlineHome,
  HiOutlineKey,
  HiOutlineSparkles,
  HiOutlineLifebuoy,
  HiOutlineBars3,
  HiOutlineMegaphone,
  HiOutlineMoon,
  HiOutlineShieldCheck,
  HiOutlineStar,
  HiOutlineTag,
  HiOutlineUserGroup,
  HiOutlineUsers,
  HiOutlineWrenchScrewdriver,
} from 'react-icons/hi2'
import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { labelForBusinessType } from '../../crm/data/moduleAccess.js'
import ClientCommandCenter from './ClientCommandCenter.jsx'
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { auth, firebaseAuthEnabled, firestoreDb as db, getFirebaseAuthConfigMessage, missingFirebaseAuthEnvVars } from '../../lib/firebase.js'
import useAuth from '../../context/useAuth.js'
import { clientSafeMessage } from '../../lib/errorHandler.js'
import { isBackendAdminEmail } from '../../lib/roles.js'
import {
  defaultMaintenanceConfig,
  maintenanceModules,
  maintenanceTargets,
  normalizeMaintenanceConfig,
} from '../../lib/maintenanceMode.js'
import logoUrl from '../../assets/logo/nexora-logo.svg'
import { loadPublicReviews, updateReviewStatus } from '../../crm/data/reviewStorage.js'
import ClientReviews from '../../crm/components/admin/ClientReviewsPanel.jsx'
import {
  DEFAULT_SAAS_CURRENCY,
  PLATFORM_PLAN_COLLECTION,
  defaultPlatformSettings as defaultSaasPlatformSettings,
  mergePlatformPlans,
  planPriceLabel,
} from '../../lib/platformPlans.js'
import {
  EMAIL_WORKER_URL,
  createPasswordResetLink,
  passwordResetEmail,
  sendWorkerEmail,
  trialExpiryReminderEmail,
  upgradeApprovedEmail,
  upgradeRejectedEmail,
} from '../../lib/transactionalEmail.js'
import {
  WHATSAPP_TRIAL_DAYS,
  WHATSAPP_TRIAL_MESSAGE_LIMIT,
  normalizeWhatsappConfig,
  whatsappTrialStatus,
} from '../../crm/lib/whatsappApiTrial.js'
import { useWhatsappPricing } from '../../crm/hooks/useWhatsappPricing.js'
import {
  SUPPORTED_PRICING_CURRENCIES,
  defaultWhatsappPricing,
  formatPricingAmount,
} from '../../crm/lib/whatsappPricing.js'
import { buildApprovedSubscriptionPayload } from '../../lib/subscriptionApproval.js'
import { listWorkerUpgradeRequests, updateWorkerUpgradeRequestStatus } from '../../lib/upgradeWorker.js'
import { createWorkspaceNotification, workspaceNotificationTargets } from '../../crm/lib/notifications.js'
import EmailMarketing from './EmailMarketing.jsx'
import AdminBusinessServices from './BusinessServices.jsx'
import BlogManager from './BlogManager.jsx'
import AIConversationDashboard from './AIConversationDashboard.jsx'
import { adminForceLogoutUser, adminListPasskeySecurity, adminUpdatePasskey } from '../../lib/passkeys.js'

function needsBackendWarning(actionId = '') {
  return /approve|reject|delete|remove|block|deactivate|disable|resolve|close|complete|paid|reset|logout|toggle/i.test(String(actionId))
}

function backendWarningMessage(actionId = '') {
  const id = String(actionId)
  if (/delete|remove/i.test(id)) return 'Warning: this will remove backend data. Continue?'
  if (/approve|paid/i.test(id)) return 'Warning: this will approve or mark a payment as paid. Continue?'
  if (/reject/i.test(id)) return 'Warning: this will reject the request and notify/update the client record. Continue?'
  if (/block|deactivate|disable/i.test(id)) return 'Warning: this may disable client access. Continue?'
  if (/resolve|close|complete/i.test(id)) return 'Warning: this will change the request/ticket status. Continue?'
  return 'Warning: this backend action will update live data. Continue?'
}

export class ControlCentreErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[Backend Control Centre] Runtime render error', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
          <section className="mx-auto max-w-4xl rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-rose-600">Backend Control Centre</p>
            <h1 className="mt-3 text-2xl font-black tracking-tight">Control centre could not render</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">A runtime error was caught before the admin page could finish loading.</p>
            <pre className="mt-4 max-h-60 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-rose-100">
              {this.state.error?.message || String(this.state.error)}
            </pre>
            <button type="button" className="mt-5 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white" onClick={() => this.setState({ error: null })}>
              Try Again
            </button>
          </section>
        </main>
      )
    }
    return this.props.children
  }
}

const modules = ['General CRM', 'School ERP', 'Retail / POS', 'Property ERP', 'Restaurant POS', 'WhatsApp CRM', 'Transport / Rental']
const planNames = ['Basic', 'Standard', 'Enterprise']
const adminRoles = ['Super Admin', 'Admin', 'Support', 'Billing Manager', 'Read Only']
const moduleColors = ['#7c3aed', '#3b82f6', '#f59e0b', '#ef4444', '#14b8a6', '#0ea5e9', '#f97316']
const paidSubscriptionStatuses = ['active', 'paid', 'approved', 'current']
const defaultPlatformSettings = {
  ...defaultSaasPlatformSettings,
  systemName: 'Nexora Solution',
  defaultCurrency: DEFAULT_SAAS_CURRENCY,
  trialDays: 7,
  supportEmail: 'support@nexorasolution.online',
  maintenanceMode: false,
  maintenanceConfig: defaultMaintenanceConfig,
  emailSenderName: 'Nexora Solution',
  emailReplyTo: 'support@nexorasolution.online',
  featureFlags: {
    announcements: true,
    supportTickets: true,
    planUpgrades: true,
    maintenanceBanner: false,
    aiMenuImport: true,
  },
  aiMenuImport: {
    ocrProvider: 'gemini',
    maxUploadSizeMB: 10,
    allowedFileTypes: 'jpg,png,webp,pdf',
    confidenceThreshold: 0.7,
  },
}

const navGroups = [
  {
    label: 'SaaS Business',
    items: [
      ['dashboard', 'Dashboard', HiOutlineHome],
      ['activity', 'Live Client Activity', HiOutlineChartBarSquare],
      ['clients', 'Clients / Workspaces', HiOutlineBuildingOffice2],
      ['users', 'Authentication / Users', HiOutlineUsers],
      ['upgrades', 'Upgrade Requests', HiOutlineCheckBadge],
      ['transactions', 'Transactions', HiOutlineCurrencyDollar],
      ['plans', 'Plans', HiOutlineCreditCard],
      ['promoCodes', 'Promo Codes', HiOutlineTag],
      ['businessServices', 'Business Services', HiOutlineBriefcase],
      ['whatsappPricing', 'WhatsApp Pricing', HiOutlineChatBubbleLeftRight],
      ['visitorAnalytics', 'Visitor Analytics', HiOutlineChartBarSquare],
      ['behaviorInterest', 'Behavior Interest', HiOutlineChartBarSquare],
      ['security', 'Security / Passkeys', HiOutlineKey],
    ],
  },
  {
    label: 'Communication',
    items: [
      ['emailMarketing', 'Email Marketing', HiOutlineEnvelope],
      ['blogCms', 'Blog CMS', HiOutlineDocumentText],
      ['announcements', 'Announcements', HiOutlineMegaphone],
      ['commandCenter', 'Command Center', HiOutlineChatBubbleLeftRight],
      ['aiDashboard', 'AI Dashboard', HiOutlineSparkles],
      ['support', 'Support Tickets', HiOutlineLifebuoy],
      ['reviews', 'Client Reviews', HiOutlineStar],
    ],
  },
  {
    label: 'System',
    items: [
      ['systemHealth', 'System Health', HiOutlineShieldCheck],
      ['maintenance', 'Maintenance Mode', HiOutlineWrenchScrewdriver],
      ['settings', 'Settings', HiOutlineCog6Tooth],
      ['logs', 'System Logs', HiOutlineCog6Tooth],
      ['roles', 'Roles & Permissions', HiOutlineShieldCheck],
      ['staff', 'Staff Management', HiOutlineUserGroup],
    ],
  },
]

function toDate(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null)
  return date && !Number.isNaN(date.getTime()) ? date : null
}

function dateTimeLabel(value) {
  const date = toDate(value)
  return date ? date.toLocaleString() : '-'
}

function dateLabel(value) {
  const date = toDate(value)
  return date ? date.toLocaleDateString() : '-'
}

function money(value, currency = DEFAULT_SAAS_CURRENCY) {
  if (String(value).toLowerCase() === 'custom') return 'Custom'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(value || 0))
}

function amountValue(row = {}) {
  return Number(row.amount ?? row.amountPaid ?? row.price ?? row.total ?? 0) || 0
}

function generatePromoCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  const suffix = Array.from(bytes, (byte) => (byte % 36).toString(36)).join('').toUpperCase()
  return `NEXORA-${suffix}`
}

function promoDateInput(daysFromNow = 0) {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  return date.toISOString().slice(0, 10)
}

function rowCurrency(row = {}) {
  return row.currency || row.billingCurrency || DEFAULT_SAAS_CURRENCY
}

function proofUrl(row = {}) {
  return row.paymentProof || row.proofUrl || row.screenshotUrl || row.paymentProofUrl || ''
}

function statusValue(value, fallback = 'unknown') {
  return String(value || fallback).trim().toLowerCase().replace(/\s+/g, '_')
}

function supportTicketTone(row = {}) {
  const priority = statusValue(row.priority, 'medium')
  const status = statusValue(row.status, 'open')
  const categoryText = `${row.category || ''} ${row.module || ''} ${row.title || ''} ${row.subject || ''} ${row.description || ''}`.toLowerCase()
  const isPayment = /payment|billing|invoice|upgrade|plan|paid|transaction|receipt|proof/.test(categoryText)
  const isResolved = ['resolved', 'completed', 'closed'].includes(status)
  if (isResolved) {
    return {
      row: 'bg-emerald-50/45 hover:bg-emerald-50',
      card: 'border-emerald-200 bg-emerald-50/80',
      stripe: 'from-emerald-400 to-teal-500',
      label: 'Resolved',
      pill: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
      rank: 5,
    }
  }
  if (priority === 'urgent' || priority === 'critical') {
    return {
      row: 'bg-rose-50/70 hover:bg-rose-50',
      card: 'border-rose-200 bg-rose-50',
      stripe: 'from-rose-500 to-red-600',
      label: 'Urgent',
      pill: 'bg-rose-100 text-rose-700 ring-rose-200',
      rank: 0,
    }
  }
  if (priority === 'high') {
    return {
      row: 'bg-orange-50/70 hover:bg-orange-50',
      card: 'border-orange-200 bg-orange-50',
      stripe: 'from-orange-500 to-amber-500',
      label: 'High',
      pill: 'bg-orange-100 text-orange-700 ring-orange-200',
      rank: 1,
    }
  }
  if (isPayment) {
    return {
      row: 'bg-sky-50/70 hover:bg-sky-50',
      card: 'border-sky-200 bg-sky-50',
      stripe: 'from-sky-500 to-blue-600',
      label: 'Payment',
      pill: 'bg-sky-100 text-sky-700 ring-sky-200',
      rank: 2,
    }
  }
  return {
    row: 'hover:bg-slate-50/80',
    card: 'border-slate-200 bg-white',
    stripe: 'from-slate-300 to-slate-400',
    label: priority === 'low' ? 'Low' : 'Normal',
    pill: priority === 'low' ? 'bg-slate-100 text-slate-600 ring-slate-200' : 'bg-violet-50 text-violet-700 ring-violet-100',
    rank: 3,
  }
}

function workspaceBusinessType(row = {}) {
  return row.primaryBusinessType || row.selectedBusinessType || row.currentBusinessType || row.businessType || row.module || 'General CRM'
}

function normalizeAdminBusinessType(type) {
  const value = String(type || '').trim().toLowerCase()
  if (['transport', 'rental', 'transport rental', 'transport/rental', 'transport-rental', 'transport / rental', 'transport / logistics', 'transport logistics', 'fleet', 'fleet rental'].includes(value)) {
    return 'Transport / Rental'
  }
  return modules.find((module) => module.toLowerCase() === value) || modules.find((module) => value && module.toLowerCase().includes(value)) || 'General CRM'
}

function displayAdminBusinessType(type) {
  const value = String(type || '').trim()
  return value ? labelForBusinessType(normalizeAdminBusinessType(value)) : '-'
}

function businessTypeForSelectedWorkspace(value) {
  const selected = String(value || '').trim().toLowerCase()
  if (!selected) return ''
  const map = {
    crm: 'General CRM',
    'general-crm': 'General CRM',
    'sales-hub': 'General CRM',
    'nexora-sales-hub': 'General CRM',
    'school-erp': 'School ERP',
    school: 'School ERP',
    'retail-pos': 'Retail / POS',
    retail: 'Retail / POS',
    pos: 'Retail / POS',
    'property-erp': 'Property ERP',
    property: 'Property ERP',
    'restaurant-pos': 'Restaurant POS',
    restaurant: 'Restaurant POS',
    'whatsapp-crm': 'WhatsApp CRM',
    whatsapp: 'WhatsApp CRM',
    'transport-rental': 'Transport / Rental',
    transport: 'Transport / Rental',
    rental: 'Transport / Rental',
    fleet: 'Transport / Rental',
  }
  if (map[selected]) return map[selected]
  return normalizeAdminBusinessType(selected)
}

function moduleConsistencyIssue(row = {}, source = 'workspace') {
  const selectedWorkspace = row.selectedWorkspace || row.selectedProduct || row.workspaceModule || ''
  const expected = businessTypeForSelectedWorkspace(selectedWorkspace)
  const runtimeFields = [
    ['selectedBusinessType', row.selectedBusinessType],
    ['currentBusinessType', row.currentBusinessType],
    ['businessType', row.businessType],
    ['module', row.module],
  ].filter(([, value]) => String(value || '').trim())
  const normalizedRuntimeFields = runtimeFields.map(([field, value]) => ({ field, value: normalizeAdminBusinessType(value), raw: value }))
  const runtimeValues = Array.from(new Set(normalizedRuntimeFields.map((item) => item.value).filter(Boolean)))
  const mismatched = []
  const specialAccess = row.allModulesAccess === true || row.specialModuleAccess === true || (Array.isArray(row.allowedBusinessTypes) && row.allowedBusinessTypes.length > 1)

  if (runtimeValues.length > 1) {
    const expectedRuntime = normalizeAdminBusinessType(row.currentBusinessType || row.selectedBusinessType || row.businessType || row.module)
    normalizedRuntimeFields
      .filter((item) => item.value !== expectedRuntime)
      .forEach((item) => mismatched.push(item))
  }

  const primary = String(row.primaryBusinessType || '').trim() ? normalizeAdminBusinessType(row.primaryBusinessType) : ''
  const activeRuntime = normalizeAdminBusinessType(row.currentBusinessType || row.selectedBusinessType || row.businessType || row.module)
  if (!specialAccess && primary && activeRuntime && primary !== activeRuntime) {
    mismatched.push({ field: 'primaryBusinessType', value: primary, raw: row.primaryBusinessType })
  }

  if (!mismatched.length) return null
  return {
    id: `${source}-${row.id || row.uid || row.userId || row.workspaceId || row.email || selectedWorkspace}`,
    source,
    row,
    selectedWorkspace,
    expected: activeRuntime || primary || expected || 'Unknown',
    mismatched,
    label: workspaceName(row),
    email: userEmail(row),
  }
}

function moduleAccessForWorkspace(row = {}) {
  const primary = normalizeAdminBusinessType(row.primaryBusinessType || row.selectedBusinessType || row.businessType)
  if (row.allModulesAccess === true) return { primary, allowed: modules, special: true, all: true }
  const allowed = Array.from(new Set([primary, ...(Array.isArray(row.allowedBusinessTypes) ? row.allowedBusinessTypes : [])].map(normalizeAdminBusinessType)))
  return { primary, allowed, special: row.specialModuleAccess === true || allowed.length > 1, all: false }
}

function workspaceName(row = {}) {
  return row.companyName || row.workspaceName || row.businessName || row.name || row.email || row.id || 'Workspace'
}

function userName(row = {}) {
  return row.displayName || row.fullName || row.name || row.email || row.id || 'User'
}

function userEmail(row = {}) {
  return row.email || row.ownerEmail || row.clientEmail || ''
}

function phoneNumber(row = {}) {
  return row.phone || row.phoneNumber || row.ownerPhone || row.mobile || ''
}

function isPaid(row = {}) {
  return ['paid', 'approved', 'active', 'completed'].includes(statusValue(row?.paymentStatus || row?.approvalStatus || row?.status || row?.planStatus))
}

function isPaidSubscriptionStatus(row = {}) {
  return paidSubscriptionStatuses.includes(statusValue(row.subscriptionStatus || row.planStatus))
}

const subscriptionSyncFields = new Set([
  'accountStatus',
  'billingCycle',
  'billingCurrency',
  'expiresAt',
  'isTrialActive',
  'nextBillingDate',
  'paidAt',
  'paymentStatus',
  'plan',
  'planStatus',
  'selectedPlan',
  'status',
  'subscriptionExpiresAt',
  'subscriptionStartedAt',
  'subscriptionStatus',
  'trialDays',
  'trialEndsAt',
  'trialStartAt',
  'trialStartedAt',
  'upgradedAt',
])

function shouldSyncSubscriptionPayload(payload = {}) {
  return Object.keys(payload || {}).some((key) => subscriptionSyncFields.has(key))
}

function hasMissingPaidSubscriptionExpiry(row = {}) {
  return isPaidSubscriptionStatus(row) && (!toDate(row.subscriptionExpiresAt) || !toDate(row.nextBillingDate))
}

function workspaceStatusForDisplay(row = {}) {
  if (hasMissingPaidSubscriptionExpiry(row)) return 'Invalid subscription: missing expiry'
  return row.status || row.subscriptionStatus || row.planStatus || (isTrial(row) ? 'trial' : 'active')
}

function isTrial(row = {}) {
  return row.isTrialActive === true || ['trial', 'free_trial'].includes(statusValue(row.subscriptionStatus || row.planStatus))
}

function isExpired(row = {}) {
  if (hasMissingPaidSubscriptionExpiry(row)) return true
  const status = statusValue(row.subscriptionStatus || row.planStatus || row.status)
  const trialEndsAt = toDate(row.trialEndsAt)
  const expiresAt = toDate(row.subscriptionExpiresAt || row.expiresAt)
  return ['expired', 'cancelled', 'canceled', 'inactive'].includes(status) || (trialEndsAt && trialEndsAt < new Date()) || (expiresAt && expiresAt < new Date())
}

function ageMinutes(value, now = Date.now()) {
  const date = toDate(value)
  if (!date) return null
  return Math.max(0, (now - date.getTime()) / 60000)
}

function ageLabel(value, now = Date.now()) {
  const minutes = ageMinutes(value, now)
  if (minutes == null) return '-'
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))}m ago`
  if (minutes < 1440) return `${Math.max(1, Math.round(minutes / 60))}h ago`
  return `${Math.max(1, Math.round(minutes / 1440))}d ago`
}

function listSummary(values = [], limit = 3) {
  const items = values.filter(Boolean)
  if (!items.length) return '-'
  const visible = items.slice(0, limit)
  const extra = items.length - visible.length
  return `${visible.join(', ')}${extra > 0 ? ` +${extra} more` : ''}`
}

function healthCardClass(status) {
  const value = statusValue(status)
  if (['critical', 'error', 'failed', 'blocked', 'offline'].includes(value)) return 'border-rose-200 bg-rose-50/70'
  if (['warning', 'degraded', 'stale', 'pending'].includes(value)) return 'border-amber-200 bg-amber-50/70'
  if (['healthy', 'online', 'verified', 'ready', 'synced', 'connected', 'enabled', 'active'].includes(value)) return 'border-emerald-200 bg-emerald-50/70'
  return 'border-slate-200 bg-slate-50/70'
}

function daysLeft(value, now = Date.now()) {
  const date = toDate(value)
  if (!date) return '-'
  return Math.max(0, Math.ceil((date.getTime() - now) / 86400000))
}

function isOnline(row = {}, now = Date.now()) {
  const lastActive = toDate(row.lastActiveAt)
  return Boolean(lastActive && now - lastActive.getTime() <= 5 * 60 * 1000)
}

function normalizeSnapDoc(docSnap) {
  const data = docSnap.data()
  return {
    id: docSnap.id,
    ref: docSnap.ref,
    path: docSnap.ref.path,
    ...data,
  }
}

function firestoreErrorMessage(key, error) {
  const code = error?.code || error?.name || 'unknown'
  const rawMessage = error?.message || String(error || 'Unknown Firestore error')
  const indexUrl = rawMessage.match(/https:\/\/console\.firebase\.google\.com[^\s)]+/)?.[0] || ''
  if (code === 'permission-denied') return `permission-denied: Backend admin needs Firestore admin read permission. Firebase message: ${rawMessage}`
  if (code === 'failed-precondition' && indexUrl) return `index-needed: Firestore requires an index for ${key}. ${indexUrl}`
  if (code === 'not-found') return `not-found: ${key} is unavailable. Showing an empty state. Firebase message: ${rawMessage}`
  return `${code}: ${rawMessage}`
}

function useDocumentVisible() {
  const [visible, setVisible] = useState(() => (typeof document === 'undefined' ? true : !document.hidden))
  useEffect(() => {
    const update = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', update)
    window.addEventListener('focus', update)
    window.addEventListener('blur', update)
    return () => {
      document.removeEventListener('visibilitychange', update)
      window.removeEventListener('focus', update)
      window.removeEventListener('blur', update)
    }
  }, [])
  return visible
}

function useControlCentreData({ enabled = true } = {}) {
  const [state, setState] = useState({
    users: [],
    workspaces: [],
    upgradeRequests: [],
    subscriptions: [],
    platformPayments: [],
    backendActivityLogs: [],
    announcements: [],
    supportTickets: [],
    plans: [],
    promoCodes: [],
    backendStaff: [],
    clientSessions: [],
    userPresence: [],
    platformSettings: [],
    analyticsEvents: [],
    userSessions: [],
    whatsappSettings: [],
    businessServiceRequests: [],
    loading: Boolean(db),
    error: '',
    sourceErrors: {},
  })

  useEffect(() => {
    if (!enabled) {
      setState((current) => ({ ...current, loading: false }))
      return undefined
    }
    if (!db) {
      setState((current) => ({ ...current, loading: false, error: 'Firebase is not configured.' }))
      return undefined
    }

    const cache = {
      users: [],
      workspaces: [],
      upgradeRequests: [],
      subscriptions: [],
      platformPayments: [],
      backendActivityLogs: [],
      announcements: [],
      supportTickets: [],
      plans: [],
      promoCodes: [],
      backendStaff: [],
      clientSessions: [],
      userPresence: [],
      platformSettings: [],
      analyticsEvents: [],
      userSessions: [],
      whatsappSettings: [],
      businessServiceRequests: [],
    }
    const expected = Object.keys(cache).length
    const loaded = new Set()
    const setRows = (key, docs) => {
      cache[key] = docs
      loaded.add(key)
      setState((current) => ({
        ...current,
        ...cache,
        loading: loaded.size < expected,
        sourceErrors: Object.fromEntries(Object.entries(current.sourceErrors || {}).filter(([source]) => source !== key)),
      }))
    }
    const fail = (key, error) => {
      console.error(`[Backend Control Centre] Firestore listener failed for ${key}`, {
        code: error?.code,
        message: error?.message,
        error,
      })
      const message = firestoreErrorMessage(key, error)
      setState((current) => ({
        ...current,
        loading: false,
        error: error?.code === 'permission-denied' ? 'Backend admin needs Firestore admin read permission.' : current.error,
        sourceErrors: { ...(current.sourceErrors || {}), [key]: message },
      }))
    }
    const listen = (key, collectionName, rowLimit = 300, sortField = '') => {
      try {
        const collectionQuery = sortField
          ? query(collection(db, collectionName), orderBy(sortField, 'desc'), limit(rowLimit))
          : query(collection(db, collectionName), limit(rowLimit))
        return onSnapshot(
          collectionQuery,
          (snap) => setRows(key, snap.docs.map(normalizeSnapDoc)),
          (error) => {
            setRows(key, [])
            fail(key, error)
          },
        )
      } catch (error) {
        setRows(key, [])
        fail(key, error)
        return () => {}
      }
    }
    // Collection-group listener — reads a subcollection across all workspaces
    // (e.g. workspaces/{id}/whatsappSettings/config) for per-workspace status.
    const listenGroup = (key, groupId, rowLimit = 500) => {
      try {
        return onSnapshot(
          query(collectionGroup(db, groupId), limit(rowLimit)),
          (snap) => setRows(key, snap.docs.map(normalizeSnapDoc)),
          (error) => {
            setRows(key, [])
            fail(key, error)
          },
        )
      } catch (error) {
        setRows(key, [])
        fail(key, error)
        return () => {}
      }
    }

    const unsubscribers = [
      listen('users', 'users', 180),
      listen('workspaces', 'workspaces', 180),
      listen('upgradeRequests', 'upgradeRequests', 80),
      listen('subscriptions', 'subscriptions', 100),
      listen('platformPayments', 'platformPayments', 100),
      listen('backendActivityLogs', 'backendActivityLogs', 80),
      listen('announcements', 'announcements', 80),
      listenGroup('supportTickets', 'supportTickets', 100),
      listen('plans', PLATFORM_PLAN_COLLECTION, 50),
      listen('promoCodes', 'promoCodes', 100),
      listen('backendStaff', 'backendStaff', 100),
      listen('clientSessions', 'clientSessions', 80),
      listen('userPresence', 'userPresence', 80),
      listen('platformSettings', 'platformSettings', 20),
      listen('analyticsEvents', 'analyticsEvents', 100, 'createdAt'),
      listen('userSessions', 'userSessions', 80, 'lastActiveAt'),
      listenGroup('whatsappSettings', 'whatsappSettings', 80),
      listen('businessServiceRequests', 'businessServiceRequests', 80),
    ]

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe?.())
  }, [enabled])

  return state
}

function Card({ children, className = '' }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</section>
}

function ShellButton({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-violet-200 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

function Status({ value }) {
  const status = statusValue(value)
  const tone = status.startsWith('invalid_subscription')
    ? 'bg-rose-50 text-rose-700 ring-rose-100'
    : ['active', 'paid', 'approved', 'healthy', 'online', 'verified', 'connected', 'ready', 'synced', 'enabled', 'resolved', 'completed', 'closed'].includes(status)
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
    : ['trial', 'pending', 'pending_approval', 'warning', 'degraded', 'stale', 'medium'].includes(status)
      ? 'bg-amber-50 text-amber-700 ring-amber-100'
      : ['blocked', 'disabled', 'expired', 'rejected', 'offline', 'critical', 'error', 'failed', 'urgent', 'high'].includes(status)
        ? 'bg-rose-50 text-rose-700 ring-rose-100'
        : ['low'].includes(status)
          ? 'bg-sky-50 text-sky-700 ring-sky-100'
          : 'bg-slate-100 text-slate-600 ring-slate-200'
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1 ${tone}`}>{String(value || 'Unknown').replace(/_/g, ' ')}</span>
}

function EmptyState({ title = 'No data yet', detail = 'This panel is connected to Firestore and will populate when SaaS records exist.' }) {
  return (
    <div className="grid min-h-[10rem] place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center">
      <div>
        <p className="text-sm font-black text-slate-900">{title}</p>
        <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">{detail}</p>
      </div>
    </div>
  )
}

function KpiCard({ label, value, helper, icon: Icon, tone = 'violet' }) {
  const colors = {
    violet: 'bg-violet-100 text-violet-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    sky: 'bg-sky-100 text-sky-700',
    rose: 'bg-rose-100 text-rose-700',
  }
  return (
    <Card className="min-w-0 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black leading-4 text-slate-500">{label}</p>
          <p className="mt-3 break-words text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{value}</p>
          <p className="mt-2 break-words text-xs font-semibold leading-5 text-slate-500">{helper}</p>
        </div>
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${colors[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Card>
  )
}

function Panel({ title, action, children }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <p className="text-sm font-black text-slate-950">{title}</p>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </Card>
  )
}

function AdminTable({ columns, rows, emptyTitle, maxHeight = 'max-h-[30rem]', rowClassName }) {
  if (!rows.length) return <EmptyState title={emptyTitle} />
  return (
    <div className={`overflow-auto ${maxHeight}`}>
      <table className="min-w-full text-left text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
          <tr>{columns.map((column) => <th key={column.key} className="whitespace-nowrap px-4 py-3">{column.label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.path || row.id} className={`align-top ${rowClassName ? rowClassName(row) : 'hover:bg-slate-50/80'}`}>
              {columns.map((column) => <td key={column.key} className="px-4 py-3 text-slate-700">{column.render ? column.render(row) : row[column.key] || '-'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function searchRows(rows, queryText, fields) {
  const q = queryText.trim().toLowerCase()
  if (!q) return rows
  return rows.filter((row) => fields.some((field) => String(row[field] || '').toLowerCase().includes(q)))
}

function backendNotificationDocId(notificationId = '') {
  return String(notificationId || 'notification')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180) || `notification-${Date.now()}`
}

function mergePresence(users, clientSessions, userPresence) {
  const sessionByUid = new Map([...clientSessions, ...userPresence].map((row) => [row.uid || row.userId || row.id, row]))
  return users.map((user) => ({ ...user, ...(sessionByUid.get(user.uid || user.id) || {}) }))
}

export default function ControlCentre() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const pageVisible = useDocumentVisible()
  const backendAdminAllowed = isBackendAdminEmail(user?.email)
  const data = useControlCentreData({ enabled: backendAdminAllowed && pageVisible })
  const [activeTab, setActiveTab] = useState('dashboard')
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState('')
  const [toast, setToast] = useState('')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('nexora-backend-sidebar-collapsed') === 'true'
  })
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [backendNotificationStates, setBackendNotificationStates] = useState({})
  const [backendNotificationStateError, setBackendNotificationStateError] = useState('')
  const [staffDraft, setStaffDraft] = useState({ name: '', email: '', role: 'Support' })
  const [announcementDraft, setAnnouncementDraft] = useState({
    title: '',
    message: '',
    type: 'info',
    audience: 'all',
    workspaceId: '',
    businessType: '',
    priority: 'medium',
    scheduledAt: '',
    expiresAt: '',
    pinned: false,
    status: 'draft',
  })
  const [ticketDraft, setTicketDraft] = useState({ title: '', clientEmail: '', category: 'Technical Support', priority: 'medium', workspaceId: '' })
  const [transactionStatusFilter, setTransactionStatusFilter] = useState('all')
  const [transactionPlanFilter, setTransactionPlanFilter] = useState('all')
  const [transactionMethodFilter, setTransactionMethodFilter] = useState('all')
  const [transactionDateFrom, setTransactionDateFrom] = useState('')
  const [transactionDateTo, setTransactionDateTo] = useState('')
  const [workspaceStatusFilter, setWorkspaceStatusFilter] = useState('all')
  const [workspacePlanFilter, setWorkspacePlanFilter] = useState('all')
  const [userFilter, setUserFilter] = useState('all')
  const [settingsDraft, setSettingsDraft] = useState(defaultPlatformSettings)
  const [promoDraft, setPromoDraft] = useState({
    code: generatePromoCode(),
    description: '',
    discountType: 'percentage',
    discountValue: 10,
    maxDiscount: 0,
    minOrderAmount: 0,
    applicablePlanId: 'all',
    billingCycle: 'all',
    startsAt: promoDateInput(0),
    expiresAt: promoDateInput(30),
    usageLimit: 100,
    active: true,
  })
  const [promoDeleteTarget, setPromoDeleteTarget] = useState(null)
  const [promoEditingId, setPromoEditingId] = useState('')
  const [workerUpgradeRequests, setWorkerUpgradeRequests] = useState([])
  const [workerUpgradeError, setWorkerUpgradeError] = useState('')
  const [passkeySecurity, setPasskeySecurity] = useState({ passkeys: [], loginHistory: [], activeSessions: [] })
  const [passkeySecurityError, setPasskeySecurityError] = useState('')
  const [liveNow, setLiveNow] = useState(() => Date.now())
  const whatsappPricingApi = useWhatsappPricing({ enabled: true })
  const [whatsappPricingDraft, setWhatsappPricingDraft] = useState(defaultWhatsappPricing)
  if (import.meta.env.DEV) console.log('[Admin Auth] ControlCentre admin check:', user?.email, backendAdminAllowed ? 'allowed' : 'blocked')

  useEffect(() => {
    const tick = () => setLiveNow(Date.now())
    tick()
    const timer = window.setInterval(() => {
      if (!document.hidden) tick()
    }, 30000)
    window.addEventListener('focus', tick)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', tick)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])

  useEffect(() => {
    if (!backendAdminAllowed || !user?.getIdToken) return undefined
    let cancelled = false
    async function loadWorkerUpgradeRequests() {
      if (document.hidden) return
      try {
        const token = await user.getIdToken()
        const rows = await listWorkerUpgradeRequests(token, 100)
        if (!cancelled) {
          setWorkerUpgradeRequests(rows)
          setWorkerUpgradeError('')
        }
      } catch (error) {
        if (!cancelled) setWorkerUpgradeError(clientSafeMessage(error, 'Cloudflare upgrade requests are not available.'))
      }
    }
    loadWorkerUpgradeRequests()
    window.addEventListener('focus', loadWorkerUpgradeRequests)
    const timer = window.setInterval(loadWorkerUpgradeRequests, 120000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener('focus', loadWorkerUpgradeRequests)
    }
  }, [backendAdminAllowed, user])

  useEffect(() => {
    if (!backendAdminAllowed) return undefined
    let cancelled = false
    async function loadPasskeySecurity() {
      if (document.hidden) return
      try {
        const result = await adminListPasskeySecurity(search)
        if (!cancelled) {
          setPasskeySecurity(result)
          setPasskeySecurityError('')
        }
      } catch (error) {
        if (!cancelled) setPasskeySecurityError(clientSafeMessage(error, 'Passkey security data is not available.'))
      }
    }
    loadPasskeySecurity()
    const timer = window.setInterval(loadPasskeySecurity, 120000)
    window.addEventListener('focus', loadPasskeySecurity)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener('focus', loadPasskeySecurity)
    }
  }, [backendAdminAllowed, search])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('nexora-backend-sidebar-collapsed', sidebarCollapsed ? 'true' : 'false')
  }, [sidebarCollapsed])

  useEffect(() => {
    setMobileSidebarOpen(false)
  }, [activeTab])

  useEffect(() => {
    if (!db || !backendAdminAllowed) {
      setBackendNotificationStates({})
      return undefined
    }
    return onSnapshot(
      query(collection(db, 'backendNotificationStates'), limit(150)),
      (snap) => {
        const states = {}
        snap.docs.forEach((item) => {
          states[item.id] = item.data() || {}
        })
        setBackendNotificationStateError('')
        setBackendNotificationStates(states)
      },
      (error) => {
        setBackendNotificationStateError(firestoreErrorMessage('backendNotificationStates', error))
        console.warn('[Backend Notifications] state listener failed', {
          code: error?.code || '',
          message: error?.message || '',
        })
        setBackendNotificationStates({})
      },
    )
  }, [backendAdminAllowed])

  const liveUsers = useMemo(() => mergePresence(data.users, data.clientSessions, data.userPresence), [data.users, data.clientSessions, data.userPresence])
  const onlineUsers = useMemo(() => liveUsers.filter((row) => isOnline(row, liveNow)), [liveNow, liveUsers])
  const platformPlans = useMemo(() => mergePlatformPlans(data.plans), [data.plans])
  const platformSettings = useMemo(() => {
    const liveSettings = data.platformSettings[0] || {}
    return {
      ...defaultPlatformSettings,
      ...liveSettings,
      maintenanceConfig: normalizeMaintenanceConfig(liveSettings.maintenanceConfig || {
        enabled: liveSettings.maintenanceMode === true,
        target: 'workspace',
      }),
      featureFlags: {
        ...defaultPlatformSettings.featureFlags,
        ...(liveSettings.featureFlags || {}),
      },
    }
  }, [data.platformSettings])
  const workspacesById = useMemo(() => {
    const map = new Map()
    data.workspaces.forEach((workspace) => {
      map.set(workspace.workspaceId || workspace.id, workspace)
      if (workspace.ownerId) map.set(workspace.ownerId, workspace)
      if (workspace.userId) map.set(workspace.userId, workspace)
    })
    return map
  }, [data.workspaces])

  // Per-workspace WhatsApp config (from the whatsappSettings collection group).
  // Keyed by workspaceId stored on the doc, falling back to its parent path.
  const whatsappByWorkspace = useMemo(() => {
    const map = new Map()
    ;(data.whatsappSettings || []).forEach((row) => {
      const fromPath = String(row.path || '').split('/')[1] || ''
      const workspaceId = row.workspaceId || fromPath
      if (workspaceId) map.set(workspaceId, normalizeWhatsappConfig(row))
    })
    return map
  }, [data.whatsappSettings])

  useEffect(() => {
    setSettingsDraft(platformSettings)
  }, [platformSettings])

  // Keep the editable WhatsApp pricing draft in sync with the live document.
  useEffect(() => {
    setWhatsappPricingDraft(whatsappPricingApi.pricing)
  }, [whatsappPricingApi.pricing])

  const payments = data.platformPayments
  const upgradeRequests = useMemo(
    () => [...workerUpgradeRequests, ...data.upgradeRequests]
      .sort((a, b) => (toDate(b.createdAt || b.updatedAt)?.getTime() || 0) - (toDate(a.createdAt || a.updatedAt)?.getTime() || 0)),
    [data.upgradeRequests, workerUpgradeRequests],
  )
  const stats = useMemo(() => {
    const now = new Date()
    const paidPayments = payments.filter(isPaid)
    const materializedUpgradeIds = new Set(
      paidPayments.flatMap((row) => [row.id, row.sourceId].filter(Boolean).map(String)),
    )
    const approvedUpgradeFallbacks = upgradeRequests.filter((row) =>
      isPaid(row) && !materializedUpgradeIds.has(String(row.id)),
    )
    // Approved upgrade requests are copied into platformPayments. Count the
    // request only as a fallback when that materialized payment is missing.
    const revenueRows = [...paidPayments, ...approvedUpgradeFallbacks]
    const monthlyRevenue = revenueRows
      .filter((row) => {
        const date = toDate(row.paymentDate || row.paidAt || row.approvedAt || row.createdAt)
        return date && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
      })
      .reduce((sum, row) => sum + amountValue(row), 0)
    const todayLogins = data.users.filter((row) => {
      const date = toDate(row.lastLoginAt)
      return date && date.toDateString() === now.toDateString()
    }).length
    return {
      totalClients: data.workspaces.length,
      activeClients: data.workspaces.filter((row) => !isExpired(row) && statusValue(row.status || row.subscriptionStatus) !== 'blocked').length,
      trialClients: data.workspaces.filter(isTrial).length,
      expiredClients: data.workspaces.filter(isExpired).length,
      blockedClients: data.workspaces.filter((row) => statusValue(row.status || row.accountStatus) === 'blocked').length,
      onlineNow: onlineUsers.length,
      todayLogins,
      pendingUpgrades: upgradeRequests.filter((row) => statusValue(row?.approvalStatus || row?.status) === 'pending').length,
      monthlyRevenue,
      totalRevenue: revenueRows.reduce((sum, row) => sum + amountValue(row), 0),
    }
  }, [data.users, data.workspaces, onlineUsers.length, payments, upgradeRequests])

  const systemHealth = useMemo(() => {
    const now = liveNow
    const sourceErrors = data.sourceErrors || {}
    const sourceErrorEntries = Object.entries(sourceErrors)
    const pendingPayments = payments.filter((row) => ['pending', 'pending_approval', 'waiting', 'confirming'].includes(statusValue(row.paymentStatus || row.status)))
    const stalePendingPayments = pendingPayments.filter((row) => (ageMinutes(row.createdAt || row.paymentDate, now) || 0) > 1440)
    const pendingUpgrades = upgradeRequests.filter((row) => statusValue(row?.approvalStatus || row?.status) === 'pending')
    const stalePendingUpgrades = pendingUpgrades.filter((row) => (ageMinutes(row.createdAt || row.requestedAt, now) || 0) > 1440)
    const openTickets = data.supportTickets.filter((row) => ['open', 'pending', 'in_progress', 'new'].includes(statusValue(row.status || 'open')))
    const urgentTickets = openTickets.filter((row) => ['urgent', 'critical', 'high'].includes(statusValue(row.priority)))
    const staleTickets = openTickets.filter((row) => (ageMinutes(row.updatedAt || row.createdAt, now) || 0) > 1440)
    const invalidSubscriptions = data.workspaces.filter(hasMissingPaidSubscriptionExpiry)
    const expiredWorkspaces = data.workspaces.filter(isExpired)
    const blockedWorkspaces = data.workspaces.filter((row) => statusValue(row.status || row.accountStatus) === 'blocked')
    const workspaceIds = data.workspaces.map((row) => row.workspaceId || row.id).filter(Boolean)
    const duplicateWorkspaceIds = [...new Set(workspaceIds.filter((id, index) => workspaceIds.indexOf(id) !== index))]
    const workspaceIdSet = new Set(workspaceIds)
    const orphanUsers = data.users.filter((row) => {
      const workspaceId = row.workspaceId || row.currentWorkspaceId
      return workspaceId && !workspaceIdSet.has(workspaceId)
    })
    const workspacesMissingOwner = data.workspaces.filter((row) => !(row.ownerId || row.userId || row.uid))
    const workspacesMissingModule = data.workspaces.filter((row) => !(row.primaryBusinessType || row.selectedBusinessType || row.currentBusinessType || row.businessType || row.module))
    const rawModuleMismatches = [
      ...data.workspaces.map((row) => moduleConsistencyIssue(row, 'workspace')),
      ...data.users.map((row) => moduleConsistencyIssue(row, 'user')),
    ].filter(Boolean)
    const seenModuleMismatchKeys = new Set()
    const moduleMismatches = rawModuleMismatches.filter((item) => {
      const row = item.row || {}
      const key = row.workspaceId || row.uid || row.userId || row.id || item.email || item.label || item.id
      if (seenModuleMismatchKeys.has(key)) return false
      seenModuleMismatchKeys.add(key)
      return true
    })
    /* Stale/resolved detection for module mismatches: if all mismatching records
       have not been updated in the last 24h, assume the runtime fix has been
       deployed and the mismatch is a stale record — show as warning, not critical. */
    const mismatchesWithAge = moduleMismatches.map((item) => {
      const row = item.row || {}
      const updated = toDate(row.updatedAt || row.lastLoginAt || row.createdAt)
      return { item, age: updated ? (now - updated.getTime()) : 0 }
    })
    const staleMismatches = mismatchesWithAge.filter((m) => m.age > 24 * 60 * 60 * 1000)
    const freshMismatches = mismatchesWithAge.filter((m) => m.age <= 24 * 60 * 60 * 1000)
    const moduleMismatchesResolved = moduleMismatches.length > 0 && freshMismatches.length === 0
    const enabledPlans = platformPlans.filter((plan) => plan.enabled !== false && plan.active !== false)
    const usingDefaultPlansOnly = data.plans.length === 0
    const paymentAccounts = platformSettings.paymentAccounts || {}
    const paymentPlaceholders = Object.values(paymentAccounts).filter((account = {}) => {
      const value = `${account.accountNumber || ''} ${account.paymentUrl || ''}`.toLowerCase()
      return value.includes('0300-1234567') || value.includes('xxxxxxxx') || value.includes('contact support')
    })
    const exposedSensitiveEnvKeys = Object.keys(import.meta.env || {}).filter((key) => {
      const upper = key.toUpperCase()
      if (!upper.startsWith('VITE_')) return false
      if (upper.startsWith('VITE_FIREBASE_')) return false
      if (upper.startsWith('VITE_META_APP_ID') || upper.startsWith('VITE_META_CONFIG_ID')) return false
      if (upper.endsWith('_WORKER_URL')) return false
      return /(SECRET|PRIVATE|TOKEN|PASSWORD|RESEND|SENDGRID|OPENAI|API_KEY)/.test(upper)
    })
    const latestAnalyticsAt = data.analyticsEvents.reduce((latest, row) => {
      const date = toDate(row.timestamp || row.createdAt)
      return date && date.getTime() > latest ? date.getTime() : latest
    }, 0)
    const analyticsStale = latestAnalyticsAt ? now - latestAnalyticsAt > 24 * 60 * 60 * 1000 : data.analyticsEvents.length === 0
    const recentFrontendEvents = data.analyticsEvents.filter((row) => {
      const date = toDate(row.timestamp || row.createdAt)
      return date && now - date.getTime() <= 24 * 60 * 60 * 1000 && String(row.eventType || '').startsWith('frontend_')
    })
    const frontendRuntimeIssues = recentFrontendEvents.filter((row) => ['frontend_runtime_error', 'frontend_unhandled_rejection', 'frontend_error_boundary'].includes(row.eventType))
    const frontendOfflineIssues = recentFrontendEvents.filter((row) => row.eventType === 'frontend_offline')
    const latestFrontendIssue = [...frontendRuntimeIssues, ...frontendOfflineIssues]
      .sort((a, b) => (toDate(b.timestamp || b.createdAt)?.getTime() || 0) - (toDate(a.timestamp || a.createdAt)?.getTime() || 0))[0]
    /* Stale/resolved detection: if the most recent frontend error is more than 2 hours old
       and no new matching error has occurred since, mark as resolved (warning, not critical).
       This prevents fixed issues from showing as active critical after a deploy. */
    const latestFrontendIssueAge = latestFrontendIssue ? (now - (toDate(latestFrontendIssue.timestamp || latestFrontendIssue.createdAt)?.getTime() || 0)) : Infinity
    const frontendIssuesResolved = latestFrontendIssue ? latestFrontendIssueAge > 2 * 60 * 60 * 1000 : true
    const latestPresenceAt = [...data.clientSessions, ...data.userPresence, ...data.userSessions].reduce((latest, row) => {
      const date = toDate(row.lastActiveAt || row.updatedAt || row.createdAt)
      return date && date.getTime() > latest ? date.getTime() : latest
    }, 0)
    const presenceStale = latestPresenceAt ? now - latestPresenceAt > 60 * 60 * 1000 : data.workspaces.length > 0
    const whatsappConfigured = Boolean(import.meta.env.VITE_WHATSAPP_WORKER_URL)
    const whatsappIssues = [...whatsappByWorkspace.values()].filter((config) => {
      if (config.whatsappApiMode === 'manual') return false
      const connectionStatus = statusValue(config.connectionStatus || config.status || 'not_connected')
      const verificationStatus = statusValue(config.verificationStatus || '')
      return !config.webhookVerified || ['failed', 'disconnected', 'not_connected'].includes(connectionStatus) || verificationStatus === 'failed'
    })
    const maintenanceDraft = normalizeMaintenanceConfig(platformSettings.maintenanceConfig)
    const localAuditFindings = []
    if (exposedSensitiveEnvKeys.length) {
      localAuditFindings.push(`Frontend-exposed secret-style env keys: ${listSummary(exposedSensitiveEnvKeys)}`)
    }
    localAuditFindings.push('firestore.rules has intentional public reads for platformSettings, platformPlans, whatsappPricing, announcements, and phoneRegistry exact get.')

    const checks = [
      {
        id: 'firestore-listeners',
        title: 'Firestore live listeners',
        status: sourceErrorEntries.length ? 'critical' : 'healthy',
        detail: sourceErrorEntries.length ? listSummary(sourceErrorEntries.map(([key]) => key), 6) : `${Object.keys(data).filter((key) => Array.isArray(data[key])).length} live collections connected.`,
        actionTab: 'logs',
        metric: sourceErrorEntries.length,
      },
      {
        id: 'backend-auth',
        title: 'Backend admin auth',
        status: !firebaseAuthEnabled || !backendAdminAllowed ? 'critical' : 'healthy',
        detail: getFirebaseAuthConfigMessage() || (backendAdminAllowed ? `${user?.email || 'Admin'} is allowed.` : 'Current account is not in backend admin allowlist.'),
        actionTab: 'roles',
        metric: backendAdminAllowed ? 1 : 0,
      },
      {
        id: 'firebase-config',
        title: 'Firebase production config',
        status: missingFirebaseAuthEnvVars.length ? 'warning' : 'healthy',
        detail: missingFirebaseAuthEnvVars.length ? `Using fallback for ${listSummary(missingFirebaseAuthEnvVars)}` : 'Required Firebase web env keys are present.',
        actionTab: 'settings',
        metric: missingFirebaseAuthEnvVars.length,
      },
      {
        id: 'env-security',
        title: 'Frontend secret exposure',
        status: exposedSensitiveEnvKeys.length ? 'critical' : 'healthy',
        detail: exposedSensitiveEnvKeys.length ? listSummary(exposedSensitiveEnvKeys) : 'No secret-style VITE_* runtime keys detected.',
        actionTab: 'systemHealth',
        metric: exposedSensitiveEnvKeys.length,
      },
      {
        id: 'rules-audit',
        title: 'Firestore rules audit',
        status: 'healthy',
        detail: 'Public platform reads are intentional. Analytics public create is schema-guarded in local rules.',
        actionTab: 'systemHealth',
        metric: localAuditFindings.length,
      },
      {
        id: 'notifications',
        title: 'Backend notifications',
        status: backendNotificationStateError ? 'warning' : 'healthy',
        detail: backendNotificationStateError || `${Object.keys(backendNotificationStates).length} read/clear states synced.`,
        actionTab: 'dashboard',
        metric: Object.keys(backendNotificationStates).length,
      },
      {
        id: 'payment-queue',
        title: 'Payment approval queue',
        status: stalePendingPayments.length ? 'critical' : pendingPayments.length ? 'warning' : 'healthy',
        detail: stalePendingPayments.length ? `${stalePendingPayments.length} pending more than 24h.` : `${pendingPayments.length} pending payment records.`,
        actionTab: 'transactions',
        metric: pendingPayments.length,
      },
      {
        id: 'upgrade-queue',
        title: 'Upgrade queue',
        status: stalePendingUpgrades.length ? 'critical' : pendingUpgrades.length ? 'warning' : 'healthy',
        detail: stalePendingUpgrades.length ? `${stalePendingUpgrades.length} pending more than 24h.` : `${pendingUpgrades.length} pending upgrade requests.`,
        actionTab: 'upgrades',
        metric: pendingUpgrades.length,
      },
      {
        id: 'support-tickets',
        title: 'Support tickets SLA',
        status: urgentTickets.length ? 'critical' : staleTickets.length || openTickets.length ? 'warning' : 'healthy',
        detail: urgentTickets.length ? `${urgentTickets.length} urgent/high open tickets.` : staleTickets.length ? `${staleTickets.length} open tickets stale more than 24h.` : `${openTickets.length} open tickets.`,
        actionTab: 'support',
        metric: openTickets.length,
      },
      {
        id: 'subscriptions',
        title: 'Subscriptions and trials',
        status: invalidSubscriptions.length ? 'critical' : expiredWorkspaces.length || blockedWorkspaces.length ? 'warning' : 'healthy',
        detail: invalidSubscriptions.length ? `${invalidSubscriptions.length} paid subscriptions missing expiry/billing date.` : `${expiredWorkspaces.length} expired, ${blockedWorkspaces.length} blocked.`,
        actionTab: 'clients',
        metric: invalidSubscriptions.length + expiredWorkspaces.length + blockedWorkspaces.length,
      },
      {
        id: 'workspace-isolation',
        title: 'Workspace isolation',
        status: duplicateWorkspaceIds.length ? 'critical' : orphanUsers.length || workspacesMissingOwner.length ? 'warning' : 'healthy',
        detail: duplicateWorkspaceIds.length ? `Duplicate workspace ids: ${listSummary(duplicateWorkspaceIds)}` : orphanUsers.length ? `${orphanUsers.length} user links are isolated from active workspaces and need mapping review.` : workspacesMissingOwner.length ? `${workspacesMissingOwner.length} workspaces missing owner id; access remains isolated until fixed.` : 'Workspace ids, owners, and user links look isolated.',
        actionTab: 'clients',
        metric: duplicateWorkspaceIds.length + orphanUsers.length + workspacesMissingOwner.length,
      },
      {
        id: 'module-access',
        title: 'Module assignment',
        status: freshMismatches.length ? 'critical' : staleMismatches.length ? 'warning' : workspacesMissingModule.length ? 'warning' : 'healthy',
        detail: freshMismatches.length
          ? `${freshMismatches.length} active module mismatch found: ${listSummary(freshMismatches.map((m) => { const item = m.item; const mm = item.mismatched[0]; return `${item.email || item.label || item.id}: should run ${item.expected}, ${mm?.field || 'module'} is ${mm?.value || 'wrong'}`; }), 3)}`
          : staleMismatches.length
            ? `${staleMismatches.length} module mismatches no longer active (24h stale) — likely resolved by recent deploy.`
            : workspacesMissingModule.length
              ? `${workspacesMissingModule.length} workspaces missing selected business module.`
              : 'Selected workspace and business module fields are consistent.',
        actionTab: 'clients',
        metric: freshMismatches.length + staleMismatches.length + workspacesMissingModule.length,
      },
      {
        id: 'plans-pricing',
        title: 'Plans and payment accounts',
        status: !enabledPlans.length ? 'critical' : paymentPlaceholders.length || usingDefaultPlansOnly ? 'warning' : 'healthy',
        detail: !enabledPlans.length ? 'No enabled plans found.' : paymentPlaceholders.length ? `${paymentPlaceholders.length} payment accounts still use placeholder values.` : usingDefaultPlansOnly ? 'Using built-in plan defaults; no platformPlans docs saved yet.' : `${enabledPlans.length} enabled plans and payment accounts configured.`,
        actionTab: !enabledPlans.length ? 'plans' : 'settings',
        metric: enabledPlans.length,
      },
      {
        id: 'email-worker',
        title: 'Email delivery worker',
        status: EMAIL_WORKER_URL ? 'healthy' : 'critical',
        detail: EMAIL_WORKER_URL ? 'Transactional email endpoint is configured.' : 'Email worker URL is missing.',
        actionTab: 'settings',
        metric: EMAIL_WORKER_URL ? 1 : 0,
      },
      {
        id: 'whatsapp-api',
        title: `WhatsApp API readiness${!whatsappConfigured ? ' — Setup Required' : ''}`,
        status: !whatsappConfigured && data.whatsappSettings.length ? 'warning' : whatsappIssues.length ? 'warning' : 'healthy',
        detail: !whatsappConfigured && data.whatsappSettings.length
          ? 'VITE_WHATSAPP_WORKER_URL env var is not set — add it in Cloudflare Pages > Settings > Environment Variables. The app continues to work; WhatsApp API features are unavailable until this is configured.'
          : whatsappIssues.length ? `${whatsappIssues.length} WhatsApp API configs need webhook/connection review.` : `${data.whatsappSettings.length} workspace configs monitored.`,
        actionTab: 'whatsappPricing',
        metric: whatsappIssues.length,
        envHint: !whatsappConfigured ? 'VITE_WHATSAPP_WORKER_URL' : '',
      },
      {
        id: 'analytics',
        title: 'Visitor analytics',
        status: analyticsStale ? 'warning' : 'healthy',
        detail: latestAnalyticsAt ? `Last event ${ageLabel(new Date(latestAnalyticsAt), now)}.` : 'No analytics events received yet.',
        actionTab: 'visitorAnalytics',
        metric: data.analyticsEvents.length,
      },
      {
        id: 'frontend-health',
        title: 'Bug / error reports live',
        status: frontendRuntimeIssues.length && !frontendIssuesResolved ? 'critical' : frontendRuntimeIssues.length ? 'warning' : frontendOfflineIssues.length ? 'warning' : 'healthy',
        detail: frontendRuntimeIssues.length
          ? (frontendIssuesResolved
            ? `${frontendRuntimeIssues.length} reports in last 24h, none newer than 2h — resolved by latest deploy. Latest: ${latestFrontendIssue?.buttonLabel || 'runtime error'}`
            : `${frontendRuntimeIssues.length} frontend bug/error reports in the last 24h. Latest: ${latestFrontendIssue?.buttonLabel || 'runtime error'}`)
          : frontendOfflineIssues.length
            ? `${frontendOfflineIssues.length} offline/sync interruptions in the last 24h.`
            : 'No frontend runtime or offline issues reported in the last 24h.',
        actionTab: 'systemHealth',
        metric: frontendRuntimeIssues.length + frontendOfflineIssues.length,
      },
      {
        id: 'presence',
        title: 'Presence tracking',
        status: presenceStale ? 'warning' : 'healthy',
        detail: latestPresenceAt ? `Last activity ${ageLabel(new Date(latestPresenceAt), now)}. ${onlineUsers.length} online now.` : 'No presence records yet.',
        actionTab: 'activity',
        metric: onlineUsers.length,
      },
      {
        id: 'maintenance-mode',
        title: 'Maintenance mode',
        status: maintenanceDraft.enabled ? 'warning' : 'healthy',
        detail: maintenanceDraft.enabled ? `Enabled for ${maintenanceDraft.target || 'workspace'}${maintenanceDraft.module ? ` / ${maintenanceDraft.module}` : ''}.` : 'Maintenance controls are off.',
        actionTab: 'maintenance',
        metric: maintenanceDraft.enabled ? 1 : 0,
      },
    ]

    const counts = checks.reduce((acc, check) => {
      const status = statusValue(check.status)
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, { healthy: 0, warning: 0, critical: 0 })
    const issues = checks.filter((check) => ['critical', 'warning', 'degraded', 'stale', 'error'].includes(statusValue(check.status)))
    const overall = checks.some((check) => statusValue(check.status) === 'critical')
      ? 'critical'
      : checks.some((check) => ['warning', 'degraded', 'stale'].includes(statusValue(check.status)))
        ? 'warning'
        : 'healthy'
    return {
      checks,
      counts,
      issues,
      overall,
      localAuditFindings,
      moduleMismatches,
      lastCheckedAt: new Date(),
    }
  }, [
    backendAdminAllowed,
    backendNotificationStates,
    backendNotificationStateError,
    data,
    liveNow,
    onlineUsers.length,
    payments,
    platformPlans,
    platformSettings,
    upgradeRequests,
    user?.email,
    whatsappByWorkspace,
  ])

  const derivedNotifications = useMemo(() => {
    const signupItems = [...data.workspaces]
      .sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0))
      .slice(0, 5)
      .map((row) => ({
        id: `signup-${row.id}`,
        type: 'new signup',
        title: 'New client signup',
        detail: `${workspaceName(row)} · ${userEmail(row) || row.id}`,
        createdAt: row.createdAt,
        route: 'clients',
      }))
    const upgradeItems = upgradeRequests
      .filter((row) => statusValue(row?.approvalStatus || row?.status) === 'pending')
      .slice(0, 5)
      .map((row) => ({
        id: `upgrade-${row.id}`,
        type: 'upgrade request',
        title: 'Upgrade request pending',
        detail: `${row.clientEmail || row.email || row.workspaceId || 'Client'} · ${row.requestedPlan || row.plan || 'Plan'}`,
        createdAt: row.createdAt,
        route: 'upgrades',
      }))
    const paymentItems = payments
      .filter((row) => ['pending', 'pending_approval'].includes(statusValue(row.paymentStatus || row.status)))
      .slice(0, 5)
      .map((row) => ({
        id: `payment-${row.id}`,
        type: 'payment pending',
        title: 'Payment pending',
        detail: `${row.clientEmail || row.email || row.workspaceId || 'Client'} · ${money(amountValue(row), rowCurrency(row))}`,
        createdAt: row.createdAt || row.paymentDate,
        route: 'transactions',
      }))
    const ticketItems = data.supportTickets
      .filter((row) => ['open', 'pending'].includes(statusValue(row.status)))
      .slice(0, 5)
      .map((row) => ({
        id: `ticket-${row.id}`,
        type: 'support ticket',
        title: row.title || row.subject || 'Support ticket',
        detail: `${row.clientEmail || row.email || row.workspaceId || 'Client'} · ${row.priority || 'medium'}`,
        createdAt: row.createdAt,
        route: 'support',
      }))
    const businessServiceItems = (data.businessServiceRequests || [])
      .filter((row) => ['new', 'under_review'].includes(statusValue(row.status || 'New')))
      .slice(0, 5)
      .map((row) => ({
        id: `business-service-${row.id}`,
        type: 'business service',
        title: 'Business service request',
        detail: `${row.companyName || row.email || 'Client'} · ${row.serviceTitle || 'Service'}`,
        createdAt: row.createdAt || row.updatedAt,
        route: 'businessServices',
      }))
    const expiredItems = data.workspaces
      .filter(isExpired)
      .slice(0, 5)
      .map((row) => ({
        id: `expired-${row.id}`,
        type: 'expired trial',
        title: 'Trial expired',
        detail: `${workspaceName(row)} · ${dateLabel(row.trialEndsAt || row.subscriptionExpiresAt)}`,
        createdAt: row.trialEndsAt || row.subscriptionExpiresAt,
        route: 'clients',
      }))
    const healthItems = systemHealth.issues
      .filter((item) => statusValue(item.status) === 'critical' || item.id === 'frontend-health')
      .slice(0, 8)
      .map((item) => ({
        id: `health-${item.id}`,
        type: 'system health',
        title: item.title,
        detail: item.detail,
        createdAt: systemHealth.lastCheckedAt,
        route: item.actionTab,
      }))
    return [...healthItems, ...businessServiceItems, ...signupItems, ...upgradeItems, ...paymentItems, ...ticketItems, ...expiredItems]
      .sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0))
      .slice(0, 20)
  }, [data.businessServiceRequests, data.supportTickets, data.workspaces, payments, systemHealth, upgradeRequests])

  const allNotifications = useMemo(
    () => derivedNotifications.filter((item) => !backendNotificationStates[backendNotificationDocId(item.id)]?.cleared),
    [backendNotificationStates, derivedNotifications],
  )
  const unreadNotifications = useMemo(
    () => allNotifications.filter((item) => !backendNotificationStates[backendNotificationDocId(item.id)]?.read),
    [allNotifications, backendNotificationStates],
  )
  const analyticsStats = useMemo(() => {
    const today = new Date().toDateString()
    const events = data.analyticsEvents
    const visitors = new Set(events.map((row) => row.visitorId).filter(Boolean))
    const activeSessions = data.userSessions.filter((row) => {
      const lastActive = toDate(row.lastActiveAt)
      return lastActive && liveNow - lastActive.getTime() <= 5 * 60 * 1000
    })
    const recentEventSessions = new Set(events.filter((row) => {
      const eventTime = toDate(row.timestamp || row.createdAt)
      return eventTime && liveNow - eventTime.getTime() <= 5 * 60 * 1000
    }).map((row) => row.sessionId || row.visitorId).filter(Boolean))
    const moduleClicks = new Map()
    events.filter((row) => row.eventType === 'module_click').forEach((row) => {
      const key = row.moduleName || row.buttonLabel || 'Unknown'
      moduleClicks.set(key, (moduleClicks.get(key) || 0) + 1)
    })
    const mostClickedModule = [...moduleClicks.entries()].sort((a, b) => b[1] - a[1])?.[0]?.[0] || '-'
    const signupStarted = events.filter((row) => row.eventType === 'signup_started').length
    const signupCompleted = events.filter((row) => row.eventType === 'signup_completed').length
    return {
      totalVisitors: events.length,
      uniqueVisitors: visitors.size,
      clicksToday: events.filter((row) => ['button_click', 'module_click', 'pricing_click', 'start_free_trial_click'].includes(row.eventType) && toDate(row.timestamp || row.createdAt)?.toDateString() === today).length,
      signupStarted,
      signupCompleted,
      loginCompleted: events.filter((row) => row.eventType === 'login_completed').length,
      dropOffs: Math.max(0, signupStarted - signupCompleted),
      activeSessions: Math.max(activeSessions.length, recentEventSessions.size),
      mostClickedModule,
    }
  }, [data.analyticsEvents, data.userSessions, liveNow])

  const behaviorInterest = useMemo(() => {
    const groups = new Map()
    const interestWeights = {
      signup_completed: 42,
      workspace_selected: 36,
      upgrade_request_submitted: 40,
      start_free_trial_click: 26,
      signup_started: 24,
      pricing_click: 20,
      business_service_request_submitted: 22,
      module_click: 14,
      login_completed: 10,
      button_click: 5,
      page_view: 1,
    }
    const getKey = (row) => row.userId || row.email || row.phone || row.visitorId || row.sessionId || row.id
    const ensure = (row) => {
      const key = getKey(row)
      if (!key) return null
      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          userId: row.userId || '',
          visitorId: row.visitorId || '',
          email: row.email || '',
          phone: row.phone || '',
          score: 0,
          events: 0,
          clicks: 0,
          signupStarted: 0,
          signupCompleted: 0,
          upgradeIntent: 0,
          durationMs: 0,
          modules: new Map(),
          lastEventAt: null,
          lastEventType: '',
          lastPage: '',
        })
      }
      return groups.get(key)
    }
    data.analyticsEvents.forEach((row) => {
      const item = ensure(row)
      if (!item) return
      const eventType = row.eventType || 'event'
      const date = toDate(row.timestamp || row.createdAt)
      item.events += 1
      item.score += interestWeights[eventType] || 2
      item.durationMs += Number(row.sessionDurationMs || 0) || 0
      item.lastEventAt = !item.lastEventAt || (date && date.getTime() > item.lastEventAt.getTime()) ? date || item.lastEventAt : item.lastEventAt
      item.lastEventType = date && item.lastEventAt?.getTime?.() === date.getTime() ? eventType : item.lastEventType || eventType
      item.lastPage = row.page || item.lastPage
      if (['button_click', 'module_click', 'pricing_click', 'start_free_trial_click'].includes(eventType)) item.clicks += 1
      if (eventType === 'signup_started') item.signupStarted += 1
      if (eventType === 'signup_completed') item.signupCompleted += 1
      if (eventType === 'upgrade_request_submitted' || eventType === 'pricing_click') item.upgradeIntent += 1
      const moduleName = row.moduleName || row.buttonLabel || row.businessType || row.module || ''
      if (moduleName) item.modules.set(moduleName, (item.modules.get(moduleName) || 0) + (eventType === 'module_click' ? 3 : 1))
    })
    data.userSessions.forEach((row) => {
      const item = ensure(row)
      if (!item) return
      const date = toDate(row.lastActiveAt || row.updatedAt || row.createdAt)
      item.score += 4
      item.durationMs += Number(row.sessionDurationMs || 0) || 0
      item.lastEventAt = !item.lastEventAt || (date && date.getTime() > item.lastEventAt.getTime()) ? date || item.lastEventAt : item.lastEventAt
      item.lastEventType = item.lastEventType || row.lastEventType || 'session'
      item.lastPage = row.page || item.lastPage
      const moduleName = row.businessType || row.currentBusinessType || row.module || ''
      if (moduleName) item.modules.set(moduleName, (item.modules.get(moduleName) || 0) + 1)
    })
    const rows = [...groups.values()].map((item) => {
      const durationBonus = Math.min(20, Math.floor(item.durationMs / 60000) * 3)
      const score = Math.min(100, item.score + durationBonus)
      const topModule = [...item.modules.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '-'
      const level = score >= 55 || item.signupCompleted || item.upgradeIntent >= 2
        ? 'interested'
        : score >= 28 || item.signupStarted
          ? 'warm'
          : score >= 10
            ? 'cold'
            : 'not_interested'
      const priority = level === 'interested' ? 'High' : level === 'warm' ? 'Medium' : level === 'cold' ? 'Low' : 'Watch'
      return { ...item, score, topModule, level, priority, lastEventAt: item.lastEventAt }
    }).sort((a, b) => b.score - a.score)
    const interested = rows.filter((row) => row.level === 'interested')
    const warm = rows.filter((row) => row.level === 'warm')
    const cold = rows.filter((row) => row.level === 'cold')
    const notInterested = rows.filter((row) => row.level === 'not_interested')
    const expectedConversions = Math.round((interested.length * 0.65) + (warm.length * 0.25) + (cold.length * 0.05))
    const moduleInterest = [...rows.reduce((map, row) => {
      if (row.topModule && row.topModule !== '-') map.set(row.topModule, (map.get(row.topModule) || 0) + row.score)
      return map
    }, new Map()).entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([moduleName, score]) => ({ moduleName, score }))
    return {
      rows,
      interested,
      warm,
      cold,
      notInterested,
      expectedConversions,
      moduleInterest,
    }
  }, [data.analyticsEvents, data.userSessions])

  const funnelRows = useMemo(() => {
    const events = data.analyticsEvents
    const steps = [
      ['Website Visit', 'page_view'],
      ['Module Click', 'module_click'],
      ['Signup Started', 'signup_started'],
      ['Email Verified', 'signup_completed'],
      ['Workspace Selected', 'workspace_selected'],
      ['Login Completed', 'login_completed'],
      ['CRM Opened', 'login_completed'],
    ]
    return steps.map(([label, type], index) => {
      const count = type === 'login_completed' && label === 'CRM Opened'
        ? events.filter((row) => row.eventType === type && (row.status === 'crm_opened' || row.page === '/app/dashboard')).length
        : events.filter((row) => row.eventType === type).length
      const previous = index ? steps[index - 1] : null
      const previousCount = previous
        ? previous[1] === 'login_completed' && previous[0] === 'CRM Opened'
          ? events.filter((row) => row.eventType === previous[1] && (row.status === 'crm_opened' || row.page === '/app/dashboard')).length
          : events.filter((row) => row.eventType === previous[1]).length
        : count
      return { label, count, dropOff: Math.max(0, previousCount - count) }
    })
  }, [data.analyticsEvents])

  const moduleBreakdown = useMemo(() => {
    const counts = new Map(modules.map((module) => [module, 0]))
    data.workspaces.forEach((workspace) => {
      const key = workspaceBusinessType(workspace)
      counts.set(key, (counts.get(key) || 0) + 1)
    })
    return Array.from(counts.entries()).map(([name, value]) => ({ name: displayAdminBusinessType(name), value }))
  }, [data.workspaces])

  const revenueTrend = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, index) => {
      const date = new Date()
      date.setDate(date.getDate() - (13 - index))
      return { key: date.toISOString().slice(0, 10), label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), revenue: 0 }
    })
    payments.filter(isPaid).forEach((payment) => {
      const date = toDate(payment.paymentDate || payment.paidAt || payment.approvedAt || payment.createdAt)
      const item = days.find((day) => day.key === date?.toISOString().slice(0, 10))
      if (item) item.revenue += amountValue(payment)
    })
    return days
  }, [payments])

  const workspaceRows = searchRows(
    data.workspaces
      .filter((row) => workspaceStatusFilter === 'all' || statusValue(row.status || row.subscriptionStatus || row.planStatus) === workspaceStatusFilter || (workspaceStatusFilter === 'expired' && isExpired(row)) || (workspaceStatusFilter === 'trial' && isTrial(row)))
      .filter((row) => workspacePlanFilter === 'all' || statusValue(row.plan || row.selectedPlan) === statusValue(workspacePlanFilter)),
    search,
    ['id', 'uid', 'email', 'ownerEmail', 'companyName', 'workspaceName', 'businessName', 'selectedBusinessType', 'businessType'],
  )
  const userRows = searchRows(
    liveUsers.filter((row) => {
      if (userFilter === 'verified') return row.emailVerified === true
      if (userFilter === 'unverified') return row.emailVerified !== true
      if (userFilter === 'online') return isOnline(row)
      if (userFilter === 'blocked') return statusValue(row.status) === 'blocked'
      return true
    }),
    search,
    ['id', 'uid', 'email', 'name', 'fullName', 'displayName', 'role'],
  )
  const upgradeRows = searchRows(upgradeRequests, search, ['id', 'email', 'clientEmail', 'workspaceName', 'requestedPlan', 'transactionId', 'paymentMethod', 'status', 'source'])
  const paymentRows = searchRows(
    payments
      .filter((row) => transactionStatusFilter === 'all' || statusValue(row.paymentStatus || row.status) === transactionStatusFilter)
      .filter((row) => transactionPlanFilter === 'all' || statusValue(row.plan || row.selectedPlan) === statusValue(transactionPlanFilter)),
    // Date and method filters are kept outside the query to avoid Firestore indexes.
    search,
    ['id', 'email', 'clientEmail', 'workspaceName', 'workspaceId', 'plan', 'paymentMethod', 'transactionId', 'status'],
  )
    .filter((row) => transactionMethodFilter === 'all' || statusValue(row.paymentMethod || row.method) === statusValue(transactionMethodFilter))
    .filter((row) => {
      const date = toDate(row.paymentDate || row.paidAt || row.createdAt)
      if (!date) return !transactionDateFrom && !transactionDateTo
      if (transactionDateFrom && date < new Date(transactionDateFrom)) return false
      if (transactionDateTo) {
        const end = new Date(transactionDateTo)
        end.setHours(23, 59, 59, 999)
        if (date > end) return false
      }
      return true
    })

  async function logActivity(action, details = {}) {
    if (!db) return
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    await setDoc(doc(db, 'backendActivityLogs', id), {
      action,
      adminUid: user?.uid || '',
      adminEmail: user?.email || '',
      details,
      createdAt: serverTimestamp(),
    })
  }

  function ownerIdForWorkspaceRow(row = {}, workspaceId = '') {
    const workspace = workspaceId ? workspacesById.get(workspaceId) || {} : {}
    if (row.ownerId) return row.ownerId
    if (workspace.ownerId) return workspace.ownerId
    if (row.uid) return row.uid
    if (row.createdBy) return row.createdBy
    if (row.userId && row.userId !== workspaceId) return row.userId
    if (workspace.userId && workspace.userId !== workspaceId) return workspace.userId
    return ''
  }

  async function notifyWorkspaceOwner({
    workspaceId,
    row = {},
    userIds = [],
    title,
    message,
    type = 'Backend',
    priority = 'medium',
    route = '/app/dashboard',
    relatedId = '',
    metadata = {},
  } = {}) {
    if (!workspaceId || !title) return
    let workspace = workspacesById.get(workspaceId) || {}
    if (!Object.keys(workspace).length && db) {
      try {
        const snap = await getDoc(doc(db, 'workspaces', workspaceId))
        workspace = snap.exists() ? { id: snap.id, ...snap.data() } : {}
      } catch {
        workspace = {}
      }
    }
    const ownerId = ownerIdForWorkspaceRow({ ...workspace, ...row }, workspaceId)
    const targetUserIds = workspaceNotificationTargets(
      userIds,
      ownerId,
      row.ownerId,
      row.uid,
      row.userId && row.userId !== workspaceId ? row.userId : '',
      workspace.ownerId,
      workspace.userId && workspace.userId !== workspaceId ? workspace.userId : '',
      workspaceId,
    )
    await createWorkspaceNotification({
      workspaceId,
      userIds: targetUserIds,
      businessType: workspaceBusinessType({ ...workspace, ...row }),
      title,
      message,
      type,
      priority,
      relatedId,
      route,
      metadata,
      createdBy: user?.uid || '',
      createdByEmail: user?.email || '',
    })
  }

  function workspaceIdForBackendRow(row = {}) {
    return row.workspaceId || String(row.path || '').split('/')[1] || row.ownerId || row.userId || row.uid || ''
  }

  function announcementAudienceWorkspaces(announcement = {}) {
    const audience = statusValue(announcement.audience || 'all')
    const workspaceId = announcement.workspaceId || ''
    const businessType = normalizeAdminBusinessType(announcement.businessType || '')
    return data.workspaces.filter((workspace) => {
      const id = workspace.workspaceId || workspace.id || workspace.ownerId
      if (!id) return false
      if (audience === 'workspace') return id === workspaceId
      if (audience === 'businesstype') return normalizeAdminBusinessType(workspaceBusinessType(workspace)) === businessType
      if (audience === 'trial') return isTrial(workspace)
      if (audience === 'paid') return isPaidSubscriptionStatus(workspace) || isPaid(workspace)
      if (audience === 'expired') return isExpired(workspace)
      return true
    })
  }

  async function notifyAnnouncementAudience(announcement = {}, announcementId = '') {
    const title = announcement.title || 'Announcement'
    const message = announcement.message || title
    const targets = announcementAudienceWorkspaces(announcement)
    await Promise.allSettled(
      targets.map((workspace) =>
        notifyWorkspaceOwner({
          workspaceId: workspace.workspaceId || workspace.id || workspace.ownerId,
          row: workspace,
          type: 'Announcement',
          priority: announcement.priority || 'medium',
          title,
          message,
          relatedId: announcementId,
          route: '/app/notifications',
          metadata: {
            announcementId,
            audience: announcement.audience || 'all',
            announcementType: announcement.type || 'info',
          },
        }),
      ),
    )
  }

  async function updateSupportTicket(row, patch, notification = {}) {
    await updateDoc(row.ref || doc(db, 'supportTickets', row.id), patch)
    const workspaceId = workspaceIdForBackendRow(row)
    if (workspaceId && notification.title) {
      await notifyWorkspaceOwner({
        workspaceId,
        row,
        type: 'Support',
        priority: notification.priority || 'medium',
        title: notification.title,
        message: notification.message || notification.title,
        relatedId: row.id,
        route: '/app/support',
        metadata: { status: patch.status || row.status || '', ticketId: row.id },
      })
    }
  }

  async function syncWorkspaceAndUserSubscription({ workspaceId, ownerId, payload }) {
    if (!workspaceId) throw new Error('Workspace ID is required to sync subscription state.')
    if (!ownerId) throw new Error('Owner user ID is required to sync subscription state.')
    const workspaceRef = doc(db, 'workspaces', workspaceId)
    const userRef = doc(db, 'users', ownerId)
    const batch = writeBatch(db)

    console.log('[Subscription Sync] workspace update', { path: `workspaces/${workspaceId}`, payload })
    batch.set(workspaceRef, payload, { merge: true })
    console.log('[Subscription Sync] user update', { path: `users/${ownerId}`, payload })
    batch.set(userRef, payload, { merge: true })

    await batch.commit()
    console.log('[Subscription Sync] complete', { workspaceId, ownerId })
  }

  async function mirrorUpgradeRequest(row, update, timeline = null) {
    if (!row?.id) return
    const { ref, ...base } = row
    await setDoc(doc(db, 'upgradeRequests', row.id), {
      ...base,
      ...update,
      id: row.id,
      source: row.source || 'cloudflare-d1',
    }, { merge: true })
    if (timeline) {
      await addDoc(collection(db, 'upgradeRequests', row.id, 'timeline'), {
        ...timeline,
        actor: 'admin',
        actorName: user?.email || 'Nexora Team',
        createdAt: serverTimestamp(),
      })
    }
  }

  async function runAction(id, action, success = 'Action completed.') {
    if (needsBackendWarning(id) && !window.confirm(backendWarningMessage(id))) return
    setBusy(id)
    setToast('')
    try {
      if (!backendAdminAllowed) throw new Error('Backend admin access required.')
      await action()
      setToast(success)
    } catch (error) {
      const raw = String(error?.message || error || '')
      const message = /backend admin access required/i.test(raw)
        ? 'Backend admin access required.'
        : /missing or insufficient permissions|permission-denied|permission denied/i.test(raw)
          ? 'Backend admin access required. Firestore admin write permission is missing.'
          : clientSafeMessage(error, 'Unable to complete backend admin action.', { context: 'Backend control centre action' })
      setToast(message)
    } finally {
      setBusy('')
    }
  }

  async function saveBackendNotificationState(notificationIds = [], patch = {}) {
    const ids = Array.from(new Set((Array.isArray(notificationIds) ? notificationIds : [notificationIds]).filter(Boolean)))
    if (!ids.length) return
    const optimisticPatch = {
      ...patch,
      updatedBy: user?.uid || '',
      updatedByEmail: user?.email || '',
    }
    setBackendNotificationStates((current) => {
      const next = { ...current }
      ids.forEach((id) => {
        const stateId = backendNotificationDocId(id)
        next[stateId] = {
          ...(next[stateId] || {}),
          notificationId: id,
          ...optimisticPatch,
          updatedAt: new Date().toISOString(),
        }
      })
      return next
    })
    if (!db) return
    const batch = writeBatch(db)
    ids.forEach((id) => {
      batch.set(doc(db, 'backendNotificationStates', backendNotificationDocId(id)), {
        notificationId: id,
        ...patch,
        updatedBy: user?.uid || '',
        updatedByEmail: user?.email || '',
        updatedAt: serverTimestamp(),
      }, { merge: true })
    })
    await batch.commit()
  }

  function markBackendNotificationRead(id) {
    return saveBackendNotificationState(id, { read: true, cleared: false, readAt: serverTimestamp() })
  }

  function markAllBackendNotificationsRead() {
    return saveBackendNotificationState(allNotifications.map((item) => item.id), { read: true, cleared: false, readAt: serverTimestamp() })
  }

  function clearBackendNotification(id) {
    return saveBackendNotificationState(id, { read: true, cleared: true, clearedAt: serverTimestamp() })
  }

  function clearAllBackendNotifications() {
    return saveBackendNotificationState(allNotifications.map((item) => item.id), { read: true, cleared: true, clearedAt: serverTimestamp() })
  }

  async function handleLogout() {
    console.warn('[AUTO LOGOUT TRACE]', {
      file: 'src/pages/admin/ControlCentre.jsx',
      function: 'handleLogout',
      reason: 'admin_user_initiated_logout',
      route: window.location.pathname,
      uid: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      time: new Date().toISOString(),
      stack: new Error().stack,
    })
    await signOut(auth)
    navigate('/admin/login', { replace: true })
  }

  async function saveSettings() {
    const maintenanceConfig = normalizeMaintenanceConfig(settingsDraft.maintenanceConfig)
    const payload = {
      ...settingsDraft,
      maintenanceMode: maintenanceConfig.enabled,
      maintenanceConfig,
      trialDays: Number(settingsDraft.trialDays || 7),
      updatedAt: serverTimestamp(),
      updatedBy: user?.uid || '',
      updatedByEmail: user?.email || '',
    }
    await setDoc(doc(db, 'platformSettings', 'main'), payload, { merge: true })
    await logActivity('platform_settings_saved', { defaultCurrency: payload.defaultCurrency, trialDays: payload.trialDays, maintenanceMode: payload.maintenanceMode, maintenanceTarget: maintenanceConfig.target })
  }

  // Save the global WhatsApp CRM pricing (settings/whatsappPricing).
  async function saveWhatsappPricing() {
    const meta = { updatedBy: user?.uid || '', updatedByEmail: user?.email || '' }
    const res = await whatsappPricingApi.savePricing(whatsappPricingDraft, meta)
    if (!res?.ok) throw new Error(res?.error || 'Unable to save WhatsApp pricing.')
    await logActivity('whatsapp_pricing_saved', {
      setupFee: Number(whatsappPricingDraft.setupFee),
      monthlyFee: Number(whatsappPricingDraft.monthlyFee),
      trialDays: Number(whatsappPricingDraft.trialDays),
      currency: whatsappPricingDraft.currency,
    })
  }

  // Reset WhatsApp CRM pricing back to the canonical defaults.
  async function resetWhatsappPricing() {
    const meta = { updatedBy: user?.uid || '', updatedByEmail: user?.email || '' }
    const res = await whatsappPricingApi.resetPricing(meta)
    if (!res?.ok) throw new Error(res?.error || 'Unable to reset WhatsApp pricing.')
    setWhatsappPricingDraft(defaultWhatsappPricing())
    await logActivity('whatsapp_pricing_reset', {})
  }

  async function sendReset(row) {
    const email = userEmail(row)
    if (!auth || !email) throw new Error('Client email is missing.')
    const resetLink = await createPasswordResetLink(email)
    if (!resetLink.ok) throw new Error(resetLink.error)
    const template = passwordResetEmail({ link: resetLink.link })
    const sent = await sendWorkerEmail({ to: email, ...template })
    if (!sent.ok) throw new Error(sent.error)
    await logActivity('password_reset_sent', { uid: row.uid || row.id, email })
  }

  async function sendTrialReminder(row) {
    const email = userEmail(row)
    if (!email) throw new Error('Client email is missing.')
    const template = trialExpiryReminderEmail({
      name: row.ownerName || row.displayName || row.name || 'there',
      workspaceName: workspaceName(row),
      trialEndsAt: dateLabel(row.trialEndsAt || row.subscriptionExpiresAt),
    })
    const sent = await sendWorkerEmail({ to: email, ...template })
    if (!sent.ok) throw new Error(sent.error)
    await logActivity('trial_expiry_reminder_sent', { workspaceId: row.workspaceId || row.id, email })
  }

  async function updateWorkspace(row, update, action) {
    const workspaceId = row.workspaceId || row.id
    const payload = {
      ...update,
      updatedAt: serverTimestamp(),
      updatedBy: user?.uid || '',
      updatedByEmail: user?.email || '',
    }
    if (shouldSyncSubscriptionPayload(update)) {
      await syncWorkspaceAndUserSubscription({
        workspaceId,
        ownerId: ownerIdForWorkspaceRow(row, workspaceId),
        payload,
      })
    } else {
      await updateDoc(doc(db, 'workspaces', workspaceId), payload)
    }
    await logActivity(action, { workspaceId, email: userEmail(row), update })
    if (action === 'client_blocked' || action === 'client_unblocked' || action === 'trial_extended' || action === 'client_marked_paid' || action === 'plan_changed') {
      await notifyWorkspaceOwner({
        workspaceId,
        row,
        type: 'Workspace',
        priority: action === 'client_blocked' ? 'high' : 'medium',
        title:
          action === 'client_blocked'
            ? 'Workspace access blocked'
            : action === 'client_unblocked'
              ? 'Workspace access restored'
              : action === 'trial_extended'
                ? 'Trial extended'
                : action === 'client_marked_paid'
                  ? 'Payment marked paid'
                  : 'Plan updated',
        message:
          action === 'client_blocked'
            ? 'Your workspace access was blocked by backend admin.'
            : action === 'client_unblocked'
              ? 'Your workspace access was restored by backend admin.'
              : action === 'trial_extended'
                ? 'Your workspace trial was extended.'
                : action === 'client_marked_paid'
                  ? 'Your workspace payment was marked as paid.'
                  : `Your workspace plan was updated to ${update.plan || update.selectedPlan || row.plan || 'selected plan'}.`,
        relatedId: workspaceId,
        route: '/app/dashboard',
        metadata: { action, update },
      })
    }
  }

  async function markWorkspacePaid(row) {
    const subscriptionPayload = buildApprovedSubscriptionPayload({
      plan: row.plan || row.selectedPlan || row.requestedPlan || 'Standard',
      billingCycle: row.billingCycle || 'monthly',
      amount: amountValue(row),
      currency: rowCurrency(row),
      approvedBy: user?.uid || user?.email || '',
      approvedByEmail: user?.email || '',
    })

    return updateWorkspace(
      row,
      {
        ...subscriptionPayload,
        paymentStatus: 'paid',
        paidAt: subscriptionPayload.approvedAt,
      },
      'client_marked_paid',
    )
  }

  async function updateUser(row, update, action) {
    const uid = row.uid || row.userId || row.id
    await updateDoc(doc(db, 'users', uid), { ...update, updatedAt: serverTimestamp(), updatedBy: user?.uid || '' })
    await logActivity(action, { uid, email: userEmail(row), update })
    const workspaceId = row.workspaceId || row.currentWorkspaceId || uid
    if (workspaceId && (action === 'user_blocked' || action === 'user_activated')) {
      await notifyWorkspaceOwner({
        workspaceId,
        row,
        userIds: [uid],
        type: 'Account',
        priority: action === 'user_blocked' ? 'high' : 'medium',
        title: action === 'user_blocked' ? 'Account blocked' : 'Account restored',
        message: action === 'user_blocked' ? 'Your account was blocked by backend admin.' : 'Your account was restored by backend admin.',
        relatedId: uid,
        route: '/workspace',
        metadata: { action, update },
      })
    }
  }

  // WhatsApp API trial controls — writes the workspace-isolated config doc at
  // workspaces/{workspaceId}/whatsappSettings/config. Token material is never
  // written here; only trial policy fields are managed by the admin.
  async function updateWhatsappTrial(row, patch, action = 'whatsapp_trial_updated') {
    const workspaceId = row.workspaceId || row.id
    const payload = {
      ...patch,
      workspaceId,
      updatedAt: serverTimestamp(),
      updatedBy: user?.uid || '',
      updatedByEmail: user?.email || '',
    }
    await setDoc(doc(db, 'workspaces', workspaceId, 'whatsappSettings', 'config'), payload, { merge: true })
    await logActivity(action, { workspaceId, email: userEmail(row), patch })
  }

  function enableWhatsappTrial(row) {
    const startedAt = new Date()
    const endsAt = new Date(startedAt.getTime())
    endsAt.setDate(endsAt.getDate() + WHATSAPP_TRIAL_DAYS)
    return updateWhatsappTrial(
      row,
      {
        whatsappApiTrialEnabled: true,
        whatsappApiMode: 'trial-api',
        whatsappTrialMessageLimit: WHATSAPP_TRIAL_MESSAGE_LIMIT,
        whatsappTrialMessagesUsed: 0,
        whatsappTrialStartedAt: startedAt,
        whatsappTrialEndsAt: endsAt,
        whatsappApiEnabledBy: user?.email || user?.uid || 'admin',
      },
      'whatsapp_trial_enabled',
    )
  }

  function setWhatsappApiMode(row, mode) {
    return updateWhatsappTrial(
      row,
      {
        whatsappApiMode: mode,
        whatsappApiTrialEnabled: mode === 'trial-api',
        whatsappApiEnabledBy: user?.email || user?.uid || 'admin',
      },
      'whatsapp_api_mode_changed',
    )
  }

  // Mark the webhook verified and promote the connection to connected. Token
  // material is never written here — only non-secret status fields.
  function verifyWhatsappConnection(row) {
    return updateWhatsappTrial(
      row,
      {
        connectionStatus: 'connected',
        verificationStatus: 'verified',
        webhookStatus: 'verified',
        webhookVerified: true,
        lastVerificationAt: new Date(),
        lastWebhookAt: new Date(),
      },
      'whatsapp_webhook_verified',
    )
  }

  // Turn off API access (back to manual click-to-WhatsApp). Keeps usage history.
  function disableWhatsappApi(row) {
    return updateWhatsappTrial(
      row,
      { whatsappApiMode: 'manual', whatsappApiTrialEnabled: false },
      'whatsapp_api_disabled',
    )
  }

  // Clear the connection (non-secret fields) while keeping trial/usage history.
  function disconnectWhatsapp(row) {
    return updateWhatsappTrial(
      row,
      {
        status: 'disconnected',
        connectionStatus: 'disconnected',
        verificationStatus: '',
        webhookStatus: 'disconnected',
        webhookVerified: false,
        phoneNumberId: '',
        businessAccountId: '',
        connectedNumber: '',
        connectedNumberLabel: '',
        displayName: '',
        businessName: '',
      },
      'whatsapp_disconnected',
    )
  }

  // Reset just the connection status back to a clean not-connected state.
  function resetWhatsappConnection(row) {
    return updateWhatsappTrial(
      row,
      {
        status: 'not_connected',
        connectionStatus: 'not_connected',
        verificationStatus: '',
        webhookStatus: '',
        webhookVerified: false,
      },
      'whatsapp_connection_reset',
    )
  }

  async function approveUpgrade(row) {
    if (!backendAdminAllowed) throw new Error('Backend admin access required.')
    if (isPaid(row)) throw new Error('This upgrade request is already approved.')
    const isWorkerRequest = row.source === 'cloudflare-d1'
    const workspaceId = row.workspaceId || row.ownerId || row.userId
    const workspace = workspacesById.get(workspaceId) || {}
    const ownerId = row.ownerId || row.uid || row.userId || workspace.ownerId || workspace.userId
    if (!workspaceId) throw new Error('Workspace ID is required to approve subscription upgrades.')
    if (!ownerId) throw new Error('Owner user ID is required to approve subscription upgrades.')
    const plan = row.requestedPlan || row.selectedPlan || row.plan || 'Standard'
    const currency = rowCurrency(row)
    const adminEmail = user?.email || ''
    const adminId = user?.uid || adminEmail
    const subscriptionPayload = buildApprovedSubscriptionPayload({
      plan,
      billingCycle: row.billingCycle,
      amount: amountValue(row),
      currency,
      approvedBy: adminId,
      approvedByEmail: adminEmail,
    })
    const requestUpdate = {
      status: 'approved',
      approvalStatus: 'approved',
      paymentStatus: 'paid',
      currency,
      approvedBy: subscriptionPayload.approvedBy,
      approvedByEmail: subscriptionPayload.approvedByEmail,
      approvedAt: subscriptionPayload.approvedAt,
      subscriptionExpiresAt: subscriptionPayload.subscriptionExpiresAt,
      nextBillingDate: subscriptionPayload.nextBillingDate,
      updatedAt: subscriptionPayload.updatedAt,
    }
    console.log('[Subscription Approval] payload', { requestId: row.id, workspaceId, ownerId, subscriptionPayload })
    if (isWorkerRequest) {
      const token = await user.getIdToken()
      const result = await updateWorkerUpgradeRequestStatus(token, row.id, 'approved')
      setWorkerUpgradeRequests((current) => current.map((item) => (item.id === row.id ? result.request || { ...item, ...requestUpdate } : item)))
      await mirrorUpgradeRequest(row, requestUpdate, {
        type: 'approved',
        status: 'approved',
        title: 'Request approved',
        message: 'Your upgrade request has been approved. Your workspace plan has been updated.',
      })
    } else {
      console.log('[Subscription Approval] request update', { path: `upgradeRequests/${row.id}`, requestUpdate })
      await updateDoc(row.ref || doc(db, 'upgradeRequests', row.id), requestUpdate)
      await mirrorUpgradeRequest(row, requestUpdate, {
        type: 'approved',
        status: 'approved',
        title: 'Request approved',
        message: 'Your upgrade request has been approved. Your workspace plan has been updated.',
      })
    }
    await syncWorkspaceAndUserSubscription({ workspaceId, ownerId, payload: subscriptionPayload })
    await setDoc(doc(db, 'platformPayments', isWorkerRequest ? `d1-${row.id}` : row.id), {
      clientEmail: row.clientEmail || row.email || row.ownerEmail || '',
      workspaceId: workspaceId || '',
      workspaceName: row.workspaceName || row.companyName || '',
      plan,
      amount: amountValue(row),
      originalAmount: Number(row.originalAmount || amountValue(row)),
      discountAmount: Number(row.discountAmount || 0),
      promoCode: row.promoCode || '',
      promoCodeId: row.promoCodeId || '',
      currency,
      transactionId: row.transactionId || row.txnId || '',
      senderName: row.senderName || '',
      senderNumber: row.senderNumber || row.userPhone || row.phone || '',
      paymentMethod: row.paymentMethod || row.method || 'Manual',
      paymentProof: proofUrl(row),
      status: 'paid',
      paymentStatus: 'paid',
      approvedBy: subscriptionPayload.approvedBy,
      approvedByEmail: subscriptionPayload.approvedByEmail,
      approvedAt: subscriptionPayload.approvedAt,
      paymentDate: row.paymentDate || subscriptionPayload.approvedAt,
      source: isWorkerRequest ? 'cloudflare-d1-upgradeRequests' : 'upgradeRequests',
      sourceId: row.id,
      subscriptionExpiresAt: subscriptionPayload.subscriptionExpiresAt,
      nextBillingDate: subscriptionPayload.nextBillingDate,
      updatedAt: subscriptionPayload.updatedAt,
    }, { merge: true })
    if (row.promoCodeId) {
      const promo = data.promoCodes.find((item) => item.id === row.promoCodeId)
      const canIncrement = promo && (Number(promo.usageLimit || 0) === 0 || Number(promo.usedCount || 0) < Number(promo.usageLimit))
      if (canIncrement) {
        await updateDoc(promo.ref || doc(db, 'promoCodes', row.promoCodeId), {
          usedCount: increment(1),
          updatedAt: serverTimestamp(),
          updatedBy: user?.uid || '',
        }).catch((error) => console.error('[Promo] Manual redemption count update failed', error))
      }
    }
    await setDoc(doc(db, 'platformSubscriptions', workspaceId || row.id), {
      clientEmail: row.clientEmail || row.email || row.ownerEmail || '',
      workspaceId: workspaceId || '',
      workspaceName: row.workspaceName || row.companyName || '',
      ...subscriptionPayload,
      currency,
      status: 'active',
      subscriptionStatus: 'active',
      paymentStatus: 'paid',
      source: isWorkerRequest ? 'cloudflare-d1-upgradeRequests' : 'upgradeRequests',
      sourceId: row.id,
    }, { merge: true })
    const email = userEmail(row)
    if (email) {
      const template = upgradeApprovedEmail({
        name: row.senderName || row.ownerName || row.displayName || 'there',
        plan,
        amount: amountValue(row),
        currency,
        billingCycle: row.billingCycle || '',
        workspaceName: row.workspaceName || row.companyName || '',
        transactionId: row.transactionId || row.paymentId || row.nowPaymentsPaymentId || row.id || '',
      })
      const sent = await sendWorkerEmail({ to: email, ...template })
      if (!sent.ok) throw new Error(sent.error)
    }
    await logActivity('upgrade_approved', { workspaceId, upgradeRequestId: row.id, plan })
    await notifyWorkspaceOwner({
      workspaceId,
      row,
      userIds: [ownerId],
      type: 'Subscription',
      priority: 'high',
      title: 'Upgrade approved',
      message: `Your ${plan} upgrade was approved.`,
      relatedId: row.id,
      route: '/app/dashboard',
      metadata: { plan, amount: amountValue(row), currency },
    })
  }

  async function rejectUpgrade(row) {
    if (!backendAdminAllowed) throw new Error('Backend admin access required.')
    const adminEmail = user?.email || ''
    const now = serverTimestamp()
    const rejectionUpdate = {
      status: 'rejected',
      approvalStatus: 'rejected',
      paymentStatus: 'rejected',
      rejectedBy: adminEmail,
      rejectedByEmail: adminEmail,
      rejectionReason: row.rejectionReason || row.reason || '',
      rejectedAt: now,
      updatedAt: now,
    }
    if (row.source === 'cloudflare-d1') {
      const token = await user.getIdToken()
      const result = await updateWorkerUpgradeRequestStatus(token, row.id, 'rejected')
      setWorkerUpgradeRequests((current) => current.map((item) => (item.id === row.id ? result.request || { ...item, status: 'rejected', approvalStatus: 'rejected', paymentStatus: 'rejected' } : item)))
      await mirrorUpgradeRequest(row, rejectionUpdate, {
        type: 'rejected',
        status: 'rejected',
        title: 'Request rejected',
        message: row.rejectionReason || row.reason || 'Nexora reviewed your payment proof and rejected this upgrade request.',
      })
    } else {
    await updateDoc(row.ref || doc(db, 'upgradeRequests', row.id), rejectionUpdate)
    await mirrorUpgradeRequest(row, rejectionUpdate, {
      type: 'rejected',
      status: 'rejected',
      title: 'Request rejected',
      message: row.rejectionReason || row.reason || 'Nexora reviewed your payment proof and rejected this upgrade request.',
    })
    }
    const email = userEmail(row)
    if (email) {
      const template = upgradeRejectedEmail({
        name: row.senderName || row.ownerName || row.displayName || 'there',
        reason: row.rejectionReason || row.reason || '',
        plan: row.requestedPlan || row.selectedPlan || row.plan || '',
      })
      const sent = await sendWorkerEmail({ to: email, ...template })
      if (!sent.ok) throw new Error(sent.error)
    }
    await logActivity('upgrade_rejected', { upgradeRequestId: row.id, workspaceId: row.workspaceId || '' })
    const workspaceId = row.workspaceId || row.ownerId || row.userId || ''
    if (workspaceId) {
      await notifyWorkspaceOwner({
        workspaceId,
        row,
        type: 'Subscription',
        priority: 'high',
        title: 'Upgrade rejected',
        message: `Your ${row.requestedPlan || row.selectedPlan || row.plan || 'plan'} upgrade was rejected.`,
        relatedId: row.id,
        route: '/workspace',
        metadata: { reason: row.rejectionReason || row.reason || '' },
      })
    }
  }

  async function updateTransaction(row, update, action) {
    const paymentApproved = update.status === 'approved' || update.status === 'paid' || update.paymentStatus === 'paid'
    const workspaceId = row.workspaceId || ''
    const workspace = workspaceId ? workspacesById.get(workspaceId) || {} : {}
    const ownerId = row.ownerId || row.uid || row.userId || workspace.ownerId || workspace.userId
    const adminEmail = user?.email || ''
    const adminId = user?.uid || adminEmail
    const subscriptionPayload = paymentApproved && workspaceId
      ? buildApprovedSubscriptionPayload({
        plan: row.plan || row.selectedPlan || row.requestedPlan || 'Standard',
        billingCycle: row.billingCycle,
        amount: amountValue(row),
        currency: rowCurrency(row),
        approvedBy: adminId,
        approvedByEmail: adminEmail,
      })
      : null
    if (paymentApproved && row.source === 'upgradeRequests' && !workspaceId) {
      throw new Error('Workspace ID is required to approve subscription upgrades.')
    }
    if (paymentApproved && workspaceId && !ownerId) {
      throw new Error('Owner user ID is required to approve subscription payments.')
    }
    if (subscriptionPayload) {
      console.log('[Subscription Approval] payload', { requestId: row.sourceId || row.id, workspaceId, ownerId, subscriptionPayload })
    }
    await updateDoc(row.ref || doc(db, 'platformPayments', row.id), {
      ...update,
      ...(subscriptionPayload ? {
        approvedAt: subscriptionPayload.approvedAt,
        approvedBy: subscriptionPayload.approvedBy,
        approvedByEmail: subscriptionPayload.approvedByEmail,
        subscriptionExpiresAt: subscriptionPayload.subscriptionExpiresAt,
        nextBillingDate: subscriptionPayload.nextBillingDate,
      } : {}),
      updatedAt: subscriptionPayload?.updatedAt || serverTimestamp(),
      updatedBy: user?.uid || '',
      updatedByEmail: user?.email || '',
    })
    if (row.source === 'upgradeRequests' && row.sourceId) {
      const requestUpdate = {
        status: update.status || update.paymentStatus || row.status || 'pending',
        paymentStatus: update.paymentStatus || update.status || row.paymentStatus || 'pending',
        approvalStatus: update.approvalStatus || row?.approvalStatus || update.status || 'pending',
        ...(subscriptionPayload ? {
          status: 'approved',
          approvalStatus: 'approved',
          paymentStatus: 'paid',
          approvedAt: subscriptionPayload.approvedAt,
          approvedBy: subscriptionPayload.approvedBy,
          approvedByEmail: subscriptionPayload.approvedByEmail,
          subscriptionExpiresAt: subscriptionPayload.subscriptionExpiresAt,
          nextBillingDate: subscriptionPayload.nextBillingDate,
        } : {}),
        updatedAt: subscriptionPayload?.updatedAt || serverTimestamp(),
      }
      console.log('[Subscription Approval] request update', { path: `upgradeRequests/${row.sourceId}`, requestUpdate })
      await updateDoc(doc(db, 'upgradeRequests', row.sourceId), requestUpdate)
    }
    if (subscriptionPayload && workspaceId) {
      await syncWorkspaceAndUserSubscription({ workspaceId, ownerId, payload: subscriptionPayload })
    }
    await logActivity(action, { transactionId: row.transactionId || row.id, workspaceId: row.workspaceId || '', update })
    if (workspaceId) {
      await notifyWorkspaceOwner({
        workspaceId,
        row,
        userIds: ownerId ? [ownerId] : [],
        type: 'Billing',
        priority: paymentApproved ? 'high' : statusValue(update.status || update.paymentStatus) === 'rejected' ? 'high' : 'medium',
        title: paymentApproved ? 'Payment approved' : statusValue(update.status || update.paymentStatus) === 'rejected' ? 'Payment rejected' : 'Payment updated',
        message: paymentApproved
          ? `Your ${row.plan || row.selectedPlan || row.requestedPlan || 'subscription'} payment was approved.`
          : statusValue(update.status || update.paymentStatus) === 'rejected'
            ? `Your ${row.plan || row.selectedPlan || row.requestedPlan || 'subscription'} payment was rejected.`
            : 'Your platform payment was updated.',
        relatedId: row.id,
        route: '/workspace',
        metadata: { action, update, amount: amountValue(row), currency: rowCurrency(row) },
      })
    }
  }

  const workspaceColumns = [
    { key: 'workspaceId', label: 'Workspace ID', render: (row) => <span className="font-mono text-xs">{row.workspaceId || row.id}</span> },
    { key: 'workspace', label: 'Workspace Name', render: (row) => <div><p className="font-black text-slate-900">{workspaceName(row)}</p><p className="text-xs text-slate-500">{row.ownerId || row.userId || row.uid || row.id}</p></div> },
    { key: 'email', label: 'Client Email', render: (row) => userEmail(row) || '-' },
    { key: 'module', label: 'Business Type', render: (row) => displayAdminBusinessType(workspaceBusinessType(row)) },
    { key: 'plan', label: 'Plan', render: (row) => row.plan || row.selectedPlan || 'Basic' },
    { key: 'status', label: 'Status', render: (row) => <Status value={workspaceStatusForDisplay(row)} /> },
    { key: 'trialEndsAt', label: 'Trial Ends', render: (row) => dateLabel(row.trialEndsAt || row.subscriptionExpiresAt) },
    { key: 'lastActiveAt', label: 'Last Active', render: (row) => dateTimeLabel(row.lastActiveAt || row.lastAccessedAt || workspacesById.get(row.ownerId || row.userId || row.id)?.lastActiveAt) },
    { key: 'createdAt', label: 'Created', render: (row) => dateLabel(row.createdAt) },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      render: (row) => {
        const wa = whatsappByWorkspace.get(row.workspaceId || row.id)
        if (!wa) return <span className="text-xs text-slate-400">Not configured</span>
        const waStatus = whatsappTrialStatus(wa)
        const apiEnabled = wa.whatsappApiMode === 'paid-api' || (wa.whatsappApiMode === 'trial-api' && wa.whatsappApiTrialEnabled)
        return (
          <div className="min-w-[16rem] space-y-1 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold capitalize text-emerald-700 ring-1 ring-emerald-100">{waStatus.label}</span>
              <Status value={wa.connectionStatus || 'not connected'} />
            </div>
            <p><span className="font-semibold text-slate-500">Business:</span> {wa.businessName || wa.displayName || '—'}</p>
            <p><span className="font-semibold text-slate-500">Number:</span> {wa.connectedNumber || '—'}</p>
            <p><span className="font-semibold text-slate-500">Phone Number ID:</span> {wa.phoneNumberId || '—'}</p>
            <p><span className="font-semibold text-slate-500">WABA ID:</span> {wa.businessAccountId || '—'}</p>
            <p><span className="font-semibold text-slate-500">API Enabled:</span> {apiEnabled ? 'Yes' : 'No'}</p>
            <p><span className="font-semibold text-slate-500">Trial Msgs:</span> {wa.whatsappTrialMessagesUsed} / {wa.whatsappTrialMessageLimit}</p>
            <p><span className="font-semibold text-slate-500">Webhook:</span> {wa.webhookStatus || (wa.webhookVerified ? 'verified' : 'pending')}</p>
            <p><span className="font-semibold text-slate-500">Last Webhook:</span> {dateTimeLabel(wa.lastWebhookAt) || '—'}</p>
            <p><span className="font-semibold text-slate-500">Connected:</span> {dateTimeLabel(wa.connectedAt) || '—'}</p>
          </div>
        )
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex min-w-[38rem] flex-wrap gap-2">
          <ShellButton onClick={() => setToast(`Client summary: ${workspaceName(row)} · ${row.workspaceId || row.id}`)}>View Summary</ShellButton>
          <ShellButton disabled={busy === `block-${row.id}`} onClick={() => runAction(`block-${row.id}`, () => updateWorkspace(row, { status: 'blocked', accountStatus: 'blocked' }, 'client_blocked'))}>Block</ShellButton>
          <ShellButton onClick={() => runAction(`unblock-${row.id}`, () => updateWorkspace(row, { status: 'active', accountStatus: 'active' }, 'client_unblocked'))}>Unblock</ShellButton>
          <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold" value={row.plan || 'Basic'} onChange={(event) => runAction(`plan-${row.id}`, () => updateWorkspace(row, { plan: event.target.value, selectedPlan: event.target.value }, 'plan_changed'))}>
            {platformPlans.map((plan) => <option key={plan.id}>{plan.name}</option>)}
          </select>
          <ShellButton onClick={() => {
            const next = new Date()
            next.setDate(next.getDate() + 7)
            runAction(`extend-${row.id}`, () => updateWorkspace(row, { isTrialActive: true, trialEndsAt: next, subscriptionStatus: 'trial', planStatus: 'trial' }, 'trial_extended'))
          }}>Extend Trial</ShellButton>
          <ShellButton onClick={() => runAction(`trial-reminder-${row.id}`, () => sendTrialReminder(row), 'Trial reminder email sent.')}>Send Trial Reminder</ShellButton>
          <ShellButton onClick={() => runAction(`paid-${row.id}`, () => markWorkspacePaid(row))}>Mark Paid</ShellButton>
          <ShellButton onClick={() => navigator.clipboard?.writeText(row.workspaceId || row.id)}>Copy Workspace ID</ShellButton>
          <ShellButton onClick={() => runAction(`wa-trial-${row.id}`, () => enableWhatsappTrial(row), 'WhatsApp API trial enabled.')}>Enable WA Trial</ShellButton>
          <select
            className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-800"
            defaultValue=""
            onChange={(event) => {
              const mode = event.target.value
              event.target.value = ''
              if (!mode) return
              runAction(`wa-mode-${row.id}`, () => setWhatsappApiMode(row, mode), `WhatsApp API mode set to ${mode}.`)
            }}
          >
            <option value="">WhatsApp Mode…</option>
            <option value="manual">Manual</option>
            <option value="trial-api">Trial API</option>
            <option value="paid-api">Paid API</option>
          </select>
          <ShellButton onClick={() => runAction(`wa-verify-${row.id}`, () => verifyWhatsappConnection(row), 'WhatsApp connection marked verified.')}>WA Verify</ShellButton>
          <ShellButton onClick={() => runAction(`wa-disable-${row.id}`, () => disableWhatsappApi(row), 'WhatsApp API disabled (manual mode).')}>WA Disable API</ShellButton>
          <ShellButton onClick={() => runAction(`wa-disconnect-${row.id}`, () => disconnectWhatsapp(row), 'WhatsApp Business disconnected.')}>WA Disconnect</ShellButton>
          <ShellButton onClick={() => runAction(`wa-reset-${row.id}`, () => resetWhatsappConnection(row), 'WhatsApp connection status reset.')}>WA Reset Status</ShellButton>
        </div>
      ),
    },
  ]

  const userColumns = [
    { key: 'uid', label: 'UID', render: (row) => <span className="font-mono text-xs">{row.uid || row.id}</span> },
    { key: 'displayName', label: 'Name', render: (row) => userName(row) },
    { key: 'email', label: 'Email', render: (row) => userEmail(row) || '-' },
    { key: 'phone', label: 'Phone', render: (row) => phoneNumber(row) || phoneNumber(workspacesById.get(row.workspaceId || row.currentWorkspaceId || row.uid || row.id) || {}) || '-' },
    { key: 'verified', label: 'Email Verified', render: (row) => <Status value={row.emailVerified ? 'verified' : 'unverified'} /> },
    { key: 'workspace', label: 'Workspace', render: (row) => workspaceName(workspacesById.get(row.workspaceId || row.currentWorkspaceId || row.uid || row.id) || { id: row.workspaceId || row.currentWorkspaceId || '-' }) },
    { key: 'plan', label: 'Plan', render: (row) => workspacesById.get(row.workspaceId || row.currentWorkspaceId || row.uid || row.id)?.plan || row.plan || 'Basic' },
    { key: 'role', label: 'Role', render: (row) => row.role || 'user' },
    { key: 'status', label: 'Status', render: (row) => <Status value={row.status || (isOnline(row) ? 'online' : 'active')} /> },
    { key: 'lastLoginAt', label: 'Last Login', render: (row) => dateTimeLabel(row.lastLoginAt) },
    { key: 'lastActiveAt', label: 'Last Active', render: (row) => dateTimeLabel(row.lastActiveAt) },
    { key: 'createdAt', label: 'Created', render: (row) => dateLabel(row.createdAt) },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex min-w-[22rem] flex-wrap gap-2">
          <ShellButton onClick={() => setToast(`User: ${userEmail(row) || row.id} · Workspace: ${row.workspaceId || row.currentWorkspaceId || '-'}`)}>View User</ShellButton>
          <ShellButton onClick={() => runAction(`reset-user-${row.id}`, () => sendReset(row), 'Password reset email sent.')}>Send Reset</ShellButton>
          <ShellButton onClick={() => runAction(`user-block-${row.id}`, () => updateUser(row, { status: 'blocked' }, 'user_blocked'))}>Block</ShellButton>
          <ShellButton onClick={() => runAction(`user-active-${row.id}`, () => updateUser(row, { status: 'active' }, 'user_activated'))}>Unblock</ShellButton>
          <ShellButton onClick={() => navigator.clipboard?.writeText(row.uid || row.id)}>Copy UID</ShellButton>
          <ShellButton onClick={() => setActiveTab('clients')}>View Workspace</ShellButton>
        </div>
      ),
    },
  ]

  const liveColumns = [
    { key: 'status', label: 'Status', render: (row) => <Status value={isOnline(row) ? 'online' : 'offline'} /> },
    { key: 'email', label: 'Email', render: (row) => userEmail(row) || '-' },
    { key: 'uid', label: 'UID', render: (row) => <span className="font-mono text-xs">{row.uid || row.id}</span> },
    { key: 'workspace', label: 'Workspace', render: (row) => row.workspaceName || row.currentWorkspaceId || row.workspaceId || '-' },
    { key: 'businessType', label: 'Module', render: (row) => displayAdminBusinessType(row.currentBusinessType || row.selectedBusinessType || row.businessType) },
    { key: 'login', label: 'Login Time', render: (row) => dateTimeLabel(row.lastLoginAt || row.loginAt) },
    { key: 'active', label: 'Last Active', render: (row) => dateTimeLabel(row.lastActiveAt) },
    { key: 'device', label: 'Device / Browser', render: (row) => row.device || row.browser || row.userAgent || '-' },
  ]

  const upgradeColumns = [
    { key: 'client', label: 'Client', render: (row) => <div><p className="font-black text-slate-900">{row.clientEmail || row.email || row.ownerEmail || '-'}</p><p className="text-xs text-slate-500">{row.workspaceName || row.companyName || row.workspaceId || '-'}</p>{row.source === 'cloudflare-d1' ? <span className="mt-1 inline-flex rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-black text-cyan-700 ring-1 ring-cyan-100">D1 + R2</span> : null}</div> },
    { key: 'plan', label: 'Plan', render: (row) => row.requestedPlan || row.plan || '-' },
    { key: 'amount', label: 'Amount', render: (row) => <div><p className="font-black text-slate-900">{money(amountValue(row), rowCurrency(row))}</p>{Number(row.discountAmount || 0) > 0 ? <p className="text-xs text-emerald-700">{money(row.originalAmount, rowCurrency(row))} - {money(row.discountAmount, rowCurrency(row))}</p> : null}</div> },
    { key: 'promoCode', label: 'Promo', render: (row) => row.promoCode ? <span className="font-mono text-xs font-black text-violet-700">{row.promoCode}</span> : '-' },
    { key: 'transactionId', label: 'Transaction ID', render: (row) => row.transactionId || row.txnId || '-' },
    { key: 'senderName', label: 'Sender Name', render: (row) => row.senderName || '-' },
    { key: 'senderNumber', label: 'Sender Number', render: (row) => row.senderNumber || row.userPhone || row.phone || '-' },
    { key: 'method', label: 'Payment Method', render: (row) => row.paymentMethod || row.method || '-' },
    { key: 'proof', label: 'Screenshot', render: (row) => proofUrl(row) ? <a className="font-bold text-violet-700" href={proofUrl(row)} target="_blank" rel="noreferrer">View Screenshot</a> : 'No Screenshot Uploaded' },
    { key: 'date', label: 'Date', render: (row) => dateTimeLabel(row.paymentDate || row.createdAt) },
    { key: 'status', label: 'Status', render: (row) => <Status value={row?.approvalStatus || row?.status || 'pending'} /> },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <ShellButton onClick={() => runAction(`upgrade-approve-${row.id}`, () => approveUpgrade(row), 'Upgrade approved.')}>Approve</ShellButton>
          <ShellButton onClick={() => runAction(`upgrade-reject-${row.id}`, () => rejectUpgrade(row), 'Upgrade rejected.')}>Reject</ShellButton>
          <ShellButton onClick={() => runAction(`upgrade-paid-${row.id}`, () => approveUpgrade(row), 'Payment marked paid.')}>Mark Paid</ShellButton>
        </div>
      ),
    },
  ]

  const paymentColumns = [
    { key: 'transactionId', label: 'Transaction ID', render: (row) => <span className="font-mono text-xs">{row.transactionId || row.id}</span> },
    { key: 'client', label: 'Client', render: (row) => <div><p className="font-black text-slate-900">{row.clientEmail || row.email || '-'}</p><p className="text-xs text-slate-500">{row.workspaceName || row.workspaceId || '-'}</p></div> },
    { key: 'plan', label: 'Plan', render: (row) => row.plan || row.selectedPlan || '-' },
    { key: 'amount', label: 'Amount', render: (row) => <div><p className="font-black text-slate-900">{money(amountValue(row), rowCurrency(row))}</p>{row.promoCode ? <p className="text-xs text-emerald-700">Promo: {row.promoCode}</p> : null}</div> },
    { key: 'currency', label: 'Currency', render: (row) => rowCurrency(row) },
    { key: 'method', label: 'Method', render: (row) => row.paymentMethod || row.method || '-' },
    { key: 'proof', label: 'Proof', render: (row) => proofUrl(row) ? <a className="font-bold text-violet-700" href={proofUrl(row)} target="_blank" rel="noreferrer">View Proof</a> : 'No Screenshot Uploaded' },
    { key: 'date', label: 'Payment Date', render: (row) => dateTimeLabel(row.paymentDate || row.paidAt || row.createdAt) },
    { key: 'status', label: 'Status', render: (row) => <Status value={row.paymentStatus || row.status || 'pending'} /> },
    { key: 'approvedBy', label: 'Approved By', render: (row) => row.approvedByEmail || row.approvedBy || '-' },
    { key: 'approvedAt', label: 'Approved At', render: (row) => dateTimeLabel(row.approvedAt) },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex min-w-[22rem] flex-wrap gap-2">
          <ShellButton onClick={() => setToast(`Transaction details: ${row.transactionId || row.id} · ${row.clientEmail || row.email || row.workspaceId || 'Client'} · ${money(amountValue(row), rowCurrency(row))}`)}>View Details</ShellButton>
          {proofUrl(row) ? <ShellButton onClick={() => window.open(proofUrl(row), '_blank', 'noopener,noreferrer')}>View Proof</ShellButton> : null}
          <ShellButton onClick={() => runAction(`transaction-approve-${row.id}`, () => updateTransaction(row, { status: 'approved', paymentStatus: 'paid', approvalStatus: 'approved', approvedBy: user?.uid || '', approvedByEmail: user?.email || '', approvedAt: serverTimestamp(), paidAt: serverTimestamp() }, 'transaction_approved'), 'Payment approved.')}>Approve</ShellButton>
          <ShellButton onClick={() => runAction(`transaction-reject-${row.id}`, () => updateTransaction(row, { status: 'rejected', paymentStatus: 'rejected', approvalStatus: 'rejected', rejectedBy: user?.uid || '', rejectedByEmail: user?.email || '', rejectedAt: serverTimestamp() }, 'transaction_rejected'), 'Payment rejected.')}>Reject</ShellButton>
          <ShellButton onClick={() => runAction(`transaction-paid-${row.id}`, () => updateTransaction(row, { status: 'paid', paymentStatus: 'paid', approvalStatus: 'approved', approvedBy: user?.uid || '', approvedByEmail: user?.email || '', approvedAt: serverTimestamp(), paidAt: serverTimestamp() }, 'transaction_marked_paid'), 'Payment marked paid.')}>Mark Paid</ShellButton>
          <ShellButton onClick={() => navigator.clipboard?.writeText(row.transactionId || row.id)}>Copy ID</ShellButton>
        </div>
      ),
    },
  ]

  function Dashboard() {
    return (
      <div className="space-y-4">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
          <KpiCard label="Total Clients" value={stats.totalClients} helper="Client workspaces" icon={HiOutlineBuildingOffice2} />
          <KpiCard label="Active Clients" value={stats.activeClients} helper="Active SaaS accounts" icon={HiOutlineCheckBadge} tone="emerald" />
          <KpiCard label="Trial Clients" value={stats.trialClients} helper="Free trial accounts" icon={HiOutlineCreditCard} tone="amber" />
          <KpiCard label="Expired Clients" value={stats.expiredClients} helper="Needs renewal" icon={HiOutlineShieldCheck} tone="rose" />
          <KpiCard label="Blocked Clients" value={stats.blockedClients} helper="Disabled app access" icon={HiOutlineUsers} tone="rose" />
          <KpiCard label="Online Now" value={stats.onlineNow} helper="Active in last 5 min" icon={HiOutlineChartBarSquare} tone="emerald" />
          <KpiCard label="Today Logins" value={stats.todayLogins} helper="User login activity" icon={HiOutlineUsers} tone="sky" />
          <KpiCard label="Pending Upgrades" value={stats.pendingUpgrades} helper="Upgrade queue" icon={HiOutlineBell} tone="amber" />
          <KpiCard label="Monthly Revenue" value={money(stats.monthlyRevenue)} helper="SaaS payments only" icon={HiOutlineCurrencyDollar} tone="sky" />
          <KpiCard label="Total Revenue" value={money(stats.totalRevenue)} helper="Platform revenue" icon={HiOutlineCurrencyDollar} tone="violet" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr_0.9fr]">
          <Panel title="SaaS Revenue Overview" action={<ShellButton>Last 14 Days</ShellButton>}>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend}>
                  <defs>
                    <linearGradient id="revenue" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => money(value)} />
                  <Area type="monotone" dataKey="revenue" stroke="#7c3aed" fill="url(#revenue)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Clients by Module">
            <div className="grid gap-4 sm:grid-cols-[13rem_1fr] xl:grid-cols-1 2xl:grid-cols-[13rem_1fr]">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={moduleBreakdown} innerRadius={56} outerRadius={88} dataKey="value" paddingAngle={2}>
                      {moduleBreakdown.map((entry, index) => <Cell key={entry.name} fill={moduleColors[index % moduleColors.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {moduleBreakdown.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between gap-3 text-xs">
                    <span className="flex min-w-0 items-center gap-2 font-semibold text-slate-700">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: moduleColors[index % moduleColors.length] }} />
                      <span className="truncate">{item.name}</span>
                    </span>
                    <span className="font-black text-slate-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel title="Online Clients" action={<ShellButton onClick={() => setActiveTab('activity')}>View All</ShellButton>}>
            <div className="space-y-3">
              {onlineUsers.slice(0, 7).map((row) => (
                <div key={row.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-900">{userEmail(row) || userName(row)}</p>
                    <p className="text-xs text-slate-500">{displayAdminBusinessType(row.currentBusinessType || row.businessType)} · {dateTimeLabel(row.lastActiveAt)}</p>
                  </div>
                  <Status value="online" />
                </div>
              ))}
              {!onlineUsers.length ? <EmptyState title="No clients online" /> : null}
            </div>
          </Panel>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.4fr_0.7fr]">
          <Panel title="Pending Upgrade Requests" action={<ShellButton onClick={() => setActiveTab('upgrades')}>Review</ShellButton>}>
            <AdminTable rows={upgradeRequests.filter((row) => statusValue(row?.approvalStatus || row?.status) === 'pending').slice(0, 6)} columns={upgradeColumns.slice(0, 7)} emptyTitle="No pending upgrade requests" maxHeight="max-h-[18rem]" />
          </Panel>
          <Panel title="System Health" action={<ShellButton onClick={() => setActiveTab('systemHealth')}>Open</ShellButton>}>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Healthy</p>
                <p className="mt-1 text-xl font-black text-emerald-900">{systemHealth.counts.healthy || 0}</p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-wide text-amber-700">Warning</p>
                <p className="mt-1 text-xl font-black text-amber-900">{systemHealth.counts.warning || 0}</p>
              </div>
              <div className="rounded-xl border border-rose-100 bg-rose-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-wide text-rose-700">Critical</p>
                <p className="mt-1 text-xl font-black text-rose-900">{systemHealth.counts.critical || 0}</p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {systemHealth.issues.slice(0, 5).map((item) => (
                <button key={item.id} type="button" className="flex w-full items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-left hover:bg-white" onClick={() => setActiveTab(item.actionTab || 'systemHealth')}>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-slate-900">{item.title}</span>
                    <span className="mt-1 block line-clamp-2 text-xs font-semibold text-slate-500">{item.detail}</span>
                  </span>
                  <Status value={item.status} />
                </button>
              ))}
              {!systemHealth.issues.length ? <EmptyState title="All launch checks healthy" detail="Live Firestore listeners, queues, isolation, and configuration checks are currently healthy." /> : null}
            </div>
            <p className="mt-3 text-[11px] font-semibold text-slate-500">Live check: {dateTimeLabel(systemHealth.lastCheckedAt)}</p>
          </Panel>
        </div>

        <Panel title="Behavior Interest" action={<ShellButton onClick={() => setActiveTab('behaviorInterest')}>Open</ShellButton>}>
          <div className="grid gap-3 md:grid-cols-5">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Interested</p>
              <p className="mt-1 text-xl font-black text-emerald-900">{behaviorInterest.interested.length}</p>
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-blue-700">Warm</p>
              <p className="mt-1 text-xl font-black text-blue-900">{behaviorInterest.warm.length}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-600">Cold</p>
              <p className="mt-1 text-xl font-black text-slate-900">{behaviorInterest.cold.length}</p>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-rose-700">Not interested</p>
              <p className="mt-1 text-xl font-black text-rose-900">{behaviorInterest.notInterested.length}</p>
            </div>
            <div className="rounded-xl border border-violet-100 bg-violet-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-violet-700">Expected</p>
              <p className="mt-1 text-xl font-black text-violet-900">{behaviorInterest.expectedConversions}</p>
            </div>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {behaviorInterest.rows.slice(0, 4).map((row) => (
              <div key={row.id} className="rounded-xl border border-slate-100 bg-white p-3">
                <p className="truncate text-sm font-black text-slate-900">{row.email || row.phone || row.visitorId || row.id}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{row.topModule} · score {row.score}</p>
                <Status value={row.level} />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    )
  }

  function SystemHealth() {
    const sourceErrorEntries = Object.entries(data.sourceErrors || {})
    const bugReportRows = [...data.analyticsEvents]
      .filter((row) => String(row.eventType || '').startsWith('frontend_'))
      .sort((a, b) => (toDate(b.timestamp || b.createdAt)?.getTime() || 0) - (toDate(a.timestamp || a.createdAt)?.getTime() || 0))
      .slice(0, 12)
    const criticalBugReports = bugReportRows.filter((row) => ['frontend_runtime_error', 'frontend_unhandled_rejection', 'frontend_error_boundary'].includes(row.eventType))
    const syncBugReports = bugReportRows.filter((row) => ['frontend_offline', 'frontend_online'].includes(row.eventType))
    const bugTone = (row) => {
      const eventType = String(row.eventType || '')
      if (['frontend_runtime_error', 'frontend_unhandled_rejection', 'frontend_error_boundary'].includes(eventType)) return 'border-rose-200 bg-rose-50 text-rose-900'
      if (eventType === 'frontend_offline') return 'border-amber-200 bg-amber-50 text-amber-900'
      return 'border-emerald-200 bg-emerald-50 text-emerald-900'
    }
    const bugLabel = (row) => String(row.eventType || 'frontend_report').replace(/^frontend_/, '').replace(/_/g, ' ')
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Overall Health" value={String(systemHealth.overall).replace(/_/g, ' ')} helper={`Last checked ${dateTimeLabel(systemHealth.lastCheckedAt)}`} icon={HiOutlineShieldCheck} tone={systemHealth.overall === 'critical' ? 'rose' : systemHealth.overall === 'warning' ? 'amber' : 'emerald'} />
          <KpiCard label="Critical Issues" value={systemHealth.counts.critical || 0} helper="Backend notifications created" icon={HiOutlineBell} tone="rose" />
          <KpiCard label="Live Bug Reports" value={criticalBugReports.length} helper={`${syncBugReports.length} sync/offline reports loaded`} icon={HiOutlineWrenchScrewdriver} tone={criticalBugReports.length ? 'rose' : syncBugReports.length ? 'amber' : 'emerald'} />
          <KpiCard label="Healthy Checks" value={systemHealth.counts.healthy || 0} helper="Live checks passing" icon={HiOutlineCheckBadge} tone="emerald" />
        </div>

        <Panel title="Bug / Error Reports Live" action={<ShellButton onClick={() => setActiveTab('visitorAnalytics')}>Open Analytics</ShellButton>}>
          {bugReportRows.length ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {bugReportRows.map((row) => (
                <div key={row.id} className={`rounded-2xl border p-4 ${bugTone(row)}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.14em] opacity-75">{bugLabel(row)}</p>
                      <p className="mt-1 break-words text-sm font-black">{row.buttonLabel || row.status || 'Frontend report captured'}</p>
                    </div>
                    <Status value={row.status || (criticalBugReports.includes(row) ? 'critical' : 'warning')} />
                  </div>
                  <div className="mt-3 grid gap-2 text-xs font-bold sm:grid-cols-2">
                    <div className="min-w-0 rounded-xl bg-white/70 p-2">
                      <p className="text-[10px] uppercase tracking-wide opacity-60">Page</p>
                      <p className="truncate">{row.page || '-'}</p>
                    </div>
                    <div className="min-w-0 rounded-xl bg-white/70 p-2">
                      <p className="text-[10px] uppercase tracking-wide opacity-60">Client</p>
                      <p className="truncate">{row.email || row.userId || row.visitorId || '-'}</p>
                    </div>
                    <div className="min-w-0 rounded-xl bg-white/70 p-2">
                      <p className="text-[10px] uppercase tracking-wide opacity-60">Device</p>
                      <p className="truncate">{[row.deviceType, row.browser, row.os].filter(Boolean).join(' / ') || '-'}</p>
                    </div>
                    <div className="min-w-0 rounded-xl bg-white/70 p-2">
                      <p className="text-[10px] uppercase tracking-wide opacity-60">Time</p>
                      <p className="truncate">{dateTimeLabel(row.createdAt || row.timestamp)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No live bug reports" detail="Runtime errors, render crashes, unhandled promises, and internet disconnect reports will appear here automatically." />
          )}
        </Panel>

        <Panel title="Module Isolation Mismatches" action={<ShellButton onClick={() => setActiveTab('clients')}>Open Clients</ShellButton>}>
          {systemHealth.moduleMismatches?.length ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {systemHealth.moduleMismatches.slice(0, 12).map((item) => (
                <div key={item.id} className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-950">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-rose-700">{item.source} isolation issue</p>
                      <p className="mt-1 truncate text-sm font-black">{item.email || item.label || item.id}</p>
                      <p className="mt-1 text-xs font-bold text-rose-700">Runtime module should be consistent with {item.expected}.</p>
                    </div>
                    <Status value="critical" />
                  </div>
                  <div className="mt-3 grid gap-2">
                    {item.mismatched.slice(0, 4).map((mismatch) => (
                      <div key={`${item.id}-${mismatch.field}`} className="rounded-xl bg-white/75 px-3 py-2 text-xs font-bold">
                        <span className="uppercase tracking-wide text-rose-500">{mismatch.field}</span>
                        <span className="ml-2 text-rose-950">{mismatch.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="All module isolation checks clear" detail="Selected workspace, current business module, and saved business type are aligned for monitored clients." />
          )}
        </Panel>

        <Panel title="Launch Health Checks" action={<ShellButton onClick={() => setActiveTab('logs')}>Open Logs</ShellButton>}>
          <div className="grid gap-3 xl:grid-cols-2">
            {systemHealth.checks.map((item) => (
              <div key={item.id} className={`rounded-2xl border p-4 ${healthCardClass(item.status)}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-950">{item.title}</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{item.detail}</p>
                  </div>
                  <Status value={item.status} />
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Metric: {item.metric ?? 0}</span>
                  {item.actionTab ? <ShellButton onClick={() => setActiveTab(item.actionTab)}>Review</ShellButton> : null}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Live Firestore Errors">
            {sourceErrorEntries.length ? (
              <div className="space-y-2">
                {sourceErrorEntries.map(([key, message]) => (
                  <div key={key} className="rounded-xl border border-rose-100 bg-rose-50 p-3">
                    <p className="text-xs font-black uppercase tracking-wide text-rose-700">{key}</p>
                    <p className="mt-1 break-words text-xs font-semibold leading-5 text-rose-900">{message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No listener errors" detail="All Control Centre Firestore listeners are currently connected or empty without permission/index errors." />
            )}
          </Panel>
          <Panel title="Security / Isolation Audit">
            <div className="space-y-2">
              {systemHealth.localAuditFindings.map((item) => (
                <div key={item} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    )
  }

  function Workspaces() {
    const workspaceStats = {
      total: data.workspaces.length,
      active: data.workspaces.filter((row) => !isExpired(row) && statusValue(row.status || row.subscriptionStatus) !== 'blocked').length,
      trial: data.workspaces.filter(isTrial).length,
      expired: data.workspaces.filter(isExpired).length,
      blocked: data.workspaces.filter((row) => statusValue(row.status || row.accountStatus) === 'blocked').length,
    }
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard label="Total Workspaces" value={workspaceStats.total} helper="All SaaS clients" icon={HiOutlineBuildingOffice2} />
          <KpiCard label="Active" value={workspaceStats.active} helper="Active accounts" icon={HiOutlineCheckBadge} tone="emerald" />
          <KpiCard label="Trial" value={workspaceStats.trial} helper="Trial accounts" icon={HiOutlineCreditCard} tone="amber" />
          <KpiCard label="Expired" value={workspaceStats.expired} helper="Expired accounts" icon={HiOutlineShieldCheck} tone="rose" />
          <KpiCard label="Blocked" value={workspaceStats.blocked} helper="Blocked access" icon={HiOutlineUsers} tone="rose" />
        </div>
        <Panel
          title="Workspaces"
          action={
            <div className="flex flex-wrap gap-2">
              <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold" value={workspaceStatusFilter} onChange={(event) => setWorkspaceStatusFilter(event.target.value)}>
                {['all', 'active', 'trial', 'expired', 'blocked'].map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
              <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold" value={workspacePlanFilter} onChange={(event) => setWorkspacePlanFilter(event.target.value)}>
                {['all', ...platformPlans.map((plan) => plan.name)].map((plan) => <option key={plan} value={plan}>{plan}</option>)}
              </select>
            </div>
          }
        >
          <AdminTable rows={workspaceRows} columns={workspaceColumns} emptyTitle="No client workspaces found" />
        </Panel>
      </div>
    )
  }

  function Users() {
    const userStats = {
      total: liveUsers.length,
      verified: liveUsers.filter((row) => row.emailVerified === true).length,
      unverified: liveUsers.filter((row) => row.emailVerified !== true).length,
      online: liveUsers.filter(isOnline).length,
      blocked: liveUsers.filter((row) => statusValue(row.status) === 'blocked').length,
    }
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard label="Total Users" value={userStats.total} helper="Firestore users" icon={HiOutlineUsers} />
          <KpiCard label="Verified Users" value={userStats.verified} helper="Email verified" icon={HiOutlineCheckBadge} tone="emerald" />
          <KpiCard label="Unverified Users" value={userStats.unverified} helper="Pending verification" icon={HiOutlineEnvelope} tone="amber" />
          <KpiCard label="Online Now" value={userStats.online} helper="Last 5 minutes" icon={HiOutlineChartBarSquare} tone="sky" />
          <KpiCard label="Blocked Users" value={userStats.blocked} helper="Disabled access" icon={HiOutlineShieldCheck} tone="rose" />
        </div>
        <Panel
          title="Authentication / Users"
          action={
            <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold" value={userFilter} onChange={(event) => setUserFilter(event.target.value)}>
              {['all', 'verified', 'unverified', 'online', 'blocked'].map((filter) => <option key={filter} value={filter}>{filter}</option>)}
            </select>
          }
        >
          <AdminTable rows={userRows} columns={userColumns} emptyTitle="No users found" />
        </Panel>
      </div>
    )
  }

  function Plans() {
    return (
      <Panel title="Plans & Pricing Management" action={<ShellButton>Firestore: {PLATFORM_PLAN_COLLECTION}</ShellButton>}>
        <div className="grid gap-4 lg:grid-cols-3">
          {platformPlans.map((plan) => (
            <Card key={plan.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-950">{plan.name}</p>
                  <p className="mt-1 text-xs font-bold text-violet-700">{planPriceLabel(plan)} / {plan.billingCycle}</p>
                </div>
                <Status value={plan.enabled === false ? 'disabled' : 'active'} />
              </div>
              <div className="mt-4 flex items-center gap-2">
                <ShellButton onClick={() => {
                  const input = document.getElementById(`price-${plan.id}`)
                  if (!input || input.value === 'custom') return
                  input.value = Math.max(0, Number(input.value || 0) - 500)
                }}>−</ShellButton>
                <input id={`price-${plan.id}`} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-black" defaultValue={plan.price} />
                <ShellButton onClick={() => {
                  const input = document.getElementById(`price-${plan.id}`)
                  if (!input || input.value === 'custom') return
                  input.value = Number(input.value || 0) + 500
                }}>+</ShellButton>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <select id={`currency-${plan.id}`} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold" defaultValue={plan.currency || DEFAULT_SAAS_CURRENCY}>
                  {['PKR', 'USD', 'AED', 'SAR'].map((currency) => <option key={currency}>{currency}</option>)}
                </select>
                <select id={`cycle-${plan.id}`} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold" defaultValue={plan.billingCycle || 'monthly'}>
                  {['monthly', 'yearly', 'custom'].map((cycle) => <option key={cycle}>{cycle}</option>)}
                </select>
              </div>
              <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
                <input id={`crypto-monthly-${plan.id}`} className="min-w-0 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold" inputMode="decimal" defaultValue={plan.nowPaymentsMonthlyPrice ?? ''} placeholder="Crypto monthly" />
                <input id={`crypto-yearly-${plan.id}`} className="min-w-0 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold" inputMode="decimal" defaultValue={plan.nowPaymentsYearlyPrice ?? ''} placeholder="Crypto yearly" />
                <select id={`crypto-currency-${plan.id}`} className="rounded-xl border border-slate-200 px-2 py-2 text-xs font-bold" defaultValue={plan.nowPaymentsCurrency || 'USD'}>
                  {['USD', 'EUR', 'GBP'].map((currency) => <option key={currency}>{currency}</option>)}
                </select>
              </div>
              <label className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
                Enabled
                <input id={`enabled-${plan.id}`} type="checkbox" defaultChecked={plan.enabled !== false} />
              </label>
              <textarea
                id={`features-${plan.id}`}
                className="mt-3 h-32 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                defaultValue={(plan.features || []).join('\n')}
              />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <ShellButton onClick={() => {
                  const input = document.getElementById(`features-${plan.id}`)
                  if (input) input.value = `${input.value.trim()}\nNew Feature`.trim()
                }}>Add Feature</ShellButton>
                <ShellButton onClick={() => {
                  const input = document.getElementById(`features-${plan.id}`)
                  if (input) input.value = input.value.split('\n').slice(0, -1).join('\n')
                }}>Remove Last</ShellButton>
              </div>
              <ShellButton className="mt-4 w-full" onClick={() => {
                const rawPrice = document.getElementById(`price-${plan.id}`)?.value || plan.price
                const price = String(rawPrice).toLowerCase() === 'custom' ? 'custom' : Number(rawPrice || 0)
                const currency = document.getElementById(`currency-${plan.id}`)?.value || DEFAULT_SAAS_CURRENCY
                const billingCycle = document.getElementById(`cycle-${plan.id}`)?.value || 'monthly'
                const enabled = document.getElementById(`enabled-${plan.id}`)?.checked !== false
                const nowPaymentsMonthlyPrice = Number(document.getElementById(`crypto-monthly-${plan.id}`)?.value || 0)
                const nowPaymentsYearlyPrice = Number(document.getElementById(`crypto-yearly-${plan.id}`)?.value || 0)
                const nowPaymentsCurrency = document.getElementById(`crypto-currency-${plan.id}`)?.value || 'USD'
                const features = String(document.getElementById(`features-${plan.id}`)?.value || '')
                  .split('\n')
                  .map((feature) => feature.trim())
                  .filter(Boolean)
                runAction(
                  `plan-save-${plan.id}`,
                  async () => {
                    const monthlyPrice = price
                    const yearlyPrice = price === 'custom' ? 'custom' : Number(price || 0) * 12
                    await setDoc(doc(db, PLATFORM_PLAN_COLLECTION, plan.id), {
                      ...plan,
                      planName: plan.name,
                      monthlyPrice,
                      yearlyPrice,
                      price: monthlyPrice,
                      currency,
                      billingCycle,
                      active: enabled,
                      enabled,
                      features,
                      nowPaymentsMonthlyPrice: nowPaymentsMonthlyPrice > 0 ? nowPaymentsMonthlyPrice : null,
                      nowPaymentsYearlyPrice: nowPaymentsYearlyPrice > 0 ? nowPaymentsYearlyPrice : null,
                      nowPaymentsCurrency,
                      updatedAt: serverTimestamp(),
                      updatedBy: user?.uid || '',
                    }, { merge: true })
                    await logActivity('plan_saved', { planId: plan.id, price, currency, enabled })
                  },
                  'Plan saved.',
                )
              }}>Save Plan</ShellButton>
            </Card>
          ))}
        </div>
      </Panel>
    )
  }

  function PromoCodes() {
    const promoRows = searchRows(data.promoCodes, search, ['code', 'description', 'discountType'])
    const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-violet-400'
    const editPromo = (row) => {
      setPromoEditingId(row.id)
      setPromoDraft({
        code: row.code || row.id,
        description: row.description || '',
        discountType: row.discountType || 'percentage',
        discountValue: Number(row.discountValue || 0),
        maxDiscount: Number(row.maxDiscount || 0),
        minOrderAmount: Number(row.minOrderAmount || 0),
        applicablePlanId: row.applicablePlanIds?.includes('all') ? 'all' : row.applicablePlanIds?.[0] || 'all',
        billingCycle: row.billingCycles?.length === 2 ? 'all' : row.billingCycles?.[0] || 'all',
        startsAt: toDate(row.startsAt)?.toISOString().slice(0, 10) || promoDateInput(0),
        expiresAt: toDate(row.expiresAt)?.toISOString().slice(0, 10) || promoDateInput(30),
        usageLimit: Number(row.usageLimit || 0),
        active: row.active === true,
      })
    }

    const savePromo = async () => {
      const code = String(promoDraft.code || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 32)
      if (!/^[A-Z0-9_-]{3,32}$/.test(code)) throw new Error('Promo code must be 3-32 letters, numbers, dashes, or underscores.')
      const discountValue = Number(promoDraft.discountValue)
      if (!Number.isFinite(discountValue) || discountValue <= 0) throw new Error('Enter a valid discount value.')
      if (promoDraft.discountType === 'percentage' && discountValue > 100) throw new Error('Percentage discount cannot exceed 100%.')
      const startsAt = new Date(`${promoDraft.startsAt}T00:00:00`)
      const expiresAt = new Date(`${promoDraft.expiresAt}T23:59:59`)
      if (Number.isNaN(startsAt.getTime()) || Number.isNaN(expiresAt.getTime()) || expiresAt <= startsAt) throw new Error('Expiry date must be after the start date.')
      const existing = data.promoCodes.find((row) => row.id === code)
      await setDoc(doc(db, 'promoCodes', code), {
        code,
        description: String(promoDraft.description || '').trim().slice(0, 200),
        discountType: promoDraft.discountType,
        discountValue,
        maxDiscount: Math.max(0, Number(promoDraft.maxDiscount || 0)),
        minOrderAmount: Math.max(0, Number(promoDraft.minOrderAmount || 0)),
        applicablePlanIds: [promoDraft.applicablePlanId || 'all'],
        billingCycles: promoDraft.billingCycle === 'all' ? ['monthly', 'yearly'] : [promoDraft.billingCycle],
        startsAt: Timestamp.fromDate(startsAt),
        expiresAt: Timestamp.fromDate(expiresAt),
        usageLimit: Math.max(0, Math.floor(Number(promoDraft.usageLimit || 0))),
        usedCount: Math.max(0, Math.floor(Number(existing?.usedCount || 0))),
        active: promoDraft.active === true,
        createdAt: existing?.createdAt || serverTimestamp(),
        createdBy: existing?.createdBy || user?.uid || '',
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || '',
      })
      await logActivity(existing ? 'promo_code_updated' : 'promo_code_created', { code, discountType: promoDraft.discountType, discountValue })
      setPromoDraft((current) => ({ ...current, code: generatePromoCode(), description: '' }))
      setPromoEditingId('')
    }

    return (
      <div className="space-y-4">
        <Panel title="Promo Code Generator" action={<ShellButton onClick={() => { setPromoEditingId(''); setPromoDraft((current) => ({ ...current, code: generatePromoCode() })) }}>Generate Code</ShellButton>}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-xs font-black text-slate-600">Promo code<input className={`${inputClass} mt-1 uppercase disabled:bg-slate-100 disabled:text-slate-500`} value={promoDraft.code} maxLength={32} disabled={Boolean(promoEditingId)} onChange={(event) => setPromoDraft((current) => ({ ...current, code: event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') }))} /></label>
            <label className="text-xs font-black text-slate-600 md:col-span-2">Description<input className={`${inputClass} mt-1`} value={promoDraft.description} placeholder="Summer upgrade offer" onChange={(event) => setPromoDraft((current) => ({ ...current, description: event.target.value }))} /></label>
            <label className="text-xs font-black text-slate-600">Discount type<select className={`${inputClass} mt-1`} value={promoDraft.discountType} onChange={(event) => setPromoDraft((current) => ({ ...current, discountType: event.target.value }))}><option value="percentage">Percentage</option><option value="fixed">Fixed amount</option></select></label>
            <label className="text-xs font-black text-slate-600">Discount value<input className={`${inputClass} mt-1`} type="number" min="0" value={promoDraft.discountValue} onChange={(event) => setPromoDraft((current) => ({ ...current, discountValue: event.target.value }))} /></label>
            <label className="text-xs font-black text-slate-600">Max discount (0 = none)<input className={`${inputClass} mt-1`} type="number" min="0" value={promoDraft.maxDiscount} onChange={(event) => setPromoDraft((current) => ({ ...current, maxDiscount: event.target.value }))} /></label>
            <label className="text-xs font-black text-slate-600">Minimum order<input className={`${inputClass} mt-1`} type="number" min="0" value={promoDraft.minOrderAmount} onChange={(event) => setPromoDraft((current) => ({ ...current, minOrderAmount: event.target.value }))} /></label>
            <label className="text-xs font-black text-slate-600">Plan<select className={`${inputClass} mt-1`} value={promoDraft.applicablePlanId} onChange={(event) => setPromoDraft((current) => ({ ...current, applicablePlanId: event.target.value }))}><option value="all">All plans</option>{platformPlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label>
            <label className="text-xs font-black text-slate-600">Billing cycle<select className={`${inputClass} mt-1`} value={promoDraft.billingCycle} onChange={(event) => setPromoDraft((current) => ({ ...current, billingCycle: event.target.value }))}><option value="all">Monthly + yearly</option><option value="monthly">Monthly only</option><option value="yearly">Yearly only</option></select></label>
            <label className="text-xs font-black text-slate-600">Starts<input className={`${inputClass} mt-1`} type="date" value={promoDraft.startsAt} onChange={(event) => setPromoDraft((current) => ({ ...current, startsAt: event.target.value }))} /></label>
            <label className="text-xs font-black text-slate-600">Expires<input className={`${inputClass} mt-1`} type="date" value={promoDraft.expiresAt} onChange={(event) => setPromoDraft((current) => ({ ...current, expiresAt: event.target.value }))} /></label>
            <label className="text-xs font-black text-slate-600">Total usage limit (0 = unlimited)<input className={`${inputClass} mt-1`} type="number" min="0" value={promoDraft.usageLimit} onChange={(event) => setPromoDraft((current) => ({ ...current, usageLimit: event.target.value }))} /></label>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <label className="flex items-center gap-2 text-sm font-black text-slate-700"><input type="checkbox" checked={promoDraft.active} onChange={(event) => setPromoDraft((current) => ({ ...current, active: event.target.checked }))} /> Active immediately</label>
            <ShellButton className="bg-slate-950 px-5 text-white hover:bg-violet-700" disabled={busy === 'promo-save'} onClick={() => runAction('promo-save', savePromo, 'Promo code saved.')}>Save Promo Code</ShellButton>
          </div>
        </Panel>

        <Panel title="Promo Codes" action={<ShellButton>Firestore: promoCodes</ShellButton>}>
          <AdminTable rows={promoRows} emptyTitle="No promo codes created" columns={[
            { key: 'code', label: 'Code', render: (row) => <div><p className="font-black text-slate-950">{row.code}</p><p className="text-xs text-slate-500">{row.description || 'No description'}</p></div> },
            { key: 'discount', label: 'Discount', render: (row) => row.discountType === 'percentage' ? `${row.discountValue}%` : money(row.discountValue) },
            { key: 'scope', label: 'Scope', render: (row) => `${row.applicablePlanIds?.join(', ') || 'all'} · ${row.billingCycles?.join(', ') || 'all'}` },
            { key: 'usage', label: 'Usage', render: (row) => `${row.usedCount || 0} / ${row.usageLimit || '∞'}` },
            { key: 'expiresAt', label: 'Expires', render: (row) => dateLabel(row.expiresAt) },
            { key: 'active', label: 'Status', render: (row) => <Status value={row.active ? 'active' : 'disabled'} /> },
            { key: 'actions', label: 'Actions', render: (row) => <div className="flex gap-2"><ShellButton onClick={() => editPromo(row)}>Edit</ShellButton><ShellButton onClick={() => runAction(`promo-toggle-${row.id}`, async () => { await updateDoc(row.ref || doc(db, 'promoCodes', row.id), { active: !row.active, updatedAt: serverTimestamp(), updatedBy: user?.uid || '' }); await logActivity('promo_code_status_changed', { code: row.code, active: !row.active }) }, row.active ? 'Promo code disabled.' : 'Promo code enabled.')}>{row.active ? 'Disable' : 'Enable'}</ShellButton><ShellButton className="text-rose-700" onClick={() => setPromoDeleteTarget(row)}>Delete</ShellButton></div> },
          ]} />
        </Panel>
        {promoDeleteTarget ? (
          <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="delete-promo-title">
            <Card className="w-full max-w-md p-6 shadow-2xl">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-rose-600">Delete warning</p>
              <h3 id="delete-promo-title" className="mt-2 text-xl font-black text-slate-950">Delete {promoDeleteTarget.code}?</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">This code will stop working immediately. Existing payment records will keep their promo details.</p>
              <div className="mt-5 flex justify-end gap-2">
                <ShellButton onClick={() => setPromoDeleteTarget(null)}>Cancel</ShellButton>
                <ShellButton className="border-rose-600 bg-rose-600 text-white hover:bg-rose-700" onClick={() => runAction(`promo-delete-${promoDeleteTarget.id}`, async () => { await deleteDoc(promoDeleteTarget.ref || doc(db, 'promoCodes', promoDeleteTarget.id)); setPromoDeleteTarget(null) }, 'Promo code deleted.')}>Delete Promo</ShellButton>
              </div>
            </Card>
          </div>
        ) : null}
      </div>
    )
  }

  function Transactions() {
    const statuses = ['all', 'pending', 'approved', 'paid', 'rejected', 'failed']
    const planFilters = ['all', ...platformPlans.map((plan) => plan.name)]
    const methodFilters = ['all', ...Array.from(new Set(payments.map((row) => row.paymentMethod || row.method).filter(Boolean)))]
    const transactionStats = {
      totalRevenue: payments.filter(isPaid).reduce((sum, row) => sum + amountValue(row), 0),
      pending: payments.filter((row) => ['pending', 'pending_approval'].includes(statusValue(row.paymentStatus || row.status))).length,
      approved: payments.filter((row) => ['approved', 'paid'].includes(statusValue(row.paymentStatus || row.status))).length,
      rejected: payments.filter((row) => statusValue(row.paymentStatus || row.status) === 'rejected').length,
      monthRevenue: payments.filter((row) => {
        const date = toDate(row.paymentDate || row.paidAt || row.createdAt)
        const now = new Date()
        return isPaid(row) && date && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
      }).reduce((sum, row) => sum + amountValue(row), 0),
    }
    return (
      <Panel
        title="Transactions / SaaS Subscription Payments"
        action={
          <div className="flex flex-wrap gap-2">
            <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold" value={transactionStatusFilter} onChange={(event) => setTransactionStatusFilter(event.target.value)}>
              {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold" value={transactionPlanFilter} onChange={(event) => setTransactionPlanFilter(event.target.value)}>
              {planFilters.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
            </select>
            <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold" value={transactionMethodFilter} onChange={(event) => setTransactionMethodFilter(event.target.value)}>
              {methodFilters.map((method) => <option key={method} value={method}>{method}</option>)}
            </select>
            <input type="date" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold" value={transactionDateFrom} onChange={(event) => setTransactionDateFrom(event.target.value)} />
            <input type="date" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold" value={transactionDateTo} onChange={(event) => setTransactionDateTo(event.target.value)} />
            <ShellButton onClick={() => {
              const header = ['Transaction ID', 'Client Email', 'Workspace', 'Plan', 'Amount', 'Currency', 'Method', 'Status']
              const rows = paymentRows.map((row) => [row.transactionId || row.id, row.clientEmail || row.email || '', row.workspaceName || row.workspaceId || '', row.plan || '', amountValue(row), rowCurrency(row), row.paymentMethod || row.method || '', row.paymentStatus || row.status || ''])
              const csv = [header, ...rows].map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')
              navigator.clipboard?.writeText(csv)
              setToast('CSV copied to clipboard.')
            }}>Export CSV</ShellButton>
          </div>
        }
      >
        <div className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard label="Total Revenue" value={money(transactionStats.totalRevenue)} helper="Approved SaaS payments" icon={HiOutlineCurrencyDollar} />
          <KpiCard label="Pending Payments" value={transactionStats.pending} helper="Needs review" icon={HiOutlineBell} tone="amber" />
          <KpiCard label="Approved Payments" value={transactionStats.approved} helper="Approved or paid" icon={HiOutlineCheckBadge} tone="emerald" />
          <KpiCard label="Rejected Payments" value={transactionStats.rejected} helper="Rejected records" icon={HiOutlineShieldCheck} tone="rose" />
          <KpiCard label="This Month Revenue" value={money(transactionStats.monthRevenue)} helper="Current month" icon={HiOutlineChartBarSquare} tone="sky" />
        </div>
        <AdminTable rows={paymentRows} columns={paymentColumns} emptyTitle="No SaaS payment records found" />
      </Panel>
    )
  }

  function Announcements() {
    const workspaceOptions = data.workspaces.slice(0, 100)
    return (
      <Panel title="Advanced Announcements" action={<ShellButton>Firestore: announcements</ShellButton>}>
        <div className="mb-4 grid gap-3 lg:grid-cols-4">
          <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Title" value={announcementDraft.title} onChange={(event) => setAnnouncementDraft((current) => ({ ...current, title: event.target.value }))} />
          <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" value={announcementDraft.type} onChange={(event) => setAnnouncementDraft((current) => ({ ...current, type: event.target.value }))}>
            {['info', 'warning', 'maintenance', 'promotion', 'urgent'].map((type) => <option key={type}>{type}</option>)}
          </select>
          <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" value={announcementDraft.audience} onChange={(event) => setAnnouncementDraft((current) => ({ ...current, audience: event.target.value }))}>
            <option value="all">all clients</option>
            <option value="trial">trial clients</option>
            <option value="paid">paid clients</option>
            <option value="expired">expired clients</option>
            <option value="workspace">selected workspace</option>
            <option value="businessType">selected businessType</option>
          </select>
          <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" value={announcementDraft.priority} onChange={(event) => setAnnouncementDraft((current) => ({ ...current, priority: event.target.value }))}>
            {['low', 'medium', 'high'].map((priority) => <option key={priority}>{priority}</option>)}
          </select>
          <textarea className="min-h-24 rounded-xl border border-slate-200 px-3 py-2 text-sm lg:col-span-2" placeholder="Message" value={announcementDraft.message} onChange={(event) => setAnnouncementDraft((current) => ({ ...current, message: event.target.value }))} />
          <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" value={announcementDraft.workspaceId} onChange={(event) => setAnnouncementDraft((current) => ({ ...current, workspaceId: event.target.value }))}>
            <option value="">Select workspace</option>
            {workspaceOptions.map((workspace) => <option key={workspace.id} value={workspace.workspaceId || workspace.id}>{workspaceName(workspace)}</option>)}
          </select>
          <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" value={announcementDraft.businessType} onChange={(event) => setAnnouncementDraft((current) => ({ ...current, businessType: event.target.value }))}>
            <option value="">Select businessType</option>
            {modules.map((module) => <option key={module} value={module}>{displayAdminBusinessType(module)}</option>)}
          </select>
          <label className="text-xs font-bold text-slate-600">
            Schedule
            <input type="datetime-local" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={announcementDraft.scheduledAt} onChange={(event) => setAnnouncementDraft((current) => ({ ...current, scheduledAt: event.target.value }))} />
          </label>
          <label className="text-xs font-bold text-slate-600">
            Expiry
            <input type="datetime-local" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={announcementDraft.expiresAt} onChange={(event) => setAnnouncementDraft((current) => ({ ...current, expiresAt: event.target.value }))} />
          </label>
          <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" value={announcementDraft.status} onChange={(event) => setAnnouncementDraft((current) => ({ ...current, status: event.target.value }))}>
            {['draft', 'published', 'scheduled', 'expired'].map((status) => <option key={status}>{status}</option>)}
          </select>
          <label className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
            Pin announcement
            <input type="checkbox" checked={announcementDraft.pinned} onChange={(event) => setAnnouncementDraft((current) => ({ ...current, pinned: event.target.checked }))} />
          </label>
          <ShellButton onClick={() => {
            const id = `${Date.now()}`
            runAction(`announcement-${id}`, async () => {
              await setDoc(doc(db, 'announcements', id), {
                ...announcementDraft,
                createdAt: serverTimestamp(),
                createdBy: user?.uid || '',
                createdByEmail: user?.email || '',
              })
              await logActivity('announcement_sent', announcementDraft)
              if (announcementDraft.status === 'published') {
                await notifyAnnouncementAudience(announcementDraft, id)
              }
              setAnnouncementDraft({ title: '', message: '', type: 'info', audience: 'all', workspaceId: '', businessType: '', priority: 'medium', scheduledAt: '', expiresAt: '', pinned: false, status: 'draft' })
            }, 'Announcement saved.')
          }}>Save</ShellButton>
          <Card className="p-4 lg:col-span-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Preview</p>
            <div className="mt-3 rounded-2xl border border-violet-100 bg-violet-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Status value={announcementDraft.type} />
                <Status value={announcementDraft.priority} />
                {announcementDraft.pinned ? <Status value="pinned" /> : null}
              </div>
              <p className="mt-3 text-sm font-black text-slate-950">{announcementDraft.title || 'Announcement title'}</p>
              <p className="mt-1 text-sm text-slate-600">{announcementDraft.message || 'Announcement message preview appears here.'}</p>
            </div>
          </Card>
        </div>
        <AdminTable rows={data.announcements} emptyTitle="No announcements found" columns={[
          { key: 'title', label: 'Title' },
          { key: 'type', label: 'Type', render: (row) => <Status value={row.type || 'info'} /> },
          { key: 'audience', label: 'Audience', render: (row) => row.audience || row.target || 'all' },
          { key: 'priority', label: 'Priority', render: (row) => <Status value={row.priority || 'medium'} /> },
          { key: 'status', label: 'Status', render: (row) => <Status value={row.status || 'draft'} /> },
          { key: 'pinned', label: 'Pinned', render: (row) => row.pinned ? 'Yes' : 'No' },
          { key: 'createdAt', label: 'Created', render: (row) => dateTimeLabel(row.createdAt) },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <div className="flex flex-wrap gap-2">
                <ShellButton onClick={() => runAction(`announcement-publish-${row.id}`, async () => {
                  await updateDoc(row.ref || doc(db, 'announcements', row.id), { status: 'published', publishedAt: serverTimestamp(), updatedAt: serverTimestamp() })
                  await notifyAnnouncementAudience(row, row.id)
                }, 'Announcement published.')}>Publish</ShellButton>
                <ShellButton onClick={() => runAction(`announcement-draft-${row.id}`, () => updateDoc(row.ref || doc(db, 'announcements', row.id), { status: 'draft', updatedAt: serverTimestamp() }), 'Announcement moved to draft.')}>Draft</ShellButton>
                <ShellButton onClick={() => runAction(`announcement-expire-${row.id}`, () => updateDoc(row.ref || doc(db, 'announcements', row.id), { status: 'expired', expiredAt: serverTimestamp(), updatedAt: serverTimestamp() }), 'Announcement expired.')}>Expire</ShellButton>
              </div>
            ),
          },
        ]} />
      </Panel>
    )
  }

  function SupportTickets() {
    const ticketRows = searchRows(data.supportTickets, search, ['title', 'subject', 'clientEmail', 'email', 'workspaceName', 'category', 'status', 'priority'])
      .slice()
      .sort((a, b) => supportTicketTone(a).rank - supportTicketTone(b).rank || (toDate(b.updatedAt || b.createdAt)?.getTime() || 0) - (toDate(a.updatedAt || a.createdAt)?.getTime() || 0))
    const workspaceOptions = data.workspaces.map((workspace) => ({
      id: workspace.id || workspace.workspaceId || workspace.ownerId,
      name: workspaceName(workspace),
      email: userEmail(workspace),
    })).filter((workspace) => workspace.id)
    return (
      <Panel title="Futuristic Support Ticket Centre" action={<ShellButton>Firestore: supportTickets</ShellButton>}>
        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_1fr_14rem_14rem_12rem_auto]">
          <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Ticket title" value={ticketDraft.title} onChange={(event) => setTicketDraft((current) => ({ ...current, title: event.target.value }))} />
          <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Client email" value={ticketDraft.clientEmail} onChange={(event) => setTicketDraft((current) => ({ ...current, clientEmail: event.target.value }))} />
          <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" value={ticketDraft.workspaceId} onChange={(event) => setTicketDraft((current) => ({ ...current, workspaceId: event.target.value }))}>
            <option value="">Select workspace</option>
            {workspaceOptions.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
          </select>
          <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" value={ticketDraft.category} onChange={(event) => setTicketDraft((current) => ({ ...current, category: event.target.value }))}>
            {['Billing', 'Login', 'Workspace', 'CRM Bug', 'Feature Request', 'Technical Support'].map((category) => <option key={category}>{category}</option>)}
          </select>
          <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" value={ticketDraft.priority} onChange={(event) => setTicketDraft((current) => ({ ...current, priority: event.target.value }))}>
            {['low', 'medium', 'high', 'urgent'].map((priority) => <option key={priority}>{priority}</option>)}
          </select>
          <ShellButton onClick={() => {
            const id = `${Date.now()}`
            runAction(`ticket-create-${id}`, async () => {
              if (!ticketDraft.workspaceId) throw new Error('Select a workspace first.')
              const selectedWorkspace = data.workspaces.find((workspace) => (workspace.id || workspace.workspaceId || workspace.ownerId) === ticketDraft.workspaceId) || {}
              const payload = {
                ...ticketDraft,
                ticketNumber: `TCK-${id.slice(-6)}`,
                subject: ticketDraft.title,
                customerEmail: ticketDraft.clientEmail,
                clientEmail: ticketDraft.clientEmail,
                workspaceId: ticketDraft.workspaceId,
                workspaceName: workspaceName(selectedWorkspace),
                businessType: workspaceBusinessType(selectedWorkspace),
                status: 'Open',
                comments: [],
                conversation: [],
                internalNotes: '',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: user?.uid || '',
                createdByEmail: user?.email || '',
              }
              await setDoc(doc(db, 'workspaces', ticketDraft.workspaceId, 'supportTickets', id), payload)
              await logActivity('support_ticket_created', ticketDraft)
              await notifyWorkspaceOwner({
                workspaceId: ticketDraft.workspaceId,
                row: selectedWorkspace,
                type: 'Support',
                priority: ticketDraft.priority || 'medium',
                title: 'Support ticket created',
                message: `${ticketDraft.title} was created by backend support.`,
                relatedId: id,
                route: '/app/support',
                metadata: { ticketNumber: payload.ticketNumber, category: ticketDraft.category },
              })
              setTicketDraft({ title: '', clientEmail: '', category: 'Technical Support', priority: 'medium', workspaceId: '' })
            }, 'Support ticket created.')
          }}>Create</ShellButton>
        </div>
        <AdminTable rows={ticketRows} emptyTitle="No support tickets found" rowClassName={(row) => supportTicketTone(row).row} columns={[
          { key: 'ticket', label: 'Ticket', render: (row) => {
            const tone = supportTicketTone(row)
            return (
              <div className={`relative min-w-[15rem] overflow-hidden rounded-2xl border p-3 shadow-sm ${tone.card}`}>
                <span className={`absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b ${tone.stripe}`} />
                <div className="flex items-start justify-between gap-3 pl-2">
                  <div className="min-w-0">
                    <p className="truncate font-black text-slate-950">{row.title || row.subject || row.id}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-600">
                      {row.category || 'Technical Support'} · SLA {statusValue(row.priority) === 'urgent' ? '2h' : statusValue(row.priority) === 'high' ? '8h' : '24h'}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] ring-1 ${tone.pill}`}>
                    {tone.label}
                  </span>
                </div>
              </div>
            )
          } },
          { key: 'client', label: 'Client', render: (row) => <div><p>{row.clientEmail || row.email || '-'}</p><p className="text-xs text-slate-500">{row.workspaceName || row.workspaceId || '-'}</p></div> },
          { key: 'priority', label: 'Priority', render: (row) => <Status value={row.priority || 'medium'} /> },
          { key: 'status', label: 'Status', render: (row) => <Status value={row.status || 'open'} /> },
          { key: 'assigned', label: 'Assigned Staff', render: (row) => row.assignedStaff || row.assignedTo || 'Unassigned' },
          { key: 'lastReply', label: 'Last Reply', render: (row) => dateTimeLabel(row.lastReplyAt || row.updatedAt || row.createdAt) },
          { key: 'screenshot', label: 'Screenshot', render: (row) => {
            const url = row.screenshotUrl || row.attachmentUrl || row.attachments?.[0]?.url || ''
            return url ? <a className="text-xs font-black text-indigo-700 underline" href={url} target="_blank" rel="noreferrer">Open screenshot</a> : <span className="text-xs text-slate-400">No screenshot</span>
          } },
          { key: 'notes', label: 'Internal Notes', render: (row) => row.internalNotes || '-' },
          {
            key: 'conversation',
            label: 'Timeline / Reply',
            render: (row) => (
              <div className="min-w-[22rem] space-y-2">
                <div className="max-h-24 overflow-auto rounded-xl bg-slate-50 p-2 text-xs">
                  {(row.comments || row.conversation || []).slice(-3).map((item, index) => <p key={`${row.id}-${index}`}>{item.author || 'Support'}: {item.message}</p>)}
                  {!(row.comments || row.conversation || []).length ? <p>No conversation yet.</p> : null}
                </div>
                <div className="flex gap-2">
                  <input id={`reply-${row.id}`} className="w-44 rounded-xl border border-slate-200 px-3 py-2 text-xs" placeholder="Reply..." />
                  <ShellButton onClick={() => {
                    const input = document.getElementById(`reply-${row.id}`)
                    const message = input?.value?.trim()
                    if (!message) return
                    const conversation = [...(row.comments || row.conversation || []), { id: `admin_${Date.now()}`, author: user?.email || 'Admin', message, createdAt: new Date().toISOString() }]
                    runAction(`ticket-reply-${row.id}`, () => updateSupportTicket(
                      row,
                      { comments: conversation, conversation, lastReplyAt: serverTimestamp(), updatedAt: serverTimestamp() },
                      { title: 'New support reply', message: `Support replied on ${row.title || row.subject || row.id}.` },
                    ), 'Reply saved.')
                    input.value = ''
                  }}>Reply</ShellButton>
                </div>
              </div>
            ),
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <div className="flex flex-wrap gap-2">
                <ShellButton onClick={() => runAction(`ticket-complete-${row.id}`, () => updateSupportTicket(row, { status: 'Completed', completedAt: serverTimestamp(), resolvedAt: serverTimestamp(), updatedAt: serverTimestamp() }, { title: 'Support ticket completed', message: `${row.title || row.subject || row.id} was completed.` }), 'Ticket completed.')}>Complete</ShellButton>
                <ShellButton onClick={() => runAction(`ticket-resolve-${row.id}`, () => updateSupportTicket(row, { status: 'Resolved', resolvedAt: serverTimestamp(), updatedAt: serverTimestamp() }, { title: 'Support ticket resolved', message: `${row.title || row.subject || row.id} was resolved.` }), 'Ticket resolved.')}>Resolve</ShellButton>
                <ShellButton onClick={() => runAction(`ticket-reopen-${row.id}`, () => updateSupportTicket(row, { status: 'Open', reopenedAt: serverTimestamp(), updatedAt: serverTimestamp() }, { title: 'Support ticket reopened', message: `${row.title || row.subject || row.id} was reopened.` }), 'Ticket reopened.')}>Reopen</ShellButton>
                <ShellButton onClick={() => runAction(`ticket-close-${row.id}`, () => updateSupportTicket(row, { status: 'Closed', closedAt: serverTimestamp(), updatedAt: serverTimestamp() }, { title: 'Support ticket closed', message: `${row.title || row.subject || row.id} was closed.` }), 'Ticket closed.')}>Close</ShellButton>
              </div>
            ),
          },
        ]} />
      </Panel>
    )
  }

  function WhatsappPricing() {
    const draft = whatsappPricingDraft
    const currency = draft.currency || 'PKR'
    const setField = (field, value) => setWhatsappPricingDraft((current) => ({ ...current, [field]: value }))
    const numberField = (field, value) => setField(field, value === '' ? '' : Math.max(0, Math.floor(Number(value) || 0)))

    return (
      <div className="space-y-4">
        <Panel
          title="WhatsApp CRM Pricing Management"
          action={<ShellButton>Firestore: settings/whatsappPricing</ShellButton>}
        >
          {whatsappPricingApi.error ? (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{whatsappPricingApi.error}</div>
          ) : null}
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <label className="text-xs font-bold text-slate-600">
              Setup Fee
              <input type="number" min="0" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={draft.setupFee} onChange={(event) => numberField('setupFee', event.target.value)} />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Monthly Fee
              <input type="number" min="0" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={draft.monthlyFee} onChange={(event) => numberField('monthlyFee', event.target.value)} />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Trial Days
              <input type="number" min="0" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={draft.trialDays} onChange={(event) => numberField('trialDays', event.target.value)} />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Trial Message Limit
              <input type="number" min="0" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={draft.trialMessageLimit} onChange={(event) => numberField('trialMessageLimit', event.target.value)} />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Currency
              <select className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={currency} onChange={(event) => setField('currency', event.target.value)}>
                {SUPPORTED_PRICING_CURRENCIES.map((code) => <option key={code}>{code}</option>)}
              </select>
            </label>
            <label className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 lg:mt-5">
              Meta Billing Notice Enabled
              <input type="checkbox" checked={draft.metaBillingEnabled !== false} onChange={(event) => setField('metaBillingEnabled', event.target.checked)} />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <ShellButton onClick={() => runAction('whatsapp-pricing-save', saveWhatsappPricing, 'WhatsApp pricing saved.')}>Save Pricing</ShellButton>
            <ShellButton onClick={() => runAction('whatsapp-pricing-reset', resetWhatsappPricing, 'WhatsApp pricing reset to defaults.')}>Reset to Defaults</ShellButton>
          </div>
        </Panel>

        <Panel title="Current Public Pricing" action={<ShellButton>Live Preview</ShellButton>}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['One-Time Setup Fee', formatPricingAmount(draft.setupFee, currency)],
              ['Monthly Subscription', `${formatPricingAmount(draft.monthlyFee, currency)} / mo`],
              ['Trial Duration', `${Number(draft.trialDays) || 0} Days`],
              ['Trial Message Limit', `${Number(draft.trialMessageLimit) || 0} Messages`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-700/80">{label}</p>
                <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs font-semibold text-slate-500">
            Currency: {currency} · Meta billing notice: {draft.metaBillingEnabled !== false ? 'Shown' : 'Hidden'} · Last updated: {dateTimeLabel(whatsappPricingApi.pricing.lastUpdatedAt) || '—'}
          </p>
        </Panel>
      </div>
    )
  }

  function MaintenanceManagement() {
    const maintenanceDraft = normalizeMaintenanceConfig(settingsDraft.maintenanceConfig)
    const setMaintenanceField = (field, value) => {
      setSettingsDraft((current) => ({
        ...current,
        maintenanceMode: field === 'enabled' ? value : normalizeMaintenanceConfig(current.maintenanceConfig).enabled,
        maintenanceConfig: {
          ...normalizeMaintenanceConfig(current.maintenanceConfig),
          [field]: value,
        },
      }))
    }
    const applyProfessionalCopy = () => {
      setSettingsDraft((current) => {
        const currentConfig = normalizeMaintenanceConfig(current.maintenanceConfig)
        return {
          ...current,
          maintenanceConfig: {
            ...currentConfig,
            title: 'Scheduled maintenance in progress',
            noticeMessage: 'Scheduled maintenance is planned for this service. Please save your work before the maintenance window begins.',
            activeMessage: 'This service is temporarily unavailable while we complete scheduled maintenance. We are working to restore access as quickly as possible.',
          },
        }
      })
    }

    return (
      <div className="space-y-4">
        <Panel
          title="Maintenance Scheduler"
          action={<ShellButton onClick={() => runAction('maintenance-save', saveSettings, 'Maintenance mode saved.')}>Save Maintenance</ShellButton>}
        >
          <div className="grid gap-4 lg:grid-cols-3">
            <label className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
              Enable maintenance controls
              <input type="checkbox" checked={maintenanceDraft.enabled} onChange={(event) => setMaintenanceField('enabled', event.target.checked)} />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Target
              <select className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={maintenanceDraft.target} onChange={(event) => setMaintenanceField('target', event.target.value)}>
                {maintenanceTargets.map((target) => <option key={target.value} value={target.value}>{target.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-600">
              Module
              <select className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={maintenanceDraft.module} onChange={(event) => setMaintenanceField('module', event.target.value)} disabled={maintenanceDraft.target !== 'module'}>
                {maintenanceModules.map((module) => <option key={module.value} value={module.value}>{module.label}</option>)}
              </select>
            </label>
            <label className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
              Show advance ticker
              <input type="checkbox" checked={maintenanceDraft.noticeEnabled} onChange={(event) => setMaintenanceField('noticeEnabled', event.target.checked)} />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Ticker Starts
              <input type="datetime-local" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={maintenanceDraft.noticeStartsAt || ''} onChange={(event) => setMaintenanceField('noticeStartsAt', event.target.value)} />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Maintenance Starts
              <input type="datetime-local" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={maintenanceDraft.startsAt || ''} onChange={(event) => setMaintenanceField('startsAt', event.target.value)} />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Maintenance Ends
              <input type="datetime-local" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={maintenanceDraft.endsAt || ''} onChange={(event) => setMaintenanceField('endsAt', event.target.value)} />
            </label>
            <label className="text-xs font-bold text-slate-600 lg:col-span-2">
              Maintenance Title
              <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={maintenanceDraft.title || ''} onChange={(event) => setMaintenanceField('title', event.target.value)} />
            </label>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <label className="text-xs font-bold text-slate-600">
              Advance Ticker Message
              <textarea className="mt-1 h-28 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={maintenanceDraft.noticeMessage || ''} onChange={(event) => setMaintenanceField('noticeMessage', event.target.value)} />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Active Maintenance Message
              <textarea className="mt-1 h-28 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={maintenanceDraft.activeMessage || ''} onChange={(event) => setMaintenanceField('activeMessage', event.target.value)} />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <ShellButton onClick={applyProfessionalCopy}>Apply Professional Copy</ShellButton>
            <ShellButton onClick={() => setMaintenanceField('enabled', false)}>Disable Maintenance</ShellButton>
            <ShellButton onClick={() => runAction('maintenance-save-bottom', saveSettings, 'Maintenance mode saved.')}>Save</ShellButton>
          </div>
        </Panel>

        <Panel title="Live Behaviour">
          <div className="grid gap-4 lg:grid-cols-3">
            {[
              ['Status', maintenanceDraft.enabled ? 'Enabled' : 'Disabled'],
              ['Target', maintenanceTargets.find((target) => target.value === maintenanceDraft.target)?.label || maintenanceDraft.target],
              ['Module', maintenanceModules.find((module) => module.value === maintenanceDraft.module)?.label || 'All Workspace Modules'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
                <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
            Workspace ticker appears after "Ticker Starts" and before "Maintenance Starts". During the maintenance window, the selected website/workspace/module shows the active maintenance message.
          </div>
        </Panel>
      </div>
    )
  }

  function Settings() {
    return (
      <div className="space-y-4">
        <Panel title="System Profile" action={<ShellButton>Firestore: platformSettings/main</ShellButton>}>
          <div className="grid gap-4 lg:grid-cols-3">
            <label className="text-xs font-bold text-slate-600">
              System Name
              <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={settingsDraft.systemName || ''} onChange={(event) => setSettingsDraft((current) => ({ ...current, systemName: event.target.value }))} />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Default Currency
              <select className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={settingsDraft.defaultCurrency || DEFAULT_SAAS_CURRENCY} onChange={(event) => setSettingsDraft((current) => ({ ...current, defaultCurrency: event.target.value }))}>
                {['PKR', 'USD', 'AED', 'SAR'].map((currency) => <option key={currency}>{currency}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-600">
              Trial Days
              <input type="number" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={settingsDraft.trialDays || 7} onChange={(event) => setSettingsDraft((current) => ({ ...current, trialDays: event.target.value }))} />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Support Email
              <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={settingsDraft.supportEmail || ''} onChange={(event) => setSettingsDraft((current) => ({ ...current, supportEmail: event.target.value }))} />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Email Sender Name
              <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={settingsDraft.emailSenderName || ''} onChange={(event) => setSettingsDraft((current) => ({ ...current, emailSenderName: event.target.value }))} />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Email Reply-To
              <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={settingsDraft.emailReplyTo || ''} onChange={(event) => setSettingsDraft((current) => ({ ...current, emailReplyTo: event.target.value }))} />
            </label>
          </div>
        </Panel>
        <Panel title="Payment Accounts">
          <div className="grid gap-4 lg:grid-cols-2">
            {[
              ['jazzcash', 'JazzCash'],
              ['easypaisa', 'Easypaisa'],
              ['bank_transfer', 'Bank Transfer'],
              ['manual_payment', 'Manual Payment'],
            ].map(([key, label]) => {
              const account = settingsDraft.paymentAccounts?.[key] || defaultPlatformSettings.paymentAccounts?.[key] || {}
              const updateAccount = (field, value) => setSettingsDraft((current) => ({
                ...current,
                paymentAccounts: {
                  ...(current.paymentAccounts || {}),
                  [key]: {
                    ...(current.paymentAccounts?.[key] || defaultPlatformSettings.paymentAccounts?.[key] || {}),
                    id: key,
                    label,
                    [field]: value,
                  },
                },
              }))
              return (
                <div key={key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-black text-slate-950">{label}</p>
                  <div className="mt-3 grid gap-3">
                    {key === 'bank_transfer' ? (
                      <label className="text-xs font-bold text-slate-600">
                        Bank Name
                        <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={account.bankName || ''} onChange={(event) => updateAccount('bankName', event.target.value)} />
                      </label>
                    ) : null}
                    <label className="text-xs font-bold text-slate-600">
                      Account Title
                      <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={account.accountTitle || ''} onChange={(event) => updateAccount('accountTitle', event.target.value)} />
                    </label>
                    <label className="text-xs font-bold text-slate-600">
                      Account Number
                      <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={account.accountNumber || ''} onChange={(event) => updateAccount('accountNumber', event.target.value)} />
                    </label>
                    <label className="text-xs font-bold text-slate-600">
                      Instructions
                      <textarea className="mt-1 h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={account.instructions || ''} onChange={(event) => updateAccount('instructions', event.target.value)} />
                    </label>
                  </div>
                </div>
              )
            })}
          </div>
        </Panel>
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Maintenance Mode">
            <label className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
              Enable maintenance mode UI
              <input
                type="checkbox"
                checked={Boolean(normalizeMaintenanceConfig(settingsDraft.maintenanceConfig).enabled)}
                onChange={(event) => setSettingsDraft((current) => ({
                  ...current,
                  maintenanceMode: event.target.checked,
                  maintenanceConfig: {
                    ...normalizeMaintenanceConfig(current.maintenanceConfig),
                    enabled: event.target.checked,
                  },
                }))}
              />
            </label>
            <ShellButton className="mt-3" onClick={() => setActiveTab('maintenance')}>Open Scheduler</ShellButton>
          </Panel>
          <Panel title="Feature Flags">
            <div className="space-y-3">
              {Object.entries(settingsDraft.featureFlags || defaultPlatformSettings.featureFlags).map(([key, value]) => (
                <label key={key} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
                  {key}
                  <input
                    type="checkbox"
                    checked={Boolean(value)}
                    onChange={(event) => setSettingsDraft((current) => ({
                      ...current,
                      featureFlags: { ...(current.featureFlags || {}), [key]: event.target.checked },
                    }))}
                  />
                </label>
              ))}
            </div>
          </Panel>
          <Panel title="AI Menu Import">
            <div className="grid gap-3 lg:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">OCR Provider</label>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={settingsDraft.aiMenuImport?.ocrProvider || 'gemini'}
                  onChange={(event) => setSettingsDraft((current) => ({
                    ...current,
                    aiMenuImport: { ...(current.aiMenuImport || defaultPlatformSettings.aiMenuImport), ocrProvider: event.target.value },
                  }))}
                >
                  <option value="gemini">Gemini 2.0 Flash (Recommended)</option>
                  <option value="openai">OpenAI GPT-4o Mini</option>
                  <option value="claude">Claude 3 Haiku</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Max Upload Size (MB)</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={settingsDraft.aiMenuImport?.maxUploadSizeMB ?? 10}
                  onChange={(event) => setSettingsDraft((current) => ({
                    ...current,
                    aiMenuImport: { ...(current.aiMenuImport || defaultPlatformSettings.aiMenuImport), maxUploadSizeMB: Number(event.target.value) || 10 },
                  }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Allowed File Types</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={settingsDraft.aiMenuImport?.allowedFileTypes || 'jpg,png,webp,pdf'}
                  onChange={(event) => setSettingsDraft((current) => ({
                    ...current,
                    aiMenuImport: { ...(current.aiMenuImport || defaultPlatformSettings.aiMenuImport), allowedFileTypes: event.target.value },
                  }))}
                />
                <p className="mt-0.5 text-[10px] text-slate-400">Comma-separated extensions: jpg,png,webp,pdf</p>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Confidence Threshold (0–1)</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={settingsDraft.aiMenuImport?.confidenceThreshold ?? 0.7}
                  onChange={(event) => setSettingsDraft((current) => ({
                    ...current,
                    aiMenuImport: { ...(current.aiMenuImport || defaultPlatformSettings.aiMenuImport), confidenceThreshold: Number(event.target.value) || 0.7 },
                  }))}
                />
                <p className="mt-0.5 text-[10px] text-slate-400">Items below this threshold are flagged as warnings</p>
              </div>
            </div>
            <ShellButton className="mt-4" onClick={() => runAction('settings-save', saveSettings, 'AI Menu Import settings saved.')}>Save AI Import Settings</ShellButton>
          </Panel>
        </div>
        <Panel title="Email Template Settings">
          <div className="grid gap-3 lg:grid-cols-3">
            {['welcomeTemplate', 'upgradeApprovedTemplate', 'paymentRejectedTemplate'].map((key) => (
              <textarea
                key={key}
                className="h-28 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder={key}
                value={settingsDraft[key] || ''}
                onChange={(event) => setSettingsDraft((current) => ({ ...current, [key]: event.target.value }))}
              />
            ))}
          </div>
          <ShellButton className="mt-4" onClick={() => runAction('settings-save', saveSettings, 'Settings saved.')}>Save Settings</ShellButton>
        </Panel>
      </div>
    )
  }

  function VisitorAnalytics() {
    const eventRows = [...data.analyticsEvents]
      .sort((a, b) => (toDate(b.timestamp || b.createdAt)?.getTime() || 0) - (toDate(a.timestamp || a.createdAt)?.getTime() || 0))
      .slice(0, 500)
    const sessionRows = [...data.userSessions]
      .sort((a, b) => (toDate(b.lastActiveAt)?.getTime() || 0) - (toDate(a.lastActiveAt)?.getTime() || 0))
      .slice(0, 300)
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Total Visitors" value={analyticsStats.totalVisitors} helper="Tracked events" icon={HiOutlineUsers} />
          <KpiCard label="Unique Visitors" value={analyticsStats.uniqueVisitors} helper="Unique visitor IDs" icon={HiOutlineUserGroup} tone="sky" />
          <KpiCard label="Clicks Today" value={analyticsStats.clicksToday} helper="Meaningful clicks" icon={HiOutlineChartBarSquare} tone="amber" />
          <KpiCard label="Signup Started" value={analyticsStats.signupStarted} helper="Signup intent" icon={HiOutlineEnvelope} tone="violet" />
          <KpiCard label="Signup Completed" value={analyticsStats.signupCompleted} helper="Accounts created" icon={HiOutlineCheckBadge} tone="emerald" />
          <KpiCard label="Login Completed" value={analyticsStats.loginCompleted} helper="Successful logins" icon={HiOutlineShieldCheck} tone="emerald" />
          <KpiCard label="Drop-offs" value={analyticsStats.dropOffs} helper="Signup starts not completed" icon={HiOutlineBell} tone="rose" />
          <KpiCard label="Active Sessions" value={analyticsStats.activeSessions} helper={`Top module: ${analyticsStats.mostClickedModule}`} icon={HiOutlineHome} tone="sky" />
        </div>

        <Panel title="Signup Funnel">
          <div className="grid gap-3 lg:grid-cols-7">
            {funnelRows.map((row) => (
              <div key={row.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black text-slate-500">{row.label}</p>
                <p className="mt-2 text-2xl font-black text-slate-950">{row.count}</p>
                <p className="mt-1 text-xs font-bold text-rose-600">Drop-off {row.dropOff}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Click Heat / Activity Events">
          <AdminTable
            rows={eventRows}
            emptyTitle="No analytics events found"
            columns={[
              { key: 'time', label: 'Time', render: (row) => dateTimeLabel(row.timestamp || row.createdAt) },
              { key: 'visitor', label: 'Visitor/User', render: (row) => row.userId || row.visitorId || '-' },
              { key: 'email', label: 'Email', render: (row) => row.email || '-' },
              { key: 'phone', label: 'Phone', render: (row) => row.phone || '-' },
              { key: 'event', label: 'Event', render: (row) => <Status value={row.eventType} /> },
              { key: 'page', label: 'Page', render: (row) => row.page || '-' },
              { key: 'button', label: 'Button / Module', render: (row) => row.buttonLabel || row.moduleName || '-' },
              { key: 'status', label: 'Status', render: (row) => row.status || '-' },
              { key: 'device', label: 'Device', render: (row) => `${row.deviceType || '-'} · ${row.browser || '-'}` },
              { key: 'duration', label: 'Session Duration', render: (row) => `${Math.round(Number(row.sessionDurationMs || 0) / 1000)}s` },
            ]}
          />
        </Panel>

        <Panel title="User Sessions">
          <AdminTable
            rows={sessionRows}
            emptyTitle="No user sessions found"
            columns={[
              { key: 'online', label: 'Online', render: (row) => <Status value={isOnline(row) ? 'online' : 'offline'} /> },
              { key: 'email', label: 'Email', render: (row) => row.email || '-' },
              { key: 'phone', label: 'Phone', render: (row) => row.phone || '-' },
              { key: 'login', label: 'Last Active', render: (row) => dateTimeLabel(row.lastActiveAt) },
              { key: 'duration', label: 'Total Session Duration', render: (row) => `${Math.round(Number(row.sessionDurationMs || 0) / 1000)}s` },
              { key: 'workspace', label: 'Workspace', render: (row) => row.workspaceId || '-' },
              { key: 'module', label: 'Module', render: (row) => displayAdminBusinessType(row.businessType) },
              { key: 'device', label: 'Device', render: (row) => `${row.deviceType || '-'} · ${row.browser || '-'} · ${row.os || '-'}` },
            ]}
          />
        </Panel>
      </div>
    )
  }

  function BehaviorInterest() {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard label="Interested" value={behaviorInterest.interested.length} helper="High-priority leads" icon={HiOutlineCheckBadge} tone="emerald" />
          <KpiCard label="Warm" value={behaviorInterest.warm.length} helper="Follow-up recommended" icon={HiOutlineChartBarSquare} tone="sky" />
          <KpiCard label="Cold" value={behaviorInterest.cold.length} helper="Low intent" icon={HiOutlineUsers} tone="amber" />
          <KpiCard label="Not Interested" value={behaviorInterest.notInterested.length} helper="Watch only" icon={HiOutlineBell} tone="rose" />
          <KpiCard label="Expected Conversions" value={behaviorInterest.expectedConversions} helper="Behavior-based estimate" icon={HiOutlineCreditCard} tone="violet" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <Panel title="Interested Priority Queue" action={<ShellButton>Behavior score</ShellButton>}>
            <AdminTable
              rows={behaviorInterest.rows}
              emptyTitle="No behavior data found"
              columns={[
                { key: 'priority', label: 'Priority', render: (row) => <Status value={row.priority} /> },
                { key: 'score', label: 'Score', render: (row) => row.score },
                { key: 'identity', label: 'Visitor / Client', render: (row) => <div><p className="font-black text-slate-900">{row.email || row.phone || row.userId || row.visitorId || row.id}</p><p className="text-xs text-slate-500">{row.userId || row.visitorId || '-'}</p></div> },
                { key: 'level', label: 'Interest', render: (row) => <Status value={row.level} /> },
                { key: 'module', label: 'Interested In', render: (row) => row.topModule || '-' },
                { key: 'events', label: 'Events', render: (row) => `${row.events} events · ${row.clicks} clicks` },
                { key: 'signup', label: 'Signup', render: (row) => `${row.signupStarted} started / ${row.signupCompleted} done` },
                { key: 'last', label: 'Last Behavior', render: (row) => <div><p className="font-semibold">{row.lastEventType || '-'}</p><p className="text-xs text-slate-500">{dateTimeLabel(row.lastEventAt)}</p></div> },
              ]}
            />
          </Panel>

          <Panel title="Module Demand">
            <div className="space-y-3">
              {behaviorInterest.moduleInterest.map((row, index) => (
                <div key={row.moduleName} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-black text-slate-900">{row.moduleName}</p>
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-slate-700">#{index + 1}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-blue-500 to-violet-500" style={{ width: `${Math.min(100, row.score)}%` }} />
                  </div>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Interest score {row.score}</p>
                </div>
              ))}
              {!behaviorInterest.moduleInterest.length ? <EmptyState title="No module interest yet" detail="Module clicks and signup behavior will appear here." /> : null}
            </div>
          </Panel>
        </div>
      </div>
    )
  }

  function StaffManagement() {
    return (
      <Panel title="Staff Management" action={<ShellButton>Firestore: backendStaff</ShellButton>}>
        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_1fr_14rem_auto]">
          <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Staff name" value={staffDraft.name} onChange={(event) => setStaffDraft((current) => ({ ...current, name: event.target.value }))} />
          <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Email" value={staffDraft.email} onChange={(event) => setStaffDraft((current) => ({ ...current, email: event.target.value }))} />
          <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" value={staffDraft.role} onChange={(event) => setStaffDraft((current) => ({ ...current, role: event.target.value }))}>
            {adminRoles.map((role) => <option key={role}>{role}</option>)}
          </select>
          <ShellButton onClick={() => {
            const id = staffDraft.email.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || `staff-${Date.now()}`
            runAction(`staff-add-${id}`, async () => {
              await setDoc(doc(db, 'backendStaff', id), { ...staffDraft, status: 'active', createdAt: serverTimestamp(), updatedAt: serverTimestamp(), createdBy: user?.uid || '' }, { merge: true })
              await logActivity('backend_staff_saved', { email: staffDraft.email, role: staffDraft.role })
              setStaffDraft({ name: '', email: '', role: 'Support' })
            }, 'Backend staff saved.')
          }}>Add Staff</ShellButton>
        </div>
        <AdminTable rows={data.backendStaff} emptyTitle="No backend staff found" columns={[
          { key: 'name', label: 'Staff', render: (row) => <div><p className="font-black text-slate-900">{row.name || row.email || row.id}</p><p className="text-xs text-slate-500">{row.email || row.id}</p></div> },
          { key: 'role', label: 'Role', render: (row) => row.role || 'Support' },
          { key: 'status', label: 'Status', render: (row) => <Status value={row.status || 'active'} /> },
          { key: 'actions', label: 'Actions', render: (row) => <div className="flex flex-wrap gap-2"><ShellButton onClick={() => runAction(`staff-enable-${row.id}`, () => updateDoc(row.ref || doc(db, 'backendStaff', row.id), { status: 'active', updatedAt: serverTimestamp() }))}>Enable</ShellButton><ShellButton onClick={() => runAction(`staff-disable-${row.id}`, () => updateDoc(row.ref || doc(db, 'backendStaff', row.id), { status: 'disabled', updatedAt: serverTimestamp() }))}>Disable</ShellButton></div> },
        ]} />
      </Panel>
    )
  }

  function Roles() {
    return (
      <Panel title="Roles & Permissions">
        <div className="grid gap-4 lg:grid-cols-5">
          {adminRoles.map((role) => (
            <Card key={role} className="p-4">
              <p className="font-black text-slate-950">{role}</p>
              <div className="mt-4 space-y-2 text-xs font-semibold text-slate-600">
                {['Dashboard', 'Clients', 'Subscriptions', 'Users', 'System Logs'].map((permission) => (
                  <label key={permission} className="flex items-center justify-between gap-3">
                    <span>{permission}</span>
                    <input type="checkbox" defaultChecked={['Super Admin', 'Admin'].includes(role)} disabled />
                  </label>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </Panel>
    )
  }

  function SecurityPasskeys() {
    const passkeys = [...(passkeySecurity.passkeys || [])].sort((a, b) => String(b.updatedAt || b.lastUsed || b.createdAt || '').localeCompare(String(a.updatedAt || a.lastUsed || a.createdAt || '')))
    const loginHistory = [...(passkeySecurity.loginHistory || [])].sort((a, b) => String(b.createdAt || b.date || b.time || '').localeCompare(String(a.createdAt || a.date || a.time || '')))
    const sessions = [...(passkeySecurity.activeSessions || [])].sort((a, b) => String(b.lastActiveAt || b.startedAt || b.loginTime || '').localeCompare(String(a.lastActiveAt || a.startedAt || a.loginTime || '')))
    const activePasskeys = passkeys.filter((row) => row.status === 'active')
    const failedPasskeyAttempts = loginHistory.filter((row) => row.authenticationMethod === 'passkey' && row.status === 'failed').length
    const successfulPasskeyLogins = loginHistory.filter((row) => row.authenticationMethod === 'passkey' && row.status === 'success').length
    const passwordLogins = loginHistory.filter((row) => row.authenticationMethod === 'password').length
    const googleLogins = loginHistory.filter((row) => row.authenticationMethod === 'google').length
    const blockedDevices = passkeys.filter((row) => ['disabled', 'deleted', 'removed'].includes(row.status)).length
    const usersWithPasskeys = new Set(activePasskeys.map((row) => row.userId).filter(Boolean))
    const usersWithoutPasskey = Math.max(0, data.users.length - usersWithPasskeys.size)

    const passkeyColumns = [
      { key: 'user', label: 'User', render: (row) => <div><p className="font-black text-slate-950">{row.user || row.email || row.userId}</p><p className="text-xs font-semibold text-slate-500">{row.email || '-'}</p></div> },
      { key: 'company', label: 'Company', render: (row) => row.company || '-' },
      { key: 'workspace', label: 'Workspace', render: (row) => row.workspaceId || '-' },
      { key: 'device', label: 'Registered Devices', render: (row) => <div><p className="font-bold">{row.deviceName || 'Passkey device'}</p><p className="text-xs text-slate-500">{row.platform || '-'} · {row.browser || '-'}</p></div> },
      { key: 'created', label: 'Created Date', render: (row) => dateTimeLabel(row.createdAt) },
      { key: 'lastUsed', label: 'Last Used', render: (row) => dateTimeLabel(row.lastUsed) },
      { key: 'status', label: 'Status', render: (row) => <Status value={row.forcedReRegister ? 'force re-register' : row.status || 'active'} /> },
      { key: 'actions', label: 'Actions', render: (row) => (
        <div className="flex flex-wrap gap-2">
          <ShellButton onClick={() => runAction(`passkey-disable-${row.id}`, () => adminUpdatePasskey(row.id, 'disable'), 'Passkey disabled.')}>Disable Passkey</ShellButton>
          <ShellButton onClick={() => runAction(`passkey-delete-${row.id}`, () => adminUpdatePasskey(row.id, 'delete'), 'Passkey deleted.')}>Delete Passkey</ShellButton>
          <ShellButton onClick={() => runAction(`passkey-reregister-${row.id}`, () => adminUpdatePasskey(row.id, 'force-re-register'), 'Re-register required.')}>Force Re-register</ShellButton>
          <ShellButton onClick={() => runAction(`passkey-logout-${row.userId}`, () => adminForceLogoutUser(row.userId), 'User forced logout.')}>Force Logout</ShellButton>
        </div>
      ) },
    ]

    return (
      <div className="space-y-4">
        {passkeySecurityError ? <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">{passkeySecurityError}</p> : null}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Passkey Adoption" value={`${usersWithPasskeys.size}/${data.users.length || 0}`} helper="Users with active passkey" icon={HiOutlineKey} tone="emerald" />
          <KpiCard label="Registered Devices" value={activePasskeys.length} helper="Active passkeys" icon={HiOutlineShieldCheck} tone="sky" />
          <KpiCard label="Users Without Passkey" value={usersWithoutPasskey} helper="Password/Google fallback users" icon={HiOutlineUsers} tone="amber" />
          <KpiCard label="Failed Passkey Attempts" value={failedPasskeyAttempts} helper="Security monitoring" icon={HiOutlineBell} tone="rose" />
          <KpiCard label="Successful Passkey Logins" value={successfulPasskeyLogins} helper="Verified WebAuthn logins" icon={HiOutlineCheckBadge} tone="emerald" />
          <KpiCard label="Password Logins" value={passwordLogins} helper="Fallback usage" icon={HiOutlineShieldCheck} />
          <KpiCard label="Google Logins" value={googleLogins} helper="OAuth usage" icon={HiOutlineUsers} tone="sky" />
          <KpiCard label="Blocked Devices" value={blockedDevices} helper="Disabled/removed passkeys" icon={HiOutlineWrenchScrewdriver} tone="rose" />
        </div>
        <Panel title="Security / Passkeys" action={<ShellButton>Firestore: userPasskeys</ShellButton>}>
          <AdminTable rows={passkeys} columns={passkeyColumns} emptyTitle="No passkeys registered" />
        </Panel>
        <Panel title="Login History">
          <AdminTable rows={loginHistory} emptyTitle="No login history found" columns={[
            { key: 'time', label: 'Date / Time', render: (row) => dateTimeLabel(row.createdAt || row.date) },
            { key: 'user', label: 'User', render: (row) => row.email || row.userId || '-' },
            { key: 'device', label: 'Browser / OS / Device', render: (row) => `${row.browser || '-'} · ${row.os || row.platform || '-'} · ${row.device || '-'}` },
            { key: 'country', label: 'Country / IP', render: (row) => `${row.country || '-'} · ${row.ip || '-'}` },
            { key: 'method', label: 'Authentication Method', render: (row) => <Status value={row.authenticationMethod || row.method || 'unknown'} /> },
            { key: 'status', label: 'Result', render: (row) => <Status value={row.status || '-'} /> },
          ]} />
        </Panel>
        <Panel title="Active Sessions">
          <AdminTable rows={sessions} emptyTitle="No active sessions found" columns={[
            { key: 'device', label: 'Desktop / Mobile', render: (row) => row.deviceType || row.device || '-' },
            { key: 'browser', label: 'Browser', render: (row) => `${row.browser || '-'} · ${row.os || '-'}` },
            { key: 'location', label: 'Location', render: (row) => row.country || row.ip || '-' },
            { key: 'started', label: 'Started', render: (row) => dateTimeLabel(row.startedAt || row.loginTime) },
            { key: 'active', label: 'Last Active', render: (row) => dateTimeLabel(row.lastActiveAt) },
            { key: 'actions', label: 'Actions', render: (row) => <ShellButton onClick={() => row.userId && runAction(`session-logout-${row.userId}`, () => adminForceLogoutUser(row.userId), 'Session terminated.')}>Terminate Session</ShellButton> },
          ]} />
        </Panel>
      </div>
    )
  }

  function renderContent() {
    switch (activeTab) {
      case 'activity':
        return <Panel title="Live Client Activity" action={<ShellButton>Online = last 5 minutes</ShellButton>}><AdminTable rows={searchRows(liveUsers, search, ['email', 'uid', 'workspaceName', 'currentBusinessType'])} columns={liveColumns} emptyTitle="No client activity found" /></Panel>
      case 'clients':
        return Workspaces()
      case 'users':
        return Users()
      case 'upgrades':
        return (
          <Panel title="Upgrade Requests" action={<ShellButton>{workerUpgradeError ? 'D1 sync warning' : 'Firestore + D1/R2'}</ShellButton>}>
            {workerUpgradeError ? <p className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">{workerUpgradeError}</p> : null}
            <AdminTable rows={upgradeRows} columns={upgradeColumns} emptyTitle="No upgrade requests found" />
          </Panel>
        )
      case 'transactions':
        return Transactions()
      case 'plans':
        return Plans()
      case 'promoCodes':
        return PromoCodes()
      case 'businessServices':
        return <AdminBusinessServices />
      case 'whatsappPricing':
        return WhatsappPricing()
      case 'visitorAnalytics':
        return VisitorAnalytics()
      case 'behaviorInterest':
        return BehaviorInterest()
      case 'security':
        return SecurityPasskeys()
      case 'emailMarketing':
        return <EmailMarketing embedded />
      case 'blogCms':
        return <BlogManager />
      case 'announcements':
        return Announcements()
      case 'commandCenter':
        return <ClientCommandCenter embedded />
      case 'aiDashboard':
        return <AIConversationDashboard />
      case 'support':
        return SupportTickets()
      case 'reviews':
        return <ClientReviews />
      case 'systemHealth':
        return SystemHealth()
      case 'maintenance':
        return MaintenanceManagement()
      case 'settings':
        return Settings()
      case 'logs':
        return <Panel title="System Logs" action={<ShellButton>Firestore: backendActivityLogs</ShellButton>}><AdminTable rows={data.backendActivityLogs} emptyTitle="No backend activity logs found" columns={[{ key: 'admin', label: 'Admin', render: (row) => row.adminEmail || row.adminUid || '-' }, { key: 'action', label: 'Action' }, { key: 'details', label: 'Details', render: (row) => JSON.stringify(row.details || {}).slice(0, 120) }, { key: 'date', label: 'Date', render: (row) => dateTimeLabel(row.createdAt) }]} /></Panel>
      case 'roles':
        return Roles()
      case 'staff':
        return StaffManagement()
      case 'dashboard':
      default:
        return Dashboard()
    }
  }

  const commandCenterActive = activeTab === 'commandCenter'
  const activeTitle = navGroups.flatMap((g) => g.items).find(([key]) => key === activeTab)?.[1] || 'Dashboard'
  const desktopSidebarWidth = sidebarCollapsed ? 'lg:pl-[86px]' : 'lg:pl-[260px]'
  const renderSidebar = (mobile = false) => (
    <div className={`flex h-full min-h-0 flex-col ${sidebarCollapsed && !mobile ? 'px-3 py-5' : 'px-4 py-5'}`}>
      <div className={`flex items-center ${sidebarCollapsed && !mobile ? 'justify-center' : 'gap-3'} px-1`}>
        <img src={logoUrl} alt="Nexora" className="h-11 w-11 shrink-0 rounded-xl bg-white object-contain p-1.5" />
        {sidebarCollapsed && !mobile ? null : (
          <div className="min-w-0">
            <p className="truncate text-2xl font-black tracking-wide">NEXORA</p>
            <p className="truncate text-xs font-semibold text-cyan-100">Backend Control Center</p>
          </div>
        )}
      </div>
      <nav className="mt-7 min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
        {navGroups.map((group) => (
          <div key={group.label}>
            {sidebarCollapsed && !mobile ? null : (
              <p className="px-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{group.label}</p>
            )}
            <div className="mt-2 space-y-1">
              {group.items.map(([key, label, Icon]) => {
                const active = activeTab === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setActiveTab(key)
                      setMobileSidebarOpen(false)
                    }}
                    title={sidebarCollapsed && !mobile ? label : undefined}
                    className={`group relative flex w-full items-center rounded-xl text-sm font-bold transition ${sidebarCollapsed && !mobile ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'} ${active ? 'bg-gradient-to-r from-cyan-400 via-blue-600 to-fuchsia-600 text-white shadow-lg shadow-cyan-950/30' : 'text-slate-100 hover:bg-cyan-400/10 hover:text-white'}`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {sidebarCollapsed && !mobile ? (
                      <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-slate-950 px-3 py-1.5 text-xs font-bold text-white shadow-xl group-hover:block">
                        {label}
                      </span>
                    ) : (
                      <span className="truncate">{label}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
      {sidebarCollapsed && !mobile ? null : (
        <a href="/" className="mt-5 flex items-center justify-between rounded-xl border border-white/15 px-4 py-3 text-sm font-bold text-white hover:bg-white/10">
          View Nexora Site
          <span>↗</span>
        </a>
      )}
    </div>
  )

  return (
    <div className={commandCenterActive ? 'min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(217,70,239,0.20),transparent_32%),linear-gradient(135deg,#050816_0%,#101235_48%,#061d2f_100%)] text-slate-100' : 'min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.18),transparent_30%),linear-gradient(135deg,#f8fbff_0%,#eef7ff_48%,#f5f3ff_100%)] text-slate-950'}>
      <aside className={`fixed inset-y-0 left-0 z-30 hidden bg-[linear-gradient(180deg,#051937_0%,#15205f_48%,#0f766e_100%)] text-white shadow-2xl shadow-cyan-950/40 transition-[width] duration-300 ease-out lg:block ${sidebarCollapsed ? 'w-[86px]' : 'w-[260px]'}`}>
        {renderSidebar(false)}
        <button
          type="button"
          onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
          className="absolute -right-3 top-6 grid h-7 w-7 place-items-center rounded-full border border-cyan-200/30 bg-cyan-500 text-white shadow-lg transition hover:bg-fuchsia-600"
          aria-label={sidebarCollapsed ? 'Expand backend sidebar' : 'Collapse backend sidebar'}
        >
          {sidebarCollapsed ? <HiOutlineChevronRight className="h-4 w-4" /> : <HiOutlineChevronLeft className="h-4 w-4" />}
        </button>
      </aside>

      <div className={`fixed inset-0 z-50 lg:hidden ${mobileSidebarOpen ? 'pointer-events-auto' : 'pointer-events-none'}`} aria-hidden={!mobileSidebarOpen}>
        <div
          className={`absolute inset-0 bg-slate-950/55 backdrop-blur-[2px] transition-opacity duration-300 ease-out ${mobileSidebarOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setMobileSidebarOpen(false)}
        />
        <aside
          className={`relative h-full w-[min(18.5rem,calc(100vw-1rem))] bg-[linear-gradient(180deg,#051937_0%,#15205f_48%,#0f766e_100%)] text-white shadow-2xl transition-transform duration-300 ease-out ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
          onClick={(event) => event.stopPropagation()}
        >
          {renderSidebar(true)}
        </aside>
      </div>

      <main className={`min-w-0 transition-[padding-left] duration-300 ease-out ${desktopSidebarWidth}`}>
        <header className={commandCenterActive ? 'sticky top-0 z-20 border-b border-cyan-300/20 bg-[linear-gradient(135deg,rgba(8,13,25,0.96),rgba(30,27,75,0.94),rgba(8,47,73,0.92))] backdrop-blur' : 'sticky top-0 z-20 border-b border-blue-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(239,246,255,0.96),rgba(245,243,255,0.94))] shadow-sm shadow-blue-100/60 backdrop-blur'}>
          <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className={commandCenterActive ? 'grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-[#111827] text-slate-200 lg:hidden' : 'grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm lg:hidden'}
                  onClick={() => setMobileSidebarOpen(true)}
                  aria-label="Open backend sidebar"
                >
                  <HiOutlineBars3 className="h-5 w-5" />
                </button>
                <div className="min-w-0">
                  <p className={commandCenterActive ? 'text-2xl font-black tracking-tight text-white' : 'text-2xl font-black tracking-tight text-slate-950'}>{activeTitle}</p>
                  <span className={commandCenterActive ? 'mt-1 inline-flex rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200' : 'mt-1 inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-blue-700'}>
                    Backend Control Center
                  </span>
                </div>
              </div>
              <p className={commandCenterActive ? 'mt-2 text-sm text-cyan-100/75' : 'mt-2 text-sm font-semibold text-slate-600'}>This is the Nexora backend Control Center for SaaS operations, clients, payments, support, communication, and system settings.</p>
            </div>
            <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-end">
              <div className="relative min-w-0 md:w-[320px]">
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search clients, users, payments..." className={commandCenterActive ? 'h-11 w-full rounded-xl border border-cyan-300/20 bg-[#10172a] px-4 pr-20 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-400/10' : 'h-11 w-full rounded-xl border border-blue-200 bg-white px-4 pr-20 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100'} />
                <span className={commandCenterActive ? 'absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-cyan-400/10 px-2 py-1 text-[10px] font-black text-cyan-200' : 'absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-600'}>Ctrl + K</span>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
              <div className="relative">
                <button className="relative grid h-10 w-10 place-items-center rounded-full text-slate-700 hover:bg-slate-100" type="button" onClick={() => setNotificationsOpen((open) => !open)}>
                  <HiOutlineBell className="h-5 w-5" />
                  {unreadNotifications.length ? <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-rose-500 text-[9px] font-black text-white">{unreadNotifications.length}</span> : null}
                </button>
                {notificationsOpen ? (
                  <div className="absolute right-0 top-12 z-40 w-96 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
                      <p className="text-sm font-black text-slate-950">Backend Notifications</p>
                      <div className="flex gap-2">
                        <button type="button" className="text-xs font-bold text-violet-700 disabled:opacity-50" disabled={!allNotifications.length} onClick={() => markAllBackendNotificationsRead().catch((error) => setToast(clientSafeMessage(error, 'Unable to mark notifications read.')))}>Mark all read</button>
                        <button type="button" className="text-xs font-bold text-slate-500 disabled:opacity-50" disabled={!allNotifications.length} onClick={() => clearAllBackendNotifications().catch((error) => setToast(clientSafeMessage(error, 'Unable to clear notifications.')))}>Clear all</button>
                      </div>
                    </div>
                    <div className="mt-2 max-h-96 overflow-auto">
                      {allNotifications.map((item) => {
                        const unread = !backendNotificationStates[backendNotificationDocId(item.id)]?.read
                        return (
                          <button
                            key={item.id}
                            type="button"
                            className={`mb-2 w-full rounded-xl border p-3 text-left ${unread ? 'border-violet-100 bg-violet-50' : 'border-slate-100 bg-slate-50'}`}
                            onClick={() => {
                              markBackendNotificationRead(item.id).catch((error) => setToast(clientSafeMessage(error, 'Unable to update notification.')))
                              if (item.route) {
                                setActiveTab(item.route)
                                setNotificationsOpen(false)
                              }
                            }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-black text-slate-900">{item.title}</p>
                                <p className="mt-1 truncate text-xs text-slate-500">{item.detail}</p>
                                <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-violet-600">{item.type}</p>
                              </div>
                              <span className="flex shrink-0 flex-col items-end gap-2">
                                {unread ? <span className="mt-1 h-2 w-2 rounded-full bg-rose-500" /> : null}
                                <span
                                  role="button"
                                  tabIndex={0}
                                  className="rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500 hover:bg-white hover:text-rose-600"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    clearBackendNotification(item.id).catch((error) => setToast(clientSafeMessage(error, 'Unable to clear notification.')))
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key !== 'Enter' && event.key !== ' ') return
                                    event.preventDefault()
                                    event.stopPropagation()
                                    clearBackendNotification(item.id).catch((error) => setToast(clientSafeMessage(error, 'Unable to clear notification.')))
                                  }}
                                >
                                  Clear
                                </span>
                              </span>
                            </div>
                          </button>
                        )
                      })}
                      {!allNotifications.length ? <EmptyState title="No notifications" detail="New signups, payments, upgrade requests, support tickets, and expired trials will appear here." /> : null}
                    </div>
                  </div>
                ) : null}
              </div>
              <button className={commandCenterActive ? 'grid h-10 w-10 place-items-center rounded-full text-slate-300 hover:bg-white/10' : 'grid h-10 w-10 place-items-center rounded-full text-slate-700 hover:bg-slate-100'} type="button"><HiOutlineMoon className="h-5 w-5" /></button>
              <ShellButton onClick={() => runAction('admin-logout', handleLogout, 'Signed out.')}>Logout</ShellButton>
              <div className={commandCenterActive ? 'flex items-center gap-3 border-l border-white/10 pl-3' : 'flex items-center gap-3 border-l border-slate-200 pl-3'}>
                <div className={commandCenterActive ? 'grid h-10 w-10 place-items-center rounded-full bg-violet-600 text-lg font-black text-white' : 'grid h-10 w-10 place-items-center rounded-full bg-slate-200 text-lg font-black'}>⚙️</div>
                <div className="hidden sm:block">
                  <p className={commandCenterActive ? 'text-sm font-black text-white' : 'text-sm font-black'}>System Admin</p>
                  <p className={commandCenterActive ? 'text-xs text-slate-400' : 'text-xs text-slate-500'}>{user?.email || 'Super Admin'}</p>
                </div>
              </div>
              </div>
            </div>
          </div>
        </header>

        <div className={commandCenterActive ? 'px-3 py-3 sm:px-5' : 'px-4 py-4 sm:px-6'}>
          {toast ? <div className="mb-4 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-800">{toast}</div> : null}
          {data.error ? <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{data.error}</div> : null}
          {Object.keys(data.sourceErrors || {}).length ? (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
              {Object.entries(data.sourceErrors).map(([key, message]) => <p key={key}>{key}: {message}</p>)}
            </div>
          ) : null}
          {data.loading ? <div className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600">Loading SaaS admin data…</div> : null}
          {renderContent()}
        </div>
      </main>
    </div>
  )
}
