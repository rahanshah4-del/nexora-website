import test from 'node:test'
import assert from 'node:assert/strict'
import { buildClientJourneys, clientJourney, journeySummary, MODULE_STATE, STAGE } from '../src/pages/admin/clientJourney.js'
import { buildTrafficStats } from '../src/pages/admin/trafficStats.js'

test('a client with no stored module is "not selected", never General CRM', () => {
  const j = clientJourney({}, { emailVerified: true })
  assert.equal(j.moduleState, MODULE_STATE.NOT_SELECTED)
  assert.equal(j.moduleLabel, '')
  assert.equal(j.stage, STAGE.NO_MODULE)
})

test('unverified account without a module reports the email stage first', () => {
  assert.equal(clientJourney({}, { emailVerified: false }).stage, STAGE.EMAIL_UNVERIFIED)
})

test('module chosen but onboarding not finished, then complete', () => {
  const user = { emailVerified: true }
  assert.equal(clientJourney({ businessType: 'Restaurant POS' }, user).stage, STAGE.SETUP_PENDING)
  const done = clientJourney({ businessType: 'Restaurant POS', onboardingCompleted: true }, user)
  assert.equal(done.stage, STAGE.COMPLETE)
  assert.equal(done.moduleLabel, 'Restaurant POS')
})

test('users are joined to their workspace and users without one are still listed', () => {
  const users = [{ uid: 'a', emailVerified: true }, { uid: 'b', emailVerified: true }]
  const workspaces = [{ id: 'a', businessType: 'Restaurant POS', onboardingCompleted: true }]
  const rows = buildClientJourneys(users, workspaces)
  assert.equal(rows.length, 2)
  assert.equal(rows.find((r) => r.key === 'a').stage, STAGE.COMPLETE)
  const summary = journeySummary(rows)
  assert.equal(summary.noModule, 1)
  assert.equal(summary.complete, 1)
})

test('traffic stats count page views, unique visitors and flag a capped window', () => {
  const now = Date.parse('2026-10-05T12:00:00')
  const ev = (type, visitor, page, extra = {}) => ({ eventType: type, visitorId: visitor, sessionId: `s_${visitor}`, page, createdAt: new Date(now - 60000), deviceType: 'mobile', ...extra })
  const events = [ev('page_view', 'v1', '/'), ev('page_view', 'v1', '/pricing'), ev('page_view', 'v2', '/', { referrer: 'https://www.google.com/' }), ev('signup_started', 'v2', '/signup')]
  const stats = buildTrafficStats(events, { now, limit: 4 })
  assert.equal(stats.pageViews, 3)
  assert.equal(stats.uniqueVisitors, 2)
  assert.equal(stats.topPages[0].label, '/')
  assert.ok(stats.referrers.some((r) => r.label === 'google.com' && r.count === 1))
  assert.equal(stats.dropOffs, 1)
  assert.equal(stats.capped, true)
  assert.equal(buildTrafficStats(events, { now, limit: 100 }).capped, false)
})

test('more than 100 events are all counted', () => {
  const now = Date.now()
  const events = Array.from({ length: 450 }, (_, i) => ({ eventType: 'page_view', visitorId: `v${i}`, sessionId: `s${i}`, page: '/', createdAt: new Date(now - 1000) }))
  assert.equal(buildTrafficStats(events, { now }).uniqueVisitors, 450)
})

test('in-app and admin page views are not counted as website traffic', () => {
  const now = Date.now()
  const ev = (page, v) => ({ eventType: 'page_view', visitorId: v, sessionId: `s${v}`, page, createdAt: new Date(now - 1000) })
  const stats = buildTrafficStats([ev('/', 'a'), ev('/pricing', 'b'), ev('/app/dashboard', 'c'), ev('/admin/control-centre', 'd')], { now })
  assert.equal(stats.pageViews, 2)
  assert.equal(stats.appViews, 2)
  assert.equal(stats.uniqueVisitors, 2)
  assert.ok(!stats.topPages.some((p) => p.label.startsWith('/app') || p.label.startsWith('/admin')))
})

test('signed-up accounts without a workspace become their own Clients rows', async () => {
  const { signupOnlyRows } = await import('../src/pages/admin/clientJourney.js')
  const users = [
    { uid: 'new1', email: 'a@x.com', emailVerified: true },
    { uid: 'staff1', workspaceId: 'ws9', emailVerified: true },
    { uid: 'adminUid', emailVerified: true },
    { uid: 'own', emailVerified: true },
  ]
  const workspaces = [{ id: 'own', businessType: 'Retail POS', onboardingCompleted: true }]
  const rows = signupOnlyRows(buildClientJourneys(users, workspaces), { isAdminUid: (u) => u === 'adminUid' })
  assert.deepEqual(rows.map((r) => r.uid), ['new1'])
  assert.equal(rows[0].signupOnly, true)
  assert.equal(rows[0].journey.stage, STAGE.NO_MODULE)
})
