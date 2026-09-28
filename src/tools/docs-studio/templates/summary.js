/**
 * The totals block as data: which rows a document shows, in order, with
 * labels and amounts taken straight from calculateDocument(). Shared by the
 * editor's totals card, the HTML paper and (Step 3) the PDF renderer, so the
 * three can never disagree. Nothing here does arithmetic beyond sign display.
 */

import { formatPercent, getDocumentType } from '../engine/index.js'

/**
 * @typedef {object} TotalsRow
 * @property {string} key
 * @property {string} label
 * @property {number} amount   minor units, already signed for display
 * @property {'default' | 'muted' | 'strong' | 'grand' | 'balance'} tone
 */

/**
 * @param {import('../engine/model.js').DocsDocument} doc
 * @param {import('../engine/calculate.js').DocumentTotals} totals
 * @returns {TotalsRow[]}
 */
export function buildTotalsRows(doc, totals) {
  const config = getDocumentType(doc.type) || getDocumentType('invoice')
  if (!config.features.pricing) return []
  const locale = doc.locale
  const inclusive = doc.options?.taxMode === 'inclusive'
  const rate = (row) => formatPercent(row.rate_micro, locale)
  const rows = []
  const push = (key, label, amount, tone = 'default') => rows.push({ key, label, amount, tone })

  push('subtotal', inclusive ? 'Subtotal (incl. tax)' : 'Subtotal', totals.itemsGross)
  if (totals.discountTotal) push('discount', 'Discount', -totals.discountTotal)
  totals.charges.forEach((charge) => push(`${charge.kind}-${charge.id}`, charge.label || (charge.kind === 'shipping' ? 'Shipping' : 'Fee'), charge.net))

  const taxes = totals.taxSummary.filter((t) => !t.withholding)
  const withholding = totals.taxSummary.filter((t) => t.withholding)
  if (!inclusive) taxes.forEach((t) => push(`tax-${t.taxId}`, `${t.name || 'Tax'} (${rate(t)})`, t.amount))
  if (totals.roundingAdjustment) push('rounding', 'Rounding', totals.roundingAdjustment)
  push('total', config.sign < 0 ? 'Total credit' : 'Total', totals.total, 'grand')
  if (inclusive) taxes.forEach((t) => push(`tax-${t.taxId}`, `Includes ${t.name || 'tax'} (${rate(t)})`, t.amount, 'muted'))

  if (withholding.length) {
    withholding.forEach((t) => push(`wht-${t.taxId}`, `Less ${t.name || 'withholding'} (${rate(t)})`, -t.amount))
    push('payable', 'Amount payable', totals.amountPayable, 'strong')
  }

  if (totals.deposit) {
    push('deposit', `Deposit due${totals.deposit.kind === 'percent' && doc.deposit ? ` (${formatPercent(doc.deposit.value, locale)})` : ''}`, totals.deposit.due, 'strong')
  }
  const paid = totals.paymentsTotal + (totals.deposit ? totals.deposit.paid : 0)
  if (config.features.payments || paid) {
    if (paid) push('paid', doc.type === 'receipt' ? 'Amount received' : 'Paid', -paid)
    if (config.features.payments || totals.deposit?.paid) push('balance', 'Balance due', totals.balanceDue, 'balance')
  }
  return rows
}

/** Human label for payment terms: 0 → "Due on receipt", 30 → "Net 30". */
export function paymentTermsLabel(days) {
  if (days === null || days === undefined) return ''
  return days === 0 ? 'Due on receipt' : `Net ${days}`
}

/** Watermark stamps: which statuses show one, and in which tone. */
export const STATUS_STAMPS = Object.freeze({
  draft: { label: 'Draft', tone: 'neutral' },
  paid: { label: 'Paid', tone: 'positive' },
  partially_paid: { label: 'Part paid', tone: 'neutral' },
  overdue: { label: 'Overdue', tone: 'negative' },
  void: { label: 'Void', tone: 'negative' },
  accepted: { label: 'Accepted', tone: 'positive' },
  declined: { label: 'Declined', tone: 'negative' },
  expired: { label: 'Expired', tone: 'negative' },
  cancelled: { label: 'Cancelled', tone: 'negative' },
  delivered: { label: 'Delivered', tone: 'positive' },
  applied: { label: 'Applied', tone: 'positive' },
})

export function statusLabel(status) {
  return String(status || '').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}
