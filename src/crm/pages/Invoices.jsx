import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  HiOutlineArrowDownTray,
  HiOutlineCalendarDays,
  HiOutlineFunnel,
  HiOutlineMagnifyingGlass,
  HiOutlinePlus,
} from 'react-icons/hi2'
import Button from '../components/ui/Button.jsx'
import { usePreferences } from '../hooks/usePreferences.js'
import { useBusinessSettings } from '../hooks/useBusinessSettings.js'
import { useInvoices } from '../hooks/useInvoices.js'
import InvoiceStats from '../components/invoices/InvoiceStats.jsx'
import InvoiceTable from '../components/invoices/InvoiceTable.jsx'
import PaymentHistory from '../components/invoices/PaymentHistory.jsx'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import Input from '../components/ui/Input.jsx'
import Select from '../components/ui/Select.jsx'
import Toast from '../components/ui/Toast.jsx'
import InvoiceDetailModal from '../components/invoices/InvoiceDetailModal.jsx'
import PrintableInvoice from '../components/print/PrintableInvoice.jsx'
import { useUser } from '../hooks/useUser.js'
import { formatCurrency } from '../utils/format.js'
import { exportCsv, exportExcel } from '../lib/exporters.js'
import { exportInvoicePdf } from '../lib/invoicePdf.js'
import { invoiceIssueDate, statusBadge } from '../lib/invoiceHelpers.js'
import { getEmailServiceError, sendInvoiceEmail } from '../lib/emailService.js'
import { resolveWorkspaceName } from '../../lib/workspaceName.js'
import { normalizeBusinessType } from '../data/moduleAccess.js'

function PaymentActionModal({ action, invoice, busy, schoolMode = false, onClose, onConfirm }) {
  const [draft, setDraft] = useState({ amount: '', paymentMethod: 'Bank Transfer' })
  const open = Boolean(action && invoice)
  const total = Number(invoice?.total ?? invoice?.totalUsd ?? 0) || 0
  const paid = Number(invoice?.amountPaid ?? invoice?.partialPaidAmount ?? 0) || 0
  const balance = Math.max(total - paid, 0)

  const title =
    action === 'paid'
      ? schoolMode ? 'Approve full fee payment?' : 'Approve full payment?'
      : action === 'partial'
        ? schoolMode ? 'Record partial fee payment' : 'Record partial payment'
        : schoolMode ? 'Cancel this fee bill?' : 'Cancel this invoice?'

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            className="w-full max-w-lg overflow-hidden rounded-[1.4rem] bg-white shadow-[0_24px_90px_-45px_rgba(15,23,42,0.65)]"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            transition={{ duration: 0.18 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-black tracking-tight text-slate-950">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {schoolMode ? 'Fee Bill' : 'Invoice'} {invoice?.invoiceNumber || invoice?.id} - {formatCurrency(balance || total, invoice?.currency || 'PKR')} remaining
                  </p>
                </div>
                <Badge variant={action === 'reject' ? 'danger' : 'success'}>{action === 'reject' ? 'Review' : 'Payment'}</Badge>
              </div>
            </div>

            <div className="p-5">
              {action !== 'reject' ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-bold text-slate-600">
                    Payment Method
                    <Select
                      className="mt-1"
                      value={draft.paymentMethod}
                      onChange={(event) => setDraft((current) => ({ ...current, paymentMethod: event.target.value }))}
                    >
                      <option>Cash</option>
                      <option>Bank Transfer</option>
                      <option>JazzCash</option>
                      <option>EasyPaisa</option>
                      <option>Cheque</option>
                      <option>Credit Card</option>
                      <option>Other</option>
                    </Select>
                  </label>
                  <label className="text-xs font-bold text-slate-600">
                    {action === 'partial' ? (schoolMode ? 'Partial Fee' : 'Partial Amount') : schoolMode ? 'Fee Amount' : 'Amount'}
                    <Input
                      className="mt-1"
                      inputMode="decimal"
                      value={action === 'partial' ? draft.amount : total}
                      disabled={action !== 'partial'}
                      onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))}
                    />
                  </label>
                </div>
              ) : (
                <p className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm leading-6 text-rose-800">
                  This will cancel the {schoolMode ? 'fee bill' : 'invoice'} payment state and mark the {schoolMode ? 'fee bill' : 'invoice'} as rejected for this workspace.
                </p>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  className={action === 'reject' ? 'rounded-2xl bg-rose-600 hover:bg-rose-700' : 'rounded-2xl'}
                  type="button"
                  disabled={busy}
                  onClick={(event) => {
                    event.preventDefault()
                    onConfirm?.({ ...draft, amount: action === 'partial' ? Number(draft.amount || 0) : total })
                  }}
                >
                  {busy ? 'Saving...' : action === 'reject' ? (schoolMode ? 'Cancel Fee Bill' : 'Cancel Invoice') : action === 'partial' ? (schoolMode ? 'Record Partial Fee' : 'Record Partial Payment') : 'Mark as Paid'}
                </Button>
                <Button variant="subtle" className="rounded-2xl" type="button" disabled={busy} onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

function toDateMillis(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null)
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0
}

