import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  defaultResolvedPlans,
  mergePlatformPlans,
  planPriceSentence,
  platformPlanDocsFromRest,
  resolvePlatformPlans,
  yearlyPrice,
} from '../src/lib/platformPlans.js'
import { SERVER_PLANS, resolveServerPlan, yearlyPrice as workerYearlyPrice } from '../workers/nexora-payments-api/src/planPricing.js'
import { getPlanCatalog } from '../src/crm/data/moduleAccess.js'

const byId = (plans) => Object.fromEntries(plans.map((plan) => [plan.id, plan]))

test('yearly = round(monthly × 12 × 0.8): 19,200 / 57,590', () => {
  assert.equal(yearlyPrice(2000), 19200)
  assert.equal(yearlyPrice(5999), 57590)
  assert.equal(yearlyPrice('custom'), 'custom')
  assert.equal(yearlyPrice(0), 0)
})

test('defaults: Basic 2,000, Standard 5,999, Enterprise custom, no strike-through', () => {
  const plans = byId(defaultResolvedPlans())
  assert.deepEqual([plans.basic.monthlyPrice, plans.basic.yearlyPrice], [2000, 19200])
  assert.deepEqual([plans.standard.monthlyPrice, plans.standard.yearlyPrice], [5999, 57590])
  assert.deepEqual([plans.enterprise.monthlyPrice, plans.enterprise.yearlyPrice], ['custom', 'custom'])
  for (const plan of Object.values(plans)) assert.equal(plan.originalPrice, undefined, plan.id)
})

test('defaults are used when no Firestore doc exists', () => {
  assert.deepEqual(resolvePlatformPlans([]), defaultResolvedPlans())
  assert.equal(mergePlatformPlans, resolvePlatformPlans)
})

test('Firestore doc overrides defaults; stored ×12 yearly is ignored; explicit override wins', () => {
  const plans = byId(resolvePlatformPlans([
    { id: 'basic', monthlyPrice: 2500, yearlyPrice: 30000, originalPrice: 2000 },
    { id: 'standard', price: 6500, yearlyPriceOverride: 60000 },
  ]))
  assert.deepEqual([plans.basic.monthlyPrice, plans.basic.yearlyPrice], [2500, 24000])
  assert.equal(plans.basic.originalPrice, undefined) // not higher than the price → no fake strike-through
  assert.deepEqual([plans.standard.monthlyPrice, plans.standard.yearlyPrice], [6500, 60000])
  assert.equal(plans.enterprise.monthlyPrice, 'custom')
})

test('site and payments worker give identical plan math', () => {
  for (const monthly of [1, 999, 2000, 2500, 5999, 12345, 'custom', 0]) {
    assert.equal(workerYearlyPrice(monthly), yearlyPrice(monthly), String(monthly))
  }
  const site = byId(defaultResolvedPlans())
  for (const id of ['basic', 'standard', 'enterprise']) {
    const worker = resolveServerPlan(id, null)
    assert.equal(worker.monthlyPrice, site[id].monthlyPrice, id)
    assert.equal(worker.yearlyPrice, site[id].yearlyPrice, id)
    assert.equal(SERVER_PLANS[id].yearlyPrice, site[id].yearlyPrice, id)
  }
  const docs = [
    { id: 'basic', monthlyPrice: 2500, yearlyPrice: 30000 },
    { id: 'standard', monthlyPrice: 6500, yearlyPriceOverride: 60000 },
  ]
  const resolved = byId(resolvePlatformPlans(docs))
  for (const doc of docs) {
    const worker = resolveServerPlan(doc.id, doc)
    assert.equal(worker.monthlyPrice, resolved[doc.id].monthlyPrice, doc.id)
    assert.equal(worker.yearlyPrice, resolved[doc.id].yearlyPrice, doc.id)
  }
})

test('the worker uses resolveServerPlan for checkout pricing', () => {
  const source = readFileSync(new URL('../workers/nexora-payments-api/src/index.js', import.meta.url), 'utf8')
  assert.match(source, /import \{ SERVER_PLANS, resolveServerPlan \} from '\.\/planPricing\.js'/)
  assert.match(source, /const plan = resolveServerPlan\(planId, storedPlan\)/)
  assert.doesNotMatch(source, /2999/)
})

test('FAQ/SEO sentence has live prices and no discount claim', () => {
  const sentence = planPriceSentence()
  assert.equal(sentence, 'Plans start at PKR 2,000/month (Basic) and PKR 5,999/month (Standard); Enterprise is custom-priced.')
  assert.doesNotMatch(sentence, /50%|off/i)
})

test('Firestore REST response decodes into plan docs', () => {
  const json = {
    documents: [
      {
        name: 'projects/nexora-business-suite/databases/(default)/documents/platformPlans/basic',
        fields: {
          monthlyPrice: { integerValue: '2200' },
          currency: { stringValue: 'PKR' },
          enabled: { booleanValue: true },
          features: { arrayValue: { values: [{ stringValue: 'One module' }] } },
          yearlyPriceOverride: { nullValue: null },
        },
      },
      { name: '.../platformPlans/enterprise', fields: { monthlyPrice: { stringValue: 'custom' } } },
    ],
  }
  const docs = platformPlanDocsFromRest(json)
  assert.deepEqual(docs[0], { id: 'basic', monthlyPrice: 2200, currency: 'PKR', enabled: true, features: ['One module'], yearlyPriceOverride: null })
  assert.equal(byId(resolvePlatformPlans(docs)).basic.yearlyPrice, yearlyPrice(2200))
  assert.deepEqual(platformPlanDocsFromRest({}), [])
})

test('in-app plan catalog prices come from the shared defaults', () => {
  const catalog = Object.fromEntries(getPlanCatalog().map((plan) => [plan.id, plan]))
  assert.deepEqual([catalog.Basic.monthlyPkr, catalog.Basic.priceLabel], [2000, 'PKR 2,000/month'])
  assert.deepEqual([catalog.Standard.monthlyPkr, catalog.Standard.priceLabel], [5999, 'PKR 5,999/month'])
  assert.equal(catalog.Enterprise.priceLabel, 'Custom Pricing')
})
