import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import { formatCurrency } from '../../utils/format.js'

export default function InvoiceStats({ stats, currency = 'PKR' }) {
  const cards = [
    { label: 'Total Invoices', value: stats.total, helper: 'Invoices created', tone: 'purple' },
    { label: 'Total Amount', value: formatCurrency(stats.totalAmount || 0, currency), helper: 'Gross invoice value', tone: 'info' },
    { label: 'Paid Amount', value: formatCurrency(stats.paidAmount || 0, currency), helper: `${stats.paid || 0} paid invoices`, tone: 'success' },
    { label: 'Outstanding', value: formatCurrency(stats.outstanding || 0, currency), helper: `${stats.pending || 0} pending / ${stats.overdue || 0} overdue`, tone: 'warning' },
  ]

  return (
    <div className="grid gap-4 lg:grid-cols-4">
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
