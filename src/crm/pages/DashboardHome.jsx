import { Link } from 'react-router-dom'
import { memo, useEffect, useMemo } from 'react'
import {
  HiOutlineBolt,
  HiOutlineChartBar,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineCurrencyDollar,
  HiOutlineDocumentText,
  HiOutlineLifebuoy,
  HiOutlinePlus,
  HiOutlineSparkles,
  HiOutlineTicket,
  HiOutlineUserGroup,
  HiOutlineBanknotes,
  HiOutlineCalendarDays,
  HiOutlineClipboardDocumentCheck,
  HiOutlineExclamationTriangle,
  HiOutlineWrenchScrewdriver,
  HiOutlineChatBubbleLeftRight,
} from 'react-icons/hi2'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import SkeletonLoader from '../components/system/SkeletonLoader.jsx'
import { useInvoices } from '../hooks/useInvoices.js'
import { useCustomers } from '../hooks/useCustomers.js'
import { useLeadScoring } from '../hooks/useLeadScoring.js'
import { useActivityLogs } from '../hooks/useActivityLogs.js'
import { useSupportTickets } from '../hooks/useSupportTickets.js'
import { useExpenses } from '../hooks/useExpenses.js'
import { useMaintenance } from '../hooks/useMaintenance.js'
import { useContracts } from '../hooks/useContracts.js'
import { useWhatsappContacts } from '../hooks/useWhatsappContacts.js'
import { useWhatsappLeads } from '../hooks/useWhatsappLeads.js'
import { useWhatsappFollowUps } from '../hooks/useWhatsappFollowUps.js'
import WhatsappDashboard from '../components/dashboard/WhatsappDashboard.jsx'
import { useUser } from '../hooks/useUser.js'
import {
  calculateConversionRate,
  invoiceBalanceDue,
  isOutstandingInvoice,
  calculatePipelineValue,
  getDashboardStats,
  getInvoiceStatus,
  isActivePipelineItem,
  isPaidRecord,
  paymentValue,
} from '../lib/calculations.js'
import { formatCompact, formatCurrency, formatPercentValue, toFiniteNumber } from '../utils/format.js'
import { cn } from '../utils/cn.js'
import { normalizeBusinessType } from '../data/moduleAccess.js'
import { contractStats, maintenanceStats } from '../lib/propertyCalculations.js'
import { contactStats, followUpStats, leadStats } from '../lib/whatsappManual.js'

// Dashboard hero title/subtitle per business type (module). Falls back to a
// generic label for any unknown type. Only affects the hero header text.
const DASHBOARD_HERO = {
  'General CRM': {
    title: 'CRM Command Center',
    subtitle: 'Manage customers, leads, invoices, and sales pipeline in one workspace.',
  },
  'School ERP': {
    title: 'School ERP Command Center',
    subtitle: 'Manage students, fees, attendance, classes, and academic reports.',
  },
  'Retail / POS': {
    title: 'Retail POS Command Center',
    subtitle: 'Track sales, products, inventory, customers, and daily revenue.',
  },
  'Restaurant POS': {
    title: 'Restaurant POS Command Center',
    subtitle: 'Manage orders, tables, menu, kitchen flow, and restaurant sales.',
  },
  'Property ERP': {
    title: 'Property ERP Command Center',
    subtitle: 'Manage tenants, rent, properties, leases, and maintenance.',
  },
  'WhatsApp CRM': {
    title: 'WhatsApp CRM Command Center',
    subtitle: 'Manage WhatsApp leads, reminders, follow-ups, and customer conversations.',
  },
}

const DASHBOARD_HERO_FALLBACK = {
  title: 'Business Command Center',
  subtitle: 'Manage your customers, sales, and revenue in one clean workspace view.',
}

function dashboardHero(businessType) {
  // Honor a raw "Fleet" workspace label even though it normalizes to a base type.
  if (String(businessType || '').toLowerCase().includes('fleet')) {
    return { title: 'Fleet Command Center', subtitle: 'Track vehicles, trips, fuel, drivers, and fleet expenses.' }
  }
  return DASHBOARD_HERO[normalizeBusinessType(businessType)] || DASHBOARD_HERO_FALLBACK
}

