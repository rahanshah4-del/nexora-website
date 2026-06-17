import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import { formatCurrency } from '../../utils/format.js'

function KPI({ label, value, badge }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</p>
          <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{value}</p>
        </div>
        <Badge variant="purple">{badge}</Badge>
      </div>
    </Card>
  )
}

export default function ReportsKPIs({ kpis, currency }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <KPI label="Total Revenue" value={formatCurrency(kpis.totalRevenueUsd, currency)} badge="Finance" />
      <KPI label="Total Leads" value={kpis.totalLeads} badge="Customers" />
      <KPI label="Pending Invoices" value={kpis.pendingInvoices} badge="Billing" />
      <KPI label="Open Tickets" value={kpis.openTickets} badge="Support" />
      <KPI label="Active Subscriptions" value={kpis.activeSubs} badge="Subscriptions" />
      <KPI label="Completed Tasks" value={kpis.completedTasks} badge="Tasks" />
      <KPI label="Upgrade Requests" value={kpis.upgradeCount} badge="System" />
      <KPI label="Team Members" value={kpis.teamCount} badge="Team" />
    </div>
  )
}

