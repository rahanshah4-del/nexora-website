/**
 * Pure data-model and validation helpers for Restaurant POS payments.
 *
 * No Firebase imports, no browser APIs, no localStorage, no random ID generation,
 * no input mutation — only serializable plain objects returned.
 */
import { restaurantBusinessDateKey } from '../lib/restaurantBusinessDay.js'

/* ─── Supported values ─────────────────────────────────────────── */

const SUPPORTED_METHODS = Object.freeze([
  'Cash', 'Card', 'JazzCash', 'Easypaisa', 'Bank', 'Other',
])

const SUPPORTED_PAYMENT_TYPES = Object.freeze([
  'initial', 'partial', 'due_recovery', 'adjustment',
])

const SUPPORTED_STATUSES = Object.freeze([
  'pending', 'completed', 'failed', 'reversed',
])

const ONLINE_METHODS = Object.freeze(['Card', 'JazzCash', 'Easypaisa', 'Bank'])

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

export function normalizeRestaurantPaymentMethod(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  // Case-insensitive match against supported methods
  const match = SUPPORTED_METHODS.find(
    (m) => m.toLowerCase() === raw.toLowerCase(),
  )
  return match || 'Other'
}

export function normalizeRestaurantPaymentStatus(value) {
  const raw = String(value ?? '').trim().toLowerCase()
  if (raw === 'completed' || raw === 'complete') return 'completed'
  if (raw === 'pending') return 'pending'
  if (raw === 'failed' || raw === 'fail') return 'failed'
  if (raw === 'reversed' || raw === 'reverse' || raw === 'refunded') return 'reversed'
  return 'pending'
}

export function normalizeRestaurantPaymentType(value) {
  const raw = String(value ?? '').trim().toLowerCase().replace(/\s+/g, '_')
  if (raw === 'initial' || raw === 'full') return 'initial'
  if (raw === 'partial') return 'partial'
  if (raw === 'due_recovery' || raw === 'due recovery' || raw === 'recovery') return 'due_recovery'
  if (raw === 'adjustment') return 'adjustment'
  return 'partial'
}

/* ─── Idempotency key ──────────────────────────────────────────── */

/**
 * Build a deterministic idempotency key from stable payment fields.
 *
 * Uses: workspaceId, orderId|invoiceId, paymentType, paymentDate, amount,
 *        cashierId, and an optional external reference.
 *
 * key, not amount alone.
 */
export function buildRestaurantPaymentIdempotencyKey({
  workspaceId,
  orderId,
  invoiceId,
  paymentType,
  paymentDate,
  amount,
  cashierId,
  referenceNumber,
} = {}) {
  const parts = [
    String(workspaceId ?? ''),
    String(orderId || invoiceId || ''),
    normalizeRestaurantPaymentType(paymentType),
    String(paymentDate ?? '').slice(0, 10),
    safeMoney(amount).toFixed(2),
    String(cashierId ?? ''),
    String(referenceNumber ?? ''),
  ]
  return parts.join('::')
}

/* ─── Create payment record ────────────────────────────────────── */

export function createRestaurantPaymentRecord(input = {}) {
  const paymentMethod = normalizeRestaurantPaymentMethod(input.paymentMethod)
  const paymentType = normalizeRestaurantPaymentType(input.paymentType)
  const status = normalizeRestaurantPaymentStatus(input.status)

  // Safely parse dates — invalid dates become empty string, not current time
  let paymentDate = ''
  let createdAt = ''
  let updatedAt = ''
  let businessDay = ''

  if (input.paymentDate) {
    const d = new Date(input.paymentDate)
    if (!Number.isNaN(d.getTime())) {
      paymentDate = d.toISOString()
      // Derive businessDay only when paymentDate is valid
      businessDay = restaurantBusinessDateKey(d, input.settings)
    }
  }

  if (input.createdAt) {
    const d = new Date(input.createdAt)
    if (!Number.isNaN(d.getTime())) createdAt = d.toISOString()
  }

  if (input.updatedAt) {
    const d = new Date(input.updatedAt)
    if (!Number.isNaN(d.getTime())) updatedAt = d.toISOString()
  }

  const amount = safeMoney(input.amount)
  const idempotencyKey =
    input.idempotencyKey ||
    buildRestaurantPaymentIdempotencyKey({
      workspaceId: input.workspaceId,
      orderId: input.orderId,
      invoiceId: input.invoiceId,
      paymentType,
      paymentDate,
      amount,
      cashierId: input.cashierId,
      referenceNumber: input.referenceNumber,
    })

  const record = {
    workspaceId: String(input.workspaceId ?? ''),
    businessType: String(input.businessType ?? ''),
    orderId: String(input.orderId ?? ''),
    invoiceId: String(input.invoiceId ?? ''),
    customerId: String(input.customerId ?? ''),
    paymentType,
    paymentMethod,
    amount,
    paymentDate,
    businessDay,
    cashierId: String(input.cashierId ?? ''),
    cashierName: String(input.cashierName ?? ''),
    status,
    referenceNumber: String(input.referenceNumber ?? ''),
    notes: String(input.notes ?? ''),
    createdAt,
    updatedAt,
    idempotencyKey,
  }

  return record
}

