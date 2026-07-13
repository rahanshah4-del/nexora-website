/**
 * Pure data-model and validation helpers for Restaurant POS cash sessions.
 *
 * No Firebase imports, no browser APIs, no localStorage, no random ID generation,
 * no input mutation — only serializable plain objects returned.
 */
import { restaurantBusinessDateKey } from '../lib/restaurantBusinessDay.js'

/* ─── Supported values ─────────────────────────────────────────── */

const SUPPORTED_SESSION_STATUSES = Object.freeze([
  'open', 'closed', 'pending_review', 'approved', 'rejected', 'locked', 'reconciled', 'disputed',
])

const SUPPORTED_SETTLEMENT_STATUSES = Object.freeze([
  'draft', 'pending_review', 'approved', 'rejected', 'locked',
])

const DIFFERENCE_REASONS = Object.freeze([
  'short_cash', 'excess_cash', 'counting_mistake', 'refund_error',
  'drawer_adjustment', 'system_error', 'other',
])

const SUPPORTED_MOVEMENT_TYPES = Object.freeze([
  'deposit', 'withdrawal',
])

/* ─── Safe number guard ────────────────────────────────────────── */

function safeMoney(value) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

function rawNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/* ─── Normalizers ──────────────────────────────────────────────── */

export function normalizeRestaurantCashSessionStatus(value) {
  const raw = String(value ?? '').trim().toLowerCase()
  if (raw === 'open') return 'open'
  if (raw === 'closed' || raw === 'close') return 'closed'
  if (raw === 'pending_review' || raw === 'pending review') return 'pending_review'
  if (raw === 'approved' || raw === 'approve') return 'approved'
  if (raw === 'rejected' || raw === 'reject') return 'rejected'
  if (raw === 'locked') return 'locked'
  if (raw === 'reconciled' || raw === 'reconcile') return 'reconciled'
  if (raw === 'disputed' || raw === 'dispute') return 'disputed'
  return 'open'
}

export function normalizeDifferenceReason(value) {
  const raw = String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  if (DIFFERENCE_REASONS.includes(raw)) return raw
  return ''
}

export function normalizeRestaurantCashMovementType(value) {
  const raw = String(value ?? '').trim().toLowerCase()
  if (raw === 'deposit' || raw === 'dep') return 'deposit'
  if (raw === 'withdrawal' || raw === 'withdraw' || raw === 'wd' || raw === 'with') return 'withdrawal'
  return 'deposit'
}

/* ─── Create cash session record ───────────────────────────────── */

