import { Component, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  HiOutlineBell,
  HiOutlineBuildingOffice2,
  HiOutlineChartBarSquare,
  HiOutlineCheckBadge,
  HiOutlineCog6Tooth,
  HiOutlineCreditCard,
  HiOutlineCurrencyDollar,
  HiOutlineEnvelope,
  HiOutlineHome,
  HiOutlineLifebuoy,
  HiOutlineMegaphone,
  HiOutlineMoon,
  HiOutlineShieldCheck,
  HiOutlineUserGroup,
  HiOutlineUsers,
} from 'react-icons/hi2'
import {
  collection,
  doc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { signOut } from 'firebase/auth'
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
import { auth, firestoreDb as db } from '../../lib/firebase.js'
import useAuth from '../../context/useAuth.js'
import { clientSafeMessage } from '../../lib/errorHandler.js'
import { isBackendAdminEmail } from '../../lib/roles.js'
import logoUrl from '../../assets/logo/nexora-logo.svg'
import {
  DEFAULT_SAAS_CURRENCY,
  PLATFORM_PLAN_COLLECTION,
  defaultPlatformSettings as defaultSaasPlatformSettings,
  mergePlatformPlans,
  planPriceLabel,
} from '../../lib/platformPlans.js'
import {
  createPasswordResetLink,
  passwordResetEmail,
  sendWorkerEmail,
  trialExpiryReminderEmail,
  upgradeApprovedEmail,
  upgradeRejectedEmail,
} from '../../lib/transactionalEmail.js'
import { buildApprovedSubscriptionPayload } from '../../lib/subscriptionApproval.js'

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

const modules = ['General CRM', 'School ERP', 'Retail / POS', 'Property ERP', 'Restaurant POS', 'WhatsApp CRM']
const planNames = ['Basic', 'Standard', 'Enterprise']
const adminRoles = ['Super Admin', 'Admin', 'Support', 'Billing Manager', 'Read Only']
const moduleColors = ['#7c3aed', '#3b82f6', '#f59e0b', '#ef4444', '#14b8a6', '#0ea5e9']
const defaultPlatformSettings = {
  ...defaultSaasPlatformSettings,
  systemName: 'Nexora Solutions',
  defaultCurrency: DEFAULT_SAAS_CURRENCY,
  trialDays: 7,
  supportEmail: 'support@nexorasolution.online',
  maintenanceMode: false,
  emailSenderName: 'Nexora Solutions',
  emailReplyTo: 'support@nexorasolution.online',
  featureFlags: {
    announcements: true,
    supportTickets: true,
    planUpgrades: true,
    maintenanceBanner: false,
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
      ['moduleAccess', 'Module Access', HiOutlineShieldCheck],
      ['visitorAnalytics', 'Visitor Analytics', HiOutlineChartBarSquare],
    ],
  },
  {
    label: 'Communication',
    items: [
      ['announcements', 'Announcements', HiOutlineMegaphone],
      ['support', 'Support Tickets', HiOutlineLifebuoy],
    ],
  },
  {
    label: 'System',
    items: [
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

function rowCurrency(row = {}) {
  return row.currency || row.billingCurrency || DEFAULT_SAAS_CURRENCY
}

function proofUrl(row = {}) {
  return row.paymentProof || row.proofUrl || row.screenshotUrl || row.paymentProofUrl || ''
}

function statusValue(value, fallback = 'unknown') {
  return String(value || fallback).trim().toLowerCase().replace(/\s+/g, '_')
}

function workspaceBusinessType(row = {}) {
  return row.primaryBusinessType || row.selectedBusinessType || row.currentBusinessType || row.businessType || row.module || 'General CRM'
}

function normalizeAdminBusinessType(type) {
  const value = String(type || '').trim().toLowerCase()
  return modules.find((module) => module.toLowerCase() === value) || modules.find((module) => value && module.toLowerCase().includes(value)) || 'General CRM'
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
  return ['paid', 'approved', 'active', 'completed'].includes(statusValue(row.paymentStatus || row.approvalStatus || row.status || row.planStatus))
}

function isTrial(row = {}) {
  return row.isTrialActive === true || ['trial', 'free_trial'].includes(statusValue(row.subscriptionStatus || row.planStatus))
}

function isExpired(row = {}) {
  const status = statusValue(row.subscriptionStatus || row.planStatus || row.status)
  const trialEndsAt = toDate(row.trialEndsAt)
  const expiresAt = toDate(row.subscriptionExpiresAt || row.expiresAt)
  return ['expired', 'cancelled', 'canceled', 'inactive'].includes(status) || (trialEndsAt && trialEndsAt < new Date()) || (expiresAt && expiresAt < new Date())
}

function daysLeft(value) {
  const date = toDate(value)
  if (!date) return '-'
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86400000))
}

function isOnline(row = {}) {
  const lastActive = toDate(row.lastActiveAt)
  return Boolean(lastActive && Date.now() - lastActive.getTime() <= 5 * 60 * 1000)
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

function useControlCentreData() {
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
    backendStaff: [],
    clientSessions: [],
    userPresence: [],
    platformSettings: [],
    analyticsEvents: [],
    userSessions: [],
    loading: Boolean(db),
    error: '',
    sourceErrors: {},
  })

  useEffect(() => {
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
      backendStaff: [],
      clientSessions: [],
      userPresence: [],
      platformSettings: [],
      analyticsEvents: [],
      userSessions: [],
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
    const listen = (key, collectionName, rowLimit = 300) => {
      try {
        return onSnapshot(
          query(collection(db, collectionName), limit(rowLimit)),
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
      listen('users', 'users', 500),
      listen('workspaces', 'workspaces', 500),
      listen('upgradeRequests', 'upgradeRequests', 300),
      listen('subscriptions', 'subscriptions', 300),
      listen('platformPayments', 'platformPayments', 500),
      listen('backendActivityLogs', 'backendActivityLogs', 500),
      listen('announcements', 'announcements', 200),
      listen('supportTickets', 'supportTickets', 200),
      listen('plans', PLATFORM_PLAN_COLLECTION, 50),
      listen('backendStaff', 'backendStaff', 100),
      listen('clientSessions', 'clientSessions', 300),
      listen('userPresence', 'userPresence', 300),
      listen('platformSettings', 'platformSettings', 20),
      listen('analyticsEvents', 'analyticsEvents', 1000),
      listen('userSessions', 'userSessions', 500),
    ]

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe?.())
  }, [])

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
  const tone = ['active', 'paid', 'approved', 'healthy', 'online', 'verified'].includes(status)
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
    : ['trial', 'pending', 'pending_approval'].includes(status)
      ? 'bg-amber-50 text-amber-700 ring-amber-100'
      : ['blocked', 'disabled', 'expired', 'rejected', 'offline'].includes(status)
        ? 'bg-rose-50 text-rose-700 ring-rose-100'
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

function AdminTable({ columns, rows, emptyTitle, maxHeight = 'max-h-[30rem]' }) {
  if (!rows.length) return <EmptyState title={emptyTitle} />
  return (
    <div className={`overflow-auto ${maxHeight}`}>
      <table className="min-w-full text-left text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
          <tr>{columns.map((column) => <th key={column.key} className="whitespace-nowrap px-4 py-3">{column.label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.path || row.id} className="align-top hover:bg-slate-50/80">
              {columns.map((column) => <td key={column.key} className="px-4 py-3 text-slate-700">{column.render ? column.render(row) : row[column.key] || '-'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function useSearch(rows, queryText, fields) {
  return useMemo(() => {
    const q = queryText.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) => fields.some((field) => String(row[field] || '').toLowerCase().includes(q)))
  }, [fields, queryText, rows])
}

function mergePresence(users, clientSessions, userPresence) {
  const sessionByUid = new Map([...clientSessions, ...userPresence].map((row) => [row.uid || row.userId || row.id, row]))
  return users.map((user) => ({ ...user, ...(sessionByUid.get(user.uid || user.id) || {}) }))
}

export default function ControlCentre() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const data = useControlCentreData()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState('')
  const [toast, setToast] = useState('')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [readNotifications, setReadNotifications] = useState(() => new Set())
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
  const [ticketDraft, setTicketDraft] = useState({ title: '', clientEmail: '', category: 'Technical Support', priority: 'medium' })
  const [transactionStatusFilter, setTransactionStatusFilter] = useState('all')
  const [transactionPlanFilter, setTransactionPlanFilter] = useState('all')
  const [transactionMethodFilter, setTransactionMethodFilter] = useState('all')
  const [transactionDateFrom, setTransactionDateFrom] = useState('')
  const [transactionDateTo, setTransactionDateTo] = useState('')
  const [workspaceStatusFilter, setWorkspaceStatusFilter] = useState('all')
  const [workspacePlanFilter, setWorkspacePlanFilter] = useState('all')
  const [userFilter, setUserFilter] = useState('all')
  const [settingsDraft, setSettingsDraft] = useState(defaultPlatformSettings)
  const backendAdminAllowed = isBackendAdminEmail(user?.email)

  const liveUsers = useMemo(() => mergePresence(data.users, data.clientSessions, data.userPresence), [data.users, data.clientSessions, data.userPresence])
  const onlineUsers = useMemo(() => liveUsers.filter(isOnline), [liveUsers])
  const platformPlans = useMemo(() => mergePlatformPlans(data.plans), [data.plans])
  const platformSettings = useMemo(() => ({ ...defaultPlatformSettings, ...(data.platformSettings[0] || {}) }), [data.platformSettings])
  const workspacesById = useMemo(() => {
    const map = new Map()
    data.workspaces.forEach((workspace) => {
      map.set(workspace.workspaceId || workspace.id, workspace)
      if (workspace.ownerId) map.set(workspace.ownerId, workspace)
      if (workspace.userId) map.set(workspace.userId, workspace)
    })
    return map
  }, [data.workspaces])

  useEffect(() => {
    setSettingsDraft(platformSettings)
  }, [platformSettings])

  const payments = data.platformPayments
  const stats = useMemo(() => {
    const now = new Date()
    const paidPayments = payments.filter(isPaid)
    const approvedUpgrades = data.upgradeRequests.filter(isPaid)
    const revenueRows = [...paidPayments, ...approvedUpgrades]
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
      pendingUpgrades: data.upgradeRequests.filter((row) => statusValue(row.approvalStatus || row.status) === 'pending').length,
      monthlyRevenue,
      totalRevenue: revenueRows.reduce((sum, row) => sum + amountValue(row), 0),
    }
  }, [data.upgradeRequests, data.users, data.workspaces, onlineUsers.length, payments])

  const allNotifications = useMemo(() => {
    const signupItems = [...data.workspaces]
      .sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0))
      .slice(0, 5)
      .map((row) => ({
        id: `signup-${row.id}`,
        type: 'new signup',
        title: 'New client signup',
        detail: `${workspaceName(row)} · ${userEmail(row) || row.id}`,
        createdAt: row.createdAt,
      }))
    const upgradeItems = data.upgradeRequests
      .filter((row) => statusValue(row.approvalStatus || row.status) === 'pending')
      .slice(0, 5)
      .map((row) => ({
        id: `upgrade-${row.id}`,
        type: 'upgrade request',
        title: 'Upgrade request pending',
        detail: `${row.clientEmail || row.email || row.workspaceId || 'Client'} · ${row.requestedPlan || row.plan || 'Plan'}`,
        createdAt: row.createdAt,
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
      }))
    return [...signupItems, ...upgradeItems, ...paymentItems, ...ticketItems, ...expiredItems]
      .sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0))
      .slice(0, 20)
  }, [data.supportTickets, data.upgradeRequests, data.workspaces, payments])

  const unreadNotifications = allNotifications.filter((item) => !readNotifications.has(item.id))
  const analyticsStats = useMemo(() => {
    const today = new Date().toDateString()
    const events = data.analyticsEvents
    const visitors = new Set(events.map((row) => row.visitorId).filter(Boolean))
    const activeSessions = data.userSessions.filter((row) => {
      const lastActive = toDate(row.lastActiveAt)
      return lastActive && Date.now() - lastActive.getTime() <= 5 * 60 * 1000
    })
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
      activeSessions: activeSessions.length,
      mostClickedModule,
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
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }))
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

  const workspaceRows = useSearch(
    data.workspaces
      .filter((row) => workspaceStatusFilter === 'all' || statusValue(row.status || row.subscriptionStatus || row.planStatus) === workspaceStatusFilter || (workspaceStatusFilter === 'expired' && isExpired(row)) || (workspaceStatusFilter === 'trial' && isTrial(row)))
      .filter((row) => workspacePlanFilter === 'all' || statusValue(row.plan || row.selectedPlan) === statusValue(workspacePlanFilter)),
    search,
    ['id', 'uid', 'email', 'ownerEmail', 'companyName', 'workspaceName', 'businessName', 'selectedBusinessType', 'businessType'],
  )
  const userRows = useSearch(
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
  const upgradeRows = useSearch(data.upgradeRequests, search, ['id', 'email', 'clientEmail', 'workspaceName', 'requestedPlan', 'transactionId', 'paymentMethod', 'status'])
  const paymentRows = useSearch(
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

  async function runAction(id, action, success = 'Action completed.') {
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

  async function handleLogout() {
    await signOut(auth)
    navigate('/admin/login', { replace: true })
  }

  async function saveSettings() {
    const payload = {
      ...settingsDraft,
      trialDays: Number(settingsDraft.trialDays || 7),
      updatedAt: serverTimestamp(),
      updatedBy: user?.uid || '',
      updatedByEmail: user?.email || '',
    }
    await setDoc(doc(db, 'platformSettings', 'main'), payload, { merge: true })
    await logActivity('platform_settings_saved', { defaultCurrency: payload.defaultCurrency, trialDays: payload.trialDays, maintenanceMode: payload.maintenanceMode })
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
    await updateDoc(doc(db, 'workspaces', workspaceId), { ...update, updatedAt: serverTimestamp(), updatedBy: user?.uid || '' })
    await logActivity(action, { workspaceId, email: userEmail(row), update })
  }

  async function updateWorkspaceModuleAccess(row, patch, action = 'module_access_updated') {
    const workspaceId = row.workspaceId || row.id
    const ownerId = row.ownerId || row.userId || row.uid
    const payload = {
      ...patch,
      updatedAt: serverTimestamp(),
      updatedBy: user?.uid || '',
      updatedByEmail: user?.email || '',
    }
    await setDoc(doc(db, 'workspaces', workspaceId), payload, { merge: true })
    if (ownerId) {
      await setDoc(doc(db, 'users', ownerId), payload, { merge: true })
    }
    await logActivity(action, { workspaceId, ownerId, email: userEmail(row), patch })
  }

  async function updateUser(row, update, action) {
    const uid = row.uid || row.userId || row.id
    await updateDoc(doc(db, 'users', uid), { ...update, updatedAt: serverTimestamp(), updatedBy: user?.uid || '' })
    await logActivity(action, { uid, email: userEmail(row), update })
  }

  async function approveUpgrade(row) {
    if (!backendAdminAllowed) throw new Error('Backend admin access required.')
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
    console.log('[Subscription Approval] request update', { path: `upgradeRequests/${row.id}`, requestUpdate })
    await updateDoc(row.ref || doc(db, 'upgradeRequests', row.id), requestUpdate)
    console.log('[Subscription Approval] user update', { path: `users/${ownerId}`, subscriptionPayload })
    await setDoc(doc(db, 'users', ownerId), subscriptionPayload, { merge: true })
    console.log('[Subscription Approval] workspace update', { path: `workspaces/${workspaceId}`, subscriptionPayload })
    await setDoc(doc(db, 'workspaces', workspaceId), subscriptionPayload, { merge: true })
    await setDoc(doc(db, 'platformPayments', row.id), {
      clientEmail: row.clientEmail || row.email || row.ownerEmail || '',
      workspaceId: workspaceId || '',
      workspaceName: row.workspaceName || row.companyName || '',
      plan,
      amount: amountValue(row),
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
      source: 'upgradeRequests',
      sourceId: row.id,
      subscriptionExpiresAt: subscriptionPayload.subscriptionExpiresAt,
      nextBillingDate: subscriptionPayload.nextBillingDate,
      updatedAt: subscriptionPayload.updatedAt,
    }, { merge: true })
    await setDoc(doc(db, 'platformSubscriptions', workspaceId || row.id), {
      clientEmail: row.clientEmail || row.email || row.ownerEmail || '',
      workspaceId: workspaceId || '',
      workspaceName: row.workspaceName || row.companyName || '',
      ...subscriptionPayload,
      currency,
      status: 'active',
      subscriptionStatus: 'active',
      paymentStatus: 'paid',
      source: 'upgradeRequests',
      sourceId: row.id,
    }, { merge: true })
    const email = userEmail(row)
    if (email) {
      const template = upgradeApprovedEmail({ name: row.senderName || row.ownerName || row.displayName || 'there', plan })
      const sent = await sendWorkerEmail({ to: email, ...template })
      if (!sent.ok) throw new Error(sent.error)
    }
    await logActivity('upgrade_approved', { workspaceId, upgradeRequestId: row.id, plan })
  }

  async function rejectUpgrade(row) {
    if (!backendAdminAllowed) throw new Error('Backend admin access required.')
    const adminEmail = user?.email || ''
    const now = serverTimestamp()
    await updateDoc(row.ref || doc(db, 'upgradeRequests', row.id), {
      status: 'rejected',
      approvalStatus: 'rejected',
      paymentStatus: 'rejected',
      rejectedBy: adminEmail,
      rejectedByEmail: adminEmail,
      rejectionReason: row.rejectionReason || row.reason || '',
      rejectedAt: now,
      updatedAt: now,
    })
    const email = userEmail(row)
    if (email) {
      const template = upgradeRejectedEmail({ name: row.senderName || row.ownerName || row.displayName || 'there', reason: row.rejectionReason || row.reason || '' })
      const sent = await sendWorkerEmail({ to: email, ...template })
      if (!sent.ok) throw new Error(sent.error)
    }
    await logActivity('upgrade_rejected', { upgradeRequestId: row.id, workspaceId: row.workspaceId || '' })
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
        approvalStatus: update.approvalStatus || row.approvalStatus || update.status || 'pending',
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
      console.log('[Subscription Approval] user update', { path: `users/${ownerId}`, subscriptionPayload })
      await setDoc(doc(db, 'users', ownerId), subscriptionPayload, { merge: true })
      console.log('[Subscription Approval] workspace update', { path: `workspaces/${workspaceId}`, subscriptionPayload })
      await setDoc(doc(db, 'workspaces', workspaceId), subscriptionPayload, { merge: true })
    }
    await logActivity(action, { transactionId: row.transactionId || row.id, workspaceId: row.workspaceId || '', update })
  }

  const workspaceColumns = [
    { key: 'workspaceId', label: 'Workspace ID', render: (row) => <span className="font-mono text-xs">{row.workspaceId || row.id}</span> },
    { key: 'workspace', label: 'Workspace Name', render: (row) => <div><p className="font-black text-slate-900">{workspaceName(row)}</p><p className="text-xs text-slate-500">{row.ownerId || row.userId || row.uid || row.id}</p></div> },
    { key: 'email', label: 'Client Email', render: (row) => userEmail(row) || '-' },
    { key: 'module', label: 'Business Type', render: (row) => workspaceBusinessType(row) },
    { key: 'plan', label: 'Plan', render: (row) => row.plan || row.selectedPlan || 'Basic' },
    { key: 'status', label: 'Status', render: (row) => <Status value={row.status || row.subscriptionStatus || row.planStatus || (isTrial(row) ? 'trial' : 'active')} /> },
    { key: 'trialEndsAt', label: 'Trial Ends', render: (row) => dateLabel(row.trialEndsAt || row.subscriptionExpiresAt) },
    { key: 'lastActiveAt', label: 'Last Active', render: (row) => dateTimeLabel(row.lastActiveAt || row.lastAccessedAt || workspacesById.get(row.ownerId || row.userId || row.id)?.lastActiveAt) },
    { key: 'createdAt', label: 'Created', render: (row) => dateLabel(row.createdAt) },
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
          <ShellButton onClick={() => runAction(`paid-${row.id}`, () => updateWorkspace(row, { planStatus: 'active', subscriptionStatus: 'active', paymentStatus: 'paid', paidAt: serverTimestamp() }, 'client_marked_paid'))}>Mark Paid</ShellButton>
          <ShellButton onClick={() => navigator.clipboard?.writeText(row.workspaceId || row.id)}>Copy Workspace ID</ShellButton>
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
    { key: 'businessType', label: 'Module', render: (row) => row.currentBusinessType || row.selectedBusinessType || row.businessType || '-' },
    { key: 'login', label: 'Login Time', render: (row) => dateTimeLabel(row.lastLoginAt || row.loginAt) },
    { key: 'active', label: 'Last Active', render: (row) => dateTimeLabel(row.lastActiveAt) },
    { key: 'device', label: 'Device / Browser', render: (row) => row.device || row.browser || row.userAgent || '-' },
  ]

  const upgradeColumns = [
    { key: 'client', label: 'Client', render: (row) => <div><p className="font-black text-slate-900">{row.clientEmail || row.email || row.ownerEmail || '-'}</p><p className="text-xs text-slate-500">{row.workspaceName || row.companyName || row.workspaceId || '-'}</p></div> },
    { key: 'plan', label: 'Plan', render: (row) => row.requestedPlan || row.plan || '-' },
    { key: 'amount', label: 'Amount', render: (row) => money(amountValue(row), rowCurrency(row)) },
    { key: 'transactionId', label: 'Transaction ID', render: (row) => row.transactionId || row.txnId || '-' },
    { key: 'senderName', label: 'Sender Name', render: (row) => row.senderName || '-' },
    { key: 'senderNumber', label: 'Sender Number', render: (row) => row.senderNumber || row.userPhone || row.phone || '-' },
    { key: 'method', label: 'Payment Method', render: (row) => row.paymentMethod || row.method || '-' },
    { key: 'proof', label: 'Screenshot', render: (row) => proofUrl(row) ? <a className="font-bold text-violet-700" href={proofUrl(row)} target="_blank" rel="noreferrer">View Screenshot</a> : 'No Screenshot Uploaded' },
    { key: 'date', label: 'Date', render: (row) => dateTimeLabel(row.paymentDate || row.createdAt) },
    { key: 'status', label: 'Status', render: (row) => <Status value={row.approvalStatus || row.status || 'pending'} /> },
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
    { key: 'amount', label: 'Amount', render: (row) => money(amountValue(row), rowCurrency(row)) },
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
                    <p className="text-xs text-slate-500">{row.currentBusinessType || row.businessType || '-'} · {dateTimeLabel(row.lastActiveAt)}</p>
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
            <AdminTable rows={data.upgradeRequests.filter((row) => statusValue(row.approvalStatus || row.status) === 'pending').slice(0, 6)} columns={upgradeColumns.slice(0, 7)} emptyTitle="No pending upgrade requests" maxHeight="max-h-[18rem]" />
          </Panel>
          <Panel title="System Health">
            {['Firestore SaaS Collections', 'Firebase Auth', 'Password Reset Email', 'Presence Tracking'].map((item) => (
              <div key={item} className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0">
                <span className="text-sm font-semibold text-slate-700">{item}</span>
                <Status value={data.error ? 'Warning' : 'Healthy'} />
              </div>
            ))}
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

  function ModuleAccess() {
    const rows = useSearch(data.workspaces, search, ['id', 'workspaceId', 'ownerEmail', 'email', 'workspaceName', 'companyName', 'businessType', 'selectedBusinessType', 'primaryBusinessType'])
    const columns = [
      { key: 'client', label: 'Client', render: (row) => <div><p className="font-black text-slate-900">{userEmail(row) || '-'}</p><p className="text-xs text-slate-500">{row.ownerId || row.userId || row.uid || '-'}</p></div> },
      { key: 'workspace', label: 'Workspace', render: (row) => <div><p className="font-black text-slate-900">{workspaceName(row)}</p><p className="text-xs text-slate-500">{row.workspaceId || row.id}</p></div> },
      { key: 'primary', label: 'Primary Module', render: (row) => moduleAccessForWorkspace(row).primary },
      { key: 'plan', label: 'Plan', render: (row) => row.plan || row.selectedPlan || 'Basic' },
      { key: 'status', label: 'Status', render: (row) => <Status value={row.status || row.subscriptionStatus || row.planStatus || 'active'} /> },
      {
        key: 'allowed',
        label: 'Allowed Modules',
        render: (row) => {
          const access = moduleAccessForWorkspace(row)
          return (
            <div className="min-w-[28rem]">
              <div className="grid gap-2 md:grid-cols-2">
                {modules.map((module) => {
                  const id = `module-access-${row.id}-${module.replace(/[^a-z0-9]+/gi, '-')}`
                  const isPrimary = module === access.primary
                  return (
                    <label key={module} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${isPrimary ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                      <input id={id} type="checkbox" defaultChecked={access.allowed.includes(module)} disabled={isPrimary} />
                      <span>{module}{isPrimary ? ' · primary' : ''}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )
        },
      },
      { key: 'special', label: 'Special Access', render: (row) => <Status value={moduleAccessForWorkspace(row).all ? 'all modules' : moduleAccessForWorkspace(row).special ? 'enabled' : 'primary only'} /> },
      {
        key: 'actions',
        label: 'Actions',
        render: (row) => {
          const access = moduleAccessForWorkspace(row)
          const readSelected = () => modules.filter((module) => {
            if (module === access.primary) return true
            const id = `module-access-${row.id}-${module.replace(/[^a-z0-9]+/gi, '-')}`
            return document.getElementById(id)?.checked === true
          })
          return (
            <div className="flex min-w-[18rem] flex-wrap gap-2">
              <ShellButton onClick={() => {
                const allowedBusinessTypes = readSelected()
                runAction(`module-save-${row.id}`, () => updateWorkspaceModuleAccess(row, {
                  primaryBusinessType: access.primary,
                  allowedBusinessTypes,
                  specialModuleAccess: allowedBusinessTypes.length > 1,
                  allModulesAccess: allowedBusinessTypes.length === modules.length,
                }), 'Module access saved.')
              }}>Save</ShellButton>
              <ShellButton onClick={() => runAction(`module-all-${row.id}`, () => updateWorkspaceModuleAccess(row, {
                primaryBusinessType: access.primary,
                allowedBusinessTypes: modules,
                specialModuleAccess: true,
                allModulesAccess: true,
              }, 'module_access_all_enabled'), 'All modules enabled.')}>Enable All</ShellButton>
              <ShellButton onClick={() => runAction(`module-reset-${row.id}`, () => updateWorkspaceModuleAccess(row, {
                primaryBusinessType: access.primary,
                allowedBusinessTypes: [access.primary],
                specialModuleAccess: false,
                allModulesAccess: false,
              }, 'module_access_reset_primary'), 'Reset to primary module only.')}>Reset</ShellButton>
            </div>
          )
        },
      },
    ]
    return (
      <Panel title="Module Access / Special Access" action={<ShellButton>Workspaces: special module grants</ShellButton>}>
        <p className="mb-4 text-sm font-semibold leading-6 text-slate-600">
          Normal clients keep one primary module. Use this panel to grant extra modules without changing workspace isolation or deleting existing data.
        </p>
        <AdminTable rows={rows} columns={columns} emptyTitle="No workspaces found" />
      </Panel>
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
            {modules.map((module) => <option key={module}>{module}</option>)}
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
                <ShellButton onClick={() => runAction(`announcement-publish-${row.id}`, () => updateDoc(row.ref || doc(db, 'announcements', row.id), { status: 'published', publishedAt: serverTimestamp(), updatedAt: serverTimestamp() }), 'Announcement published.')}>Publish</ShellButton>
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
    const ticketRows = useSearch(data.supportTickets, search, ['title', 'subject', 'clientEmail', 'email', 'workspaceName', 'category', 'status', 'priority'])
    return (
      <Panel title="Futuristic Support Ticket Centre" action={<ShellButton>Firestore: supportTickets</ShellButton>}>
        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_1fr_14rem_12rem_auto]">
          <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Ticket title" value={ticketDraft.title} onChange={(event) => setTicketDraft((current) => ({ ...current, title: event.target.value }))} />
          <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Client email" value={ticketDraft.clientEmail} onChange={(event) => setTicketDraft((current) => ({ ...current, clientEmail: event.target.value }))} />
          <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" value={ticketDraft.category} onChange={(event) => setTicketDraft((current) => ({ ...current, category: event.target.value }))}>
            {['Billing', 'Login', 'Workspace', 'CRM Bug', 'Feature Request', 'Technical Support'].map((category) => <option key={category}>{category}</option>)}
          </select>
          <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" value={ticketDraft.priority} onChange={(event) => setTicketDraft((current) => ({ ...current, priority: event.target.value }))}>
            {['low', 'medium', 'high', 'urgent'].map((priority) => <option key={priority}>{priority}</option>)}
          </select>
          <ShellButton onClick={() => {
            const id = `${Date.now()}`
            runAction(`ticket-create-${id}`, async () => {
              await setDoc(doc(db, 'supportTickets', id), { ...ticketDraft, status: 'open', conversation: [], internalNotes: '', createdAt: serverTimestamp(), createdBy: user?.uid || '', createdByEmail: user?.email || '' })
              await logActivity('support_ticket_created', ticketDraft)
              setTicketDraft({ title: '', clientEmail: '', category: 'Technical Support', priority: 'medium' })
            }, 'Support ticket created.')
          }}>Create</ShellButton>
        </div>
        <AdminTable rows={ticketRows} emptyTitle="No support tickets found" columns={[
          { key: 'ticket', label: 'Ticket', render: (row) => <div><p className="font-black text-slate-900">{row.title || row.subject || row.id}</p><p className="text-xs text-slate-500">{row.category || 'Technical Support'} · SLA {statusValue(row.priority) === 'urgent' ? '2h' : statusValue(row.priority) === 'high' ? '8h' : '24h'}</p></div> },
          { key: 'client', label: 'Client', render: (row) => <div><p>{row.clientEmail || row.email || '-'}</p><p className="text-xs text-slate-500">{row.workspaceName || row.workspaceId || '-'}</p></div> },
          { key: 'priority', label: 'Priority', render: (row) => <Status value={row.priority || 'medium'} /> },
          { key: 'status', label: 'Status', render: (row) => <Status value={row.status || 'open'} /> },
          { key: 'assigned', label: 'Assigned Staff', render: (row) => row.assignedStaff || row.assignedTo || 'Unassigned' },
          { key: 'lastReply', label: 'Last Reply', render: (row) => dateTimeLabel(row.lastReplyAt || row.updatedAt || row.createdAt) },
          { key: 'notes', label: 'Internal Notes', render: (row) => row.internalNotes || '-' },
          {
            key: 'conversation',
            label: 'Timeline / Reply',
            render: (row) => (
              <div className="min-w-[22rem] space-y-2">
                <div className="max-h-24 overflow-auto rounded-xl bg-slate-50 p-2 text-xs">
                  {(row.conversation || []).slice(-3).map((item, index) => <p key={`${row.id}-${index}`}>{item.author || 'Support'}: {item.message}</p>)}
                  {!(row.conversation || []).length ? <p>No conversation yet.</p> : null}
                </div>
                <div className="flex gap-2">
                  <input id={`reply-${row.id}`} className="w-44 rounded-xl border border-slate-200 px-3 py-2 text-xs" placeholder="Reply..." />
                  <ShellButton onClick={() => {
                    const input = document.getElementById(`reply-${row.id}`)
                    const message = input?.value?.trim()
                    if (!message) return
                    const conversation = [...(row.conversation || []), { author: user?.email || 'Admin', message, createdAt: new Date().toISOString() }]
                    runAction(`ticket-reply-${row.id}`, () => updateDoc(row.ref || doc(db, 'supportTickets', row.id), { conversation, lastReplyAt: serverTimestamp(), updatedAt: serverTimestamp() }), 'Reply saved.')
                    input.value = ''
                  }}>Reply</ShellButton>
                </div>
                <p className="text-xs text-slate-400">Attachments placeholder ready</p>
              </div>
            ),
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <div className="flex flex-wrap gap-2">
                <ShellButton onClick={() => runAction(`ticket-resolve-${row.id}`, () => updateDoc(row.ref || doc(db, 'supportTickets', row.id), { status: 'resolved', resolvedAt: serverTimestamp(), updatedAt: serverTimestamp() }), 'Ticket resolved.')}>Resolve</ShellButton>
                <ShellButton onClick={() => runAction(`ticket-reopen-${row.id}`, () => updateDoc(row.ref || doc(db, 'supportTickets', row.id), { status: 'open', reopenedAt: serverTimestamp(), updatedAt: serverTimestamp() }), 'Ticket reopened.')}>Reopen</ShellButton>
                <ShellButton onClick={() => runAction(`ticket-close-${row.id}`, () => updateDoc(row.ref || doc(db, 'supportTickets', row.id), { status: 'closed', closedAt: serverTimestamp(), updatedAt: serverTimestamp() }), 'Ticket closed.')}>Close</ShellButton>
              </div>
            ),
          },
        ]} />
      </Panel>
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
              <input type="checkbox" checked={Boolean(settingsDraft.maintenanceMode)} onChange={(event) => setSettingsDraft((current) => ({ ...current, maintenanceMode: event.target.checked }))} />
            </label>
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
              { key: 'module', label: 'Module', render: (row) => row.businessType || '-' },
              { key: 'device', label: 'Device', render: (row) => `${row.deviceType || '-'} · ${row.browser || '-'} · ${row.os || '-'}` },
            ]}
          />
        </Panel>
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

  const content = {
    dashboard: <Dashboard />,
    activity: <Panel title="Live Client Activity" action={<ShellButton>Online = last 5 minutes</ShellButton>}><AdminTable rows={useSearch(liveUsers, search, ['email', 'uid', 'workspaceName', 'currentBusinessType'])} columns={liveColumns} emptyTitle="No client activity found" /></Panel>,
    clients: <Workspaces />,
    users: <Users />,
    upgrades: <Panel title="Upgrade Requests" action={<ShellButton>Firestore: upgradeRequests</ShellButton>}><AdminTable rows={upgradeRows} columns={upgradeColumns} emptyTitle="No upgrade requests found" /></Panel>,
    transactions: <Transactions />,
    plans: <Plans />,
    moduleAccess: <ModuleAccess />,
    visitorAnalytics: <VisitorAnalytics />,
    announcements: <Announcements />,
    support: <SupportTickets />,
    settings: <Settings />,
    logs: <Panel title="System Logs" action={<ShellButton>Firestore: backendActivityLogs</ShellButton>}><AdminTable rows={data.backendActivityLogs} emptyTitle="No backend activity logs found" columns={[{ key: 'admin', label: 'Admin', render: (row) => row.adminEmail || row.adminUid || '-' }, { key: 'action', label: 'Action' }, { key: 'details', label: 'Details', render: (row) => JSON.stringify(row.details || {}).slice(0, 120) }, { key: 'date', label: 'Date', render: (row) => dateTimeLabel(row.createdAt) }]} /></Panel>,
    roles: <Roles />,
    staff: <StaffManagement />,
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] overflow-y-auto bg-[#08172b] px-4 py-5 text-white shadow-2xl lg:block">
        <div className="flex items-center gap-3 px-1">
          <img src={logoUrl} alt="Nexora" className="h-11 w-11 rounded-xl bg-white object-contain p-1.5" />
          <div>
            <p className="text-2xl font-black tracking-wide">NEXORA</p>
            <p className="text-xs text-slate-300">SaaS Owner Admin Panel</p>
          </div>
        </div>
        <nav className="mt-7 space-y-6">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{group.label}</p>
              <div className="mt-2 space-y-1">
                {group.items.map(([key, label, Icon]) => (
                  <button key={key} type="button" onClick={() => setActiveTab(key)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${activeTab === key ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg shadow-violet-950/30' : 'text-slate-200 hover:bg-white/10'}`}>
                    <Icon className="h-5 w-5" />
                    <span className="truncate">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <a href="/" className="mt-7 flex items-center justify-between rounded-xl border border-white/15 px-4 py-3 text-sm font-bold text-white hover:bg-white/10">
          View Nexora Site
          <span>↗</span>
        </a>
      </aside>

      <main className="min-w-0 lg:pl-[260px]">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="text-2xl font-black tracking-tight">{navGroups.flatMap((g) => g.items).find(([key]) => key === activeTab)?.[1] || 'Dashboard'}</p>
              <p className="text-sm text-slate-500">Nexora SaaS business management. Client internal CRM records are not shown here.</p>
            </div>
            <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-end">
              <div className="relative min-w-0 md:w-[320px]">
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search clients, users, payments..." className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 pr-20 text-sm outline-none focus:border-violet-300" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">Ctrl + K</span>
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
                        <button type="button" className="text-xs font-bold text-violet-700" onClick={() => setReadNotifications(new Set(allNotifications.map((item) => item.id)))}>Mark all read</button>
                        <button type="button" className="text-xs font-bold text-slate-500" onClick={() => setReadNotifications(new Set(allNotifications.map((item) => item.id)))}>Clear all</button>
                      </div>
                    </div>
                    <div className="mt-2 max-h-96 overflow-auto">
                      {allNotifications.map((item) => {
                        const unread = !readNotifications.has(item.id)
                        return (
                          <button
                            key={item.id}
                            type="button"
                            className={`mb-2 w-full rounded-xl border p-3 text-left ${unread ? 'border-violet-100 bg-violet-50' : 'border-slate-100 bg-slate-50'}`}
                            onClick={() => setReadNotifications((current) => new Set([...current, item.id]))}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-black text-slate-900">{item.title}</p>
                                <p className="mt-1 truncate text-xs text-slate-500">{item.detail}</p>
                                <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-violet-600">{item.type}</p>
                              </div>
                              {unread ? <span className="mt-1 h-2 w-2 rounded-full bg-rose-500" /> : null}
                            </div>
                          </button>
                        )
                      })}
                      {!allNotifications.length ? <EmptyState title="No notifications" detail="New signups, payments, upgrade requests, support tickets, and expired trials will appear here." /> : null}
                    </div>
                  </div>
                ) : null}
              </div>
              <button className="grid h-10 w-10 place-items-center rounded-full text-slate-700 hover:bg-slate-100" type="button"><HiOutlineMoon className="h-5 w-5" /></button>
              <ShellButton onClick={() => runAction('admin-logout', handleLogout, 'Signed out.')}>Logout</ShellButton>
              <div className="flex items-center gap-3 border-l border-slate-200 pl-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-200 text-sm font-black">{String(user?.email || 'A').slice(0, 1).toUpperCase()}</div>
                <div className="hidden sm:block">
                  <p className="text-sm font-black">System Admin</p>
                  <p className="text-xs text-slate-500">{user?.email || 'Super Admin'}</p>
                </div>
              </div>
              </div>
            </div>
          </div>
        </header>

        <div className="px-4 py-4 sm:px-6">
          {toast ? <div className="mb-4 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-800">{toast}</div> : null}
          {data.error ? <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{data.error}</div> : null}
          {Object.keys(data.sourceErrors || {}).length ? (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
              {Object.entries(data.sourceErrors).map(([key, message]) => <p key={key}>{key}: {message}</p>)}
            </div>
          ) : null}
          {data.loading ? <div className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600">Loading SaaS admin data…</div> : null}
          {content[activeTab] || <Dashboard />}
        </div>
      </main>
    </div>
  )
}
