import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  HiOutlineChatBubbleLeftRight,
  HiOutlineCheckBadge,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlineEllipsisVertical,
  HiOutlineFlag,
  HiOutlineHandThumbUp,
  HiOutlineShieldCheck,
  HiOutlineStar,
} from 'react-icons/hi2'
import useAuth from '../context/useAuth.js'
import {
  approveComment,
  calculateAverageRating,
  deleteComment,
  hideComment,
  listenBlogComments,
  markHelpful,
  pinComment,
  rejectComment,
  reportComment,
  submitComment,
  teamReply,
  validateComment,
} from '../lib/blogComments.js'

const PAGE_SIZE = 5

function StarInput({ value, onChange }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star === value ? 0 : star)}
          className="p-0.5 transition hover:scale-110 active:scale-90"
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
        >
          <HiOutlineStar
            className={`h-5 w-5 ${
              star <= value ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'
            } transition-colors duration-150`}
          />
        </button>
      ))}
    </div>
  )
}

function Stars({ rating, size = 'sm' }) {
  const cls = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
  return (
    <div className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <HiOutlineStar
          key={star}
          className={`${cls} ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`}
        />
      ))}
    </div>
  )
}

function timeAgo(date) {
  if (!date) return ''
  const d = date?.toDate ? date.toDate() : new Date(date)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })
}

const DEFAULT_AVATAR = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="#e2e8f0" rx="8"/><text x="20" y="26" text-anchor="middle" font-size="18" font-weight="700" fill="#94a3b8" font-family="Inter,sans-serif">?</text></svg>'
)

function CommentAvatar({ name }) {
  const initial = (name || '?').charAt(0).toUpperCase()
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="#dbeafe" rx="10"/><text x="20" y="26" text-anchor="middle" font-size="18" font-weight="700" fill="#3b82f6" font-family="Inter,sans-serif">${initial}</text></svg>`
  )
  return (
    <img
      src={`data:image/svg+xml,${svg}`}
      alt={`${name || 'User'}'s avatar`}
      className="h-9 w-9 flex-shrink-0 rounded-xl"
      loading="lazy"
      decoding="async"
    />
  )
}

