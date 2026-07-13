/**
 * Pure data-model and validation helpers for Restaurant POS cash movements.
 *
 * No Firebase imports, no browser APIs, no localStorage, no random ID generation,
 * no input mutation — only serializable plain objects returned.
 */
import { restaurantBusinessDateKey } from '../lib/restaurantBusinessDay.js'

/* ─── Supported values ─────────────────────────────────────────── */

const SUPPORTED_MOVEMENT_TYPES = Object.freeze([
  'deposit', 'withdrawal', 'expense', 'adjustment',
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

export function normalizeRestaurantCashMovementType(value) {
  const raw = String(value ?? '').trim().toLowerCase()
  if (raw === 'deposit' || raw === 'dep') return 'deposit'
  if (raw === 'withdrawal' || raw === 'withdraw' || raw === 'wd' || raw === 'with') return 'withdrawal'
  if (raw === 'expense' || raw === 'exp') return 'expense'
  if (raw === 'adjustment' || raw === 'adj' || raw === 'adjust') return 'adjustment'
  return 'deposit'
}

/* ─── Create cash movement record ──────────────────────────────── */

export function createRestaurantCashMovementRecord(input = {}) {
  const type = normalizeRestaurantCashMovementType(input.type)

  let createdAt = ''
  let businessDay = ''

  if (input.createdAt) {
    const d = new Date(input.createdAt)
    if (!Number.isNaN(d.getTime())) {
      createdAt = d.toISOString()
      businessDay = restaurantBusinessDateKey(d, input.settings)
    }
  }

  // Adjustment amounts can be negative; all others are positive only
  const amount = type === 'adjustment' ? rawNumber(input.amount) : safeMoney(input.amount)

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
    businessDay,
    createdAt,
  }

  return record
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
  if (!Number.isFinite(record.amount)) errors.push('amount must be a finite number')
  if (record.type !== 'adjustment' && record.amount <= 0) errors.push('amount must be greater than zero')
  if (record.type === 'adjustment' && !Number.isFinite(record.amount)) errors.push('adjustment amount must be a finite number')
  if (!record.reason) errors.push('reason is required')

  return {
    valid: errors.length === 0,
    errors,
    record,
  }
}

/* ─── Calculate movement totals ────────────────────────────────── */

export function calculateRestaurantCashMovementTotals(movements) {
  const list = Array.isArray(movements) ? movements : []
  let deposits = 0
  let withdrawals = 0
  let expenses = 0
  let adjustments = 0

  for (const m of list) {
    const type = normalizeRestaurantCashMovementType(m.type)
    const amount = rawNumber(m.amount)
    if (type === 'deposit') deposits += amount
    else if (type === 'withdrawal') withdrawals += amount
    else if (type === 'expense') expenses += amount
    else if (type === 'adjustment') adjustments += amount
  }

  return {
    deposits,
    withdrawals,
    expenses,
    adjustments,
    netMovements: deposits - withdrawals - expenses + adjustments,
  }
}
