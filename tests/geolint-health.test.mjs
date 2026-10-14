/** GeoLint report: Page health panel and PDF section. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildGeoLintPdf } from '../src/lib/geolintPdf.js'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')

const health = {
  categories: [
    { id: 'content', label: 'Content', score: 40, checks: [{ id: 'title', label: 'Page title', status: 'fail', detail: 'No <title> tag was found.', why: 'It is the headline in search.', fix: { steps: ['Add a title.'], snippet: { label: 'Title tag', lang: 'html', code: '<title>Example</title>' } } }] },
    { id: 'headers', label: 'HTTP headers', score: 100, checks: [{ id: 'hsts', label: 'HSTS', status: 'pass', detail: 'ok' }] },
  ],
  summary: { pass: 1, warn: 0, fail: 1, info: 0 },
  basis: { source: 'raw', jsOnlyTags: [] },
}

test('report shows the Page health panel only when the engine sent it', () => {
  const page = read('../src/pages/public/tools/GeoAuditReportPage.jsx')
  assert.match(page, /report\.pageHealth && Array\.isArray\(report\.pageHealth\.categories\)/)
  assert.match(page, /\{pageHealth \? \(/)
  assert.match(page, /<PageHealthPanel health=\{pageHealth\} \/>/)
})

test('panel has a tab per group, problems first, and a copyable fix', () => {
  const panel = read('../src/pages/public/tools/GeoLintHealth.jsx')
  assert.match(panel, /role="tablist"/)
  assert.match(panel, /const RANK = \{ fail: 0, warn: 1, info: 2, pass: 3 \}/)
  assert.match(panel, /navigator\.clipboard\.writeText\(snippet\.code\)/)
})

test('the PDF includes page health problems with their fixes', async () => {
  const report = { url: 'https://a.com/', auditedAt: '2026-10-14T07:00:00Z', score: { earned: 70, evaluatedMax: 100, totalMax: 100 }, modules: {}, remediation: [], pageHealth: health }
  const doc = await buildGeoLintPdf(report)
  assert.ok(doc.getNumberOfPages() >= 1)
  const text = doc.output('datauristring')
  assert.ok(text.length > 1000)
})
