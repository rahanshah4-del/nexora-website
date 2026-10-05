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

import { isBotUserAgent } from '../src/lib/analyticsExclusion.js'

test('crawlers and headless browsers are not visitors; real browsers are', () => {
  assert.equal(isBotUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'), true)
  assert.equal(isBotUserAgent('Mozilla/5.0 HeadlessChrome/120.0 Safari/537.36'), true)
  assert.equal(isBotUserAgent('Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537.36 Chrome-Lighthouse'), true)
  assert.equal(isBotUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'), false)
  assert.equal(isBotUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36'), false)
  assert.equal(isBotUserAgent(''), false)
})
