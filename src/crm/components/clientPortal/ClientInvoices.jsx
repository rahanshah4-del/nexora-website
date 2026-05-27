import { memo, useMemo } from 'react'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Card from '../ui/Card.jsx'
import Table from '../ui/Table.jsx'
import { formatCurrency } from '../../utils/format.js'

function paymentBadge(invoice) {
  const paymentStatus = String(invoice.paymentStatus || '').toLowerCase()
  const invoiceStatus = String(invoice.status || '').toLowerCase()
  if (paymentStatus === 'paid' || invoiceStatus === 'paid') return { label: 'Paid', variant: 'success' }
  if (paymentStatus === 'pending_verification') return { label: 'Pending Verification', variant: 'info' }
  if (invoiceStatus === 'overdue') return { label: 'Overdue', variant: 'danger' }
  return { label: 'Pending', variant: 'warning' }
}

function ClientInvoices({ invoices, canApprovePayments, onViewInvoice, onMarkPaid, onRecordPayment, onSubmitReference }) {
  const columns = useMemo(() => [
    { key: 'invoiceNumber', header: 'Invoice', cell: (r) => <span className="font-semibold">{r.invoiceNumber}</span> },
    { key: 'dueDate', header: 'Due' },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => {
        const badge = paymentBadge(r)
        return <Badge variant={badge.variant}>{badge.label}</Badge>
      },
    },
    {
      key: 'totalUsd',
      header: 'Total',
      cell: (r) => <span className="font-semibold">{formatCurrency(r.total ?? r.totalUsd ?? 0, r.currency || 'PKR')}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => {
        const paid = String(row.paymentStatus || row.status || '').toLowerCase() === 'paid'
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="subtle"
              className="rounded-xl px-3 py-2 text-xs"
              type="button"
              onClick={(event) => {
                event.preventDefault()
                onViewInvoice?.(row)
              }}
            >
              View Invoice
            </Button>
            {!paid && canApprovePayments ? (
              <>
                <Button
                  className="rounded-xl px-3 py-2 text-xs"
                  type="button"
                  onClick={(event) => {
                    event.preventDefault()
                    onMarkPaid?.(row)
                  }}
                >
                  Mark as Paid
                </Button>
                <Button
                  variant="ghost"
                  className="rounded-xl px-3 py-2 text-xs"
                  type="button"
                  onClick={(event) => {
                    event.preventDefault()
                    onRecordPayment?.(row)
                  }}
                >
                  Record Payment
                </Button>
              </>
            ) : null}
            {!paid && !canApprovePayments ? (
              <Button
                variant="ghost"
                className="rounded-xl px-3 py-2 text-xs"
                type="button"
                onClick={(event) => {
                  event.preventDefault()
                  onSubmitReference?.(row)
                }}
              >
                Submit Payment Reference
              </Button>
            ) : null}
          </div>
        )
      },
    },
  ], [canApprovePayments, onMarkPaid, onRecordPayment, onSubmitReference, onViewInvoice])

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Invoices</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">View invoices, approve payments, or submit payment references</p>
        </div>
        <Badge variant="purple">Billing</Badge>
      </div>

      <div className="mt-4">
        <Table columns={columns} rows={invoices} />
      </div>
    </Card>
  )
}

export default memo(ClientInvoices)
