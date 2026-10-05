import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  applyEmailEvent, batchForRun, estimatedDays, inSendWindow, isTrackedEvent, normalizeEmailSettings,
  pktDateKey, remainingQuota, signSvix, unsubscribeToken, unsubscribeUrl, verifySvixSignature, verifyUnsubscribeToken,
} from '../functions/marketingEmailLogic.js'

const settings = normalizeEmailSettings({ dailyLimit: 50, windowStartHour: 9, windowEndHour: 21 })

test('settings: defaults, clamping and bad input', () => {
  assert.deepEqual(normalizeEmailSettings({}), { dailyLimit: 50, windowStartHour: 9, windowEndHour: 21, paused: false })
  assert.equal(normalizeEmailSettings({ dailyLimit: 99999 }).dailyLimit, 500)
  assert.equal(normalizeEmailSettings({ dailyLimit: 0 }).dailyLimit, 50)
  assert.equal(normalizeEmailSettings({ dailyLimit: 'abc' }).dailyLimit, 50)
  assert.equal(normalizeEmailSettings({ windowStartHour: 20, windowEndHour: 10 }).windowEndHour, 21) // end must be after start
  assert.equal(normalizeEmailSettings({ paused: true }).paused, true)
})

test('quota day and window use Pakistan time (UTC+5), not UTC', () => {
  assert.equal(pktDateKey(new Date('2026-10-05T20:30:00Z')), '2026-10-06') // 01:30 PKT next day
  assert.equal(pktDateKey(new Date('2026-10-05T18:59:00Z')), '2026-10-05') // 23:59 PKT
  assert.equal(inSendWindow(new Date('2026-10-05T04:00:00Z'), settings), true) // 09:00 PKT
  assert.equal(inSendWindow(new Date('2026-10-05T03:59:00Z'), settings), false) // 08:59 PKT
  assert.equal(inSendWindow(new Date('2026-10-05T15:59:00Z'), settings), true) // 20:59 PKT
  assert.equal(inSendWindow(new Date('2026-10-05T16:00:00Z'), settings), false) // 21:00 PKT
})

test('quota: never goes below zero and paces each run', () => {
  assert.equal(remainingQuota(settings, 0), 50)
  assert.equal(remainingQuota(settings, 49), 1)
  assert.equal(remainingQuota(settings, 50), 0)
  assert.equal(remainingQuota(settings, 80), 0)
  assert.equal(batchForRun(settings, 0), 10)
  assert.equal(batchForRun(settings, 46), 4)
  assert.equal(batchForRun(settings, 50), 0)
  assert.equal(estimatedDays(120, settings), 3)
  assert.equal(estimatedDays(0, settings), 0)
})

test('svix signature: valid passes; tampered body, wrong secret, old timestamp and missing parts fail', () => {
  const secret = 'whsec_' + Buffer.from('super-secret-key-for-test').toString('base64')
  const id = 'msg_123'
  const now = Date.now()
  const timestamp = String(Math.floor(now / 1000))
  const rawBody = JSON.stringify({ type: 'email.opened', data: { x: 1 } })
  const signature = signSvix({ secret, id, timestamp, rawBody })
  assert.equal(verifySvixSignature({ secret, id, timestamp, signature, rawBody, now }).ok, true)
  assert.equal(verifySvixSignature({ secret, id, timestamp, signature: `v1,bogus ${signature}`, rawBody, now }).ok, true) // rotated secrets: any match
  assert.equal(verifySvixSignature({ secret, id, timestamp, signature, rawBody: rawBody + ' ', now }).ok, false)
  assert.equal(verifySvixSignature({ secret: 'whsec_' + Buffer.from('other').toString('base64'), id, timestamp, signature, rawBody, now }).ok, false)
  assert.equal(verifySvixSignature({ secret, id, timestamp, signature, rawBody, now: now + 6 * 60 * 1000 }).reason, 'timestamp')
  assert.equal(verifySvixSignature({ secret: '', id, timestamp, signature, rawBody, now }).reason, 'missing')
  assert.equal(verifySvixSignature({ secret, id, timestamp: '', signature, rawBody, now }).reason, 'missing')
})

