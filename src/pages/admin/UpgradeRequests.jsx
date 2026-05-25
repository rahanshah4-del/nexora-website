import { useEffect, useMemo, useState } from 'react'
import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '../../lib/firebase.js'

function StatusPill({ value }) {
  const style =
    value === 'approved'
      ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
      : value === 'rejected'
        ? 'border-rose-400/30 bg-rose-500/10 text-rose-200'
        : 'border-white/10 bg-white/5 text-slate-200/80'
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${style}`}>{value}</span>
}

export default function UpgradeRequests() {
  const firebaseEnabled = Boolean(db)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(() => firebaseEnabled)
  const [error, setError] = useState('')
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
        setError(e?.message || 'Failed to load upgrade requests.')
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [firebaseEnabled])

  const stats = useMemo(() => {
    const total = items.length
    const pending = items.filter((x) => x.approvalStatus === 'pending').length
    const approved = items.filter((x) => x.approvalStatus === 'approved').length
    return { total, pending, approved }
  }, [items])

  const updateApproval = async (item, approvalStatus) => {
    if (!db) return
    const id = item?.id
    if (!id) return
    setUpdatingId(id)
    try {
      if (approvalStatus !== 'approved' || !item.userId) {
        await updateDoc(doc(db, 'upgradeRequests', id), { approvalStatus })
        return
      }

      const batch = writeBatch(db)
      const planUpdate = {
        plan: item.selectedPlan || item.requestedPlan || 'Business',
        planStatus: 'active',
        billingCycle: item.billingCycle || 'monthly',
        upgradedAt: serverTimestamp(),
      }
      batch.update(doc(db, 'upgradeRequests', id), {
        approvalStatus: 'approved',
        paymentStatus: 'paid',
        approvedAt: serverTimestamp(),
      })
      batch.set(doc(db, 'users', item.userId), planUpdate, { merge: true })
      batch.set(
        doc(db, 'workspaces', item.userId),
        {
          ...planUpdate,
          ownerId: item.userId,
          userId: item.userId,
          workspaceId: item.userId,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
      await batch.commit()
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
            <p className="mt-1 text-sm text-slate-200/80">Review Business plan upgrade submissions.</p>
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
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <div className="grid grid-cols-[1.2fr_1fr_0.8fr_0.8fr_1fr] gap-0 border-b border-white/10 bg-slate-950/40 px-4 py-3 text-xs font-semibold text-slate-200/90">
          <div>User</div>
          <div>Plan</div>
          <div>Payment</div>
          <div>Status</div>
          <div className="text-right">Actions</div>
        </div>
        {loading ? (
          <div className="px-4 py-6 text-sm text-slate-200/80">Loading…</div>
        ) : items.length === 0 ? (
          <div className="px-4 py-6 text-sm text-slate-200/80">No requests yet.</div>
        ) : (
          <div className="divide-y divide-white/10">
            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-[1.2fr_1fr_0.8fr_0.8fr_1fr] gap-0 px-4 py-4 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">{item.email || item.userName || item.userId || 'Unknown'}</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-300">
                    {item.userId ? <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">{item.userId}</span> : null}
                    {item.screenshotUrl ? (
                      <a
                        href={item.screenshotUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-semibold text-slate-100 hover:bg-white/10"
                      >
                        Screenshot
                      </a>
                    ) : null}
                  </div>
                </div>
                <div className="text-slate-200/90">{item.selectedPlan || '-'}</div>
                <div className="text-slate-200/90">{item.paymentMethod || '-'}</div>
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
                    onClick={() => updateApproval(item.id, 'pending')}
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
  )
}
