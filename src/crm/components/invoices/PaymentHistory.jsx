import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import Table from '../ui/Table.jsx'
import { formatCurrency } from '../../utils/format.js'

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
      cell: (r) => <Badge variant={r.paymentStatus === 'Paid' ? 'success' : 'warning'}>{r.paymentStatus}</Badge>,
    },
    { key: 'paidAt', header: 'Paid At' },
    { key: 'reference', header: 'Reference' },
  ]

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Payment History</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">Manual payment approval placeholder</p>
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
