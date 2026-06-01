import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Table from '../components/ui/Table.jsx'
import Toast from '../components/ui/Toast.jsx'
import EmptyState from '../components/system/EmptyState.jsx'
import { useApprovals } from '../hooks/useApprovals.js'
import { formatCurrency } from '../utils/format.js'

function statusBadge(status) {
  const value = String(status || '').toLowerCase()
  if (value === 'paid' || value === 'approved' || value === 'active') return { label: 'Approved', variant: 'success' }
  if (value === 'rejected') return { label: 'Rejected', variant: 'danger' }
  if (value === 'pending_verification') return { label: 'Pending Verification', variant: 'info' }
  if (value === 'invited' || value === 'requested') return { label: 'Requested', variant: 'warning' }
  return { label: 'Pending', variant: 'warning' }
}

function isInvoiceRow(row) {
  return row?.sourceCollection === 'invoices'
}

function isPaidRow(row) {
  return ['paid', 'rejected', 'cancelled', 'canceled'].includes(
    String(row?.row?.paymentStatus || row?.row?.status || row?.status || '').toLowerCase(),
  )
}

function DetailsModal({ approval, onClose }) {
  return (
    <AnimatePresence>
      {approval ? (
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
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.16 }}
            onClick={(event) => event.stopPropagation()}
          >
            <Card className="rounded-3xl p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-950 dark:text-white">{approval.type}</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{approval.customer}</p>
                </div>
                <Badge variant="purple">Approval</Badge>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ['Status', approval.status],
                  ['Submitted By', approval.submittedBy],
                  ['Amount', formatCurrency(approval.amount, approval.currency)],
                  ['Amount Paid', formatCurrency(approval.amountPaid || 0, approval.currency)],
                  ['Balance Due', formatCurrency(approval.balanceDue || 0, approval.currency)],
                  ['Date', approval.dateLabel],
                  ['Invoice', approval.invoiceNumber || approval.invoiceId || '—'],
                  ['Record Type', approval.type],
                ].map(([label, value]) => (
                  <div key={label} className="glass-muted rounded-2xl p-4">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</p>
                    <p className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-white">{value || '—'}</p>
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

function ConfirmModal({ action, approval, busy, onClose, onConfirm }) {
  const open = Boolean(action && approval)
  const isReject = action === 'reject'
  const isMarkPaid = action === 'mark_paid'
  const label = isReject ? 'Reject' : isMarkPaid ? 'Mark as Paid' : 'Approve'

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
            className="crm-modal-panel max-w-md"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.16 }}
            onClick={(event) => event.stopPropagation()}
          >
            <Card className="rounded-3xl p-4 sm:p-5">
              <Badge variant={isReject ? 'danger' : 'success'}>{label}</Badge>
              <p className="mt-3 text-base font-semibold text-slate-950 dark:text-white">
                {isReject ? 'Reject this approval request?' : isMarkPaid ? 'Mark this invoice as paid?' : 'Approve this request?'}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {approval.type} for {approval.customer} will be{' '}
                {isReject ? 'marked rejected' : isMarkPaid ? 'marked paid and recorded in payments' : 'approved'}.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  className={isReject ? 'rounded-2xl bg-rose-600 hover:bg-rose-700' : 'rounded-2xl'}
                  type="button"
                  disabled={busy}
                  onClick={(event) => {
                    event.preventDefault()
                    onConfirm?.(event)
                  }}
                >
                  {busy ? 'Working…' : label}
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

export default function ApprovalsPage() {
  const approvals = useApprovals()
  const [toast, setToast] = useState(null)
  const [details, setDetails] = useState(null)
  const [confirm, setConfirm] = useState({ action: null, approval: null })
  const [busy, setBusy] = useState(false)

  const summaryCards = useMemo(
    () => [
      ['Pending Payments', approvals.summary.pendingPayments],
      ['Pending Invoices', approvals.summary.pendingInvoices],
      ['Upgrade Requests', approvals.summary.upgradeRequests],
      ['Staff Requests', approvals.summary.staffRequests],
      ['Expense Requests', approvals.summary.expenseRequests],
      ['Account Requests', approvals.summary.accountRequests],
    ],
    [approvals.summary],
  )

  const columns = useMemo(
    () => [
      { key: 'type', header: 'Type', cell: (row) => <span className="font-semibold">{row.type}</span> },
      { key: 'invoiceNumber', header: 'Invoice Number', cell: (row) => row.invoiceNumber || row.invoiceId || '—' },
      { key: 'customer', header: 'Customer' },
      {
        key: 'amount',
        header: 'Amount',
        cell: (row) => <span className="font-semibold">{formatCurrency(row.amount, row.currency)}</span>,
      },
      {
        key: 'amountPaid',
        header: 'Amount Paid',
        cell: (row) => <span className="font-semibold">{formatCurrency(row.amountPaid || 0, row.currency)}</span>,
      },
      {
        key: 'balanceDue',
        header: 'Balance Due',
        cell: (row) => <span className="font-semibold">{formatCurrency(row.balanceDue || 0, row.currency)}</span>,
      },
      { key: 'currency', header: 'Currency', cell: (row) => <Badge variant="info">{row.currency}</Badge> },
      {
        key: 'status',
        header: 'Status',
        cell: (row) => {
          const badge = statusBadge(row.status)
          return <Badge variant={badge.variant}>{badge.label}</Badge>
        },
      },
      { key: 'dateLabel', header: 'Created Date' },
      {
        key: 'actions',
        header: 'Actions',
        cell: (row) => (
          <div className="flex flex-wrap gap-2">
            <Button
              className="h-8 rounded-xl px-3 text-xs"
              type="button"
              onClick={(event) => {
                event.preventDefault()
                setConfirm({ action: 'approve', approval: row })
              }}
            >
              Approve
            </Button>
            {isInvoiceRow(row) && !isPaidRow(row) ? (
              <Button
                variant="subtle"
                className="h-8 rounded-xl px-3 text-xs"
                type="button"
                onClick={(event) => {
                  event.preventDefault()
                  setConfirm({ action: 'mark_paid', approval: row })
                }}
              >
                Mark as Paid
              </Button>
            ) : null}
            <Button
              variant="subtle"
              className="h-8 rounded-xl border-rose-200 px-3 text-xs text-rose-700 hover:border-rose-300"
              type="button"
              onClick={(event) => {
                event.preventDefault()
                setConfirm({ action: 'reject', approval: row })
              }}
            >
              Reject
            </Button>
            <Button
              variant="ghost"
              className="h-8 rounded-xl px-3 text-xs"
              type="button"
              onClick={(event) => {
                event.preventDefault()
                setDetails(row)
              }}
            >
              View Details
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  async function runAction(event) {
    event?.preventDefault?.()
    if (!confirm.action || !confirm.approval) return
    setBusy(true)
    const res =
      confirm.action === 'approve'
        ? await approvals.approve(confirm.approval)
        : confirm.action === 'mark_paid'
          ? await approvals.markPaid(confirm.approval)
          : await approvals.reject(confirm.approval)
    setBusy(false)

    if (res?.ok) {
      setToast({
        tone: 'success',
        message:
          confirm.action === 'approve'
            ? 'Approval completed'
            : confirm.action === 'mark_paid'
              ? 'Invoice marked paid'
              : 'Approval rejected',
      })
      setConfirm({ action: null, approval: null })
      window.setTimeout(() => setToast(null), 1800)
    } else {
      setToast({ tone: 'error', message: res?.error || 'Approval action failed' })
      window.setTimeout(() => setToast(null), 2600)
    }
  }

  if (!approvals.canApprove) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
        <PageHeader title="Approvals" subtitle="Central approval queue for payments, upgrades, clients, and staff access." />
        <Card className="p-6 text-center">
          <Badge variant="warning">Locked</Badge>
          <p className="mt-3 text-base font-semibold text-slate-950 dark:text-white">
            You do not have permission to approve requests.
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">
            Ask an owner, admin, or accountant to review pending CRM approvals.
          </p>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}
      <PageHeader
        title="Approvals"
        subtitle="Central queue for invoice payments, client references, upgrade requests, staff access, and CRM approval items."
      />

      {approvals.error ? (
        <div className="mb-4">
          <Badge variant="danger">Error: {approvals.error}</Badge>
        </div>
      ) : null}

      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {summaryCards.map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Approval Queue</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">Only pending CRM approvals appear here.</p>
          </div>
          <Badge variant="purple">{approvals.summary.total} pending</Badge>
        </div>

        <div className="mt-4">
          {approvals.loading ? (
            <div className="grid min-h-[14rem] place-items-center text-sm text-slate-600 dark:text-slate-300">
              Loading approvals…
            </div>
          ) : approvals.approvals.length ? (
            <Table columns={columns} rows={approvals.approvals} />
          ) : (
            <EmptyState title="No approvals pending" description="Payment, upgrade, staff, and client approvals will appear here." />
          )}
        </div>
      </Card>

      <DetailsModal approval={details} onClose={() => setDetails(null)} />
      <ConfirmModal
        action={confirm.action}
        approval={confirm.approval}
        busy={busy}
        onClose={() => setConfirm({ action: null, approval: null })}
        onConfirm={runAction}
      />
    </motion.div>
  )
}
