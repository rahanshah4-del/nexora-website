import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Table from '../ui/Table.jsx'
import { formatCurrency } from '../../utils/format.js'

export default function InvoiceTable({ invoices, currency, onOpen }) {
  const columns = [
    { key: 'invoiceNumber', header: 'Invoice' },
    { key: 'customerName', header: 'Customer', cell: (r) => <span className="font-semibold">{r.customerName}</span> },
    {
      key: 'totalUsd',
      header: 'Total',
      cell: (r) => <span className="font-semibold">{formatCurrency(r.total ?? r.totalUsd ?? 0, r.currency || currency || 'PKR')}</span>,
    },
    { key: 'dueDate', header: 'Due' },
    {
      key: 'recurring',
      header: 'Recurring',
      cell: (r) => <Badge variant={r.recurring ? 'info' : 'default'}>{r.recurring ? 'Yes' : 'No'}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => {
        const v = r.status === 'Paid' ? 'success' : r.status === 'Overdue' ? 'danger' : r.status === 'Cancelled' ? 'default' : 'warning'
        return <Badge variant={v}>{r.status}</Badge>
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (r) => (
        <Button variant="subtle" className="rounded-xl px-3 py-2 text-xs" type="button" onClick={() => onOpen?.(r)}>
          View
        </Button>
      ),
    },
  ]

  return <Table columns={columns} rows={invoices} />
}
