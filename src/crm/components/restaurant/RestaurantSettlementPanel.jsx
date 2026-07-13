import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  HiArrowPath,
  HiCheckCircle,
  HiLockClosed,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineInformationCircle,
  HiOutlineLockClosed,
  HiOutlineShieldExclamation,
  HiOutlineXCircle,
  HiXMark,
} from 'react-icons/hi2'
import { formatRestaurantCurrency } from '../../lib/restaurantPosCalculations.js'
import {
  buildRestaurantSessionTimeline,
  buildSettlementSummary,
  classifyDetailedRestaurantCashVariance,
  calculateDifferencePercent,
} from '../../data/restaurantCashData.js'

/* ─── Tab definitions ──────────────────────────────────────────── */

const TABS = [
  { id: 'pending', label: 'Pending Review', icon: HiOutlineShieldExclamation },
  { id: 'approved', label: 'Approved', icon: HiOutlineCheckCircle },
  { id: 'rejected', label: 'Rejected', icon: HiOutlineXCircle },
  { id: 'locked', label: 'Locked', icon: HiOutlineLockClosed },
  { id: 'history', label: 'Settlement History', icon: HiOutlineInformationCircle },
]

/* ─── Timeline icon map ────────────────────────────────────────── */

const TIMELINE_ICONS = {
  play: 'bg-emerald-100 text-emerald-700',
  stop: 'bg-amber-100 text-amber-700',
  refresh: 'bg-sky-100 text-sky-700',
  eye: 'bg-violet-100 text-violet-700',
  check: 'bg-emerald-100 text-emerald-700',
  x: 'bg-rose-100 text-rose-700',
  lock: 'bg-slate-100 text-slate-700',
}

function safeDate(date) {
  if (!date) return '—'
  try {
    return new Date(date).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return '—'
  }
}

/* ══════════════════════════════════════════════════════════════════
   SETTLEMENT PANEL
   ══════════════════════════════════════════════════════════════════ */

