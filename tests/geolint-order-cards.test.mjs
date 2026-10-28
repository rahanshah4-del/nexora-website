import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nextAction, orderTotals, relativeTime } from '../src/lib/geolintFix.js'

test('relative time', () => {
  const now = new Date('2026-10-28T12:00:00Z').getTime()
  assert.equal(relativeTime('2026-10-28T11:59:40Z', now), 'just now')
  assert.equal(relativeTime('2026-10-28T11:55:00Z', now), '5 min ago')
  assert.equal(relativeTime('2026-10-28T09:00:00Z', now), '3 h ago')
  assert.equal(relativeTime('2026-10-26T12:00:00Z', now), '2 d ago')
  assert.equal(relativeTime('nonsense', now), '-')
})

test('next action: unread messages first, then by status', () => {
  assert.equal(nextAction({ status: 'paid', unreadMessages: 2 }).tone, 'rose')
  assert.match(nextAction({ status: 'paid', unreadMessages: 1 }).text, /1 new message\)$/)
  assert.match(nextAction({ status: 'payment_submitted', unreadMessages: 0 }).text, /mark it paid/)
  assert.equal(nextAction({ status: 'completed' }).text, 'Done')
  assert.equal(nextAction({ status: 'cancelled' }).text, '')
  assert.equal(nextAction(null).text, '')
})

test('totals from per-status counts', () => {
  const t = orderTotals({ awaiting_payment: 2, payment_submitted: 1, paid: 1, in_progress: 3, completed: 4, refunded: 1 }, [{ unreadMessages: 2 }, { unreadMessages: 0 }])
  assert.deepEqual(t, { open: 7, payment: 1, working: 4, completed: 4, all: 12, unread: 2 })
  assert.deepEqual(orderTotals(), { open: 0, payment: 0, working: 0, completed: 0, all: 0, unread: 0 })
})

import { upsellInfo } from '../src/lib/geolintFix.js'
test('full SEO offer: only on a finished GEO order, tone follows the results', () => {
  const base = { plan: 'geo', status: 'completed', after: { scorePercent: 95 } }
  assert.equal(upsellInfo({ ...base, plan: 'seo' }), null)
  assert.equal(upsellInfo({ ...base, status: 'in_progress' }), null)
  assert.equal(upsellInfo({ plan: 'geo', status: 'completed' }), null)
  assert.equal(upsellInfo(base).mode, 'happy')
  assert.equal(upsellInfo({ ...base, after: { scorePercent: 80 } }).mode, 'improve')
  const crawl = { score: { indexable: 95 }, distribution: { excellent: 5, good: 10, fair: 3, poor: 2 } }
  assert.deepEqual(upsellInfo({ ...base, siteCrawl: crawl }), { mode: 'improve', pagesToImprove: 5, siteScore: 95 })
})
