import { useEffect, useMemo, useState } from 'react'
import {
  HiOutlineBell,
  HiOutlineBuildingOffice2,
  HiOutlineChartBarSquare,
  HiOutlineCheckBadge,
  HiOutlineCog6Tooth,
  HiOutlineCreditCard,
  HiOutlineCurrencyDollar,
  HiOutlineDocumentText,
  HiOutlineEnvelope,
  HiOutlineFlag,
  HiOutlineHome,
  HiOutlineLifebuoy,
  HiOutlineLockClosed,
  HiOutlineMegaphone,
  HiOutlineMoon,
  HiOutlinePuzzlePiece,
  HiOutlineShieldCheck,
  HiOutlineTicket,
  HiOutlineUserGroup,
  HiOutlineUsers,
} from 'react-icons/hi2'
import {
  collection,
  collectionGroup,
  doc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
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
import { db } from '../../lib/firebase.js'
import useAuth from '../../context/useAuth.js'
import { clientSafeMessage } from '../../lib/errorHandler.js'

const modules = ['General CRM', 'School ERP', 'Retail / POS', 'Property ERP', 'Restaurant POS', 'WhatsApp CRM']
const plans = ['Basic', 'Standard', 'Premium', 'Enterprise']
const roles = ['Super Admin', 'Admin', 'Support', 'Billing Manager', 'Read Only']
const moduleColors = ['#7c3aed', '#3b82f6', '#f59e0b', '#ef4444', '#14b8a6', '#0ea5e9']

const navGroups = [
  {
    label: 'Platform',
    items: [
      ['dashboard', 'Dashboard', HiOutlineHome],
      ['workspaces', 'Clients / Workspaces', HiOutlineBuildingOffice2],
      ['subscriptions', 'Subscriptions', HiOutlineCheckBadge],
      ['modules', 'Modules', HiOutlinePuzzlePiece],
      ['plans', 'Plans & Pricing', HiOutlineCreditCard],
      ['transactions', 'Transactions', HiOutlineCurrencyDollar],
      ['invoices', 'Invoices', HiOutlineDocumentText],
      ['payouts', 'Payouts', HiOutlineChartBarSquare],
    ],
  },
  {
    label: 'User Management',
    items: [
      ['users', 'Users', HiOutlineUsers],
      ['roles', 'Roles & Permissions', HiOutlineShieldCheck],
      ['staff', 'Staff Management', HiOutlineUserGroup],
    ],
  },
  {
    label: 'System',
    items: [
      ['system', 'Settings', HiOutlineCog6Tooth],
      ['logs', 'System Logs', HiOutlineDocumentText],
      ['email', 'Email Templates', HiOutlineEnvelope],
      ['announcements', 'Announcements', HiOutlineMegaphone],
      ['flags', 'Feature Flags', HiOutlineFlag],
    ],
  },
  {
    label: 'Support',
    items: [
      ['support', 'Support Tickets', HiOutlineLifebuoy],
      ['reports', 'Reports', HiOutlineTicket],
    ],
  },
]

function toDate(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null)
  return date && !Number.isNaN(date.getTime()) ? date : null
}

function dateLabel(value) {
  const date = toDate(value)
  return date ? date.toLocaleDateString() : '—'
}

function money(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value || 0))
}

function amountValue(row = {}) {
  return Number(row.amount ?? row.amountPaid ?? row.total ?? row.totalUsd ?? row.approvalAmount ?? row.price ?? 0) || 0
}

function statusValue(value, fallback = 'unknown') {
  return String(value || fallback).trim().toLowerCase().replace(/\s+/g, '_')
}

function workspaceBusinessType(row = {}) {
  return row.selectedBusinessType || row.currentBusinessType || row.businessType || row.module || 'General CRM'
}

