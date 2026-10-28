import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildMessage, buildPushData, copyFor, inPushWindow, isDeadTokenError, isValidToken, matchesSegment,
  normalizeCampaign, pktWeekKey, pushSendKey, safePushUrl, selectPushTargets, tokenDocId, usableTokens,
} from '../functions/pushLogic.js'

const NOW = new Date('2026-10-05T07:00:00Z') // 12:00 PKT Monday
const days = (n) => new Date(NOW.getTime() + n * 86400000)
const TOKEN = 'x'.repeat(150)
const tok = (uid, extra = {}) => ({ uid, token: TOKEN + uid, enabled: true, ...extra })

test('push window is 10:00-20:00 Pakistan time', () => {
  assert.equal(inPushWindow(new Date('2026-10-05T04:59:00Z')), false) // 09:59
  assert.equal(inPushWindow(new Date('2026-10-05T05:00:00Z')), true) // 10:00
  assert.equal(inPushWindow(new Date('2026-10-05T14:59:00Z')), true) // 19:59
  assert.equal(inPushWindow(new Date('2026-10-05T15:00:00Z')), false) // 20:00
})

test('token validation and ids', () => {
  assert.equal(isValidToken(TOKEN), true)
  assert.equal(isValidToken('short'), false)
  assert.equal(isValidToken(`${TOKEN} x`), false)
  assert.equal(tokenDocId('a'), tokenDocId(' a '))
  assert.notEqual(tokenDocId('a'), tokenDocId('b'))
})

test('urls stay on Nexora', () => {
  assert.equal(safePushUrl('/pricing'), '/pricing')
  assert.equal(safePushUrl('https://nexorasolution.us/pricing?x=1'), '/pricing?x=1')
  assert.equal(safePushUrl('https://evil.example/phish'), '/app/dashboard')
  assert.equal(safePushUrl('//evil.example'), '/app/dashboard')
  assert.equal(safePushUrl('javascript:alert(1)'), '/app/dashboard')
})

test('payload is trimmed and data-only', () => {
  const data = buildPushData({ title: 'a'.repeat(100), body: 'b'.repeat(300), url: 'https://x.test' })
  assert.equal(data.title.length, 65)
  assert.equal(data.body.length, 180)
  assert.equal(data.url, '/app/dashboard')
  const message = buildMessage(TOKEN, { title: 'T', body: 'B' })
  assert.equal(message.notification, undefined)
  assert.equal(message.token, TOKEN)
})

test('dead token errors are recognised', () => {
  assert.equal(isDeadTokenError('messaging/registration-token-not-registered'), true)
  assert.equal(isDeadTokenError('messaging/internal-error'), false)
})

test('per-device gap blocks a second push', () => {
  const tokens = [tok('a'), tok('b', { lastPushAt: new Date(NOW.getTime() - 3600000) }), tok('c', { enabled: false }), tok('d', { lastPushAt: new Date(NOW.getTime() - 30 * 3600000) })]
  assert.deepEqual(usableTokens(tokens, { now: NOW }).map((t) => t.uid), ['a', 'd'])
})

test('trial pushes go only to clients with a device, once, inside the window', () => {
  const workspaces = [
    { id: 'u1', ownerEmail: 'a@gmail.com', trialEndsAt: days(3), subscriptionStatus: 'trial' },
    { id: 'u2', ownerEmail: 'b@gmail.com', trialEndsAt: days(3), subscriptionStatus: 'trial' }, // no device
    { id: 'u3', ownerEmail: 'c@gmail.com', trialEndsAt: days(3), subscriptionStatus: 'active' }, // paying
  ]
  const tokens = [tok('u1'), tok('u3')]
  const targets = selectPushTargets('trial_3_days', { workspaces, tokens, now: NOW })
  assert.deepEqual(targets.map((t) => t.uid), ['u1'])
  assert.match(targets[0].copy.title, /3 days/)
  assert.deepEqual(selectPushTargets('trial_3_days', { workspaces, tokens, now: new Date('2026-10-05T16:00:00Z') }), []) // 21:00 PKT
})

