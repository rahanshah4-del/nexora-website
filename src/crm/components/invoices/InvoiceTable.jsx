import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  HiOutlineArrowDownTray,
  HiOutlineChatBubbleLeftRight,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineDocumentDuplicate,
  HiOutlineEllipsisHorizontal,
  HiOutlineEnvelope,
  HiOutlineEye,
  HiOutlinePencilSquare,
  HiOutlinePrinter,
  HiOutlineTrash,
  HiOutlineXCircle,
} from 'react-icons/hi2'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
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

function actionAccess(permissions, invoice) {
  const role = permissions?.invoiceActionRole || permissions?.role || 'owner'
  const isOwnerAdmin = role === 'owner' || role === 'admin'
  const isAccountant = role === 'accountant'
  const isSales = role === 'sales'
  const status = String(invoice?.paymentStatus || invoice?.status || 'pending').toLowerCase().replace(/\s+/g, '_')
  const isDraft = status === 'draft'
  const isPaid = status === 'paid'
  const isCancelled = status === 'rejected' || status === 'cancelled' || status === 'canceled'

  return {
    canView: isOwnerAdmin || isAccountant || isSales || permissions?.canView,
    canEdit: isOwnerAdmin || (isSales && isDraft),
    canDuplicate: isOwnerAdmin,
    canDownload: isOwnerAdmin || isAccountant,
    canPrint: isOwnerAdmin || isAccountant,
    canSendEmail: isOwnerAdmin,
    canSendWhatsApp: isOwnerAdmin,
    canMarkPaid: (isOwnerAdmin || isAccountant) && !isPaid && !isCancelled,
    canMarkPartial: (isOwnerAdmin || isAccountant) && !isPaid && !isCancelled,
    canSendApproval: (isOwnerAdmin || isSales) && !isPaid && !isCancelled,
    canCancel: isOwnerAdmin && !isCancelled,
    canDelete: isOwnerAdmin,
  }
}

function InvoiceActionsMenu({ invoice, permissions, onOpen, onAction, schoolMode = false }) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const access = actionAccess(permissions, invoice)

  useEffect(() => {
    if (!open) return undefined

    function closeIfOutside(event) {
      if (triggerRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return
      setOpen(false)
    }

    function placeMenu() {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      const menuWidth = 256
      const left = Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8)
      setPosition({ top: rect.bottom + 8, left })
    }

    placeMenu()
    document.addEventListener('mousedown', closeIfOutside)
    window.addEventListener('resize', placeMenu)
    window.addEventListener('scroll', placeMenu, true)
    return () => {
      document.removeEventListener('mousedown', closeIfOutside)
      window.removeEventListener('resize', placeMenu)
      window.removeEventListener('scroll', placeMenu, true)
    }
  }, [open])

  function run(action) {
    setOpen(false)
    if (action === 'view') {
      onOpen?.(invoice)
      return
    }
    onAction?.(action, invoice)
  }

  return (
    <>
      <span ref={triggerRef} className="inline-flex">
        <Button
          variant="ghost"
          className="h-9 rounded-xl px-2.5 py-2 text-xs"
          type="button"
          title="More actions"
          aria-label={`More actions for invoice ${invoice.invoiceNumber || invoice.id}`}
          aria-expanded={open}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            setOpen((value) => !value)
          }}
        >
          <HiOutlineEllipsisHorizontal className="h-5 w-5" />
        </Button>
      </span>

      {open && typeof document !== 'undefined'
        ? createPortal(
          <div
            ref={menuRef}
            className="fixed z-[90] w-64 rounded-2xl border border-slate-200 bg-white p-1 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.55)]"
            style={{ top: position.top, left: position.left }}
            role="menu"
          >
            <ActionItem icon={HiOutlineEye} label={schoolMode ? 'View Fee Bill' : 'View Invoice'} disabled={!access.canView} onClick={() => run('view')} />
            <ActionItem icon={HiOutlinePencilSquare} label={schoolMode ? 'Edit Fee Bill' : 'Edit Invoice'} disabled={!access.canEdit} onClick={() => run('edit')} />
            <ActionItem icon={HiOutlineDocumentDuplicate} label={schoolMode ? 'Duplicate Fee Bill' : 'Duplicate Invoice'} disabled={!access.canDuplicate} onClick={() => run('duplicate')} />
            <ActionItem icon={HiOutlineArrowDownTray} label="Download PDF" disabled={!access.canDownload} onClick={() => run('pdf')} />
            <ActionItem icon={HiOutlinePrinter} label="Print" disabled={!access.canPrint} onClick={() => run('print')} />
            <ActionItem icon={HiOutlineEnvelope} label="Send Email" disabled={!access.canSendEmail} onClick={() => run('email')} />
            <ActionItem icon={HiOutlineChatBubbleLeftRight} label="Send WhatsApp" disabled={!access.canSendWhatsApp} onClick={() => run('whatsapp')} />
            <ActionItem icon={HiOutlineCheckCircle} label="Mark as Paid" disabled={!access.canMarkPaid} onClick={() => run('mark_paid')} />
            <ActionItem label="Mark as Partial Paid" disabled={!access.canMarkPartial} onClick={() => run('partial_paid')} />
            <ActionItem icon={HiOutlineClock} label="Send for Approval" disabled={!access.canSendApproval} onClick={() => run('send_approval')} />
            <ActionItem icon={HiOutlineXCircle} label={schoolMode ? 'Cancel Fee Bill' : 'Cancel Invoice'} disabled={!access.canCancel} danger onClick={() => run('cancel')} />
            <ActionItem icon={HiOutlineTrash} label={schoolMode ? 'Delete Fee Bill' : 'Delete Invoice'} disabled={!access.canDelete} danger onClick={() => run('delete')} />
          </div>,
          document.body,
        )
        : null}
    </>
  )
}

