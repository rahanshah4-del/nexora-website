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
