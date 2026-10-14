/** GeoLint whole-site audit: stream state, table helpers, CSV and badge. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { badgeEmbed, filterPages, initialSiteState, pagesCsv, reduceSiteEvent, siteProgress } from '../src/lib/geolintSite.js'
import { geoBadgeUrl } from '../src/lib/geolint.js'

const page = (url, percent, extra = {}) => ({ url, finalUrl: url, status: 200, depth: 1, inSitemap: true, title: `T ${url}`, score: percent === null ? null : { earned: percent, evaluatedMax: 100, percent }, indexable: percent !== null, rendered: false, problems: percent !== null && percent < 50 ? [{ source: 'health', id: 'title', title: 'Page title', detail: 'missing', severity: 'fail' }] : [], meta: { words: 300 }, ...extra })

test('stream events build the site state in order', () => {
  let s = initialSiteState()
  s = reduceSiteEvent(s, { type: 'start', origin: 'https://a.com/', maxPages: 100 })
  s = reduceSiteEvent(s, { type: 'discovered', sitemapUrls: 40, sitemapFiles: 2 })
  s = reduceSiteEvent(s, { type: 'page', page: page('https://a.com/', 90), done: 1, queued: 39 })
  assert.equal(siteProgress(s), 3)
  s = reduceSiteEvent(s, { type: 'page', page: page('https://a.com/x', 40), done: 2, queued: 0 })
  assert.equal(siteProgress(s), 100)
  s = reduceSiteEvent(s, { type: 'done', summary: { score: { indexable: 65 } }, crawl: { audited: 2 }, durationMs: 1000 })
  s = reduceSiteEvent(s, { type: 'saved', id: 'abcdef12-0000' })
  assert.equal(s.pages.length, 2)
  assert.equal(s.summary.score.indexable, 65)
  assert.equal(s.savedId, 'abcdef12-0000')
  assert.equal(reduceSiteEvent(s, { type: 'nonsense' }), s)
})

test('progress never passes the page limit', () => {
  const s = { ...initialSiteState(), maxPages: 10, pages: [page('a', 1)], queued: 500 }
  assert.equal(siteProgress(s), 10)
})

test('filterPages filters, searches and sorts', () => {
  const pages = [page('https://a.com/b', 80), page('https://a.com/a', 30), page('https://a.com/err', null, { status: 404 })]
  assert.deepEqual(filterPages(pages).map((p) => p.url), ['https://a.com/err', 'https://a.com/a', 'https://a.com/b'])
  assert.deepEqual(filterPages(pages, { sort: 'score-desc' }).map((p) => p.url)[0], 'https://a.com/b')
  assert.deepEqual(filterPages(pages, { filter: 'errors' }).map((p) => p.url), ['https://a.com/err'])
  assert.deepEqual(filterPages(pages, { filter: 'poor' }).map((p) => p.url), ['https://a.com/a'])
  assert.deepEqual(filterPages(pages, { query: '/B' }).map((p) => p.url), ['https://a.com/b'])
})

test('CSV has a header, one row per page and escapes commas and quotes', () => {
  const csv = pagesCsv([page('https://a.com/x', 40, { title: 'Hello, "world"' })])
  const lines = csv.split('\n')
  assert.equal(lines.length, 2)
  assert.match(lines[0], /^URL,Status,Score %/)
  assert.match(lines[1], /"Hello, ""world"""/)
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

test('report page mounts the whole-site panel only when the API is configured', () => {
  const page = readFileSync(new URL('../src/pages/public/tools/GeoAuditReportPage.jsx', import.meta.url), 'utf8')
  assert.match(page, /GEOLINT_API_URL \? \(\s*<Section title="Audit the whole website"/)
  assert.match(page, /<SiteAuditPanel url=\{report\.url\} \/>/)
  const client = readFileSync(new URL('../src/lib/geolint.js', import.meta.url), 'utf8')
  assert.match(client, /\/api\/site-audit/)
  assert.match(client, /getReader\(\)/)
})
