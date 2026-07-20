import { useEffect, useState } from 'react'
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../../lib/firebase.js'
import { updateReviewStatus } from '../../data/reviewStorage.js'
import { HiOutlineCheck, HiOutlineStar, HiOutlineXMark } from 'react-icons/hi2'

function timeLabel(value) {
  if (!value) return ''
  const d = typeof value?.toDate === 'function' ? value.toDate() : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ClientReviewsPanel() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState('')

  useEffect(() => {
    if (!db) { setLoading(false); return undefined }
    const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'), limit(100))
    return onSnapshot(q, (snap) => {
      setReviews(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => setLoading(false))
  }, [])

  async function handleApprove(reviewId) {
    setActionLoading(reviewId)
    await updateReviewStatus(reviewId, 'approved', true)
    setActionLoading('')
  }

  async function handleReject(reviewId) {
    setActionLoading(reviewId)
    await updateReviewStatus(reviewId, 'rejected', false)
    setActionLoading('')
  }

  const pending = reviews.filter((r) => r.status === 'pending')
  const approved = reviews.filter((r) => r.status === 'approved')
  const rejected = reviews.filter((r) => r.status === 'rejected')

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Client Reviews</h2>
        <p className="mt-1 text-sm text-slate-500">
          {loading ? 'Loading reviews...' : `${reviews.length} total · ${pending.length} pending · ${approved.length} approved · ${rejected.length} rejected`}
        </p>
        {reviews.length === 0 && !loading ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-200 py-12 text-center">
            <HiOutlineStar className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-600">No reviews yet</p>
            <p className="mt-1 text-xs text-slate-400">Client reviews will appear here after they submit feedback.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {reviews.map((review) => {
              const isPending = review.status === 'pending'
              const isApproved = review.status === 'approved'
              const loadingThis = actionLoading === review.id
              return (
                <div key={review.id} className={`rounded-2xl border p-4 transition ${isApproved ? 'border-emerald-200 bg-emerald-50/60' : isPending ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200 bg-slate-50/60'}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{review.userName || review.userEmail || 'Anonymous'}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${isApproved ? 'bg-emerald-100 text-emerald-700' : isPending ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{review.status}</span>
                        {review.isPublic && isApproved ? <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700">Public</span> : null}
                        <span className="text-[11px] text-slate-400">{timeLabel(review.createdAt)}</span>
                      </div>
                      {/* Stars */}
                      <div className="mt-1.5 flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star} className={`text-lg ${star <= (review.rating || 0) ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
                        ))}
                      </div>
                      {review.comment ? (
                        <p className="mt-2 text-sm leading-6 text-slate-700">{review.comment}</p>
                      ) : null}
                      <p className="mt-1 text-xs text-slate-400">
                        {review.workspaceName || 'Unknown workspace'} · {review.module || 'General'} · {review.userEmail || ''}
                      </p>
                    </div>
                    {isPending ? (
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          disabled={loadingThis}
                          onClick={() => handleApprove(review.id)}
                          className="flex h-9 items-center gap-1.5 rounded-full bg-emerald-600 px-4 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <HiOutlineCheck className="h-4 w-4" />
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={loadingThis}
                          onClick={() => handleReject(review.id)}
                          className="flex h-9 items-center gap-1.5 rounded-full bg-rose-100 px-4 text-xs font-bold text-rose-700 transition hover:bg-rose-200 disabled:opacity-50"
                        >
                          <HiOutlineXMark className="h-4 w-4" />
                          Reject
                        </button>
                      </div>
                    ) : isApproved ? (
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          disabled={loadingThis}
                          onClick={() => handleReject(review.id)}
                          className="flex h-9 items-center gap-1.5 rounded-full bg-rose-50 px-4 text-xs font-bold text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                        >
                          Unpublish
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