function workspaceName(row = {}) {
  return row.companyName || row.workspaceName || row.businessName || row.name || row.email || row.id || 'Workspace'
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

function normalizeSnapDoc(docSnap) {
  const data = docSnap.data()
  return {
    id: docSnap.id,
    ref: docSnap.ref,
    path: docSnap.ref.path,
    workspaceId: data.workspaceId || data.ownerId || docSnap.ref.parent?.parent?.id || data.userId || '',
    ...data,
  }
}

function mergeRows(...lists) {
  const map = new Map()
  lists.flat().forEach((row) => {
    const key = row.path || row.id
    if (key) map.set(key, row)
  })
  return Array.from(map.values())
}

function useControlCentreData() {
  const [state, setState] = useState({
    users: [],
    workspaces: [],
    upgradeRequests: [],
    subscriptions: [],
    payments: [],
    invoices: [],
    approvals: [],
    activityLogs: [],
    supportTickets: [],
    plans: [],
    backendStaff: [],
    loading: Boolean(db),
    error: '',
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
      subscriptionsTop: [],
      subscriptionsGroup: [],
      payments: [],
      invoices: [],
      approvals: [],
      activityLogsTop: [],
      activityLogsGroup: [],
      supportTickets: [],
      plans: [],
      backendStaff: [],
    }
    const loaded = new Set()
    const setRows = (key, docs) => {
      cache[key] = docs
      loaded.add(key)
      setState({
        users: cache.users,
        workspaces: cache.workspaces,
        upgradeRequests: cache.upgradeRequests,
        subscriptions: mergeRows(cache.subscriptionsTop, cache.subscriptionsGroup),
        payments: cache.payments,
        invoices: cache.invoices,
        approvals: cache.approvals,
        activityLogs: mergeRows(cache.activityLogsTop, cache.activityLogsGroup),
        supportTickets: cache.supportTickets,
        plans: cache.plans,
        backendStaff: cache.backendStaff,
        loading: loaded.size < 13,
        error: '',
      })
    }
    const fail = (error) => {
      setState((current) => ({
        ...current,
        loading: false,
        error: clientSafeMessage(error, 'Unable to load backend control centre data.', { context: 'Backend control centre' }),
      }))
    }
    const listen = (key, ref) =>
      onSnapshot(
        ref,
        (snap) => setRows(key, snap.docs.map(normalizeSnapDoc)),
        fail,
      )

    const unsubscribers = [
      listen('users', query(collection(db, 'users'), limit(500))),
      listen('workspaces', query(collection(db, 'workspaces'), limit(500))),
      listen('upgradeRequests', query(collection(db, 'upgradeRequests'), limit(300))),
      listen('subscriptionsTop', query(collection(db, 'subscriptions'), limit(300))),
      listen('subscriptionsGroup', query(collectionGroup(db, 'subscriptions'), limit(300))),
      listen('payments', query(collectionGroup(db, 'payments'), limit(500))),
      listen('invoices', query(collectionGroup(db, 'invoices'), limit(500))),
      listen('approvals', query(collectionGroup(db, 'approvals'), limit(500))),
      listen('activityLogsTop', query(collection(db, 'activityLogs'), limit(300))),
      listen('activityLogsGroup', query(collectionGroup(db, 'activityLogs'), limit(500))),
      listen('supportTickets', query(collectionGroup(db, 'supportTickets'), limit(200))),
      listen('plans', query(collection(db, 'plans'), limit(50))),
      listen('backendStaff', query(collection(db, 'backendStaff'), limit(100))),
    ]

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe?.())
  }, [])

  return state
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

function Card({ children, className = '' }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</section>
}

