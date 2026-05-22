import { motion } from 'framer-motion'
import Card from '../components/ui/Card.jsx'
import ReportsHeader from '../components/reports/ReportsHeader.jsx'
import ReportsKPIs from '../components/reports/ReportsKPIs.jsx'
import ReportsFilters from '../components/reports/ReportsFilters.jsx'
import ReportCategoryTabs from '../components/reports/ReportCategoryTabs.jsx'
import ReportsCharts from '../components/reports/ReportsCharts.jsx'
import RecentReportActivity from '../components/reports/RecentReportActivity.jsx'
import ReportCard from '../components/reports/ReportCard.jsx'
import Badge from '../components/ui/Badge.jsx'
import EmptyState from '../components/system/EmptyState.jsx'
import { useMemo, useState } from 'react'
import { useReports } from '../hooks/useReports.js'
import { usePreferences } from '../hooks/usePreferences.js'
import { useNavigate } from 'react-router-dom'
import { convertFromUsd } from '../utils/currency.js'
import { formatCurrency } from '../utils/format.js'

function toDateValue(value) {
  if (!value) return null
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof value?.toDate === 'function') return value.toDate()
  return null
}

function latestLabel(list) {
  let best = null
  for (const it of list || []) {
    const d = toDateValue(it.updatedAt) || toDateValue(it.createdAt)
    if (!d) continue
    if (!best || d.getTime() > best.getTime()) best = d
  }
  return best ? best.toISOString().slice(0, 10) : '—'
}

