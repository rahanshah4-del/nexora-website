/**
 * Docs Studio engine — money math, taxes, deposits, conversions, validation,
 * numbering, words, serialization and share links.
 *
 * Run: npm test   (node --test tests/*.test.mjs)
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateRawSync, inflateRawSync } from 'node:zlib'

import {
  CONVERSIONS, DOCUMENT_TYPE_IDS, FALLBACK_CURRENCIES, SHARE_LINK_MAX_JSON_BYTES,
  addDays, allocate, amountInWords, apportion, calculateDocument, canConvert, changeCurrency,
  convertDocument, createDocument, currencyExponent, daysBetween, decodeShareLink, deserializeDocument,
  dueDateFromTerms, encodeForShareLink, formatMoney, formatNumber, formatPercent, formatQuantity,
  getCurrencyMeta, getDocumentType, isDocumentValid, isIsoDate, isKnownCurrency, listCurrencies,
  migrate, nextNumber, parseMoneyInput, parseSeq, percentToMicro, periodKey, quantityToMilli,
  registerWordsLanguage, roundDiv, serializeDocument, validateDocument,
} from '../src/tools/docs-studio/engine/index.js'
import { deflateRaw, inflateRaw } from '../src/tools/docs-studio/engine/deflate.js'
import { documentActions, documentReducer } from '../src/tools/docs-studio/state/documentReducer.js'

const ENGINE_DIR = fileURLToPath(new URL('../src/tools/docs-studio/engine/', import.meta.url))
const NOW = new Date(2026, 8, 27) // 2026-09-27, local
const TODAY = '2026-09-27'
const pct = (percent) => percentToMicro(String(percent))
const spaces = (s) => s.replace(/[\s  ]/g, ' ')

function idFactory(prefix = 'gen') {
  let n = 0
  return () => `${prefix}-${++n}`
}

/** A small, fully specified document of `type`. */
function makeDoc(type = 'invoice', overrides = {}) {
  const base = createDocument(type, { id: `${type}-1`, now: NOW, currency: 'USD', locale: 'en-US' })
  return {
    ...base,
    number: `${getDocumentType(type).prefix}-2026-0001`,
    seller: { ...base.seller, name: 'Nexora Test Co' },
    client: { ...base.client, name: 'Acme Ltd' },
    ...overrides,
  }
}

const line = (id, unitPrice_minor, qty_milli = 1000, extra = {}) => ({ id, description: `Item ${id}`, sku: '', unit: '', qty_milli, unitPrice_minor, discount: null, taxIds: [], ...extra })
const tax = (id, percent, extra = {}) => ({ id, name: id.toUpperCase(), rate_micro: pct(percent), compound: false, withholding: false, ...extra })
const codes = (list) => list.map((w) => w.code)

// ── Engine purity ────────────────────────────────────────────────────────────

