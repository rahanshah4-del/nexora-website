/**
 * convertDocument(doc, targetType): quotation → invoice and friends.
 *
 * The result is a NEW document: new id, status reset to the target type's
 * initial status, today's issue date, target-type dates recomputed, an empty
 * number (assigned by the numbering counter when saved), and a reference back
 * to the source (sourceDocId / sourceNumber / sourceType). Everything the
 * target type does not use is reset (see documentTypes.js `features`), so no
 * hidden value can reach its totals.
 *
 * Per-conversion rules:
 *   quotation / proforma → invoice   a paid deposit becomes a payment
 *                                    (source 'deposit'), reducing balance due
 *   quotation → proforma             the deposit request carries over
 *   invoice → receipt                existing payments carry over, plus one
 *                                    for any remaining balance: a receipt
 *                                    acknowledges payment in full
 *   invoice → delivery_note          prices, taxes and payments removed
 *   invoice → credit_note            lines and taxes kept; payments removed;
 *                                    `reference` = the invoice number (also
 *                                    for receipts)
 *   purchase_order → invoice         the PO's vendor issues the invoice to the
 *                                    buyer: parties swap, and the PO number
 *                                    becomes the invoice's `reference`
 */

import { calculateDocument } from './calculate.js'
import { addDays, dueDateFromTerms, todayIso } from './dates.js'
import { canConvert, getDocumentType } from './documentTypes.js'
import { THERMAL_PAPER_SIZES, generateId, normalizeDocument } from './model.js'

/**
 * @param {import('./model.js').DocsDocument} source
 * @param {string} targetType
 * @param {{ id?: string, now?: Date, number?: string, idFactory?: () => string }} [options]
 * @returns {import('./model.js').DocsDocument}
 * @throws {RangeError} for a conversion not listed in CONVERSIONS (a programming
 *   error: the UI only offers conversionTargets(type))
 */
export function convertDocument(source, targetType, options = {}) {
  const doc = normalizeDocument(source)
  if (!canConvert(doc.type, targetType)) {
    throw new RangeError(`Cannot convert ${doc.type} to ${targetType}`)
  }
  const target = getDocumentType(targetType)
  const f = target.features
  const newId = options.idFactory || generateId
  const issueDate = todayIso(options.now || new Date())

  const next = {
    ...doc,
    id: options.id || newId(),
    type: targetType,
    number: options.number || '',
    status: target.statuses[0],
    issueDate,
    sourceDocId: doc.id,
    sourceNumber: doc.number,
    sourceType: doc.type,
  }

  // Parties: an invoice against a PO is issued by the PO's vendor.
  if (doc.type === 'purchase_order') {
    next.seller = doc.client
    next.client = doc.seller
    next.reference = doc.number
  }

  // A credit note or receipt refers to the invoice it credits / acknowledges.
  if (targetType === 'credit_note' || targetType === 'receipt') next.reference = doc.number

  // Carried-over payments, computed before anything is stripped.
  const payments = []
  const sourceFeatures = getDocumentType(doc.type).features
  if (f.payments) {
    if (sourceFeatures.deposit && doc.deposit && doc.deposit.paidAmount_minor > 0) {
      payments.push({
        id: newId(),
        date: doc.deposit.paidDate || issueDate,
        amount_minor: doc.deposit.paidAmount_minor,
        method: doc.deposit.method,
        reference: `Deposit — ${doc.number || getDocumentType(doc.type).label}`,
        note: '',
        source: 'deposit',
      })
    }
    if (sourceFeatures.payments) payments.push(...doc.payments)
    if (targetType === 'receipt') {
      const balance = calculateDocument({ ...doc, payments }).balanceDue
      if (balance > 0) {
        payments.push({ id: newId(), date: issueDate, amount_minor: balance, method: '', reference: doc.number, note: '', source: '' })
      }
    }
  }
  next.payments = payments

  // Strip what the target type does not use.
  if (!f.pricing) {
    next.lines = next.lines.map((line) => ({ ...line, unitPrice_minor: 0, discount: null, taxIds: [] }))
  }
  if (!f.pricing || !f.taxes) {
    next.taxes = []
    next.lines = next.lines.map((line) => ({ ...line, taxIds: [] }))
  }
  if (!f.pricing || !f.discount) {
    next.discount = null
    next.lines = next.lines.map((line) => ({ ...line, discount: null }))
  }
  if (!f.pricing || !f.shipping) next.shipping = null
  else if (!f.taxes && next.shipping) next.shipping = { ...next.shipping, taxIds: [] }
  if (!f.pricing || !f.fees) next.fees = []
  else if (!f.taxes) next.fees = next.fees.map((fee) => ({ ...fee, taxIds: [] }))
  if (!f.deposit) next.deposit = null
  if (!f.shipTo) next.shipTo = null
  if (!f.reason) next.reason = ''
  if (!f.deliveryDate) next.deliveryDate = null

  // Target types with a default paper (receipts → thermal) start on it,
  // unless the source is already on thermal paper.
  if (target.defaultPaperSize && !THERMAL_PAPER_SIZES.includes(doc.appearance.paperSize)) {
    next.appearance = { ...doc.appearance, paperSize: target.defaultPaperSize }
  }

  // Dates for the target type.
  if (f.dueDate) {
    const terms = doc.paymentTermsDays ?? target.defaultPaymentTermsDays
    next.paymentTermsDays = terms
    next.dueDate = dueDateFromTerms(issueDate, terms)
  } else {
    next.paymentTermsDays = null
    next.dueDate = null
  }
  next.validUntil = f.validUntil && target.defaultValidityDays !== null ? addDays(issueDate, target.defaultValidityDays) : null

  return normalizeDocument(next)
}
