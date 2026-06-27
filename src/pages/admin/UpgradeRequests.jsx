import { useEffect, useMemo, useState } from 'react'
import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '../../lib/firebase.js'
import useAuth from '../../context/useAuth.js'
import { clientSafeMessage } from '../../lib/errorHandler.js'
import { isBackendAdminEmail } from '../../lib/roles.js'
import { buildApprovedSubscriptionPayload } from '../../lib/subscriptionApproval.js'
import { listWorkerUpgradeRequests, updateWorkerUpgradeRequestStatus } from '../../lib/upgradeWorker.js'

function StatusPill({ value }) {
  const style =
    value === 'approved'
      ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
      : value === 'rejected'
        ? 'border-rose-400/30 bg-rose-500/10 text-rose-200'
        : 'border-white/10 bg-white/5 text-slate-200/80'
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${style}`}>{value}</span>
}

function proofUrl(item = {}) {
  return item.paymentProof || item.screenshotUrl || item.paymentProofUrl || ''
}

function amountLabel(item = {}) {
  const amount = Number(item.amount ?? item.amountPaid ?? item.planPrice ?? 0) || 0
  const currency = item.currency || item.billingCurrency || 'PKR'
  return amount > 0 ? `${currency} ${amount.toLocaleString('en-US')}` : '-'
}

export default function UpgradeRequests() {
  const { user } = useAuth()
  const backendAdminAllowed = isBackendAdminEmail(user?.email)
  console.log('[Admin Auth] UpgradeRequests admin check:', user?.email, backendAdminAllowed ? 'allowed' : 'blocked')
  const firebaseEnabled = Boolean(db)
  const [items, setItems] = useState([])
  const [workerItems, setWorkerItems] = useState([])
  const [loading, setLoading] = useState(() => firebaseEnabled)
  const [workerLoading, setWorkerLoading] = useState(false)
  const [error, setError] = useState('')
  const [workerError, setWorkerError] = useState('')
  const [updatingId, setUpdatingId] = useState('')

  useEffect(() => {
    if (!firebaseEnabled) return undefined

    const q = query(collection(db, 'upgradeRequests'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      (e) => {
        setError(clientSafeMessage(e, 'Failed to load upgrade requests.', { context: 'Admin upgrade requests load' }))
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [firebaseEnabled])

  useEffect(() => {
    if (!backendAdminAllowed || !user?.getIdToken) return undefined
    let cancelled = false
    async function loadWorkerRequests() {
      setWorkerLoading(true)
      setWorkerError('')
      try {
        const idToken = await user.getIdToken()
        const rows = await listWorkerUpgradeRequests(idToken, 200)
        if (!cancelled) setWorkerItems(rows)
      } catch (e) {
        if (!cancelled) setWorkerError(clientSafeMessage(e, 'Failed to load Worker upgrade requests.', { context: 'Worker upgrade requests load' }))
      } finally {
        if (!cancelled) setWorkerLoading(false)
      }
    }
    loadWorkerRequests()
    const timer = window.setInterval(loadWorkerRequests, 30000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [backendAdminAllowed, user])

  const allItems = useMemo(
    () => [...workerItems, ...items]
      .sort((a, b) => new Date(b.createdAt || b.updatedAt || 0).getTime() - new Date(a.createdAt || a.updatedAt || 0).getTime()),
    [items, workerItems],
  )

  const stats = useMemo(() => {
    const total = allItems.length
    const pending = allItems.filter((x) => x.approvalStatus === 'pending').length
    const approved = allItems.filter((x) => x.approvalStatus === 'approved').length
    return { total, pending, approved }
  }, [allItems])

  const updateApproval = async (item, approvalStatus) => {
    if (!db) return
    if (!backendAdminAllowed) {
      setError('Backend admin access required.')
      return
    }
    const id = item?.id
    if (!id) return
    setUpdatingId(id)
    try {
      const isWorkerRequest = item.source === 'cloudflare-d1'
      const idToken = isWorkerRequest ? await user.getIdToken() : ''
      if (approvalStatus !== 'approved') {
        if (isWorkerRequest) {
          const result = await updateWorkerUpgradeRequestStatus(idToken, id, approvalStatus)
          setWorkerItems((current) => current.map((row) => (row.id === id ? result.request || { ...row, approvalStatus, status: approvalStatus } : row)))
          return
        }
        await updateDoc(doc(db, 'upgradeRequests', id), {
          status: approvalStatus,
          approvalStatus,
          paymentStatus: approvalStatus === 'rejected' ? 'rejected' : item.paymentStatus || 'pending',
          ...(approvalStatus === 'rejected' ? { rejectedBy: user?.email || '', rejectedAt: serverTimestamp() } : {}),
        })
        return
      }

      const batch = writeBatch(db)
      const ownerId = item.ownerId || item.uid || item.userId
      const workspaceId = item.workspaceId || ownerId
      if (!ownerId) throw new Error('Owner user ID is required to approve subscription upgrades.')
      if (!workspaceId) throw new Error('Workspace ID is required to approve subscription upgrades.')
      const plan = item.requestedPlan || item.selectedPlan || item.plan || 'Standard'
      const subscriptionPayload = buildApprovedSubscriptionPayload({
        plan,
        billingCycle: item.billingCycle,
        amount: Number(item.amount || item.amountPaid || item.planPrice || 0) || 0,
        currency: item.currency || item.billingCurrency || 'PKR',
        approvedBy: user?.uid || user?.email || '',
        approvedByEmail: user?.email || '',
      })
      const requestUpdate = {
        status: 'approved',
        approvalStatus: 'approved',
        paymentStatus: 'paid',
        approvedBy: subscriptionPayload.approvedBy,
        approvedByEmail: subscriptionPayload.approvedByEmail,
        approvedAt: subscriptionPayload.approvedAt,
        subscriptionExpiresAt: subscriptionPayload.subscriptionExpiresAt,
        nextBillingDate: subscriptionPayload.nextBillingDate,
        updatedAt: subscriptionPayload.updatedAt,
      }
      console.log('[Subscription Approval] payload', { requestId: id, workspaceId, ownerId, subscriptionPayload })
      if (!isWorkerRequest) {
        console.log('[Subscription Approval] request update', { path: `upgradeRequests/${id}`, requestUpdate })
        batch.update(doc(db, 'upgradeRequests', id), requestUpdate)
      }
      console.log('[Subscription Approval] user update', { path: `users/${ownerId}`, subscriptionPayload })
      batch.set(doc(db, 'users', ownerId), subscriptionPayload, { merge: true })
      console.log('[Subscription Approval] workspace update', { path: `workspaces/${workspaceId}`, subscriptionPayload })
      batch.set(
        doc(db, 'workspaces', workspaceId),
        {
          ...subscriptionPayload,
          ownerId,
          userId: workspaceId,
          workspaceId,
        },
        { merge: true },
      )
      batch.set(doc(db, 'platformPayments', isWorkerRequest ? `d1-${id}` : id), {
        clientEmail: item.clientEmail || item.email || '',
        workspaceId,
        workspaceName: item.workspaceName || '',
        plan,
        amount: Number(item.amount || item.amountPaid || item.planPrice || 0) || 0,
        currency: item.currency || item.billingCurrency || 'PKR',
        transactionId: item.transactionId || '',
        senderName: item.senderName || '',
        senderNumber: item.senderNumber || item.userPhone || '',
        paymentMethod: item.paymentMethod || 'Manual',
        paymentProof: item.paymentProof || item.screenshotUrl || '',
        status: 'paid',
        paymentStatus: 'paid',
        approvedBy: subscriptionPayload.approvedBy,
        approvedByEmail: subscriptionPayload.approvedByEmail,
        approvedAt: subscriptionPayload.approvedAt,
        subscriptionExpiresAt: subscriptionPayload.subscriptionExpiresAt,
        nextBillingDate: subscriptionPayload.nextBillingDate,
        source: isWorkerRequest ? 'cloudflare-d1-upgradeRequests' : 'upgradeRequests',
        sourceId: id,
        updatedAt: subscriptionPayload.updatedAt,
      }, { merge: true })
      await batch.commit()
      if (isWorkerRequest) {
        const result = await updateWorkerUpgradeRequestStatus(idToken, id, 'approved')
        setWorkerItems((current) => current.map((row) => (row.id === id ? result.request || { ...row, ...requestUpdate } : row)))
      }
      setError('')
      setWorkerError('')
    } catch (error) {
      const raw = String(error?.message || error || '')
      setError(/missing or insufficient permissions|permission-denied|permission denied/i.test(raw)
        ? 'Backend admin access required. Firestore admin write permission is missing.'
        : clientSafeMessage(error, 'Unable to update backend upgrade request.', { context: 'Admin upgrade request update' }))
    } finally {
      setUpdatingId('')
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Upgrade Requests</h1>
            <p className="mt-1 text-sm text-slate-200/80">Review plan upgrade submissions.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              Total: <span className="font-semibold text-white">{stats.total}</span>
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              Pending: <span className="font-semibold text-white">{stats.pending}</span>
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              Approved: <span className="font-semibold text-white">{stats.approved}</span>
            </span>
          </div>
        </div>
      </div>

      {!firebaseEnabled ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
          Firebase is not configured.
        </div>
      ) : error || workerError ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error || workerError}</div>
      ) : null}

      {workerLoading ? (
        <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4 text-sm text-sky-100">
          Syncing Cloudflare D1 upgrade requests…
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
        <div className="min-w-[1260px]">
        <div className="grid grid-cols-[1.15fr_0.75fr_0.7fr_1fr_0.9fr_0.9fr_0.9fr_1.05fr_0.75fr_1fr] gap-0 border-b border-white/10 bg-slate-950/40 px-4 py-3 text-xs font-semibold text-slate-200/90">
          <div>User</div>
          <div>Plan</div>
          <div>Amount</div>
          <div>Transaction ID</div>
          <div>Payment Method</div>
          <div>Sender Name</div>
          <div>Sender Number</div>
          <div>Screenshot</div>
          <div>Status</div>
          <div className="text-right">Actions</div>
        </div>
        {loading && !allItems.length ? (
          <div className="px-4 py-6 text-sm text-slate-200/80">Loading…</div>
        ) : allItems.length === 0 ? (
          <div className="px-4 py-6 text-sm text-slate-200/80">No requests yet.</div>
        ) : (
          <div className="divide-y divide-white/10">
            {allItems.map((item) => (
              <div key={`${item.source || 'firestore'}-${item.id}`} className="grid grid-cols-[1.15fr_0.75fr_0.7fr_1fr_0.9fr_0.9fr_0.9fr_1.05fr_0.75fr_1fr] gap-0 px-4 py-4 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">{item.email || item.userName || item.userId || 'Unknown'}</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-300">
                    {item.source === 'cloudflare-d1' ? <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 font-semibold text-cyan-100">D1 + R2</span> : null}
                    {item.userId ? <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">{item.userId}</span> : null}
                    {proofUrl(item) ? (
                      <a
                        href={proofUrl(item)}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-semibold text-slate-100 hover:bg-white/10"
                      >
                        Screenshot
                      </a>
                    ) : null}
                  </div>
                </div>
                <div className="text-slate-200/90">{item.requestedPlan || item.selectedPlan || item.plan || '-'}</div>
                <div className="text-slate-200/90">{amountLabel(item)}</div>
                <div className="font-mono text-xs text-slate-200/90">{item.transactionId || item.txnId || '-'}</div>
                <div className="text-slate-200/90">{item.paymentMethod || item.method || '-'}</div>
                <div className="text-slate-200/90">{item.senderName || '-'}</div>
                <div className="text-slate-200/90">{item.senderNumber || item.userPhone || item.phone || '-'}</div>
                <div className="text-slate-200/90">
                  {proofUrl(item) ? <a className="font-semibold text-slate-100 hover:underline" href={proofUrl(item)} target="_blank" rel="noreferrer">View Screenshot</a> : 'No Screenshot Uploaded'}
                </div>
                <div>
                  <StatusPill value={item.approvalStatus || 'pending'} />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={updatingId === item.id}
                    onClick={() => updateApproval(item, 'approved')}
                    className="rounded-full bg-emerald-600/20 px-3 py-1.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-600/30 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={updatingId === item.id}
                    onClick={() => updateApproval(item, 'rejected')}
                    className="rounded-full bg-rose-600/20 px-3 py-1.5 text-xs font-semibold text-rose-100 hover:bg-rose-600/30 disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    disabled={updatingId === item.id}
                    onClick={() => updateApproval(item, 'pending')}
                    className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15 disabled:opacity-50"
                  >
                    Pending
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
