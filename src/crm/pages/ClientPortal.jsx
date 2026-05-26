import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { HiOutlinePlus } from 'react-icons/hi2'
import PageHeader from '../components/ui/PageHeader.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import Input from '../components/ui/Input.jsx'
import Select from '../components/ui/Select.jsx'
import Table from '../components/ui/Table.jsx'
import Toast from '../components/ui/Toast.jsx'
import EmptyState from '../components/system/EmptyState.jsx'
import ClientInvoices from '../components/clientPortal/ClientInvoices.jsx'
import ClientPayments from '../components/clientPortal/ClientPayments.jsx'
import { useClientPortal } from '../hooks/useClientPortal.js'
import { formatCurrency } from '../utils/format.js'

function formatDate(value) {
  if (!value) return '—'
  const date = value?.toDate?.() || new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()
}

const blankClient = {
  name: '',
  email: '',
  phone: '',
  businessName: '',
  plan: 'Trial',
  status: 'Active',
}

function ClientModal({ open, onClose, onSave, client }) {
  const [draft, setDraft] = useState(blankClient)
  const isEdit = Boolean(client?.id)

  useEffect(() => {
    if (!open) return
    Promise.resolve().then(() => setDraft(client ? { ...blankClient, ...client } : blankClient))
  }, [open, client])

  function update(key, value) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            className="crm-modal-panel"
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            onClick={(event) => event.stopPropagation()}
          >
            <Card className="rounded-3xl p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-900 dark:text-white">{isEdit ? 'Edit Client' : 'Add Client'}</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {isEdit ? 'Update this client record in Workspace.' : 'Create a client record in this workspace.'}
                  </p>
                </div>
                <Badge variant="purple">Client</Badge>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Client Name *</label>
                  <Input className="mt-1" value={draft.name} onChange={(event) => update('name', event.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Email *</label>
                  <Input className="mt-1" type="email" value={draft.email} onChange={(event) => update('email', event.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Phone</label>
                  <Input className="mt-1" value={draft.phone} onChange={(event) => update('phone', event.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Business Name</label>
                  <Input className="mt-1" value={draft.businessName} onChange={(event) => update('businessName', event.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Plan</label>
                  <Select className="mt-1" value={draft.plan} onChange={(event) => update('plan', event.target.value)}>
                    <option>Trial</option>
                    <option>Starter</option>
                    <option>Business</option>
                    <option>Enterprise</option>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Status</label>
                  <Select className="mt-1" value={draft.status} onChange={(event) => update('status', event.target.value)}>
                    <option>Active</option>
                    <option>Trial</option>
                    <option>Paused</option>
                    <option>Inactive</option>
                  </Select>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button className="rounded-2xl" type="button" onClick={() => onSave?.(draft)}>
                  {isEdit ? 'Save Client' : 'Create Client'}
                </Button>
                <Button variant="subtle" className="rounded-2xl" type="button" onClick={onClose}>
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

function ClientViewModal({ client, onClose }) {
  return (
    <AnimatePresence>
      {client ? (
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
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            onClick={(event) => event.stopPropagation()}
          >
            <Card className="rounded-3xl p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-900 dark:text-white">{client.name}</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{client.email || 'No email saved'}</p>
                </div>
                <Badge variant={client.status === 'Active' ? 'success' : 'default'}>{client.status || 'Active'}</Badge>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ['Phone', client.phone || '—'],
                  ['Business', client.businessName || '—'],
                  ['Plan', client.plan || 'Trial'],
                  ['Created', formatDate(client.createdAt)],
                ].map(([label, value]) => (
                  <div key={label} className="glass-muted rounded-2xl p-4">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button variant="subtle" className="rounded-2xl" type="button" onClick={onClose}>
                  Close
                </Button>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

function DeleteClientModal({ client, busy, onClose, onConfirm }) {
  return (
    <AnimatePresence>
      {client ? (
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
            className="crm-modal-panel max-w-md"
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            onClick={(event) => event.stopPropagation()}
          >
            <Card className="rounded-3xl p-4 sm:p-5">
              <Badge variant="danger">Remove Client</Badge>
              <p className="mt-3 text-base font-semibold text-slate-900 dark:text-white">Remove {client.name}?</p>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                This removes the client record from this workspace. Related invoices and payments remain saved.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button className="rounded-2xl bg-rose-600 hover:bg-rose-700" type="button" disabled={busy} onClick={onConfirm}>
                  {busy ? 'Removing…' : 'Remove Client'}
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

function invoiceBadge(invoice) {
  const paymentStatus = String(invoice?.paymentStatus || '').toLowerCase()
  const invoiceStatus = String(invoice?.status || '').toLowerCase()
  if (paymentStatus === 'paid' || invoiceStatus === 'paid') return { label: 'Paid', variant: 'success' }
  if (paymentStatus === 'pending_verification') return { label: 'Pending Verification', variant: 'info' }
  if (invoiceStatus === 'overdue') return { label: 'Overdue', variant: 'danger' }
  return { label: 'Pending', variant: 'warning' }
}

const blankPayment = {
  paymentMethod: 'Bank Transfer',
  amount: '',
  currency: 'PKR',
  transactionId: '',
  paymentReference: '',
  notes: '',
}

function PaymentPortalModal({ action, invoice, busy, onClose, onSubmit }) {
  const open = Boolean(action && invoice)
  const [draft, setDraft] = useState(blankPayment)
  const isReference = action === 'submit_reference'
  const isRecord = action === 'record_payment'

  useEffect(() => {
    if (!open) return
    const amount = Number(invoice?.total ?? invoice?.totalUsd ?? 0) || 0
    Promise.resolve().then(() =>
      setDraft({
        ...blankPayment,
        paymentMethod: isReference ? 'Bank Transfer' : 'Manual Approval',
        amount: amount ? String(amount) : '',
        currency: invoice?.currency || 'PKR',
      }),
    )
  }, [open, invoice, isReference])

  function update(key, value) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const title = isReference ? 'Submit Payment Reference' : isRecord ? 'Record Payment' : 'Mark Invoice as Paid'
  const description = isReference
    ? 'Your payment will remain pending verification until an admin or accountant approves it.'
    : 'This approval will mark the invoice payment as paid and create a payment record.'

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
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            onClick={(event) => event.stopPropagation()}
          >
            <Card className="rounded-3xl p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-900 dark:text-white">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
                </div>
                <Badge variant={isReference ? 'info' : 'success'}>{invoice?.invoiceNumber || 'Invoice'}</Badge>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Payment Method</label>
                  <Select className="mt-1" value={draft.paymentMethod} onChange={(event) => update('paymentMethod', event.target.value)}>
                    <option>Bank Transfer</option>
                    <option>Manual Approval</option>
                    <option>Cash</option>
                    <option>Card</option>
                    <option>Wallet</option>
                    <option>Cheque</option>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Currency</label>
                  <Select className="mt-1" value={draft.currency} onChange={(event) => update('currency', event.target.value)}>
                    <option>PKR</option>
                    <option>USD</option>
                    <option>AED</option>
                    <option>SAR</option>
                    <option>INR</option>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Amount Paid</label>
                  <Input className="mt-1" inputMode="decimal" value={draft.amount} onChange={(event) => update('amount', event.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Transaction ID</label>
                  <Input className="mt-1" value={draft.transactionId} onChange={(event) => update('transactionId', event.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Payment Reference</label>
                  <Input className="mt-1" value={draft.paymentReference} onChange={(event) => update('paymentReference', event.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Notes</label>
                  <textarea
                    className="focus-ring mt-1 min-h-24 w-full resize-none rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-sky-300 focus:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                    value={draft.notes}
                    onChange={(event) => update('notes', event.target.value)}
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  className="rounded-2xl"
                  type="button"
                  disabled={busy}
                  onClick={() => onSubmit?.({ ...draft, amount: Number(draft.amount || 0) })}
                >
                  {busy ? 'Saving…' : title}
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

function InvoiceViewModal({ invoice, onClose }) {
  const badge = invoiceBadge(invoice)
  return (
    <AnimatePresence>
      {invoice ? (
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
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            onClick={(event) => event.stopPropagation()}
          >
            <Card className="rounded-3xl p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-900 dark:text-white">{invoice.invoiceNumber}</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{invoice.customerName}</p>
                </div>
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="glass-muted rounded-2xl p-4">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Total</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(invoice.total ?? invoice.totalUsd ?? 0, invoice.currency || 'PKR')}
                  </p>
                </div>
                <div className="glass-muted rounded-2xl p-4">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Amount Paid</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(invoice.amountPaid || 0, invoice.currency || 'PKR')}
                  </p>
                </div>
                <div className="glass-muted rounded-2xl p-4">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Due Date</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{invoice.dueDate || '—'}</p>
                </div>
                <div className="glass-muted rounded-2xl p-4">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Email</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{invoice.customerEmail || '—'}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button variant="subtle" className="rounded-2xl" type="button" onClick={onClose}>
                  Close
                </Button>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export default function ClientPortalPage() {
  const portal = useClientPortal()
  const [createOpen, setCreateOpen] = useState(false)
  const [editClient, setEditClient] = useState(null)
  const [viewClient, setViewClient] = useState(null)
  const [deleteClient, setDeleteClient] = useState(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [toast, setToast] = useState(null)
  const [paymentAction, setPaymentAction] = useState({ action: null, invoice: null })
  const [paymentBusy, setPaymentBusy] = useState(false)
  const [viewInvoice, setViewInvoice] = useState(null)

  const columns = useMemo(
    () => [
      { key: 'name', header: 'Client', cell: (row) => <span className="font-semibold">{row.name}</span> },
      { key: 'email', header: 'Email' },
      { key: 'phone', header: 'Phone', cell: (row) => row.phone || '—' },
      { key: 'businessName', header: 'Business', cell: (row) => row.businessName || '—' },
      { key: 'plan', header: 'Plan', cell: (row) => <Badge variant="info">{row.plan}</Badge> },
      { key: 'status', header: 'Status', cell: (row) => <Badge variant={row.status === 'Active' ? 'success' : 'default'}>{row.status}</Badge> },
      { key: 'createdAt', header: 'Created', cell: (row) => formatDate(row.createdAt) },
      {
        key: 'actions',
        header: 'Actions',
        cell: (row) => (
          <div className="flex flex-wrap gap-2">
            <Button variant="subtle" className="h-8 rounded-xl px-3 text-xs" type="button" onClick={() => setViewClient(row)}>
              View
            </Button>
            <Button variant="subtle" className="h-8 rounded-xl px-3 text-xs" type="button" onClick={() => setEditClient(row)}>
              Edit
            </Button>
            <Button
              variant="subtle"
              className="h-8 rounded-xl border-rose-200 px-3 text-xs text-rose-700 hover:border-rose-300"
              type="button"
              onClick={() => setDeleteClient(row)}
            >
              Remove
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  async function submitPayment(payload) {
    const invoice = paymentAction.invoice
    const action = paymentAction.action
    if (!invoice || !action) return
    setPaymentBusy(true)
    const res =
      action === 'submit_reference'
        ? await portal.submitPaymentReference(invoice.id, payload)
        : await portal.markInvoicePaid(invoice.id, payload)
    setPaymentBusy(false)

    if (res?.ok) {
      const message = action === 'submit_reference' ? 'Payment reference submitted for verification' : 'Payment marked as paid'
      setToast({ tone: 'success', message })
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
        title="Client Portal"
        subtitle="Manage client records, client invoices, payment status, and payment actions."
        right={
          <Button className="rounded-2xl" type="button" onClick={() => setCreateOpen(true)}>
            <HiOutlinePlus className="text-lg" />
            Add Client
          </Button>
        }
      />

      {portal.error ? (
        <div className="mb-4">
          <Badge variant="danger">Error: {portal.error}</Badge>
        </div>
      ) : null}

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        {[
          ['Clients', portal.clients.length],
          ['Invoices', portal.invoices.length],
          ['Payments', portal.payments.length],
          ['Activity', portal.activity.length],
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{value}</p>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <div className="min-w-0 space-y-4">
          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Client Records</p>
                <p className="text-xs text-slate-600 dark:text-slate-300">Client records are saved to your workspace.</p>
              </div>
              <Badge variant={portal.source === 'firestore' ? 'success' : 'default'}>
                {portal.loading ? 'Loading…' : portal.source === 'firestore' ? 'Live Sync' : 'No data yet'}
              </Badge>
            </div>
            <div className="mt-4">
              {portal.loading ? (
                <div className="grid min-h-[14rem] place-items-center text-sm text-slate-600 dark:text-slate-300">
                  Loading clients…
                </div>
              ) : portal.clients.length ? (
                <Table columns={columns} rows={portal.clients} />
              ) : (
                <EmptyState
                  title="No clients yet"
                  description="No account data yet. Add a client to begin."
                  actionLabel="Add Client"
                  onAction={() => setCreateOpen(true)}
                />
              )}
            </div>
          </Card>
          <ClientInvoices
            invoices={portal.invoices}
            canApprovePayments={portal.canApprovePayments}
            onViewInvoice={(invoice) => setViewInvoice(invoice)}
            onMarkPaid={(invoice) => setPaymentAction({ action: 'mark_paid', invoice })}
            onRecordPayment={(invoice) => setPaymentAction({ action: 'record_payment', invoice })}
            onSubmitReference={(invoice) => setPaymentAction({ action: 'submit_reference', invoice })}
          />
          <ClientPayments payments={portal.payments} />
        </div>
      </div>

      <ClientModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={async (payload) => {
          const res = await portal.createClient(payload)
          if (res?.ok) {
            setToast({ tone: 'success', message: 'Client created successfully' })
            setCreateOpen(false)
            window.setTimeout(() => setToast(null), 1600)
          } else {
            setToast({ tone: 'error', message: res?.error || 'Failed to create client' })
            window.setTimeout(() => setToast(null), 2400)
          }
        }}
      />
      <ClientModal
        open={Boolean(editClient)}
        client={editClient}
        onClose={() => setEditClient(null)}
        onSave={async (payload) => {
          const res = await portal.updateClient(editClient?.id, payload)
          if (res?.ok) {
            setToast({ tone: 'success', message: 'Client updated successfully' })
            setEditClient(null)
            window.setTimeout(() => setToast(null), 1600)
          } else {
            setToast({ tone: 'error', message: res?.error || 'Failed to update client' })
            window.setTimeout(() => setToast(null), 2400)
          }
        }}
      />
      <ClientViewModal client={viewClient} onClose={() => setViewClient(null)} />
      <DeleteClientModal
        client={deleteClient}
        busy={deleteBusy}
        onClose={() => setDeleteClient(null)}
        onConfirm={async () => {
          setDeleteBusy(true)
          const res = await portal.deleteClient(deleteClient?.id)
          setDeleteBusy(false)
          if (res?.ok) {
            setToast({ tone: 'success', message: 'Client removed successfully' })
            setDeleteClient(null)
            window.setTimeout(() => setToast(null), 1600)
          } else {
            setToast({ tone: 'error', message: res?.error || 'Failed to remove client' })
            window.setTimeout(() => setToast(null), 2400)
          }
        }}
      />
      <PaymentPortalModal
        action={paymentAction.action}
        invoice={paymentAction.invoice}
        busy={paymentBusy}
        onClose={() => setPaymentAction({ action: null, invoice: null })}
        onSubmit={submitPayment}
      />
      <InvoiceViewModal invoice={viewInvoice} onClose={() => setViewInvoice(null)} />
    </motion.div>
  )
}
