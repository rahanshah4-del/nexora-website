import Badge from '../ui/Badge.jsx'
import Card from '../ui/Card.jsx'
import { formatCurrency } from '../../utils/format.js'

function paymentBadge(status) {
  const value = String(status || '').toLowerCase()
  if (value === 'paid') return { label: 'Paid', variant: 'success' }
  if (value === 'pending_verification') return { label: 'Pending Verification', variant: 'info' }
  if (value === 'overdue') return { label: 'Overdue', variant: 'danger' }
  return { label: 'Pending', variant: 'warning' }
}

function dateLabel(value) {
  if (!value) return '—'
  const date = value?.toDate?.() || new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

export default function ClientPayments({ payments }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Payments</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">Payment history and manual verification entries</p>
        </div>
        <Badge variant="purple">Payments</Badge>
      </div>

      <div className="mt-4 space-y-2">
        {payments.length ? (
          payments.map((p) => (
            <div key={p.id} className="glass-muted flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {p.invoiceId} • {p.paymentMethod}
                </p>
                <p className="truncate text-xs text-slate-600 dark:text-slate-300">
                  Ref: {p.reference} • Paid: {dateLabel(p.paidAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={paymentBadge(p.paymentStatus).variant}>{paymentBadge(p.paymentStatus).label}</Badge>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {formatCurrency(p.amount ?? p.amountUsd ?? 0, p.currency || 'PKR')}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl px-3 py-10 text-center text-sm text-slate-600 dark:text-slate-300">
            No payments yet.
          </div>
        )}
      </div>
    </Card>
  )
}
