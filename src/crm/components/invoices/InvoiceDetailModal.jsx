import { AnimatePresence, motion } from 'framer-motion'
import { memo, useEffect, useMemo, useState } from 'react'
import {
  HiOutlineArrowDownTray,
  HiOutlineEnvelope,
  HiOutlineEllipsisHorizontal,
  HiOutlinePencilSquare,
  HiOutlinePrinter,
  HiOutlineShare,
  HiOutlineXMark,
} from 'react-icons/hi2'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'
import InvoicePreview from './InvoicePreview.jsx'
import { formatCurrency } from '../../utils/format.js'
import {
  INVOICE_STATUS_OPTIONS,
  dateLabel,
  invoiceIssueDate,
  invoicePaidAmount,
  invoiceTotal,
  statusBadge,
} from '../../lib/invoiceHelpers.js'

function matchingPayments(payments, invoice) {
  const key = invoice?.id || invoice?.invoiceNumber
  return (payments || []).filter((payment) => payment.invoiceId === key || payment.invoiceNumber === invoice?.invoiceNumber)
}

function Timeline({ invoice, payments }) {
  const rows = [
    {
      id: 'created',
      title: 'Invoice Created',
      detail: invoice?.createdBy || 'Workspace user',
      date: invoiceIssueDate(invoice),
      tone: 'bg-blue-500',
    },
    ...matchingPayments(payments, invoice).map((payment) => ({
      id: payment.id || payment.reference,
      title: payment.paymentStatus === 'partial' ? 'Partial Payment Received' : 'Payment Received',
      detail: `${payment.paymentMethod || 'Payment'} - ${formatCurrency(payment.amount || payment.amountPaid, payment.currency || invoice?.currency || 'PKR')}`,
      date: payment.paidAt || payment.createdAt,
      tone: 'bg-emerald-500',
    })),
  ]

  return (
    <div className="space-y-4">
      {rows.map((row, index) => (
        <div key={`${row.id}-${index}`} className="flex gap-3">
          <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${row.tone}`} />
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-950">{row.title}</p>
            <p className="mt-0.5 text-xs text-slate-500">{dateLabel(row.date)} - {row.detail}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function InvoiceDetailModal({
  open,
  invoice,
  payments = [],
  currency = 'PKR',
  company,
  canApprovePayments = false,
  onClose,
  onUpdate,
  onMarkPaid,
  onRejectPayment,
  onPartialPayment,
}) {
  const [tab, setTab] = useState('details')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !invoice) return
    setTab('details')
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

  const status = statusBadge(invoice?.status || invoice?.paymentStatus)
  const invoicePayments = useMemo(() => matchingPayments(payments, invoice), [invoice, payments])
  const total = invoiceTotal(invoice)
  const paid = invoicePaidAmount(invoice)
  const balance = Math.max(total - paid, 0)
  const closed = ['paid', 'cancelled', 'canceled', 'rejected'].includes(String(invoice?.status || invoice?.paymentStatus || '').toLowerCase())

  if (!invoice) return null

  async function saveEdit() {
    if (!invoice?.id) return
    setSaving(true)
    await onUpdate?.(invoice.id, draft)
    setSaving(false)
    setEditing(false)
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            className="w-full max-w-[1180px] overflow-hidden rounded-[1.6rem] bg-white shadow-[0_28px_100px_-45px_rgba(15,23,42,0.65)]"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.18 }}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Invoice Detail</p>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">{invoice.invoiceNumber || invoice.id}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="subtle" className="h-10 rounded-xl text-xs" type="button" onClick={() => setEditing((value) => !value)}>
                  <HiOutlinePencilSquare className="h-4 w-4" />
                  Edit Invoice
                </Button>
                <Button variant="subtle" className="h-10 rounded-xl text-xs" type="button" onClick={() => window.print()}>
                  <HiOutlineArrowDownTray className="h-4 w-4" />
                  Download PDF
                </Button>
                <Button variant="subtle" className="h-10 rounded-xl text-xs" type="button" onClick={() => window.print()}>
                  <HiOutlinePrinter className="h-4 w-4" />
                  Print
                </Button>
                <Button variant="subtle" className="h-10 rounded-xl text-xs" type="button">
                  <HiOutlineEnvelope className="h-4 w-4" />
                  Send
                </Button>
                <Button variant="ghost" className="h-10 rounded-xl px-3" type="button" title="More actions">
                  <HiOutlineEllipsisHorizontal className="h-5 w-5" />
                </Button>
                <Button variant="ghost" className="h-10 rounded-xl px-3" type="button" onClick={onClose} title="Close">
                  <HiOutlineXMark className="h-5 w-5" />
                </Button>
              </div>
            </header>

            <div className="max-h-[82vh] overflow-y-auto bg-slate-50 p-4 sm:p-5">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Total</p>
                      <p className="mt-2 text-xl font-black text-slate-950">{formatCurrency(total, invoice.currency || currency)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Paid</p>
                      <p className="mt-2 text-xl font-black text-emerald-700">{formatCurrency(paid, invoice.currency || currency)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Outstanding</p>
                      <p className="mt-2 text-xl font-black text-amber-700">{formatCurrency(balance, invoice.currency || currency)}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-2">
                    <div className="flex gap-2">
                      {['details', 'payments'].map((item) => (
                        <button
                          key={item}
                          type="button"
                          className={`h-10 rounded-xl px-4 text-sm font-bold capitalize ${
                            tab === item ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-600 hover:bg-slate-50'
                          }`}
                          onClick={() => setTab(item)}
                        >
                          {item === 'payments' ? 'Payment & Activity' : 'Details'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {tab === 'details' ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      {editing ? (
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
                            <textarea className="focus-ring mt-1 min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} />
                          </label>
                          <div className="flex gap-2 sm:col-span-2">
                            <Button className="rounded-xl" type="button" disabled={saving} onClick={saveEdit}>{saving ? 'Saving...' : 'Save Changes'}</Button>
                            <Button variant="subtle" className="rounded-xl" type="button" onClick={() => setEditing(false)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid gap-4 text-sm sm:grid-cols-2">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Customer</p>
                            <p className="mt-2 font-bold text-slate-950">{invoice.customerName || '-'}</p>
                            <p className="text-slate-500">{invoice.customerEmail || '-'}</p>
                            <p className="text-slate-500">{invoice.customerPhone || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Schedule</p>
                            <p className="mt-2 text-slate-600">Issue: {dateLabel(invoiceIssueDate(invoice))}</p>
                            <p className="text-slate-600">Due: {dateLabel(invoice.dueDate)}</p>
                            <p className="text-slate-600">Terms: {invoice.paymentTerms || 'Net 14 Days'}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <Timeline invoice={invoice} payments={payments} />
                    </div>
                  )}

                  {!closed ? (
                    <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3">
                      <Button className="rounded-xl" type="button" disabled={!canApprovePayments} onClick={() => onMarkPaid?.(invoice)}>
                        Mark as Paid
                      </Button>
                      <Button variant="subtle" className="rounded-xl" type="button" disabled={!canApprovePayments} onClick={() => onPartialPayment?.(invoice)}>
                        Record Partial
                      </Button>
                      <Button variant="ghost" className="rounded-xl text-rose-700 hover:bg-rose-50" type="button" disabled={!canApprovePayments} onClick={() => onRejectPayment?.(invoice)}>
                        Cancel Invoice
                      </Button>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <InvoicePreview invoice={invoice} company={company} payments={invoicePayments} compact id="invoice-detail-print" />
                  <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
                    <Button variant="subtle" className="rounded-xl" type="button">
                      <HiOutlineEnvelope className="h-4 w-4" />
                      Send via Email
                    </Button>
                    <Button variant="subtle" className="rounded-xl text-emerald-700" type="button">
                      Send via WhatsApp
                    </Button>
                    <Button variant="subtle" className="rounded-xl text-indigo-700" type="button">
                      <HiOutlineShare className="h-4 w-4" />
                      Share Invoice Link
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export default memo(InvoiceDetailModal)
