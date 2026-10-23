import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildTempMailPageStats } from '../src/pages/admin/tempMailStats.js'

const now = new Date('2026-10-24T10:00:00').getTime()
const ev = (page, visitorId, extra = {}) => ({ eventType: 'page_view', page, visitorId, sessionId: `s_${visitorId}`, timestamp: new Date('2026-10-24T09:00:00').toISOString(), ...extra })

test('temp-mail page stats count only that page, uniquely, with devices and outside referrers', () => {
  const stats = buildTempMailPageStats([
    ev('/tools/temp-mail/', 'a', { deviceType: 'mobile', referrer: 'https://www.google.com/search' }),
    ev('/tools/temp-mail', 'a', { deviceType: 'mobile' }),
    ev('/tools/temp-mail/?source=pwa', 'b', { deviceType: 'desktop', referrer: 'https://nexorasolution.us/tools' }),
    ev('/tools/', 'c'),
    ev('/tools/temp-mailer-x', 'd'),
    { eventType: 'button_click', page: '/tools/temp-mail/', visitorId: 'e' },
  ], { now })
  assert.equal(stats.views, 3)
  assert.equal(stats.uniqueVisitors, 2)
  assert.equal(stats.visitorsToday, 2)
  assert.deepEqual(stats.referrers.map((r) => r.label).sort(), ['Direct / none', 'google.com'])
  assert.equal(stats.trend.at(-1).views, 3)
  assert.equal(stats.trend.length, 14)
})
