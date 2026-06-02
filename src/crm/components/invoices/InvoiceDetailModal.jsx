import { AnimatePresence, motion } from 'framer-motion'
import { memo, useEffect, useMemo, useState } from 'react'
import {
  HiOutlineArrowDownTray,
  HiOutlineEnvelope,
  HiOutlinePencilSquare,
  HiOutlinePrinter,
  HiOutlineXMark,
} from 'react-icons/hi2'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'
import InvoicePreview from './InvoicePreview.jsx'
import { INVOICE_STATUS_OPTIONS, dateLabel, invoicePaidAmount, invoiceTotal, statusBadge } from '../../lib/invoiceHelpers.js'
import { formatCurrency } from '../../utils/format.js'

function matchingPayments(payments, invoice) {
  const key = invoice?.id || invoice?.invoiceNumber
  return (payments || []).filter((payment) => payment.invoiceId === key || payment.invoiceNumber === invoice?.invoiceNumber)
}

function InvoiceDetailModal({
  open,
  invoice,
  payments = [],
  company,
  onPrint,
  onDownloadPdf,
  onEmail,
  onClose,
  onUpdate,
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !invoice) return
    setEditing(false)
    setDraft({
      customerName: invoice.customerName || '',
      customerPhone: invoice.customerPhone || '',
      customerEmail: invoice.customerEmail || '',
      dueDate: invoice.dueDate || '',
      status: invoice.status || 'pending',
      notes: invoice.notes || '',
      terms: invoice.terms || '',
    })
  }, [open, invoice])

  const invoicePayments = useMemo(() => matchingPayments(payments, invoice), [invoice, payments])

  if (!invoice) return null

  const status = statusBadge(invoice.status || invoice.paymentStatus)
  const total = invoiceTotal(invoice)
  const amountPaid = invoicePaidAmount(invoice)
  const balance = Math.max(Number(invoice.balanceDue ?? total - amountPaid) || 0, 0)
  const paymentHistory = Array.isArray(invoice.paymentHistory) ? invoice.paymentHistory : []

  async function saveEdit() {
    if (!invoice?.id) return
    setSaving(true)
    try {
      await onUpdate?.(invoice.id, draft)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto overflow-x-hidden bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            className="flex max-h-[92vh] w-full max-w-[980px] min-w-0 flex-col overflow-hidden rounded-[1.6rem] bg-white shadow-[0_28px_100px_-45px_rgba(15,23,42,0.65)]"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.18 }}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex shrink-0 flex-col gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Invoice Detail</p>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
                <h2 className="mt-1 truncate text-2xl font-black tracking-tight text-slate-950">
                  {invoice.invoiceNumber || invoice.id}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <Button
                  variant="subtle"
                  className="h-10 rounded-xl text-xs"
                  type="button"
                  disabled={!onUpdate}
                  onClick={() => setEditing((value) => !value)}
                >
                  <HiOutlinePencilSquare className="h-4 w-4" />
                  Edit
                </Button>
                <Button variant="subtle" className="h-10 rounded-xl text-xs" type="button" onClick={() => onDownloadPdf?.(invoice)}>
                  <HiOutlineArrowDownTray className="h-4 w-4" />
                  Download PDF
                </Button>
                <Button variant="subtle" className="h-10 rounded-xl text-xs" type="button" onClick={() => onPrint?.(invoice)}>
                  <HiOutlinePrinter className="h-4 w-4" />
                  Print
                </Button>
                <Button
                  variant="subtle"
                  className="h-10 rounded-xl text-xs"
                  type="button"
                  onClick={() => onEmail?.(invoice)}
                >
                  <HiOutlineEnvelope className="h-4 w-4" />
                  Send
                </Button>
                <Button variant="ghost" className="h-10 rounded-xl px-3" type="button" onClick={onClose} title="Close">
                  <HiOutlineXMark className="h-5 w-5" />
                </Button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 px-3 py-4 sm:px-5">
              {editing ? (
                <div className="mx-auto mb-4 w-full max-w-[820px] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-bold text-slate-600">
                      Customer
                      <Input className="mt-1" value={draft.customerName} onChange={(event) => setDraft((current) => ({ ...current, customerName: event.target.value }))} />
                    </label>
                    <label className="text-xs font-bold text-slate-600">
                      Phone
                      <Input className="mt-1" value={draft.customerPhone} onChange={(event) => setDraft((current) => ({ ...current, customerPhone: event.target.value }))} />
                    </label>
                    <label className="text-xs font-bold text-slate-600">
                      Email
                      <Input className="mt-1" type="email" value={draft.customerEmail} onChange={(event) => setDraft((current) => ({ ...current, customerEmail: event.target.value }))} />
                    </label>
                    <label className="text-xs font-bold text-slate-600">
                      Due Date
                      <Input className="mt-1" type="date" value={draft.dueDate} onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))} />
                    </label>
                    <label className="text-xs font-bold text-slate-600">
                      Status
                      <Select className="mt-1" value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}>
                        {INVOICE_STATUS_OPTIONS.map((option) => <option key={option} value={option.toLowerCase()}>{option}</option>)}
                      </Select>
                    </label>
                    <label className="text-xs font-bold text-slate-600 sm:col-span-2">
                      Notes
                      <textarea
                        className="focus-ring mt-1 min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        value={draft.notes}
                        onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                      />
                    </label>
                    <div className="flex flex-wrap gap-2 sm:col-span-2">
                      <Button className="rounded-xl" type="button" disabled={saving} onClick={saveEdit}>
                        {saving ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button variant="subtle" className="rounded-xl" type="button" onClick={() => setEditing(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mx-auto mb-4 grid w-full max-w-[820px] gap-3 sm:grid-cols-4">
                {[
                  ['Amount Paid', formatCurrency(amountPaid, invoice.currency || 'PKR')],
                  ['Remaining Balance', formatCurrency(balance, invoice.currency || 'PKR')],
                  ['Last Payment Date', dateLabel(invoice.lastPaymentDate || invoice.lastPaymentAt || invoice.paidAt)],
                  ['Payment History', `${invoicePayments.length + paymentHistory.length} entries`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
                    <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
                  </div>
                ))}
              </div>

              {paymentHistory.length ? (
                <div className="mx-auto mb-4 w-full max-w-[820px] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm font-black text-slate-950">Invoice Payment History</p>
                  <div className="mt-3 divide-y divide-slate-100">
                    {paymentHistory.slice().reverse().map((payment, index) => (
                      <div key={`${payment.recordedAt || index}-${payment.amount}`} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                        <span className="font-semibold text-slate-700">{payment.paymentMethod || 'Manual'}</span>
                        <span className="font-black text-slate-950">{formatCurrency(payment.amount || 0, invoice.currency || 'PKR')}</span>
                        <span className="text-xs font-semibold text-slate-500">{dateLabel(payment.recordedAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mx-auto w-full max-w-[820px] min-w-0">
                <InvoicePreview
                  invoice={invoice}
                  company={company}
                  payments={invoicePayments}
                  compact
                  id="invoice-detail-print"
                  className="w-full max-w-full"
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export default memo(InvoiceDetailModal)