test('engine/ has no React or DOM dependency', () => {
  for (const file of readdirSync(ENGINE_DIR).filter((f) => f.endsWith('.js'))) {
    const source = readFileSync(join(ENGINE_DIR, file), 'utf8')
    assert.doesNotMatch(source, /from\s+['"]react/, `${file} imports React`)
    assert.doesNotMatch(source, /\b(window|document)\.[A-Za-z]/, `${file} touches the DOM`)
    assert.doesNotMatch(source, /\b(localStorage|sessionStorage|navigator)\b/, `${file} uses browser storage/navigator`)
  }
})

// ── Money primitives ─────────────────────────────────────────────────────────

test('roundDiv: half-up is symmetric, half-even rounds ties to even', () => {
  assert.equal(roundDiv(5n, 2n), 3n)
  assert.equal(roundDiv(-5n, 2n), -3n)
  assert.equal(roundDiv(5n, 2n, 'half_even'), 2n)
  assert.equal(roundDiv(7n, 2n, 'half_even'), 4n)
  assert.equal(roundDiv(-5n, 2n, 'half_even'), -2n)
  assert.equal(roundDiv(4n, 3n), 1n)
})

test('allocate / apportion always sum exactly to the target', () => {
  assert.deepEqual(allocate(100n, [1n, 1n, 1n]), [34n, 33n, 33n])
  assert.deepEqual(allocate(-100n, [1n, 1n, 1n]).reduce((a, b) => a + b, 0n), -100n)
  assert.deepEqual(allocate(7n, [0n, 0n]), [4n, 3n])
  const parts = apportion([{ n: 10n, d: 3n }, { n: -5n, d: 7n }, { n: 22n, d: 9n }], 5n)
  assert.equal(parts.reduce((a, b) => a + b, 0n), 5n)
})

test('no binary float drift: 0.1 + 0.2, 2.01 × 0.5, 1.15 × 3', () => {
  const a = parseMoneyInput('0.1', 'USD').minor
  const b = parseMoneyInput('0.2', 'USD').minor
  assert.equal(a + b, 30)
  const doc = makeDoc('invoice', { lines: [line('a', 201, 500), line('b', 115, 3000)] })
  const t = calculateDocument(doc)
  assert.equal(t.lines[0].gross, 101) // 1.005 → 1.01 (float gives 1.00)
  assert.equal(t.lines[1].gross, 345) // float gives 3.4499999999999997
  assert.equal(t.total, 446)
})

test('input helpers: percent, quantity, locale-aware money parsing', () => {
  assert.equal(percentToMicro('7.25'), 72500)
  assert.equal(quantityToMilli('2.5'), 2500)
  assert.equal(parseMoneyInput('1.234,56', 'EUR', 'de-DE').minor, 123456)
  assert.equal(parseMoneyInput('1,234.567', 'KWD', 'en-US').minor, 1234567)
  assert.deepEqual(parseMoneyInput('12.345', 'USD', 'en-US'), { ok: true, minor: 1235, rounded: true })
  assert.equal(parseMoneyInput('₹ 12,34,567.89', 'INR', 'en-IN').minor, 123456789)
  assert.deepEqual(parseMoneyInput('abc', 'USD'), { ok: false })
})

// ── Currency ─────────────────────────────────────────────────────────────────

test('currency list comes from Intl with a fallback', () => {
  const list = listCurrencies()
  for (const code of ['USD', 'EUR', 'PKR', 'INR', 'KWD', 'JPY']) assert.ok(list.includes(code), code)
  assert.ok(list.length >= FALLBACK_CURRENCIES.length)
  assert.ok(isKnownCurrency('AED'))
  assert.ok(!isKnownCurrency('ZZZ'))
  assert.ok(!isKnownCurrency('usd'))
})

test('exponents follow ISO 4217, not CLDR display digits', () => {
  assert.equal(currencyExponent('USD'), 2)
  assert.equal(currencyExponent('JPY'), 0)
  assert.equal(currencyExponent('KWD'), 3)
  assert.equal(currencyExponent('BHD'), 3)
  assert.equal(currencyExponent('IQD'), 3)
  assert.equal(currencyExponent('CLF'), 4)
})

test('getCurrencyMeta', () => {
  assert.deepEqual(getCurrencyMeta('USD'), { code: 'USD', exponent: 2, symbol: '$', narrowSymbol: '$', name: 'US Dollar' })
  const kwd = getCurrencyMeta('kwd')
  assert.equal(kwd.code, 'KWD')
  assert.equal(kwd.exponent, 3)
  assert.equal(kwd.name, 'Kuwaiti Dinar')
})

test('formatMoney is exact and locale-aware', () => {
  assert.equal(formatMoney(123456789, 'INR', 'en-IN'), '₹12,34,567.89')
  assert.equal(formatMoney(1234, 'JPY', 'en-US'), '¥1,234')
  assert.equal(spaces(formatMoney(3938, 'KWD', 'en-US')), 'KWD 3.938')
  assert.equal(spaces(formatMoney(123456, 'EUR', 'de-DE')), '1.234,56 €')
  assert.equal(formatMoney(-500, 'USD', 'en-US'), '-$5.00')
  assert.equal(formatMoney(9007199254740993n, 'USD', 'en-US'), '$90,071,992,547,409.93')
  assert.equal(spaces(formatMoney(1234, 'ZZZ', 'en-US')), 'ZZZ 12.34')
  assert.equal(formatPercent(72500, 'en-US'), '7.25%')
  assert.equal(formatQuantity(2500, 'en-US'), '2.5')
})

// ── Calculation ──────────────────────────────────────────────────────────────

test('exclusive tax: line + document discounts, shipping, payments', () => {
  const doc = makeDoc('invoice', {
    taxes: [tax('vat', 10)],
    lines: [
      line('a', 5000, 2000, { discount: { kind: 'percent', value: pct(10) }, taxIds: ['vat'] }),
      line('b', 3000, 1000, { taxIds: ['vat'] }),
    ],
    discount: { kind: 'amount', value: 1200 },
    shipping: { id: 'ship', label: 'Shipping', amount_minor: 1000, taxIds: ['vat'] },
    payments: [{ id: 'p1', date: TODAY, amount_minor: 5000, method: 'Card', reference: '', note: '', source: '' }],
  })
  const t = calculateDocument(doc)
  assert.deepEqual(t.warnings, [])
  assert.equal(t.itemsGross, 13000)
  assert.equal(t.lineDiscountTotal, 1000)
  assert.deepEqual(t.lines.map((l) => l.documentDiscount), [900, 300]) // 12.00 split 90:30
  assert.equal(t.documentDiscountTotal, 1200)
  assert.equal(t.itemsNet, 10800)
  assert.equal(t.shippingTotal, 1000)
  assert.equal(t.taxBaseTotal, 11800)
  assert.equal(t.taxTotal, 1180)
  assert.equal(t.total, 12980)
  assert.equal(t.amountPayable, 12980)
  assert.equal(t.paymentsTotal, 5000)
  assert.equal(t.balanceDue, 7980)
  assert.deepEqual(t.taxSummary, [{ taxId: 'vat', name: 'VAT', rate_micro: 100000, compound: false, withholding: false, base: 11800, amount: 1180 }])
})

test('inclusive VAT 20% on 9.99: base + tax = gross, both rounding modes', () => {
  const doc = makeDoc('invoice', { currency: 'GBP', taxes: [tax('vat', 20)], lines: [line('a', 999, 1000, { taxIds: ['vat'] })] })
  doc.options = { ...doc.options, taxMode: 'inclusive' }
  let t = calculateDocument(doc)
  assert.equal(t.lines[0].base, 833) // 8.325 → 8.33
  assert.equal(t.taxTotal, 166)
  assert.equal(t.total, 999)
  doc.options = { ...doc.options, roundingMode: 'half_even' }
  t = calculateDocument(doc)
  assert.equal(t.lines[0].base, 832) // 8.325 → 8.32 (tie to even)
  assert.equal(t.taxTotal, 167)
  assert.equal(t.total, 999)
})

test('line vs document tax rounding', () => {
  const doc = makeDoc('invoice', { taxes: [tax('t', 10)], lines: ['a', 'b', 'c'].map((id) => line(id, 5, 1000, { taxIds: ['t'] })) })
  assert.equal(calculateDocument(doc).taxTotal, 3) // 0.5¢ → 1¢ on each line
  doc.options = { ...doc.options, taxRounding: 'document' }
  const t = calculateDocument(doc)
  assert.equal(t.taxTotal, 2) // 1.5¢ once → 2¢
  assert.equal(t.lines.reduce((s, l) => s + l.taxTotal, 0), 2) // per-line shares still add up
})

test('compound tax, exclusive (GST 5% + QST 9.975% on GST-inclusive base)', () => {
  const doc = makeDoc('invoice', {
    currency: 'CAD',
    taxes: [tax('gst', 5), tax('qst', 9.975, { compound: true })],
    lines: [line('a', 10000, 1000, { taxIds: ['gst', 'qst'] })],
  })
  const t = calculateDocument(doc)
  assert.deepEqual(t.taxSummary.map((s) => [s.taxId, s.base, s.amount]), [['gst', 10000, 500], ['qst', 10500, 1047]])
  assert.equal(t.total, 11547)
})

test('inclusive + compound: B = G / ((1 + R)(1 + C)), exact reconciliation', () => {
  const taxes = [tax('gst', 5), tax('qst', 9.975, { compound: true })]
  const doc = makeDoc('invoice', { currency: 'CAD', taxes, lines: [line('a', 11547, 1000, { taxIds: ['gst', 'qst'] })] })
  doc.options = { ...doc.options, taxMode: 'inclusive' }
  const t = calculateDocument(doc)
  // 115.47 / (1.05 × 1.09975) = 99.99675… → 100.00; GST 5.00, QST 10.47
  assert.equal(t.lines[0].base, 10000)
  assert.deepEqual(t.taxSummary.map((s) => [s.taxId, s.amount]), [['gst', 500], ['qst', 1047]])
  assert.equal(t.total, 11547)
  assert.deepEqual(t.warnings, [])

  // Many awkward amounts, both rounding modes: every line reconciles to its gross,
  // and the base is the correctly rounded closed-form value.
  const K = (1_000_000n + 50_000n) * (1_000_000n + 99_750n)
  const amounts = [1, 7, 99, 101, 1999, 12345, 99999, 100001, 7654321]
  for (const taxRounding of ['line', 'document']) {
    const many = makeDoc('invoice', { currency: 'CAD', taxes, lines: amounts.map((a, i) => line(`l${i}`, a, 1000, { taxIds: ['gst', 'qst'] })) })
    many.options = { ...many.options, taxMode: 'inclusive', taxRounding }
    const r = calculateDocument(many)
    r.lines.forEach((l, i) => {
      assert.equal(l.base + l.taxTotal, amounts[i], `line ${i} reconciles`)
      if (taxRounding === 'line') assert.equal(BigInt(l.base), roundDiv(BigInt(amounts[i]) * 1_000_000_000_000n, K), `line ${i} base`)
    })
    assert.equal(r.total, amounts.reduce((a, b) => a + b, 0))
    assert.equal(r.taxBaseTotal + r.taxTotal, r.total)
  }
})

test('withholding reduces the amount payable, not the invoice total', () => {
  const doc = makeDoc('invoice', {
    taxes: [tax('vat', 15), tax('wht', 5, { withholding: true })],
    lines: [line('a', 100000, 1000, { taxIds: ['vat', 'wht'] })],
    payments: [{ id: 'p', date: TODAY, amount_minor: 10000, method: '', reference: '', note: '', source: '' }],
  })
  let t = calculateDocument(doc)
  assert.equal(t.taxTotal, 15000)
  assert.equal(t.withholdingTotal, 5000)
  assert.equal(t.total, 115000)
  assert.equal(t.amountPayable, 110000)
  assert.equal(t.balanceDue, 100000)
  assert.deepEqual(t.taxSummary.find((s) => s.taxId === 'wht'), { taxId: 'wht', name: 'WHT', rate_micro: 50000, compound: false, withholding: true, base: 100000, amount: 5000 })

  doc.options = { ...doc.options, taxMode: 'inclusive' }
  doc.lines = [line('a', 115000, 1000, { taxIds: ['vat', 'wht'] })]
  t = calculateDocument(doc)
  assert.equal(t.taxBaseTotal, 100000)
  assert.equal(t.total, 115000)
  assert.equal(t.amountPayable, 110000)
})

test('withholding + compound is reported, never silently mis-computed', () => {
  const doc = makeDoc('invoice', { taxes: [tax('wht', 5, { withholding: true, compound: true })], lines: [line('a', 10000, 1000, { taxIds: ['wht'] })] })
  const t = calculateDocument(doc)
  assert.ok(codes(t.warnings).includes('withholding_compound_conflict'))
  assert.equal(t.withholdingTotal, 500) // applied as plain withholding, as the warning says
  assert.ok(codes(validateDocument(doc)).includes('withholding_compound_conflict'))
})

test('cash rounding to 0.05 (CHF)', () => {
  const doc = makeDoc('invoice', { currency: 'CHF', lines: [line('a', 1003)] })
  doc.options = { ...doc.options, cashRoundingIncrement_minor: 5 }
  let t = calculateDocument(doc)
  assert.equal(t.roundingAdjustment, 2)
  assert.equal(t.total, 1005)
  doc.lines = [line('a', 1002)]
  t = calculateDocument(doc)
  assert.equal(t.roundingAdjustment, -2)
  assert.equal(t.total, 1000)
})

test('JPY (0 decimals) end to end', () => {
  const doc = makeDoc('invoice', { currency: 'JPY', locale: 'ja-JP', taxes: [tax('ct', 10)], lines: [line('a', 1234, 1500, { taxIds: ['ct'] })] })
  const t = calculateDocument(doc)
  assert.equal(t.lines[0].gross, 1851)
  assert.equal(t.taxTotal, 185)
  assert.equal(t.total, 2036)
  assert.equal(formatMoney(t.total, 'JPY', 'en-US'), '¥2,036')
  assert.equal(amountInWords(t.total, 'JPY'), 'Two Thousand Thirty-Six Yen')
})

test('KWD (3 decimals) end to end', async () => {
  const price = parseMoneyInput('1.250', 'KWD', 'en-US')
  assert.equal(price.minor, 1250)
  const doc = makeDoc('invoice', { currency: 'KWD', taxes: [tax('vat', 5)], lines: [line('a', price.minor, quantityToMilli('3'), { taxIds: ['vat'] })] })
  const t = calculateDocument(doc)
  assert.equal(t.exponent, 3)
  assert.equal(t.taxBaseTotal, 3750)
  assert.equal(t.taxTotal, 188) // 0.1875 → 0.188
  assert.equal(t.total, 3938)
  assert.equal(spaces(formatMoney(t.total, 'KWD', 'en-US')), 'KWD 3.938')
  assert.equal(amountInWords(t.total, 'KWD'), 'Three Dinars and Nine Hundred Thirty-Eight Fils')
  const link = await encodeForShareLink(doc)
  const back = await decodeShareLink(link.value)
  assert.equal(calculateDocument(back.document).total, 3938)
  // Switching currency keeps the typed values: 1.250 KWD → 1.25 USD → ¥1.
  assert.equal(changeCurrency(doc, 'USD').lines[0].unitPrice_minor, 125)
  assert.equal(changeCurrency(doc, 'JPY').lines[0].unitPrice_minor, 1)
})

test('credit notes allow negative quantities and carry sign −1', () => {
  const doc = makeDoc('credit_note', { lines: [line('a', 1000, 2000), line('b', 500, -1000)] })
  const t = calculateDocument(doc)
  assert.equal(t.sign, -1)
  assert.equal(t.total, 1500)
  assert.equal(t.signedTotal, -1500)
  assert.ok(!codes(t.warnings).includes('negative_quantity'))
  assert.ok(!codes(validateDocument(doc)).includes('negative_quantity'))
})

test('calculateDocument never throws on hostile input', () => {
  const hostile = [
    null, undefined, 42, 'invoice', [], {},
    { type: 'nope', currency: 12, lines: 'x', taxes: {}, options: null },
    { lines: [null, 5, 'x', { qty_milli: 'abc', unitPrice_minor: {}, discount: { kind: 'amount', value: NaN }, taxIds: 'vat' }] },
    { taxes: [{ id: 'a', rate_micro: Infinity }, { id: 'a' }, null, 7], lines: [{ qty_milli: 1000, unitPrice_minor: 1, taxIds: ['a', 'missing'] }] },
    { lines: [{ qty_milli: 1e9, unitPrice_minor: 9e15 }] },
    { lines: [{ qty_milli: 1.5, unitPrice_minor: 10.7 }], deposit: { kind: 'percent', value: -5 }, payments: [{ amount_minor: 'x' }] },
    new Proxy({}, { get() { throw new Error('boom') } }),
  ]
  for (const input of hostile) {
    const t = calculateDocument(input)
    assert.equal(typeof t.total, 'number')
    assert.ok(Array.isArray(t.warnings))
  }
  assert.ok(codes(calculateDocument(hostile[9]).warnings).includes('amount_overflow'))
  assert.ok(codes(calculateDocument(hostile.at(-1)).warnings).includes('calculation_failed'))
  const clamped = calculateDocument(makeDoc('invoice', { taxes: [{ id: 't', name: 'T', rate_micro: 1_500_000 }], lines: [line('a', 100, 1000, { taxIds: ['t'], discount: { kind: 'amount', value: 500 } })] }))
  assert.deepEqual(codes(clamped.warnings).sort(), ['discount_exceeds_amount', 'tax_rate_out_of_range'])
})

// ── Deposits ─────────────────────────────────────────────────────────────────

test('deposits: percent and amount, clamping, balance due', () => {
  const quote = makeDoc('quotation', { taxes: [tax('vat', 15)], lines: [line('a', 100000, 1000, { taxIds: ['vat'] })] })
  const withDeposit = (deposit) => calculateDocument({ ...quote, deposit: { paidAmount_minor: 0, paidDate: null, method: '', ...deposit } })

  let t = withDeposit({ kind: 'percent', value: pct(30) })
  assert.deepEqual(t.deposit, { kind: 'percent', due: 34500, paid: 0, outstanding: 34500 })
  t = withDeposit({ kind: 'amount', value: 50000 })
  assert.equal(t.deposit.due, 50000)
  t = withDeposit({ kind: 'amount', value: 200000 })
  assert.equal(t.deposit.due, 115000)
  assert.ok(codes(t.warnings).includes('deposit_exceeds_payable'))
  t = withDeposit({ kind: 'percent', value: pct(30), paidAmount_minor: 34500, paidDate: TODAY })
  assert.equal(t.deposit.outstanding, 0)
  assert.equal(t.balanceDue, 80500)

  const invoice = convertDocument({ ...quote, deposit: { kind: 'percent', value: pct(30), paidAmount_minor: 34500, paidDate: '2026-09-20', method: 'Bank' } }, 'invoice', { now: NOW, idFactory: idFactory() })
  assert.equal(invoice.deposit, null)
  assert.equal(invoice.payments.length, 1)
  assert.deepEqual({ ...invoice.payments[0], id: 'x' }, { id: 'x', date: '2026-09-20', amount_minor: 34500, method: 'Bank', reference: 'Deposit — QUO-2026-0001', note: '', source: 'deposit' })
  const it = calculateDocument(invoice)
  assert.equal(it.total, 115000)
  assert.equal(it.balanceDue, 80500)
})

// ── Conversions ──────────────────────────────────────────────────────────────

test('conversion table matches the spec', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(CONVERSIONS)), {
    quotation: ['invoice', 'proforma'],
    proforma: ['invoice'],
    invoice: ['receipt', 'delivery_note', 'credit_note'],
    purchase_order: ['invoice'],
  })
  assert.equal(DOCUMENT_TYPE_IDS.length, 7)
  assert.ok(!canConvert('invoice', 'quotation'))
  assert.throws(() => convertDocument(makeDoc('invoice'), 'quotation'), RangeError)
})

