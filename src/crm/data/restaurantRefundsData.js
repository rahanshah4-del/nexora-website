/**
 * Pure data-model and validation helpers for Restaurant POS refunds.
 *
 * No Firebase imports, no browser APIs, no localStorage, no random ID generation,
 * no input mutation — only serializable plain objects returned.
 * Does NOT perform stock restoration or modify order data.
 */
import { restaurantBusinessDateKey } from '../lib/restaurantBusinessDay.js'

/* ─── Supported values ─────────────────────────────────────────── */

const SUPPORTED_REFUND_TYPES = Object.freeze(['full', 'partial', 'item'])
const SUPPORTED_STATUSES = Object.freeze(['pending', 'approved', 'completed', 'rejected', 'cancelled'])

/* ─── Safe number guard ────────────────────────────────────────── */

function safeMoney(value) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

function round2(value) {
  return Math.round(value * 100) / 100
}

/* ─── Normalizers ──────────────────────────────────────────────── */

export function normalizeRestaurantRefundType(value) {
  const raw = String(value ?? '').trim().toLowerCase()
  if (raw === 'full') return 'full'
  if (raw === 'partial') return 'partial'
  if (raw === 'item' || raw === 'item-level' || raw === 'item_level') return 'item'
  return 'full'
}

export function normalizeRestaurantRefundStatus(value) {
  const raw = String(value ?? '').trim().toLowerCase()
  if (raw === 'pending') return 'pending'
  if (raw === 'approved') return 'approved'
  if (raw === 'completed' || raw === 'complete') return 'completed'
  if (raw === 'rejected' || raw === 'reject') return 'rejected'
  if (raw === 'cancelled' || raw === 'cancel') return 'cancelled'
  return 'pending'
}

/* ─── Refund allocation ────────────────────────────────────────── */

/**
 * Calculate how to allocate a requested refund across financial components.
 *
 * @param {Object} options
 * @param {number} options.originalSubtotal
 * @param {number} options.originalDiscount
 * @param {number} options.originalTax
 * @param {number} options.originalServiceCharges
 * @param {number} options.originalTotal
 * @param {number} options.requestedRefundAmount
 * @param {Array}  options.refundedItems   — items being returned (for item refund)
 * @param {Array}  options.originalItems   — items from original order (for item refund)
 * @returns {{ refundSubtotal, refundDiscount, refundTax, refundServiceCharges, refundTotal, refundableRemaining, itemRefundRows, warnings }}
 */
