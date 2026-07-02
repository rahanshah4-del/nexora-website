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
  HiOutlineAcademicCap,
  HiOutlineCalendarDays,
  HiOutlineClipboardDocumentCheck,
  HiOutlineExclamationTriangle,
  HiOutlineWrenchScrewdriver,
  HiOutlineChatBubbleLeftRight,
  HiOutlineComputerDesktop,
  HiOutlinePresentationChartBar,
  HiOutlineReceiptPercent,
  HiOutlineShoppingBag,
  HiOutlineTableCells,
  HiOutlineDocumentChartBar,
  HiOutlineCube,
  HiOutlineCircleStack,
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
import { useAccountTransactions } from '../hooks/useAccountTransactions.js'
import { useMaintenance } from '../hooks/useMaintenance.js'
import { useContracts } from '../hooks/useContracts.js'
import { useWhatsappContacts } from '../hooks/useWhatsappContacts.js'
import { useWhatsappLeads } from '../hooks/useWhatsappLeads.js'
import { useWhatsappFollowUps } from '../hooks/useWhatsappFollowUps.js'
import { useWhatsappTemplates } from '../hooks/useWhatsappTemplates.js'
import { useWhatsappSettings } from '../hooks/useWhatsappSettings.js'
import { useBusinessSettings } from '../hooks/useBusinessSettings.js'
import { useProducts } from '../hooks/useProducts.js'
import { useInventoryTransactions } from '../hooks/useInventoryTransactions.js'
import { useInventoryStats } from '../hooks/useInventory.js'
import { usePosOrders } from '../hooks/usePosOrders.js'
import { usePosWalletPayments } from '../hooks/usePosWalletPayments.js'
import { useSchoolAttendanceSummary } from '../hooks/useSchoolAttendanceSummary.js'
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
import { contactStats, followUpStats, leadStats, templateStats } from '../lib/whatsappManual.js'
import { useSalesHubCollection } from '../hooks/useSalesHubCollection.js'
import { calculateDealMetrics, calculatePipelineMetrics, calculateProductMetrics, calculateTaskMetrics, safeNumber } from '../lib/salesCalculations.js'
import { restaurantDashboardMetrics, formatRestaurantCurrency } from '../lib/restaurantPosCalculations.js'
import { calculateRestaurantOrderSummary } from '../lib/restaurantReports.js'
import { calculateSchoolDashboardStats } from '../lib/schoolDashboardCalculations.js'
import { isWithinRestaurantBusinessDay, formatRestaurantBusinessWindow } from '../lib/restaurantBusinessDay.js'
import { loadRestaurantOrders } from '../data/restaurantOrders.js'
import { restaurantOrdersStorageKey } from '../data/restaurantOrders.js'
import { normalizeInvoiceOrders } from '../data/restaurantInvoiceOrders.js'
import { useLocalData } from '../hooks/useLocalData.js'

