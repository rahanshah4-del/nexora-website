import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import Table from '../ui/Table.jsx'
import { formatCurrency } from '../../utils/format.js'

function statusVariant(status) {
  const value = String(status || '').toLowerCase()
  if (value === 'paid') return 'success'
  if (value === 'partial') return 'info'
  if (value === 'rejected') return 'danger'
  return 'warning'
}

function statusLabel(status) {
  const value = String(status || '').toLowerCase()
  if (value === 'paid') return 'Paid'
  if (value === 'partial') return 'Partial'
  if (value === 'rejected') return 'Rejected'
  return 'Pending'
}

function dateLabel(value) {
  if (!value) return '—'
  const date = value?.toDate?.() || new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

export default function PaymentHistory({ payments, currency }) {
  const columns = [
    { key: 'id', header: 'Payment' },
    { key: 'invoiceId', header: 'Invoice' },
    { key: 'customerName', header: 'Customer' },
    { key: 'paymentMethod', header: 'Method', cell: (r) => <Badge variant="info">{r.paymentMethod}</Badge> },
    {
      key: 'amountUsd',
      header: 'Amount',
      cell: (r) => <span className="font-semibold">{formatCurrency(r.amount ?? r.amountUsd ?? 0, r.currency || currency || 'PKR')}</span>,
    },
    {
      key: 'paymentStatus',
      header: 'Status',
      cell: (r) => <Badge variant={statusVariant(r.paymentStatus)}>{statusLabel(r.paymentStatus)}</Badge>,
    },
    { key: 'paidAt', header: 'Paid At', cell: (r) => dateLabel(r.paidAt) },
    { key: 'reference', header: 'Reference' },
  ]

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Payment History</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">Manual payment approvals</p>
        </div>
        <Badge variant="info">Payments</Badge>
      </div>
      <div className="mt-4">
        {payments.length ? (
          <Table columns={columns} rows={payments} />
        ) : (
          <div className="grid min-h-[10rem] place-items-center rounded-2xl bg-slate-50 text-sm text-slate-600 dark:bg-white/5 dark:text-slate-300">
            No payment data yet.
          </div>
        )}
      </div>
    </Card>
  )
}
