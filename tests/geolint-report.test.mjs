/**
 * GeoLint report helpers and PDF: grading, labels, scan timeline, the
 * report hand-off, and that the PDF builds from a full report.
 *
 * Run: npm test   (node --test tests/*.test.mjs)
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { SCAN_STEPS, activeStepIndex, gradeFor, hostLabel, isValidReport, issueLabel, reportFileBase, scanProgress, strengthOf, summarizeReport, verdictInfo } from '../src/lib/geolintReport.js'
import { buildGeoLintPdf, pdfSafe } from '../src/lib/geolintPdf.js'
import { noindexPagePaths } from '../src/config/noindexPages.js'
import { GEOLINT_REPORT_PATH } from '../src/lib/geolintLaunch.js'
import { seoMetadata } from '../src/lib/seoMetadata.js'

const FIXTURE = {
  id: 'abc',
  url: 'https://example.com/page',
  auditedAt: '2026-10-13T18:32:52.700Z',
  partial: false,
  score: { earned: 72.4, evaluatedMax: 100, totalMax: 100 },
  modules: {
    botAccess: {
      module: 'botAccess', score: 30, maxScore: 30, messages: [],
      bots: [
        { bot: 'GPTBot', kind: 'training', scored: false, robots: { allowed: false }, http: { verdict: 'ok', status: 200 }, messages: [] },
        { bot: 'OAI-SearchBot', kind: 'search', scored: true, robots: { allowed: true }, http: { verdict: 'blocked', status: 403 }, messages: [] },
      ],
      controls: [{ name: 'Google-Extended', description: '', allowed: true }],
    },
    jsDifferential: { module: 'jsDifferential', status: 'ok', score: 20, maxScore: 25, isCsr: false, metrics: { staticWords: 900, renderedWords: 1000, visibleWithoutJsPercent: 90 }, messages: [{ severity: 'warning', message: 'Some text needs JavaScript.' }] },
    bluf: {
      module: 'bluf', status: 'ok', score: 10, maxScore: 25, messages: [{ severity: 'error', message: 'Headings do not open with answers.' }],
      summary: { headings: 2, passed: 1, partial: 0, failed: 1, passRatePercent: 50, cardSections: 0 },
      headings: [
        { level: 2, text: 'What is “GEO” — really…?', block: 'paragraph', words: 45, points: 1, issues: [] },
        { level: 3, text: 'Next steps', block: 'none', words: 0, points: 0, issues: ['no_answer_block'] },
      ],
    },
    facts: { module: 'facts', status: 'ok', score: 12.4, maxScore: 20, messages: [], breakdown: { density: { facts: 20, words: 900, per100Words: 2.2, points: 8, max: 8 }, sources: { externalLinks: 2, points: 2.7, max: 4 }, schema: { types: ['Organization', 'FAQPage'], invalidBlocks: 0, points: 6, max: 6 }, llmsTxt: { found: false, points: 0, max: 2 } }, extras: { noindex: false, canonical: 'https://example.com/page', hasFaqSchema: true, lastUpdated: null } },
  },
}

test('gradeFor bands the percentage and handles bad input', () => {
  assert.equal(gradeFor(95, 100).letter, 'A')
  assert.equal(gradeFor(75.9, 100).letter, 'B')
  assert.equal(gradeFor(60, 100).letter, 'C')
  assert.equal(gradeFor(45, 100).letter, 'D')
  assert.equal(gradeFor(10, 100).letter, 'F')
  assert.equal(gradeFor(60, 80).letter, 'B') // graded on what could be evaluated
  assert.equal(gradeFor('x', 100).letter, '–')
  assert.equal(gradeFor(5, 0).letter, '–')
})

test('strengthOf', () => {
  assert.equal(strengthOf(30, 30).label, 'Strong')
  assert.equal(strengthOf(15, 25).label, 'Needs work')
  assert.equal(strengthOf(6.4, 25).label, 'Weak')
  assert.equal(strengthOf(0, 25, 'unavailable').label, 'Could not run')
})

test('labels never show raw codes', () => {
  assert.equal(issueLabel('no_direct_statement'), 'No direct statement or number')
  assert.equal(issueLabel('something_new'), 'something new')
  assert.equal(verdictInfo('challenge').label, 'Challenge page')
  assert.equal(verdictInfo('???').label, 'Unknown')
})

test('summarizeReport uses only the report numbers', () => {
  assert.match(summarizeReport(FIXTURE), /^Search bots can reach the page, the text is already in the HTML, headings need clearer/)
  assert.match(summarizeReport({ modules: {} }), /too few checks/)
})

test('file base and host label', () => {
  assert.equal(hostLabel('https://example.com/'), 'example.com')
  assert.equal(hostLabel('https://example.com/a/b/'), 'example.com/a/b')
  assert.equal(reportFileBase(FIXTURE), 'geolint-example-com-page-2026-10-13')
  assert.equal(reportFileBase({}), 'geolint-report-audit')
})

test('isValidReport', () => {
  assert.equal(isValidReport(FIXTURE), true)
  assert.equal(isValidReport(null), false)
  assert.equal(isValidReport({ score: {}, modules: {} }), false)
})

test('scan timeline: steps advance, progress never reaches 100 while waiting', () => {
  assert.equal(activeStepIndex(0), 0)
  assert.ok(activeStepIndex(30000) > 4)
  assert.equal(activeStepIndex(10 ** 9), SCAN_STEPS.length - 1)
  assert.ok(scanProgress(0) === 0)
  assert.ok(scanProgress(10 ** 9) <= 92)
  assert.ok(scanProgress(8000) > scanProgress(2000))
})

test('pdfSafe reduces text to what Helvetica can draw', () => {
  assert.equal(pdfSafe('What is “GEO” — really…?'), 'What is "GEO" - really...?')
  assert.equal(pdfSafe('a b\n c'), 'a b c')
  assert.equal(pdfSafe('日本語 ok'), 'ok')
})

test('PDF builds from a full report and from a minimal one', async () => {
  const doc = await buildGeoLintPdf(FIXTURE)
  const bytes = Buffer.from(doc.output('arraybuffer'))
  assert.equal(bytes.subarray(0, 5).toString(), '%PDF-')
  assert.ok(bytes.length > 4000)
  const min = await buildGeoLintPdf({ url: 'https://a.com', score: { earned: 0, evaluatedMax: 100 }, modules: {} })
  assert.equal(Buffer.from(min.output('arraybuffer')).subarray(0, 5).toString(), '%PDF-')
})

test('the report page is noindex in both launch states and has its own metadata', () => {
  assert.ok(noindexPagePaths(true).has(GEOLINT_REPORT_PATH))
  assert.equal(seoMetadata[GEOLINT_REPORT_PATH].robots, 'noindex,follow')
})

test('loadReport returns the same object until storage changes (useSyncExternalStore needs that)', async () => {
  const store = new Map()
  globalThis.sessionStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) }
  const { loadReport, saveReport, clearReport } = await import('../src/lib/geolintReport.js')
  assert.equal(loadReport(), null)
  assert.equal(saveReport(FIXTURE), true)
  const a = loadReport()
  assert.ok(a && loadReport() === a)
  saveReport({ ...FIXTURE, url: 'https://other.com/' })
  assert.notEqual(loadReport(), a)
  store.set('geolint:last-report', '{bad json')
  assert.equal(loadReport(), null)
  clearReport()
  assert.equal(loadReport(), null)
  delete globalThis.sessionStorage
})

// ---- calculation check and fix list -------------------------------------

const CHECKED = {
  url: 'https://example.com/',
  auditedAt: '2026-10-14T05:00:00.000Z',
  partial: false,
  score: { earned: 81.3, evaluatedMax: 100, totalMax: 100, excludedModules: [] },
  confidence: { level: 'high', reasons: [], limitations: ['Only this one URL was audited.'] },
  modules: {
    botAccess: { module: 'botAccess', status: 'ok', score: 26.3, maxScore: 30, breakdown: { robotsPoints: 15, robotsMax: 15, httpPoints: 11.3, httpMax: 15 }, bots: [], messages: [] },
    jsDifferential: { module: 'jsDifferential', status: 'ok', score: 25, maxScore: 25, metrics: { staticChars: 1000, renderedChars: 1000, gap: 0 } },
    bluf: { module: 'bluf', status: 'ok', score: 20, maxScore: 25, headings: [], messages: [] },
    facts: { module: 'facts', status: 'ok', score: 10, maxScore: 20, breakdown: { density: { points: 4, max: 8 }, sources: { points: 0, max: 4 }, schema: { points: 6, max: 6, types: ['Organization'] }, llmsTxt: { points: 0, max: 2 } }, messages: [] },
  },
  remediation: [
    { id: 'bots-blocked', module: 'botAccess', priority: 'critical', title: 'A firewall blocks OAI-SearchBot', problem: 'p', evidence: ['OAI-SearchBot: blocked (HTTP 403)'], confidence: 'confirmed', steps: ['Allow the crawler.'], snippet: { label: 'rule', lang: 'text', code: 'x' }, upTo: 3.7 },
  ],
}

test('verifyReportClient passes a report whose numbers agree', async () => {
  const { verifyReportClient } = await import('../src/lib/geolintReport.js')
  const out = verifyReportClient(CHECKED)
  assert.equal(out.failed, 0)
  assert.equal(out.verified, true)
  assert.ok(out.checked >= 8)
})

test('verifyReportClient catches a wrong total, a wrong part sum and a wrong gap curve', async () => {
  const { verifyReportClient } = await import('../src/lib/geolintReport.js')
  const total = verifyReportClient({ ...CHECKED, score: { ...CHECKED.score, earned: 95 } })
  assert.equal(total.checks.find((c) => c.id === 'total.earned').ok, false)
  const facts = verifyReportClient({ ...CHECKED, modules: { ...CHECKED.modules, facts: { ...CHECKED.modules.facts, score: 14 } } })
  assert.equal(facts.checks.find((c) => c.id === 'facts.sum').ok, false)
  const js = verifyReportClient({ ...CHECKED, modules: { ...CHECKED.modules, jsDifferential: { ...CHECKED.modules.jsDifferential, metrics: { staticChars: 1000, renderedChars: 1000, gap: 0.8 } } } })
  assert.equal(js.checks.find((c) => c.id === 'js.gap').ok, false)
  assert.equal(js.checks.find((c) => c.id === 'js.score').ok, false)
})

test('verifyReportClient leaves out modules that were excluded or could not run', async () => {
  const { verifyReportClient } = await import('../src/lib/geolintReport.js')
  const report = {
    ...CHECKED,
    partial: true,
    score: { earned: 51.3, evaluatedMax: 55, totalMax: 100, excludedModules: ['bluf', 'facts'] },
    modules: { ...CHECKED.modules, bluf: { ...CHECKED.modules.bluf, status: 'inconclusive', score: 0 }, facts: { ...CHECKED.modules.facts, status: 'inconclusive', score: 0, breakdown: null } },
  }
  assert.equal(verifyReportClient(report).verified, true)
})

test('the browser gap curve matches the engine curve at its corners', async () => {
  const { jsScoreForGap } = await import('../src/lib/geolintReport.js')
  assert.equal(jsScoreForGap(0), 25)
  assert.equal(jsScoreForGap(0.2), 25)
  assert.equal(jsScoreForGap(0.6), 10)
  assert.equal(jsScoreForGap(0.9), 0)
  assert.equal(jsScoreForGap(0.4), 17.5)
})

test('the PDF includes the fix list and the verification line', async () => {
  const doc = await buildGeoLintPdf(CHECKED)
  assert.ok(doc.getNumberOfPages() >= 1)
  const text = JSON.stringify(doc.internal.pages)
  assert.match(text, /Calculation verified/)
  assert.match(text, /A firewall blocks OAI-SearchBot/)
})

test('domainTiles shows real values and says "not ranked" or "not connected" instead of guessing', async () => {
  const { domainTiles, formatAge } = await import('../src/lib/geolintReport.js')
  assert.equal(formatAge(144), '4 months, 22 days')
  assert.equal(formatAge(800), '2 years, 2 months')
  assert.equal(formatAge(5), '5 days')
  assert.equal(formatAge(null), null)
  const full = domainTiles({
    domain: 'github.com',
    registration: { state: 'ok', ageDays: 144, registeredAt: '2026-05-22T19:42:13.787Z', daysToExpiry: 220, registrar: 'HOSTINGER operations, UAB' },
    popularity: { state: 'ok', rank: 30, tier: 'top_10k' },
    authority: { state: 'ok', pageRank: 9.9 },
  })
  assert.deepEqual(full.map((t) => t.id), ['age', 'popularity', 'authority', 'expiry'])
  assert.equal(full[1].value, '#30')
  assert.equal(full[2].value, '9.9 / 10')
  const small = domainTiles({ domain: 'small.example', registration: { state: 'unavailable' }, popularity: { state: 'not_listed' }, authority: { state: 'not_configured' } })
  assert.equal(small[0].value, 'Not available')
  assert.equal(small[1].value, 'Not ranked')
  assert.equal(small[2].value, 'Not connected')
  assert.equal(domainTiles({ registration: { state: 'ok', daysToExpiry: 12 }, popularity: {}, authority: {} })[3].tone, 'rose')
  assert.deepEqual(domainTiles(undefined), [])
})

// ---------------------------------------------------------------------------
// Overview dashboard helpers
// ---------------------------------------------------------------------------

import { buildOverview, solutionSteps } from '../src/lib/geolintReport.js'

const OVERVIEW_REPORT = {
  modules: {
    botAccess: { score: 30, maxScore: 30, status: 'ok', bots: [
      { scored: true, robots: { allowed: true }, http: { verdict: 'ok' } },
      { scored: true, robots: { allowed: false }, http: { verdict: 'blocked' } },
      { scored: false, robots: { allowed: true }, http: { verdict: 'ok' } },
    ] },
    jsDifferential: { score: 25, maxScore: 25, status: 'ok' },
    bluf: { score: 7.5, maxScore: 25, status: 'ok', summary: { headings: 29, passed: 5, partial: 0, failed: 24 } },
    facts: { score: 0, maxScore: 20, status: 'unavailable' },
  },
  score: { excludedModules: [] },
  remediation: [
    { id: 'a', priority: 'high', module: 'bluf', upTo: 17.5, title: 'Headings' },
    { id: 'b', priority: 'low', module: 'facts', upTo: 2, title: 'llms.txt' },
    { id: 'c', priority: 'weird', module: 'facts' },
  ],
}

test('buildOverview counts issues by priority and treats unknown priority as medium', () => {
  const o = buildOverview(OVERVIEW_REPORT)
  assert.equal(o.issueTotal, 3)
  assert.deepEqual(o.issues.map((i) => [i.id, i.value]), [['critical', 0], ['high', 1], ['medium', 1], ['low', 1]])
})

test('buildOverview reports points earned and lost per scored area and skips unavailable ones', () => {
  const o = buildOverview(OVERVIEW_REPORT)
  assert.deepEqual(o.areas.map((a) => a.id), ['botAccess', 'jsDifferential', 'bluf'])
  const bluf = o.areas.find((a) => a.id === 'bluf')
  assert.equal(bluf.earned, 7.5)
  assert.equal(bluf.lost, 17.5)
  assert.equal(bluf.tone, 'rose')
})

test('buildOverview ranks the biggest wins and builds heading and bot splits from real numbers', () => {
  const o = buildOverview(OVERVIEW_REPORT)
  assert.deepEqual(o.winBack.map((w) => w.id), ['a', 'b'])
  assert.deepEqual(o.headings.map((h) => h.value), [5, 0, 24])
  assert.deepEqual(o.bots.map((b) => [b.id, b.value]), [['reachable', 1], ['blocked', 1]])
})

test('buildOverview survives an empty report', () => {
  const o = buildOverview({})
  assert.equal(o.issueTotal, 0)
  assert.deepEqual(o.areas, [])
  assert.equal(o.headings, null)
  assert.equal(o.bots, null)
})

test('solutionSteps never leaves a problem without a solution', () => {
  assert.deepEqual(solutionSteps({ steps: ['Do this'] }), ['Do this'])
  for (const module of ['botAccess', 'jsDifferential', 'bluf', 'facts', 'unknown']) {
    assert.ok(solutionSteps({ module, steps: [] }).length >= 1, module)
  }
})
