import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildFixBrief, compareScores, gscDelta, nearMisses, signed, statusInfo, validateOrderForm, NEXT_STATUSES, ADMIN_STATUSES, formatMoney, planPrice, planLabel, safeNext, comparisonRows, rankOf, scorePercentOf, JOURNEY } from '../src/lib/geolintFix.js'

const order = {
  id: 'GL-ABC234', host: 'example.com', siteUrl: 'https://example.com', platform: 'wordpress', accessMethod: 'invite-admin-user', accessNotes: '', name: 'Ali', email: 'a@x.com', whatsapp: '', notes: '',
  before: { kind: 'page', url: 'https://example.com/', auditedAt: '2026-10-14T00:00:00Z', scorePercent: 58, moreIssues: 2, issues: [{ title: 'Low thing', priority: 'low' }, { title: 'Firewall blocks bot', priority: 'critical' }] },
  gsc: null,
}

test('score comparison reports measured numbers and never promises a target', () => {
  const c = compareScores({ scorePercent: 58, kind: 'page' }, { scorePercent: 71.5, kind: 'page' }, 90)
  assert.equal(c.gain, 13.5)
  assert.equal(c.reachedTarget, false)
  assert.equal(compareScores({ scorePercent: 58 }, { scorePercent: 93 }, 90).reachedTarget, true)
  assert.equal(compareScores({ scorePercent: 58 }, null).gain, null)
  assert.equal(signed(-3), '-3')
  assert.equal(signed(4), '+4')
})

test('every status has client text and a way forward that matches the engine rules', () => {
  for (const s of ADMIN_STATUSES) {
    assert.ok(statusInfo(s).label)
    assert.ok(Array.isArray(NEXT_STATUSES[s]))
  }
  assert.deepEqual(NEXT_STATUSES.cancelled, [])
  assert.ok(!NEXT_STATUSES.awaiting_payment.includes('paid'), 'paid goes through Mark paid so the payment is recorded')
  assert.equal(formatMoney({ amount: 50 }), '$50')
})

test('the order form blocks passwords and missing consent', () => {
  const ok = { siteUrl: 'https://a.com', name: 'Ali', platform: 'wix', accessMethod: 'invite-admin-user', authorized: true }
  assert.deepEqual(validateOrderForm(ok), {})
  assert.ok(validateOrderForm({ ...ok, authorized: false }).authorized)
  assert.ok(validateOrderForm({ ...ok, accessNotes: 'my password: abc123' }).accessNotes)
  assert.ok(validateOrderForm({ ...ok, whatsapp: 'call me' }).whatsapp)
})

test('Search Console helpers', () => {
  assert.equal(gscDelta({ clicks: 120 }, { clicks: 100 }, 'clicks'), 20)
  assert.equal(gscDelta({ position: 8 }, { position: 10 }, 'position'), 20, 'a lower position is an improvement')
  assert.equal(gscDelta({ clicks: 1 }, { clicks: 0 }, 'clicks'), null)
  const rows = [{ query: 'a', impressions: 500, position: 6 }, { query: 'b', impressions: 900, position: 2 }, { query: 'c', impressions: 5, position: 8 }, { query: 'd', impressions: 300, position: 12 }]
  assert.deepEqual(nearMisses(rows).map((r) => r.query), ['a', 'd'])
})

test('the fix brief lists findings by priority, forbids passwords and keeps the score honest', () => {
  const brief = buildFixBrief(order, { target: 90 })
  assert.match(brief, /GL-ABC234/)
  assert.ok(brief.indexOf('Firewall blocks bot') < brief.indexOf('Low thing'))
  assert.match(brief, /Never ask the client for a password/)
  assert.match(brief, /never claim a number that was not measured/)
  assert.match(brief, /\+2 more/)
  assert.match(buildFixBrief({ ...order, before: null }), /No baseline is attached yet/)
})