function Status({ value }) {
  const status = statusValue(value)
  const tone = ['active', 'paid', 'approved', 'healthy'].includes(status)
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
    : ['trial', 'pending', 'pending_approval', 'pending_verification'].includes(status)
      ? 'bg-amber-50 text-amber-700 ring-amber-100'
      : ['blocked', 'disabled', 'expired', 'rejected', 'cancelled', 'canceled'].includes(status)
        ? 'bg-rose-50 text-rose-700 ring-rose-100'
        : 'bg-slate-100 text-slate-600 ring-slate-200'
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1 ${tone}`}>{String(value || 'Unknown').replace(/_/g, ' ')}</span>
}

function EmptyState({ title = 'No data yet', detail = 'This panel is connected to Firestore and will populate when records exist.' }) {
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
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-black text-slate-500">{label}</p>
          <p className="mt-3 text-2xl font-black tracking-tight text-slate-950">{value}</p>
          <p className="mt-2 text-xs font-semibold text-emerald-600">{helper}</p>
        </div>
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${colors[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Card>
  )
}

function AdminTable({ columns, rows, emptyTitle, maxHeight = 'max-h-[28rem]' }) {
  if (!rows.length) return <EmptyState title={emptyTitle} />
  return (
    <div className={`overflow-auto ${maxHeight}`}>
      <table className="min-w-full text-left text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="whitespace-nowrap px-4 py-3">{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.path || row.id} className="align-top hover:bg-slate-50/80">
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3 text-slate-700">{column.render ? column.render(row) : row[column.key] || '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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

function useSearch(rows, queryText, fields) {
  return useMemo(() => {
    const q = queryText.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) => fields.some((field) => String(row[field] || '').toLowerCase().includes(q)))
  }, [fields, queryText, rows])
}

export default function ControlCentre() {
  const { user } = useAuth()
  const data = useControlCentreData()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState('')
  const [toast, setToast] = useState('')
  const [staffDraft, setStaffDraft] = useState({ name: '', email: '', role: 'Support' })

  const stats = useMemo(() => {
    const paidPayments = data.payments.filter(isPaid)
    const approvedUpgrades = data.upgradeRequests.filter(isPaid)
    const revenueRows = [...paidPayments, ...approvedUpgrades]
    const now = new Date()
    const monthlyRevenue = revenueRows
      .filter((row) => {
        const date = toDate(row.paidAt || row.approvedAt || row.createdAt)
        return date && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
      })
      .reduce((sum, row) => sum + amountValue(row), 0)
    const totalRevenue = revenueRows.reduce((sum, row) => sum + amountValue(row), 0)
    const trialWorkspaces = data.workspaces.filter(isTrial)
    const expiredWorkspaces = data.workspaces.filter(isExpired)
    const activeSubscriptions = data.workspaces.filter((row) => !isExpired(row) && (isPaid(row) || statusValue(row.subscriptionStatus || row.planStatus) === 'active'))
    const pendingApprovals = [...data.approvals, ...data.upgradeRequests].filter((row) => statusValue(row.approvalStatus || row.status) === 'pending')
    return {
      totalWorkspaces: data.workspaces.length,
      activeSubscriptions: activeSubscriptions.length,
      trialWorkspaces: trialWorkspaces.length,
      expiredWorkspaces: expiredWorkspaces.length,
      monthlyRevenue,
      totalRevenue,
      pendingApprovals: pendingApprovals.length,
    }
  }, [data])

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
      return {
        key: date.toISOString().slice(0, 10),
        label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        revenue: 0,
        subscriptions: 0,
      }
    })
    data.payments.filter(isPaid).forEach((payment) => {
      const date = toDate(payment.paidAt || payment.approvedAt || payment.createdAt)
      const key = date?.toISOString().slice(0, 10)
      const item = days.find((day) => day.key === key)
      if (item) {
        item.revenue += amountValue(payment)
        item.subscriptions += 1
      }
    })
    return days
  }, [data.payments])

  const recentSignups = useMemo(
    () => [...data.workspaces].sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0)).slice(0, 6),
    [data.workspaces],
  )
  const topWorkspaces = useMemo(() => {
    const totals = new Map()
    data.payments.filter(isPaid).forEach((payment) => {
      const key = payment.workspaceId || payment.userId || payment.ownerId || 'unknown'
      totals.set(key, (totals.get(key) || 0) + amountValue(payment))
    })
    return [...data.workspaces]
      .map((workspace) => ({ ...workspace, revenue: totals.get(workspace.id) || 0 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6)
  }, [data.payments, data.workspaces])

  const workspaceRows = useSearch(data.workspaces, search, ['id', 'email', 'companyName', 'workspaceName', 'businessName', 'selectedBusinessType', 'businessType'])
  const userRows = useSearch(data.users, search, ['id', 'email', 'name', 'fullName', 'role'])
  const paymentRows = useSearch(data.payments, search, ['id', 'email', 'customerName', 'workspaceId', 'paymentMethod', 'paymentStatus'])
  const invoiceRows = useSearch(data.invoices, search, ['id', 'invoiceNumber', 'customerName', 'workspaceId', 'paymentStatus', 'status'])

  async function runAction(id, action) {
    setBusy(id)
    setToast('')
    try {
      await action()
      setToast('Action completed.')
    } catch (error) {
      setToast(clientSafeMessage(error, 'Unable to complete action.', { context: 'Control centre action' }))
    } finally {
      setBusy('')
    }
  }

  const workspaceColumns = [
    {
      key: 'workspace',
      label: 'Workspace',
      render: (row) => (
        <div>
          <p className="font-black text-slate-900">{workspaceName(row)}</p>
          <p className="mt-1 text-xs text-slate-500">{row.email || row.ownerEmail || row.id}</p>
        </div>
      ),
    },
    { key: 'module', label: 'Module', render: (row) => workspaceBusinessType(row) },
    { key: 'plan', label: 'Plan', render: (row) => row.plan || row.selectedPlan || 'Basic' },
    { key: 'status', label: 'Status', render: (row) => <Status value={row.status || row.subscriptionStatus || row.planStatus || (isTrial(row) ? 'trial' : 'active')} /> },
    { key: 'trial', label: 'Trial Ends', render: (row) => dateLabel(row.trialEndsAt || row.subscriptionExpiresAt) },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex min-w-[25rem] flex-wrap gap-2">
          <ShellButton disabled={busy === `block-${row.id}`} onClick={() => runAction(`block-${row.id}`, () => updateDoc(doc(db, 'workspaces', row.id), { status: 'blocked', accountStatus: 'blocked', updatedAt: serverTimestamp() }))}>Block</ShellButton>
          <ShellButton disabled={busy === `unblock-${row.id}`} onClick={() => runAction(`unblock-${row.id}`, () => updateDoc(doc(db, 'workspaces', row.id), { status: 'active', accountStatus: 'active', updatedAt: serverTimestamp() }))}>Unblock</ShellButton>
          <select
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold"
            value={row.plan || 'Basic'}
            onChange={(event) => runAction(`workspace-plan-${row.id}`, () => updateDoc(doc(db, 'workspaces', row.id), { plan: event.target.value, updatedAt: serverTimestamp() }))}
          >
            {plans.map((plan) => <option key={plan}>{plan}</option>)}
          </select>
          <ShellButton onClick={() => {
            const next = new Date()
            next.setDate(next.getDate() + 7)
            runAction(`extend-${row.id}`, () => updateDoc(doc(db, 'workspaces', row.id), { isTrialActive: true, trialEndsAt: next, subscriptionStatus: 'trial', planStatus: 'trial', updatedAt: serverTimestamp() }))
          }}>Extend Trial</ShellButton>
          <ShellButton onClick={() => runAction(`paid-${row.id}`, () => updateDoc(doc(db, 'workspaces', row.id), { planStatus: 'active', subscriptionStatus: 'active', paymentStatus: 'paid', paidAt: serverTimestamp(), updatedAt: serverTimestamp() }))}>Mark Paid</ShellButton>
          <ShellButton onClick={() => runAction(`expire-${row.id}`, () => updateDoc(doc(db, 'workspaces', row.id), { planStatus: 'expired', subscriptionStatus: 'expired', isTrialActive: false, updatedAt: serverTimestamp() }))}>Expire</ShellButton>
        </div>
      ),
    },
  ]

  const paymentColumns = [
    { key: 'workspaceId', label: 'Workspace' },
    { key: 'method', label: 'Method', render: (row) => row.paymentMethod || row.method || 'Manual' },
    { key: 'amount', label: 'Amount', render: (row) => money(amountValue(row)) },
    { key: 'status', label: 'Status', render: (row) => <Status value={row.paymentStatus || row.status || row.approvalStatus} /> },
    { key: 'date', label: 'Date', render: (row) => dateLabel(row.paidAt || row.createdAt || row.approvedAt) },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <ShellButton onClick={() => runAction(`payment-paid-${row.path}`, () => updateDoc(row.ref, { paymentStatus: 'paid', status: 'paid', approvalStatus: 'approved', approvedBy: user?.uid || '', approvedAt: serverTimestamp(), paidAt: serverTimestamp(), updatedAt: serverTimestamp() }))}>Approve</ShellButton>
          <ShellButton onClick={() => runAction(`payment-reject-${row.path}`, () => updateDoc(row.ref, { paymentStatus: 'rejected', status: 'rejected', approvalStatus: 'rejected', rejectedBy: user?.uid || '', rejectedAt: serverTimestamp(), updatedAt: serverTimestamp() }))}>Reject</ShellButton>
        </div>
      ),
    },
  ]

  const invoiceColumns = [
    { key: 'invoice', label: 'Invoice', render: (row) => <div><p className="font-black text-slate-900">{row.invoiceNumber || row.id}</p><p className="text-xs text-slate-500">{row.customerName || row.customerEmail || '—'}</p></div> },
    { key: 'workspaceId', label: 'Workspace' },
    { key: 'amount', label: 'Amount', render: (row) => money(amountValue(row)) },
    { key: 'status', label: 'Status', render: (row) => <Status value={row.paymentStatus || row.status || row.approvalStatus} /> },
    { key: 'date', label: 'Date', render: (row) => dateLabel(row.createdAt || row.issueDate) },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <ShellButton onClick={() => window.print()}>Print</ShellButton>
          <ShellButton onClick={() => runAction(`invoice-paid-${row.path}`, () => updateDoc(row.ref, { status: 'paid', paymentStatus: 'paid', approvalStatus: 'approved', amountPaid: amountValue(row), balanceDue: 0, paidAt: serverTimestamp(), updatedAt: serverTimestamp() }))}>Mark Paid</ShellButton>
          <ShellButton onClick={() => runAction(`invoice-unpaid-${row.path}`, () => updateDoc(row.ref, { status: 'sent', paymentStatus: 'pending', amountPaid: 0, updatedAt: serverTimestamp() }))}>Unpaid</ShellButton>
        </div>
      ),
    },
  ]

  const userColumns = [
    { key: 'user', label: 'User', render: (row) => <div><p className="font-black text-slate-900">{row.name || row.fullName || row.email || row.id}</p><p className="text-xs text-slate-500">{row.email || row.id}</p></div> },
    { key: 'workspaceId', label: 'Workspace' },
    { key: 'role', label: 'Role', render: (row) => row.role || 'user' },
    { key: 'status', label: 'Status', render: (row) => <Status value={row.status || 'active'} /> },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <ShellButton onClick={() => runAction(`user-block-${row.id}`, () => updateDoc(doc(db, 'users', row.id), { status: 'blocked', updatedAt: serverTimestamp() }))}>Block</ShellButton>
          <ShellButton onClick={() => runAction(`user-unblock-${row.id}`, () => updateDoc(doc(db, 'users', row.id), { status: 'active', updatedAt: serverTimestamp() }))}>Unblock</ShellButton>
        </div>
      ),
    },
  ]

  function Dashboard() {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard label="Total Workspaces" value={stats.totalWorkspaces} helper="+ live Firestore count" icon={HiOutlineBuildingOffice2} />
          <KpiCard label="Active Subscriptions" value={stats.activeSubscriptions} helper="Paid or active plans" icon={HiOutlineCheckBadge} tone="emerald" />
          <KpiCard label="Trial Workspaces" value={stats.trialWorkspaces} helper="7-day trial accounts" icon={HiOutlineCreditCard} tone="amber" />
          <KpiCard label="Total Revenue" value={money(stats.totalRevenue)} helper={`${money(stats.monthlyRevenue)} this month`} icon={HiOutlineCurrencyDollar} tone="sky" />
          <KpiCard label="Pending Approvals" value={stats.pendingApprovals} helper="Approval queue" icon={HiOutlineUsers} tone="rose" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr_0.9fr]">
          <Panel title="Revenue Overview" action={<ShellButton>Last 14 Days</ShellButton>}>
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
                  <Tooltip formatter={(value, name) => (name === 'revenue' ? money(value) : value)} />
                  <Area type="monotone" dataKey="revenue" stroke="#7c3aed" fill="url(#revenue)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Workspaces by Module" action={<ShellButton onClick={() => setActiveTab('modules')}>View All</ShellButton>}>
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

          <Panel title="Recent Transactions" action={<ShellButton onClick={() => setActiveTab('transactions')}>View All</ShellButton>}>
            <div className="space-y-3">
              {data.payments.slice(0, 6).map((payment) => (
                <div key={payment.path} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-900">{payment.customerName || payment.workspaceId || 'Payment'}</p>
                    <p className="text-xs text-slate-500">{payment.paymentMethod || payment.method || 'Manual'} · {dateLabel(payment.createdAt || payment.paidAt)}</p>
                  </div>
                  <p className="text-sm font-black text-emerald-600">{money(amountValue(payment))}</p>
                </div>
              ))}
              {!data.payments.length ? <EmptyState title="No transactions yet" /> : null}
            </div>
          </Panel>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Panel title="System Health">
            {['Database', 'Storage', 'API Services', 'Email Service', 'Backup'].map((item) => (
              <div key={item} className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0">
                <span className="text-sm font-semibold text-slate-700">{item}</span>
                <Status value={data.error ? 'Warning' : 'Healthy'} />
              </div>
            ))}
          </Panel>
          <Panel title="Recent Signups" action={<ShellButton onClick={() => setActiveTab('workspaces')}>View All</ShellButton>}>
            {recentSignups.map((workspace) => (
              <div key={workspace.id} className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-900">{workspaceName(workspace)}</p>
                  <p className="text-xs text-slate-500">{workspaceBusinessType(workspace)}</p>
                </div>
                <span className="text-xs font-semibold text-slate-500">{dateLabel(workspace.createdAt)}</span>
              </div>
            ))}
            {!recentSignups.length ? <EmptyState title="No recent signups" /> : null}
          </Panel>
          <Panel title="Top Workspaces" action={<ShellButton onClick={() => setActiveTab('workspaces')}>View All</ShellButton>}>
            {topWorkspaces.map((workspace) => (
              <div key={workspace.id} className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-900">{workspaceName(workspace)}</p>
                  <p className="text-xs text-slate-500">{workspaceBusinessType(workspace)}</p>
                </div>
                <span className="text-sm font-black text-slate-900">{money(workspace.revenue)}</span>
              </div>
            ))}
            {!topWorkspaces.length ? <EmptyState title="No revenue yet" /> : null}
          </Panel>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.4fr_0.7fr]">
          <Panel title="System Activity Logs">
            <AdminTable
              rows={data.activityLogs.slice(0, 7)}
              emptyTitle="No activity logs yet"
              columns={[
                { key: 'user', label: 'User', render: (row) => row.userEmail || row.email || row.userId || '—' },
                { key: 'action', label: 'Action' },
                { key: 'module', label: 'Module' },
                { key: 'workspaceId', label: 'Workspace' },
                { key: 'time', label: 'Time', render: (row) => dateLabel(row.createdAt || row.updatedAt) },
              ]}
              maxHeight="max-h-[18rem]"
            />
          </Panel>
          <Panel title="Quick Actions">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['workspaces', 'Add Workspace', HiOutlineBuildingOffice2],
                ['plans', 'Create Plan', HiOutlineCreditCard],
                ['announcements', 'Send Announcement', HiOutlineMegaphone],
                ['system', 'System Settings', HiOutlineCog6Tooth],
              ].map(([tab, label, Icon]) => (
                <button key={label} type="button" onClick={() => setActiveTab(tab)} className="rounded-2xl border border-slate-200 p-4 text-center transition hover:border-violet-200 hover:bg-violet-50">
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-violet-100 text-violet-700">
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="mt-3 block text-xs font-black text-slate-800">{label}</span>
                </button>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    )
  }

  function Workspaces() {
    return (
      <Panel title="Clients / Workspaces" action={<ShellButton>Firestore: workspaces</ShellButton>}>
        <AdminTable rows={workspaceRows} columns={workspaceColumns} emptyTitle="No workspaces found" />
      </Panel>
    )
  }

  function Subscriptions() {
    const rows = data.subscriptions.length ? data.subscriptions : data.workspaces
    return (
      <Panel title="Subscriptions" action={<ShellButton>Active · Trial · Expired · Cancelled</ShellButton>}>
        <AdminTable
          rows={rows}
          emptyTitle="No subscriptions found"
          columns={[
            { key: 'workspace', label: 'Workspace', render: (row) => workspaceName(row) },
            { key: 'plan', label: 'Plan', render: (row) => row.plan || row.selectedPlan || 'Basic' },
            { key: 'status', label: 'Status', render: (row) => <Status value={row.subscriptionStatus || row.planStatus || row.status || (isTrial(row) ? 'trial' : 'active')} /> },
            { key: 'nextBillingDate', label: 'Next Billing', render: (row) => dateLabel(row.nextBillingDate || row.subscriptionExpiresAt || row.trialEndsAt) },
            { key: 'paymentStatus', label: 'Payment', render: (row) => <Status value={row.paymentStatus || row.approvalStatus || 'pending'} /> },
            {
              key: 'actions',
              label: 'Plan Actions',
              render: (row) => (
                <select
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold"
                  value={row.plan || 'Basic'}
                  onChange={(event) => runAction(`plan-${row.path || row.id}`, () => updateDoc(row.ref || doc(db, 'workspaces', row.id), { plan: event.target.value, updatedAt: serverTimestamp() }))}
                >
                  {plans.map((plan) => <option key={plan}>{plan}</option>)}
                </select>
              ),
            },
          ]}
        />
      </Panel>
    )
  }

  function Modules() {
    return (
      <Panel title="Modules" action={<ShellButton>Per-workspace toggles</ShellButton>}>
        <div className="grid gap-4 lg:grid-cols-2">
          {modules.map((module) => (
            <Card key={module} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-slate-950">{module}</p>
                  <p className="mt-1 text-xs text-slate-500">{data.workspaces.filter((workspace) => workspaceBusinessType(workspace) === module).length} active workspace records</p>
                </div>
                <Status value={module === 'WhatsApp CRM' ? 'Coming Soon' : 'Active'} />
              </div>
              <div className="mt-4 max-h-48 space-y-2 overflow-auto">
                {data.workspaces.slice(0, 12).map((workspace) => {
                  const enabled = (workspace.enabledModules || []).includes(module) || workspaceBusinessType(workspace) === module
                  return (
                    <label key={`${workspace.id}-${module}`} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold">
                      <span className="truncate">{workspaceName(workspace)}</span>
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(event) => {
                          const current = new Set(workspace.enabledModules || [workspaceBusinessType(workspace)])
                          if (event.target.checked) current.add(module)
                          else current.delete(module)
                          runAction(`module-${workspace.id}-${module}`, () => updateDoc(doc(db, 'workspaces', workspace.id), { enabledModules: Array.from(current), updatedAt: serverTimestamp() }))
                        }}
                      />
                    </label>
                  )
                })}
                {!data.workspaces.length ? <EmptyState title="No workspaces available" /> : null}
              </div>
            </Card>
          ))}
        </div>
      </Panel>
    )
  }

  function Plans() {
    const planRows = plans.map((plan, index) => data.plans.find((row) => row.id === plan.toLowerCase()) || { id: plan.toLowerCase(), name: plan, price: [29, 79, 149, 299][index], features: ['CRM engine', 'Invoices & payments', 'Team permissions'] })
    return (
      <Panel title="Plans & Pricing" action={<ShellButton>Firestore: plans</ShellButton>}>
        <div className="grid gap-4 lg:grid-cols-4">
          {planRows.map((plan) => (
            <Card key={plan.id} className="p-4">
              <p className="text-sm font-black text-slate-950">{plan.name || plan.id}</p>
              <input id={`price-${plan.id}`} className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-black" defaultValue={plan.price || 0} />
              <div className="mt-4 space-y-2 text-xs text-slate-600">
                {['CRM engine', 'Invoices & payments', 'Team permissions', plan.name === 'Premium' || plan.name === 'Enterprise' ? 'All modules' : 'Selected module'].map((feature) => (
                  <label key={feature} className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked={(plan.features || []).includes(feature) || true} />
                    {feature}
                  </label>
                ))}
              </div>
              <ShellButton
                className="mt-4 w-full"
                onClick={() => {
                  const price = Number(document.getElementById(`price-${plan.id}`)?.value || 0)
                  runAction(`plan-save-${plan.id}`, () => setDoc(doc(db, 'plans', plan.id), { name: plan.name || plan.id, price, currency: 'USD', features: plan.features || [], updatedAt: serverTimestamp(), updatedBy: user?.uid || '' }, { merge: true }))
                }}
              >
                Save Plan
              </ShellButton>
            </Card>
          ))}
        </div>
      </Panel>
    )
  }

  function Roles() {
    return (
      <Panel title="Roles & Permissions">
        <div className="grid gap-4 lg:grid-cols-5">
          {roles.map((role) => (
            <Card key={role} className="p-4">
              <p className="font-black text-slate-950">{role}</p>
              <div className="mt-4 space-y-2 text-xs font-semibold text-slate-600">
                {['Dashboard', 'Billing', 'Users', 'Modules', 'System'].map((permission) => (
                  <label key={permission} className="flex items-center justify-between gap-3">
                    <span>{permission}</span>
                    <input type="checkbox" defaultChecked={['Super Admin', 'Admin'].includes(role)} disabled={role === 'Read Only'} />
                  </label>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </Panel>
    )
  }

  function Placeholder({ title, detail }) {
    return (
      <Panel title={title}>
        <EmptyState title={title} detail={detail || 'No records exist yet. This control centre will show live Firestore data when available.'} />
      </Panel>
    )
  }

  function StaffManagement() {
    const staffRows = data.backendStaff.length ? data.backendStaff : data.users.filter((row) => ['platform_admin', 'super_admin', 'support', 'billing_manager', 'read_only'].includes(statusValue(row.role)))
    return (
      <Panel title="Staff Management" action={<ShellButton>Firestore: backendStaff</ShellButton>}>
        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_1fr_14rem_auto]">
          <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Staff name" value={staffDraft.name} onChange={(event) => setStaffDraft((current) => ({ ...current, name: event.target.value }))} />
          <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Email" value={staffDraft.email} onChange={(event) => setStaffDraft((current) => ({ ...current, email: event.target.value }))} />
          <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" value={staffDraft.role} onChange={(event) => setStaffDraft((current) => ({ ...current, role: event.target.value }))}>
            {roles.map((role) => <option key={role}>{role}</option>)}
          </select>
          <ShellButton
            onClick={() => {
              const id = staffDraft.email.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || `staff-${Date.now()}`
              runAction(`staff-add-${id}`, async () => {
                await setDoc(doc(db, 'backendStaff', id), { ...staffDraft, status: 'active', createdAt: serverTimestamp(), updatedAt: serverTimestamp(), createdBy: user?.uid || '' }, { merge: true })
                setStaffDraft({ name: '', email: '', role: 'Support' })
              })
            }}
          >
            Add Staff
          </ShellButton>
        </div>
        <AdminTable
          rows={staffRows}
          emptyTitle="No backend staff found"
          columns={[
            { key: 'name', label: 'Staff', render: (row) => <div><p className="font-black text-slate-900">{row.name || row.fullName || row.email || row.id}</p><p className="text-xs text-slate-500">{row.email || row.id}</p></div> },
            { key: 'role', label: 'Role', render: (row) => row.role || 'Support' },
            { key: 'status', label: 'Status', render: (row) => <Status value={row.status || 'active'} /> },
            {
              key: 'actions',
              label: 'Actions',
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  <ShellButton onClick={() => runAction(`staff-active-${row.id}`, () => updateDoc(row.ref || doc(db, 'backendStaff', row.id), { status: 'active', updatedAt: serverTimestamp() }))}>Enable</ShellButton>
                  <ShellButton onClick={() => runAction(`staff-disable-${row.id}`, () => updateDoc(row.ref || doc(db, 'backendStaff', row.id), { status: 'disabled', updatedAt: serverTimestamp() }))}>Disable</ShellButton>
                </div>
              ),
            },
          ]}
        />
      </Panel>
    )
  }

  const content = {
    dashboard: <Dashboard />,
    workspaces: <Workspaces />,
    subscriptions: <Subscriptions />,
    modules: <Modules />,
    plans: <Plans />,
    transactions: <Panel title="Transactions" action={<ShellButton>Payment records</ShellButton>}><AdminTable rows={paymentRows} columns={paymentColumns} emptyTitle="No payment records found" /></Panel>,
    invoices: <Panel title="Platform & Client Invoices" action={<ShellButton>Print-ready records</ShellButton>}><AdminTable rows={invoiceRows} columns={invoiceColumns} emptyTitle="No invoices found" /></Panel>,
    payouts: <Placeholder title="Payouts" detail="Payout data is not available yet. This module is ready for future payout records." />,
    users: <Panel title="Users" action={<ShellButton>Firestore: users</ShellButton>}><AdminTable rows={userRows} columns={userColumns} emptyTitle="No users found" /></Panel>,
    roles: <Roles />,
    staff: <StaffManagement />,
    system: <Placeholder title="System Settings" />,
    logs: <Panel title="System & Activity Logs"><AdminTable rows={data.activityLogs} emptyTitle="No logs found" columns={[{ key: 'user', label: 'User', render: (row) => row.userEmail || row.email || row.userId || '—' }, { key: 'action', label: 'Action' }, { key: 'module', label: 'Module' }, { key: 'workspaceId', label: 'Workspace' }, { key: 'date', label: 'Date', render: (row) => dateLabel(row.createdAt || row.updatedAt) }]} /></Panel>,
    email: <Placeholder title="Email Templates" detail="Email templates are currently code-based. Firestore template records will appear here when added." />,
    announcements: <Placeholder title="Announcements" />,
    flags: <Placeholder title="Feature Flags" />,
    support: <Panel title="Support Tickets"><AdminTable rows={data.supportTickets} emptyTitle="No support tickets found" columns={[{ key: 'title', label: 'Ticket', render: (row) => row.title || row.subject || row.id }, { key: 'workspaceId', label: 'Workspace' }, { key: 'status', label: 'Status', render: (row) => <Status value={row.status || 'open'} /> }, { key: 'date', label: 'Date', render: (row) => dateLabel(row.createdAt) }]} /></Panel>,
    reports: <Placeholder title="Reports" detail="Use the dashboard KPI, revenue, module, subscription, transaction, and approval panels for live reports." />,
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 overflow-y-auto bg-[#08172b] px-4 py-5 text-white shadow-2xl lg:block">
        <div className="flex items-center gap-3 px-1">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-sky-400 to-violet-600 font-black">N</div>
          <div>
            <p className="text-2xl font-black tracking-wide">NEXORA</p>
            <p className="text-xs text-slate-300">Backend Control Centre</p>
          </div>
        </div>
        <nav className="mt-7 space-y-6">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{group.label}</p>
              <div className="mt-2 space-y-1">
                {group.items.map(([key, label, Icon]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${activeTab === key ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg shadow-violet-950/30' : 'text-slate-200 hover:bg-white/10'}`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="truncate">{label}</span>
                    {label === 'Announcements' ? <span className="ml-auto rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] text-amber-200">New</span> : null}
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
        <p className="mt-5 text-xs leading-5 text-slate-400">© 2026 Nexora<br />All rights reserved.</p>
      </aside>

      <main className="min-w-0 lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex flex-col gap-3 px-4 py-4 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-2xl font-black tracking-tight">{navGroups.flatMap((g) => g.items).find(([key]) => key === activeTab)?.[1] || 'Dashboard'}</p>
              <p className="text-sm text-slate-500">Welcome to Nexora Backend Control Centre</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search anything..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 pr-20 text-sm outline-none focus:border-violet-300 sm:w-80"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">Ctrl + K</span>
              </div>
              <button className="relative grid h-10 w-10 place-items-center rounded-full text-slate-700 hover:bg-slate-100" type="button">
                <HiOutlineBell className="h-5 w-5" />
                <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-rose-500 text-[9px] font-black text-white">{stats.pendingApprovals}</span>
              </button>
              <button className="grid h-10 w-10 place-items-center rounded-full text-slate-700 hover:bg-slate-100" type="button"><HiOutlineMoon className="h-5 w-5" /></button>
              <div className="flex items-center gap-3 border-l border-slate-200 pl-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-200 text-sm font-black">{String(user?.email || 'A').slice(0, 1).toUpperCase()}</div>
                <div className="hidden sm:block">
                  <p className="text-sm font-black">System Admin</p>
                  <p className="text-xs text-slate-500">{user?.email || 'Super Admin'}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="px-4 py-4 sm:px-6">
          {toast ? <div className="mb-4 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-800">{toast}</div> : null}
          {data.error ? <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{data.error}</div> : null}
          {data.loading ? <div className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600">Loading live Firestore data…</div> : null}
          {content[activeTab] || <Dashboard />}
        </div>
      </main>
    </div>
  )
}
