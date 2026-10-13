/**
 * Public GeoLint page (/tools/geo-audit): SEO lengths, answer-first copy,
 * launch switch wiring and the URL/finding helpers.
 *
 * Run: npm test   (node --test tests/*.test.mjs)
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { GEOLINT_LAUNCHED, GEOLINT_PATH } from '../src/lib/geolintLaunch.js'
import { GEOLINT_FAQS, GEOLINT_PAGE, GEOLINT_SEO, geolintPageSchemas } from '../src/lib/geolintPageData.js'
import { seoMetadata } from '../src/lib/seoMetadata.js'
import { noindexPagePaths } from '../src/config/noindexPages.js'
import { collectFindings, normalizeAuditUrl, publicAuditErrorMessage } from '../src/lib/geolint.js'

const words = (t) => String(t).trim().split(/\s+/).length

test('launch switch ships closed and the path has no trailing slash', () => {
  assert.equal(GEOLINT_LAUNCHED, false)
  assert.equal(GEOLINT_PATH, '/tools/geo-audit')
})

test('title ≤ 60, description 140–155, keyword in title and H1', () => {
  assert.ok(GEOLINT_SEO.title.length <= 60)
  assert.ok(GEOLINT_SEO.description.length >= 140 && GEOLINT_SEO.description.length <= 155)
  assert.match(GEOLINT_SEO.title, /GEO Audit/i)
  assert.match(GEOLINT_PAGE.h1, /GEO Audit/i)
})

test('while closed the page is noindex and canonical is trailing-slash', () => {
  const seo = seoMetadata[GEOLINT_PATH]
  assert.equal(seo.robots, 'noindex,follow')
  assert.equal(seo.canonical, 'https://nexorasolution.online/tools/geo-audit/')
  assert.ok(noindexPagePaths(true).has(GEOLINT_PATH))
})

test('every FAQ answer is a direct 30–60 word answer; 8 FAQs', () => {
  assert.equal(GEOLINT_FAQS.length, 8)
  for (const f of GEOLINT_FAQS) {
    const n = words(f.answer)
    assert.ok(n >= 30 && n <= 60, `${f.question}: ${n} words`)
  }
})

test('every section opens with a 30–60 word paragraph', () => {
  for (const s of GEOLINT_PAGE.sections) {
    const first = s.blocks[0]
    assert.ok(first.p, `${s.id} does not open with a paragraph`)
    const n = words(first.p.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'))
    assert.ok(n >= 30 && n <= 60, `${s.id}: ${n} words`)
  }
})

test('schemas: WebApplication, FAQPage mirroring visible FAQ, BreadcrumbList', () => {
  const [app, faq, crumbs] = geolintPageSchemas()
  assert.equal(app['@type'], 'WebApplication')
  assert.equal(faq['@type'], 'FAQPage')
  assert.equal(faq.mainEntity.length, GEOLINT_FAQS.length)
  assert.equal(crumbs.itemListElement.at(-1).item, 'https://nexorasolution.online/tools/geo-audit/')
})

test('normalizeAuditUrl', () => {
  assert.equal(normalizeAuditUrl('example.com/a'), 'https://example.com/a')
  assert.equal(normalizeAuditUrl('http://example.com'), 'http://example.com/')
  assert.equal(normalizeAuditUrl('  '), null)
  assert.equal(normalizeAuditUrl('ftp://example.com'), null)
  assert.equal(normalizeAuditUrl('javascript:alert(1)'), null)
  assert.equal(normalizeAuditUrl('https://user:pw@example.com'), null)
  assert.equal(normalizeAuditUrl('localhost'), null)
  assert.equal(normalizeAuditUrl('a b.com'), null)
})

test('publicAuditErrorMessage never leaks admin wording', () => {
  assert.match(publicAuditErrorMessage(429, ''), /Too many/)
  assert.match(publicAuditErrorMessage(500, ''), /could not finish/)
  assert.equal(publicAuditErrorMessage(400, 'X', 'Bad url'), 'Bad url')
})

test('collectFindings ranks errors first, drops info, dedupes', () => {
  const report = { modules: {
    botAccess: { messages: [{ severity: 'warning', message: 'w' }, { severity: 'error', message: 'e' }, { severity: 'info', message: 'i' }] },
    bluf: { messages: [{ severity: 'warning', message: 'w' }, { severity: 'warning', message: 'w' }] },
  } }
  const out = collectFindings(report)
  assert.deepEqual(out.map((f) => f.message), ['e', 'w', 'w'])
  assert.equal(out[0].module, 'botAccess')
})

test('GeoLint page uses its own trust chips, never the on-device claim', async () => {
  const { TRUST_CHIPS } = await import('../src/lib/toolsPagesData.js')
  assert.ok(GEOLINT_PAGE.trustChips.length >= 3)
  assert.ok(TRUST_CHIPS.some((c) => /device/i.test(c)))
  assert.ok(!GEOLINT_PAGE.trustChips.some((c) => /device/i.test(c)))
})
