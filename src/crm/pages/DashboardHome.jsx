import { motion } from 'framer-motion'
import { useMemo } from 'react'
import {
  HiOutlineArrowTrendingUp,
  HiOutlineBolt,
  HiOutlineCalendarDays,
  HiOutlineCurrencyDollar,
  HiOutlineUserGroup,
} from 'react-icons/hi2'
import ActivityTimeline from '../components/dashboard/ActivityTimeline.jsx'
import StatCard from '../components/dashboard/StatCard.jsx'
import RevenueAreaChart from '../components/charts/RevenueAreaChart.jsx'
import SalesBarChart from '../components/charts/SalesBarChart.jsx'
import Card from '../components/ui/Card.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Table from '../components/ui/Table.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import { formatCompact, formatCurrency, toFiniteNumber } from '../utils/format.js'
import { usePreferences } from '../hooks/usePreferences.js'
import { convertFromUsd } from '../utils/currency.js'
import { useInvoices } from '../hooks/useInvoices.js'
import { useCustomers } from '../hooks/useCustomers.js'
import { useLeadScoring } from '../hooks/useLeadScoring.js'
import { useActivityLogs } from '../hooks/useActivityLogs.js'
import EmptyState from '../components/system/EmptyState.jsx'

function dateFromValue(value) {
  if (!value) return null
  if (typeof value?.toDate === 'function') return value.toDate()
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export default function DashboardHomePage() {
  const { currency } = usePreferences()
  const inv = useInvoices()
  const cust = useCustomers()
  const leadsApi = useLeadScoring()
  const activityApi = useActivityLogs()

  const paidInvoices = inv.invoices.filter((i) => (i.status || '') === 'Paid')
  const paidPayments = inv.payments.filter((p) => (p.paymentStatus || '') === 'Paid')
  const totalRevenueUsd = paidInvoices.reduce((sum, invoice) => sum + toFiniteNumber(invoice.totalUsd ?? invoice.total), 0)
  const pendingRevenueUsd = inv.invoices
    .filter((i) => (i.status || '') === 'Pending')
    .reduce((sum, invoice) => sum + toFiniteNumber(invoice.totalUsd ?? invoice.total), 0)

  const revenueData = useMemo(() => {
    const map = new Map()
    inv.invoices.forEach((invoice) => {
      const date = dateFromValue(invoice.createdAt || invoice.dueDate)
      if (!date) return
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      map.set(key, toFiniteNumber(map.get(key)) + toFiniteNumber(invoice.totalUsd ?? invoice.total))
    })
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([month, usd]) => ({
        month,
        revenue: convertFromUsd(usd, currency),
        _currency: currency,
      }))
  }, [inv.invoices, currency])

  const salesSeries = useMemo(() => {
    const total = paidPayments.length
    return [
      { week: 'W1', sales: Math.round(total * 0.22) },
      { week: 'W2', sales: Math.round(total * 0.26) },
      { week: 'W3', sales: Math.round(total * 0.24) },
      {
        week: 'W4',
        sales: Math.max(0, total - (Math.round(total * 0.22) + Math.round(total * 0.26) + Math.round(total * 0.24))),
      },
    ]
  }, [paidPayments.length])

  const activityTimeline = useMemo(
    () =>
      activityApi.logs.slice(0, 6).map((log) => ({
        id: log.id,
        title: `${log.module}: ${log.action}`,
        detail: log.description,
        time: log.createdAtLabel,
        badge: log.module,
      })),
    [activityApi.logs],
  )

  const customerColumns = [
    { key: 'name', header: 'Customer', cell: (row) => <div className="font-semibold">{row.name}</div> },
    { key: 'company', header: 'Company' },
    { key: 'email', header: 'Email' },
    { key: 'plan', header: 'Plan', cell: (row) => <Badge variant="info">{row.plan}</Badge> },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => {
        const variant = row.status === 'Active' ? 'success' : row.status === 'At Risk' ? 'warning' : 'purple'
        return <Badge variant={variant}>{row.status}</Badge>
      },
    },
    {
      key: 'spend',
      header: 'Spend',
      cell: (row) => (
        <span className="font-semibold">
          {formatCurrency(convertFromUsd(row.spend, currency), currency)}
        </span>
      ),
    },
  ]

  const summaryTiles = [
    { label: 'Paid invoices', value: formatCompact(paidInvoices.length), detail: 'Closed revenue records' },
    { label: 'Pending value', value: formatCurrency(convertFromUsd(pendingRevenueUsd, currency), currency), detail: 'Awaiting collection' },
    { label: 'Lead pool', value: formatCompact(leadsApi.leads.length), detail: 'Scoring and follow-up' },
  ]

  return (
    <motion.div
      className="min-w-0 space-y-5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      <PageHeader
        title="Dashboard"
        subtitle="A focused CRM command center for revenue, customers, leads, and activity."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="subtle" className="rounded-2xl">
              <HiOutlineCalendarDays className="text-lg" />
              This month
            </Button>
            <Button className="rounded-2xl">Create report</Button>
          </div>
        }
      />

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <Card className="relative p-5 sm:p-6">
          <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-sky-200/30 blur-3xl" />
          <div className="relative flex min-w-0 flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <Badge variant="purple">Executive overview</Badge>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                {formatCurrency(convertFromUsd(totalRevenueUsd, currency), currency)}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Total collected revenue across paid invoices, with live customer and lead context from your CRM workspace.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[26rem]">
              {summaryTiles.map((tile) => (
                <div key={tile.label} className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
                  <p className="text-xs font-semibold text-slate-500">{tile.label}</p>
                  <p className="mt-2 truncate text-lg font-semibold text-slate-950">{tile.value}</p>
                  <p className="mt-1 text-xs text-slate-500">{tile.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-950 dark:text-white">Workspace health</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Operational pulse</p>
            </div>
            <Badge variant="success">Live</Badge>
          </div>
          <div className="mt-5 grid gap-3">
            {[
              ['Customers', cust.customers.length],
              ['Payments', paidPayments.length],
              ['Activities', activityApi.logs.length],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2.5">
                <span className="text-sm font-medium text-slate-600">{label}</span>
                <span className="text-sm font-semibold text-slate-950">{formatCompact(value)}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={HiOutlineCurrencyDollar}
          label="Total Revenue"
          value={formatCurrency(convertFromUsd(totalRevenueUsd, currency), currency)}
          delta="+12.4%"
          tone="indigo"
        />
        <StatCard
          icon={HiOutlineUserGroup}
          label="Total Customers"
          value={formatCompact(cust.customers.length)}
          delta="+8.1%"
          tone="sky"
        />
        <StatCard
          icon={HiOutlineBolt}
          label="Active Leads"
          value={formatCompact(leadsApi.leads.length)}
          delta="+5.6%"
          tone="amber"
        />
        <StatCard
          icon={HiOutlineArrowTrendingUp}
          label="Monthly Sales"
          value={formatCompact(paidPayments.length)}
          delta="+10.2%"
          tone="emerald"
        />
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-950 dark:text-white">Revenue trend</p>
              <p className="text-xs text-slate-500 dark:text-slate-300">Last 6 months</p>
            </div>
            <Badge variant="purple">+12.4%</Badge>
          </div>
          <div className="mt-4">
            {revenueData.length ? (
              <RevenueAreaChart data={revenueData} currency={currency} />
            ) : (
              <EmptyState title="No revenue data" description="Create invoices to see revenue trend." />
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-950 dark:text-white">Sales cadence</p>
              <p className="text-xs text-slate-500 dark:text-slate-300">Weekly payment count</p>
            </div>
            <Badge variant="info">Weekly</Badge>
          </div>
          <div className="mt-4">
            <SalesBarChart data={salesSeries} />
          </div>
        </Card>
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-950 dark:text-white">Recent customers</p>
              <p className="text-xs text-slate-500 dark:text-slate-300">Newest accounts and spend</p>
            </div>
            <button className="focus-ring rounded-xl px-3 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-500/10">
              View all
            </button>
          </div>
          <div className="mt-4">
            {cust.loading ? (
              <div className="grid min-h-[10rem] place-items-center text-sm text-slate-600 dark:text-slate-300">
                Loading customers...
              </div>
            ) : cust.customers.length ? (
              <Table columns={customerColumns} rows={cust.customers.slice(0, 6).map((c) => ({ ...c, spend: c.spendUsd }))} />
            ) : (
              <EmptyState title="No customers yet" description="Create customers to see recent customer activity." />
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-950 dark:text-white">Activity stream</p>
              <p className="text-xs text-slate-500 dark:text-slate-300">Latest workspace updates</p>
            </div>
            <Badge variant="default">Live</Badge>
          </div>
          <div className="mt-5">
            {activityApi.loading ? (
              <div className="grid min-h-[10rem] place-items-center text-sm text-slate-600 dark:text-slate-300">
                Loading activity...
              </div>
            ) : activityTimeline.length ? (
              <ActivityTimeline items={activityTimeline} />
            ) : (
              <EmptyState title="No activity yet" description="Activity logs will appear here as actions occur." />
            )}
          </div>
        </Card>
      </div>
    </motion.div>
  )
}