function dateFromValue(value) {
  if (!value) return null
  if (typeof value?.toDate === 'function') return value.toDate()
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function safeText(value, fallback = 'Not added yet') {
  const text = typeof value === 'string' ? value.trim() : ''
  return text || fallback
}

function safeCount(value) {
  return Math.max(0, toFiniteNumber(value))
}

function isOpenTicket(ticket) {
  const status = String(ticket?.status || '').toLowerCase()
  return status === 'open' || status === 'in progress'
}

function activityType(log) {
  const action = String(log?.action || '').toLowerCase()
  const module = String(log?.module || '').toLowerCase()
  if (action.includes('invoice created')) return 'Invoice created'
  if (action.includes('payment approved') || action.includes('invoice paid') || action.includes('invoice marked paid')) return 'Payment approved'
  if (action.includes('customer created') || action.includes('customer added')) return 'Customer added'
  if (action.includes('lead updated') || action.includes('lead created') || module.includes('lead')) return 'Lead updated'
  if (action.includes('expense approved')) return 'Expense approved'
  return ''
}

const SectionTitle = memo(function SectionTitle({ eyebrow, title, action }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{eyebrow}</p> : null}
        <h2 className="mt-1 text-base font-semibold tracking-tight text-slate-950 dark:text-white">{title}</h2>
      </div>
      {action}
    </div>
  )
})

const InlineEmpty = memo(function InlineEmpty({ title = 'Add your first record', description = 'Start by adding customers or creating invoices.' }) {
  return (
    <div className="grid min-h-[10rem] place-items-center rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center dark:border-white/10 dark:bg-white/5">
      <div className="max-w-xs">
        <p className="text-sm font-semibold text-slate-950 dark:text-white">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-300">{description}</p>
      </div>
    </div>
  )
})

const LoadingBlock = memo(function LoadingBlock({ lines = 4, className = '' }) {
  return (
    <div className={cn('rounded-[1.25rem] border border-slate-100 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5', className)}>
      <SkeletonLoader lines={lines} />
    </div>
  )
})

const MetricCard = memo(function MetricCard({ icon: Icon, label, value, helper, tone = 'sky', loading = false }) {
  const toneMap = {
    sky: 'border-sky-200 bg-sky-50 text-sky-700',
    violet: 'border-violet-200 bg-violet-50 text-violet-700',
    cyan: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  }

  return (
    <div className="min-w-0">
      <Card className="h-full rounded-[1.5rem] p-4">
        {loading ? (
          <SkeletonLoader lines={3} />
        ) : (
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
              <p className="mt-2 truncate text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{value}</p>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-300">{helper}</p>
            </div>
            <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-2xl border', toneMap[tone])}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        )}
      </Card>
    </div>
  )
})

const MiniBars = memo(function MiniBars({ data, color = 'bg-sky-500' }) {
  const max = Math.max(1, ...data.map((item) => safeCount(item.value)))
  const hasData = data.some((item) => safeCount(item.value) > 0)

  if (!hasData) {
    return <InlineEmpty title="No chart activity yet" description="Create invoices or leads to activate this chart." />
  }

  return (
    <div className="flex h-44 items-end gap-2 rounded-[1.25rem] border border-slate-100 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5">
      {data.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <div className="flex h-32 w-full items-end">
            <div
              className={cn('w-full rounded-t-xl shadow-sm', color)}
              style={{ height: `${Math.max(12, (safeCount(item.value) / max) * 100)}%` }}
            />
          </div>
          <span className="w-full truncate text-center text-[11px] font-medium text-slate-500">{item.label}</span>
        </div>
      ))}
    </div>
  )
})

const ProgressRow = memo(function ProgressRow({ label, value, max, tone = 'bg-sky-500' }) {
  const safeMax = Math.max(1, safeCount(max))
  const pct = Math.max(0, Math.min(100, (safeCount(value) / safeMax) * 100))
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="truncate font-medium text-slate-600 dark:text-slate-300">{label}</span>
        <span className="shrink-0 font-semibold text-slate-950 dark:text-white">{formatCompact(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
        <div className={cn('h-full rounded-full', tone)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
})

const QuickAction = memo(function QuickAction({ to, icon: Icon, title, detail }) {
  return (
    <Link
      to={to}
      className="group flex min-w-0 items-center gap-3 rounded-[1.15rem] border border-slate-100 bg-white/70 p-3 transition-colors duration-100 hover:border-sky-100 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-950 text-white transition-colors duration-100 group-hover:bg-sky-700">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-slate-950 dark:text-white">{title}</span>
        <span className="block truncate text-xs text-slate-500 dark:text-slate-300">{detail}</span>
      </span>
    </Link>
  )
})

const ActivityList = memo(function ActivityList({ items }) {
  if (!items.length) {
    return <InlineEmpty title="No activity recorded yet" description="Workspace activity will appear here as actions happen." />
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="flex gap-3 rounded-[1.15rem] border border-slate-100 bg-white/65 p-3 dark:border-white/10 dark:bg-white/5">
          <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-sky-500 shadow-[0_0_0_5px_rgba(14,165,233,0.12)]" />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <p className="min-w-0 truncate text-sm font-semibold text-slate-950 dark:text-white">{item.title}</p>
              <span className="shrink-0 text-xs font-medium text-slate-400">{item.time}</span>
            </div>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-300">{item.detail}</p>
          </div>
        </div>
      ))}
    </div>
  )
})

