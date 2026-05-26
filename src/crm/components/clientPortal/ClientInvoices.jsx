import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Card from '../ui/Card.jsx'
import Table from '../ui/Table.jsx'
import { formatCurrency } from '../../utils/format.js'

function statusVariant(status) {
  if (status === 'Paid') return 'success'
  if (status === 'Overdue') return 'danger'
  if (status === 'Cancelled') return 'default'
  return 'warning'
}

export default function ClientInvoices({ invoices }) {
  const columns = [
    { key: 'invoiceNumber', header: 'Invoice', cell: (r) => <span className="font-semibold">{r.invoiceNumber}</span> },
    { key: 'dueDate', header: 'Due' },
    { key: 'status', header: 'Status', cell: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
    {
      key: 'totalUsd',
      header: 'Total',
      cell: (r) => <span className="font-semibold">{formatCurrency(r.total ?? r.totalUsd ?? 0, r.currency || 'PKR')}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: () => (
        <Button variant="ghost" className="rounded-2xl" type="button">
          Download (Placeholder)
        </Button>
      ),
    },
  ]

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Invoices</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">View invoices and download placeholders</p>
        </div>
        <Badge variant="purple">Billing</Badge>
      </div>

      <div className="mt-4">
        <Table columns={columns} rows={invoices} />
      </div>
    </Card>
  )
}
