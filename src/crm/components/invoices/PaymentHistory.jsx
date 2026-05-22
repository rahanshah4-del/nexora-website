import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import Table from '../ui/Table.jsx'
import { convertFromUsd } from '../../utils/currency.js'
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
      cell: (r) => <span className="font-semibold">{formatCurrency(convertFromUsd(r.amountUsd, currency), currency)}</span>,
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
        <Badge variant="info">Demo</Badge>
      </div>
      <div className="mt-4">
        <Table columns={columns} rows={payments} />
      </div>
    </Card>
  )
}

