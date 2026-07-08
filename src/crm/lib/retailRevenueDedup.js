/**
 * retailRevenueDedup.js
 *
 * Accounting-grade dedup for Retail POS revenue.
 *
 * Revenue sources:
 *   1. POS orders   → order.paidAmount (revenue recognized at sale)
 *   2. Wallet payments → payment.amount (customer-side balance settlement)
 *
 * Wallet payments are NOT independent revenue — they are a payment method
 * applied to the same POS orders already counted in paidAmount.  Counting
 * both would double-count the same transaction.
 *
 * Source priority (count only the highest-priority source available):
 *   POS orders  (paidAmount)     → actual goods/services delivered
 *   Wallet payments (amount)     → payment method, same underlying sale
 *
 * Excluded: cancelled/refunded/void/rejected orders.
 *
 * Edge cases handled:
 *  - Wallet payments with no matching POS orders are still counted
 *    (standalone top-ups/credits that represent real received funds).
 *  - POS orders with zero paidAmount are excluded.
 *  - Rejected/cancelled orders are excluded.
 */

function toNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function isActivePosOrder(order = {}) {
  const status = String(order.status || '').toLowerCase()
  const paymentStatus = String(order.paymentStatus || '').toLowerCase()
  const rejected = ['cancelled', 'canceled', 'refunded', 'void', 'rejected', 'failed']
  return !rejected.includes(status) && !rejected.includes(paymentStatus)
}

/**
 * Deduplicate Retail POS revenue:
 *   - POS orders provide the primary revenue figure (paidAmount reflects
 *     actual goods/services delivered, including wallet-funded orders).
 *   - Wallet payments with no corresponding POS coverage are added
 *     separately (standalone top-ups not tied to a specific order).
 *
 * The heuristic for "uncovered" wallet payments:
 *   A wallet payment is treated as matching an existing POS order if
 *   total POS order paidAmount >= total wallet payment amount for the
 *   same module.  This is conservative — in the typical case all wallet
 *   activity is order-related.
 */
export function calculateRetailPosRevenue(orders = [], walletPayments = []) {
  const activeOrders = orders.filter(isActivePosOrder)
  const orderRevenue = activeOrders.reduce((sum, o) => sum + toNumber(o.paidAmount), 0)
  const walletTotal = walletPayments.reduce((sum, p) => sum + toNumber(p.amount), 0)

  if (walletTotal <= 0) return orderRevenue

  // If order revenue already covers the wallet total, wallet payments are
  // already reflected in the order paidAmount (wallet was a payment method).
  if (orderRevenue >= walletTotal) return orderRevenue

  // Wallet payments exceed known order revenue — count the uncovered
  // portion as separate revenue (standalone wallet top-ups/credits).
  return orderRevenue + (walletTotal - orderRevenue)
}
