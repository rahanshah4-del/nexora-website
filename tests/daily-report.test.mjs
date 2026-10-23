import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildDailyReport, change, pktDateLabel, rankTools, reportEmailHtml, summarizeTraffic, toolSlug, DAY_MS } from '../functions/dailyReportLogic.js'
import { pdfText, renderReportPdf } from '../functions/dailyReportPdf.js'

const NOW = Date.UTC(2026, 9, 24, 14, 0) // 19:00 PKT
const ev = (eventType, page, minutesAgo, extra = {}) => ({ eventType, page, timestamp: NOW - minutesAgo * 60000, visitorId: extra.v || `v${minutesAgo}`, sessionId: extra.s || `s${minutesAgo}`, ...extra })

export function sampleEvents() {
  const rows = []
  for (let i = 0; i < 40; i += 1) rows.push(ev('page_view', '/', i * 30, { v: `a${i % 25}`, referrer: i % 3 ? 'https://www.google.com/' : '', country: i % 2 ? 'Pakistan' : 'United States', deviceType: i % 4 ? 'mobile' : 'desktop', browser: 'Chrome' }))
  for (let i = 0; i < 12; i += 1) rows.push(ev('page_view', '/tools/temp-mail/', i * 50, { v: `t${i % 9}` }))
  for (let i = 0; i < 5; i += 1) rows.push(ev('page_view', '/tools/invoice-generator/', i * 70, { v: `n${i}` }))
  rows.push(ev('page_view', '/app/dashboard', 10))
  rows.push(ev('frontend_error_boundary', '/', 20, { buttonLabel: "Cannot read properties of undefined (reading 'default')" }))
  rows.push(ev('signup_started', '/signup', 30), ev('signup_started', '/signup', 31), ev('signup_started', '/signup', 32), ev('signup_completed', '/signup', 33))
  // the day before: more visitors, temp mail smaller
  for (let i = 0; i < 60; i += 1) rows.push(ev('page_view', '/', 24 * 60 + 10 + i * 20, { v: `p${i}` }))
  for (let i = 0; i < 4; i += 1) rows.push(ev('page_view', '/tools/temp-mail/', 24 * 60 + 30 + i * 40, { v: `pt${i}` }))
  return rows
}

export const sampleSentinel = {
  overall: 'healthy',
  lastRunAt: NOW - 120000,
  checks: [{ id: 'site_home', label: 'Homepage', group: 'Website', ok: true, ms: 120, history: [1, 1, 1, 0] }, { id: 'api_ai', label: 'AI gateway', group: 'API Workers', ok: true, slow: true, ms: 5200, history: [1, 1] }],
  incidents: [{ id: 'x', label: 'Payments API', group: 'API Workers', openedAt: NOW - 5 * 3600000, resolvedAt: NOW - 5 * 3600000 + 600000, lastError: 'HTTP 500' }],
  fixes: [{ at: NOW - 3600000, label: 'Pricing page', actions: ['Purged the Cloudflare cache'], recovered: true }],
  errors: [],
  tempMail: [{ date: '2026-10-23', created: 30, mail_received: 50 }, { date: '2026-10-24', created: 42, mail_received: 61, codes_found: 20, verdict_bot: 3 }],
}

test('helpers: tool slugs, change, Pakistan date', () => {
  assert.equal(toolSlug('/tools/temp-mail/'), 'temp-mail')
  assert.equal(toolSlug('/tools/'), '')
  assert.equal(toolSlug('/pricing'), '')
  assert.equal(change(150, 100), 50)
  assert.equal(change(5, 0), null)
  assert.equal(pktDateLabel(NOW), 'Saturday, 24 Oct 2026')
})

test('traffic excludes app/admin screens and groups errors', () => {
  const t = summarizeTraffic(sampleEvents().filter((r) => r.timestamp > NOW - DAY_MS))
  assert.equal(t.appViews, 1)
  assert.equal(t.pageViews, 57)
  assert.equal(t.frontendErrors[0].count, 1)
  assert.equal(t.hourly.reduce((a, b) => a + b, 0), 57)
  assert.ok(t.referrers.some((r) => r.label === 'google.com'), 'www. is stripped')
})

test('tools are ranked by visitors with yesterday for comparison', () => {
  const ranked = rankTools([{ slug: 'a', label: 'A', views: 5, visitors: 2 }, { slug: 'b', label: 'B', views: 3, visitors: 3 }], [{ slug: 'b', views: 1, visitors: 1 }, { slug: 'c', label: 'C', views: 2, visitors: 2 }])
  assert.deepEqual(ranked.map((t) => t.slug), ['b', 'a', 'c'])
  assert.equal(ranked[0].change, 200)
  assert.equal(ranked[2].visitors, 0)
})

test('the report finds the real problems and the best tool', () => {
  const report = buildDailyReport({ now: NOW, events: sampleEvents(), business: { pendingUpgrades: 2, openTickets: 0, newLeads: 1, pendingComments: 0 }, sentinel: sampleSentinel })
  assert.equal(report.bestTool.slug, 'temp-mail')
  assert.equal(report.status, 'attention', 'waiting upgrades are high priority')
  const titles = report.problems.map((p) => p.title).join(' | ')
  assert.match(titles, /upgrade request/)
  assert.match(titles, /browser error/)
  assert.match(titles, /Visitors down/)
  assert.match(titles, /signups are not finished/)
  assert.match(titles, /recovered/)
  assert.equal(report.problems[0].severity, 'high')
  assert.ok(report.highlights.some((h) => /Best tool: Temp Mail/.test(h)))
})

test('missing sources are reported, not shown as zeros', () => {
  const report = buildDailyReport({ now: NOW, events: [], business: null, sentinel: null, sources: { 'open tickets': false } })
  const titles = report.problems.map((p) => p.title).join(' | ')
  assert.match(titles, /System health data missing/)
  assert.match(titles, /Could not read open tickets/)
})

test('email HTML escapes text from visitors', () => {
  const report = buildDailyReport({ now: NOW, events: [ev('frontend_runtime_error', '/', 5, { buttonLabel: '<script>alert(1)</script>' })], sentinel: sampleSentinel })
  const html = reportEmailHtml(report)
  assert.ok(!html.includes('<script>'))
  assert.match(html, /NEXORA DAILY REPORT/)
})

test('the PDF renders (several pages) even with empty data and odd characters', async () => {
  const full = await renderReportPdf(buildDailyReport({ now: NOW, events: sampleEvents(), business: { newUsers: 3, pendingUpgrades: 1 }, sentinel: sampleSentinel }))
  assert.equal(full.subarray(0, 5).toString(), '%PDF-')
  assert.ok(full.length > 5000)
  assert.ok((full.toString('latin1').match(/\/Type \/Page\b/g) || []).length >= 4)
  const empty = await renderReportPdf(buildDailyReport({ now: NOW, events: [ev('frontend_runtime_error', '/x', 1, { buttonLabel: 'Fehler — “quoted” 🚨 خطا' })] }))
  assert.equal(empty.subarray(0, 5).toString(), '%PDF-')
  assert.equal(pdfText('a — “b” 🚨 خطا'), 'a - "b"  ')
})
