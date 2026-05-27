import { AnimatePresence, motion } from 'framer-motion'
import PageHeader from '../components/ui/PageHeader.jsx'
import Button from '../components/ui/Button.jsx'
import { usePreferences } from '../hooks/usePreferences.js'
import { useInvoices } from '../hooks/useInvoices.js'
import InvoiceStats from '../components/invoices/InvoiceStats.jsx'
import InvoiceTable from '../components/invoices/InvoiceTable.jsx'
import PaymentHistory from '../components/invoices/PaymentHistory.jsx'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import Input from '../components/ui/Input.jsx'
import Select from '../components/ui/Select.jsx'
import InvoiceModal from '../components/invoices/InvoiceModal.jsx'
import { useState } from 'react'
import Toast from '../components/ui/Toast.jsx'
import { useProducts } from '../hooks/useProducts.js'
import { formatCurrency } from '../utils/format.js'
import { exportCsv, exportExcel, exportPdf } from '../lib/exporters.js'

function PaymentActionModal({ action, invoice, busy, onClose, onConfirm }) {
  const [draft, setDraft] = useState({ amount: '', paymentMethod: 'Manual Approval' })
  const open = Boolean(action && invoice)
  const total = Number(invoice?.total ?? invoice?.totalUsd ?? 0) || 0
  const paid = Number(invoice?.amountPaid ?? invoice?.partialPaidAmount ?? 0) || 0
  const balance = Math.max(total - paid, 0)

  const title =
    action === 'paid'
      ? 'Approve full payment?'
      : action === 'partial'
        ? 'Record partial payment'
        : 'Reject or cancel payment?'

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            className="crm-modal-panel"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            transition={{ duration: 0.18 }}
            onClick={(event) => event.stopPropagation()}
          >
            <Card className="rounded-3xl p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-950 dark:text-white">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Invoice {invoice?.invoiceNumber || invoice?.id} · {formatCurrency(balance || total, invoice?.currency || 'PKR')} remaining
                  </p>
                </div>
                <Badge variant={action === 'reject' ? 'danger' : 'success'}>{action === 'reject' ? 'Review' : 'Approval'}</Badge>
              </div>

              {action !== 'reject' ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Payment Method</label>
                    <Select
                      className="mt-1"
                      value={draft.paymentMethod}
                      onChange={(event) => setDraft((current) => ({ ...current, paymentMethod: event.target.value }))}
                    >
                      <option>Manual Approval</option>
                      <option>Bank Transfer</option>
                      <option>Cash</option>
                      <option>Card</option>
                      <option>Wallet</option>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {action === 'partial' ? 'Partial Amount' : 'Amount'}
                    </label>
                    <Input
                      className="mt-1"
                      inputMode="decimal"
                      value={action === 'partial' ? draft.amount : total}
                      disabled={action !== 'partial'}
                      onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))}
                    />
                  </div>
                </div>
              ) : (
                <p className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm leading-6 text-rose-800">
                  This will cancel the invoice payment state and mark the payment as rejected for this workspace.
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
                  {busy ? 'Saving…' : action === 'reject' ? 'Reject Payment' : action === 'partial' ? 'Record Partial Payment' : 'Mark as Paid'}
                </Button>
                <Button variant="subtle" className="rounded-2xl" type="button" disabled={busy} onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export default function InvoicesPage() {
  const { currency } = usePreferences()
  const {
    invoices,
    payments,
    stats,
    loading,
    source,
    error,
    canApprovePayments,
    createInvoice,
    markInvoicePaid,
    rejectInvoicePayment,
    recordPartialPayment,
  } = useInvoices()
  const { products } = useProducts()
  const [openInvoice, setOpenInvoice] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [paymentAction, setPaymentAction] = useState({ action: null, invoice: null })
  const [paymentBusy, setPaymentBusy] = useState(false)
  const exportColumns = [
    { key: 'invoiceNumber', label: 'Invoice Number' },
    { key: 'customerName', label: 'Customer' },
    { key: 'customerEmail', label: 'Email' },
    { key: 'total', label: 'Total' },
    { key: 'currency', label: 'Currency' },
    { key: 'status', label: 'Status' },
    { key: 'paymentStatus', label: 'Payment Status' },
  ]

  function requestPaymentAction(action, invoice) {
    if (!canApprovePayments) {
      setToast({ tone: 'error', message: 'Only owner, admin, or accountant can approve payments' })
      window.setTimeout(() => setToast(null), 2400)
      return
    }
    setPaymentAction({ action, invoice })
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
      setToast({
        tone: 'success',
        message: action === 'paid' ? 'Invoice marked as paid' : action === 'partial' ? 'Partial payment recorded' : 'Payment rejected',
      })
      setPaymentAction({ action: null, invoice: null })
      window.setTimeout(() => setToast(null), 1800)
    } else {
      setToast({ tone: 'error', message: res?.error || 'Payment action failed' })
      window.setTimeout(() => setToast(null), 2600)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}
      <PageHeader
        title="Invoices & Payments"
        subtitle="Create PKR-first invoices with products, tax, discounts, and workspace-safe billing records."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="subtle" className="rounded-2xl" type="button" onClick={() => exportPdf()}>
              Export PDF
            </Button>
            <Button variant="subtle" className="rounded-2xl" type="button" onClick={() => exportExcel('nexora-invoices.xls', exportColumns, invoices)}>
              Excel
            </Button>
            <Button variant="subtle" className="rounded-2xl" type="button" onClick={() => exportCsv('nexora-invoices.csv', exportColumns, invoices)}>
              CSV
            </Button>
            <Button className="rounded-2xl" onClick={() => setCreateOpen(true)}>
              Create Invoice
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex items-center justify-between">
        <Badge variant={source === 'firestore' ? 'success' : 'default'}>{loading ? 'Loading…' : source === 'firestore' ? 'Live Sync' : 'No data yet'}</Badge>
        {error ? <Badge variant="danger">Error</Badge> : null}
      </div>

      <InvoiceStats stats={stats} />

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Invoice List</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">Tax/GST + recurring invoices included</p>
            </div>
            <Badge variant="purple">Invoices</Badge>
          </div>
          <div className="mt-4">
            {loading ? (
              <div className="grid min-h-[14rem] place-items-center text-sm text-slate-600 dark:text-slate-300">
                Loading invoices…
              </div>
            ) : invoices.length === 0 ? (
              <div className="grid min-h-[14rem] place-items-center text-sm text-slate-600 dark:text-slate-300">
                No invoices yet. Add your first record.
              </div>
            ) : (
              <InvoiceTable
                invoices={invoices}
                currency={currency}
                canApprovePayments={canApprovePayments}
                onOpen={(inv) => setOpenInvoice(inv)}
                onMarkPaid={(inv) => requestPaymentAction('paid', inv)}
                onRejectPayment={(inv) => requestPaymentAction('reject', inv)}
                onPartialPayment={(inv) => requestPaymentAction('partial', inv)}
              />
            )}
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Unpaid Invoice Alerts</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Pending + overdue reminders</p>
          <div className="mt-4 space-y-3">
            <div className="glass-muted rounded-2xl p-4">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Overdue</p>
              <p className="mt-1 text-sm font-semibold text-rose-700 dark:text-rose-200">{stats.overdue} invoices</p>
            </div>
            <div className="glass-muted rounded-2xl p-4">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Pending</p>
              <p className="mt-1 text-sm font-semibold text-amber-700 dark:text-amber-200">{stats.pending} invoices</p>
            </div>
            <Button variant="subtle" className="w-full rounded-2xl">
              Send Reminder Emails
            </Button>
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <PaymentHistory payments={payments} currency={currency} />
      </div>

      <InvoiceModal
        open={!!openInvoice}
        mode="detail"
        invoice={openInvoice}
        currency={currency}
        canApprovePayments={canApprovePayments}
        onClose={() => setOpenInvoice(null)}
        onMarkPaid={(inv) => requestPaymentAction('paid', inv)}
        onRejectPayment={(inv) => requestPaymentAction('reject', inv)}
        onPartialPayment={(inv) => requestPaymentAction('partial', inv)}
      />
      <InvoiceModal
        open={createOpen}
        mode="create"
        invoice={null}
        currency={currency}
        products={products}
        onClose={() => setCreateOpen(false)}
        onCreate={async (inv) => {
          const res = await createInvoice(inv)
          if (res?.ok) {
            setToast({ tone: 'success', message: 'Invoice created successfully' })
            window.setTimeout(() => setToast(null), 1600)
          } else if (res?.error) {
            setToast({ tone: 'error', message: res.error })
            window.setTimeout(() => setToast(null), 2400)
          }
          return res
        }}
      />
      <PaymentActionModal
        action={paymentAction.action}
        invoice={paymentAction.invoice}
        busy={paymentBusy}
        onClose={() => setPaymentAction({ action: null, invoice: null })}
        onConfirm={confirmPaymentAction}
      />
    </motion.div>
  )
}
