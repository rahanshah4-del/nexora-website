/**
 * calculateDocument(doc) — every figure a document shows, computed exactly.
 *
 * Never throws on user input: bad values are coerced, clamped or ignored and
 * reported in `warnings` ({ path, code, message }); the numbers returned are
 * always the numbers the warnings describe, never a silent guess.
 *
 * PIPELINE (all integer arithmetic, see money.js)
 *   1. Line gross      = round(unitPrice_minor × qty_milli / 1000)
 *   2. Line discount   percent: round(gross × rate); amount: capped at gross
 *   3. Doc discount    percent of, or amount off, the items' net sum;
 *                      allocated to item lines in proportion to their net
 *                      (largest remainder, so the parts add up exactly).
 *                      Never applied to shipping or fees.
 *   4. Shipping & fees become "charge" lines with their own taxIds.
 *   5. Taxes           per line, see TAX MODEL below.
 *   6. Cash rounding   total rounded to options.cashRoundingIncrement_minor.
 *   7. Payable         total − withholding.
 *   8. Deposit         percent of / amount of the payable (quotation, proforma).
 *   9. Balance due     payable − payments − deposit already paid.
 *
 * TAX MODEL
 *   On each line, with base B, the line's taxes fall in three groups:
 *     non-compound  r_i  levied on B
 *     compound      c_j  levied on B + Σ non-compound tax (Quebec-style
 *                        "tax on tax"). Compound taxes do not compound on one
 *                        another.
 *     withholding   w_k  levied on B; deducted from the amount payable, NOT
 *                        added to the total. Cannot also be compound (such a
 *                        tax is treated as plain withholding, with a warning).
 *   Let R = Σ r_i and C = Σ c_j.
 *
 *   Exclusive prices (options.taxMode = 'exclusive'), line amount X = B:
 *     tax_i = B·r_i       tax_j = (B + Σ tax_i)·c_j       wh_k = B·w_k
 *
 *   Inclusive prices (taxMode = 'inclusive'), line amount G already contains
 *   every non-withholding tax. Expanding the exclusive formulas:
 *         G = B + B·R + (B + B·R)·C = B·(1 + R)·(1 + C)
 *     so  B = G / ((1 + R)·(1 + C))
 *     and tax_i = B·r_i,  tax_j = B·(1 + R)·c_j,  wh_k = B·w_k.
 *   Inclusive + compound is therefore fully supported. B + Σ taxes always
 *   equals G exactly: B is rounded and the difference G − B is split across
 *   the taxes by largest remainder of their exact values.
 *
 *   Rounding (options.taxRounding):
 *     'line'      each tax rounded on each line (in exclusive mode a compound
 *                 tax uses the line's already-rounded non-compound taxes).
 *     'document'  each tax summed exactly over all lines, rounded once, then
 *                 apportioned back to the lines (so per-line figures still add
 *                 up to the document total).
 */

import { currencyExponent, isKnownCurrency } from './currency.js'
import { getDocumentType } from './documentTypes.js'
import { normalizeOptions } from './model.js'
import {
  QTY_SCALE, RATE_ONE, allocate, apportion, lcm, roundDiv, roundToIncrement, toBigInt, toSafeNumber,
} from './money.js'

const ONE = RATE_ONE
const ONE2 = RATE_ONE * RATE_ONE