function pricedDoc(type, overrides = {}) {
  return makeDoc(type, {
    status: getDocumentType(type).statuses[1],
    taxes: [tax('vat', 10)],
    lines: [line('a', 20000, 2000, { taxIds: ['vat'], discount: { kind: 'percent', value: pct(5) } }), line('b', 5000, 1000, { taxIds: ['vat'] })],
    shipping: { id: 'ship', label: 'Shipping', amount_minor: 1500, taxIds: ['vat'] },
    fees: [{ id: 'fee', label: 'Handling', amount_minor: 500, taxIds: [] }],
    shipTo: { name: 'Warehouse', address: 'Dock 4', email: '', phone: '', taxId: '', website: '' },
    ...overrides,
  })
}

function assertConverted(source, result, targetType) {
  const target = getDocumentType(targetType)
  assert.equal(result.type, targetType)
  assert.notEqual(result.id, source.id)
  assert.equal(result.sourceDocId, source.id)
  assert.equal(result.sourceNumber, source.number)
  assert.equal(result.sourceType, source.type)
  assert.equal(result.status, target.statuses[0])
  assert.equal(result.number, '')
  assert.equal(result.issueDate, TODAY)
  assert.deepEqual(codes(calculateDocument(result).warnings), [])
}

test('quotation → invoice', () => {
  const q = pricedDoc('quotation', { deposit: { kind: 'percent', value: pct(20), paidAmount_minor: 0, paidDate: null, method: '' } })
  const inv = convertDocument(q, 'invoice', { now: NOW, idFactory: idFactory() })
  assertConverted(q, inv, 'invoice')
  assert.equal(inv.validUntil, null)
  assert.equal(inv.deposit, null)
  assert.deepEqual(inv.payments, []) // deposit requested but never paid
  assert.equal(inv.paymentTermsDays, 14)
  assert.equal(inv.dueDate, '2026-10-11')
  assert.equal(calculateDocument(inv).total, calculateDocument(q).total)
})

