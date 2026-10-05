import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isInternalAnalytics, withoutInternalAnalytics } from '../src/lib/analyticsExclusion.js'
import { ADMIN_UIDS } from '../src/lib/adminUids.js'
import { buildTrafficStats } from '../src/pages/admin/trafficStats.js'

const admin = ADMIN_UIDS[0]

test('admin uid and /admin pages are internal; clients and public pages are not', () => {
  assert.equal(isInternalAnalytics({ userId: admin, page: '/' }), true)
  assert.equal(isInternalAnalytics({ uid: admin }), true)
  assert.equal(isInternalAnalytics({ userId: 'client1', page: '/admin/control-centre' }), true)
  assert.equal(isInternalAnalytics({ page: '/admin' }), true)
  assert.equal(isInternalAnalytics({ userId: 'client1', page: '/app/dashboard' }), false)
  assert.equal(isInternalAnalytics({ page: '/administration-software' }), false)
  assert.equal(isInternalAnalytics({}), false)
})

test('filtering removes the admin rows and keeps everyone else, so traffic and clicks do not count them', () => {
  const now = Date.now()
  const rows = [
    { eventType: 'button_click', userId: admin, page: '/admin/control-centre', visitorId: 'a', createdAt: new Date(now) },
    { eventType: 'page_view', userId: admin, page: '/pricing/', visitorId: 'a', createdAt: new Date(now) },
    { eventType: 'page_view', page: '/pricing/', visitorId: 'v1', sessionId: 's1', createdAt: new Date(now) },
  ]
  const kept = withoutInternalAnalytics(rows)
  assert.equal(kept.length, 1)
  assert.equal(buildTrafficStats(kept, { now }).pageViews, 1)
})
