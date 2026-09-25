/**
 * Restaurant POS tax model — whole-rupee rounding, per-order snapshot.
 *
 * Run: npm test   (node --test tests/*.test.mjs)
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildBillPrintTemplate,
  calculateRestaurantBill,
  restaurantChargeOptions,
  normalizeTaxRate,
  normalizeTaxLabel,
  DEFAULT_RESTAURANT_TAX_LABEL,
  RESTAURANT_TAX_LABEL_MAX,
} from '../src/crm/lib/restaurantPosCalculations.js'

/** A one-line cart whose netSubtotal is exactly `net`. */
function cartOf(net) {
  return [{ item: { id: 'x', name: 'Item', price: net }, qty: 1 }]
}

const GST_16 = { taxEnabled: true, taxRate: 16, taxLabel: 'GST' }

test('16% tax rounds to whole rupees per line', () => {
  const cases = [
    { net: 333, tax: 53, total: 386 },   // 53.28 → 53
    { net: 1010, tax: 162, total: 1172 }, // 161.6 → 162
    { net: 1000, tax: 160, total: 1160 },
    { net: 2525, tax: 404, total: 2929 },
  ]
  for (const { net, tax, total } of cases) {
    const bill = calculateRestaurantBill(cartOf(net), GST_16)
    assert.equal(bill.netSubtotal, net, `net ${net}`)
    assert.equal(bill.tax, tax, `tax for net ${net}`)
    assert.equal(bill.total, total, `total for net ${net}`)
    assert.equal(Number.isInteger(bill.tax), true)
  }
})

test('printed lines always add up to the printed total', () => {
  for (const net of [333, 1010, 1000, 2525]) {
    const bill = calculateRestaurantBill(cartOf(net), { ...GST_16, serviceRate: 5 })
    assert.equal(bill.netSubtotal + bill.serviceCharges + bill.tax, bill.total, `net ${net}`)
  }
})

test('service charge 5% + tax 16% on net 1000', () => {
  const bill = calculateRestaurantBill(cartOf(1000), { ...GST_16, serviceChargeEnabled: true, serviceRate: 5 })
  assert.equal(bill.serviceCharges, 50)
  assert.equal(bill.tax, 160)
  assert.equal(bill.total, 1210)
})

test('service charge is not part of the tax base', () => {
  // 1000 net, 5% service, 16% tax. Taxing net+service would give 168, not 160.
  const bill = calculateRestaurantBill(cartOf(1000), { ...GST_16, serviceRate: 5 })
  assert.equal(bill.tax, 160)
})

test('discount is applied before tax', () => {
  const bill = calculateRestaurantBill(cartOf(1100), { ...GST_16, discount: 100 })
  assert.equal(bill.netSubtotal, 1000)
  assert.equal(bill.tax, 160)
  assert.equal(bill.total, 1160)
})

test('tax disabled yields zero tax and a neutral snapshot', () => {
  const bill = calculateRestaurantBill(cartOf(1000), { taxEnabled: false, taxRate: 16, taxLabel: 'GST' })
  assert.equal(bill.tax, 0)
  assert.equal(bill.total, 1000)
  assert.equal(bill.taxRate, 0)
  assert.equal(bill.taxLabel, DEFAULT_RESTAURANT_TAX_LABEL)
})

test('no options at all bills tax-free (old orders, dashboard metrics)', () => {
  const bill = calculateRestaurantBill(cartOf(1000))
  assert.equal(bill.tax, 0)
  assert.equal(bill.serviceCharges, 0)
  assert.equal(bill.total, 1000)
  assert.equal(bill.taxRate, 0)
  assert.equal(bill.taxLabel, DEFAULT_RESTAURANT_TAX_LABEL)
})

test('the applied rate and label are snapshotted on the bill', () => {
  const bill = calculateRestaurantBill(cartOf(1000), { taxEnabled: true, taxRate: 16, taxLabel: 'PRA Sales Tax' })
  assert.equal(bill.taxRate, 16)
  assert.equal(bill.taxLabel, 'PRA Sales Tax')
})

test('an enabled tax at 0% charges nothing and keeps the default label', () => {
  const bill = calculateRestaurantBill(cartOf(1000), { taxEnabled: true, taxRate: 0, taxLabel: 'GST' })
  assert.equal(bill.tax, 0)
  assert.equal(bill.taxRate, 0)
  assert.equal(bill.taxLabel, DEFAULT_RESTAURANT_TAX_LABEL)
})

test('legacy callers that pass only a rate still bill tax', () => {
  // The pre-existing option names (`tax`, `serviceCharges`) with no enable flag.
  const bill = calculateRestaurantBill(cartOf(1000), { tax: 16, serviceCharges: 5 })
  assert.equal(bill.tax, 160)
  assert.equal(bill.serviceCharges, 50)
  assert.equal(bill.total, 1210)
})

test('normalizeTaxRate coerces and clamps to 0-100', () => {
  assert.equal(normalizeTaxRate('16'), 16)
  assert.equal(normalizeTaxRate(16.5), 16.5)
  assert.equal(normalizeTaxRate(-5), 0)
  assert.equal(normalizeTaxRate(250), 100)
  assert.equal(normalizeTaxRate('abc'), 0)
  assert.equal(normalizeTaxRate(undefined), 0)
  assert.equal(normalizeTaxRate(null), 0)
})

test('a string rate from settings bills identically to a number', () => {
  const fromString = calculateRestaurantBill(cartOf(333), { taxEnabled: true, taxRate: '16' })
  assert.equal(fromString.tax, 53)
  assert.equal(fromString.total, 386)
})