export function createRestaurantCashSessionRecord(input = {}) {
  const status = normalizeRestaurantCashSessionStatus(input.status)

  let openedAt = ''
  let closedAt = ''
  let businessDay = ''

  if (input.openedAt) {
    const d = new Date(input.openedAt)
    if (!Number.isNaN(d.getTime())) openedAt = d.toISOString()
  }
  if (input.closedAt) {
    const d = new Date(input.closedAt)
    if (!Number.isNaN(d.getTime())) closedAt = d.toISOString()
  }
  // Derive businessDay from openedAt
  if (openedAt) {
    businessDay = restaurantBusinessDateKey(new Date(openedAt), input.settings)
  }

  const openingCash = safeMoney(input.openingCash)
  const closingCash =
    status === 'open' ? null : safeMoney(input.closingCash)
  const actualClosingCash =
    status === 'open'
      ? null
      : input.actualClosingCash !== undefined && input.actualClosingCash !== null
        ? rawNumber(input.actualClosingCash)
        : null

  const expectedCash =
    status === 'open' ? null : rawNumber(input.expectedCash)
  const cashDifference =
    status === 'open' ? null : rawNumber(input.cashDifference)
  const varianceStatus =
    status === 'open' ? '' : String(input.varianceStatus || '')
  const settlementCompletedAt =
    status !== 'open' && input.settlementCompletedAt ? String(input.settlementCompletedAt) : ''

  const record = {
    workspaceId: String(input.workspaceId ?? ''),
    businessType: String(input.businessType ?? ''),
    cashierId: String(input.cashierId ?? ''),
    cashierName: String(input.cashierName ?? ''),
    status,
    settlementStatus: status === 'open' || status === 'closed' ? '' : String(input.settlementStatus || ''),
    openingCash,
    closingCash,
    expectedCash: expectedCash,
    actualClosingCash,
    cashDifference: cashDifference,
    cashSales: status === 'open' ? null : safeMoney(input.cashSales),
    cashRefunds: status === 'open' ? null : safeMoney(input.cashRefunds),
    cashDeposits: status === 'open' ? null : safeMoney(input.cashDeposits),
    cashWithdrawals: status === 'open' ? null : safeMoney(input.cashWithdrawals),
    cashExpenses: status === 'open' ? null : safeMoney(input.cashExpenses),
    cashAdjustments: status === 'open' ? null : rawNumber(input.cashAdjustments),
    totalTransactions: status === 'open' ? null : rawNumber(input.totalTransactions),
    averageSale: status === 'open' ? null : safeMoney(input.averageSale),
    largestSale: status === 'open' ? null : safeMoney(input.largestSale),
    largestRefund: status === 'open' ? null : safeMoney(input.largestRefund),
    varianceStatus,
    settlementCompletedAt,
    settledBy: status !== 'open' ? String(input.settledBy || '') : '',
    reviewedBy: String(input.reviewedBy || ''),
    reviewedAt: String(input.reviewedAt || ''),
    approvedBy: String(input.approvedBy || ''),
    approvedAt: String(input.approvedAt || ''),
    lockedAt: String(input.lockedAt || ''),
    lockedBy: String(input.lockedBy || ''),
    differenceReason: normalizeDifferenceReason(input.differenceReason),
    managerNotes: String(input.managerNotes || ''),
    settlementId: input.settlementId || '',
    openedAt,
    closedAt,
    businessDay,
    managerApprovedBy: String(input.managerApprovedBy ?? ''),
    notes: String(input.notes ?? ''),
    createdAt: openedAt,
    updatedAt: closedAt || openedAt,
  }

  return record
}

/* ─── Create cash movement record ──────────────────────────────── */

export function createRestaurantCashMovementRecord(input = {}) {
  const type = normalizeRestaurantCashMovementType(input.type)

  let createdAt = ''
  if (input.createdAt) {
    const d = new Date(input.createdAt)
    if (!Number.isNaN(d.getTime())) createdAt = d.toISOString()
  }

  const amount = safeMoney(input.amount)

  const record = {
    sessionId: String(input.sessionId ?? ''),
    workspaceId: String(input.workspaceId ?? ''),
    businessType: String(input.businessType ?? ''),
    cashierId: String(input.cashierId ?? ''),
    cashierName: String(input.cashierName ?? ''),
    type,
    amount,
    reason: String(input.reason ?? ''),
    managerApprovedBy: String(input.managerApprovedBy ?? ''),
    referenceNumber: String(input.referenceNumber ?? ''),
    createdAt,
  }

  return record
}

/* ─── Validate cash session ────────────────────────────────────── */

export function validateRestaurantCashSession(record = {}) {
  const errors = []

  if (!record.workspaceId) errors.push('workspaceId is required')
  if (!record.cashierId) errors.push('cashierId is required')
  if (!SUPPORTED_SESSION_STATUSES.includes(record.status)) {
    errors.push(`status "${record.status}" is not supported`)
  }
  if (record.openingCash < 0) errors.push('openingCash cannot be negative')
  if (!Number.isFinite(record.openingCash)) errors.push('openingCash must be a finite number')

  // Non-open sessions require closedAt
  if (record.status !== 'open' && !record.closedAt) {
    errors.push('closedAt is required for non-open sessions')
  }

  // Settlement statuses require more structure
  if (['pending_review', 'approved', 'rejected', 'locked'].includes(record.status)) {
    if (record.actualClosingCash === null || record.actualClosingCash === undefined) {
      errors.push('actualClosingCash is required for settlement sessions')
    }
    if (!Number.isFinite(record.actualClosingCash)) {
      errors.push('actualClosingCash must be a finite number')
    }
  }
  // Approved/Locked require approvedBy
  if ((record.status === 'approved' || record.status === 'locked') && !record.approvedBy) {
    errors.push('approvedBy is required for approved/locked sessions')
  }
  // Locked require lockedBy
  if (record.status === 'locked' && !record.lockedBy) {
    errors.push('lockedBy is required for locked sessions')
  }

  return {
    valid: errors.length === 0,
    errors,
    record,
  }
}

