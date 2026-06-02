import { motion } from 'framer-motion'
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { AnimatePresence } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Table from '../components/ui/Table.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import { db } from '../lib/firebase.js'
import { useUser } from '../hooks/useUser.js'
import { sendWorkerEmail, upgradeApprovedEmail, upgradeRejectedEmail } from '../../lib/transactionalEmail.js'

function Toast({ tone = 'success', message, onClose }) {
  const toneClass =
    tone === 'success'
      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
      : 'border-rose-500/20 bg-rose-500/10 text-rose-800 dark:text-rose-200'
  return (
    <div className={`glass fixed right-4 top-4 z-[60] w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl border p-3 ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold">{message}</p>
        <button
          type="button"
          className="focus-ring rounded-xl px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-white/40 dark:text-slate-100 dark:hover:bg-white/10"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  )
}

function ConfirmModal({ open, title, description, confirmLabel, tone = 'primary', onCancel, onConfirm, busy }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md"
          >
            <Card className="p-5">
              <p className="text-base font-semibold text-slate-900 dark:text-white">{title}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="subtle" className="rounded-2xl" onClick={onCancel} type="button" disabled={busy}>
                  Cancel
                </Button>
                <Button className="rounded-2xl" onClick={onConfirm} type="button" disabled={busy}>
                  {busy ? 'Working...' : confirmLabel}
                </Button>
              </div>
              {tone === 'danger' ? (
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  Rejected requests keep the user plan unchanged.
                </p>
              ) : null}
            </Card>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

function formatCreatedDate(v) {
  const d = v?.toDate?.()
  if (!d) return '—'
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(d)
}

function subscriptionEndDate(days = 30) {
  return new Date(Date.now() + days * 86400000)
}

function proofUrl(row = {}) {
  return row.paymentProof || row.screenshotUrl || row.paymentProofUrl || ''
}

export default function AdminUpgradeRequestsPage() {
  const { isPlatformAdmin, loading: userLoading, userId } = useUser()
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [busyId, setBusyId] = useState('')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [confirm, setConfirm] = useState({ open: false, action: null, row: null })

  useEffect(() => {
    if (userLoading || !isPlatformAdmin) return
    if (!db) {
      Promise.resolve().then(() => {
        setLoading(false)
        setRows([])
      })
      return
    }
    const q = query(collection(db, 'upgradeRequests'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      () => setRows([]),
    )
    return () => unsub()
  }, [isPlatformAdmin, userLoading])

  useEffect(() => {
    if (userLoading) return
    if (isPlatformAdmin) return
    navigate('/app/dashboard', { replace: true })
  }, [isPlatformAdmin, navigate, userLoading])

  const columns = useMemo(
    () => [
      { key: 'userName', header: 'Customer Name', cell: (r) => <span className="font-semibold">{r.userName || r.ownerName || r.email || r.userId || '—'}</span> },
      { key: 'userEmail', header: 'Email', cell: (r) => r.userEmail || r.email || r.clientEmail || '—' },
      { key: 'userPhone', header: 'Phone', cell: (r) => <span className="text-xs font-semibold">{r.userPhone || '—'}</span> },
      {
        key: 'selectedPlan',
        header: 'Plan',
        cell: (r) => <Badge variant="purple">{r.requestedPlan || r.selectedPlan || r.plan || '—'}</Badge>,
      },
      { key: 'billingCycle', header: 'Billing Cycle', cell: (r) => <Badge variant="default">{r.billingCycle || '—'}</Badge> },
      { key: 'planPrice', header: 'Plan Price', cell: (r) => <span className="text-xs font-semibold">{r.planPrice ?? '—'}</span> },
      { key: 'amountPaid', header: 'Amount Paid', cell: (r) => <span className="text-xs font-semibold">{r.amountPaid ?? '—'}</span> },
      { key: 'currency', header: 'Currency', cell: (r) => <Badge variant="info">{r.currency || '—'}</Badge> },
      { key: 'paymentMethod', header: 'Payment Method', cell: (r) => <Badge variant="info">{r.paymentMethod || '—'}</Badge> },
      { key: 'senderName', header: 'Sender Name', cell: (r) => <span className="text-xs font-semibold">{r.senderName || '—'}</span> },
      { key: 'senderNumber', header: 'Sender Number', cell: (r) => <span className="text-xs font-semibold">{r.senderNumber || r.userPhone || '—'}</span> },
      { key: 'paidToAccount', header: 'Paid To Account', cell: (r) => <span className="text-xs font-semibold">{r.paidToAccount || '—'}</span> },
      { key: 'transactionId', header: 'Transaction ID', cell: (r) => <span className="text-xs font-semibold">{r.transactionId || '—'}</span> },
      { key: 'paymentReference', header: 'Payment Reference', cell: (r) => <span className="text-xs font-semibold">{r.paymentReference || '—'}</span> },
      {
        key: 'screenshot',
        header: 'Screenshot',
        cell: (r) => proofUrl(r)
          ? <a className="text-xs font-bold text-violet-700 hover:underline dark:text-violet-300" href={proofUrl(r)} target="_blank" rel="noreferrer">View Screenshot</a>
          : <span className="text-xs font-semibold">No Screenshot Uploaded</span>,
      },
      {
        key: 'approvalStatus',
        header: 'Approval',
        cell: (r) => {
          const v = r.approvalStatus === 'approved' ? 'success' : r.approvalStatus === 'rejected' ? 'danger' : 'warning'
          return <Badge variant={v}>{r.approvalStatus}</Badge>
        },
      },
      {
        key: 'paymentStatus',
        header: 'Payment',
        cell: (r) => {
          const v = r.paymentStatus === 'paid' ? 'success' : r.paymentStatus === 'rejected' ? 'danger' : 'warning'
          return <Badge variant={v}>{r.paymentStatus}</Badge>
        },
      },
      { key: 'createdAt', header: 'Created Date', cell: (r) => <span className="text-xs">{formatCreatedDate(r.createdAt)}</span> },
      {
        key: 'actions',
        header: 'Actions',
        cell: (r) => (
          <div className="flex items-center gap-2">
            <Button
              className="rounded-xl px-3 py-2 text-xs"
              onClick={() => setConfirm({ open: true, action: 'approve', row: r })}
              disabled={busyId === r.id || r.approvalStatus !== 'pending'}
              type="button"
            >
              Approve
            </Button>
            <Button
              variant="subtle"
              className="rounded-xl px-3 py-2 text-xs"
              onClick={() => setConfirm({ open: true, action: 'reject', row: r })}
              disabled={busyId === r.id || r.approvalStatus !== 'pending'}
              type="button"
            >
              Reject
            </Button>
          </div>
        ),
      },
    ],
    [busyId],
  )

  async function approve(r) {
    setBusyId(r.id)
    try {
      const batch = writeBatch(db)
      const reqRef = doc(db, 'upgradeRequests', r.id)
      const userRef = doc(db, 'users', r.userId)
      const workspaceRef = doc(db, 'workspaces', r.workspaceId || r.userId)
      const subscriptionExpiresAt = subscriptionEndDate(Number(r.requestedDurationDays) || 30)
      const requestedPlan = r.requestedPlan || r.selectedPlan || r.plan || 'Standard'
      const planUpdate = {
        plan: requestedPlan,
        planStatus: 'active',
        subscriptionStatus: 'active',
        billingCycle: 'monthly',
        billingCurrency: r.billingCurrency || r.currency || 'PKR',
        nextBillingDate: subscriptionExpiresAt,
        expiresAt: subscriptionExpiresAt,
        subscriptionStartedAt: serverTimestamp(),
        subscriptionExpiresAt,
        isTrialActive: false,
        paidAt: serverTimestamp(),
        upgradedAt: serverTimestamp(),
      }

      batch.update(reqRef, {
        approvalStatus: 'approved',
        paymentStatus: 'paid',
        approvedBy: userId,
        approvedAt: serverTimestamp(),
      })

      batch.set(
        userRef,
        planUpdate,
        { merge: true },
      )

      batch.set(
        workspaceRef,
        {
          ...planUpdate,
          ownerId: r.ownerId || r.userId,
          userId: r.workspaceId || r.userId,
          workspaceId: r.workspaceId || r.userId,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )

      await batch.commit()
      const to = r.clientEmail || r.email || r.ownerEmail || r.userEmail || ''
      if (to) {
        const template = upgradeApprovedEmail({ name: r.senderName || r.userName || r.ownerName || 'there', plan: requestedPlan })
        const sent = await sendWorkerEmail({ to, ...template })
        setToast(sent.ok
          ? { tone: 'success', message: 'Approved. User plan updated and email sent.' }
          : { tone: 'error', message: `Approved. User plan updated, but email failed: ${sent.error}` })
      } else {
        setToast({ tone: 'error', message: 'Approved. User plan updated, but client email is missing.' })
      }
    } finally {
      setBusyId('')
    }
  }

  async function reject(r) {
    setBusyId(r.id)
    try {
      const batch = writeBatch(db)
      const reqRef = doc(db, 'upgradeRequests', r.id)
      batch.update(reqRef, {
        approvalStatus: 'rejected',
        paymentStatus: 'rejected',
        rejectedBy: userId,
        rejectedAt: serverTimestamp(),
      })
      await batch.commit()
      const to = r.clientEmail || r.email || r.ownerEmail || r.userEmail || ''
      if (to) {
        const template = upgradeRejectedEmail({ name: r.senderName || r.userName || r.ownerName || 'there', reason: r.rejectionReason || r.reason || '' })
        const sent = await sendWorkerEmail({ to, ...template })
        setToast(sent.ok
          ? { tone: 'success', message: 'Request rejected and email sent.' }
          : { tone: 'error', message: `Request rejected, but email failed: ${sent.error}` })
      } else {
        setToast({ tone: 'error', message: 'Request rejected, but client email is missing.' })
      }
    } finally {
      setBusyId('')
    }
  }

  if (userLoading || !isPlatformAdmin) {
    return null
  }

  return (
    <>
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}
      <ConfirmModal
        open={confirm.open}
        title={confirm.action === 'approve' ? 'Approve upgrade request?' : 'Reject upgrade request?'}
        description={
          confirm.row
            ? `${confirm.row.userName || confirm.row.email || 'Client'} (${confirm.row.userEmail || confirm.row.email || 'no email'}) requested ${confirm.row.requestedPlan || confirm.row.selectedPlan || confirm.row.plan || 'a plan'}.`
            : 'Confirm action.'
        }
        confirmLabel={confirm.action === 'approve' ? 'Approve' : 'Reject'}
        tone={confirm.action === 'reject' ? 'danger' : 'primary'}
        busy={!!busyId}
        onCancel={() => setConfirm({ open: false, action: null, row: null })}
        onConfirm={async () => {
          const r = confirm.row
          if (!r) return
          setConfirm({ open: false, action: null, row: null })
          try {
            if (confirm.action === 'approve') await approve(r)
            if (confirm.action === 'reject') await reject(r)
          } catch {
            setToast({ tone: 'error', message: 'Action failed. Check permissions and network.' })
          }
        }}
      />

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <PageHeader title="Admin Upgrade Requests" subtitle="Approve or reject plan upgrade requests." />
        <Card className="p-5">
          {loading ? (
            <div className="grid min-h-[40vh] place-items-center">
              <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
                <Spinner />
                <span className="font-medium">Loading requests…</span>
              </div>
            </div>
          ) : rows.length === 0 ? (
            <div className="grid min-h-[40vh] place-items-center text-center">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">No upgrade requests</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  When users submit upgrade requests, requests will appear here.
                </p>
              </div>
            </div>
          ) : (
            <Table columns={columns} rows={rows} />
          )}
        </Card>
      </motion.div>
    </>
  )
}