test('events: delivered -> opened -> clicked advance status and count each campaign metric once', () => {
  let log = { status: 'sent' }
  const run = (type, extra = {}, eventId = '') => {
    const result = applyEmailEvent(log, { type, created_at: '2026-10-05T10:00:00Z', data: extra }, { eventId })
    log = { ...log, ...result.patch }
    return result
  }
  assert.deepEqual(run('email.delivered').campaignInc, { deliveredCount: 1 })
  assert.equal(log.status, 'delivered')
  assert.deepEqual(run('email.opened').campaignInc, { openedCount: 1 })
  assert.deepEqual(run('email.opened').campaignInc, {}) // second open: counted per email only once
  assert.equal(log.openCount, 2)
  assert.deepEqual(run('email.clicked', { click: { link: 'https://nexorasolution.online/pricing' } }).campaignInc, { clickedCount: 1 })
  assert.equal(log.status, 'clicked')
  assert.equal(log.lastClickUrl, 'https://nexorasolution.online/pricing')
  assert.deepEqual(run('email.delivered').campaignInc, {}) // late/duplicate delivered changes nothing
  assert.equal(log.status, 'clicked') // never moves backwards
})

test('events: an open that arrives before delivered still ends up delivered+opened, counted once', () => {
  let log = { status: 'sent' }
  let r = applyEmailEvent(log, { type: 'email.opened', created_at: 'a' }); log = { ...log, ...r.patch }
  r = applyEmailEvent(log, { type: 'email.delivered', created_at: 'b' }); log = { ...log, ...r.patch }
  assert.equal(log.status, 'opened')
  assert.ok(log.deliveredAt && log.openedAt)
  assert.deepEqual(r.campaignInc, { deliveredCount: 1 })
})

test('events: hard bounce and complaint opt the address out; soft bounce does not; terminal states stick', () => {
  const hard = applyEmailEvent({ status: 'sent' }, { type: 'email.bounced', data: { bounce: { type: 'Permanent', message: 'no such user' } } })
  assert.equal(hard.patch.status, 'bounced')
  assert.equal(hard.optOut, true)
  assert.deepEqual(hard.campaignInc, { bouncedCount: 1 })
  const soft = applyEmailEvent({ status: 'sent' }, { type: 'email.bounced', data: { bounce: { type: 'Transient' } } })
  assert.equal(soft.optOut, false)
  const complaint = applyEmailEvent({ status: 'opened' }, { type: 'email.complained' })
  assert.equal(complaint.optOut, true)
  assert.equal(complaint.patch.status, 'complained')
  // an "opened" after a bounce must not resurrect the status
  const after = applyEmailEvent({ status: 'bounced' }, { type: 'email.opened' })
  assert.equal(after.patch.status, 'bounced')
})

test('events: duplicate webhook delivery (same svix id) and unknown types are ignored', () => {
  assert.equal(applyEmailEvent({ status: 'sent', eventIds: ['e1'] }, { type: 'email.opened' }, { eventId: 'e1' }), null)
  assert.equal(applyEmailEvent({ status: 'sent' }, { type: 'email.something_new' }), null)
  assert.equal(isTrackedEvent('email.clicked'), true)
  assert.equal(isTrackedEvent('domain.created'), false)
  const ids = Array.from({ length: 40 }, (_, i) => `e${i}`)
  assert.equal(applyEmailEvent({ status: 'sent', eventIds: ids }, { type: 'email.opened' }, { eventId: 'new' }).patch.eventIds.length, 30)
})

test('unsubscribe tokens: bound to the address, case-insensitive, unforgeable', () => {
  const secret = 'k'
  const token = unsubscribeToken('A@x.com', secret)
  assert.equal(verifyUnsubscribeToken('a@x.com', token, secret), true)
  assert.equal(verifyUnsubscribeToken('b@x.com', token, secret), false)
  assert.equal(verifyUnsubscribeToken('a@x.com', token, 'other'), false)
  assert.equal(verifyUnsubscribeToken('a@x.com', '', secret), false)
  assert.equal(verifyUnsubscribeToken('a@x.com', token, ''), false)
  const url = unsubscribeUrl('A@x.com', { base: 'https://h/u', secret })
  assert.match(url, /^https:\/\/h\/u\?e=a%40x\.com&t=/)
})