/* ─── Validate cash movement ───────────────────────────────────── */

export function validateRestaurantCashMovement(record = {}) {
  const errors = []

  if (!record.workspaceId) errors.push('workspaceId is required')
  if (!record.sessionId) errors.push('sessionId is required')
  if (!record.cashierId) errors.push('cashierId is required')
  if (!SUPPORTED_MOVEMENT_TYPES.includes(record.type)) {
    errors.push(`type "${record.type}" is not supported`)
  }
  if (record.amount <= 0) errors.push('amount must be greater than zero')
  if (!Number.isFinite(record.amount)) errors.push('amount must be a finite number')
  if (!record.reason) errors.push('reason is required')

  return {
    valid: errors.length === 0,
    errors,
    record,
  }
}

/* ─── Calculate expected cash ──────────────────────────────────── */

/**
 * Formula:
 *   openingCash
 *   + completed cash payments
 *   + cash deposits
 *   - completed cash refunds
 *   - cash withdrawals
 *   - cash expenses
 *   + cash adjustments
 *
 * Does NOT include: card/bank/JazzCash/Easypaisa, failed/pending payments,
 *   cancelled movements.
 */
export function calculateExpectedRestaurantCash({
  openingCash = 0,
  completedCashPayments = 0,
  cashDeposits = 0,
  completedCashRefunds = 0,
  cashWithdrawals = 0,
  cashExpenses = 0,
  cashAdjustments = 0,
} = {}) {
  const opening = safeMoney(openingCash)
  const payments = safeMoney(completedCashPayments)
  const deposits = safeMoney(cashDeposits)
  const refunds = safeMoney(completedCashRefunds)
  const withdrawals = safeMoney(cashWithdrawals)
  const expenses = safeMoney(cashExpenses)
  const adjustments = rawNumber(cashAdjustments)

  return opening + payments + deposits - refunds - withdrawals - expenses + adjustments
}

/* ─── Calculate cash difference ────────────────────────────────── */

/**
 * actualClosingCash - expectedCash
 *
 * Negative difference MUST remain negative (loss/shortage is not clamped to zero).
 */
export function calculateRestaurantCashDifference(actualClosingCash, expectedCash) {
  const actual = rawNumber(actualClosingCash)
  const expected = rawNumber(expectedCash)
  const difference = actual - expected
  // Return as-is — negative must remain negative
  return difference
}

/* ─── Variance thresholds ──────────────────────────────────────── */

const VARINCE_THRESHOLD_MAJOR = 500
const VARINCE_THRESHOLD_MINOR = 50

/**
 * Classify cash variance into a human-readable status.
 *
 *   difference === 0           → 'balanced'
 *   |difference| <= minor      → 'balanced'
 *   |difference| > minor       → 'minor_excess' or 'minor_short'
 *   |difference| > major       → 'major_excess' or 'major_short'
 */
export function classifyRestaurantCashVariance(difference, options = {}) {
  const diff = rawNumber(difference)
  const majorThreshold = Number(options?.thresholdMajor) || VARINCE_THRESHOLD_MAJOR
  const minorThreshold = Number(options?.thresholdMinor) || VARINCE_THRESHOLD_MINOR

  if (diff === 0) return 'balanced'
  const abs = Math.abs(diff)
  if (abs <= minorThreshold) return 'balanced'
  if (diff > 0) return abs > majorThreshold ? 'major_excess' : 'minor_excess'
  return abs > majorThreshold ? 'major_short' : 'minor_short'
}