test('normalizeTaxLabel trims, caps length, and falls back', () => {
  assert.equal(normalizeTaxLabel('GST'), 'GST')
  assert.equal(normalizeTaxLabel('  PRA Sales Tax  '), 'PRA Sales Tax')
  assert.equal(normalizeTaxLabel(''), DEFAULT_RESTAURANT_TAX_LABEL)
  assert.equal(normalizeTaxLabel('   '), DEFAULT_RESTAURANT_TAX_LABEL)
  assert.equal(normalizeTaxLabel(undefined), DEFAULT_RESTAURANT_TAX_LABEL)
  assert.equal(normalizeTaxLabel('x'.repeat(50)).length, RESTAURANT_TAX_LABEL_MAX)
})

test('an unconfigured workspace resolves to tax off', () => {
  for (const settings of [undefined, {}, null]) {
    const options = restaurantChargeOptions(settings)
    assert.equal(options.taxEnabled, false)
    assert.equal(options.taxRate, 0)
    assert.equal(options.taxLabel, DEFAULT_RESTAURANT_TAX_LABEL)
    assert.equal(calculateRestaurantBill(cartOf(1000), options).total, 1000)
  }
})

test('restaurantChargeOptions maps the settings block', () => {
  const options = restaurantChargeOptions({
    enableTax: true,
    taxPercentage: '16',
    taxLabel: 'GST',
    enableServiceCharge: true,
    serviceChargePercentage: 5,
  })
  assert.deepEqual(options, {
    taxEnabled: true,
    taxRate: 16,
    taxLabel: 'GST',
    serviceChargeEnabled: true,
    serviceRate: 5,
  })
  const bill = calculateRestaurantBill(cartOf(1000), options)
  assert.equal(bill.tax, 160)
  assert.equal(bill.serviceCharges, 50)
  assert.equal(bill.total, 1210)
})

test('service charge keeps its existing default-on semantics', () => {
  // Undefined enableServiceCharge stays enabled (0% by default, so no charge).
  assert.equal(restaurantChargeOptions({}).serviceChargeEnabled, true)
  assert.equal(restaurantChargeOptions({ enableServiceCharge: false }).serviceChargeEnabled, false)
  const off = calculateRestaurantBill(cartOf(1000), restaurantChargeOptions({
    enableServiceCharge: false, serviceChargePercentage: 5,
  }))
  assert.equal(off.serviceCharges, 0)
})

/** The 58mm thermal text, which is what a counter printer actually receives. */
function receiptFor(totals) {
  return buildBillPrintTemplate({ rows: [], totals, paidAmount: totals.total })
}

test('the receipt prints the labelled tax line, not a hard-coded TAX', () => {
  const bill = calculateRestaurantBill(cartOf(1000), { taxEnabled: true, taxRate: 16, taxLabel: 'GST' })
  const receipt = receiptFor(bill)
  assert.match(receipt, /GST 16%/)
  assert.match(receipt, /GST 16% \.+ PKR 160/)
})

test('the receipt reprints the order snapshot, not current settings', () => {
  // Settings have since moved to 5% / "PRA Sales Tax"; the stored order must win.
  const stored = { subtotal: 1000, discount: 0, netSubtotal: 1000, serviceCharges: 0, tax: 160, total: 1160, taxRate: 16, taxLabel: 'GST' }
  const receipt = receiptFor(stored)
  assert.match(receipt, /GST 16%/)
  assert.doesNotMatch(receipt, /PRA/)
  assert.doesNotMatch(receipt, /5%/)
})

test('a long provincial label does not widen the receipt', () => {
  // lineLR pads every line to the same width, so the tax line must not run
  // longer than the SUBTOTAL line beside it — even at the 24-char label cap.
  for (const taxLabel of ['KPRA Sales Tax', 'x'.repeat(RESTAURANT_TAX_LABEL_MAX)]) {
    const totals = { subtotal: 100000, discount: 0, netSubtotal: 100000, serviceCharges: 0, tax: 16000, total: 116000, taxRate: 16, taxLabel }
    const lines = receiptFor(totals).split('\n')
    const subtotalLine = lines.find((line) => line.startsWith('SUBTOTAL'))
    const taxLine = lines.find((line) => line.includes('PKR 16,000'))
    assert.ok(taxLine, `tax line is present for "${taxLabel}"`)
    assert.ok(
      taxLine.length <= subtotalLine.length,
      `tax line (${taxLine.length}) is wider than subtotal (${subtotalLine.length}): ${taxLine}`,
    )
  }
})

test('an order with no tax prints no tax line at all', () => {
  const receipt = receiptFor(calculateRestaurantBill(cartOf(1000)))
  assert.doesNotMatch(receipt, /TAX/)
})

test('legacy orders with no snapshot fall back to a plain Tax line', () => {
  const receipt = receiptFor({ subtotal: 1000, discount: 0, serviceCharges: 0, tax: 160, total: 1160 })
  assert.match(receipt, /TAX \.+ PKR 160/)
})

test('a partially-saved settings block still resolves every key', () => {
  // useBusinessSettings merges snapshots shallowly, so restaurantPos can exist
  // without the newer keys.
  const options = restaurantChargeOptions({ serviceChargePercentage: 5 })
  assert.equal(options.taxEnabled, false)
  assert.equal(options.taxRate, 0)
  assert.equal(options.taxLabel, DEFAULT_RESTAURANT_TAX_LABEL)
})