test('quotation → proforma keeps the deposit request', () => {
  const q = pricedDoc('quotation', { deposit: { kind: 'amount', value: 10000, paidAmount_minor: 0, paidDate: null, method: '' } })
  const pro = convertDocument(q, 'proforma', { now: NOW, idFactory: idFactory() })
  assertConverted(q, pro, 'proforma')
  assert.deepEqual(pro.deposit, q.deposit)
  assert.equal(pro.validUntil, addDays(TODAY, 30))
  assert.equal(pro.dueDate, null)
  assert.equal(calculateDocument(pro).deposit.due, 10000)
})

test('proforma → invoice turns a paid advance into a payment', () => {
  const pro = pricedDoc('proforma', { deposit: { kind: 'percent', value: pct(50), paidAmount_minor: 25000, paidDate: '2026-09-25', method: 'Wire' } })
  const inv = convertDocument(pro, 'invoice', { now: NOW, idFactory: idFactory() })
  assertConverted(pro, inv, 'invoice')
  assert.equal(inv.payments.length, 1)
  assert.equal(inv.payments[0].source, 'deposit')
  const t = calculateDocument(inv)
  assert.equal(t.balanceDue, t.amountPayable - 25000)
})

test('invoice → receipt acknowledges payment in full', () => {
  const inv = pricedDoc('invoice', { payments: [{ id: 'p1', date: '2026-09-26', amount_minor: 10000, method: 'Cash', reference: '', note: '', source: '' }] })
  const rct = convertDocument(inv, 'receipt', { now: NOW, idFactory: idFactory() })
  assertConverted(inv, rct, 'receipt')
  const t = calculateDocument(rct)
  assert.equal(rct.payments[0].id, 'p1')
  assert.equal(rct.payments.length, 2)
  assert.equal(t.paymentsTotal, t.amountPayable)
  assert.equal(t.balanceDue, 0)
  assert.equal(rct.dueDate, null)
  assert.equal(rct.shipTo, null)
})