/* ─── Build session close data payload ─────────────────────────── */

/**
 * Build the full close payload for a cash session update.
 * Pure function — all computation done here.
 */
export function buildRestaurantCashSessionCloseData({
  openingCash = 0,
  actualClosingCash = 0,
  cashSales = 0,
  cashRefunds = 0,
  cashDeposits = 0,
  cashWithdrawals = 0,
  cashExpenses = 0,
  cashAdjustments = 0,
  totalTransactions = 0,
  averageSale = 0,
  largestSale = 0,
  largestRefund = 0,
  varianceOptions = {},
  settledBy = '',
  managerApprovedBy = '',
  notes = '',
  closedAt = '',
} = {}) {
  const op = safeMoney(openingCash)
  const actual = rawNumber(actualClosingCash)
  const sales = safeMoney(cashSales)
  const refunds = safeMoney(cashRefunds)
  const deposits = safeMoney(cashDeposits)
  const withdrawals = safeMoney(cashWithdrawals)
  const expenses = safeMoney(cashExpenses)
  const adjustments = rawNumber(cashAdjustments)

  const expectedCash = op + sales + deposits - refunds - withdrawals - expenses + adjustments
  const cashDifference = actual - expectedCash
  const varianceStatus = classifyRestaurantCashVariance(cashDifference, varianceOptions)

  return {
    status: 'closed',
    settlementStatus: 'pending_review',
    expectedCash,
    actualClosingCash: actual,
    cashDifference,
    cashSales: sales,
    cashRefunds: refunds,
    cashDeposits: deposits,
    cashWithdrawals: withdrawals,
    cashExpenses: expenses,
    cashAdjustments: adjustments,
    totalTransactions: Math.max(0, Math.floor(Number(totalTransactions) || 0)),
    averageSale: sales,
    largestSale: largestSale,
    largestRefund: largestRefund,
    varianceStatus,
    settledBy: String(settledBy || ''),
    settlementCompletedAt: closedAt,
    managerApprovedBy: String(managerApprovedBy || ''),
    notes: String(notes || ''),
    closedAt,
    updatedAt: closedAt,
    settlementId: `STL-${String(closedAt).replace(/[^0-9]/g, '').slice(0, 12)}-${String(Math.random()).slice(2, 6)}`,
    differenceReason: '',
    managerNotes: '',
  }
}

/* ─── Settlement payload builders ───────────────────────────────── */

export function buildApproveSessionData({
  approvedBy = '',
  managerNotes = '',
  differenceReason = '',
} = {}) {
  const now = new Date().toISOString()
  return {
    status: 'approved',
    settlementStatus: 'approved',
    approvedBy: String(approvedBy || ''),
    approvedAt: now,
    managerNotes: String(managerNotes || ''),
    differenceReason: String(differenceReason || ''),
  }
}

export function buildRejectSessionData({
  rejectedBy = '',
  reason = '',
  managerNotes = '',
} = {}) {
  const now = new Date().toISOString()
  return {
    status: 'rejected',
    settlementStatus: 'rejected',
    rejectedBy: String(rejectedBy || ''),
    rejectedAt: now,
    rejectionReason: String(reason || ''),
    managerNotes: String(managerNotes || ''),
  }
}

export function buildLockSessionData({
  lockedBy = '',
} = {}) {
  const now = new Date().toISOString()
  return {
    status: 'locked',
    settlementStatus: 'locked',
    lockedBy: String(lockedBy || ''),
    lockedAt: now,
  }
}

/* ─── Reopen session payload builder ─────────────────────────────── */

