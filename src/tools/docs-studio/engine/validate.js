/**
 * validateDocument(doc) → [{ path, code, message, severity }]
 *
 * Form-level checks for the editor. `severity: 'error'` should block issuing
 * or exporting a document; 'warning' is advisory. calculateDocument() never
 * depends on this: it copes with invalid input on its own.
 */

import { isKnownCurrency } from './currency.js'
import { compareIsoDates, isIsoDate } from './dates.js'
import { getDocumentType } from './documentTypes.js'
import { LIMITS } from './model.js'

/** @typedef {{ path: string, code: string, message: string, severity: 'error' | 'warning' }} ValidationIssue */

export const VALIDATION_MESSAGES = Object.freeze({
  invalid_document: 'The document could not be read.',
  unknown_document_type: 'Unknown document type.',
  unknown_currency: 'Unknown currency code.',
  invalid_locale: 'Unknown locale; the default will be used.',
  missing_seller_name: 'Add your business name.',
  missing_client_name: 'Add the customer’s name.',
  missing_issue_date: 'Add an issue date.',
  invalid_date: 'Not a valid date.',
  due_before_issue: 'The due date is before the issue date.',
  valid_until_before_issue: 'The expiry date is before the issue date.',
  no_line_items: 'Add at least one line item.',
  too_many_lines: `A document can have at most ${LIMITS.lines} lines.`,
  missing_line_description: 'This line has no description.',
  negative_quantity: 'Quantity cannot be negative on this document type.',
  zero_quantity: 'Quantity is zero.',
  negative_price: 'Negative unit price.',
  invalid_number: 'Not a valid whole number.',
  tax_rate_out_of_range: 'Tax rate must be between 0% and 100%.',
  duplicate_tax_id: 'Two taxes share the same id.',
  missing_tax_name: 'Give this tax a name.',
  withholding_compound_conflict: 'A withholding tax cannot also be compound.',
  unknown_tax_reference: 'This line refers to a tax that does not exist.',
  discount_out_of_range: 'Discount percentage must be between 0% and 100%.',
  negative_discount: 'Discount cannot be negative.',
  deposit_out_of_range: 'Deposit must be between 0% and 100%.',
  negative_deposit: 'Deposit cannot be negative.',
  negative_payment: 'Payment amount is negative.',
  missing_payment_date: 'Add the payment date.',
})

const RATE_MAX = 1_000_000

/**
 * @param {import('./model.js').DocsDocument} doc
 * @returns {ValidationIssue[]}
 */