const MESSAGES = {
  invalid_document: 'The document could not be read.',
  unknown_document_type: 'Unknown document type; calculated as an invoice.',
  unknown_currency: 'Unknown currency code; amounts use 2 decimals.',
  invalid_number: 'Not a valid number; treated as 0.',
  non_integer_amount: 'Not a whole number of minor units; rounded.',
  amount_overflow: 'Amount too large to represent exactly.',
  tax_rate_out_of_range: 'Tax rate must be between 0% and 100%; clamped.',
  duplicate_tax_id: 'Two taxes share this id; the second is ignored.',
  invalid_tax: 'Tax without an id; ignored.',
  withholding_compound_conflict: 'A withholding tax cannot be compound; treated as plain withholding.',
  unknown_tax_reference: 'This tax does not exist on the document; ignored.',
  negative_quantity: 'Negative quantity on a document type that does not allow it.',
  discount_out_of_range: 'Discount percentage must be between 0% and 100%; clamped.',
  negative_discount: 'Negative discount; treated as 0.',
  discount_exceeds_amount: 'Discount is larger than the amount it applies to; capped.',
  discount_not_applicable: 'Document discount ignored: there is no positive item amount to discount.',
  deposit_out_of_range: 'Deposit must be between 0% and 100% of the amount payable; clamped.',
  deposit_exceeds_payable: 'Deposit is larger than the amount payable; capped.',
  negative_payment: 'Negative payment amount (treated as a refund).',
  overpaid: 'Payments exceed the amount payable.',
  calculation_failed: 'The document could not be calculated.',
}

/**
 * @typedef {object} CalcWarning
 * @property {string} path
 * @property {string} code
 * @property {string} message
 */

/**
 * @typedef {object} LineTax
 * @property {string} taxId
 * @property {number} amount
 */

/**
 * @typedef {object} CalculatedLine
 * @property {string} id
 * @property {'item' | 'shipping' | 'fee'} kind
 * @property {number} index           position in doc.lines / doc.fees (-1 for shipping)
 * @property {number} gross           price × qty (charges: the amount), as entered
 * @property {number} lineDiscount
 * @property {number} documentDiscount share of the document discount
 * @property {number} net             gross − discounts, as entered (tax-inclusive in inclusive mode)
 * @property {number} base            tax-exclusive amount
 * @property {LineTax[]} taxes        withholding included
 * @property {number} taxTotal        non-withholding taxes
 * @property {number} withholding
 * @property {number} total           base + taxTotal
 */

/**
 * @typedef {object} TaxSummaryRow
 * @property {string} taxId
 * @property {string} name
 * @property {number} rate_micro
 * @property {boolean} compound
 * @property {boolean} withholding
 * @property {number} base    amount the rate was applied to
 * @property {number} amount
 */

/**
 * @typedef {object} DocumentTotals
 * @property {string} type
 * @property {string} currency
 * @property {number} exponent
 * @property {1 | -1} sign             -1 for credit notes
 * @property {CalculatedLine[]} lines  item lines
 * @property {CalculatedLine[]} charges shipping and fees
 * @property {number} itemsGross
 * @property {number} lineDiscountTotal
 * @property {number} documentDiscountTotal
 * @property {number} discountTotal
 * @property {number} itemsNet
 * @property {number} shippingTotal
 * @property {number} feesTotal
 * @property {number} taxBaseTotal     Σ tax-exclusive bases
 * @property {number} taxTotal         Σ non-withholding taxes
 * @property {number} withholdingTotal
 * @property {TaxSummaryRow[]} taxSummary
 * @property {number} totalBeforeRounding
 * @property {number} roundingAdjustment
 * @property {number} total            invoice total (withholding NOT deducted)
 * @property {number} amountPayable    total − withholding
 * @property {{ kind: string, due: number, paid: number, outstanding: number } | null} deposit
 * @property {number} paymentsTotal
 * @property {number} balanceDue       negative when overpaid
 * @property {number} signedTotal      total × sign
 * @property {number} signedAmountPayable
 * @property {CalcWarning[]} warnings
 */

const sum = (values) => values.reduce((acc, v) => acc + v, 0n)

/**
 * @param {import('./model.js').DocsDocument} doc
 * @returns {DocumentTotals}
 */
export function calculateDocument(doc) {
  try {
    return calculate(doc)
  } catch {
    const warnings = [{ path: '', code: 'calculation_failed', message: MESSAGES.calculation_failed }]
    try {
      return emptyTotals(doc, warnings)
    } catch {
      return emptyTotals(null, warnings)
    }
  }
}