const DataRow = memo(function DataRow({ label, value, badge }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-[1.15rem] border border-slate-100 bg-white/65 px-3 py-3 dark:border-white/10 dark:bg-white/5">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{label}</p>
        {badge ? <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-300">{badge}</p> : null}
      </div>
      <span className="shrink-0 text-sm font-semibold text-slate-700 dark:text-slate-200">{value}</span>
    </div>
  )
})

const DASHBOARD_RECENT_LIMIT = 50

export default function DashboardHomePage() {
  const currency = 'PKR'
  const invoicesApi = useInvoices({ limitCount: DASHBOARD_RECENT_LIMIT })
  const customersApi = useCustomers({ limitCount: DASHBOARD_RECENT_LIMIT })
  const leadsApi = useLeadScoring({ limitCount: DASHBOARD_RECENT_LIMIT })
  const activityApi = useActivityLogs({ limitCount: DASHBOARD_RECENT_LIMIT })
  const ticketsApi = useSupportTickets({ limitCount: DASHBOARD_RECENT_LIMIT })
  const expensesApi = useExpenses({ limitCount: DASHBOARD_RECENT_LIMIT })
  const { businessType } = useUser()
  const isSchool = normalizeBusinessType(businessType) === 'School ERP'
  const isProperty = normalizeBusinessType(businessType) === 'Property ERP'
  const maintenanceApi = useMaintenance({ enabled: isProperty })
  const contractsApi = useContracts({ enabled: isProperty })
  const propertyStats = useMemo(
    () => ({
      maintenance: maintenanceStats(maintenanceApi.requests),
      contracts: contractStats(contractsApi.contracts),
    }),
    [maintenanceApi.requests, contractsApi.contracts],
  )
  const propertyLoading = isProperty && (maintenanceApi.loading || contractsApi.loading)
  const isWhatsapp = normalizeBusinessType(businessType) === 'WhatsApp CRM'
  const whatsappContactsApi = useWhatsappContacts({ enabled: isWhatsapp })
  const whatsappLeadsApi = useWhatsappLeads({ enabled: isWhatsapp })
  const whatsappFollowUpsApi = useWhatsappFollowUps({ enabled: isWhatsapp })
  const whatsappStats = useMemo(
    () => ({
      contacts: contactStats(whatsappContactsApi.contacts),
      leads: leadStats(whatsappLeadsApi.leads),
      followUps: followUpStats(whatsappFollowUpsApi.followUps),
    }),
    [whatsappContactsApi.contacts, whatsappLeadsApi.leads, whatsappFollowUpsApi.followUps],
  )
  const whatsappLoading = isWhatsapp && (whatsappContactsApi.loading || whatsappLeadsApi.loading || whatsappFollowUpsApi.loading)
  const hero = dashboardHero(businessType)

  const loading =
    invoicesApi.loading ||
    customersApi.loading ||
    leadsApi.loading ||
    activityApi.loading ||
    ticketsApi.loading ||
    expensesApi.loading

  const paidInvoices = useMemo(() => invoicesApi.invoices.filter((invoice) => getInvoiceStatus(invoice) === 'paid'), [invoicesApi.invoices])
  const paidPayments = useMemo(() => invoicesApi.payments.filter(isPaidRecord), [invoicesApi.payments])
  const pendingInvoices = useMemo(
    () => invoicesApi.invoices.filter(isOutstandingInvoice),
    [invoicesApi.invoices],
  )
  const openTickets = useMemo(() => ticketsApi.tickets.filter(isOpenTicket), [ticketsApi.tickets])
  const hotLeads = useMemo(() => leadsApi.leads.filter((lead) => safeCount(lead.score) >= 80), [leadsApi.leads])
  const activeLeads = useMemo(() => leadsApi.leads.filter(isActivePipelineItem), [leadsApi.leads])

  // TODO: Replace recent-row calculations with workspaces/{workspaceId}/dashboardSummary/{businessType}.
  const dashboardStats = useMemo(
    () =>
      getDashboardStats({
        invoices: invoicesApi.invoices,
        payments: invoicesApi.payments,
        customers: customersApi.customers,
        leads: leadsApi.leads,
        expenses: expensesApi.expenses,
      }),
    [customersApi.customers, expensesApi.expenses, invoicesApi.invoices, invoicesApi.payments, leadsApi.leads],
  )
  const totalRevenueUsd = dashboardStats.totalRevenue
  const pendingRevenueUsd = useMemo(
    () => pendingInvoices.reduce((sum, invoice) => sum + invoiceBalanceDue(invoice), 0),
    [pendingInvoices],
  )
  const pipelineValuePkr = useMemo(
    () => calculatePipelineValue({ leads: leadsApi.leads, deals: [] }),
    [leadsApi.leads],
  )

  const conversionRate = useMemo(() => calculateConversionRate(leadsApi.leads), [leadsApi.leads])
  const hasAnyData =
    customersApi.customers.length ||
    invoicesApi.invoices.length ||
    leadsApi.leads.length ||
    ticketsApi.tickets.length ||
    expensesApi.expenses.length

  const revenueSeries = useMemo(() => {
    const grouped = new Map()
    const sourceRows = paidPayments.length ? paidPayments : paidInvoices
    sourceRows.forEach((invoice) => {
      const date = dateFromValue(invoice.paidAt || invoice.createdAt || invoice.dueDate)
      if (!date) return
      const label = date.toLocaleDateString('en-US', { month: 'short' })
      const amount = paymentValue(invoice) || toFiniteNumber(invoice.total ?? invoice.totalUsd)
      grouped.set(label, toFiniteNumber(grouped.get(label)) + amount)
    })

    const rows = Array.from(grouped.entries()).slice(-6)
    return rows.length
      ? rows.map(([label, value]) => ({ label, value }))
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((label) => ({ label, value: 0 }))
  }, [paidInvoices, paidPayments])

  const salesSeries = useMemo(() => {
    const total = paidInvoices.length
    return [
      { label: 'W1', value: Math.round(total * 0.22) },
      { label: 'W2', value: Math.round(total * 0.26) },
      { label: 'W3', value: Math.round(total * 0.24) },
      { label: 'W4', value: Math.max(0, total - Math.round(total * 0.72)) },
    ]
  }, [paidInvoices.length])

  const activityItems = useMemo(
    () =>
      activityApi.logs
        .map((log) => ({ log, type: activityType(log) }))
        .filter((item) => item.type)
        .slice(0, 5)
        .map(({ log, type }) => ({
          id: log.id,
          title: type,
          detail: safeText(log.description, 'Workspace activity recorded.'),
          time: safeText(log.createdAtLabel, 'Recent'),
        })),
    [activityApi.logs],
  )

  const kpis = useMemo(
    () => [
      {
        icon: HiOutlineCurrencyDollar,
        label: isSchool ? 'Monthly Fee Collection' : 'Revenue',
        value: formatCurrency(totalRevenueUsd, currency),
        helper: isSchool ? `${formatCompact(paidPayments.length || paidInvoices.length)} paid fee records` : `${formatCompact(paidPayments.length || paidInvoices.length)} paid records`,
        tone: 'sky',
        loading: invoicesApi.loading,
      },
      {
        icon: HiOutlineUserGroup,
        label: isSchool ? 'Total Students' : 'Customers',
        value: formatCompact(dashboardStats.totalCustomers),
        helper: isSchool ? 'Active students' : 'Active customers',
        tone: 'cyan',
        loading: customersApi.loading,
      },
      {
        icon: HiOutlineBolt,
        label: isSchool ? 'Pending Fees' : 'Leads Pipeline',
        value: formatCompact(dashboardStats.activeLeads),
        helper: isSchool ? formatCurrency(pendingRevenueUsd, currency) : `${formatCompact(hotLeads.length)} high intent leads`,
        tone: 'violet',
        loading: leadsApi.loading,
      },
      {
        icon: HiOutlineTicket,
        label: 'Support',
        value: formatCompact(openTickets.length),
        helper: 'Open or in-progress tickets',
        tone: 'emerald',
        loading: ticketsApi.loading,
      },
    ],
    [
      currency,
      customersApi.loading,
      dashboardStats.activeLeads,
      dashboardStats.totalCustomers,
      hotLeads.length,
      invoicesApi.loading,
      leadsApi.loading,
      openTickets.length,
      paidInvoices.length,
      paidPayments.length,
      ticketsApi.loading,
      totalRevenueUsd,
      isSchool,
      pendingRevenueUsd,
    ],
  )

  const invoiceRows = useMemo(
    () => [
      [isSchool ? 'Paid fee bills' : 'Paid invoices', formatCompact(paidInvoices.length), isSchool ? 'Closed fees' : 'Closed revenue'],
      [isSchool ? 'Pending fees' : 'Pending invoices', formatCompact(dashboardStats.pendingInvoices), formatCurrency(pendingRevenueUsd, currency)],
      [isSchool ? 'Total fee bills' : 'Total invoices', formatCompact(invoicesApi.invoices.length), 'Tracked in workspace'],
    ],
    [currency, dashboardStats.pendingInvoices, invoicesApi.invoices.length, isSchool, paidInvoices.length, pendingRevenueUsd],
  )

  const healthRows = useMemo(
    () => [
      { label: 'Customer coverage', value: customersApi.customers.length, max: Math.max(10, customersApi.customers.length), tone: 'bg-cyan-500' },
      { label: 'Lead momentum', value: activeLeads.length, max: Math.max(10, activeLeads.length), tone: 'bg-violet-500' },
      { label: 'Resolved support', value: Math.max(0, ticketsApi.tickets.length - openTickets.length), max: Math.max(1, ticketsApi.tickets.length), tone: 'bg-emerald-500' },
    ],
    [activeLeads.length, customersApi.customers.length, openTickets.length, ticketsApi.tickets.length],
  )

  const summaryRows = useMemo(
    () => [
      { icon: HiOutlineCheckCircle, label: isSchool ? 'Total Students' : 'Customers', value: formatCompact(dashboardStats.totalCustomers) },
      { icon: HiOutlineClock, label: isSchool ? 'Pending Fees' : 'Pending revenue', value: formatCurrency(pendingRevenueUsd, currency) },
      { icon: HiOutlineCurrencyDollar, label: 'Expenses', value: formatCurrency(dashboardStats.expenses, currency) },
      { icon: HiOutlineChartBar, label: 'Profit', value: formatCurrency(dashboardStats.profit, currency) },
      { icon: HiOutlineLifebuoy, label: 'Open support', value: formatCompact(openTickets.length) },
    ],
    [currency, dashboardStats.expenses, dashboardStats.profit, dashboardStats.totalCustomers, isSchool, openTickets.length, pendingRevenueUsd],
  )

  useEffect(() => {
    console.log('[Dashboard] loading', {
      loading,
      limitCount: DASHBOARD_RECENT_LIMIT,
      collections: ['invoices', 'payments', 'customers', 'leads', 'activityLogs', 'supportTickets', 'expenses'],
    })
  }, [loading])

  useEffect(() => {
    if (loading) return
    console.log('[Dashboard] recent data loaded', {
      invoices: invoicesApi.invoices.length,
      payments: invoicesApi.payments.length,
      customers: customersApi.customers.length,
      leads: leadsApi.leads.length,
      activityLogs: activityApi.logs.length,
      supportTickets: ticketsApi.tickets.length,
      expenses: expensesApi.expenses.length,
    })
  }, [
    activityApi.logs.length,
    customersApi.customers.length,
    expensesApi.expenses.length,
    invoicesApi.invoices.length,
    invoicesApi.payments.length,
    leadsApi.leads.length,
    loading,
    ticketsApi.tickets.length,
  ])

  useEffect(() => {
    if (loading) return
    console.log('[Dashboard] summary ready', {
      source: 'recent-limited-data',
      futureSummaryDoc: 'workspaces/{workspaceId}/dashboardSummary/{businessType}',
      totalRevenueUsd,
      customers: dashboardStats.totalCustomers,
      activeLeads: dashboardStats.activeLeads,
      openTickets: openTickets.length,
    })
  }, [dashboardStats.activeLeads, dashboardStats.totalCustomers, loading, openTickets.length, totalRevenueUsd])

  useEffect(() => {
    if (loading) return
    if (normalizeBusinessType(businessType) !== 'Retail / POS') return
    console.log('[Retail POS Dashboard Loaded]', {
      source: 'DashboardHome',
      businessType: normalizeBusinessType(businessType),
      invoices: invoicesApi.invoices.length,
      customers: customersApi.customers.length,
      expenses: expensesApi.expenses.length,
      totalRevenueUsd,
    })
  }, [businessType, customersApi.customers.length, expensesApi.expenses.length, invoicesApi.invoices.length, loading, totalRevenueUsd])

  // WhatsApp CRM gets a dedicated, green-themed dashboard instead of the shared
  // CRM layout. All hooks above still run; only the rendered output differs.
  if (isWhatsapp) {
    return (
      <WhatsappDashboard
        stats={whatsappStats}
        contacts={whatsappContactsApi.contacts}
        leads={whatsappLeadsApi.leads}
        followUps={whatsappFollowUpsApi.followUps}
        loading={whatsappLoading}
        businessTitle={hero.title}
      />
    )
  }

  return (
    <div className="crm-dashboard-page min-w-0 space-y-5">
      <section className="grid min-w-0 gap-4 lg:grid-cols-12">
        <Card className="relative rounded-[1.6rem] border-slate-200/80 bg-white/85 p-5 sm:p-6 lg:col-span-8">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 via-cyan-300 to-violet-400" />
          <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <Badge variant="purple">Executive Overview</Badge>
              <h1 className="mt-4 max-w-2xl text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                {hero.title}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-300">
                {hero.subtitle}
              </p>
            </div>
            <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:w-[22rem]">
              <div className="rounded-[1.15rem] border border-slate-100 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/5">
                <p className="text-xs font-medium text-slate-500">Pipeline value</p>
                <p className="mt-1 truncate text-lg font-semibold text-slate-950 dark:text-white">
                  {formatCurrency(pipelineValuePkr, currency)}
                </p>
              </div>
              <div className="rounded-[1.15rem] border border-slate-100 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/5">
                <p className="text-xs font-medium text-slate-500">Conversion rate</p>
                <p className="mt-1 truncate text-lg font-semibold text-slate-950 dark:text-white">
                  {formatPercentValue(conversionRate)}
                </p>
              </div>
            </div>
          </div>

          {!loading && !hasAnyData ? (
            <div className="mt-5 rounded-[1.25rem] border border-sky-100 bg-gradient-to-r from-sky-50 via-white to-violet-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-950">Add your first record</p>
                  <p className="mt-1 text-sm text-slate-600">{isSchool ? 'Start by adding students or creating fee bills.' : 'Start by adding customers or creating invoices.'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to="/app/customers"
                    className="focus-ring inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-100 hover:bg-sky-700"
                  >
                    <HiOutlinePlus className="h-4 w-4" /> {isSchool ? 'Add student' : 'Add customer'}
                  </Link>
                  <Link
                    to="/app/invoices"
                    className="focus-ring inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors duration-100 hover:border-sky-200"
                  >
                    {isSchool ? 'Create fee bill' : 'Create invoice'}
                  </Link>
                </div>
              </div>
            </div>
          ) : null}
        </Card>

        <Card className="rounded-[1.6rem] p-5 lg:col-span-4">
          <SectionTitle
            eyebrow="Workspace Health"
            title="Operational pulse"
            action={<Badge variant={loading ? 'default' : 'success'}>{loading ? 'Syncing' : 'Live Sync'}</Badge>}
          />
          <div className="mt-5 space-y-4">
            {loading ? (
              <LoadingBlock lines={4} />
            ) : (
              healthRows.map((row) => (
                <ProgressRow key={row.label} label={row.label} value={row.value} max={row.max} tone={row.tone} />
              ))
            )}
          </div>
        </Card>
      </section>

      <section className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <MetricCard key={kpi.label} {...kpi} />
        ))}
      </section>

      {isProperty ? (
        <section className="min-w-0 space-y-4">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Property ERP</p>
              <h2 className="mt-1 text-base font-semibold tracking-tight text-slate-950 dark:text-white">Leasing &amp; maintenance overview</h2>
            </div>
            <Badge variant={propertyLoading ? 'default' : 'success'}>{propertyLoading ? 'Syncing' : 'Live Sync'}</Badge>
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              icon={HiOutlineClipboardDocumentCheck}
              label="Active Contracts"
              value={formatCompact(propertyStats.contracts.active)}
              helper={`${formatCompact(propertyStats.contracts.draft)} draft`}
              tone="emerald"
              loading={propertyLoading}
            />
            <MetricCard
              icon={HiOutlineCalendarDays}
              label="Expiring Contracts"
              value={formatCompact(propertyStats.contracts.expiringSoon)}
              helper="Within next 30 days"
              tone="violet"
              loading={propertyLoading}
            />
            <MetricCard
              icon={HiOutlineBanknotes}
              label="Monthly Rent Expected"
              value={formatCurrency(propertyStats.contracts.monthlyRentExpected, currency)}
              helper="From active leases"
              tone="sky"
              loading={propertyLoading}
            />
            <MetricCard
              icon={HiOutlineWrenchScrewdriver}
              label="Open Maintenance"
              value={formatCompact(propertyStats.maintenance.pending)}
              helper={`${formatCompact(propertyStats.maintenance.completed)} completed`}
              tone="cyan"
              loading={propertyLoading}
            />
            <MetricCard
              icon={HiOutlineExclamationTriangle}
              label="Overdue Maintenance"
              value={formatCompact(propertyStats.maintenance.overdue)}
              helper="Past due date, still open"
              tone="violet"
              loading={propertyLoading}
            />
            <MetricCard
              icon={HiOutlineCurrencyDollar}
              label="Pending Maintenance Cost"
              value={formatCurrency(propertyStats.maintenance.pendingCost, currency)}
              helper="Unpaid balance on open jobs"
              tone="sky"
              loading={propertyLoading}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/app/contracts"
              className="focus-ring inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-100 hover:bg-sky-700"
            >
              <HiOutlineClipboardDocumentCheck className="h-4 w-4" /> Manage contracts
            </Link>
            <Link
              to="/app/maintenance"
              className="focus-ring inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors duration-100 hover:border-sky-200"
            >
              <HiOutlineWrenchScrewdriver className="h-4 w-4" /> Maintenance board
            </Link>
          </div>
        </section>
      ) : null}

      <section className="grid min-w-0 gap-5 lg:grid-cols-12">
        <Card className="rounded-[1.6rem] p-5 lg:col-span-7">
          <SectionTitle
            eyebrow={isSchool ? 'Fees Overview' : 'Revenue Overview'}
            title={isSchool ? 'Monthly fee collection trend' : 'Collected revenue trend'}
            action={<Badge variant="info">{formatCurrency(totalRevenueUsd, currency)}</Badge>}
          />
          <div className="mt-5">
            {invoicesApi.loading ? <LoadingBlock lines={5} className="min-h-44" /> : <MiniBars data={revenueSeries} color="bg-sky-500" />}
          </div>
        </Card>

        <Card className="rounded-[1.6rem] p-5 lg:col-span-5">
          <SectionTitle
            eyebrow={isSchool ? 'Billing Performance' : 'Sales Performance'}
            title={isSchool ? 'Weekly paid fee bills' : 'Weekly paid invoices'}
            action={<Badge variant="purple">{`${formatCompact(paidInvoices.length)} paid`}</Badge>}
          />
          <div className="mt-5">
            {invoicesApi.loading ? <LoadingBlock lines={5} className="min-h-44" /> : <MiniBars data={salesSeries} color="bg-violet-500" />}
          </div>
        </Card>
      </section>

      <section className="grid min-w-0 gap-5 lg:grid-cols-12">
        <Card className="rounded-[1.6rem] p-5 lg:col-span-4">
          <SectionTitle
            eyebrow={isSchool ? 'Students' : 'Customers'}
            title={isSchool ? 'Student snapshot' : 'Customer snapshot'}
            action={<Link to="/app/customers" className="text-xs font-semibold text-sky-700 hover:text-sky-900">View all</Link>}
          />
          <div className="mt-5 space-y-3">
            {customersApi.loading ? (
              <LoadingBlock lines={4} />
            ) : dashboardStats.totalCustomers ? (
              customersApi.customers.slice(0, 4).map((customer) => (
                <DataRow
                  key={customer.id}
                  label={safeText(customer.name)}
                  value={safeText(customer.status, 'Active')}
                  badge={safeText(customer.company, customer.email || (isSchool ? 'Student' : 'Customer'))}
                />
              ))
            ) : (
              <InlineEmpty title={isSchool ? 'No students yet' : 'No customers yet'} description={isSchool ? 'Start by adding students to build your School ERP view.' : 'Start by adding customers to build your CRM view.'} />
            )}
          </div>
        </Card>

        <Card className="rounded-[1.6rem] p-5 lg:col-span-4">
          <SectionTitle
            eyebrow="Leads Pipeline"
            title="Lead quality"
            action={<Link to="/app/leads" className="text-xs font-semibold text-sky-700 hover:text-sky-900">Open leads</Link>}
          />
          <div className="mt-5 space-y-4">
            {leadsApi.loading ? (
              <LoadingBlock lines={4} />
            ) : activeLeads.length ? (
              <>
                <ProgressRow label="Hot leads" value={hotLeads.length} max={leadsApi.leads.length} tone="bg-violet-500" />
                <ProgressRow label="Active leads" value={activeLeads.length} max={Math.max(10, leadsApi.leads.length)} tone="bg-sky-500" />
                <DataRow
                  label="Pipeline value"
                  value={formatCurrency(pipelineValuePkr, currency)}
                  badge="Open opportunity value"
                />
              </>
            ) : (
              <InlineEmpty title="No leads yet" description="Capture leads to see scoring and pipeline movement." />
            )}
          </div>
        </Card>

        <Card className="rounded-[1.6rem] p-5 lg:col-span-4">
          <SectionTitle
            eyebrow={isSchool ? 'Fees' : 'Invoices'}
            title="Billing status"
            action={<Link to="/app/invoices" className="text-xs font-semibold text-sky-700 hover:text-sky-900">Manage</Link>}
          />
          <div className="mt-5 space-y-3">
            {invoicesApi.loading ? (
              <LoadingBlock lines={4} />
            ) : invoicesApi.invoices.length ? (
              invoiceRows.map(([label, value, badge]) => <DataRow key={label} label={label} value={value} badge={badge} />)
            ) : (
              <InlineEmpty title={isSchool ? 'No fee bills yet' : 'No invoices yet'} description={isSchool ? 'Create fee bills to track paid fees and dues.' : 'Create invoices to track paid and pending revenue.'} />
            )}
          </div>
        </Card>
      </section>

      <section className="grid min-w-0 gap-5 lg:grid-cols-12">
        <Card className="rounded-[1.6rem] p-5 lg:col-span-5">
          <SectionTitle
            eyebrow="Support Tickets"
            title="Customer support"
            action={<Link to="/app/support" className="text-xs font-semibold text-sky-700 hover:text-sky-900">Support</Link>}
          />
          <div className="mt-5 space-y-3">
            {ticketsApi.loading ? (
              <LoadingBlock lines={4} />
            ) : ticketsApi.tickets.length ? (
              <>
                <DataRow label="Open tickets" value={formatCompact(openTickets.length)} badge="Needs attention" />
                <DataRow label="Resolved tickets" value={formatCompact(Math.max(0, ticketsApi.tickets.length - openTickets.length))} badge="Completed support work" />
                <DataRow label="Total tickets" value={formatCompact(ticketsApi.tickets.length)} badge="All support records" />
              </>
            ) : (
              <InlineEmpty title="No support tickets yet" description="Support tickets will appear here once customers need help." />
            )}
          </div>
        </Card>

        <Card className="rounded-[1.6rem] p-5 lg:col-span-4">
          <SectionTitle eyebrow="Quick Actions" title="Move work forward" />
          <div className="mt-5 grid gap-3">
            <QuickAction to="/app/customers" icon={HiOutlineUserGroup} title={isSchool ? 'Add student' : 'Add customer'} detail={isSchool ? 'Create a student profile' : 'Create a CRM account'} />
            {isSchool ? (
              <>
                <QuickAction to="/app/invoices" icon={HiOutlineDocumentText} title="Create fee bill" detail="Start fee billing" />
                <QuickAction to="/app/reports" icon={HiOutlineChartBar} title="Attendance Coming Soon" detail="Planned School ERP module" />
              </>
            ) : (
              <>
                <QuickAction to="/app/leads" icon={HiOutlineSparkles} title="Add lead" detail="Capture a new opportunity" />
                <QuickAction to="/app/invoices" icon={HiOutlineDocumentText} title="Create invoice" detail="Start billing flow" />
              </>
            )}
            <QuickAction to="/app/reports" icon={HiOutlineChartBar} title="Open reports" detail="Review performance" />
            {isSchool ? <QuickAction to="/app/reports" icon={HiOutlineSparkles} title="Exams Coming Soon" detail="Planned School ERP module" /> : null}
          </div>
        </Card>

        <Card className="rounded-[1.6rem] p-5 lg:col-span-3">
          <SectionTitle eyebrow="Workspace Health" title="Readiness" />
          <div className="mt-5 space-y-3">
            <DataRow
              label="Data setup"
              value={hasAnyData ? 'Active' : '0 records'}
              badge={hasAnyData ? 'Workspace has records' : isSchool ? 'Start with students or fee bills' : 'Start with customers or invoices'}
            />
            <DataRow
              label={isSchool ? 'Fee collection' : 'Revenue engine'}
              value={formatCurrency(totalRevenueUsd, currency)}
              badge={paidInvoices.length || paidPayments.length ? 'Paid records found' : isSchool ? 'Create fee bills to activate' : 'Create invoices to activate'}
            />
            <DataRow
              label="Support loop"
              value={formatCompact(ticketsApi.tickets.length)}
              badge={ticketsApi.tickets.length ? 'Ticket history is live' : 'Support records are empty'}
            />
          </div>
        </Card>
      </section>

      <section className="grid min-w-0 gap-5 lg:grid-cols-12">
        <Card className="rounded-[1.6rem] p-5 lg:col-span-8">
          <SectionTitle
            eyebrow="Recent Activity"
            title="Workspace timeline"
            action={<Badge variant="default">{`${formatCompact(activityItems.length)} updates`}</Badge>}
          />
          <div className="mt-5">
            {activityApi.loading ? <LoadingBlock lines={5} /> : <ActivityList items={activityItems} />}
          </div>
        </Card>

        <Card className="rounded-[1.6rem] p-5 lg:col-span-4">
          <SectionTitle eyebrow="Executive Summary" title="Today at a glance" />
          <div className="mt-5 space-y-3">
            {summaryRows.map((item) => (
              <div key={item.label} className="flex items-center gap-3 rounded-[1.15rem] border border-slate-100 bg-white/65 p-3 dark:border-white/10 dark:bg-white/5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-100">
                  <item.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{item.label}</p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-950 dark:text-white">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  )
}
