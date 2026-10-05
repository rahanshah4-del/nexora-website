import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AUTOMATION_SEQUENCES, automationKey, dayDiff, normalizeAutomationConfig, selectCandidates, toDate } from '../functions/marketingAutomationLogic.js'

const NOW = new Date('2026-10-05T07:00:00Z') // 12:00 PKT, Monday
const days = (n) => new Date(NOW.getTime() + n * 86400000)
const pick = (id, data) => selectCandidates(id, { now: NOW, ...data }).map((c) => c.email)

test('toDate understands Timestamps, ISO strings, millis and junk', () => {
  assert.equal(toDate({ toDate: () => NOW }).getTime(), NOW.getTime())
  assert.equal(toDate({ seconds: 1759647600 }).getTime(), 1759647600000)
  assert.equal(toDate('2026-10-05T07:00:00Z').getTime(), NOW.getTime())
  assert.equal(toDate(NOW.getTime()).getTime(), NOW.getTime())
  assert.equal(toDate('not a date'), null)
  assert.equal(toDate(null), null)
})

test('dayDiff counts calendar days in Pakistan time, not 24h blocks', () => {
  assert.equal(dayDiff(new Date('2026-10-05T20:00:00Z'), new Date('2026-10-05T10:00:00Z')), 1) // 01:00 PKT next day vs 15:00 PKT
  assert.equal(dayDiff(new Date('2026-10-05T10:00:00Z'), new Date('2026-10-05T01:00:00Z')), 0)
  assert.equal(dayDiff(days(7), NOW), 7)
  assert.equal(dayDiff(days(-3), NOW), -3)
})

test('automationKey is stable per sequence and person, case-insensitive', () => {
  assert.equal(automationKey('welcome', 'A@X.com'), automationKey('welcome', ' a@x.com '))
  assert.notEqual(automationKey('welcome', 'a@x.com'), automationKey('trial_1_day', 'a@x.com'))
  assert.match(automationKey('welcome', 'a@x.com'), /^welcome__[0-9a-f]{24}$/)
})

test('welcome: only accounts created in the last 2 days, with the person first name from users', () => {
  const workspaces = [
    { email: 'new@x.com', createdAt: days(-1), name: "Ali's Workspace" },
    { email: 'today@x.com', createdAt: days(0) },
    { email: 'old@x.com', createdAt: days(-3) },
    { email: 'blocked@x.com', createdAt: days(-1), blocked: true },
    { email: 'admin@nexora.com', createdAt: days(-1) },
    { name: 'no email', createdAt: days(-1) },
  ]
  const users = [{ email: 'new@x.com', fullName: 'Ali Raza' }]
  const out = selectCandidates('welcome', { now: NOW, workspaces, users })
  assert.deepEqual(out.map((c) => c.email).sort(), ['new@x.com', 'today@x.com'])
  assert.equal(out.find((c) => c.email === 'new@x.com').name, 'Ali')
  assert.equal(out.find((c) => c.email === 'today@x.com').name, '')
})

test('candidates carry the account (workspace) id so the admin can see who got what', () => {
  const out = selectCandidates('welcome', { now: NOW, workspaces: [{ id: 'uid123', email: 'a@x.com', createdAt: days(-1) }] })
  assert.deepEqual(out, [{ email: 'a@x.com', name: '', accountId: 'uid123' }])
})

test('trial reminders fire on exactly 7, 3 and 1 days left, never for paying clients', () => {
  const trial = (email, left, extra = {}) => ({ email, trialEndsAt: days(left), subscriptionStatus: 'trial', ...extra })
  const workspaces = [trial('d7@x.com', 7), trial('d3@x.com', 3), trial('d1@x.com', 1), trial('d5@x.com', 5), trial('paid3@x.com', 3, { subscriptionStatus: 'active' })]
  assert.deepEqual(pick('trial_7_days', { workspaces }), ['d7@x.com'])
  assert.deepEqual(pick('trial_3_days', { workspaces }), ['d3@x.com'])
  assert.deepEqual(pick('trial_1_day', { workspaces }), ['d1@x.com'])
})

test('trial ended: 1 to 3 days after, unpaid only (so enabling it cannot mail old expired accounts)', () => {
  const workspaces = [
    { email: 'e1@x.com', trialEndsAt: days(-1), subscriptionStatus: 'expired' },
    { email: 'e3@x.com', trialEndsAt: days(-3), subscriptionStatus: 'expired' },
    { email: 'e4@x.com', trialEndsAt: days(-4), subscriptionStatus: 'expired' },
    { email: 'e60@x.com', trialEndsAt: days(-60), subscriptionStatus: 'expired' },
    { email: 'upgraded@x.com', trialEndsAt: days(-2), subscriptionStatus: 'active' },
    { email: 'still@x.com', trialEndsAt: days(2), subscriptionStatus: 'trial' },
  ]
  assert.deepEqual(pick('trial_ended', { workspaces }).sort(), ['e1@x.com', 'e3@x.com'])
})

test('lead follow-up: contact-form leads with an email, 1 to 4 days old, still "new"', () => {
  const leads = [
    { email: 'l2@x.com', createdAt: days(-2), status: 'new', name: 'Sara Khan' },
    { email: 'same-day@x.com', createdAt: days(0), status: 'new' },
    { email: 'old@x.com', createdAt: days(-9), status: 'new' },
    { email: 'called@x.com', createdAt: days(-2), status: 'contacted' },
    { createdAt: days(-2), status: 'new', name: 'no email' },
  ]
  const out = selectCandidates('lead_followup', { now: NOW, leads })
  assert.deepEqual(out, [{ email: 'l2@x.com', name: 'Sara', accountId: '' }])
  assert.equal(selectCandidates('lead_followup', { now: NOW, leads: [{ id: 'lead77', email: 'z@x.com', createdAt: days(-2), status: 'new' }] })[0].accountId, 'lead77')
})

test('unsubscribed people and duplicates are dropped; one run is capped', () => {
  const workspaces = [{ email: 'a@x.com', createdAt: days(-1) }, { email: 'A@x.com', createdAt: days(-1) }, { email: 'b@x.com', createdAt: days(-1) }]
  assert.deepEqual(pick('welcome', { workspaces, unsubscribed: new Set(['b@x.com']) }), ['a@x.com'])
  const many = Array.from({ length: 100 }, (_, i) => ({ email: `u${i}@x.com`, createdAt: days(-1) }))
  assert.equal(pick('welcome', { workspaces: many }).length, 40)
})

test('config always lists every sequence and defaults to OFF', () => {
  const config = normalizeAutomationConfig({ welcome: { enabled: true } })
  assert.deepEqual(Object.keys(config), AUTOMATION_SEQUENCES.map((s) => s.id))
  assert.equal(config.welcome.enabled, true)
  assert.equal(config.trial_1_day.enabled, false)
  assert.equal(normalizeAutomationConfig().welcome.enabled, false)
})
