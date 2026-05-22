import { motion } from 'framer-motion'
import {
  HiOutlineArrowTrendingUp,
  HiOutlineBolt,
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
import { formatCompact, formatCurrency } from '../utils/format.js'
import { usePreferences } from '../hooks/usePreferences.js'
import { convertFromUsd } from '../utils/currency.js'
import { useInvoices } from '../hooks/useInvoices.js'
import { useCustomers } from '../hooks/useCustomers.js'
import { useLeadScoring } from '../hooks/useLeadScoring.js'
import { useActivityLogs } from '../hooks/useActivityLogs.js'
import EmptyState from '../components/system/EmptyState.jsx'
import { useMemo } from 'react'

export default function DashboardHomePage() {
  const { currency } = usePreferences()
  const inv = useInvoices()
  const cust = useCustomers()
  const leadsApi = useLeadScoring()
  const activityApi = useActivityLogs()

  const totalRevenueUsd = inv.invoices.filter((i) => (i.status || '') === 'Paid').reduce((s, i) => s + Number(i.totalUsd ?? i.total ?? 0), 0)
  const revenueData = useMemo(() => {
    const map = new Map()
    inv.invoices.forEach((i) => {
      const raw = i.createdAt
      const d =
        typeof raw?.toDate === 'function'
          ? raw.toDate()
          : typeof raw === 'string' || typeof raw === 'number'
            ? new Date(raw)
            : null
      const dt = d && !Number.isNaN(d.getTime()) ? d : null
      if (!dt) return
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
      map.set(key, (map.get(key) || 0) + Number(i.totalUsd ?? i.total ?? 0))
    })
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([month, usd]) => ({ month, revenue: convertFromUsd(usd, currency), _currency: currency }))
  }, [inv.invoices, currency])

  const salesSeries = useMemo(() => {
    // Simple weekly placeholder from payments count; avoids demo data.
    const paid = inv.payments.filter((p) => (p.paymentStatus || '') === 'Paid')
    const total = paid.length
    return [
      { week: 'W1', sales: Math.round(total * 0.22) },
      { week: 'W2', sales: Math.round(total * 0.26) },
      { week: 'W3', sales: Math.round(total * 0.24) },
      { week: 'W4', sales: Math.max(0, total - (Math.round(total * 0.22) + Math.round(total * 0.26) + Math.round(total * 0.24))) },
    ]
  }, [inv.payments])

  const activityTimeline = useMemo(
    () =>
      activityApi.logs.slice(0, 6).map((l) => ({
        id: l.id,
        title: `${l.module}: ${l.action}`,
        detail: l.description,
        time: l.createdAtLabel,
        badge: l.module,
      })),
    [activityApi.logs],
  )

  const customerColumns = [
    { key: 'name', header: 'Customer', cell: (r) => <div className="font-semibold">{r.name}</div> },
    { key: 'company', header: 'Company' },
    { key: 'email', header: 'Email' },
    {
      key: 'plan',
      header: 'Plan',
      cell: (r) => <Badge variant="info">{r.plan}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => {
        const v =
          r.status === 'Active' ? 'success' : r.status === 'At Risk' ? 'warning' : 'purple'
        return <Badge variant={v}>{r.status}</Badge>
      },
    },
    {
      key: 'spend',
      header: 'Spend',
      cell: (r) => (
        <span className="font-semibold">
          {formatCurrency(convertFromUsd(r.spend, currency), currency)}
        </span>
      ),
    },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <PageHeader
        title="Dashboard"
        subtitle="CRM overview, revenue performance, and recent activity."
      />

      <div className="grid gap-4 lg:grid-cols-4">
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
          value={formatCompact(inv.payments.filter((p) => (p.paymentStatus || '') === 'Paid').length)}
          delta="+10.2%"
          tone="emerald"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Revenue</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">Last 6 months</p>
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
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Sales</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">This month</p>
            </div>
            <Badge variant="info">Weekly</Badge>
          </div>
          <div className="mt-4">
            <SalesBarChart data={salesSeries} />
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Recent Customers</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">Newest signups and spend</p>
            </div>
            <button className="focus-ring rounded-xl px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-500/10 dark:text-indigo-300">
              View all
            </button>
          </div>
          <div className="mt-4">
            {cust.loading ? (
              <div className="grid min-h-[10rem] place-items-center text-sm text-slate-600 dark:text-slate-300">
                Loading customers…
              </div>
            ) : cust.customers.length ? (
              <Table columns={customerColumns} rows={cust.customers.slice(0, 6).map((c) => ({ ...c, spend: c.spendUsd }))} />
            ) : (
              <EmptyState title="No customers yet" description="Create customers to see recent customer activity." />
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Activity</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">Latest updates</p>
            </div>
            <Badge variant="default">Live</Badge>
          </div>
          <div className="mt-4">
            {activityApi.loading ? (
              <div className="grid min-h-[10rem] place-items-center text-sm text-slate-600 dark:text-slate-300">
                Loading activity…
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