test('the fix pages are noindex, keep Google sign-in off the CRM app and never store tokens', () => {
  const client = readFileSync(new URL('../src/lib/geolintClient.js', import.meta.url), 'utf8')
  assert.match(client, /CLIENT_APP_NAME = 'geolint-client'/)
  assert.match(client, /initializeApp\(mainApp\.options, CLIENT_APP_NAME\)/)
  assert.doesNotMatch(client, /localStorage|sessionStorage/)
  for (const f of ['GeoLintFixPage', 'GeoLintOrdersPage']) {
    assert.match(readFileSync(new URL(`../src/pages/public/tools/${f}.jsx`, import.meta.url), 'utf8'), /robots="noindex/)
  }
  const gsc = readFileSync(new URL('../src/pages/public/tools/GeoLintGsc.jsx', import.meta.url), 'utf8')
  assert.doesNotMatch(gsc, /localStorage|sessionStorage/)
})

test('card checkout is created by the engine for the order, and the client keeps nothing', async () => {
  const client = readFileSync(new URL('../src/lib/geolintClient.js', import.meta.url), 'utf8')
  assert.match(client, /\/polar-checkout/)
  assert.doesNotMatch(client, /paddle/i)
  assert.match(client, /inMemoryPersistence/, 'the Search Console sign-in keeps nothing')
})

test('plans: GEO and full SEO, priced from the engine settings', () => {
  assert.equal(planPrice({ priceUsd: 50, seoPriceUsd: 500 }, 'geo'), 50)
  assert.equal(planPrice({ priceUsd: 50, seoPriceUsd: 650 }, 'seo'), 650)
  assert.equal(planPrice(null, 'seo'), 500)
  assert.equal(planPrice({}, 'geo'), 50)
  assert.equal(planLabel('seo'), 'Full website SEO')
  assert.equal(planLabel(undefined), 'GEO fix (AI search)', 'orders from before plans existed are GEO orders')
})

test('the sign-in page only sends people to pages of this service', () => {
  assert.equal(safeNext('/tools/geo-audit/fix?url=https%3A%2F%2Fa.com'), '/tools/geo-audit/fix?url=https%3A%2F%2Fa.com')
  assert.equal(safeNext('/tools/geo-audit/orders/GL-ABC234/'), '/tools/geo-audit/orders/GL-ABC234/')
  for (const bad of ['https://evil.com', '//evil.com', '/\\evil.com', '/admin', '/tools/geo-audit/fix//evil', 'javascript:alert(1)', '', null]) {
    assert.equal(safeNext(bad), '/tools/geo-audit/fix', String(bad))
  }
})

test('competitor comparison ranks you among rivals and ignores unscored ones', () => {
  const rows = comparisonRows({ scorePercent: 58, label: 'Me' }, [{ host: 'a.com', title: 'A', scorePercent: 82 }, { host: 'b.com', title: 'B', scorePercent: null }, { host: 'c.com', title: 'C', scorePercent: 40 }])
  assert.deepEqual(rows.map((r) => r.percent), [82, 58, 40])
  assert.deepEqual(rankOf(rows), { place: 2, of: 3 })
  assert.equal(rankOf(comparisonRows({ scorePercent: 58 }, [])), null)
  assert.equal(scorePercentOf({ score: { earned: 75.94, evaluatedMax: 100 } }), 75.9)
  assert.equal(scorePercentOf({}), null)
})

test('the journey lists every step in order and the brief states the plan scope and competitors', () => {
  assert.deepEqual(JOURNEY.map((s) => s.id), ['signin', 'site', 'market', 'business', 'competitors', 'scope', 'details', 'plan', 'pay', 'fixed'])
  const geo = buildFixBrief({ ...order, plan: 'geo', price: { amount: 50 }, competitors: [{ title: 'Rival', host: 'r.com', url: 'https://r.com', scorePercent: 82 }] })
  assert.match(geo, /GEO fixes below only/)
  assert.match(geo, /Rival \(https:\/\/r\.com\): GeoLint score 82/)
  assert.match(buildFixBrief({ ...order, plan: 'seo', price: { amount: 500 } }), /full SEO job for the whole website/)
})

test('the floating button and the sign-in page exist and are wired up', () => {
  const report = readFileSync(new URL('../src/pages/public/tools/GeoAuditReportPage.jsx', import.meta.url), 'utf8')
  assert.match(report, /<FixFloat report=\{report\} \/>/)
  const signin = readFileSync(new URL('../src/pages/public/tools/GeoLintSignInPage.jsx', import.meta.url), 'utf8')
  assert.match(signin, /role="tablist"/)
  assert.match(signin, /GoogleButton/)
  assert.match(signin, /JourneySteps current="signin"/)
  assert.match(signin, /robots="noindex,nofollow"/)
  const router = readFileSync(new URL('../src/AppRouter.jsx', import.meta.url), 'utf8')
  assert.match(router, /\/tools\/geo-audit\/sign-in/)
})