export default function InvoicesPage() {
  const navigate = useNavigate()
  const { currency } = usePreferences()
  const { settings: businessSettings } = useBusinessSettings()
  const { userDoc, userId, businessType } = useUser()
  const isSchool = normalizeBusinessType(businessType) === 'School ERP'
  const {
    invoices,
    payments,
    stats,
    loading,
    source,
    error,
    canApprovePayments,
    permissions,
    markInvoicePaid,
    rejectInvoicePayment,
    recordPartialPayment,
    updateInvoice,
    sendForApproval,
    markInvoiceSent,
    markInvoiceUnpaid,
    duplicateInvoice,
    deleteInvoice,
  } = useInvoices()
  const [openInvoice, setOpenInvoice] = useState(null)
  const [toast, setToast] = useState(null)
  const [paymentAction, setPaymentAction] = useState({ action: null, invoice: null })
  const [paymentBusy, setPaymentBusy] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [printInvoice, setPrintInvoice] = useState(null)

  useEffect(() => {
    const clearPrintInvoice = () => setPrintInvoice(null)
    window.addEventListener('afterprint', clearPrintInvoice)
    return () => window.removeEventListener('afterprint', clearPrintInvoice)
  }, [])

  const company = useMemo(
    () => ({
      name: businessSettings.businessName || resolveWorkspaceName({ accountData: userDoc, userId, fallback: userDoc?.company || 'Nexora Solutions' }),
      email: businessSettings.email || userDoc?.email || '',
      phone: businessSettings.phone || userDoc?.phone || '',
      address: businessSettings.address || userDoc?.companyAddress || userDoc?.address || '',
      taxId: businessSettings.taxNumber || userDoc?.ntn || userDoc?.taxId || '',
      signature: userDoc?.fullName || userDoc?.name || '',
      logoUrl: businessSettings.logoUrl || '',
      invoicePrefix: businessSettings.invoicePrefix || '',
      footer: businessSettings.receiptFooter || '',
      signatureUrl: businessSettings.signatureUrl || '',
    }),
    [businessSettings, userDoc, userId],
  )

  const exportColumns = [
    { key: 'invoiceNumber', label: isSchool ? 'Fee Bill Number' : 'Invoice Number' },
    { key: 'customerName', label: isSchool ? 'Student' : 'Customer' },
    { key: 'customerEmail', label: 'Email' },
    { key: 'total', label: isSchool ? 'Fee Amount' : 'Total' },
    { key: 'amountPaid', label: isSchool ? 'Paid Fee' : 'Paid Amount' },
    { key: 'currency', label: 'Currency' },
    { key: 'status', label: 'Status' },
  ]

  const filteredInvoices = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const fromMs = dateFrom ? toDateMillis(dateFrom) : 0
    const toMs = dateTo ? toDateMillis(dateTo) + 86400000 - 1 : 0
    return invoices.filter((invoice) => {
      const haystack = [
        invoice.invoiceNumber,
        invoice.customerName,
        invoice.customerEmail,
        invoice.customerPhone,
        invoice.customerTaxId,
        invoice.className,
        invoice.section,
        invoice.feeMonth,
        invoice.rollNo,
        invoice.admissionNo,
      ].join(' ').toLowerCase()
      if (needle && !haystack.includes(needle)) return false
      const status = statusBadge(invoice.status || invoice.paymentStatus).label.toLowerCase()
      if (statusFilter !== 'all' && status !== statusFilter) return false
      const invoiceMs = toDateMillis(invoiceIssueDate(invoice) || invoice.dueDate)
      if (fromMs && invoiceMs < fromMs) return false
      if (toMs && invoiceMs > toMs) return false
      return true
    })
  }, [dateFrom, dateTo, invoices, query, statusFilter])

  function showToast(nextToast, timeout = 2200) {
    setToast(nextToast)
    window.setTimeout(() => setToast(null), timeout)
  }

  function requestPaymentAction(action, invoice) {
    if (!permissions.canRecordPayments && action !== 'reject') {
      showToast({ tone: 'error', message: 'Only owner, admin, or accountant can approve payments' }, 2600)
      return
    }
    if (action === 'reject' && !permissions.canReject) {
      showToast({ tone: 'error', message: 'Only owner or admin can reject invoices' }, 2600)
      return
    }
    setPaymentAction({ action, invoice })
  }

  function printInvoiceDocument(invoice) {
    if (!invoice) return
    setPrintInvoice(invoice)
    window.setTimeout(() => window.print(), 350)
  }

  async function downloadInvoicePdf(invoice) {
    if (!invoice) return
    try {
      await exportInvoicePdf({ invoice, company, payments, businessType })
    } catch (error) {
      showToast({ tone: 'error', message: error?.message || (isSchool ? 'Unable to export fee bill PDF' : 'Unable to export invoice PDF') }, 2800)
    }
  }

  async function runInvoiceAction(action, invoice) {
    if (!invoice?.id) return
    let res = { ok: true }
    if (action === 'view') setOpenInvoice(invoice)
    if (action === 'edit') setOpenInvoice(invoice)
    if (action === 'print') return printInvoiceDocument(invoice)
    if (action === 'pdf') return downloadInvoicePdf(invoice)
    if (action === 'email') {
      const emailServiceError = getEmailServiceError()
      if (emailServiceError) res = { ok: false, error: emailServiceError }
      else if (invoice.customerEmail) {
        res = await sendInvoiceEmail({ invoice, company, businessType })
        if (res.ok) {
          await markInvoiceSent(invoice.id)
          showToast({ tone: 'success', message: `${isSchool ? 'Fee bill' : 'Invoice'} emailed to ${invoice.customerEmail}` })
        }
      }
      else res = { ok: false, error: isSchool ? 'Student email is missing.' : 'Customer email is missing.' }
    }
    if (action === 'whatsapp') {
      const phone = String(invoice.customerPhone || '').replace(/[^\d]/g, '')
      if (phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`${isSchool ? 'Fee Bill' : 'Invoice'} ${invoice.invoiceNumber || invoice.id} is ready.`)}`, '_blank', 'noopener,noreferrer')
      else res = { ok: false, error: isSchool ? 'Student phone is missing.' : 'Customer phone is missing.' }
    }
    if (action === 'mark_paid') return requestPaymentAction('paid', invoice)
    if (action === 'partial_paid') return requestPaymentAction('partial', invoice)
    if (action === 'cancel') return requestPaymentAction('reject', invoice)
    if (action === 'mark_unpaid') res = await markInvoiceUnpaid(invoice.id)
    if (action === 'send_approval') res = await sendForApproval(invoice.id)
    if (action === 'duplicate') res = await duplicateInvoice(invoice.id)
    if (action === 'delete') {
      if (!window.confirm(`Delete ${isSchool ? 'fee bill' : 'invoice'} ${invoice.invoiceNumber || invoice.id}?`)) return
      res = await deleteInvoice(invoice.id)
    }
    if (res?.ok && !['view', 'edit', 'print', 'pdf', 'email', 'whatsapp'].includes(action)) {
      showToast({ tone: 'success', message: isSchool ? 'Fee bill action completed' : 'Invoice action completed' })
    } else if (res?.error) {
      showToast({ tone: 'error', message: res.error }, 2800)
    }
  }

  async function confirmPaymentAction(payload) {
    const invoice = paymentAction.invoice
    const action = paymentAction.action
    if (!invoice || !action) return
    setPaymentBusy(true)
    const res =
      action === 'paid'
        ? await markInvoicePaid(invoice.id, payload)
        : action === 'partial'
          ? await recordPartialPayment(invoice.id, payload)
          : await rejectInvoicePayment(invoice.id)
    setPaymentBusy(false)
    if (res?.ok) {
      showToast({
        tone: 'success',
        message: action === 'paid' ? (isSchool ? 'Fee bill marked as paid' : 'Invoice marked as paid') : action === 'partial' ? (isSchool ? 'Partial fee payment recorded' : 'Partial payment recorded') : (isSchool ? 'Fee bill cancelled' : 'Invoice cancelled'),
      })
      setPaymentAction({ action: null, invoice: null })
    } else {
      showToast({ tone: 'error', message: res?.error || 'Payment action failed' }, 2800)
    }
  }

  return (
    <motion.div
      className="space-y-5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      {printInvoice ? (
        <PrintableInvoice
          className="print-only"
          invoice={printInvoice}
          company={company}
          payments={payments}
          businessType={businessType}
        />
      ) : null}

      <div className={printInvoice ? 'no-print space-y-5' : 'space-y-5'}>
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}

      <section className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-[0_24px_80px_-58px_rgba(79,70,229,0.65)] sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">
              {isSchool ? 'Fees' : 'Invoices'} <span className="text-slate-300">/</span> <span className="text-slate-950">Dashboard</span>
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{isSchool ? 'Fees & Billing' : 'Invoice Management'}</h1>
            <p className="mt-1 text-sm text-slate-500">{isSchool ? 'Manage student fee invoices, payments, dues, and receipts.' : 'Modern ERP billing, payment tracking, previews, and export-ready invoice records.'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="subtle" className="h-11 rounded-xl" type="button" onClick={() => exportExcel(isSchool ? 'nexora-fee-records.xls' : 'nexora-invoices.xls', exportColumns, filteredInvoices)}>
              <HiOutlineArrowDownTray className="h-4 w-4" />
              Excel
            </Button>
            <Button variant="subtle" className="h-11 rounded-xl" type="button" onClick={() => exportCsv(isSchool ? 'nexora-fee-records.csv' : 'nexora-invoices.csv', exportColumns, filteredInvoices)}>
              CSV
            </Button>
            <Button className="h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 shadow-lg shadow-indigo-600/20" onClick={() => navigate('/app/invoices/create')}>
              <HiOutlinePlus className="h-5 w-5" />
              {isSchool ? 'Create Fee Bill' : 'New Invoice'}
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_auto_auto]">
          <label className="relative block">
            <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <Input
              className="h-12 rounded-2xl pl-11"
              placeholder={isSchool ? 'Search fee bills, students, class, roll no...' : 'Search invoices, customers, phone, NTN/CNIC...'}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <Button variant="subtle" className="h-12 rounded-2xl" type="button" onClick={() => setFiltersOpen((value) => !value)}>
            <HiOutlineFunnel className="h-5 w-5" />
            Filter
          </Button>
          <Button variant="subtle" className="h-12 rounded-2xl" type="button" onClick={() => setFiltersOpen((value) => !value)}>
            <HiOutlineCalendarDays className="h-5 w-5" />
            Date Range
          </Button>
        </div>

        {filtersOpen ? (
          <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3">
            <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              Status
              <Select className="mt-1 bg-white" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">All statuses</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="pending approval">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="sent">Sent</option>
                <option value="partial paid">Partial Paid</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </label>
            <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              From
              <Input className="mt-1 bg-white" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </label>
            <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              To
              <Input className="mt-1 bg-white" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </label>
          </div>
        ) : null}
      </section>

      <div className="flex items-center justify-between">
        <Badge variant={source === 'firestore' ? 'success' : 'default'}>{loading ? 'Loading...' : source === 'firestore' ? 'Live Sync' : 'No data yet'}</Badge>
        {error ? <Badge variant="danger">{isSchool ? 'Unable to load fee records' : 'Unable to load invoices'}</Badge> : null}
      </div>

      <InvoiceStats stats={stats} currency={currency} schoolMode={isSchool} />

      <Card className="border-slate-200/90 bg-white p-5 shadow-[0_22px_80px_-58px_rgba(79,70,229,0.55)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-lg font-black tracking-tight text-slate-950">{isSchool ? 'Fee Records' : 'Invoice List'}</p>
            <p className="mt-1 text-sm text-slate-500">
              {filteredInvoices.length} of {invoices.length} {isSchool ? 'fee records' : 'invoices'} shown
            </p>
          </div>
          <Badge variant="purple">ERP Billing</Badge>
        </div>
        <div className="mt-4">
          {loading ? (
            <div className="grid min-h-[18rem] place-items-center text-sm font-semibold text-slate-500">{isSchool ? 'Loading fee records...' : 'Loading invoices...'}</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="grid min-h-[18rem] place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center">
              <div>
                <p className="text-sm font-bold text-slate-700">{isSchool ? 'No fee records found' : 'No invoices found'}</p>
                <p className="mt-1 text-xs text-slate-500">{isSchool ? 'Create a fee bill or adjust your filters.' : 'Create a new invoice or adjust your filters.'}</p>
              </div>
            </div>
          ) : (
            <InvoiceTable
              invoices={filteredInvoices}
              currency={currency}
              permissions={permissions}
              schoolMode={isSchool}
              onOpen={(invoice) => setOpenInvoice(invoice)}
              onAction={runInvoiceAction}
            />
          )}
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <PaymentHistory payments={payments} currency={currency} />
        <Card className="border-slate-200/90 bg-white p-5">
          <p className="text-sm font-black text-slate-950">{isSchool ? 'Fee Snapshot' : 'Payment Snapshot'}</p>
          <div className="mt-4 space-y-3 text-sm">
            {[
              [isSchool ? 'Paid fee bills' : 'Paid invoices', stats.paid],
              ['Pending approval', stats.pendingApproval],
              [isSchool ? 'Approved fee bills' : 'Approved invoices', stats.approved],
              ['Partial paid', stats.partialPaid],
              [isSchool ? 'Overdue fees' : 'Overdue invoices', stats.overdue],
              [isSchool ? 'Cancelled fee bills' : 'Cancelled invoices', stats.cancelled],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span className="font-semibold text-slate-600">{label}</span>
                <span className="font-black text-slate-950">{value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <InvoiceDetailModal
        open={Boolean(openInvoice)}
        invoice={openInvoice}
        payments={payments}
        currency={currency}
        company={company}
        canApprovePayments={canApprovePayments}
        onPrint={printInvoiceDocument}
        onDownloadPdf={downloadInvoicePdf}
        onEmail={(invoice) => runInvoiceAction('email', invoice)}
        onClose={() => setOpenInvoice(null)}
        onUpdate={updateInvoice}
        onMarkPaid={(invoice) => requestPaymentAction('paid', invoice)}
        onRejectPayment={(invoice) => requestPaymentAction('reject', invoice)}
        onPartialPayment={(invoice) => requestPaymentAction('partial', invoice)}
      />

      <PaymentActionModal
        action={paymentAction.action}
        invoice={paymentAction.invoice}
        busy={paymentBusy}
        schoolMode={isSchool}
        onClose={() => setPaymentAction({ action: null, invoice: null })}
        onConfirm={confirmPaymentAction}
      />
      </div>
    </motion.div>
  )
}
