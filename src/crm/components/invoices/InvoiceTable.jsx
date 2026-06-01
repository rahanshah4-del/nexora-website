import { memo, useMemo } from 'react'
import {
  HiOutlineArrowDownTray,
  HiOutlineCheckCircle,
  HiOutlineDocumentDuplicate,
  HiOutlineEllipsisHorizontal,
  HiOutlineEnvelope,
  HiOutlineEye,
  HiOutlinePencilSquare,
  HiOutlinePrinter,
  HiOutlineTrash,
} from 'react-icons/hi2'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Dropdown from '../ui/Dropdown.jsx'
import Table from '../ui/Table.jsx'
import { formatCurrency } from '../../utils/format.js'
import { dateLabel, invoiceIssueDate, invoicePaidAmount, invoiceTotal, statusBadge } from '../../lib/invoiceHelpers.js'

function ActionItem({ icon: Icon, label, danger = false, disabled = false, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
        danger ? 'text-rose-700 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-100'
      }`}
      onClick={onClick}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {label}
    </button>
  )
}

function InvoiceTable({
  invoices,
  currency,
  permissions = {},
  onOpen,
  onAction,
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
      header: 'Payment',
      cell: (r) => <span className="font-semibold text-emerald-700">{formatCurrency(invoicePaidAmount(r), r.currency || currency || 'PKR')}</span>,
    },
    {
      key: 'balanceDue',
      header: 'Balance',
      cell: (r) => <span className="font-semibold text-slate-700">{formatCurrency(r.balanceDue ?? Math.max(invoiceTotal(r) - invoicePaidAmount(r), 0), r.currency || currency || 'PKR')}</span>,
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
            <Dropdown
              align="right"
              panelClassName="w-60 bg-white"
              trigger={() => (
                <Button variant="ghost" className="h-9 rounded-xl px-2.5 py-2 text-xs" type="button" title="More actions">
                  <HiOutlineEllipsisHorizontal className="h-5 w-5" />
                </Button>
              )}
            >
              {({ close }) => (
                <div>
                  <ActionItem icon={HiOutlineEye} label="View" onClick={() => { onOpen?.(r); close() }} />
                  <ActionItem icon={HiOutlinePencilSquare} label="Edit" disabled={!permissions.canEdit || isCancelled} onClick={() => { onAction?.('edit', r); close() }} />
                  <ActionItem icon={HiOutlineDocumentDuplicate} label="Duplicate" disabled={!permissions.canDuplicate} onClick={() => { onAction?.('duplicate', r); close() }} />
                  <ActionItem icon={HiOutlinePrinter} label="Print" onClick={() => { onAction?.('print', r); close() }} />
                  <ActionItem icon={HiOutlineArrowDownTray} label="PDF" onClick={() => { onAction?.('pdf', r); close() }} />
                  <ActionItem icon={HiOutlineEnvelope} label="Email" onClick={() => { onAction?.('email', r); close() }} />
                  <ActionItem label="WhatsApp" onClick={() => { onAction?.('whatsapp', r); close() }} />
                  <ActionItem icon={HiOutlineCheckCircle} label="Mark Paid" disabled={!permissions.canRecordPayments || isPaid || isCancelled} onClick={() => { onAction?.('mark_paid', r); close() }} />
                  <ActionItem label="Mark Unpaid" disabled={!permissions.canRecordPayments || isCancelled} onClick={() => { onAction?.('mark_unpaid', r); close() }} />
                  <ActionItem label="Partial Paid" disabled={!permissions.canRecordPayments || isPaid || isCancelled} onClick={() => { onAction?.('partial_paid', r); close() }} />
                  <ActionItem label="Send For Approval" disabled={isPaid || isCancelled || !permissions.canEdit} onClick={() => { onAction?.('send_approval', r); close() }} />
                  <ActionItem label="Reject" disabled={!permissions.canReject || isCancelled} danger onClick={() => { onAction?.('reject', r); close() }} />
                  {permissions.canDelete ? (
                    <ActionItem icon={HiOutlineTrash} label="Delete" danger onClick={() => { onAction?.('delete', r); close() }} />
                  ) : null}
                </div>
              )}
            </Dropdown>
          </div>
        )
      },
    },
  ], [currency, onAction, onOpen, permissions])

  return <Table columns={columns} rows={invoices} />
}

export default memo(InvoiceTable)