export function buildReopenSessionData({
  reopenedBy = '',
} = {}) {
  const now = new Date().toISOString()
  return {
    status: 'open',
    settlementStatus: '',
    reopenedBy: String(reopenedBy || ''),
    reopenedAt: now,
    closedAt: '',
    settlementCompletedAt: '',
    settledBy: '',
    approvedBy: '',
    approvedAt: '',
    lockedBy: '',
    lockedAt: '',
    rejectedBy: '',
    rejectedAt: '',
    rejectionReason: '',
    actualClosingCash: null,
    expectedCash: null,
    cashDifference: null,
    varianceStatus: '',
    managerNotes: '',
    differenceReason: '',
    updatedAt: now,
  }
}

/* ─── Difference % calculator ────────────────────────────────────── */

export function calculateDifferencePercent(cashDifference, expectedCash) {
  const diff = rawNumber(cashDifference)
  const expected = rawNumber(expectedCash)
  if (expected === 0) return diff === 0 ? 0 : diff > 0 ? 100 : -100
  return (diff / expected) * 100
}

/* ─── Detailed variance classification ───────────────────────────── */

const VARINCE_CLASSIFICATION = Object.freeze([
  { id: 'balanced', label: 'Balanced', badge: 'bg-emerald-100 text-emerald-800', thresholdMin: 0, thresholdMax: 50, isVariance: false },
  { id: 'cash_shortage', label: 'Cash Shortage', badge: 'bg-rose-100 text-rose-800', thresholdMin: 50, thresholdMax: 200, isVariance: true, direction: 'negative' },
  { id: 'cash_excess', label: 'Cash Excess', badge: 'bg-amber-100 text-amber-800', thresholdMin: 50, thresholdMax: 200, isVariance: true, direction: 'positive' },
  { id: 'counting_error', label: 'Possible Counting Error', badge: 'bg-orange-100 text-orange-800', thresholdMin: 200, thresholdMax: 1000, isVariance: true },
  { id: 'refund_issue', label: 'Possible Refund Issue', badge: 'bg-pink-100 text-pink-800', thresholdMin: 1000, thresholdMax: 5000, isVariance: true, context: 'high_refunds' },
  { id: 'expense_missing', label: 'Possible Expense Missing', badge: 'bg-purple-100 text-purple-800', thresholdMin: 1000, thresholdMax: 5000, isVariance: true, context: 'high_expenses' },
  { id: 'deposit_missing', label: 'Possible Deposit Missing', badge: 'bg-indigo-100 text-indigo-800', thresholdMin: 1000, thresholdMax: 5000, isVariance: true, context: 'high_deposits' },
  { id: 'large_variance', label: 'Large Variance', badge: 'bg-red-100 text-red-800', thresholdMin: 5000, thresholdMax: 25000, isVariance: true },
  { id: 'critical_variance', label: 'Critical Variance', badge: 'bg-red-600 text-white', thresholdMin: 25000, thresholdMax: Infinity, isVariance: true },
])

export function classifyDetailedRestaurantCashVariance({
  cashDifference = 0,
  cashSales = 0,
  cashRefunds = 0,
  cashExpenses = 0,
  cashDeposits = 0,
} = {}) {
  const diff = Math.abs(rawNumber(cashDifference))
  const isNegative = rawNumber(cashDifference) < 0
  const sales = safeMoney(cashSales)
  const refunds = safeMoney(cashRefunds)
  const expenses = safeMoney(cashExpenses)
  const deposits = safeMoney(cashDeposits)

  // Balanced
  if (diff <= 50) return { id: 'balanced', label: 'Balanced', badge: 'bg-emerald-100 text-emerald-800' }

  // Context-aware classification
  if (diff >= 1000 && diff < 5000) {
    if (refunds > sales * 0.3) return { id: 'refund_issue', label: 'Possible Refund Issue', badge: 'bg-pink-100 text-pink-800' }
    if (expenses > sales * 0.3) return { id: 'expense_missing', label: 'Possible Expense Missing', badge: 'bg-purple-100 text-purple-800' }
    if (deposits > sales * 0.3) return { id: 'deposit_missing', label: 'Possible Deposit Missing', badge: 'bg-indigo-100 text-indigo-800' }
  }

  // Direction + magnitude
  if (diff >= 25000) return { id: 'critical_variance', label: 'Critical Variance', badge: 'bg-red-600 text-white' }
  if (diff >= 5000) return { id: 'large_variance', label: 'Large Variance', badge: 'bg-red-100 text-red-800' }
  if (diff >= 200) return { id: 'counting_error', label: 'Possible Counting Error', badge: 'bg-orange-100 text-orange-800' }
  if (isNegative) return { id: 'cash_shortage', label: 'Cash Shortage', badge: 'bg-rose-100 text-rose-800' }
  return { id: 'cash_excess', label: 'Cash Excess', badge: 'bg-amber-100 text-amber-800' }
}