export function calculateRestaurantRefundAllocation({
  originalSubtotal = 0,
  originalDiscount = 0,
  originalTax = 0,
  originalServiceCharges = 0,
  originalTotal = 0,
  requestedRefundAmount = 0,
  refundedItems = [],
  originalItems = [],
} = {}) {
  const warnings = []

  const origSubtotal = safeMoney(originalSubtotal)
  const origDiscount = safeMoney(originalDiscount)
  const origTax = safeMoney(originalTax)
  const origServiceCharges = safeMoney(originalServiceCharges)
  const origTotal = safeMoney(originalTotal)
  const requested = safeMoney(requestedRefundAmount)

  // Guard: can't refund more than original total
  if (requested > origTotal) {
    warnings.push(
      `Requested refund amount (${requested}) exceeds original total (${origTotal}). Capping at original total.`,
    )
  }
  const refundAmount = Math.min(requested, origTotal)
  const refundableRemaining = round2(origTotal - refundAmount)

  // Refund allocation result
  let refundSubtotal = 0
  let refundDiscount = 0
  let refundTax = 0
  let refundServiceCharges = 0
  let refundTotal = 0
  let itemRefundRows = []

  const refundType =
    refundAmount >= origTotal && origTotal > 0
      ? 'full'
      : Array.isArray(refundedItems) && refundedItems.length > 0
        ? 'item'
        : 'partial'

  /* ─── Item refund ──────────────────────────────────────────── */
  if (refundType === 'item' && Array.isArray(originalItems) && originalItems.length > 0) {
    const originalItemMap = new Map()
    originalItems.forEach((item) => {
      const id = item.itemId || item.id || item.productId || ''
      const key = id || item.name || `idx-${Math.random()}`
      const origQty = safeMoney(item.quantity ?? item.qty ?? 0)
      const origLineTotal = safeMoney(item.lineTotal ?? (safeMoney(item.unitPrice ?? item.price ?? 0) * safeMoney(item.quantity ?? item.qty ?? 0)))
      originalItemMap.set(key, { ...item, _origQty: origQty, _origLineTotal: origLineTotal })
    })

    itemRefundRows = refundedItems
      .map((ri) => {
        const id = ri.itemId || ri.id || ri.productId || ''
        const key = id || ri.name || ''
        const orig = originalItemMap.get(key)
        if (!orig) {
          warnings.push(`Item "${ri.name || key}" not found in original items. Skipping.`)
          return null
        }

        const returnQty = safeMoney(ri.quantity ?? ri.qty ?? 0)
        const maxQty = orig._origQty

        if (returnQty > maxQty && maxQty > 0) {
          warnings.push(
            `Return quantity (${returnQty}) exceeds original quantity (${maxQty}) for "${orig.name || key}". Capping at original quantity.`,
          )
        }
        const qty = Math.min(returnQty, maxQty)
        const unitValue = orig._origLineTotal / maxQty
        const lineTotal = round2(unitValue * qty)

        return {
          itemId: orig.itemId || orig.id || orig.productId || '',
          name: orig.name || 'Item',
          originalQuantity: maxQty,
          returnQuantity: qty,
          unitValue: round2(unitValue),
          lineTotal,
        }
      })
      .filter(Boolean)

    refundSubtotal = round2(
      itemRefundRows.reduce((sum, r) => sum + r.lineTotal, 0),
    )

    // Proportionally allocate discount, tax, service charges based on refund subtotal vs original gross
    // Gross = subtotal before discount (use origSubtotal + origDiscount as proxy for gross)
    const grossBeforeDiscount = origSubtotal + origDiscount
    if (grossBeforeDiscount > 0) {
      const ratio = grossBeforeDiscount > 0 ? refundSubtotal / grossBeforeDiscount : 0
      refundDiscount = round2(origDiscount * ratio)
      refundTax = round2(origTax * ratio)
      refundServiceCharges = round2(origServiceCharges * ratio)
    }
    refundTotal = round2(refundSubtotal - refundDiscount + refundTax + refundServiceCharges)

  /* ─── Full refund ──────────────────────────────────────────── */
  } else if (refundType === 'full') {
    refundSubtotal = origSubtotal
    refundDiscount = origDiscount
    refundTax = origTax
    refundServiceCharges = origServiceCharges
    refundTotal = origTotal

    if (Array.isArray(originalItems)) {
      itemRefundRows = originalItems.map((item) => {
        const qty = safeMoney(item.quantity ?? item.qty ?? 0)
        const lineTotal = safeMoney(item.lineTotal ?? (safeMoney(item.unitPrice ?? item.price ?? 0) * qty))
        return {
          itemId: item.itemId || item.id || item.productId || '',
          name: item.name || 'Item',
          originalQuantity: qty,
          returnQuantity: qty,
          unitValue: qty > 0 ? round2(lineTotal / qty) : 0,
          lineTotal,
        }
      })
    }

  /* ─── Partial proportional refund ──────────────────────────── */
  } else if (origTotal > 0) {
    const ratio = refundAmount / origTotal
    refundSubtotal = round2(origSubtotal * ratio)
    refundDiscount = round2(origDiscount * ratio)
    refundTax = round2(origTax * ratio)
    refundServiceCharges = round2(origServiceCharges * ratio)
    refundTotal = round2(origTotal * ratio)
  }

  // Safety clamp: no negative values
  refundSubtotal = safeMoney(refundSubtotal)
  refundDiscount = safeMoney(refundDiscount)
  refundTax = safeMoney(refundTax)
  refundServiceCharges = safeMoney(refundServiceCharges)
  refundTotal = origTotal > 0 ? Math.min(refundTotal, origTotal) : 0
  refundTotal = safeMoney(refundTotal)

  // Warn if allocation math produces a materially different total than requested
  const diff = Math.abs(refundTotal - refundAmount)
  if (diff > 0.02) {
    warnings.push(
      `Allocation rounding produced refund total (${refundTotal}) different from requested (${refundAmount}) by ${round2(diff)}.`,
    )
  }

  return {
    refundSubtotal,
    refundDiscount,
    refundTax,
    refundServiceCharges,
    refundTotal,
    refundableRemaining,
    itemRefundRows,
    warnings,
  }
}

