/**
 * One vocabulary for restaurant order payment status.
 *
 * The website POS saves 'due' | 'partial' | 'paid' | 'cancelled', but orders
 * synced from the desktop POS (and older records) can say 'unpaid' or
 * 'partially_paid'. Reports, the dashboard and Nexora AI all need to read
 * them the same way — otherwise an 'unpaid' order silently drops out of both
 * total sales and the amount due.
 *
 * 'pending' is kept as its own value: it means "sent to the kitchen, not billed
 * yet" and is not revenue until it becomes due/partial/paid.
 */

const DUE = new Set(['due', 'unpaid', 'not_paid', 'credit', 'open', 'unsettled', 'outstanding'])
const PARTIAL = new Set(['partial', 'partially_paid', 'partial_paid', 'part_paid', 'partly_paid', 'part_payment'])
const PAID = new Set(['paid', 'settled', 'complete', 'completed', 'success', 'successful', 'received', 'fully_paid'])
const CANCELLED = new Set(['cancelled', 'canceled', 'void', 'voided'])

export function normalizeRestaurantPaymentStatus(value, fallback = 'pending') {
  const key = String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  if (!key) return fallback
  if (DUE.has(key)) return 'due'
  if (PARTIAL.has(key)) return 'partial'
  if (PAID.has(key)) return 'paid'
  if (CANCELLED.has(key)) return 'cancelled'
  return key
}