test('invoice → delivery note strips all pricing', () => {
  const inv = pricedDoc('invoice', { payments: [{ id: 'p1', date: TODAY, amount_minor: 100, method: '', reference: '', note: '', source: '' }] })
  const dn = convertDocument(inv, 'delivery_note', { now: NOW, idFactory: idFactory() })
  assertConverted(inv, dn, 'delivery_note')
  assert.deepEqual(dn.lines.map((l) => [l.description, l.qty_milli, l.unitPrice_minor, l.discount, l.taxIds]), [['Item a', 2000, 0, null, []], ['Item b', 1000, 0, null, []]])
  assert.deepEqual([dn.taxes, dn.discount, dn.shipping, dn.fees, dn.payments, dn.dueDate], [[], null, null, [], [], null])
  assert.equal(dn.shipTo.name, 'Warehouse')
  assert.equal(calculateDocument(dn).total, 0)
})

test('invoice → credit note', () => {
  const inv = pricedDoc('invoice', { payments: [{ id: 'p1', date: TODAY, amount_minor: 100, method: '', reference: '', note: '', source: '' }] })
  const cn = convertDocument(inv, 'credit_note', { now: NOW, idFactory: idFactory() })
  assertConverted(inv, cn, 'credit_note')
  assert.deepEqual([cn.payments, cn.dueDate, cn.shipTo], [[], null, null])
  const t = calculateDocument(cn)
  assert.equal(t.total, calculateDocument(inv).total)
  assert.equal(t.signedTotal, -t.total)
})