export function validateDocument(doc) {
  /** @type {ValidationIssue[]} */
  const issues = []
  const add = (path, code, severity = 'error') => issues.push({ path, code, message: VALIDATION_MESSAGES[code] || code, severity })

  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    add('', 'invalid_document')
    return issues
  }
  const config = getDocumentType(doc.type)
  if (!config) add('type', 'unknown_document_type')
  const features = config?.features || getDocumentType('invoice').features

  const isInt = (value) => Number.isSafeInteger(value)
  const checkInt = (value, path) => {
    if (value === null || value === undefined) return false
    if (!isInt(value)) {
      add(path, 'invalid_number')
      return false
    }
    return true
  }

  if (!isKnownCurrency(doc.currency)) add('currency', 'unknown_currency')
  try {
    if (!doc.locale || !Intl.getCanonicalLocales(doc.locale).length) add('locale', 'invalid_locale', 'warning')
  } catch {
    add('locale', 'invalid_locale', 'warning')
  }

  if (!String(doc.seller?.name ?? '').trim()) add('seller.name', 'missing_seller_name')
  if (!String(doc.client?.name ?? '').trim()) add('client.name', 'missing_client_name')

  // Dates
  if (!doc.issueDate) add('issueDate', 'missing_issue_date')
  else if (!isIsoDate(doc.issueDate)) add('issueDate', 'invalid_date')
  const dateChecks = [
    ['dueDate', features.dueDate, 'due_before_issue'],
    ['validUntil', features.validUntil, 'valid_until_before_issue'],
    ['deliveryDate', features.deliveryDate, null],
  ]
  for (const [field, applies, beforeCode] of dateChecks) {
    const value = doc[field]
    if (!applies || value === null || value === undefined || value === '') continue
    if (!isIsoDate(value)) add(field, 'invalid_date')
    else if (beforeCode && compareIsoDates(value, doc.issueDate) === -1) add(field, beforeCode)
  }

  // Taxes
  const taxIds = new Set()
  const taxes = Array.isArray(doc.taxes) ? doc.taxes : []
  if (features.taxes) {
    taxes.forEach((tax, i) => {
      const path = `taxes[${i}]`
      if (!tax || typeof tax !== 'object') return add(path, 'invalid_number')
      const id = String(tax.id ?? '')
      if (taxIds.has(id)) add(`${path}.id`, 'duplicate_tax_id')
      taxIds.add(id)
      if (!String(tax.name ?? '').trim()) add(`${path}.name`, 'missing_tax_name', 'warning')
      if (checkInt(tax.rate_micro, `${path}.rate_micro`) && (tax.rate_micro < 0 || tax.rate_micro > RATE_MAX)) add(`${path}.rate_micro`, 'tax_rate_out_of_range')
      if (tax.compound === true && tax.withholding === true) add(path, 'withholding_compound_conflict')
    })
  }

  const checkTaxRefs = (ids, path) => {
    if (!features.taxes || !Array.isArray(ids)) return
    ids.forEach((id, j) => { if (!taxIds.has(String(id))) add(`${path}.taxIds[${j}]`, 'unknown_tax_reference') })
  }

  const checkDiscount = (discount, path) => {
    if (!features.discount || !discount || typeof discount !== 'object') return
    if (!checkInt(discount.value, `${path}.value`)) return
    if (discount.value < 0) add(`${path}.value`, 'negative_discount')
    else if (discount.kind !== 'amount' && discount.value > RATE_MAX) add(`${path}.value`, 'discount_out_of_range')
  }

  // Lines
  const lines = Array.isArray(doc.lines) ? doc.lines : []
  if (!lines.length) add('lines', 'no_line_items', 'warning')
  if (lines.length > LIMITS.lines) add('lines', 'too_many_lines')
  lines.forEach((line, i) => {
    const path = `lines[${i}]`
    if (!line || typeof line !== 'object') return add(path, 'invalid_number')
    if (!String(line.description ?? '').trim()) add(`${path}.description`, 'missing_line_description', 'warning')
    if (checkInt(line.qty_milli, `${path}.qty_milli`)) {
      if (line.qty_milli < 0 && !config?.allowNegativeQuantity) add(`${path}.qty_milli`, 'negative_quantity')
      else if (line.qty_milli === 0) add(`${path}.qty_milli`, 'zero_quantity', 'warning')
    }
    if (features.pricing && checkInt(line.unitPrice_minor, `${path}.unitPrice_minor`) && line.unitPrice_minor < 0 && config?.type !== 'credit_note') {
      add(`${path}.unitPrice_minor`, 'negative_price', 'warning')
    }
    checkDiscount(line.discount, `${path}.discount`)
    checkTaxRefs(line.taxIds, path)
  })

  checkDiscount(doc.discount, 'discount')
  if (features.shipping && doc.shipping) {
    checkInt(doc.shipping.amount_minor, 'shipping.amount_minor')
    checkTaxRefs(doc.shipping.taxIds, 'shipping')
  }
  if (features.fees && Array.isArray(doc.fees)) {
    doc.fees.forEach((fee, i) => {
      checkInt(fee?.amount_minor, `fees[${i}].amount_minor`)
      checkTaxRefs(fee?.taxIds, `fees[${i}]`)
    })
  }

  if (features.deposit && doc.deposit && typeof doc.deposit === 'object') {
    if (checkInt(doc.deposit.value, 'deposit.value')) {
      if (doc.deposit.value < 0) add('deposit.value', 'negative_deposit')
      else if (doc.deposit.kind !== 'amount' && doc.deposit.value > RATE_MAX) add('deposit.value', 'deposit_out_of_range')
    }
    if (doc.deposit.paidAmount_minor !== undefined) checkInt(doc.deposit.paidAmount_minor, 'deposit.paidAmount_minor')
  }

  if (features.payments && Array.isArray(doc.payments)) {
    doc.payments.forEach((payment, i) => {
      const path = `payments[${i}]`
      if (checkInt(payment?.amount_minor, `${path}.amount_minor`) && payment.amount_minor < 0) add(`${path}.amount_minor`, 'negative_payment', 'warning')
      if (!payment?.date) add(`${path}.date`, 'missing_payment_date', 'warning')
      else if (!isIsoDate(payment.date)) add(`${path}.date`, 'invalid_date')
    })
  }

  return issues
}

/** True when no issue has severity 'error'. */
export function isDocumentValid(doc) {
  return validateDocument(doc).every((issue) => issue.severity !== 'error')
}
