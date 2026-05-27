import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { memo, useMemo } from 'react'
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
} from 'react-icons/hi2'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import SkeletonLoader from '../components/system/SkeletonLoader.jsx'
import { usePreferences } from '../hooks/usePreferences.js'
import { useInvoices } from '../hooks/useInvoices.js'
import { useCustomers } from '../hooks/useCustomers.js'
import { useLeadScoring } from '../hooks/useLeadScoring.js'
import { useActivityLogs } from '../hooks/useActivityLogs.js'
import { usePipelineDeals } from '../hooks/usePipelineDeals.js'
import { useSupportTickets } from '../hooks/useSupportTickets.js'
import { convertFromUsd } from '../utils/currency.js'
import { formatCompact, formatCurrency, formatPercentValue, toFiniteNumber } from '../utils/format.js'
import { cn } from '../utils/cn.js'

function dateFromValue(value) {
  if (!value) return null
  if (typeof value?.toDate === 'function') return value.toDate()
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function safeText(value, fallback = 'No data yet') {
  const text = typeof value === 'string' ? value.trim() : ''
  return text || fallback
}

function safeCount(value) {
  return Math.max(0, toFiniteNumber(value))
}

function isPaid(item) {
  return String(item?.status || item?.paymentStatus || '').toLowerCase() === 'paid'
}

function isOpenTicket(ticket) {
  const status = String(ticket?.status || '').toLowerCase()
  return status === 'open' || status === 'in progress'
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

const InlineEmpty = memo(function InlineEmpty({ title = 'No data yet', description = 'Start by adding customers or creating invoices.' }) {
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
    return <InlineEmpty title="No data yet" description="Create invoices or leads to activate this chart." />
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
      className="group flex min-w-0 items-center gap-3 rounded-[1.15rem] border border-slate-100 bg-white/70 p-3 transition-colors duration-150 hover:border-sky-100 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-950 text-white transition group-hover:bg-sky-700">
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

export default function DashboardHomePage() {
  const { currency } = usePreferences()
  const invoicesApi = useInvoices()
  const customersApi = useCustomers()
  const leadsApi = useLeadScoring()
  const activityApi = useActivityLogs()
  const pipelineApi = usePipelineDeals()
  const ticketsApi = useSupportTickets()

  const loading =
    invoicesApi.loading ||
    customersApi.loading ||
    leadsApi.loading ||
    activityApi.loading ||
    pipelineApi.loading ||
    ticketsApi.loading

  const paidInvoices = useMemo(() => invoicesApi.invoices.filter(isPaid), [invoicesApi.invoices])
  const paidPayments = useMemo(() => invoicesApi.payments.filter(isPaid), [invoicesApi.payments])
  const pendingInvoices = useMemo(
    () => invoicesApi.invoices.filter((invoice) => String(invoice.status || '').toLowerCase() === 'pending'),
    [invoicesApi.invoices],
  )
  const openTickets = useMemo(() => ticketsApi.tickets.filter(isOpenTicket), [ticketsApi.tickets])
  const hotLeads = useMemo(() => leadsApi.leads.filter((lead) => safeCount(lead.score) >= 80), [leadsApi.leads])

  const totalRevenueUsd = useMemo(
    () => {
      const sourceRows = paidPayments.length ? paidPayments : paidInvoices
      return sourceRows.reduce((sum, item) => sum + toFiniteNumber(item.amountUsd ?? item.amount ?? item.totalUsd ?? item.total), 0)
    },
    [paidInvoices, paidPayments],
  )
  const pendingRevenueUsd = useMemo(
    () => pendingInvoices.reduce((sum, invoice) => sum + toFiniteNumber(invoice.totalUsd ?? invoice.total), 0),
    [pendingInvoices],
  )
  const pipelineValueUsd = useMemo(
    () => pipelineApi.deals.reduce((sum, deal) => sum + toFiniteNumber(deal.dealValueUsd ?? deal.dealValue), 0),
    [pipelineApi.deals],
  )

  const conversionRate = leadsApi.leads.length ? (hotLeads.length / leadsApi.leads.length) * 100 : 0
  const hasAnyData =
    customersApi.customers.length ||
    invoicesApi.invoices.length ||
    leadsApi.leads.length ||
    pipelineApi.deals.length ||
    ticketsApi.tickets.length

  const revenueSeries = useMemo(() => {
    const grouped = new Map()
    const sourceRows = paidPayments.length ? paidPayments : paidInvoices
    sourceRows.forEach((invoice) => {
      const date = dateFromValue(invoice.paidAt || invoice.createdAt || invoice.dueDate)
      if (!date) return
      const label = date.toLocaleDateString('en-US', { month: 'short' })
      grouped.set(label, toFiniteNumber(grouped.get(label)) + toFiniteNumber(invoice.amountUsd ?? invoice.amount ?? invoice.totalUsd ?? invoice.total))
    })

    const rows = Array.from(grouped.entries()).slice(-6)
    return rows.length
      ? rows.map(([label, value]) => ({ label, value: convertFromUsd(value, currency) }))
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((label) => ({ label, value: 0 }))
  }, [currency, paidInvoices, paidPayments])

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
      activityApi.logs.slice(0, 5).map((log) => ({
        id: log.id,
        title: `${safeText(log.module, 'System')}: ${safeText(log.action, 'Activity')}`,
        detail: safeText(log.description, 'Workspace activity recorded.'),
        time: safeText(log.createdAtLabel, 'Recent'),
      })),
    [activityApi.logs],
  )

  const kpis = useMemo(
    () => [
      {
        icon: HiOutlineCurrencyDollar,
        label: 'Revenue',
        value: totalRevenueUsd > 0 ? formatCurrency(convertFromUsd(totalRevenueUsd, currency), currency) : 'No data yet',
        helper: totalRevenueUsd > 0 ? 'Collected from paid invoices' : 'Start by creating invoices',
        tone: 'sky',
        loading: invoicesApi.loading,
      },
      {
        icon: HiOutlineUserGroup,
        label: 'Customers',
        value: customersApi.customers.length ? formatCompact(customersApi.customers.length) : 'No data yet',
        helper: customersApi.customers.length ? 'Active customer workspace' : 'Add your first customer',
        tone: 'cyan',
        loading: customersApi.loading,
      },
      {
        icon: HiOutlineBolt,
        label: 'Leads Pipeline',
        value: leadsApi.leads.length ? formatCompact(leadsApi.leads.length) : 'No data yet',
        helper: leadsApi.leads.length ? `${formatCompact(hotLeads.length)} high intent leads` : 'Capture leads to score them',
        tone: 'violet',
        loading: leadsApi.loading,
      },
      {
        icon: HiOutlineTicket,
        label: 'Support',
        value: ticketsApi.tickets.length ? formatCompact(openTickets.length) : 'No data yet',
        helper: ticketsApi.tickets.length ? 'Open or in-progress tickets' : 'Support tickets will appear here',
        tone: 'emerald',
        loading: ticketsApi.loading,
      },
    ],
    [
      currency,
      customersApi.customers.length,
      customersApi.loading,
      hotLeads.length,
      invoicesApi.loading,
      leadsApi.leads.length,
      leadsApi.loading,
      openTickets.length,
      ticketsApi.loading,
      ticketsApi.tickets.length,
      totalRevenueUsd,
    ],
  )

  const invoiceRows = useMemo(
    () => [
      ['Paid invoices', formatCompact(paidInvoices.length), 'Closed revenue'],
      ['Pending invoices', formatCompact(pendingInvoices.length), formatCurrency(convertFromUsd(pendingRevenueUsd, currency), currency)],
      ['Total invoices', formatCompact(invoicesApi.invoices.length), invoicesApi.invoices.length ? 'Tracked in workspace' : 'No data yet'],
    ],
    [currency, invoicesApi.invoices.length, paidInvoices.length, pendingInvoices.length, pendingRevenueUsd],
  )

  const healthRows = useMemo(
    () => [
      { label: 'Customer coverage', value: customersApi.customers.length, max: Math.max(10, customersApi.customers.length), tone: 'bg-cyan-500' },
      { label: 'Lead momentum', value: leadsApi.leads.length, max: Math.max(10, leadsApi.leads.length), tone: 'bg-violet-500' },
      { label: 'Resolved support', value: Math.max(0, ticketsApi.tickets.length - openTickets.length), max: Math.max(1, ticketsApi.tickets.length), tone: 'bg-emerald-500' },
    ],
    [customersApi.customers.length, leadsApi.leads.length, openTickets.length, ticketsApi.tickets.length],
  )

  const summaryRows = useMemo(
    () => [
      { icon: HiOutlineCheckCircle, label: 'Customers', value: customersApi.customers.length ? formatCompact(customersApi.customers.length) : 'No data yet' },
      { icon: HiOutlineClock, label: 'Pending revenue', value: pendingRevenueUsd > 0 ? formatCurrency(convertFromUsd(pendingRevenueUsd, currency), currency) : 'No data yet' },
      { icon: HiOutlineLifebuoy, label: 'Open support', value: ticketsApi.tickets.length ? formatCompact(openTickets.length) : 'No data yet' },
    ],
    [currency, customersApi.customers.length, openTickets.length, pendingRevenueUsd, ticketsApi.tickets.length],
  )

  return (
    <motion.div
      className="min-w-0 space-y-5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
    >
      <section className="grid min-w-0 gap-4 lg:grid-cols-12">
        <Card className="relative rounded-[1.6rem] border-slate-200/80 bg-white/85 p-5 sm:p-6 lg:col-span-8">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 via-cyan-300 to-violet-400" />
          <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <Badge variant="purple">Executive Overview</Badge>
              <h1 className="mt-4 max-w-2xl text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                CRM command center
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-300">
                Revenue, customers, leads, invoices, and support health in one clean workspace view.
              </p>
            </div>
            <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:w-[22rem]">
              <div className="rounded-[1.15rem] border border-slate-100 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/5">
                <p className="text-xs font-medium text-slate-500">Pipeline value</p>
                <p className="mt-1 truncate text-lg font-semibold text-slate-950 dark:text-white">
                  {pipelineValueUsd > 0 ? formatCurrency(convertFromUsd(pipelineValueUsd, currency), currency) : 'No data yet'}
                </p>
              </div>
              <div className="rounded-[1.15rem] border border-slate-100 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/5">
                <p className="text-xs font-medium text-slate-500">Conversion rate</p>
                <p className="mt-1 truncate text-lg font-semibold text-slate-950 dark:text-white">
                  {leadsApi.leads.length ? formatPercentValue(conversionRate) : 'No data yet'}
                </p>
              </div>
            </div>
          </div>

          {!loading && !hasAnyData ? (
            <div className="mt-5 rounded-[1.25rem] border border-sky-100 bg-gradient-to-r from-sky-50 via-white to-violet-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-950">No data yet</p>
                  <p className="mt-1 text-sm text-slate-600">Start by adding customers or creating invoices.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to="/app/customers"
                    className="focus-ring inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-sky-700"
                  >
                    <HiOutlinePlus className="h-4 w-4" /> Add customer
                  </Link>
                  <Link
                    to="/app/invoices"
                    className="focus-ring inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors duration-150 hover:border-sky-200"
                  >
                    Create invoice
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

      <section className="grid min-w-0 gap-5 lg:grid-cols-12">
        <Card className="rounded-[1.6rem] p-5 lg:col-span-7">
          <SectionTitle
            eyebrow="Revenue Overview"
            title="Collected revenue trend"
            action={<Badge variant="info">{totalRevenueUsd > 0 ? formatCurrency(convertFromUsd(totalRevenueUsd, currency), currency) : 'No data yet'}</Badge>}
          />
          <div className="mt-5">
            {invoicesApi.loading ? <LoadingBlock lines={5} className="min-h-44" /> : <MiniBars data={revenueSeries} color="bg-sky-500" />}
          </div>
        </Card>

        <Card className="rounded-[1.6rem] p-5 lg:col-span-5">
          <SectionTitle
            eyebrow="Sales Performance"
            title="Weekly paid invoices"
            action={<Badge variant="purple">{paidInvoices.length ? `${formatCompact(paidInvoices.length)} paid` : 'No data yet'}</Badge>}
          />
          <div className="mt-5">
            {invoicesApi.loading ? <LoadingBlock lines={5} className="min-h-44" /> : <MiniBars data={salesSeries} color="bg-violet-500" />}
          </div>
        </Card>
      </section>

      <section className="grid min-w-0 gap-5 lg:grid-cols-12">
        <Card className="rounded-[1.6rem] p-5 lg:col-span-4">
          <SectionTitle
            eyebrow="Customers"
            title="Customer snapshot"
            action={<Link to="/app/customers" className="text-xs font-semibold text-sky-700 hover:text-sky-900">View all</Link>}
          />
          <div className="mt-5 space-y-3">
            {customersApi.loading ? (
              <LoadingBlock lines={4} />
            ) : customersApi.customers.length ? (
              customersApi.customers.slice(0, 4).map((customer) => (
                <DataRow
                  key={customer.id}
                  label={safeText(customer.name)}
                  value={safeText(customer.status, 'Active')}
                  badge={safeText(customer.company, customer.email || 'Customer')}
                />
              ))
            ) : (
              <InlineEmpty title="No data yet" description="Start by adding customers to build your CRM view." />
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
            ) : leadsApi.leads.length ? (
              <>
                <ProgressRow label="Hot leads" value={hotLeads.length} max={leadsApi.leads.length} tone="bg-violet-500" />
                <ProgressRow label="Pipeline deals" value={pipelineApi.deals.length} max={Math.max(10, pipelineApi.deals.length)} tone="bg-sky-500" />
                <DataRow
                  label="Pipeline value"
                  value={pipelineValueUsd > 0 ? formatCurrency(convertFromUsd(pipelineValueUsd, currency), currency) : 'No data yet'}
                  badge="Open opportunity value"
                />
              </>
            ) : (
              <InlineEmpty title="No data yet" description="Capture leads to see scoring and pipeline movement." />
            )}
          </div>
        </Card>

        <Card className="rounded-[1.6rem] p-5 lg:col-span-4">
          <SectionTitle
            eyebrow="Invoices"
            title="Billing status"
            action={<Link to="/app/invoices" className="text-xs font-semibold text-sky-700 hover:text-sky-900">Manage</Link>}
          />
          <div className="mt-5 space-y-3">
            {invoicesApi.loading ? (
              <LoadingBlock lines={4} />
            ) : invoicesApi.invoices.length ? (
              invoiceRows.map(([label, value, badge]) => <DataRow key={label} label={label} value={value} badge={badge} />)
            ) : (
              <InlineEmpty title="No data yet" description="Create invoices to track paid and pending revenue." />
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
              <InlineEmpty title="No data yet" description="Support tickets will appear here once customers need help." />
            )}
          </div>
        </Card>

        <Card className="rounded-[1.6rem] p-5 lg:col-span-4">
          <SectionTitle eyebrow="Quick Actions" title="Move work forward" />
          <div className="mt-5 grid gap-3">
            <QuickAction to="/app/customers" icon={HiOutlineUserGroup} title="Add customer" detail="Create a CRM account" />
            <QuickAction to="/app/leads" icon={HiOutlineSparkles} title="Add lead" detail="Capture a new opportunity" />
            <QuickAction to="/app/invoices" icon={HiOutlineDocumentText} title="Create invoice" detail="Start billing flow" />
            <QuickAction to="/app/reports" icon={HiOutlineChartBar} title="Open reports" detail="Review performance" />
          </div>
        </Card>

        <Card className="rounded-[1.6rem] p-5 lg:col-span-3">
          <SectionTitle eyebrow="Workspace Health" title="Readiness" />
          <div className="mt-5 space-y-3">
            <DataRow
              label="Data setup"
              value={hasAnyData ? 'Active' : 'No data yet'}
              badge={hasAnyData ? 'Workspace has records' : 'Start with customers or invoices'}
            />
            <DataRow
              label="Revenue engine"
              value={paidInvoices.length ? 'Live Sync' : 'No data yet'}
              badge={paidInvoices.length ? 'Paid invoices found' : 'Create invoices to activate'}
            />
            <DataRow
              label="Support loop"
              value={ticketsApi.tickets.length ? 'Tracked' : 'No data yet'}
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
            action={<Badge variant="default">{activityItems.length ? `${formatCompact(activityItems.length)} updates` : 'No data yet'}</Badge>}
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
    </motion.div>
  )
}