export default function ReportsPage() {
  const navigate = useNavigate()
  const reports = useReports()
  const { currency: preferredCurrency } = usePreferences()
  const [filters, setFilters] = useState({
    dateRange: '30d',
    reportType: 'All',
    status: 'All',
    currency: preferredCurrency,
    query: '',
  })
  const [category, setCategory] = useState('All')

  const reportCards = useMemo(() => {
    const c = filters.currency

    const leads = reports.data.leads
    const deals = reports.data.pipelines
    const invoices = reports.data.invoices
    const payments = reports.data.payments
    const tasks = reports.data.tasks
    const teamMembers = reports.data.teamMembers
    const tickets = reports.data.supportTickets
    const subscriptions = reports.data.subscriptions
    const notifications = reports.data.notifications
    const activityLogs = reports.data.activityLogs
    const upgradeRequests = reports.data.upgradeRequests
    const customers = reports.data.customers

    const pipelineValueUsd = deals.reduce((sum, d) => sum + Number(d.dealValueUsd ?? d.dealValue ?? 0), 0)
    const paidRevenueUsd = invoices.filter((i) => i.status === 'Paid').reduce((sum, i) => sum + Number(i.totalUsd ?? i.total ?? 0), 0)
    const paidPaymentsUsd = payments.filter((p) => (p.paymentStatus || '') === 'Paid').reduce((sum, p) => sum + Number(p.amountUsd ?? p.amount ?? 0), 0)
    const overdueTasks = tasks.filter((t) => t.status === 'Overdue').length
    const openTickets = tickets.filter((t) => t.status === 'Open').length
    const activeSubs = subscriptions.filter((s) => (s.planStatus || s.status || '').toLowerCase() === 'active').length

    const list = [
      {
        id: 'pipeline',
        title: 'Sales Pipeline Reports',
        category: 'Sales',
        description: 'Pipeline value, stage performance, risky deals, and forecast.',
        summary: `${deals.length} deals • ${formatCurrency(convertFromUsd(pipelineValueUsd, c), c)}`,
        status: deals.length ? 'Live' : 'Empty',
        lastUpdated: latestLabel(deals),
        to: '/app/pipeline',
        type: 'Sales Pipeline',
      },
      {
        id: 'lead-scoring',
        title: 'AI Lead Scoring Reports',
        category: 'Customers',
        description: 'Hot/Warm/Cold distribution, conversion probability, and lead quality.',
        summary: `${leads.length} leads`,
        status: leads.length ? 'Live' : 'Empty',
        lastUpdated: latestLabel(leads),
        to: '/app/leads/scoring',
        type: 'AI Lead Scoring',
      },
      {
        id: 'followups',
        title: 'Follow-Up Reports',
        category: 'Sales',
        description: 'Overdue tasks, upcoming follow-ups, and completion rate.',
        summary: `${tasks.length} tasks • ${overdueTasks} overdue`,
        status: tasks.length ? 'Live' : 'Empty',
        lastUpdated: latestLabel(tasks),
        to: '/app/follow-ups',
        type: 'Follow-Ups',
      },
      {
        id: 'team-performance',
        title: 'Team Performance Reports',
        category: 'Team',
        description: 'Performance score summary and role distribution.',
        summary: `${teamMembers.length} members`,
        status: teamMembers.length ? 'Live' : 'Empty',
        lastUpdated: latestLabel(teamMembers),
        to: '/app/team',
        type: 'Team',
      },
      {
        id: 'finance',
        title: 'Invoice & Payment Reports',
        category: 'Finance',
        description: 'Invoice statuses, paid revenue, and payment history.',
        summary: `${invoices.length} invoices • ${formatCurrency(convertFromUsd(paidRevenueUsd, c), c)}`,
        status: invoices.length || payments.length ? 'Live' : 'Empty',
        lastUpdated: latestLabel([...invoices, ...payments]),
        to: '/app/invoices',
        type: 'Invoices',
      },
      {
        id: 'analytics',
        title: 'Analytics Reports',
        category: 'System',
        description: 'Enterprise analytics overview and KPI exports.',
        summary: 'Interactive charts',
        status: 'Live',
        lastUpdated: reports.lastUpdatedLabel,
        to: '/app/analytics',
        type: 'Analytics',
      },
      {
        id: 'notifications',
        title: 'Notification Reports',
        category: 'System',
        description: 'Alert volume, unread ratio, and priority distribution.',
        summary: `${notifications.length} notifications`,
        status: notifications.length ? 'Live' : 'Empty',
        lastUpdated: latestLabel(notifications),
        to: '/app/notifications',
        type: 'Notifications',
      },
      {
        id: 'client-portal',
        title: 'Client Portal Reports',
        category: 'Customers',
        description: 'Client billing view summary (invoices, payments, subscription status).',
        summary: `${customers.length} customers • ${formatCurrency(convertFromUsd(paidPaymentsUsd, c), c)}`,
        status: customers.length || invoices.length ? 'Live' : 'Empty',
        lastUpdated: latestLabel([...customers, ...invoices, ...payments]),
        to: '/app/client-portal',
        type: 'Client Portal',
      },
      {
        id: 'support',
        title: 'Support Ticket Reports',
        category: 'Support',
        description: 'Ticket queue health, SLA risk, and assignment summary.',
        summary: `${tickets.length} tickets • ${openTickets} open`,
        status: tickets.length ? 'Live' : 'Empty',
        lastUpdated: latestLabel(tickets),
        to: '/app/support',
        type: 'Support',
      },
      {
        id: 'subscriptions',
        title: 'Subscription Reports',
        category: 'Subscriptions',
        description: 'Plan distribution, active subscriptions, and renewal reminders.',
        summary: `${activeSubs} active subscriptions`,
        status: subscriptions.length ? 'Live' : 'Empty',
        lastUpdated: latestLabel(subscriptions),
        to: '/app/subscriptions',
        type: 'Subscriptions',
      },
      {
        id: 'activity',
        title: 'Activity Logs Reports',
        category: 'Activity',
        description: 'User/system actions, module activity, and exportable logs.',
        summary: `${activityLogs.length} events`,
        status: activityLogs.length ? 'Live' : 'Empty',
        lastUpdated: latestLabel(activityLogs),
        to: '/app/activity-logs',
        type: 'Activity Logs',
      },
      {
        id: 'upgrades',
        title: 'Upgrade Requests Reports',
        category: 'System',
        description: 'Pending approvals, paid confirmations, and plan upgrades.',
        summary: `${upgradeRequests.length} requests`,
        status: upgradeRequests.length ? 'Live' : 'Empty',
        lastUpdated: latestLabel(upgradeRequests),
        to: '/admin/upgrade-requests',
        type: 'Upgrade Requests',
      },
    ]

    const q = filters.query.trim().toLowerCase()
    const filtered = list.filter((r) => {
      const categoryOk = category === 'All' ? true : r.category === category
      const typeOk = filters.reportType === 'All' ? true : r.type === filters.reportType
      const statusOk = filters.status === 'All' ? true : r.status === filters.status
      const queryOk =
        !q ||
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
      return categoryOk && typeOk && statusOk && queryOk
    })

    return filtered
  }, [reports.data, reports.lastUpdatedLabel, filters, category])

  const reportTypes = useMemo(() => Array.from(new Set(reportCards.map((r) => r.type))).sort(), [reportCards])

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <ReportsHeader
        loading={reports.loading}
        source={reports.source}
        lastUpdated={reports.lastUpdatedLabel}
        onExport={() => {}}
      />

      {reports.error ? (
        <div className="mb-4">
          <Badge variant="danger">{reports.error}</Badge>
        </div>
      ) : null}

      <ReportsKPIs kpis={reports.kpis} currency={filters.currency} />

      <Card className="mt-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Filters</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">Date range, report type, status, currency and search</p>
          </div>
          <Badge variant="purple">Filters</Badge>
        </div>
        <div className="mt-4">
          <ReportsFilters value={filters} onChange={setFilters} reportTypes={reportTypes} />
        </div>
        <div className="mt-4">
          <ReportCategoryTabs value={category} onChange={setCategory} />
        </div>
      </Card>

      <div className="mt-4">
        <ReportsCharts
          invoices={reports.data.invoices}
          leads={reports.data.leads}
          teamMembers={reports.data.teamMembers}
          tickets={reports.data.supportTickets}
          subscriptions={reports.data.subscriptions}
          currency={filters.currency}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">All Reports</p>
                <p className="text-xs text-slate-600 dark:text-slate-300">Cards summarize modules (no demo data)</p>
              </div>
              <Badge variant="purple">{reportCards.length} reports</Badge>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {reportCards.length ? (
                reportCards.map((r) => (
                  <ReportCard key={r.id} report={r} onView={() => navigate(r.to)} />
                ))
              ) : (
                <EmptyState title="No reports match filters" description="Try adjusting category/status/search filters." />
              )}
            </div>
          </Card>
        </div>

        <RecentReportActivity activityLogs={reports.data.activityLogs} />
      </div>
    </motion.div>
  )
}
