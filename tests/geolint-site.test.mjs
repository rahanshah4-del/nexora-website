/** GeoLint whole-site scan and badge helpers. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { badgeEmbed, pagesToScan, rowFromReport, summarizeSiteScan } from '../src/lib/geolintSite.js'
import { geoBadgeUrl } from '../src/lib/geolint.js'

const report = (earned, titles = []) => ({ score: { earned, evaluatedMax: 100 }, remediation: titles.map((t, i) => ({ id: t.toLowerCase().replace(/\W+/g, '-'), title: t, priority: i ? 'medium' : 'high' })) })

test('pagesToScan skips the audited page and keeps order, within the limit', () => {
  const plan = { pages: ['https://a.com/', 'https://a.com/x/', 'https://a.com/y', 'https://a.com/z'] }
  assert.deepEqual(pagesToScan(plan, 'https://a.com', 3), ['https://a.com/x/', 'https://a.com/y'])
  assert.deepEqual(pagesToScan({ pages: [] }, 'https://a.com'), [])
})

test('rowFromReport keeps the score and the top three fixes', () => {
  const row = rowFromReport('https://a.com/', report(71.5, ['A', 'B', 'C', 'D']))
  assert.equal(row.percent, 71.5)
  assert.deepEqual(row.fixes.map((f) => f.title), ['A', 'B', 'C'])
})

test('summarizeSiteScan averages, finds the weakest pages and repeated fixes', () => {
  const rows = [
    rowFromReport('u1', report(90, ['Missing schema'])),
    rowFromReport('u2', report(50, ['Missing schema', 'No headings'])),
    rowFromReport('u3', report(70, ['Missing schema'])),
    { url: 'u4', status: 'failed', percent: null, fixes: [] },
  ]
  const s = summarizeSiteScan(rows)
  assert.equal(s.average, 70)
  assert.equal(s.pages, 3)
  assert.equal(s.failed, 1)
  assert.equal(s.weakest[0].url, 'u2')
  assert.deepEqual(s.repeated.map((r) => [r.title, r.pages]), [['Missing schema', 3]])
  assert.equal(summarizeSiteScan([]).average, null)
})

test('badge embed code points at the badge image and the tool', () => {
  const e = badgeEmbed({ imageUrl: 'https://api.x/api/badge/abc.svg', toolUrl: 'https://s/tools/geo-audit/', score: 86 })
  assert.match(e.html, /<img src="https:\/\/api\.x\/api\/badge\/abc\.svg" alt="GeoLint AI-readiness score 86\/100"/)
  assert.match(e.markdown, /^\[!\[GeoLint AI-readiness score 86\/100\]\(https:\/\/api\.x\/api\/badge\/abc\.svg\)\]\(https:\/\/s\/tools\/geo-audit\/\)$/)
})

test('geoBadgeUrl needs a server URL and a well-formed id', () => {
  assert.equal(geoBadgeUrl('../../etc'), '')
  assert.equal(geoBadgeUrl(undefined), '')
})

test('report page mounts both panels only when the API is configured', () => {
  const page = readFileSync(new URL('../src/pages/public/tools/GeoAuditReportPage.jsx', import.meta.url), 'utf8')
  assert.match(page, /GEOLINT_API_URL \? \(\s*<Section title="Scan more of this site"/)
  assert.match(page, /report\.id && GEOLINT_API_URL/)
})