function InvoiceTable({
  invoices,
  currency,
  permissions = {},
  schoolMode = false,
  onOpen,
  onAction,
}) {
  const columns = useMemo(() => [
    { key: 'invoiceNumber', header: schoolMode ? 'Fee Bill No' : 'Invoice Number', cell: (r) => <span className="font-black text-slate-950">{r.invoiceNumber || r.id}</span> },
    {
      key: 'customerName',
      header: schoolMode ? 'Student' : 'Customer',
      cell: (r) => (
        <span>
          <span className="block font-bold text-slate-950">{r.customerName || (schoolMode ? 'Student' : 'Customer')}</span>
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
      header: schoolMode ? 'Fee Amount' : 'Amount',
      cell: (r) => <span className="font-black text-slate-950">{formatCurrency(r.total ?? r.totalUsd ?? 0, r.currency || currency || 'PKR')}</span>,
    },
    {
      key: 'amountPaid',
      header: schoolMode ? 'Paid Fee' : 'Payment',
      cell: (r) => <span className="font-semibold text-emerald-700">{formatCurrency(invoicePaidAmount(r), r.currency || currency || 'PKR')}</span>,
    },
    {
      key: 'balanceDue',
      header: schoolMode ? 'Pending Fee' : 'Balance',
      cell: (r) => <span className="font-semibold text-slate-700">{formatCurrency(r.balanceDue ?? Math.max(invoiceTotal(r) - invoicePaidAmount(r), 0), r.currency || currency || 'PKR')}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (r) => {
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="subtle"
              className="h-9 rounded-xl px-2.5 py-2 text-xs"
              type="button"
              title={schoolMode ? 'View fee bill' : 'View invoice'}
              onClick={(event) => {
                event.preventDefault()
                onOpen?.(r)
              }}
            >
              <HiOutlineEye className="h-4 w-4" />
            </Button>
            <InvoiceActionsMenu invoice={r} permissions={permissions} schoolMode={schoolMode} onOpen={onOpen} onAction={onAction} />
          </div>
        )
      },
    },
  ], [currency, onAction, onOpen, permissions, schoolMode])

  return <Table columns={columns} rows={invoices} />
}

export default memo(InvoiceTable)