test('purchase order → invoice: the vendor invoices the buyer', () => {
  const po = pricedDoc('purchase_order', { deliveryDate: '2026-10-05' })
  const inv = convertDocument(po, 'invoice', { now: NOW, idFactory: idFactory() })
  assertConverted(po, inv, 'invoice')
  assert.equal(inv.seller.name, 'Acme Ltd')
  assert.equal(inv.client.name, 'Nexora Test Co')
  assert.equal(inv.reference, po.number)
  assert.equal(inv.deliveryDate, null)
  assert.equal(inv.paymentTermsDays, 30)
  assert.equal(inv.dueDate, addDays(TODAY, 30))
})

// ── Validation ───────────────────────────────────────────────────────────────

test('validateDocument reports structured codes', () => {
  const bad = makeDoc('invoice', {
    currency: 'ZZZ',
    seller: { name: '' },
    client: { name: '   ' },
    issueDate: TODAY,
    dueDate: '2026-09-01',
    taxes: [tax('high', 150), tax('neg', 0, { rate_micro: -1 })],
    lines: [line('a', 100, -2000, { taxIds: ['high', 'ghost'] })],
  })
  const issues = validateDocument(bad)
  const byCode = Object.fromEntries(issues.map((i) => [i.code, i]))
  for (const code of ['negative_quantity', 'unknown_currency', 'missing_seller_name', 'missing_client_name', 'due_before_issue', 'tax_rate_out_of_range', 'unknown_tax_reference']) {
    assert.ok(byCode[code], `expected ${code}`)
    assert.equal(byCode[code].severity, 'error')
    assert.equal(typeof byCode[code].message, 'string')
  }
  assert.equal(byCode.negative_quantity.path, 'lines[0].qty_milli')
  assert.equal(byCode.due_before_issue.path, 'dueDate')
  assert.equal(byCode.missing_seller_name.path, 'seller.name')
  assert.deepEqual(issues.filter((i) => i.code === 'tax_rate_out_of_range').map((i) => i.path), ['taxes[0].rate_micro', 'taxes[1].rate_micro'])
  assert.equal(byCode.unknown_tax_reference.path, 'lines[0].taxIds[1]')
  assert.ok(!isDocumentValid(bad))

  const good = pricedDoc('invoice')
  assert.deepEqual(validateDocument(good).filter((i) => i.severity === 'error'), [])
  assert.ok(isDocumentValid(good))
  assert.deepEqual(codes(validateDocument(null)), ['invalid_document'])
})

// ── Numbering ────────────────────────────────────────────────────────────────

test('number patterns format, advance and parse back', () => {
  const pattern = '{PREFIX}-{YYYY}-{seq:4}'
  assert.equal(formatNumber(pattern, { prefix: 'INV', seq: 7, date: TODAY }), 'INV-2026-0007')
  assert.deepEqual(nextNumber(pattern, 41, '2026-01-05', { prefix: 'QUO' }), { number: 'QUO-2026-0042', seq: 42 })
  assert.equal(parseSeq('INV-2026-0007', pattern, { prefix: 'INV' }), 7)
  assert.equal(parseSeq('INV-2026-12345', pattern), 12345)
  assert.equal(parseSeq('QUO-2026-0007', pattern, { prefix: 'INV' }), null)
  assert.equal(parseSeq('INV-2026-07', pattern), null)
  assert.equal(parseSeq('anything', 'NO-SEQ-{YYYY}'), null)

  const patterns = ['{PREFIX}-{YYYY}-{seq:4}', '{PREFIX}{YY}{MM}-{seq:3}', 'INV/{YYYY}/{MM}/{seq}', '{seq:6}', 'A.B+{seq:2}(x)']
  for (const p of patterns) {
    for (const seq of [1, 9, 10, 999, 1000, 123456]) {
      const number = formatNumber(p, { prefix: 'DN', seq, date: '2026-03-09' })
      assert.equal(parseSeq(number, p, { prefix: 'DN' }), seq, `${p} ${seq}`)
      assert.equal(parseSeq(number, p), seq, `${p} ${seq} (any prefix)`)
    }
  }
  assert.equal(formatNumber('{PREFIX}{YY}{MM}-{seq:3}', { prefix: 'R', seq: 5, date: '2026-03-09' }), 'R2603-005')
  assert.equal(periodKey('{PREFIX}-{YYYY}-{seq:4}', TODAY), '2026')
  assert.equal(periodKey('{PREFIX}{YY}{MM}-{seq}', TODAY), '2026-09')
  assert.equal(periodKey('{PREFIX}-{seq}', TODAY), 'all')
})

// ── Amount in words ──────────────────────────────────────────────────────────

test('amount in words: Indian and Western systems', () => {
  assert.equal(amountInWords(123456789, 'INR', { system: 'indian' }), 'Twelve Lakh Thirty-Four Thousand Five Hundred Sixty-Seven Rupees and Eighty-Nine Paise')
  assert.equal(amountInWords(123456789, 'INR'), 'One Million Two Hundred Thirty-Four Thousand Five Hundred Sixty-Seven Rupees and Eighty-Nine Paise')
  assert.equal(amountInWords(10_000_000_000, 'INR', { system: 'indian' }), 'Ten Crore Rupees')
  assert.equal(amountInWords(100_000_000_000_000n, 'INR', { system: 'indian' }), 'One Lakh Crore Rupees')
  assert.equal(amountInWords(12_345_678_900, 'PKR', { system: 'indian', only: true }), 'Twelve Crore Thirty-Four Lakh Fifty-Six Thousand Seven Hundred Eighty-Nine Rupees Only')
})