test('module tips skip new, blocked and expired workspaces and rotate by count', () => {
  const workspaces = [
    { id: 'old', ownerEmail: 'a@gmail.com', createdAt: days(-30), subscriptionStatus: 'active', businessType: 'Retail POS' },
    { id: 'new', ownerEmail: 'b@gmail.com', createdAt: days(-1), subscriptionStatus: 'active' },
    { id: 'gone', ownerEmail: 'c@gmail.com', createdAt: days(-30), blocked: true },
    { id: 'exp', ownerEmail: 'd@gmail.com', createdAt: days(-60), trialEndsAt: days(-10), subscriptionStatus: 'trial' },
  ]
  const tokens = workspaces.map((w) => tok(w.id))
  const targets = selectPushTargets('module_tip', { workspaces, tokens, now: NOW })
  assert.deepEqual(targets.map((t) => t.uid), ['old'])
  assert.equal(copyFor('module_tip', { businessType: 'Retail POS' }, 0).title, 'Check low stock before the rush')
  assert.notEqual(copyFor('module_tip', { businessType: 'Retail POS' }, 1).title, copyFor('module_tip', { businessType: 'Retail POS' }, 0).title)
})

test('send keys: lifecycle once, tips once per week', () => {
  assert.equal(pushSendKey('trial_3_days', 'u1', NOW), pushSendKey('trial_3_days', 'u1', days(10)))
  assert.equal(pushSendKey('module_tip', 'u1', NOW), pushSendKey('module_tip', 'u1', days(1)))
  assert.notEqual(pushSendKey('module_tip', 'u1', NOW), pushSendKey('module_tip', 'u1', days(8)))
  assert.match(pktWeekKey(NOW), /^2026-W4\d$/)
})

test('campaign segments', () => {
  const trial = { trialEndsAt: days(2), subscriptionStatus: 'trial' }
  const expired = { trialEndsAt: days(-2), subscriptionStatus: 'trial' }
  const paid = { subscriptionStatus: 'active', businessType: 'School ERP' }
  assert.equal(matchesSegment(trial, 'trial', NOW), true)
  assert.equal(matchesSegment(expired, 'trial', NOW), false)
  assert.equal(matchesSegment(expired, 'expired', NOW), true)
  assert.equal(matchesSegment(paid, 'paid', NOW), true)
  assert.equal(matchesSegment(paid, 'module:school', NOW), true)
  assert.equal(matchesSegment(paid, 'module:retail', NOW), false)
  assert.equal(matchesSegment({ ...paid, blocked: true }, 'all', NOW), false)
})

test('campaign validation', () => {
  const keys = ['school', 'retail']
  assert.equal(normalizeCampaign({ title: '', body: 'x' }, keys).ok, false)
  assert.equal(normalizeCampaign({ title: 'x', body: 'y'.repeat(181) }, keys).ok, false)
  assert.equal(normalizeCampaign({ title: 'x', body: 'y', segment: 'module:nope' }, keys).ok, false)
  const ok = normalizeCampaign({ title: 'New', body: 'Hello', segment: 'module:school', url: 'https://evil.test' }, keys)
  assert.equal(ok.ok, true)
  assert.equal(ok.value.url, '/app/dashboard')
})

import { paidPaymentAlert, workspacePaymentAlert } from '../functions/pushLogic.js'

test('workspace going past_due alerts admin and the client, once', () => {
  const before = { planStatus: 'active', name: 'Acme', ownerId: 'u1' }
  const after = { planStatus: 'past_due', name: 'Acme', ownerId: 'u1' }
  const alert = workspacePaymentAlert(before, after, 'w1')
  assert.equal(alert.ownerUid, 'u1')
  assert.match(alert.admin.body, /Acme/)
  assert.equal(alert.client.url, '/app/subscriptions')
  assert.equal(workspacePaymentAlert(after, { ...after, name: 'Acme 2' }, 'w1'), null) // unrelated edit
})

test('cancellation alerts admin only, and not twice', () => {
  const alert = workspacePaymentAlert({ planStatus: 'active' }, { planStatus: 'canceled', ownerEmail: 'a@x.com' }, 'w1')
  assert.ok(alert.admin)
  assert.equal(alert.client, undefined)
  assert.equal(workspacePaymentAlert({ planStatus: 'expired' }, { planStatus: 'canceled' }, 'w1'), null)
  assert.equal(workspacePaymentAlert({ planStatus: 'active' }, { planStatus: 'active' }, 'w1'), null)
})

test('paid payment alerts only on the change, and never for zero-amount trial orders', () => {
  const paid = { status: 'paid', amount: 12, currency: 'USD', clientEmail: 'a@x.com', plan: 'basic' }
  assert.match(paidPaymentAlert(undefined, paid).title, /USD 12.00/)
  assert.equal(paidPaymentAlert(paid, paid), null)
  assert.equal(paidPaymentAlert(undefined, { ...paid, amount: 0 }), null)
  assert.equal(paidPaymentAlert(undefined, { ...paid, status: 'refunded' }), null)
})