/* ─── Validate payment record ──────────────────────────────────── */

export function validateRestaurantPaymentRecord(record = {}) {
  const errors = []

  if (!record.workspaceId) errors.push('workspaceId is required')
  if (!record.orderId && !record.invoiceId) errors.push('orderId or invoiceId is required')
  if (!record.paymentMethod) errors.push('paymentMethod is required and must be a supported method')
  if (!SUPPORTED_METHODS.includes(record.paymentMethod)) {
    errors.push(`paymentMethod "${record.paymentMethod}" is not supported`)
  }
  if (!SUPPORTED_PAYMENT_TYPES.includes(record.paymentType)) {
    errors.push(`paymentType "${record.paymentType}" is not supported`)
  }
  if (!SUPPORTED_STATUSES.includes(record.status)) {
    errors.push(`status "${record.status}" is not supported`)
  }
  if (record.amount <= 0) errors.push('amount must be greater than zero')
  if (!Number.isFinite(record.amount)) errors.push('amount must be a finite number')
  if (!record.idempotencyKey) errors.push('idempotencyKey is required')

  // New records (status !== 'pending') should have cashierId
  if (record.status !== 'pending' && record.status !== 'failed' && !record.cashierId) {
    errors.push('cashierId is required for non-pending payment records')
  }

  return {
    valid: errors.length === 0,
    errors,
    record,
  }
}

/* ─── Calculate payment totals ─────────────────────────────────── */

export function calculateRestaurantPaymentTotals(payments = []) {
  const completed = payments.filter((p) => p.status === 'completed')
  const reversed = payments.filter((p) => p.status === 'reversed')

  const completedAmount = completed.reduce((sum, p) => sum + safeMoney(p.amount), 0)
  const reversedAmount = reversed.reduce((sum, p) => sum + safeMoney(p.amount), 0)

  const netCollectedAmount = Math.max(0, completedAmount - reversedAmount)

  const cashCompleted = completed
    .filter((p) => normalizeRestaurantPaymentMethod(p.paymentMethod) === 'Cash')
    .reduce((sum, p) => sum + safeMoney(p.amount), 0)
  const cashReversed = reversed
    .filter((p) => normalizeRestaurantPaymentMethod(p.paymentMethod) === 'Cash')
    .reduce((sum, p) => sum + safeMoney(p.amount), 0)
  const cashAmount = Math.max(0, cashCompleted - cashReversed)

  const onlineCompleted = completed
    .filter((p) => ONLINE_METHODS.includes(normalizeRestaurantPaymentMethod(p.paymentMethod)))
    .reduce((sum, p) => sum + safeMoney(p.amount), 0)
  const onlineReversed = reversed
    .filter((p) => ONLINE_METHODS.includes(normalizeRestaurantPaymentMethod(p.paymentMethod)))
    .reduce((sum, p) => sum + safeMoney(p.amount), 0)
  const onlineAmount = Math.max(0, onlineCompleted - onlineReversed)

  // Payment method breakdown — all completed payments grouped by method
  const paymentMethodBreakdown = {}
  completed.forEach((p) => {
    const method = normalizeRestaurantPaymentMethod(p.paymentMethod)
    paymentMethodBreakdown[method] = safeMoney(paymentMethodBreakdown[method]) + safeMoney(p.amount)
  })

  // Payment type breakdown
  const paymentTypeBreakdown = {}
  completed.forEach((p) => {
    const type = normalizeRestaurantPaymentType(p.paymentType)
    paymentTypeBreakdown[type] = safeMoney(paymentTypeBreakdown[type]) + safeMoney(p.amount)
  })
  // Reversed payments also counted in type breakdown (negative)
  reversed.forEach((p) => {
    const type = normalizeRestaurantPaymentType(p.paymentType)
    paymentTypeBreakdown[type] = safeMoney(paymentTypeBreakdown[type]) - safeMoney(p.amount)
  })

  return {
    completedAmount,
    reversedAmount,
    netCollectedAmount,
    cashAmount,
    onlineAmount,
    paymentMethodBreakdown,
    paymentTypeBreakdown,
  }
}