test('amount in words: units, plurals, edge cases, fallback, registry', () => {
  assert.equal(amountInWords(101, 'USD'), 'One Dollar and One Cent')
  assert.equal(amountInWords(100_000_000, 'USD'), 'One Million Dollars')
  assert.equal(amountInWords(0, 'USD'), 'Zero Dollars')
  assert.equal(amountInWords(-250, 'USD'), 'Minus Two Dollars and Fifty Cents')
  assert.equal(amountInWords(11500, 'EUR', { only: true }), 'One Hundred Fifteen Euros Only')
  assert.equal(amountInWords(1, 'GBP'), 'Zero Pounds and One Penny')
  assert.equal(amountInWords(250, 'KWD'), 'Zero Dinars and Two Hundred Fifty Fils')
  assert.equal(amountInWords(2100, 'AED'), 'Twenty-One Dirhams')
  assert.equal(amountInWords(1, 'JPY'), 'One Yen')
  assert.equal(amountInWords(123456, 'MUR'), 'MUR One Thousand Two Hundred Thirty-Four and 56/100')
  assert.equal(amountInWords(1234, 'OMR', { lang: 'fr' }), 'One Rial and Two Hundred Thirty-Four Baisa') // unknown language → English
  registerWordsLanguage('xx', {
    numberToWords: (n) => `#${n}`,
    units: () => ({ major: ['u', 'us'], minor: ['c', 'cs'] }),
    join: ({ majorWords, majorUnit, minorWords, minorUnit }) => `${majorWords}${majorUnit}${minorWords ? `+${minorWords}${minorUnit}` : ''}`,
    fallback: ({ code }) => code,
  })
  assert.equal(amountInWords(205, 'USD', { lang: 'xx' }), '#2us+#5cs')
})

// ── Dates ────────────────────────────────────────────────────────────────────

test('ISO calendar dates', () => {
  assert.equal(addDays('2024-02-28', 1), '2024-02-29')
  assert.equal(addDays('2026-12-31', 1), '2027-01-01')
  assert.equal(addDays('2026-03-01', -1), '2026-02-28')
  assert.ok(!isIsoDate('2026-02-30'))
  assert.ok(!isIsoDate('27/09/2026'))
  assert.equal(dueDateFromTerms(TODAY, 14), '2026-10-11')
  assert.equal(dueDateFromTerms(TODAY, null), null)
  assert.equal(daysBetween('2026-09-27', '2026-10-11'), 14)
  assert.equal(createDocument('quotation', { now: NOW }).validUntil, '2026-10-27')
  assert.equal(createDocument('invoice', { now: NOW }).dueDate, '2026-10-11')
})

// ── Serialization and share links ────────────────────────────────────────────

test('serialize strips computed fields; deserialize migrates and validates', () => {
  const doc = { ...pricedDoc('invoice'), totals: { total: 1 }, _ui: { open: true } }
  doc.lines = doc.lines.map((l) => ({ ...l, computed: { gross: 1 } }))
  const json = serializeDocument(doc)
  const parsed = JSON.parse(json)
  assert.equal(parsed.schemaVersion, 1)
  assert.ok(!('totals' in parsed) && !('_ui' in parsed) && !('computed' in parsed.lines[0]))

  const back = deserializeDocument(json)
  assert.ok(back.ok)
  assert.equal(serializeDocument(back.document), json)

  const legacy = { ...parsed }
  delete legacy.schemaVersion
  assert.ok(migrate(legacy).ok)
  assert.equal(deserializeDocument({ ...parsed, schemaVersion: 99 }).error.code, 'unsupported_schema_version')
  assert.equal(deserializeDocument('{oops').error.code, 'invalid_json')
  assert.equal(deserializeDocument({ ...parsed, type: 'bogus' }).error.code, 'unknown_document_type')

  const polluted = deserializeDocument('{"type":"invoice","__proto__":{"polluted":1},"seller":{"__proto__":{"polluted":1},"name":"x"}}')
  assert.ok(polluted.ok)
  assert.equal({}.polluted, undefined)
  assert.equal(polluted.document.polluted, undefined)
})

test('share link round-trips to the identical serialized document', async () => {
  const doc = pricedDoc('quotation', { notes: 'Thanks — ünïcödé ✓ 中文 العربية', deposit: { kind: 'percent', value: pct(25), paidAmount_minor: 0, paidDate: null, method: '' } })
  const original = serializeDocument(doc)
  for (const [encodePure, decodePure] of [[false, false], [true, true], [false, true], [true, false]]) {
    const link = await encodeForShareLink(doc, { pureJs: encodePure })
    assert.ok(link.ok, 'encoded')
    assert.match(link.value, /^1[A-Za-z0-9_-]+$/)
    const back = await decodeShareLink(link.value, { pureJs: decodePure })
    assert.ok(back.ok, 'decoded')
    assert.equal(serializeDocument(back.document), original)
  }
})

