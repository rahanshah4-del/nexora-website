import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import { formatCurrency } from '../../utils/format.js'

export default function InvoiceStats({ stats, currency = 'PKR' }) {
  const cards = [
    { label: 'Draft', value: stats.draft || 0, helper: 'Invoices being prepared', tone: 'purple' },
    { label: 'Pending Approval', value: stats.pendingApproval || 0, helper: 'Visible in Approval Center', tone: 'warning' },
    { label: 'Approved', value: stats.approved || 0, helper: 'Ready to send', tone: 'success' },
    { label: 'Paid', value: stats.paid || 0, helper: formatCurrency(stats.paidAmount || 0, currency), tone: 'success' },
    { label: 'Overdue', value: stats.overdue || 0, helper: formatCurrency(stats.outstanding || 0, currency), tone: 'danger' },
    { label: 'Revenue', value: formatCurrency(stats.revenue || 0, currency), helper: 'Collected invoice value', tone: 'info' },
    { label: 'Collection Rate', value: `${Math.round(stats.collectionRate || 0)}%`, helper: 'Paid against gross invoice value', tone: 'purple' },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
      {cards.map((c) => (
        <Card key={c.label} className="border-slate-200/90 bg-white p-5 shadow-[0_18px_60px_-44px_rgba(79,70,229,0.45)]">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{c.label}</p>
              <p className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{c.value}</p>
            </div>
            <Badge variant={c.tone}>{c.label}</Badge>
          </div>
          <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">{c.helper}</p>
        </Card>
      ))}
    </div>
  )
}
