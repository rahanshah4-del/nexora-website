import { useEffect, useMemo, useState } from 'react'
import { addDoc, collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '../../lib/firebase.js'
import useAuth from '../../context/useAuth.js'
import { clientSafeMessage } from '../../lib/errorHandler.js'
import { isBackendAdminEmail } from '../../lib/roles.js'
import { buildApprovedSubscriptionPayload } from '../../lib/subscriptionApproval.js'
import { listWorkerUpgradeRequests, updateWorkerUpgradeRequestStatus } from '../../lib/upgradeWorker.js'

function StatusPill({ value }) {
  const normalized = String(value || 'pending').toLowerCase()
  const style =
    normalized === 'approved'
      ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
      : normalized === 'rejected'
        ? 'border-rose-400/30 bg-rose-500/10 text-rose-200'
        : 'border-white/10 bg-white/5 text-slate-200/80'
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${style}`}>{normalized}</span>
}

function proofUrl(item = {}) {
  return item.paymentProof || item.screenshotUrl || item.paymentProofUrl || ''
}

function amountLabel(item = {}) {
  const amount = Number(item.amount ?? item.amountPaid ?? item.planPrice ?? 0) || 0
  const currency = item.currency || item.billingCurrency || 'PKR'
  return amount > 0 ? `${currency} ${amount.toLocaleString('en-US')}` : '-'
}

function dateMs(value) {
  if (!value) return 0
  if (typeof value?.toDate === 'function') return value.toDate().getTime()
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

function cleanId(value) {
  return String(value || '').trim()
}

function requestIdentity(item = {}) {
  const screenshotKey = cleanId(item.screenshotKey || item.paymentProofKey || item.screenshot_key)
  if (screenshotKey) return `proof:${screenshotKey}`
  const transactionId = cleanId(item.transactionId || item.txnId || item.referenceNumber)
  if (transactionId) return `txn:${transactionId.toLowerCase()}`
  const directId = cleanId(item.id || item.requestId || item.request_id)
  if (directId) return `id:${directId}`
  return [
    cleanId(item.userId || item.uid || item.email).toLowerCase(),
    cleanId(item.requestedPlan || item.selectedPlan || item.plan).toLowerCase(),
    cleanId(item.amount || item.amountPaid || item.planPrice),
    cleanId(item.createdAt || item.requestedAt || item.created_at),
  ].filter(Boolean).join('|') || 'row:unknown'
}

function requestDisplayId(item = {}) {
  return cleanId(item.id || item.requestId || item.request_id || item.transactionId || item.txnId || item.referenceNumber) || '-'
}

function confirmUpgradeAction(status) {
  const normalized = String(status || '').replace(/_/g, ' ')
  if (status === 'approved') return window.confirm('Warning: this will approve the upgrade and update the client subscription. Continue?')
  if (status === 'rejected') return window.confirm('Warning: this will reject the upgrade request. Continue?')
  if (status === 'under_review') return window.confirm('Warning: this will mark the request as under Nexora review. Continue?')
  return window.confirm(`Warning: this will change the request status to ${normalized}. Continue?`)
}

function isFinalUpgradeStatus(item = {}) {
  const status = String(item?.approvalStatus || item?.status || item?.paymentStatus || '').toLowerCase()
  return ['approved', 'paid', 'active', 'completed', 'rejected', 'declined', 'failed', 'closed'].includes(status)
}

function mirrorableUpgradeRequest(item = {}, update = {}) {
  const { ref, _store, ...base } = item
  return {
    ...base,
    ...update,
    id: item.id,
    source: item.source || 'cloudflare-d1',
  }
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
  const [remarkDrafts, setRemarkDrafts] = useState({})
  const [rejectingId, setRejectingId] = useState('')

  useEffect(() => {
    if (!firebaseEnabled) return undefined

    const q = query(collection(db, 'upgradeRequests'), orderBy('createdAt', 'desc'), limit(100))
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data(), _store: 'firestore' })))
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
      if (document.hidden) return
      setWorkerLoading(true)
      setWorkerError('')
      try {
        const idToken = await user.getIdToken()
        const rows = await listWorkerUpgradeRequests(idToken, 100)
        if (!cancelled) setWorkerItems(rows.map((row) => ({ ...row, _store: 'worker' })))
      } catch (e) {
        if (!cancelled) setWorkerError(clientSafeMessage(e, 'Failed to load Worker upgrade requests.', { context: 'Worker upgrade requests load' }))
      } finally {
        if (!cancelled) setWorkerLoading(false)
      }
    }
    loadWorkerRequests()
    window.addEventListener('focus', loadWorkerRequests)
    const timer = window.setInterval(loadWorkerRequests, 120000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener('focus', loadWorkerRequests)
    }
  }, [backendAdminAllowed, user])

  const allItems = useMemo(() => {
    const byId = new Map()
    ;[...workerItems, ...items].forEach((row) => {
      if (!row) return
      const key = requestIdentity(row)
      const existing = byId.get(key)
      if (!existing) {
        byId.set(key, row)
        return
      }
      byId.set(key, row._store === 'firestore' ? { ...existing, ...row } : { ...row, ...existing })
    })
    return [...byId.values()]
      .sort((a, b) => dateMs(b.createdAt || b.updatedAt) - dateMs(a.createdAt || a.updatedAt))
  }, [items, workerItems])

  const stats = useMemo(() => {
    const total = allItems.length
    const pending = allItems.filter((x) => x?.approvalStatus === 'pending' || x?.status === 'pending').length
    const approved = allItems.filter((x) => x?.approvalStatus === 'approved' || x?.status === 'approved').length
    return { total, pending, approved }
  }, [allItems])

  async function addTimelineEntry(requestId, entry) {
    await addDoc(collection(db, 'upgradeRequests', requestId, 'timeline'), {
      ...entry,
      actor: 'admin',
      actorName: user?.email || 'Nexora Team',
      createdAt: serverTimestamp(),
    })
  }

  const updateApproval = async (item, approvalStatus) => {
    if (!db) return
    if (!confirmUpgradeAction(approvalStatus)) return
    if (!backendAdminAllowed) {
      setError('Backend admin access required.')
      return
    }
    const id = item?.id
    if (!id) return
    const remark = String(remarkDrafts[id] || '').trim()
    setUpdatingId(id)
    try {
      const isWorkerRequest = item._store === 'worker'
      const idToken = isWorkerRequest ? await user.getIdToken() : ''
      if (approvalStatus !== 'approved') {
        if (isWorkerRequest) {
          const result = await updateWorkerUpgradeRequestStatus(idToken, id, approvalStatus)
          setWorkerItems((current) => current.map((row) => (row.id === id ? result.request || { ...row, approvalStatus, status: approvalStatus } : row)))
          const workerUpdate = {
            status: approvalStatus,
            approvalStatus,
            paymentStatus: approvalStatus === 'rejected' ? 'rejected' : item.paymentStatus || 'pending',
            ...(remark ? { adminRemark: remark, latestAdminRemark: remark } : {}),
            ...(approvalStatus === 'under_review' ? { reviewOpenedBy: user?.email || '', reviewOpenedAt: serverTimestamp() } : {}),
            ...(approvalStatus === 'rejected' ? { rejectedBy: user?.email || '', rejectedAt: serverTimestamp() } : {}),
            updatedAt: serverTimestamp(),
          }
          await setDoc(doc(db, 'upgradeRequests', id), mirrorableUpgradeRequest(item, workerUpdate), { merge: true })
          await addTimelineEntry(id, {
            type: approvalStatus === 'rejected' ? 'rejected' : approvalStatus === 'under_review' ? 'review' : 'status',
            status: approvalStatus,
            title: approvalStatus === 'rejected' ? 'Request rejected' : approvalStatus === 'under_review' ? 'Nexora review started' : 'Status updated',
            message: remark || (approvalStatus === 'rejected'
              ? 'Nexora reviewed your payment proof and rejected this upgrade request.'
              : approvalStatus === 'under_review'
                ? 'Nexora team has opened your request for review.'
                : `Request status changed to ${approvalStatus}.`),
          })
          setRejectingId('')
          return
        }
        await updateDoc(doc(db, 'upgradeRequests', id), {
          status: approvalStatus,
          approvalStatus,
          paymentStatus: approvalStatus === 'rejected' ? 'rejected' : item.paymentStatus || 'pending',
          ...(remark ? { adminRemark: remark, latestAdminRemark: remark } : {}),
          ...(approvalStatus === 'under_review' ? { reviewOpenedBy: user?.email || '', reviewOpenedAt: serverTimestamp() } : {}),
          ...(approvalStatus === 'rejected' ? { rejectedBy: user?.email || '', rejectedAt: serverTimestamp() } : {}),
          updatedAt: serverTimestamp(),
        })
        await addTimelineEntry(id, {
          type: approvalStatus === 'rejected' ? 'rejected' : approvalStatus === 'under_review' ? 'review' : 'status',
          status: approvalStatus,
          title: approvalStatus === 'rejected' ? 'Request rejected' : approvalStatus === 'under_review' ? 'Nexora review started' : 'Status updated',
          message: remark || (approvalStatus === 'rejected'
            ? 'Nexora reviewed your payment proof and rejected this upgrade request.'
            : approvalStatus === 'under_review'
              ? 'Nexora team has opened your request for review.'
              : `Request status changed to ${approvalStatus}.`),
        })
        setRemarkDrafts((current) => ({ ...current, [id]: '' }))
        setRejectingId('')
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
        ...(remark ? { adminRemark: remark, latestAdminRemark: remark } : {}),
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
        await setDoc(doc(db, 'upgradeRequests', id), mirrorableUpgradeRequest(item, requestUpdate), { merge: true })
      }
      await addTimelineEntry(id, {
        type: 'approved',
        status: 'approved',
        title: 'Request approved',
        message: remark || 'Your upgrade request has been approved. Your workspace plan has been updated.',
      })
      setRemarkDrafts((current) => ({ ...current, [id]: '' }))
      setRejectingId('')
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
        <div className="min-w-[1620px]">
        <div className="grid grid-cols-[1.15fr_0.85fr_0.75fr_0.7fr_1fr_0.9fr_0.9fr_0.9fr_1.05fr_0.75fr_1.55fr] gap-0 border-b border-white/10 bg-slate-950/40 px-4 py-3 text-xs font-semibold text-slate-200/90">
          <div>User</div>
          <div>Request ID</div>
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
              <div key={requestIdentity(item)} className="grid grid-cols-[1.15fr_0.85fr_0.75fr_0.7fr_1fr_0.9fr_0.9fr_0.9fr_1.05fr_0.75fr_1.55fr] gap-0 px-4 py-4 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">{item.email || item.userName || item.userId || 'Unknown'}</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-300">
                    {item.source === 'cloudflare-d1' ? <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 font-semibold text-cyan-100">D1 + R2</span> : null}
                    {item._store === 'firestore' ? <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 font-semibold text-emerald-100">Live timeline</span> : null}
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
                <div className="font-mono text-xs text-cyan-100">{requestDisplayId(item)}</div>
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
                  <StatusPill value={item?.approvalStatus || item?.status || 'pending'} />
                </div>
                <div className="flex flex-col items-stretch gap-2">
                  {isFinalUpgradeStatus(item) ? (
                    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-right text-xs font-semibold text-slate-300">
                      Request already {String(item?.approvalStatus || item?.status || 'completed').replace(/_/g, ' ')}. Actions locked.
                    </div>
                  ) : (
                    <>
                      {rejectingId === item.id ? (
                        <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-2">
                          <label className="text-[11px] font-black uppercase tracking-[0.12em] text-rose-100">Reject reason</label>
                          <textarea
                            value={remarkDrafts[item.id] || ''}
                            onChange={(event) => setRemarkDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
                            rows={3}
                            maxLength={1200}
                            placeholder="Write why this upgrade request is being rejected..."
                            className="mt-2 w-full resize-none rounded-xl border border-rose-300/20 bg-slate-950/40 px-3 py-2 text-xs font-semibold text-white outline-none placeholder:text-slate-400 focus:border-rose-200"
                          />
                          <div className="mt-2 flex justify-end gap-2">
                            <button type="button" onClick={() => setRejectingId('')} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15">Cancel</button>
                            <button
                              type="button"
                              disabled={updatingId === item.id || !String(remarkDrafts[item.id] || '').trim()}
                              onClick={() => updateApproval(item, 'rejected')}
                              className="rounded-full bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Confirm Reject
                            </button>
                          </div>
                        </div>
                      ) : null}
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={updatingId === item.id}
                          onClick={() => updateApproval(item, 'under_review')}
                          className="rounded-full bg-sky-600/20 px-3 py-1.5 text-xs font-semibold text-sky-100 hover:bg-sky-600/30 disabled:opacity-50"
                        >
                          Open Review
                        </button>
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
                          onClick={() => setRejectingId(item.id)}
                          className="rounded-full bg-rose-600/20 px-3 py-1.5 text-xs font-semibold text-rose-100 hover:bg-rose-600/30 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </>
                  )}
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
