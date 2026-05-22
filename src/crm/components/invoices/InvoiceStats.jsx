import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'

export default function InvoiceStats({ stats }) {
  const cards = [
    { label: 'Paid', value: stats.paid, tone: 'success' },
    { label: 'Pending', value: stats.pending, tone: 'warning' },
    { label: 'Overdue', value: stats.overdue, tone: 'danger' },
    { label: 'Cancelled', value: stats.cancelled, tone: 'default' },
  ]

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label} className="p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{c.label}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{c.value}</p>
            </div>
            <Badge variant={c.tone}>{c.label}</Badge>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Invoices count</p>
        </Card>
      ))}
    </div>
  )
}

