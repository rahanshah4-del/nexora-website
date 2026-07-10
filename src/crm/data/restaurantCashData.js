/**
 * Pure data-model and validation helpers for Restaurant POS cash sessions.
 *
 * No Firebase imports, no browser APIs, no localStorage, no random ID generation,
 * no input mutation — only serializable plain objects returned.
 */
import { restaurantBusinessDateKey } from '../lib/restaurantBusinessDay.js'

/* ─── Supported values ─────────────────────────────────────────── */

const SUPPORTED_SESSION_STATUSES = Object.freeze([
  'open', 'closed', 'reconciled', 'disputed',
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
  if (raw === 'reconciled' || raw === 'reconcile') return 'reconciled'
  if (raw === 'disputed' || raw === 'dispute') return 'disputed'
  return 'open'
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

  const record = {
    workspaceId: String(input.workspaceId ?? ''),
    businessType: String(input.businessType ?? ''),
    cashierId: String(input.cashierId ?? ''),
    cashierName: String(input.cashierName ?? ''),
    status,
    openingCash,
    closingCash,
    expectedCash: null,
    actualClosingCash,
    cashDifference: null,
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

  // Closed/reconciled/disputed sessions require closedAt
  if (record.status !== 'open' && !record.closedAt) {
    errors.push('closedAt is required for non-open sessions')
  }

  // Reconciled sessions require actualClosingCash
  if (record.status === 'reconciled') {
    if (record.actualClosingCash === null || record.actualClosingCash === undefined) {
      errors.push('actualClosingCash is required for reconciled sessions')
    }
    if (!Number.isFinite(record.actualClosingCash)) {
      errors.push('actualClosingCash must be a finite number')
    }
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
} = {}) {
  const opening = safeMoney(openingCash)
  const payments = safeMoney(completedCashPayments)
  const deposits = safeMoney(cashDeposits)
  const refunds = safeMoney(completedCashRefunds)
  const withdrawals = safeMoney(cashWithdrawals)

  return opening + payments + deposits - refunds - withdrawals
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