export default function RestaurantSettlementPanel({
  sessions = [],
  pendingSettlements = [],
  onClose,
  onApprove,
  onReject,
  onLock,
  onReopen,
  isOwner = false,
  isManager = false,
  currency = 'PKR',
}) {
  const [activeTab, setActiveTab] = useState('pending')
  const [actionTarget, setActionTarget] = useState(null) // { type, session }
  const [actionReason, setActionReason] = useState('')
  const [actionNotes, setActionNotes] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionSubmitting, setActionSubmitting] = useState(false)
  const [expandedSession, setExpandedSession] = useState(null) // session id for timeline

  const canAct = isOwner || isManager

  /* ── Filter sessions by tab ──────────────────────────────────── */

  const filteredSessions = useMemo(() => {
    const all = Array.isArray(sessions) ? sessions : []
    switch (activeTab) {
      case 'pending':
        return Array.isArray(pendingSettlements) ? pendingSettlements : all.filter((s) => s.settlementStatus === 'pending_review' || (s.status === 'closed' && !s.settlementStatus))
      case 'approved':
        return all.filter((s) => s.settlementStatus === 'approved')
      case 'rejected':
        return all.filter((s) => s.settlementStatus === 'rejected')
      case 'locked':
        return all.filter((s) => s.settlementStatus === 'locked')
      case 'history':
        return all
          .filter((s) => s.settlementStatus && s.settlementStatus !== 'pending_review')
          .sort((a, b) => new Date(b.closedAt || b.createdAt) - new Date(a.closedAt || a.createdAt))
      default:
        return []
    }
  }, [sessions, pendingSettlements, activeTab])

  /* ── Stats for tab badges ────────────────────────────────────── */

  const stats = useMemo(() => {
    const all = Array.isArray(sessions) ? sessions : []
    return {
      pending: (Array.isArray(pendingSettlements) ? pendingSettlements : all.filter((s) => s.settlementStatus === 'pending_review' || (s.status === 'closed' && !s.settlementStatus))).length,
      approved: all.filter((s) => s.settlementStatus === 'approved').length,
      rejected: all.filter((s) => s.settlementStatus === 'rejected').length,
      locked: all.filter((s) => s.settlementStatus === 'locked').length,
      history: all.filter((s) => s.settlementStatus && s.settlementStatus !== 'pending_review').length,
    }
  }, [sessions, pendingSettlements])

  /* ── Open action dialog ──────────────────────────────────────── */

  function openAction(type, session) {
    setActionTarget({ type, session })
    setActionReason('')
    setActionNotes('')
    setActionError('')
    setActionSubmitting(false)
  }

  function closeAction() {
    setActionTarget(null)
    setActionReason('')
    setActionNotes('')
    setActionError('')
  }

  /* ── Execute action ──────────────────────────────────────────── */

  async function confirmAction() {
    if (!actionTarget) return
    const { type, session } = actionTarget
    setActionSubmitting(true)
    setActionError('')

    try {
      let result
      if (type === 'approve') {
        result = await onApprove(session.id, { managerNotes: actionNotes, differenceReason: actionReason })
      } else if (type === 'reject') {
        if (!actionReason.trim()) {
          setActionError('Rejection reason is mandatory.')
          setActionSubmitting(false)
          return
        }
        result = await onReject(session.id, { reason: actionReason, managerNotes: actionNotes })
      } else if (type === 'lock') {
        result = await onLock(session.id, { managerNotes: actionNotes })
      } else if (type === 'reopen') {
        result = await onReopen(session.id, {})
      }

      if (result?.ok) {
        closeAction()
      } else {
        setActionError(result?.error || 'Action failed.')
      }
    } catch (err) {
      setActionError(err?.message || 'Unexpected error.')
    } finally {
      setActionSubmitting(false)
    }
  }

  /* ── Difference badges ───────────────────────────────────────── */

  function differenceBadge(session) {
    const classification = classifyDetailedRestaurantCashVariance({
      cashDifference: session.cashDifference,
      cashSales: session.cashSales,
      cashRefunds: session.cashRefunds,
      cashExpenses: session.cashExpenses,
      cashDeposits: session.cashDeposits,
    })
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${classification.badge}`}>
        {classification.label}
      </span>
    )
  }

  /* ── Settlement status badge ─────────────────────────────────── */

  function statusBadge(status) {
    const map = {
      pending_review: 'bg-amber-100 text-amber-800',
      approved: 'bg-emerald-100 text-emerald-800',
      rejected: 'bg-rose-100 text-rose-800',
      locked: 'bg-slate-100 text-slate-800',
    }
    const label = {
      pending_review: 'Pending Review',
      approved: 'Approved',
      rejected: 'Rejected',
      locked: 'Locked',
    }
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${map[status] || 'bg-slate-100 text-slate-600'}`}>
        {label[status] || status}
      </span>
    )
  }

  /* ── Render a single session card ────────────────────────────── */

  function renderSessionCard(session) {
    const summary = buildSettlementSummary(session)
    const diffPercent = session.expectedCash ? calculateDifferencePercent(session.cashDifference, session.expectedCash) : 0
    const isExpanded = expandedSession === session.id
    const timeline = isExpanded ? buildRestaurantSessionTimeline(session) : []

    return (
      <div key={session.id} className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Card header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-3 py-2.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xs font-black text-slate-950">{session.settlementId || 'STL-' + session.id?.slice(0, 8)}</p>
              {statusBadge(session.settlementStatus || session.status)}
              {session.cashDifference ? differenceBadge(session) : null}
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {session.cashierName || 'Cashier'} · Shift {safeDate(session.openedAt)}
            </p>
          </div>
          {canAct && session.settlementStatus === 'pending_review' && (
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={() => openAction('approve', session)}
                className="inline-flex h-7 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 text-[10px] font-black text-emerald-700 hover:bg-emerald-100"
                title="Approve"
              >
                <HiCheckCircle className="h-3 w-3" />
                Approve
              </button>
              <button
                type="button"
                onClick={() => openAction('reject', session)}
                className="inline-flex h-7 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 text-[10px] font-black text-rose-700 hover:bg-rose-100"
                title="Reject"
              >
                <HiXMark className="h-3 w-3" />
                Reject
              </button>
            </div>
          )}
          {canAct && session.settlementStatus === 'approved' && (
            <button
              type="button"
              onClick={() => openAction('lock', session)}
              className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 text-[10px] font-black text-slate-700 hover:bg-slate-100"
              title="Lock"
            >
              <HiLockClosed className="h-3 w-3" />
              Lock
            </button>
          )}
          {isOwner && session.settlementStatus === 'locked' && (
            <button
              type="button"
              onClick={() => openAction('reopen', session)}
              className="inline-flex h-7 items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2 text-[10px] font-black text-sky-700 hover:bg-sky-100"
              title="Reopen"
            >
              <HiArrowPath className="h-3 w-3" />
              Reopen
            </button>
          )}
        </div>

        {/* Card body */}
        <div className="px-3 py-2.5">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] sm:grid-cols-3 lg:grid-cols-4">
            <div>
              <span className="text-slate-400">Cashier</span>
              <p className="font-semibold text-slate-700">{session.cashierName || '—'}</p>
            </div>
            <div>
              <span className="text-slate-400">Open</span>
              <p className="font-semibold text-slate-700">{safeDate(session.openedAt)}</p>
            </div>
            <div>
              <span className="text-slate-400">Close</span>
              <p className="font-semibold text-slate-700">{safeDate(session.closedAt)}</p>
            </div>
            <div>
              <span className="text-slate-400">Expected Cash</span>
              <p className="font-semibold text-slate-700">{formatRestaurantCurrency(session.expectedCash || session.openingCash || 0)}</p>
            </div>
            <div>
              <span className="text-slate-400">Actual Cash</span>
              <p className={`font-semibold ${session.actualClosingCash != null ? 'text-slate-700' : 'text-slate-400'}`}>
                {session.actualClosingCash != null ? formatRestaurantCurrency(session.actualClosingCash) : '—'}
              </p>
            </div>
            <div>
              <span className="text-slate-400">Difference</span>
              <p className={`font-semibold ${session.cashDifference > 0 ? 'text-emerald-700' : session.cashDifference < 0 ? 'text-rose-700' : 'text-slate-700'}`}>
                {session.cashDifference != null ? formatRestaurantCurrency(session.cashDifference) : '—'}
              </p>
            </div>
            <div>
              <span className="text-slate-400">Difference %</span>
              <p className={`font-semibold ${diffPercent > 0 ? 'text-emerald-700' : diffPercent < 0 ? 'text-rose-700' : 'text-slate-700'}`}>
                {session.cashDifference != null ? `${diffPercent >= 0 ? '+' : ''}${Math.round(diffPercent * 100) / 100}%` : '—'}
              </p>
            </div>
            <div>
              <span className="text-slate-400">Transactions</span>
              <p className="font-semibold text-slate-700">{session.totalTransactions || 0}</p>
            </div>
          </div>

          {/* Reason / Notes */}
          {session.differenceReason ? (
            <div className="mt-2 rounded-lg border border-amber-100 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800">
              Reason: {session.differenceReason.replace(/_/g, ' ')}
            </div>
          ) : null}
          {session.rejectionReason ? (
            <div className="mt-2 rounded-lg border border-rose-100 bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-800">
              Rejection: {session.rejectionReason}
            </div>
          ) : null}
          {session.managerNotes ? (
            <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50 px-2 py-1 text-[10px] text-slate-600">
              Notes: {session.managerNotes}
            </div>
          ) : null}

          {/* Reviewer / Approver */}
          {(session.approvedBy || session.rejectedBy || session.lockedBy) ? (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-slate-400">
              {session.approvedBy ? <span>Approved by: {session.approvedBy} · {safeDate(session.approvedAt)}</span> : null}
              {session.rejectedBy ? <span>Rejected by: {session.rejectedBy} · {safeDate(session.rejectedAt)}</span> : null}
              {session.lockedBy ? <span>Locked by: {session.lockedBy} · {safeDate(session.lockedAt)}</span> : null}
            </div>
          ) : null}

          {/* Timeline toggle */}
          <button
            type="button"
            onClick={() => setExpandedSession(isExpanded ? null : session.id)}
            className="mt-2 text-[10px] font-bold text-sky-700 hover:text-sky-900"
          >
            {isExpanded ? 'Hide Timeline' : 'Show Timeline'}
          </button>

          {/* Timeline */}
          {isExpanded && timeline.length > 0 && (
            <div className="mt-2 space-y-0.5 border-l-2 border-slate-200 pl-3">
              {timeline.map((event, i) => (
                <div key={i} className="relative flex items-center gap-2 pb-1.5 text-[10px]">
                  <div className={`grid h-4 w-4 shrink-0 place-items-center rounded-full ${TIMELINE_ICONS[event.icon] || 'bg-slate-100 text-slate-500'}`}>
                    <div className="text-[7px]">{event.icon === 'play' ? '▶' : event.icon === 'stop' ? '■' : event.icon === 'check' ? '✓' : event.icon === 'x' ? '✗' : event.icon === 'lock' ? '🔒' : event.icon === 'refresh' ? '↻' : '●'}</div>
                  </div>
                  <span className="font-semibold text-slate-700">{event.label}</span>
                  <span className="text-slate-400">{safeDate(event.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ── Empty state ─────────────────────────────────────────────── */

  function emptyState(tab) {
    const messages = {
      pending: 'No settlements pending review.',
      approved: 'No approved settlements.',
      rejected: 'No rejected settlements.',
      locked: 'No locked settlements.',
      history: 'No settlement history.',
    }
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">
        <HiOutlineInformationCircle className="mx-auto h-8 w-8 text-slate-300" />
        <p className="mt-2 text-sm font-semibold text-slate-500">{messages[tab] || 'No settlements found.'}</p>
      </div>
    )
  }

  /* ── Render ──────────────────────────────────────────────────── */

  return (
    <>
      {/* Main overlay */}
      <motion.div
        className="fixed inset-0 z-[90] overflow-y-auto bg-slate-950/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="mx-auto min-h-screen max-w-5xl px-3 py-4 sm:px-4 sm:py-6">
          {/* Header */}
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-black text-white">Settlement Manager</h2>
              <p className="text-xs text-slate-300">Manager settlement panel — approve, reject, and lock shift settlements.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-500/40 bg-slate-800 text-sm font-black text-slate-300 hover:bg-slate-700"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Tabs */}
          <div className="mb-3 flex flex-wrap gap-1">
            {TABS.map((tab) => {
              const count = stats[tab.id] || 0
              const isActive = activeTab === tab.id
              const TabIcon = tab.icon
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                    isActive
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <TabIcon className="h-3.5 w-3.5" />
                  {tab.label}
                  {count > 0 ? (
                    <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                      isActive ? 'bg-slate-950 text-white' : 'bg-slate-600 text-slate-200'
                    }`}>
                      {count}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>

          {/* Session list */}
          <div className="space-y-2">
            {filteredSessions.length === 0
              ? emptyState(activeTab)
              : filteredSessions.map(renderSessionCard)
            }
          </div>
        </div>
      </motion.div>

      {/* Action confirmation dialog */}
      {actionTarget && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/60 px-3 py-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {actionTarget.type === 'approve' && 'Approve Settlement'}
                  {actionTarget.type === 'reject' && 'Reject Settlement'}
                  {actionTarget.type === 'lock' && 'Lock Settlement'}
                  {actionTarget.type === 'reopen' && 'Reopen Settlement'}
                </p>
                <h2 className="mt-1 text-lg font-black text-slate-950">
                  {actionTarget.session.settlementId || 'Settlement'}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {actionTarget.session.cashierName} · {safeDate(actionTarget.session.openedAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={closeAction}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-sm font-black text-slate-500 hover:bg-slate-50"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 px-4 py-4">
              {actionError ? (
                <p className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{actionError}</p>
              ) : null}

              {/* Settlement summary */}
              {(() => {
                const s = buildSettlementSummary(actionTarget.session)
                return (
                  <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-[11px]">
                    <div>
                      <span className="text-slate-400">Expected</span>
                      <p className="font-bold text-slate-700">{formatRestaurantCurrency(s.expectedCash)}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Actual</span>
                      <p className="font-bold text-slate-700">{s.actualClosingCash != null ? formatRestaurantCurrency(s.actualClosingCash) : '—'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Difference</span>
                      <p className={`font-bold ${s.cashDifference > 0 ? 'text-emerald-700' : s.cashDifference < 0 ? 'text-rose-700' : 'text-slate-700'}`}>
                        {formatRestaurantCurrency(s.cashDifference)}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Classification</span>
                      <div>{differenceBadge(actionTarget.session)}</div>
                    </div>
                  </div>
                )
              })()}

              {/* Reason (mandatory for rejection) */}
              {actionTarget.type === 'reject' && (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-rose-600">
                    Rejection Reason *
                  </span>
                  <textarea
                    value={actionReason}
                    onChange={(e) => { setActionReason(e.target.value); setActionError('') }}
                    className="min-h-20 w-full resize-none rounded-xl border border-rose-200 px-3 py-2 text-sm outline-none focus:border-rose-400"
                    placeholder="Mandatory — explain why this settlement is rejected..."
                  />
                </label>
              )}

              {/* Reason (optional for approve) */}
              {actionTarget.type === 'approve' && (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-500">Difference Reason</span>
                  <select
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-sky-300"
                  >
                    <option value="">No reason specified</option>
                    <option value="short_cash">Cash Shortage</option>
                    <option value="excess_cash">Cash Excess</option>
                    <option value="counting_mistake">Counting Mistake</option>
                    <option value="refund_error">Refund Error</option>
                    <option value="drawer_adjustment">Drawer Adjustment</option>
                    <option value="system_error">System Error</option>
                    <option value="other">Other</option>
                  </select>
                </label>
              )}

              {/* Manager Notes (approve/lock) */}
              {(actionTarget.type === 'approve' || actionTarget.type === 'lock' || actionTarget.type === 'reject') ? (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-500">Manager Notes</span>
                  <textarea
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    className="min-h-14 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-300"
                    placeholder="Optional notes"
                  />
                </label>
              ) : null}

              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                {actionTarget.type === 'approve' && 'Approval allows manager notes. Difference can be explained.'}
                {actionTarget.type === 'reject' && 'Rejection requires a mandatory reason. This action can be reviewed later.'}
                {actionTarget.type === 'lock' && 'Lock is permanent (can only be reopened by the owner).'}
                {actionTarget.type === 'reopen' && 'Reopen resets the settlement. All approval data is cleared.'}
              </div>
            </div>

            <div className="grid gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={closeAction}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAction}
                disabled={actionSubmitting || (actionTarget.type === 'reject' && !actionReason.trim())}
                className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-black text-white shadow-sm transition disabled:pointer-events-none disabled:opacity-60 ${
                  actionTarget.type === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : actionTarget.type === 'reject'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : actionTarget.type === 'lock'
                        ? 'bg-slate-700 hover:bg-slate-800'
                        : 'bg-sky-600 hover:bg-sky-700'
                }`}
              >
                {actionSubmitting ? (
                  <HiArrowPath className="h-4 w-4 animate-spin" />
                ) : actionTarget.type === 'approve' ? (
                  'Confirm Approve'
                ) : actionTarget.type === 'reject' ? (
                  'Confirm Reject'
                ) : actionTarget.type === 'lock' ? (
                  'Confirm Lock'
                ) : (
                  'Confirm Reopen'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
