import test from 'node:test'
import assert from 'node:assert/strict'
import { convertPrice, formatPriceLabel, formatPlanPrice, getPlanConvertedAmount } from '../src/lib/multiCurrency.js'

// MultiCurrencyProvider holds `rates: null` until the exchange rates load. A
// non-PKR currency can be applied before that, and the formatters must then use
// the fallback table instead of throwing on `null[currency]` (which crashed the
// whole /pricing/ page into the "Application could not render" screen).

test('null rates use the fallback table, same as omitted rates', () => {
  assert.equal(convertPrice(2000, 'USD', null), convertPrice(2000, 'USD'))
  assert.equal(formatPriceLabel(2000, 'USD', null), formatPriceLabel(2000, 'USD'))
})

test('plan formatting does not throw with null rates', () => {
  const plan = { id: 'basic', planName: 'Basic', monthlyPrice: 2000, yearlyPrice: 19200 }
  assert.doesNotThrow(() => formatPlanPrice(plan, 'monthly', 'USD', null))
  assert.equal(formatPlanPrice(plan, 'monthly', 'USD', null), formatPlanPrice(plan, 'monthly', 'USD'))
  assert.equal(getPlanConvertedAmount(plan, 'monthly', 'USD', null), getPlanConvertedAmount(plan, 'monthly', 'USD'))
})

test('PKR and loaded rates are unchanged', () => {
  assert.equal(convertPrice(2000, 'PKR', null), 2000)
  assert.equal(convertPrice(2000, 'USD', { USD: 0.01 }), 20)
})