export default function BlogComments({ slug }) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('newest')
  const [page, setPage] = useState(1)
  const [average, setAverage] = useState(0)
  const [ratingCount, setRatingCount] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [replyTo, setReplyTo] = useState(null)
  const [errors, setErrors] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [adminMenu, setAdminMenu] = useState(null)
  const [teamReplyText, setTeamReplyText] = useState({})
  const formRef = useRef(null)
  const { isAdmin, user } = useAuth()
  const [formRating, setFormRating] = useState(0)

  /* ── Load comments ── */
  useEffect(() => {
    setLoading(true)
    return listenBlogComments(
      slug,
      sortBy,
      (data) => {
        setComments(data)
        setLoading(false)
      },
      () => setLoading(false),
    )
  }, [slug, sortBy])

  /* ── Calculate average rating from comments ── */
  useEffect(() => {
    const r = calculateAverageRating(comments)
    setAverage(r.average)
    setRatingCount(r.count)
  }, [comments])

  /* ── Sort & paginate ── */
  const sortedComments = useMemo(() => {
    let sorted = [...comments]
    if (sortBy === 'helpful') sorted.sort((a, b) => (b.helpful?.length || 0) - (a.helpful?.length || 0))
    const pinned = sorted.filter((c) => c.pinned)
    const rest = sorted.filter((c) => !c.pinned)
    return [...pinned, ...rest]
  }, [comments, sortBy])

  const visibleComments = useMemo(
    () => sortedComments.filter((c) => !c.parentId).slice(0, page * PAGE_SIZE),
    [sortedComments, page],
  )
  const totalParentComments = sortedComments.filter((c) => !c.parentId).length
  const hasMore = page * PAGE_SIZE < totalParentComments

  const repliesFor = useCallback(
    (parentId) => sortedComments.filter((c) => c.parentId === parentId),
    [sortedComments],
  )

  /* ── Submit ── */
  async function handleSubmit(event) {
    event.preventDefault()
    setErrors([])
    const data = Object.fromEntries(new FormData(event.target))
    const errs = validateComment({ authorName: data.authorName, comment: data.comment })
    if (errs.length) { setErrors(errs); return }
    setSubmitting(true)
    try {
      await submitComment({
        slug,
        parentId: replyTo?.id || null,
        authorName: data.authorName,
        authorEmail: data.authorEmail,
        comment: data.comment,
        rating: replyTo ? null : (formRating || null),
      })
      event.target.reset()
      setFormRating(0)
      setReplyTo(null)
      setShowForm(false)
      setErrors([])
    } catch (e) {
      setErrors([e.message || 'Failed to submit comment.'])
    }
    setSubmitting(false)
  }

  /* ── Admin actions ── */
  async function handleApprove(id) { try { await approveComment(id); setAdminMenu(null) } catch {} }
  async function handleReject(id) { try { await rejectComment(id); setAdminMenu(null) } catch {} }
  async function handleDelete(id) { if (window.confirm('Delete this comment permanently?')) { try { await deleteComment(id); setAdminMenu(null) } catch {} } }
  async function handleHide(id, hidden) { try { await hideComment(id, hidden); setAdminMenu(null) } catch {} }
  async function handlePin(id, pinned) { try { await pinComment(id, pinned); setAdminMenu(null) } catch {} }
  async function handleTeamReply(parentId) {
    const text = teamReplyText[parentId]
    if (!text || text.trim().length < 2) return
    try {
      await teamReply({ slug, parentId, comment: text.trim() })
      setTeamReplyText((prev) => ({ ...prev, [parentId]: '' }))
      setAdminMenu(null)
    } catch {}
  }

  /* ── Helpful / Report ── */
  async function handleHelpful(id) { try { await markHelpful(id) } catch {} }
  async function handleReport(id) { try { await reportComment(id) } catch {} }

  return (
    <section className="mt-14">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-lg border border-blue-100/60 bg-white/80 px-3.5 py-2 text-[0.7rem] font-extrabold uppercase tracking-[0.16em] text-blue-700 shadow-sm backdrop-blur-sm">
            <HiOutlineChatBubbleLeftRight className="h-3.5 w-3.5" />
            Comments & Reviews
          </span>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Stars rating={Math.round(average)} />
              <span className="text-sm font-bold text-slate-700">{average > 0 ? average.toFixed(1) : '—'}</span>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              {ratingCount > 0 ? `${ratingCount} review${ratingCount > 1 ? 's' : ''}` : 'No reviews yet'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Sort controls ── */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-100 bg-white p-1 shadow-sm">
          {['newest', 'oldest', 'highest', 'helpful'].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => { setSortBy(key); setPage(1) }}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-[0.96] ${
                sortBy === key ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              {key === 'newest' ? 'Newest' : key === 'oldest' ? 'Oldest' : key === 'highest' ? 'Highest Rated' : 'Most Helpful'}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => { setShowForm((s) => !s); setReplyTo(null); setErrors([]) }}
          className="inline-flex items-center gap-1.5 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white px-4 py-2 text-sm font-bold text-blue-700 shadow-sm transition-all duration-200 hover:border-blue-200 hover:from-blue-100 hover:shadow-md active:scale-[0.97]"
        >
          <HiOutlineChatBubbleLeftRight className="h-4 w-4" />
          Write a review
        </button>
      </div>

      {/* ── Comment form ── */}
      {(showForm || replyTo) && (
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="mt-6 rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-5 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] sm:p-6"
        >
          {replyTo ? (
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-bold text-slate-500">
                Replying to <span className="text-blue-700">{replyTo.authorName}</span>
              </p>
              <button type="button" onClick={() => setReplyTo(null)} className="text-xs font-bold text-slate-400 hover:text-slate-700">
                Cancel
              </button>
            </div>
          ) : (
            <div className="mb-4">
              <p className="text-xs font-bold text-slate-500">Your rating</p>
              <StarInput value={formRating} onChange={setFormRating} />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <input
              name="authorName"
              placeholder="Your name *"
              required
              maxLength={80}
              className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />
            <input
              name="authorEmail"
              type="email"
              placeholder="Email (optional)"
              maxLength={254}
              className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <textarea
            name="comment"
            placeholder={replyTo ? 'Write your reply...' : 'Share your thoughts about this article...'}
            required
            rows={4}
            maxLength={2000}
            className="mt-3 min-h-24 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 resize-y"
          />
          {errors.length > 0 && (
            <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
              {errors.map((err, i) => (
                <p key={i} className="text-xs font-semibold text-red-600">{err}</p>
              ))}
            </div>
          )}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-[0.65rem] font-semibold text-slate-400">Comments are moderated before publishing.</p>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.97] disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      )}

      {/* ── Comments list ── */}
      <div className="mt-8 grid gap-5">
        {loading && (
          <div className="flex items-center justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700" />
          </div>
        )}

        {!loading && visibleComments.length === 0 && (
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 px-6 py-10 text-center">
            <HiOutlineChatBubbleLeftRight className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-500">No comments yet. Be the first to share your thoughts!</p>
          </div>
        )}

        {visibleComments.map((comment) => (
          <CommentThread
            key={comment.id}
            comment={comment}
            replies={repliesFor(comment.id)}
            isAdmin={isAdmin}
            user={user}
            onReply={setReplyTo}
            onApprove={handleApprove}
            onReject={handleReject}
            onDelete={handleDelete}
            onHide={handleHide}
            onPin={handlePin}
            onTeamReply={handleTeamReply}
            onHelpful={handleHelpful}
            onReport={handleReport}
            adminMenu={adminMenu}
            setAdminMenu={setAdminMenu}
            teamReplyText={teamReplyText}
            setTeamReplyText={setTeamReplyText}
          />
        ))}

        {hasMore && (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-800 active:scale-[0.97]"
            >
              <HiOutlineChevronDown className="h-4 w-4" />
              Load more comments
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

function CommentThread({
  comment,
  replies,
  isAdmin,
  user,
  onReply,
  onApprove,
  onReject,
  onDelete,
  onHide,
  onPin,
  onTeamReply,
  onHelpful,
  onReport,
  adminMenu,
  setAdminMenu,
  teamReplyText,
  setTeamReplyText,
}) {
  const [expanded, setExpanded] = useState(comment.pinned)
  const [showTeamReply, setShowTeamReply] = useState(false)
  const isTeam = comment.isTeamReply

  const statusBadge = comment.status === 'pending' ? (
    <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[0.6rem] font-bold text-amber-600">Pending</span>
  ) : comment.status === 'hidden' ? (
    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[0.6rem] font-bold text-slate-500">Hidden</span>
  ) : null

  return (
    <div className={`rounded-2xl border transition-all duration-200 ${comment.pinned ? 'border-blue-200 bg-blue-50/30 shadow-sm' : comment.status === 'pending' ? 'border-amber-100 bg-amber-50/20' : 'border-slate-100 bg-white'}`}>
      {comment.pinned && (
        <div className="flex items-center gap-1.5 border-b border-blue-100/50 px-5 pt-3 pb-2">
          <HiOutlineShieldCheck className="h-3.5 w-3.5 text-blue-600" />
          <span className="text-[0.6rem] font-extrabold uppercase tracking-[0.12em] text-blue-700">Pinned</span>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {isTeam ? (
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-sm">
                <HiOutlineShieldCheck className="h-5 w-5" />
              </div>
            ) : (
              <CommentAvatar name={comment.authorName} />
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-sm font-black ${isTeam ? 'text-blue-700' : 'text-slate-900'}`}>
                  {comment.authorName}
                  {comment.isTeamReply && (
                    <span className="ml-1.5 inline-flex items-center gap-1 rounded-md bg-blue-100 px-1.5 py-0.5 text-[0.55rem] font-extrabold uppercase tracking-[0.08em] text-blue-700">
                      <HiOutlineCheckBadge className="h-2.5 w-2.5" />
                      Team
                    </span>
                  )}
                </span>
                {comment.rating && !comment.parentId && <Stars rating={comment.rating} />}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">{timeAgo(comment.createdAt)}</span>
                {statusBadge}
              </div>
            </div>
          </div>

          {/* ── Admin menu ── */}
          {isAdmin && (
            <div className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => setAdminMenu(adminMenu === comment.id ? null : comment.id)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <HiOutlineEllipsisVertical className="h-4 w-4" />
              </button>
              {adminMenu === comment.id && (
                <div className="absolute right-0 top-8 z-20 w-44 rounded-xl border border-slate-100 bg-white py-1.5 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.2)]">
                  {comment.status === 'pending' && (
                    <>
                      <button type="button" onClick={() => onApprove(comment.id)} className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-bold text-green-700 hover:bg-green-50">Approve</button>
                      <button type="button" onClick={() => onReject(comment.id)} className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50">Reject</button>
                    </>
                  )}
                  <button type="button" onClick={() => onDelete(comment.id)} className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50">Delete permanently</button>
                  <button type="button" onClick={() => onHide(comment.id, comment.status !== 'hidden')} className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-bold text-slate-600 hover:bg-slate-50">{comment.status === 'hidden' ? 'Unhide' : 'Hide'}</button>
                  <button type="button" onClick={() => onPin(comment.id, !comment.pinned)} className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-bold text-blue-700 hover:bg-blue-50">{comment.pinned ? 'Unpin' : 'Pin to top'}</button>
                  <button type="button" onClick={() => { setShowTeamReply((s) => s !== comment.id ? comment.id : null); setAdminMenu(null) }} className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-bold text-blue-700 hover:bg-blue-50">Reply as Team</button>
                </div>
              )}
            </div>
          )}
        </div>

        <p className={`mt-3 text-sm leading-7 ${comment.status === 'hidden' ? 'text-slate-400 italic' : 'text-slate-600'}`}>
          {comment.status === 'hidden' ? '[Comment hidden]' : comment.comment}
        </p>

        {/* ── Actions bar ── */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {!isAdmin && (
            <button
              type="button"
              onClick={() => onReply(comment)}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-blue-700 active:scale-[0.96]"
            >
              <HiOutlineChatBubbleLeftRight className="h-3.5 w-3.5" />
              Reply
            </button>
          )}
          <button
            type="button"
            onClick={() => onHelpful(comment.id)}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-green-700 active:scale-[0.96]"
          >
            <HiOutlineHandThumbUp className="h-3.5 w-3.5" />
            Helpful ({comment.helpful?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => onReport(comment.id)}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-400 transition hover:bg-red-50 hover:text-red-600 active:scale-[0.96]"
            title="Report this comment"
          >
            <HiOutlineFlag className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* ── Team reply input ── */}
        {showTeamReply === comment.id && (
          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-700 mb-2">Reply as Nexora Team</p>
            <textarea
              value={teamReplyText[comment.id] || ''}
              onChange={(e) => setTeamReplyText((prev) => ({ ...prev, [comment.id]: e.target.value }))}
              placeholder="Write team reply..."
              rows={3}
              maxLength={2000}
              className="w-full rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 resize-y"
            />
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" onClick={() => { setShowTeamReply(false); setTeamReplyText((prev) => ({ ...prev, [comment.id]: '' })) }} className="rounded-xl px-4 py-2 text-xs font-bold text-slate-500 hover:bg-white active:scale-[0.97]">Cancel</button>
              <button type="button" onClick={() => onTeamReply(comment.id)} className="rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-800 active:scale-[0.97]">Send reply</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Replies ── */}
      {replies.length > 0 && (
        <div className="border-t border-slate-100">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="flex w-full items-center justify-between px-5 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 transition"
          >
            <span>{replies.length} repl{replies.length > 1 ? 'ies' : 'y'}</span>
            {expanded ? <HiOutlineChevronUp className="h-3.5 w-3.5" /> : <HiOutlineChevronDown className="h-3.5 w-3.5" />}
          </button>
          {expanded && (
            <div className="grid gap-0 px-5 pb-5">
              {replies.map((reply) => (
                <div key={reply.id} className="border-t border-slate-50 pt-4 mt-3 first:mt-0 first:border-0 first:pt-0">
                  <div className="flex items-start gap-3">
                    {reply.isTeamReply ? (
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-sm">
                        <HiOutlineShieldCheck className="h-4 w-4" />
                      </div>
                    ) : (
                      <CommentAvatar name={reply.authorName} />
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-sm font-black ${reply.isTeamReply ? 'text-blue-700' : 'text-slate-900'}`}>
                          {reply.authorName}
                          {reply.isTeamReply && (
                            <span className="ml-1.5 inline-flex items-center gap-1 rounded-md bg-blue-100 px-1.5 py-0.5 text-[0.55rem] font-extrabold uppercase tracking-[0.08em] text-blue-700">
                              <HiOutlineCheckBadge className="h-2.5 w-2.5" />
                              Team
                            </span>
                          )}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">{timeAgo(reply.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-sm leading-7 text-slate-600">{reply.comment}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
