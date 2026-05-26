import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Table from '../ui/Table.jsx'
import { formatCurrency } from '../../utils/format.js'

function paymentBadge(invoice) {
  const value = String(invoice.paymentStatus || invoice.status || 'pending').toLowerCase()
  if (value === 'paid') return { label: 'Paid', variant: 'success' }
  if (value === 'partial') return { label: 'Partial Payment', variant: 'info' }
  if (value === 'rejected' || value === 'cancelled') return { label: 'Payment Rejected', variant: 'danger' }
  return { label: 'Payment Pending', variant: 'warning' }
}

function invoiceStatusLabel(status) {
  const value = String(status || 'pending').toLowerCase()
  if (value === 'paid') return 'Paid'
  if (value === 'partial') return 'Partial'
  if (value === 'cancelled') return 'Cancelled'
  if (value === 'overdue') return 'Overdue'
  return 'Pending'
}

export default function InvoiceTable({
  invoices,
  currency,
  canApprovePayments = false,
  onOpen,
  onMarkPaid,
  onRejectPayment,
  onPartialPayment,
}) {
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
        const value = String(r.status || '').toLowerCase()
        const v = value === 'paid' ? 'success' : value === 'overdue' ? 'danger' : value === 'cancelled' ? 'default' : value === 'partial' ? 'info' : 'warning'
        return <Badge variant={v}>{invoiceStatusLabel(r.status)}</Badge>
      },
    },
    {
      key: 'paymentStatus',
      header: 'Payment',
      cell: (r) => {
        const badge = paymentBadge(r)
        return <Badge variant={badge.variant}>{badge.label}</Badge>
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (r) => {
        const status = String(r.paymentStatus || r.status || 'pending').toLowerCase()
        const isPaid = status === 'paid'
        const isCancelled = status === 'rejected' || status === 'cancelled'
        return (
          <div className="flex items-center gap-2">
            <Button variant="subtle" className="rounded-xl px-3 py-2 text-xs" type="button" onClick={() => onOpen?.(r)}>
              View
            </Button>
            {!isPaid && !isCancelled ? (
              <>
                <Button
                  variant="subtle"
                  className="rounded-xl px-3 py-2 text-xs"
                  type="button"
                  disabled={!canApprovePayments}
                  onClick={() => onMarkPaid?.(r)}
                >
                  Mark as Paid
                </Button>
                <Button
                  variant="ghost"
                  className="rounded-xl px-3 py-2 text-xs"
                  type="button"
                  disabled={!canApprovePayments}
                  onClick={() => onPartialPayment?.(r)}
                >
                  Partial
                </Button>
                <Button
                  variant="ghost"
                  className="rounded-xl px-3 py-2 text-xs text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                  type="button"
                  disabled={!canApprovePayments}
                  onClick={() => onRejectPayment?.(r)}
                >
                  Reject
                </Button>
              </>
            ) : null}
          </div>
        )
      },
    },
  ]

  return <Table columns={columns} rows={invoices} />
}
