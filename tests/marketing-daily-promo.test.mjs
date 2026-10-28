import test from 'node:test'
import assert from 'node:assert/strict'
import { DAILY_PROMO_LIMIT, PROMO_ROTATION, PROMO_TEMPLATE_IDS, promoTemplateFor, selectDailyPromo } from '../functions/marketingDailyPromo.js'
import { TEMPLATE_SPECS } from '../functions/marketingTemplateSpecs.js'

const NOW = new Date('2026-10-28T08:00:00Z')
const DAY = 24 * 60 * 60 * 1000
const modules = Object.keys(PROMO_ROTATION)
const make = (n) => Array.from({ length: n }, (_, i) => ({ email: `p${i}@x.com`, name: `P${i}`, moduleInterest: modules[i % modules.length], status: 'subscribed' }))

test('every rotation template exists', () => {
  PROMO_TEMPLATE_IDS.forEach((id) => assert.ok(TEMPLATE_SPECS.some((spec) => spec.id === id), id))
})

test('caps at 70 a day and mixes modules', () => {
  const picked = selectDailyPromo({ contacts: make(300), now: NOW })
  assert.equal(picked.length, DAILY_PROMO_LIMIT)
  assert.equal(new Set(picked.map((p) => p.module)).size, modules.length)
  assert.equal(new Set(picked.map((p) => p.email)).size, 70)
})

test('first email is the module promotion', () => {
  const [p] = selectDailyPromo({ contacts: [{ email: 'a@x.com', moduleInterest: 'restaurant', status: 'subscribed' }], now: NOW })
  assert.equal(p.templateId, 'restaurant_promo')
})

test('skips unsubscribed, opted out and people inside the 7-day cooldown', () => {
  const contacts = [
    { email: 'a@x.com', status: 'unsubscribed' },
    { email: 'b@x.com', status: 'subscribed', optedOut: true },
    { email: 'c@x.com', status: 'subscribed' },
    { email: 'd@x.com', status: 'subscribed' },
    { email: 'e@x.com', status: 'subscribed' },
  ]
  const history = new Map([
    ['c@x.com', { count: 1, lastSentAt: new Date(NOW.getTime() - 3 * DAY) }],
    ['d@x.com', { count: 1, lastSentAt: new Date(NOW.getTime() - 8 * DAY) }],
  ])
  const picked = selectDailyPromo({ contacts, history, unsubscribed: new Set(['e@x.com']), now: NOW })
  assert.deepEqual(picked.map((p) => p.email), ['d@x.com'])
})

test('template rotates each time and never-emailed people go first', () => {
  assert.notEqual(promoTemplateFor('school', 0), promoTemplateFor('school', 1))
  assert.equal(promoTemplateFor('school', 3), promoTemplateFor('school', 0))
  const contacts = [{ email: 'old@x.com', status: 'subscribed' }, { email: 'new@x.com', status: 'subscribed' }]
  const history = new Map([['old@x.com', { count: 1, lastSentAt: new Date(NOW.getTime() - 10 * DAY) }]])
  const picked = selectDailyPromo({ contacts, history, now: NOW, limit: 1 })
  assert.equal(picked[0].email, 'new@x.com')
})

test('temp-mail, test and role addresses are skipped and Gmail goes first', () => {
  const contacts = [
    { email: 'x@yopmail.com', status: 'subscribed' },
    { email: 'y@mail.nexorasolution.us', status: 'subscribed' },
    { email: 'noreply@shop.com', status: 'subscribed' },
    { email: 'boss@company.pk', status: 'subscribed' },
    { email: 'ali@outlook.com', status: 'subscribed' },
    { email: 'sara@gmail.com', status: 'subscribed' },
  ]
  const picked = selectDailyPromo({ contacts, now: NOW })
  assert.deepEqual(picked.map((p) => p.email), ['sara@gmail.com', 'ali@outlook.com', 'boss@company.pk'])
})

test('the Cloud Functions copy of the disposable list matches the website list', async () => {
  const a = await import('../functions/disposableDomains.js')
  const b = await import('../src/lib/disposableDomains.js')
  assert.deepEqual(a.DISPOSABLE_EMAIL_DOMAINS, b.DISPOSABLE_EMAIL_DOMAINS)
  assert.deepEqual(a.OWN_TEMP_MAIL_DOMAINS, b.OWN_TEMP_MAIL_DOMAINS)
})
