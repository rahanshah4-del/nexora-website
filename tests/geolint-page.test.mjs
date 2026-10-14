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

test('launch switch is on and the path has no trailing slash', () => {
  assert.equal(GEOLINT_LAUNCHED, true)
  assert.equal(GEOLINT_PATH, '/tools/geo-audit')
})

test('title ≤ 60, description 140–155, keyword in title and H1', () => {
  assert.ok(GEOLINT_SEO.title.length <= 60)
  assert.ok(GEOLINT_SEO.description.length >= 140 && GEOLINT_SEO.description.length <= 155)
  assert.match(GEOLINT_SEO.title, /GEO Audit/i)
  assert.match(GEOLINT_SEO.title, /AI Crawler Checker/i)
  assert.match(GEOLINT_PAGE.h1, /GEO Audit/i)
})

test('once launched the page is indexable, has its own OG image and a trailing-slash canonical', () => {
  const seo = seoMetadata[GEOLINT_PATH]
  assert.equal(seo.robots, 'index,follow')
  assert.equal(seo.canonical, 'https://nexorasolution.online/tools/geo-audit/')
  assert.equal(seo.ogImage, 'https://nexorasolution.online/og-geolint.png')
  assert.ok(!noindexPagePaths(true).has(GEOLINT_PATH))
})

test('the OG image file exists and is 1200x630', async () => {
  const { readFileSync } = await import('node:fs')
  const png = readFileSync(new URL('../public/og-geolint.png', import.meta.url))
  assert.equal(png.subarray(1, 4).toString(), 'PNG')
  assert.equal(png.readUInt32BE(16), 1200)
  assert.equal(png.readUInt32BE(20), 630)
})

test('llms.txt lists the GeoLint page', async () => {
  const { readFileSync } = await import('node:fs')
  assert.match(readFileSync(new URL('../public/llms.txt', import.meta.url), 'utf8'), /nexorasolution\.online\/tools\/geo-audit\//)
})

test('cited stats name the right sources', () => {
  const text = JSON.stringify(GEOLINT_PAGE)
  assert.ok(!/peec\.ai|SparkToro/i.test(text))
  assert.match(text, /blog\.cloudflare\.com\/crawlers-click-ai-bots-training/)
  assert.match(text, /searchengineland\.com\/generative-engine-optimization/)
  assert.match(text, /Kevin Indig/)
})

test('every FAQ answer is a direct 30–60 word answer; 10 FAQs', () => {
  assert.equal(GEOLINT_FAQS.length, 10)
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

test('GeoLint page uses its own trust chips, never the on-device claim', async () => {
  const { TRUST_CHIPS } = await import('../src/lib/toolsPagesData.js')
  assert.ok(GEOLINT_PAGE.trustChips.length >= 3)
  assert.ok(TRUST_CHIPS.some((c) => /device/i.test(c)))
  assert.ok(!GEOLINT_PAGE.trustChips.some((c) => /device/i.test(c)))
})