function emptyTotals(doc, warnings) {
  const currency = typeof doc?.currency === 'string' ? doc.currency.toUpperCase() : ''
  const config = getDocumentType(doc?.type) || getDocumentType('invoice')
  return {
    type: config.type, currency, exponent: currencyExponent(currency), sign: config.sign,
    lines: [], charges: [],
    itemsGross: 0, lineDiscountTotal: 0, documentDiscountTotal: 0, discountTotal: 0, itemsNet: 0,
    shippingTotal: 0, feesTotal: 0, taxBaseTotal: 0, taxTotal: 0, withholdingTotal: 0, taxSummary: [],
    totalBeforeRounding: 0, roundingAdjustment: 0, total: 0, amountPayable: 0,
    deposit: null, paymentsTotal: 0, balanceDue: 0, signedTotal: 0, signedAmountPayable: 0,
    warnings,
  }
}

function calculate(doc) {
  /** @type {CalcWarning[]} */
  const warnings = []
  const warn = (path, code) => warnings.push({ path, code, message: MESSAGES[code] || code })
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    return emptyTotals(null, [{ path: '', code: 'invalid_document', message: MESSAGES.invalid_document }])
  }

  let config = getDocumentType(doc.type)
  if (!config) {
    warn('type', 'unknown_document_type')
    config = getDocumentType('invoice')
  }
  const { features } = config
  const currency = typeof doc.currency === 'string' ? doc.currency.toUpperCase() : ''
  if (!isKnownCurrency(currency)) warn('currency', 'unknown_currency')
  const exponent = currencyExponent(currency)
  const options = normalizeOptions(doc.options)
  const mode = options.roundingMode
  const inclusive = options.taxMode === 'inclusive'
  const big = (value, path) => toBigInt(value, (code) => warn(path, code))

  // ── Tax definitions ──
  const taxes = new Map()
  if (features.pricing && features.taxes && Array.isArray(doc.taxes)) {
    doc.taxes.forEach((t, i) => {
      const path = `taxes[${i}]`
      const id = t && typeof t === 'object' && t.id !== undefined && t.id !== null ? String(t.id) : ''
      if (!id) return warn(path, 'invalid_tax')
      if (taxes.has(id)) return warn(`${path}.id`, 'duplicate_tax_id')
      let rate = big(t.rate_micro, `${path}.rate_micro`)
      if (rate < 0n || rate > ONE) {
        warn(`${path}.rate_micro`, 'tax_rate_out_of_range')
        rate = rate < 0n ? 0n : ONE
      }
      let compound = t.compound === true
      const withholding = t.withholding === true
      if (compound && withholding) {
        warn(path, 'withholding_compound_conflict')
        compound = false
      }
      taxes.set(id, { id, name: typeof t.name === 'string' ? t.name : '', rate, compound, withholding })
    })
  }

  const resolveTaxIds = (ids, path) => {
    if (!features.pricing || !features.taxes || !Array.isArray(ids)) return []
    const seen = new Set()
    ids.forEach((raw, j) => {
      const id = String(raw)
      if (!taxes.has(id)) return warn(`${path}.taxIds[${j}]`, 'unknown_tax_reference')
      seen.add(id)
    })
    return [...seen]
  }

  // ── 1–2. Item lines ──
  const rawLines = Array.isArray(doc.lines) ? doc.lines : []
  const items = rawLines.map((raw, index) => {
    const line = raw && typeof raw === 'object' ? raw : {}
    const path = `lines[${index}]`
    const qty = big(line.qty_milli, `${path}.qty_milli`)
    if (qty < 0n && !config.allowNegativeQuantity) warn(`${path}.qty_milli`, 'negative_quantity')
    const price = features.pricing ? big(line.unitPrice_minor, `${path}.unitPrice_minor`) : 0n
    const gross = roundDiv(price * qty, QTY_SCALE, mode)
    const lineDiscount = features.pricing && features.discount ? discountAmount(line.discount, gross, `${path}.discount`) : 0n
    return {
      id: typeof line.id === 'string' ? line.id : String(index),
      kind: 'item',
      index,
      gross,
      lineDiscount,
      documentDiscount: 0n,
      net: gross - lineDiscount,
      taxIds: resolveTaxIds(line.taxIds, path),
    }
  })

  function discountAmount(discount, amount, path) {
    if (!discount || typeof discount !== 'object') return 0n
    if (discount.kind === 'amount') {
      let value = big(discount.value, `${path}.value`)
      if (value < 0n) {
        warn(`${path}.value`, 'negative_discount')
        return 0n
      }
      const magnitude = amount < 0n ? -amount : amount
      if (value > magnitude) {
        warn(`${path}.value`, 'discount_exceeds_amount')
        value = magnitude
      }
      return amount < 0n ? -value : value
    }
    let rate = big(discount.value, `${path}.value`)
    if (rate < 0n || rate > ONE) {
      warn(`${path}.value`, 'discount_out_of_range')
      rate = rate < 0n ? 0n : ONE
    }
    return roundDiv(amount * rate, ONE, mode)
  }

  // ── 3. Document discount ──
  if (features.pricing && features.discount && doc.discount && typeof doc.discount === 'object') {
    const itemsNetSum = sum(items.map((l) => l.net))
    if (itemsNetSum <= 0n) {
      warn('discount', 'discount_not_applicable')
    } else {
      const total = discountAmount(doc.discount, itemsNetSum, 'discount')
      const shares = allocate(total, items.map((l) => (l.net > 0n ? l.net : 0n)))
      items.forEach((l, i) => {
        l.documentDiscount = shares[i]
        l.net -= shares[i]
      })
    }
  }

  // ── 4. Shipping and fees ──
  const charges = []
  if (features.pricing && features.shipping && doc.shipping && typeof doc.shipping === 'object') {
    const amount = big(doc.shipping.amount_minor, 'shipping.amount_minor')
    charges.push({ id: String(doc.shipping.id ?? 'shipping'), kind: 'shipping', index: -1, label: String(doc.shipping.label ?? ''), gross: amount, lineDiscount: 0n, documentDiscount: 0n, net: amount, taxIds: resolveTaxIds(doc.shipping.taxIds, 'shipping') })
  }
  if (features.pricing && features.fees && Array.isArray(doc.fees)) {
    doc.fees.forEach((fee, index) => {
      if (!fee || typeof fee !== 'object') return
      const amount = big(fee.amount_minor, `fees[${index}].amount_minor`)
      charges.push({ id: String(fee.id ?? `fee-${index}`), kind: 'fee', index, label: String(fee.label ?? ''), gross: amount, lineDiscount: 0n, documentDiscount: 0n, net: amount, taxIds: resolveTaxIds(fee.taxIds, `fees[${index}]`) })
    })
  }

  // ── 5. Taxes ──
  const allLines = [...items, ...charges]
  const docMode = options.taxRounding === 'document'
  const pending = new Map() // taxId → [{ line, n, d }] (document rounding)

  for (const line of allLines) {
    line.taxAmounts = new Map()
    const applied = line.taxIds.map((id) => taxes.get(id))
    const nc = applied.filter((t) => !t.compound && !t.withholding)
    const comp = applied.filter((t) => t.compound)
    const wh = applied.filter((t) => t.withholding)
    const R = sum(nc.map((t) => t.rate))
    const C = sum(comp.map((t) => t.rate))
    const X = line.net
    const K = inclusive ? (ONE + R) * (ONE + C) : ONE2
    // Exact value of each tax as the fraction n / K (minor units).
    const exact = inclusive
      ? [
          ...nc.map((t) => ({ tax: t, n: X * ONE * t.rate })),
          ...comp.map((t) => ({ tax: t, n: X * (ONE + R) * t.rate })),
          ...wh.map((t) => ({ tax: t, n: X * ONE * t.rate })),
        ]
      : [
          ...nc.map((t) => ({ tax: t, n: X * t.rate * ONE })),
          ...comp.map((t) => ({ tax: t, n: X * (ONE + R) * t.rate })),
          ...wh.map((t) => ({ tax: t, n: X * t.rate * ONE })),
        ]
    line.ncIds = nc.map((t) => t.id)

    if (docMode) {
      exact.forEach((e) => {
        if (!pending.has(e.tax.id)) pending.set(e.tax.id, [])
        pending.get(e.tax.id).push({ line, n: e.n, d: K })
      })
      continue
    }
    if (!inclusive) {
      nc.forEach((t) => line.taxAmounts.set(t.id, roundDiv(X * t.rate, ONE, mode)))
      const compoundBase = X + sum(nc.map((t) => line.taxAmounts.get(t.id)))
      comp.forEach((t) => line.taxAmounts.set(t.id, roundDiv(compoundBase * t.rate, ONE, mode)))
      wh.forEach((t) => line.taxAmounts.set(t.id, roundDiv(X * t.rate, ONE, mode)))
      line.base = X
    } else {
      const base = roundDiv(X * ONE2, K, mode)
      const positive = exact.filter((e) => !e.tax.withholding)
      const shares = apportion(positive.map((e) => ({ n: e.n, d: K })), X - base)
      positive.forEach((e, i) => line.taxAmounts.set(e.tax.id, shares[i]))
      wh.forEach((t) => line.taxAmounts.set(t.id, roundDiv(base * t.rate, ONE, mode)))
      line.base = base
    }
  }

  if (docMode) {
    for (const [taxId, entries] of pending) {
      const common = entries.reduce((acc, e) => lcm(acc, e.d), 1n)
      const total = roundDiv(sum(entries.map((e) => e.n * (common / e.d))), common, mode)
      const shares = apportion(entries.map((e) => ({ n: e.n, d: e.d })), total)
      entries.forEach((e, i) => e.line.taxAmounts.set(taxId, shares[i]))
    }
    for (const line of allLines) {
      const positive = sum([...line.taxAmounts].filter(([id]) => !taxes.get(id).withholding).map(([, amount]) => amount))
      line.base = inclusive ? line.net - positive : line.net
    }
  }

  const summary = new Map()
  for (const line of allLines) {
    line.taxTotal = 0n
    line.withholding = 0n
    const ncSum = sum(line.ncIds.map((id) => line.taxAmounts.get(id) ?? 0n))
    for (const [taxId, amount] of line.taxAmounts) {
      const tax = taxes.get(taxId)
      if (tax.withholding) line.withholding += amount
      else line.taxTotal += amount
      const row = summary.get(taxId) || { base: 0n, amount: 0n }
      row.base += tax.compound ? line.base + ncSum : line.base
      row.amount += amount
      summary.set(taxId, row)
    }
    line.total = line.base + line.taxTotal
  }

  // ── 6–9. Totals ──
  const itemsGross = sum(items.map((l) => l.gross))
  const lineDiscountTotal = sum(items.map((l) => l.lineDiscount))
  const documentDiscountTotal = sum(items.map((l) => l.documentDiscount))
  const itemsNet = sum(items.map((l) => l.net))
  const shippingTotal = sum(charges.filter((c) => c.kind === 'shipping').map((c) => c.net))
  const feesTotal = sum(charges.filter((c) => c.kind === 'fee').map((c) => c.net))
  const taxBaseTotal = sum(allLines.map((l) => l.base))
  const taxTotal = sum(allLines.map((l) => l.taxTotal))
  const withholdingTotal = sum(allLines.map((l) => l.withholding))
  const totalBeforeRounding = taxBaseTotal + taxTotal

  let roundingAdjustment = 0n
  const increment = features.pricing ? big(options.cashRoundingIncrement_minor, 'options.cashRoundingIncrement_minor') : 0n
  if (increment > 0n) roundingAdjustment = roundToIncrement(totalBeforeRounding, increment, mode) - totalBeforeRounding
  const total = totalBeforeRounding + roundingAdjustment
  const amountPayable = total - withholdingTotal

  let paymentsTotal = 0n
  if (features.payments && Array.isArray(doc.payments)) {
    doc.payments.forEach((p, i) => {
      if (!p || typeof p !== 'object') return
      const amount = big(p.amount_minor, `payments[${i}].amount_minor`)
      if (amount < 0n) warn(`payments[${i}].amount_minor`, 'negative_payment')
      paymentsTotal += amount
    })
  }

  let deposit = null
  if (features.deposit && doc.deposit && typeof doc.deposit === 'object') {
    const kind = doc.deposit.kind === 'amount' ? 'amount' : 'percent'
    const payableBase = amountPayable > 0n ? amountPayable : 0n
    let due
    if (kind === 'percent') {
      let rate = big(doc.deposit.value, 'deposit.value')
      if (rate < 0n || rate > ONE) {
        warn('deposit.value', 'deposit_out_of_range')
        rate = rate < 0n ? 0n : ONE
      }
      due = roundDiv(payableBase * rate, ONE, mode)
    } else {
      due = big(doc.deposit.value, 'deposit.value')
      if (due < 0n) {
        warn('deposit.value', 'deposit_out_of_range')
        due = 0n
      } else if (due > payableBase) {
        warn('deposit.value', 'deposit_exceeds_payable')
        due = payableBase
      }
    }
    let paid = big(doc.deposit.paidAmount_minor, 'deposit.paidAmount_minor')
    if (paid < 0n) paid = 0n
    deposit = { kind, due, paid, outstanding: due > paid ? due - paid : 0n }
  }

  const balanceDue = amountPayable - paymentsTotal - (deposit ? deposit.paid : 0n)
  if (balanceDue < 0n && features.pricing) warn('payments', 'overpaid')

  const num = (value, path = '') => toSafeNumber(value, (code) => warn(path, code))
  const lineOut = (l) => ({
    id: l.id,
    kind: l.kind,
    index: l.index,
    ...(l.label !== undefined ? { label: l.label } : {}),
    gross: num(l.gross),
    lineDiscount: num(l.lineDiscount),
    documentDiscount: num(l.documentDiscount),
    net: num(l.net),
    base: num(l.base),
    taxes: [...l.taxAmounts].map(([taxId, amount]) => ({ taxId, amount: num(amount) })),
    taxTotal: num(l.taxTotal),
    withholding: num(l.withholding),
    total: num(l.total),
  })

  return {
    type: config.type,
    currency,
    exponent,
    sign: config.sign,
    lines: items.map(lineOut),
    charges: charges.map(lineOut),
    itemsGross: num(itemsGross),
    lineDiscountTotal: num(lineDiscountTotal),
    documentDiscountTotal: num(documentDiscountTotal),
    discountTotal: num(lineDiscountTotal + documentDiscountTotal),
    itemsNet: num(itemsNet),
    shippingTotal: num(shippingTotal),
    feesTotal: num(feesTotal),
    taxBaseTotal: num(taxBaseTotal),
    taxTotal: num(taxTotal),
    withholdingTotal: num(withholdingTotal),
    taxSummary: [...taxes.values()].filter((t) => summary.has(t.id)).map((t) => ({
      taxId: t.id,
      name: t.name,
      rate_micro: Number(t.rate),
      compound: t.compound,
      withholding: t.withholding,
      base: num(summary.get(t.id).base),
      amount: num(summary.get(t.id).amount),
    })),
    totalBeforeRounding: num(totalBeforeRounding),
    roundingAdjustment: num(roundingAdjustment),
    total: num(total, 'total'),
    amountPayable: num(amountPayable),
    deposit: deposit ? { kind: deposit.kind, due: num(deposit.due), paid: num(deposit.paid), outstanding: num(deposit.outstanding) } : null,
    paymentsTotal: num(paymentsTotal),
    balanceDue: num(balanceDue),
    signedTotal: num(total * BigInt(config.sign)),
    signedAmountPayable: num(amountPayable * BigInt(config.sign)),
    warnings: dedupe(warnings),
  }
}

function dedupe(warnings) {
  const seen = new Set()
  return warnings.filter((w) => {
    const key = `${w.path}|${w.code}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