/* ─── Create refund record ─────────────────────────────────────── */

export function createRestaurantRefundRecord(input = {}, allocation = {}) {
  const refundType = normalizeRestaurantRefundType(input.refundType)
  const status = normalizeRestaurantRefundStatus(input.status)

  // Safely parse dates — invalid dates become empty string, not current time
  let createdAt = ''
  let approvedAt = ''
  let businessDay = ''

  if (input.createdAt) {
    const d = new Date(input.createdAt)
    if (!Number.isNaN(d.getTime())) createdAt = d.toISOString()
  }
  if (input.approvedAt) {
    const d = new Date(input.approvedAt)
    if (!Number.isNaN(d.getTime())) approvedAt = d.toISOString()
  }
  // Derive businessDay from createdAt
  if (createdAt) {
    businessDay = restaurantBusinessDateKey(new Date(createdAt), input.settings)
  }

  const paymentIds = Array.isArray(input.paymentIds)
    ? input.paymentIds.map(String).filter(Boolean)
    : input.paymentId
      ? [String(input.paymentId)]
      : []

  // Financial allocation from parameter or fall back to calculation
  const alloc =
    allocation && typeof allocation.refundTotal === 'number'
      ? allocation
      : calculateRestaurantRefundAllocation({
          originalSubtotal: input.originalSubtotal,
          originalDiscount: input.originalDiscount,
          originalTax: input.originalTax,
          originalServiceCharges: input.originalServiceCharges,
          originalTotal: input.originalTotal,
          requestedRefundAmount: input.requestedRefundAmount,
          refundedItems: input.refundedItems,
          originalItems: input.originalItems,
        })

  const record = {
    workspaceId: String(input.workspaceId ?? ''),
    businessType: String(input.businessType ?? ''),
    orderId: String(input.orderId ?? ''),
    customerId: String(input.customerId ?? ''),
    paymentIds,
    refundType,
    refundMethod: String(input.refundMethod || input.paymentMethod || ''),
    reason: String(input.reason ?? ''),
    cashierId: String(input.cashierId ?? ''),
    cashierName: String(input.cashierName ?? ''),
    status,
    approvalStatus: normalizeRestaurantRefundStatus(input.approvalStatus || status),
    approvedBy: String(input.approvedBy ?? ''),
    approvedAt,
    businessDay,
    createdAt,
    referenceNumber: String(input.referenceNumber ?? ''),
    notes: String(input.notes ?? ''),
    // Financial allocation
    refundSubtotal: safeMoney(alloc.refundSubtotal),
    refundDiscount: safeMoney(alloc.refundDiscount),
    refundTax: safeMoney(alloc.refundTax),
    refundServiceCharges: safeMoney(alloc.refundServiceCharges),
    refundTotal: safeMoney(alloc.refundTotal),
    refundableRemaining: safeMoney(alloc.refundableRemaining),
    itemRefundRows: Array.isArray(alloc.itemRefundRows) ? alloc.itemRefundRows : [],
  }

  return record
}

/* ─── Validate refund record ───────────────────────────────────── */

export function validateRestaurantRefundRecord(record = {}) {
  const errors = []

  if (!record.workspaceId) errors.push('workspaceId is required')
  if (!record.orderId) errors.push('orderId is required')
  if (!record.refundType) errors.push('refundType is required')
  if (!SUPPORTED_REFUND_TYPES.includes(record.refundType)) {
    errors.push(`refundType "${record.refundType}" is not supported`)
  }
  if (!SUPPORTED_STATUSES.includes(record.status)) {
    errors.push(`status "${record.status}" is not supported`)
  }
  if (record.refundTotal <= 0) errors.push('refundTotal must be greater than zero')
  if (!Number.isFinite(record.refundTotal)) errors.push('refundTotal must be a finite number')
  if (!record.reason) errors.push('reason is required')

  // Non-pending statuses require cashierId
  if (record.status !== 'pending' && !record.cashierId) {
    errors.push('cashierId is required for non-pending refund records')
  }
  // completed status requires approvedBy
  if (record.status === 'completed' && !record.approvedBy) {
    errors.push('approvedBy is required for completed refunds')
  }

  return {
    valid: errors.length === 0,
    errors,
    record,
  }
}