test('share link: length cap, damaged and hostile input', async () => {
  const big = pricedDoc('invoice', { lines: Array.from({ length: 400 }, (_, i) => line(`l${i}`, i * 37 + 1, 1000, { description: `Line ${i} ${Math.sin(i).toString(36)} ${Math.cos(i * 7).toString(36)}` })) })
  const tooLong = await encodeForShareLink(big)
  assert.equal(tooLong.ok, false)
  assert.equal(tooLong.error.code, 'share_link_too_long')
  assert.equal((await encodeForShareLink(pricedDoc('invoice'), { maxLength: 50 })).error.code, 'share_link_too_long')

  for (const bad of ['', '1', '1!!!', '1AAAA', '2abc', 'x'.repeat(9000)]) {
    const result = await decodeShareLink(bad)
    assert.equal(result.ok, false, JSON.stringify(bad.slice(0, 10)))
  }
  const bomb = '1' + deflateRawSync(Buffer.alloc(SHARE_LINK_MAX_JSON_BYTES + 10, 32)).toString('base64url')
  assert.ok(bomb.length < 8000)
  for (const pureJs of [false, true]) {
    const result = await decodeShareLink(bomb, { pureJs })
    assert.equal(result.ok, false)
    assert.equal(result.error.code, 'share_link_invalid')
  }
})

test('pure-JS deflate/inflate interoperate with zlib', () => {
  const samples = [
    new Uint8Array(0),
    new TextEncoder().encode('a'),
    new TextEncoder().encode(JSON.stringify(pricedDoc('invoice')).repeat(20)),
    Uint8Array.from({ length: 70000 }, (_, i) => (i * 7919) % 251),
    Uint8Array.from({ length: 5000 }, (_, i) => (i % 3 === 0 ? 0 : (i * 31) & 255)),
  ]
  let seed = 12345
  samples.push(Uint8Array.from({ length: 20000 }, () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed & 255 }))
  for (const bytes of samples) {
    assert.deepEqual(new Uint8Array(inflateRawSync(deflateRaw(bytes))), bytes)
    assert.deepEqual(inflateRaw(new Uint8Array(deflateRawSync(bytes))), bytes)
    assert.deepEqual(inflateRaw(new Uint8Array(deflateRawSync(bytes, { level: 0 }))), bytes)
  }
  assert.throws(() => inflateRaw(new Uint8Array(deflateRawSync(Buffer.alloc(5000))), { maxOutput: 1000 }))
  assert.throws(() => inflateRaw(Uint8Array.from([0xff, 0xff, 0xff])))
})

// ── State ────────────────────────────────────────────────────────────────────

test('useDocumentStudio derives totals, issues and words (server render)', async () => {
  const { createElement } = await import('react')
  const { renderToString } = await import('react-dom/server')
  const { useDocumentStudio } = await import('../src/tools/docs-studio/state/useDocumentStudio.js')
  const doc = makeDoc('invoice', { currency: 'INR', taxes: [tax('gst', 18)], lines: [line('a', 100000, 1000, { taxIds: ['gst'] })] })
  doc.options = { ...doc.options, wordsSystem: 'indian' }
  let studio
  function Probe() {
    studio = useDocumentStudio(doc)
    return null
  }
  renderToString(createElement(Probe))
  assert.equal(studio.totals.total, 118000)
  assert.equal(studio.amountInWords, 'One Thousand One Hundred Eighty Rupees')
  assert.deepEqual(studio.issues.filter((i) => i.severity === 'error'), [])
  assert.equal(studio.isPreviewStale, false)
  assert.equal(typeof studio.actions.addLine, 'function')
})

// ── Reducer ──────────────────────────────────────────────────────────────────

test('documentReducer: lines, taxes, currency, guarded paths', () => {
  let state = makeDoc('invoice', { lines: [] })
  const frozen = JSON.stringify(state)
  state = documentReducer(state, documentActions.addLine({ id: 'l1', description: 'Design', unitPrice_minor: 1234 }))
  state = documentReducer(state, documentActions.addLine({ id: 'l2', description: 'Build' }))
  state = documentReducer(state, documentActions.addTax({ id: 'vat', name: 'VAT', rate_micro: pct(20) }))
  state = documentReducer(state, documentActions.toggleLineTax('l1', 'vat'))
  state = documentReducer(state, documentActions.setShipping({ amount_minor: 500, taxIds: ['vat'] }))
  state = documentReducer(state, documentActions.updateLine('l2', { qty_milli: 2500, id: 'hijack' }))
  state = documentReducer(state, documentActions.duplicateLine('l1'))
  state = documentReducer(state, documentActions.moveLine('l2', 0))
  assert.deepEqual(state.lines.map((l) => l.id).slice(0, 2), ['l2', 'l1'])
  assert.equal(state.lines.length, 3)
  assert.equal(state.lines[0].qty_milli, 2500)
  assert.deepEqual(state.lines[1].taxIds, ['vat'])
  assert.equal(JSON.stringify(makeDoc('invoice', { lines: [] })), frozen) // inputs untouched

  state = documentReducer(state, documentActions.removeTax('vat'))
  assert.deepEqual([state.taxes, state.lines[1].taxIds, state.shipping.taxIds], [[], [], []])

  state = documentReducer(state, documentActions.setCurrency('JPY'))
  assert.equal(state.currency, 'JPY')
  assert.equal(state.lines[1].unitPrice_minor, 12)

  state = documentReducer(state, documentActions.set('seller.name', 'New Name'))
  assert.equal(state.seller.name, 'New Name')
  for (const path of ['__proto__.polluted', 'seller.__proto__.x', 'lines', 'id', 'type', 'constructor']) {
    assert.equal(documentReducer(state, documentActions.set(path, 'x')), state, path)
  }
  assert.equal({}.polluted, undefined)
  state = documentReducer(state, documentActions.setOption('taxMode', 'sideways'))
  assert.equal(state.options.taxMode, 'exclusive')
  state = documentReducer(state, documentActions.removeLine('l2'))
  assert.equal(state.lines.length, 2)
  assert.equal(documentReducer(state, { type: 'unknown' }), state)
})