/* ─── Build session timeline ──────────────────────────────────────── */

/**
 * Builds a chronological timeline of events from a session object.
 * Pure function — no side effects, no date mutation.
 */
export function buildRestaurantSessionTimeline(session = {}) {
  const events = []

  if (session.openedAt) {
    events.push({ type: 'opened', label: 'Session Opened', timestamp: session.openedAt, icon: 'play', order: 0 })
  }
  if (session.closedAt) {
    events.push({ type: 'closed', label: 'Session Closed', timestamp: session.closedAt, icon: 'stop', order: 1 })
  }
  if (session.reopenedAt) {
    events.push({ type: 'reopened', label: 'Session Reopened', timestamp: session.reopenedAt, icon: 'refresh', order: 2 })
  }
  if (session.reviewedAt) {
    events.push({ type: 'reviewed', label: 'Reviewed', timestamp: session.reviewedAt, icon: 'eye', order: 3 })
  }
  if (session.approvedAt) {
    events.push({ type: 'approved', label: 'Approved', timestamp: session.approvedAt, icon: 'check', order: 4 })
  }
  if (session.rejectedAt) {
    events.push({ type: 'rejected', label: 'Rejected', timestamp: session.rejectedAt, icon: 'x', order: 5 })
  }
  if (session.lockedAt) {
    events.push({ type: 'locked', label: 'Locked', timestamp: session.lockedAt, icon: 'lock', order: 6 })
  }

  // Sort by timestamp, then by order for same-timestamp events
  events.sort((a, b) => {
    const ta = new Date(a.timestamp).getTime()
    const tb = new Date(b.timestamp).getTime()
    if (ta !== tb) return ta - tb
    return a.order - b.order
  })

  return events
}

/* ─── Comprehensive settlement summary from session ──────────────── */

export function buildSettlementSummary(session = {}) {
  const openingCash = safeMoney(session.openingCash)
  const closingCash = rawNumber(session.actualClosingCash)
  const expectedCash = rawNumber(session.expectedCash)
  const cashDifference = rawNumber(session.cashDifference)
  const expected = expectedCash || 1
  const diffPercent = expected > 0 ? (cashDifference / expected) * 100 : 0

  const classification = classifyDetailedRestaurantCashVariance({
    cashDifference,
    cashSales: session.cashSales,
    cashRefunds: session.cashRefunds,
    cashExpenses: session.cashExpenses,
    cashDeposits: session.cashDeposits,
  })

  return {
    openingCash,
    actualClosingCash: closingCash,
    expectedCash,
    cashDifference,
    differencePercent: Math.round(diffPercent * 100) / 100,
    classification,
    totalTransactions: Math.max(0, Math.floor(Number(session.totalTransactions) || 0)),
    averageSale: safeMoney(session.averageSale),
    largestSale: safeMoney(session.largestSale),
    largestRefund: safeMoney(session.largestRefund),
  }
}

export { DIFFERENCE_REASONS, SUPPORTED_SETTLEMENT_STATUSES, VARINCE_CLASSIFICATION }
