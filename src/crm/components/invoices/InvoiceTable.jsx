import { memo, useMemo } from 'react'
import { HiOutlineArrowDownTray, HiOutlineEllipsisHorizontal, HiOutlineEye } from 'react-icons/hi2'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Table from '../ui/Table.jsx'
import { formatCurrency } from '../../utils/format.js'
import { dateLabel, invoiceIssueDate, invoicePaidAmount, statusBadge } from '../../lib/invoiceHelpers.js'

function InvoiceTable({
  invoices,
  currency,
  canApprovePayments = false,
  onOpen,
}) {
  const columns = useMemo(() => [
    { key: 'invoiceNumber', header: 'Invoice Number', cell: (r) => <span className="font-black text-slate-950">{r.invoiceNumber || r.id}</span> },
    {
      key: 'customerName',
      header: 'Customer',
      cell: (r) => (
        <span>
          <span className="block font-bold text-slate-950">{r.customerName || 'Customer'}</span>
          <span className="block text-xs text-slate-500">{r.customerEmail || r.customerPhone || '-'}</span>
        </span>
      ),
    },
    { key: 'issueDate', header: 'Issue Date', cell: (r) => dateLabel(invoiceIssueDate(r)) },
    { key: 'dueDate', header: 'Due Date', cell: (r) => dateLabel(r.dueDate) },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => {
        const badge = statusBadge(r.status || r.paymentStatus)
        return <Badge variant={badge.variant}>{badge.label}</Badge>
      },
    },
    {
      key: 'totalUsd',
      header: 'Amount',
      cell: (r) => <span className="font-black text-slate-950">{formatCurrency(r.total ?? r.totalUsd ?? 0, r.currency || currency || 'PKR')}</span>,
    },
    {
      key: 'amountPaid',
      header: 'Paid Amount',
      cell: (r) => <span className="font-semibold text-emerald-700">{formatCurrency(invoicePaidAmount(r), r.currency || currency || 'PKR')}</span>,
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
            <Button
              variant="subtle"
              className="h-9 rounded-xl px-2.5 py-2 text-xs"
              type="button"
              title="View invoice"
              onClick={(event) => {
                event.preventDefault()
                onOpen?.(r)
              }}
            >
              <HiOutlineEye className="h-4 w-4" />
            </Button>
            <Button
              variant="subtle"
              className="h-9 rounded-xl px-2.5 py-2 text-xs"
              type="button"
              title="Download invoice"
              onClick={(event) => {
                event.preventDefault()
                onOpen?.(r)
              }}
            >
              <HiOutlineArrowDownTray className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              className="h-9 rounded-xl px-2.5 py-2 text-xs"
              type="button"
              title="More actions"
              disabled={isPaid || isCancelled ? false : !canApprovePayments}
              onClick={(event) => {
                event.preventDefault()
                onOpen?.(r)
              }}
            >
              <HiOutlineEllipsisHorizontal className="h-5 w-5" />
            </Button>
          </div>
        )
      },
    },
  ], [canApprovePayments, currency, onOpen])

  return <Table columns={columns} rows={invoices} />
}

export default memo(InvoiceTable)