// Dashboard hero title/subtitle per business type (module). Falls back to a
// generic label for any unknown type. Only affects the hero header text.
const DASHBOARD_HERO = {
  'General CRM': {
    title: 'Nexora Sales Hub',
    subtitle: 'Manage leads, customers, sales, invoices, follow-ups, and business growth from one workspace.',
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

const hdToneMap = {
  sky: 'from-sky-500 via-blue-600 to-indigo-600 border-sky-200 shadow-sky-500/25',
  violet: 'from-violet-500 via-fuchsia-600 to-purple-700 border-violet-200 shadow-violet-500/25',
  cyan: 'from-cyan-400 via-sky-500 to-blue-600 border-cyan-200 shadow-cyan-500/25',
  emerald: 'from-emerald-500 via-teal-500 to-cyan-600 border-emerald-200 shadow-emerald-500/25',
  amber: 'from-amber-400 via-orange-500 to-rose-500 border-amber-200 shadow-orange-500/25',
  rose: 'from-rose-500 via-pink-600 to-fuchsia-700 border-rose-200 shadow-rose-500/25',
  slate: 'from-slate-700 via-slate-900 to-indigo-950 border-slate-300 shadow-slate-500/25',
}

function hdToneForText(text = '') {
  const value = String(text).toLowerCase()
  if (value.includes('fee') || value.includes('bill') || value.includes('invoice') || value.includes('revenue') || value.includes('payment') || value.includes('account')) return hdToneMap.amber
  if (value.includes('student') || value.includes('teacher') || value.includes('attendance') || value.includes('team') || value.includes('customer')) return hdToneMap.violet
  if (value.includes('report') || value.includes('dashboard') || value.includes('analytic') || value.includes('profit')) return hdToneMap.sky
  if (value.includes('support') || value.includes('whatsapp') || value.includes('parent')) return hdToneMap.emerald
  if (value.includes('order') || value.includes('kot') || value.includes('kitchen') || value.includes('table')) return hdToneMap.rose
  if (value.includes('expense') || value.includes('maintenance') || value.includes('lost') || value.includes('overdue')) return hdToneMap.slate
  return hdToneMap.cyan
}

function HdDashboardIcon({ icon: Icon, tone = hdToneMap.sky, className = 'h-10 w-10', iconClassName = 'h-5 w-5' }) {
  return (
    <span className={cn('nexora-hd-icon bg-gradient-to-br shadow-md', className, tone)}>
      <Icon className={iconClassName} />
    </span>
  )
}

const MetricCard = memo(function MetricCard({ icon: Icon, label, value, helper, tone = 'sky', loading = false }) {
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
            <HdDashboardIcon icon={Icon} tone={hdToneMap[tone] || hdToneForText(label)} />
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
      <HdDashboardIcon icon={Icon} tone={hdToneForText(`${title} ${detail} ${to}`)} />
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

const DASHBOARD_RECENT_LIMIT = 25

const restaurantQuickActions = [
  { title: 'New Order', detail: 'Start dine-in or takeaway', to: '/app/orders', icon: HiOutlineShoppingBag },
  { title: 'Open KOT', detail: 'Kitchen ticket queue', to: '/app/orders-kot', icon: HiOutlineClipboardDocumentCheck },
  { title: 'Floor View', detail: 'Tables and occupancy', to: '/app/tables', icon: HiOutlineTableCells },
  { title: 'Kitchen Display', detail: 'Live prep lanes', to: '/app/kitchen-display', icon: HiOutlineComputerDesktop },
  { title: 'Create Bill', detail: 'Checkout and invoice', to: '/app/invoices/create', icon: HiOutlineReceiptPercent },
]

function RestaurantDashboard({ workspaceName }) {
  const { invoices } = useInvoices({ limitCount: DASHBOARD_RECENT_LIMIT })
  const { settings } = useBusinessSettings()
  const { data: savedOrders } = useLocalData(loadRestaurantOrders, [restaurantOrdersStorageKey])
  const invoiceOrders = useMemo(() => normalizeInvoiceOrders(invoices), [invoices])
  const todaySimpleOrders = savedOrders.filter((order) => isWithinRestaurantBusinessDay(order.createdAt || order.date, settings))
  const todayInvoiceOrders = invoiceOrders.filter((order) => isWithinRestaurantBusinessDay(order.createdAt || order.date, settings))
  const todayOrders = [...todaySimpleOrders, ...todayInvoiceOrders]
  const businessDayLabel = formatRestaurantBusinessWindow(settings)
  const tableRows = Array.from(new Set(todaySimpleOrders.map((order) => order.table).filter(Boolean))).map((table) => ({ status: 'occupied', table }))
  const restaurantMetrics = restaurantDashboardMetrics({
    cartRows: todayOrders.flatMap((order) => order.cartRows || []),
    tables: tableRows,
    kotRows: todaySimpleOrders.map((order) => ({ status: String(order.orderStatus || '').toLowerCase() })),
    bills: todayOrders.map((order) => ({ status: String(order.paymentStatus || '').toLowerCase() })),
  })
  const restaurantSummary = calculateRestaurantOrderSummary(todayOrders)
  const todayRestaurantSales = restaurantSummary.totalSales
  const pendingKot = todaySimpleOrders.filter((order) => String(order.orderStatus || '').toLowerCase() === 'pending').length
  const preparingKot = todaySimpleOrders.filter((order) => String(order.orderStatus || '').toLowerCase() === 'preparing').length
  const readyKot = todaySimpleOrders.filter((order) => String(order.orderStatus || '').toLowerCase() === 'ready').length
  const restaurantStats = [
    { label: 'Today Orders', value: formatCompact(todaySimpleOrders.length), helper: `Business day: ${businessDayLabel}`, icon: HiOutlineShoppingBag, tone: 'sky' },
    { label: 'Invoice Orders', value: formatCompact(todayInvoiceOrders.length), helper: 'A4 invoice bills in business day', icon: HiOutlineDocumentText, tone: 'violet' },
    { label: 'Active KOT', value: formatCompact(restaurantMetrics.activeKot), helper: 'Kitchen tickets in progress', icon: HiOutlineClipboardDocumentCheck, tone: 'violet' },
    { label: 'Occupied Tables', value: `${restaurantMetrics.occupiedTables} / ${restaurantMetrics.totalTables}`, helper: 'Live floor occupancy', icon: HiOutlineTableCells, tone: 'cyan' },
    { label: 'Today Sales', value: formatRestaurantCurrency(todayRestaurantSales), helper: 'Simple + invoice order revenue', icon: HiOutlineCurrencyDollar, tone: 'emerald' },
    { label: 'Paid Amount', value: formatRestaurantCurrency(restaurantSummary.paidAmount), helper: 'Received payments today', icon: HiOutlineBanknotes, tone: 'emerald' },
    { label: 'Pending Bills', value: formatCompact(restaurantMetrics.pendingBills), helper: `${formatRestaurantCurrency(restaurantSummary.dueAmount)} due`, icon: HiOutlineReceiptPercent, tone: 'violet' },
    { label: 'Kitchen Ready', value: formatCompact(restaurantMetrics.kitchenReady), helper: 'Orders ready to serve', icon: HiOutlineCheckCircle, tone: 'sky' },
  ]

  return (
    <div className="min-w-0 space-y-5">
      <section className="crm-two-pane gap-4">
        <Card className="relative rounded-[1.6rem] border-slate-200/80 bg-white/90 p-5 sm:p-6">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-rose-400 to-sky-400" />
          <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <Badge variant="warning">Restaurant POS</Badge>
              <h1 className="mt-4 max-w-3xl text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                Restaurant Command Center
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-300">
                Manage orders, KOT flow, floor occupancy, kitchen readiness, bills, and daily sales from one restaurant workspace.
              </p>
            </div>
            <HdDashboardIcon icon={HiOutlinePresentationChartBar} tone={hdToneMap.amber} className="h-16 w-16 rounded-[1.35rem]" iconClassName="h-8 w-8" />
          </div>
          <div className="crm-auto-grid-sm mt-5 gap-3">
            {restaurantQuickActions.map((action) => (
              <QuickAction key={action.title} {...action} />
            ))}
          </div>
        </Card>

        <Card className="rounded-[1.6rem] p-5">
          <SectionTitle eyebrow="Live Shift" title={workspaceName || 'Restaurant floor'} action={<Badge variant="success">Live</Badge>} />
          <div className="mt-5 space-y-3">
            <DataRow label="Current service" value={todayOrders.length ? 'Active' : 'No orders'} badge="Live from saved orders" />
            <DataRow label="Occupied tables" value={restaurantMetrics.occupiedTables} badge="From dine-in orders" />
            <DataRow label="Avg prep time" value="0 min" badge="Updates when prep time is saved" />
            <DataRow label="Ready handoff" value={readyKot} badge="Serve now" />
          </div>
        </Card>
      </section>

      <section className="crm-auto-grid gap-4">
        {restaurantStats.map((stat) => (
          <MetricCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="grid min-w-0 gap-5 lg:grid-cols-12">
        <Card className="rounded-[1.6rem] p-5 lg:col-span-7">
          <SectionTitle eyebrow="Kitchen Flow" title="KOT status lanes" action={<Link to="/app/orders-kot" className="text-xs font-semibold text-sky-700 hover:text-sky-900">Open KOT</Link>} />
          <div className="crm-auto-grid-sm mt-5 gap-3">
            {[
              ['Pending', pendingKot, 'bg-amber-500'],
              ['Preparing', preparingKot, 'bg-sky-500'],
              ['Ready', readyKot, 'bg-emerald-500'],
            ].map(([label, value, tone]) => (
              <ProgressRow key={label} label={label} value={value} max={12} tone={tone} />
            ))}
          </div>
        </Card>
        <Card className="rounded-[1.6rem] p-5 lg:col-span-5">
          <SectionTitle eyebrow="Floor View" title="Table occupancy" action={<Link to="/app/tables" className="text-xs font-semibold text-sky-700 hover:text-sky-900">Floor view</Link>} />
          <div className="mt-5 space-y-3">
            <DataRow label="Occupied" value={restaurantMetrics.occupiedTables} badge="Active dine-in tables" />
            <DataRow label="Reserved" value="0" badge="No saved reservations" />
            <DataRow label="Cleaning" value="0" badge="No saved cleaning state" />
            <DataRow label="Available" value="0" badge="Use floor view to manage tables" />
          </div>
        </Card>
      </section>
    </div>
  )
}

function SchoolDashboard({
  workspaceName,
  loading,
  students,
  invoices,
  pendingInvoices,
  revenueSeries,
  invoiceRows,
  activityItems,
  activityLoading,
  invoicesLoading,
  customersLoading,
  totalRevenue,
  schoolStatsSummary,
  attendanceSummary,
  attendanceLoading,
  currency,
}) {
  const classRows = useMemo(() => {
    const map = new Map()
    students.forEach((student) => {
      const label = [student.className || student.class || student.grade, student.section].filter(Boolean).join(' - ') || 'Unassigned'
      map.set(label, (map.get(label) || 0) + 1)
    })
    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  }, [students])
  const collectionPct = Math.round(schoolStatsSummary.collectionRate || 0)
  const outstandingRows = pendingInvoices.slice(0, 4)
  const recentStudents = students.slice(0, 5)

  const schoolStats = [
    {
      icon: HiOutlineUserGroup,
      label: 'Total Students',
      value: formatCompact(students.length),
      helper: `${formatCompact(schoolStatsSummary.activeStudents)} active profiles`,
      tone: 'cyan',
      loading: customersLoading,
    },
    {
      icon: HiOutlineBanknotes,
      label: 'Fee Collection',
      value: formatCurrency(schoolStatsSummary.collected, currency),
      helper: `${formatCompact(schoolStatsSummary.collectedFeeRecords)} paid records`,
      tone: 'emerald',
      loading: invoicesLoading,
    },
    {
      icon: HiOutlineClock,
      label: 'Pending Fees',
      value: formatCurrency(schoolStatsSummary.pending, currency),
      helper: `${formatCompact(schoolStatsSummary.pendingFeeBills || pendingInvoices.length)} fee bills pending`,
      tone: 'violet',
      loading: invoicesLoading,
    },
    {
      icon: HiOutlineExclamationTriangle,
      label: 'Approval Rejected',
      value: formatCurrency(schoolStatsSummary.rejected, currency),
      helper: `${formatCompact(schoolStatsSummary.rejectedFeeBills)} rejected fee records`,
      tone: 'rose',
      loading: invoicesLoading,
    },
    {
      icon: HiOutlineDocumentText,
      label: 'Attendance',
      value: formatCompact(attendanceSummary.totalRecords),
      helper: `${attendanceSummary.presentRate}% present rate`,
      tone: 'sky',
      loading: attendanceLoading,
    },
  ]

  return (
    <div className="min-w-0 space-y-5">
      <section className="crm-two-pane gap-4">
        <Card className="relative overflow-hidden rounded-[1.6rem] border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400" />
          <div className="relative flex min-w-0 flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <Badge variant="info">School ERP</Badge>
              <h1 className="mt-4 max-w-3xl text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                {workspaceName || 'Nexora School'} Dashboard
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
                Students, attendance, fees, staff, and reporting in one school-focused command center.
              </p>
              <div className="crm-auto-grid-sm mt-5 gap-3">
                <QuickAction to="/app/customers" icon={HiOutlineUserGroup} title="Students" detail="Profiles & parents" />
                <QuickAction to="/app/attendance" icon={HiOutlineCalendarDays} title="Attendance" detail="Mark daily status" />
                <QuickAction to="/app/invoices" icon={HiOutlineBanknotes} title="Fees" detail="Billing & dues" />
                <QuickAction to="/app/school-reports" icon={HiOutlineDocumentChartBar} title="Reports" detail="PDF & 58mm print" />
              </div>
            </div>
            <HdDashboardIcon icon={HiOutlineAcademicCap} tone={hdToneMap.violet} className="h-20 w-20 rounded-[1.55rem]" iconClassName="h-10 w-10" />
          </div>
        </Card>

        <Card className="rounded-[1.6rem] border-slate-200/80 bg-gradient-to-br from-slate-950 to-indigo-950 p-5 text-white shadow-sm">
          <SectionTitle
            eyebrow="Today"
            title="School pulse"
            action={<Badge variant={loading ? 'default' : 'success'}>{loading ? 'Syncing' : 'Live'}</Badge>}
          />
          <div className="mt-5 space-y-3">
            <div className="rounded-[1.15rem] border border-white/10 bg-white/10 p-3">
              <p className="text-xs font-bold text-slate-300">Collection rate</p>
              <p className="mt-1 text-3xl font-black">{collectionPct}%</p>
              <div className="mt-3 h-2 rounded-full bg-white/10">
                <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${collectionPct}%` }} />
              </div>
            </div>
            <DataRow label="Paid fee bills" value={formatCompact(schoolStatsSummary.paidFeeBills)} badge="Closed fees" />
            <DataRow label="Pending fee bills" value={formatCompact(schoolStatsSummary.pendingFeeBills)} badge="Needs follow-up" />
            <DataRow label="Approved expenses" value={formatCurrency(schoolStatsSummary.approvedExpenses, currency)} badge="School operations" />
            <DataRow label="Net income" value={formatCurrency(schoolStatsSummary.netIncome, currency)} badge="Collection minus approved expenses" />
          </div>
        </Card>
      </section>

      <section className="crm-auto-grid gap-4">
        {schoolStats.map((stat) => (
          <MetricCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="grid min-w-0 gap-5 lg:grid-cols-12">
        <Card className="rounded-[1.6rem] p-5 lg:col-span-7">
          <SectionTitle
            eyebrow="Fees"
            title="Monthly collection trend"
            action={<Badge variant="info">{formatCurrency(totalRevenue, currency)}</Badge>}
          />
          <div className="mt-5">
            {invoicesLoading ? <LoadingBlock lines={5} className="min-h-44" /> : <MiniBars data={revenueSeries} color="bg-indigo-500" />}
          </div>
        </Card>

        <Card className="rounded-[1.6rem] p-5 lg:col-span-5">
          <SectionTitle
            eyebrow="Classes"
            title="Student distribution"
            action={<Link to="/app/customers" className="text-xs font-semibold text-sky-700 hover:text-sky-900">Manage students</Link>}
          />
          <div className="mt-5 space-y-3">
            {customersLoading ? (
              <LoadingBlock lines={4} />
            ) : classRows.length ? (
              classRows.map((row, index) => (
                <ProgressRow key={row.label} label={row.label} value={row.value} max={Math.max(1, students.length)} tone={index % 3 === 0 ? 'bg-indigo-500' : index % 3 === 1 ? 'bg-sky-500' : 'bg-emerald-500'} />
              ))
            ) : (
              <InlineEmpty title="No classes yet" description="Add student class details to activate this view." />
            )}
          </div>
        </Card>
      </section>

      <section className="grid min-w-0 gap-5 lg:grid-cols-12">
        <Card className="rounded-[1.6rem] p-5 lg:col-span-4">
          <SectionTitle eyebrow="Students" title="Recent admissions" action={<Link to="/app/customers" className="text-xs font-semibold text-sky-700 hover:text-sky-900">View all</Link>} />
          <div className="mt-5 space-y-3">
            {customersLoading ? (
              <LoadingBlock lines={4} />
            ) : recentStudents.length ? (
              recentStudents.map((student) => (
                <DataRow
                  key={student.id}
                  label={safeText(student.studentName || student.name, 'Student')}
                  value={safeText(student.status, 'Active')}
                  badge={[student.className || student.class || student.grade, student.section].filter(Boolean).join(' - ') || student.parentName || 'Student profile'}
                />
              ))
            ) : (
              <InlineEmpty title="No students yet" description="Create student profiles to activate the School ERP dashboard." />
            )}
          </div>
        </Card>

        <Card className="rounded-[1.6rem] p-5 lg:col-span-4">
          <SectionTitle eyebrow="Fees" title="Billing status" action={<Link to="/app/invoices" className="text-xs font-semibold text-sky-700 hover:text-sky-900">Manage fees</Link>} />
          <div className="mt-5 space-y-3">
            {invoicesLoading ? (
              <LoadingBlock lines={4} />
            ) : invoices.length ? (
              invoiceRows.map(([label, value, badge]) => <DataRow key={label} label={label} value={value} badge={badge} />)
            ) : (
              <InlineEmpty title="No fee bills yet" description="Create fee bills to track collection, dues, and reports." />
            )}
          </div>
        </Card>

        <Card className="rounded-[1.6rem] p-5 lg:col-span-4">
          <SectionTitle eyebrow="Attendance & Reports" title="Daily operations" />
          <div className="mt-5 space-y-4">
            <div className="grid gap-2 rounded-[1.2rem] border border-slate-100 bg-slate-50/80 p-3">
              <DataRow label="Student attendance" value={formatCompact(attendanceSummary.studentRecords)} badge={`${attendanceSummary.present} present`} />
              <DataRow label="Staff attendance" value={formatCompact(attendanceSummary.staffRecords)} badge={`${attendanceSummary.absent} absent / ${attendanceSummary.late} late`} />
            </div>
            <div className="grid gap-3">
              <QuickAction to="/app/attendance" icon={HiOutlineCalendarDays} title="Mark Attendance" detail="Students and staff" />
              <QuickAction to="/app/school-reports?report=student_attendance" icon={HiOutlineDocumentChartBar} title="Student Attendance Report" detail="Preview and PDF" />
              <QuickAction to="/app/school-reports?report=pending_fee" icon={HiOutlineClock} title="Pending Fee Report" detail="Track outstanding dues" />
              <QuickAction to="/app/school-reports?report=fee_collection" icon={HiOutlineBanknotes} title="Fee Collection Report" detail="Export PDF or print" />
            </div>
          </div>
        </Card>
      </section>

      <section className="grid min-w-0 gap-5 lg:grid-cols-12">
        <Card className="rounded-[1.6rem] p-5 lg:col-span-5">
          <SectionTitle eyebrow="Pending Dues" title="Fee follow-up list" action={<Link to="/app/school-reports?report=pending_fee" className="text-xs font-semibold text-sky-700 hover:text-sky-900">Open report</Link>} />
          <div className="mt-5 space-y-3">
            {invoicesLoading ? (
              <LoadingBlock lines={4} />
            ) : outstandingRows.length ? (
              outstandingRows.map((invoice) => (
                <DataRow
                  key={invoice.id}
                  label={safeText(invoice.studentName || invoice.customerName || invoice.name, 'Student')}
                  value={formatCurrency(invoiceBalanceDue(invoice), currency)}
                  badge={safeText(invoice.invoiceNumber || invoice.status, 'Pending fee')}
                />
              ))
            ) : (
              <InlineEmpty title="No pending fees" description="Outstanding dues will appear here when fee bills are unpaid." />
            )}
          </div>
        </Card>

        <Card className="rounded-[1.6rem] p-5 lg:col-span-4">
          <SectionTitle eyebrow="Academic Admin" title="Quick modules" />
          <div className="mt-5 grid gap-3">
            <QuickAction to="/app/team" icon={HiOutlineAcademicCap} title="Teachers & Staff" detail="Team management" />
            <QuickAction to="/app/notifications" icon={HiOutlineChatBubbleLeftRight} title="Parent Updates" detail="Notifications" />
            <QuickAction to="/app/accounts" icon={HiOutlineCurrencyDollar} title="Accounts" detail="School finance" />
          </div>
        </Card>

        <Card className="rounded-[1.6rem] p-5 lg:col-span-3">
          <SectionTitle eyebrow="Timeline" title="Recent activity" action={<Badge variant="default">{formatCompact(activityItems.length)}</Badge>} />
          <div className="mt-5">
            {activityLoading ? <LoadingBlock lines={4} /> : <ActivityList items={activityItems} />}
          </div>
        </Card>
      </section>
    </div>
  )
}

export default function DashboardHomePage() {
  const currency = 'PKR'
  const { businessType, workspaceDoc, userDoc } = useUser()
  const normalizedBusinessType = normalizeBusinessType(businessType)
  const isSchool = normalizedBusinessType === 'School ERP'
  const isProperty = normalizedBusinessType === 'Property ERP'
  const isWhatsapp = normalizedBusinessType === 'WhatsApp CRM'
  const isRestaurant = normalizedBusinessType === 'Restaurant POS'
  const isRetail = normalizedBusinessType === 'Retail / POS'
  const isSalesHub = normalizedBusinessType === 'General CRM'
  const isTransport = normalizedBusinessType === 'Transport / Rental'
  const useCommonDashboardData = !isWhatsapp && !isRestaurant && !isTransport
  const invoicesApi = useInvoices({ limitCount: DASHBOARD_RECENT_LIMIT, enabled: useCommonDashboardData })
  const customersApi = useCustomers({ limitCount: DASHBOARD_RECENT_LIMIT, enabled: useCommonDashboardData })
  const leadsApi = useLeadScoring({ limitCount: DASHBOARD_RECENT_LIMIT, enabled: isSalesHub })
  const activityApi = useActivityLogs({ limitCount: DASHBOARD_RECENT_LIMIT, enabled: useCommonDashboardData })
  const ticketsApi = useSupportTickets({ limitCount: DASHBOARD_RECENT_LIMIT, enabled: isSalesHub })
  const expensesApi = useExpenses({ limitCount: DASHBOARD_RECENT_LIMIT, enabled: useCommonDashboardData })
  const accountsApi = useAccountTransactions({ limitCount: DASHBOARD_RECENT_LIMIT, enabled: useCommonDashboardData })
  const schoolAttendanceApi = useSchoolAttendanceSummary({ enabled: isSchool })
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
  const showSalesPipeline = isSalesHub
  const showSupportMetrics = isSalesHub
  const retailProductsApi = useProducts({ enabled: isRetail, limitCount: DASHBOARD_RECENT_LIMIT })
  const retailTransactionsApi = useInventoryTransactions({ enabled: isRetail, limitCount: DASHBOARD_RECENT_LIMIT })
  const retailPosOrdersApi = usePosOrders({ enabled: isRetail, limitCount: DASHBOARD_RECENT_LIMIT })
  const retailWalletPaymentsApi = usePosWalletPayments({ enabled: isRetail, limitCount: DASHBOARD_RECENT_LIMIT })
  const retailInventoryStats = useInventoryStats(retailProductsApi.products, retailTransactionsApi.transactions)
  const retailPosSales = useMemo(
    () =>
      retailPosOrdersApi.orders.reduce((sum, order) => sum + toFiniteNumber(order.paidAmount), 0) +
      retailWalletPaymentsApi.payments.reduce((sum, payment) => sum + toFiniteNumber(payment.amount), 0),
    [retailPosOrdersApi.orders, retailWalletPaymentsApi.payments],
  )
  const retailLoading = isRetail && (retailProductsApi.loading || retailTransactionsApi.loading || retailPosOrdersApi.loading || retailWalletPaymentsApi.loading)
  const salesDealsApi = useSalesHubCollection('salesDeals', { enabled: isSalesHub })
  const salesTasksApi = useSalesHubCollection('salesTasks', { enabled: isSalesHub })
  const salesQuotesApi = useSalesHubCollection('salesQuotes', { enabled: isSalesHub })
  const salesProductsApi = useSalesHubCollection('salesProducts', { enabled: isSalesHub })
  const whatsappContactsApi = useWhatsappContacts({ enabled: isWhatsapp })
  const whatsappLeadsApi = useWhatsappLeads({ enabled: isWhatsapp })
  const whatsappFollowUpsApi = useWhatsappFollowUps({ enabled: isWhatsapp })
  const whatsappTemplatesApi = useWhatsappTemplates({ enabled: isWhatsapp })
  const whatsappSettingsApi = useWhatsappSettings({ enabled: isWhatsapp })
  const whatsappStats = useMemo(
    () => ({
      contacts: contactStats(whatsappContactsApi.contacts),
      leads: leadStats(whatsappLeadsApi.leads),
      followUps: followUpStats(whatsappFollowUpsApi.followUps),
      templates: templateStats(whatsappTemplatesApi.templates),
    }),
    [whatsappContactsApi.contacts, whatsappLeadsApi.leads, whatsappFollowUpsApi.followUps, whatsappTemplatesApi.templates],
  )
  const whatsappLoading =
    isWhatsapp &&
    (whatsappContactsApi.loading ||
      whatsappLeadsApi.loading ||
      whatsappFollowUpsApi.loading ||
      whatsappTemplatesApi.loading ||
      whatsappSettingsApi.loading)
  const hero = dashboardHero(businessType)

  const salesDealMetrics = useMemo(() => calculateDealMetrics(salesDealsApi.rows), [salesDealsApi.rows])
  const salesPipelineMetrics = useMemo(() => calculatePipelineMetrics(salesDealsApi.rows), [salesDealsApi.rows])
  const salesTaskMetrics = useMemo(() => calculateTaskMetrics(salesTasksApi.rows), [salesTasksApi.rows])
  const salesProductMetrics = useMemo(() => calculateProductMetrics(salesProductsApi.rows), [salesProductsApi.rows])
  const salesQuoteMetrics = useMemo(() => ({
    pending: salesQuotesApi.rows.filter((row) => ['Draft', 'Sent'].includes(row.status)).length,
    accepted: salesQuotesApi.rows.filter((row) => row.status === 'Accepted').length,
    byStatus: ['Draft', 'Sent', 'Accepted', 'Rejected', 'Expired'].map((status) => ({
      label: status,
      value: salesQuotesApi.rows.filter((row) => row.status === status).length,
    })),
  }), [salesQuotesApi.rows])
  const salesStageBreakdown = useMemo(() => {
    const stages = ['New Lead', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost']
    return stages.map((stage) => ({ label: stage, value: salesDealsApi.rows.filter((deal) => deal.stage === stage).length }))
  }, [salesDealsApi.rows])

  const loading =
    invoicesApi.loading ||
    customersApi.loading ||
    leadsApi.loading ||
    activityApi.loading ||
    ticketsApi.loading ||
    expensesApi.loading ||
    accountsApi.loading

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
        transactions: accountsApi.transactions,
        customers: customersApi.customers,
        leads: leadsApi.leads,
        expenses: expensesApi.expenses,
      }),
    [accountsApi.transactions, customersApi.customers, expensesApi.expenses, invoicesApi.invoices, invoicesApi.payments, leadsApi.leads],
  )
  const retailTotalRevenue = useMemo(
    () => dashboardStats.totalRevenue + retailPosSales,
    [dashboardStats.totalRevenue, retailPosSales],
  )
  const totalRevenueUsd = isRetail ? retailTotalRevenue : dashboardStats.totalRevenue
  const pendingRevenueUsd = useMemo(
    () => pendingInvoices.reduce((sum, invoice) => sum + invoiceBalanceDue(invoice), 0),
    [pendingInvoices],
  )
  const schoolStatsSummary = useMemo(
    () =>
      calculateSchoolDashboardStats({
        students: customersApi.customers,
        invoices: invoicesApi.invoices,
        payments: invoicesApi.payments,
        transactions: accountsApi.transactions,
        expenses: expensesApi.expenses,
        studentAttendance: schoolAttendanceApi.studentAttendance,
        staffAttendance: schoolAttendanceApi.staffAttendance,
      }),
    [
      accountsApi.transactions,
      customersApi.customers,
      expensesApi.expenses,
      invoicesApi.invoices,
      invoicesApi.payments,
      schoolAttendanceApi.staffAttendance,
      schoolAttendanceApi.studentAttendance,
    ],
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
        label: isSchool ? 'Total Students' : isRetail ? 'Products' : 'Customers',
        value: formatCompact(isRetail ? retailInventoryStats.totalProducts : dashboardStats.totalCustomers),
        helper: isSchool ? 'Active students' : isRetail ? `${formatCompact(retailInventoryStats.trackedProducts)} stock-tracked` : 'Active customers',
        tone: 'cyan',
        loading: isRetail ? retailProductsApi.loading : customersApi.loading,
      },
      {
        icon: isRetail ? HiOutlineCircleStack : HiOutlineBolt,
        label: isSchool ? 'Pending Fees' : showSalesPipeline ? 'Leads Pipeline' : isRetail ? 'Inventory Value' : 'Pending Billing',
        value: isRetail ? formatCurrency(retailInventoryStats.inventoryValue, currency) : isSchool || !showSalesPipeline ? formatCompact(dashboardStats.pendingInvoices) : formatCompact(dashboardStats.activeLeads),
        helper: isSchool
          ? formatCurrency(pendingRevenueUsd, currency)
          : showSalesPipeline
            ? `${formatCompact(hotLeads.length)} high intent leads`
            : isRetail
              ? `${formatCompact(retailInventoryStats.totalStock)} units on hand`
              : formatCurrency(pendingRevenueUsd, currency),
        tone: 'violet',
        loading: isRetail ? retailLoading : showSalesPipeline ? leadsApi.loading : invoicesApi.loading,
      },
      showSupportMetrics ? {
        icon: HiOutlineTicket,
        label: 'Support',
        value: formatCompact(openTickets.length),
        helper: 'Open or in-progress tickets',
        tone: 'emerald',
        loading: ticketsApi.loading,
      } : {
        icon: isRetail ? HiOutlineExclamationTriangle : HiOutlineDocumentText,
        label: isRetail ? 'Stock Alerts' : 'Expenses',
        value: isRetail ? formatCompact(retailInventoryStats.lowStockCount + retailInventoryStats.outOfStockCount) : formatCurrency(dashboardStats.expenses, currency),
        helper: isRetail ? `${formatCompact(retailInventoryStats.lowStockCount)} low / ${formatCompact(retailInventoryStats.outOfStockCount)} out` : `${formatCompact(expensesApi.expenses.length)} expense records`,
        tone: 'emerald',
        loading: isRetail ? retailLoading : expensesApi.loading,
      },
    ],
    [
      currency,
      customersApi.loading,
      dashboardStats.activeLeads,
      dashboardStats.expenses,
      dashboardStats.pendingInvoices,
      dashboardStats.totalCustomers,
      expensesApi.expenses.length,
      expensesApi.loading,
      hotLeads.length,
      invoicesApi.loading,
      leadsApi.loading,
      openTickets.length,
      paidInvoices.length,
      paidPayments.length,
      ticketsApi.loading,
      totalRevenueUsd,
      isSchool,
      isRetail,
      retailInventoryStats.inventoryValue,
      retailInventoryStats.lowStockCount,
      retailInventoryStats.outOfStockCount,
      retailInventoryStats.totalProducts,
      retailInventoryStats.totalStock,
      retailInventoryStats.trackedProducts,
      retailLoading,
      retailProductsApi.loading,
      showSupportMetrics,
      showSalesPipeline,
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
      {
        label: isRetail ? 'Product coverage' : 'Customer coverage',
        value: isRetail ? retailInventoryStats.totalProducts : customersApi.customers.length,
        max: Math.max(10, isRetail ? retailInventoryStats.totalProducts : customersApi.customers.length),
        tone: 'bg-cyan-500',
      },
      {
        label: showSalesPipeline ? 'Lead momentum' : isRetail ? 'Stock readiness' : 'Billing readiness',
        value: showSalesPipeline ? activeLeads.length : isRetail ? retailInventoryStats.totalStock : invoicesApi.invoices.length,
        max: Math.max(10, showSalesPipeline ? activeLeads.length : isRetail ? retailInventoryStats.totalStock : invoicesApi.invoices.length),
        tone: 'bg-violet-500',
      },
      showSupportMetrics
        ? { label: 'Resolved support', value: Math.max(0, ticketsApi.tickets.length - openTickets.length), max: Math.max(1, ticketsApi.tickets.length), tone: 'bg-emerald-500' }
        : {
            label: isRetail ? 'Healthy stock' : 'Expense tracking',
            value: isRetail ? Math.max(0, retailInventoryStats.trackedProducts - retailInventoryStats.lowStockCount - retailInventoryStats.outOfStockCount) : expensesApi.expenses.length,
            max: Math.max(10, isRetail ? retailInventoryStats.trackedProducts : expensesApi.expenses.length),
            tone: 'bg-emerald-500',
          },
    ],
    [
      activeLeads.length,
      customersApi.customers.length,
      expensesApi.expenses.length,
      invoicesApi.invoices.length,
      isRetail,
      openTickets.length,
      retailInventoryStats.lowStockCount,
      retailInventoryStats.outOfStockCount,
      retailInventoryStats.totalProducts,
      retailInventoryStats.totalStock,
      retailInventoryStats.trackedProducts,
      showSalesPipeline,
      showSupportMetrics,
      ticketsApi.tickets.length,
    ],
  )

  const summaryRows = useMemo(
    () => [
      { icon: isRetail ? HiOutlineCube : HiOutlineCheckCircle, label: isSchool ? 'Total Students' : isRetail ? 'Products' : 'Customers', value: formatCompact(isRetail ? retailInventoryStats.totalProducts : dashboardStats.totalCustomers) },
      { icon: HiOutlineClock, label: isSchool ? 'Pending Fees' : 'Pending revenue', value: formatCurrency(pendingRevenueUsd, currency) },
      { icon: HiOutlineCurrencyDollar, label: isRetail ? 'Inventory value' : 'Expenses', value: formatCurrency(isRetail ? retailInventoryStats.inventoryValue : dashboardStats.expenses, currency) },
      { icon: HiOutlineChartBar, label: isRetail ? 'Potential margin' : 'Profit', value: formatCurrency(isRetail ? retailInventoryStats.potentialMargin : dashboardStats.profit, currency) },
      showSupportMetrics
        ? { icon: HiOutlineLifebuoy, label: 'Open support', value: formatCompact(openTickets.length) }
        : { icon: HiOutlineDocumentText, label: 'Billing records', value: formatCompact(invoicesApi.invoices.length) },
    ],
    [
      currency,
      dashboardStats.expenses,
      dashboardStats.profit,
      dashboardStats.totalCustomers,
      invoicesApi.invoices.length,
      isRetail,
      isSchool,
      openTickets.length,
      pendingRevenueUsd,
      retailInventoryStats.inventoryValue,
      retailInventoryStats.potentialMargin,
      retailInventoryStats.totalProducts,
      showSupportMetrics,
    ],
  )

  useEffect(() => {
    if (!import.meta.env.DEV) return
    console.log('[Dashboard] loading', {
      loading,
      limitCount: DASHBOARD_RECENT_LIMIT,
      collections: ['invoices', 'payments', 'customers', 'leads', 'activityLogs', 'supportTickets', 'expenses'],
    })
  }, [loading])

  useEffect(() => {
    if (!import.meta.env.DEV) return
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
    if (!import.meta.env.DEV) return
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
    if (!import.meta.env.DEV) return
    if (loading) return
    if (normalizedBusinessType !== 'Retail / POS') return
    console.log('[Retail POS Dashboard Loaded]', {
      source: 'DashboardHome',
      businessType: normalizedBusinessType,
      invoices: invoicesApi.invoices.length,
      customers: customersApi.customers.length,
      expenses: expensesApi.expenses.length,
      totalRevenueUsd,
    })
  }, [customersApi.customers.length, expensesApi.expenses.length, invoicesApi.invoices.length, loading, normalizedBusinessType, totalRevenueUsd])

  // WhatsApp CRM gets a dedicated, green-themed dashboard instead of the shared
  // CRM layout. All hooks above still run; only the rendered output differs.
  if (isWhatsapp) {
    return (
      <WhatsappDashboard
        stats={whatsappStats}
        contacts={whatsappContactsApi.contacts}
        leads={whatsappLeadsApi.leads}
        followUps={whatsappFollowUpsApi.followUps}
        templates={whatsappTemplatesApi.templates}
        config={whatsappSettingsApi.config}
        loading={whatsappLoading}
        businessTitle={hero.title}
        workspaceName={workspaceDoc?.name || userDoc?.workspaceName || userDoc?.company || ''}
      />
    )
  }

  if (isRestaurant) {
    return <RestaurantDashboard workspaceName={workspaceDoc?.name || userDoc?.workspaceName || userDoc?.company || ''} />
  }

  if (isSchool) {
    return (
      <SchoolDashboard
        workspaceName={workspaceDoc?.name || userDoc?.workspaceName || userDoc?.company || ''}
        loading={loading}
        students={customersApi.customers}
        invoices={invoicesApi.invoices}
        pendingInvoices={pendingInvoices}
        revenueSeries={revenueSeries}
        invoiceRows={invoiceRows}
        activityItems={activityItems}
        activityLoading={activityApi.loading}
        invoicesLoading={invoicesApi.loading}
        customersLoading={customersApi.loading}
        totalRevenue={totalRevenueUsd}
        schoolStatsSummary={schoolStatsSummary}
        attendanceSummary={schoolAttendanceApi.summary}
        attendanceLoading={schoolAttendanceApi.loading}
        currency={currency}
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
                <p className="text-xs font-medium text-slate-500">{showSalesPipeline ? 'Pipeline value' : isRetail ? 'Inventory value' : 'Pending billing'}</p>
                <p className="mt-1 truncate text-lg font-semibold text-slate-950 dark:text-white">
                  {formatCurrency(showSalesPipeline ? pipelineValuePkr : isRetail ? retailInventoryStats.inventoryValue : pendingRevenueUsd, currency)}
                </p>
              </div>
              <div className="rounded-[1.15rem] border border-slate-100 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/5">
                <p className="text-xs font-medium text-slate-500">{showSalesPipeline ? 'Conversion rate' : isRetail ? 'Potential margin' : 'Paid records'}</p>
                <p className="mt-1 truncate text-lg font-semibold text-slate-950 dark:text-white">
                  {showSalesPipeline ? formatPercentValue(conversionRate) : isRetail ? formatCurrency(retailInventoryStats.potentialMargin, currency) : formatCompact(paidPayments.length || paidInvoices.length)}
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

      <section className="crm-auto-grid gap-4">
        {kpis.map((kpi) => (
          <MetricCard key={kpi.label} {...kpi} />
        ))}
      </section>

      {isSalesHub ? (
        <section className="min-w-0 space-y-4">
          <div className="crm-auto-grid gap-4">
            <MetricCard icon={HiOutlineChartBar} label="Expected Revenue" value={formatCurrency(salesDealMetrics.expectedRevenue, currency)} helper="Weighted deal forecast" loading={salesDealsApi.loading} />
            <MetricCard icon={HiOutlineCurrencyDollar} label="Won Revenue" value={formatCurrency(salesDealMetrics.wonValue, currency)} helper="Closed won deals" tone="emerald" loading={salesDealsApi.loading} />
            <MetricCard icon={HiOutlineExclamationTriangle} label="Lost Revenue" value={formatCurrency(salesDealMetrics.lostValue, currency)} helper="Closed lost deals" tone="violet" loading={salesDealsApi.loading} />
            <MetricCard icon={HiOutlineClock} label="Overdue Tasks" value={formatCompact(salesTaskMetrics.overdueTasks)} helper={`${salesTaskMetrics.completionRate}% completion rate`} tone="cyan" loading={salesTasksApi.loading} />
            <MetricCard icon={HiOutlineDocumentText} label="Pending Quotations" value={formatCompact(salesQuoteMetrics.pending)} helper={`${salesQuoteMetrics.accepted} accepted`} tone="sky" loading={salesQuotesApi.loading} />
          </div>
          <div className="crm-auto-grid gap-4">
            <Card className="rounded-[1.6rem] p-5">
              <SectionTitle eyebrow="Forecast" title="Revenue Forecast" />
              <div className="mt-4 space-y-3">
                <DataRow label="Pipeline Value" value={formatCurrency(salesPipelineMetrics.pipelineValue, currency)} />
                <DataRow label="Weighted Pipeline" value={formatCurrency(salesPipelineMetrics.weightedPipeline, currency)} />
                <DataRow label="Open Deals" value={formatCompact(salesDealMetrics.openDeals)} />
                <DataRow label="Catalog Avg Price" value={formatCurrency(salesProductMetrics.averagePrice, currency)} />
              </div>
            </Card>
            <Card className="rounded-[1.6rem] p-5">
              <SectionTitle eyebrow="Pipeline" title="Stage Breakdown" />
              <div className="mt-4">
                <MiniBars data={salesStageBreakdown} color="bg-blue-600" />
              </div>
            </Card>
            <Card className="rounded-[1.6rem] p-5">
              <SectionTitle eyebrow="Quotations" title="Status Breakdown" />
              <div className="mt-4">
                <MiniBars data={salesQuoteMetrics.byStatus} color="bg-emerald-500" />
              </div>
            </Card>
          </div>
          <div className="crm-auto-grid-lg gap-4">
            <Card className="rounded-[1.6rem] p-5">
              <SectionTitle eyebrow="Lead Conversion" title="Sales Funnel" />
              <div className="mt-4 space-y-3">
                <ProgressRow label="Leads" value={leadsApi.leads.length} max={Math.max(1, leadsApi.leads.length)} tone="bg-sky-500" />
                <ProgressRow label="Qualified Deals" value={salesDealsApi.rows.filter((deal) => ['Qualified', 'Proposal', 'Negotiation', 'Won'].includes(deal.stage)).length} max={Math.max(1, leadsApi.leads.length || salesDealsApi.rows.length)} tone="bg-blue-600" />
                <ProgressRow label="Won Deals" value={salesDealMetrics.wonDeals} max={Math.max(1, salesDealsApi.rows.length)} tone="bg-emerald-500" />
              </div>
            </Card>
            <Card className="rounded-[1.6rem] p-5">
              <SectionTitle eyebrow="Tasks" title="Priority Breakdown" />
              <div className="mt-4 space-y-3">
                {['High', 'Medium', 'Low'].map((priority) => (
                  <ProgressRow key={priority} label={priority} value={salesTasksApi.rows.filter((task) => task.priority === priority).length} max={Math.max(1, safeNumber(salesTasksApi.rows.length))} tone={priority === 'High' ? 'bg-rose-500' : priority === 'Medium' ? 'bg-amber-500' : 'bg-sky-500'} />
                ))}
              </div>
            </Card>
          </div>
        </section>
      ) : null}

      {isProperty ? (
        <section className="min-w-0 space-y-4">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Property ERP</p>
              <h2 className="mt-1 text-base font-semibold tracking-tight text-slate-950 dark:text-white">Leasing &amp; maintenance overview</h2>
            </div>
            <Badge variant={propertyLoading ? 'default' : 'success'}>{propertyLoading ? 'Syncing' : 'Live Sync'}</Badge>
          </div>
          <div className="crm-auto-grid gap-4">
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

        {showSalesPipeline ? (
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
        ) : (
          <Card className="rounded-[1.6rem] p-5 lg:col-span-4">
            <SectionTitle
              eyebrow="Finance"
              title="Receivables snapshot"
              action={<Link to="/app/invoices" className="text-xs font-semibold text-sky-700 hover:text-sky-900">Open billing</Link>}
            />
            <div className="mt-5 space-y-4">
              {invoicesApi.loading ? (
                <LoadingBlock lines={4} />
              ) : invoicesApi.invoices.length ? (
                <>
                  <ProgressRow label="Paid records" value={paidInvoices.length || paidPayments.length} max={Math.max(10, invoicesApi.invoices.length)} tone="bg-emerald-500" />
                  <ProgressRow label="Pending records" value={dashboardStats.pendingInvoices} max={Math.max(10, invoicesApi.invoices.length)} tone="bg-amber-500" />
                  <DataRow
                    label="Pending amount"
                    value={formatCurrency(pendingRevenueUsd, currency)}
                    badge="Outstanding billing"
                  />
                </>
              ) : (
                <InlineEmpty title="No billing records yet" description="Create invoices or bills to see receivables here." />
              )}
            </div>
          </Card>
        )}

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
        {showSupportMetrics ? (
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
        ) : (
          <Card className="rounded-[1.6rem] p-5 lg:col-span-5">
            <SectionTitle
              eyebrow="Operations"
              title={isRetail ? 'Retail stock calculation' : 'Billing control'}
              action={<Link to={isRetail ? '/app/inventory' : '/app/invoices'} className="text-xs font-semibold text-sky-700 hover:text-sky-900">{isRetail ? 'Inventory' : 'Billing'}</Link>}
            />
            <div className="mt-5 space-y-3">
              {invoicesApi.loading || expensesApi.loading || retailLoading ? (
                <LoadingBlock lines={4} />
              ) : isRetail ? (
                <>
                  <DataRow label="POS collected" value={formatCurrency(retailPosSales, currency)} badge={`${formatCompact(retailPosOrdersApi.orders.length)} orders + wallet settlements`} />
                  <DataRow label="Invoice sales" value={formatCurrency(dashboardStats.totalRevenue, currency)} badge="Invoice module separate" />
                  <DataRow label="Cost value" value={formatCurrency(retailInventoryStats.inventoryValue, currency)} badge={`${formatCompact(retailInventoryStats.totalStock)} units`} />
                  <DataRow label="Retail value" value={formatCurrency(retailInventoryStats.retailValue, currency)} badge="Selling price basis" />
                  <DataRow label="Potential margin" value={formatCurrency(retailInventoryStats.potentialMargin, currency)} badge={`${formatCompact(retailInventoryStats.lowStockCount + retailInventoryStats.outOfStockCount)} stock alerts`} />
                </>
              ) : (
                <>
                  <DataRow label="Paid records" value={formatCompact(paidInvoices.length || paidPayments.length)} badge="Collected billing" />
                  <DataRow label="Pending records" value={formatCompact(dashboardStats.pendingInvoices)} badge={formatCurrency(pendingRevenueUsd, currency)} />
                  <DataRow label="Expense records" value={formatCompact(expensesApi.expenses.length)} badge={formatCurrency(dashboardStats.expenses, currency)} />
                </>
              )}
            </div>
          </Card>
        )}

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
                {isRetail ? (
                  <QuickAction to="/app/inventory" icon={HiOutlineCube} title="Add product" detail="Update stock catalog" />
                ) : null}
                {showSalesPipeline ? (
                  <QuickAction to="/app/leads" icon={HiOutlineSparkles} title="Add lead" detail="Capture a new opportunity" />
                ) : null}
                <QuickAction to={isRetail ? '/app/pos' : '/app/invoices'} icon={HiOutlineDocumentText} title={isRetail ? 'POS billing' : 'Create invoice'} detail={isRetail ? 'Create a sales bill' : 'Start billing flow'} />
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
              label={showSupportMetrics ? 'Support loop' : 'Billing records'}
              value={formatCompact(showSupportMetrics ? ticketsApi.tickets.length : invoicesApi.invoices.length)}
              badge={
                showSupportMetrics
                  ? ticketsApi.tickets.length ? 'Ticket history is live' : 'Support records are empty'
                  : invoicesApi.invoices.length ? 'Billing history is live' : 'Billing records are empty'
              }
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
                <HdDashboardIcon icon={item.icon} tone={hdToneForText(item.label)} />
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
