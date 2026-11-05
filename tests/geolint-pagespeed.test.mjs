import test from 'node:test'
import assert from 'node:assert/strict'
import { parsePageSpeed } from '../src/lib/geolintPageSpeed.js'
import { hasSpeed } from '../src/lib/geolintSpeed.js'

test('parses a PageSpeed response into score, metrics and ratings', () => {
  const run = parsePageSpeed({ lighthouseResult: { categories: { performance: { score: 0.82 } }, audits: { 'largest-contentful-paint': { numericValue: 2100.4 }, 'cumulative-layout-shift': { numericValue: 0.0123 } } } })
  assert.equal(run.score, 82)
  assert.equal(run.metrics.lcpMs, 2100)
  assert.equal(run.ratings.lcpMs, 'good')
  assert.equal(run.metrics.cls, 0.012)
})
test('returns null without a score and the PDF wrapper is recognised', () => {
  assert.equal(parsePageSpeed({}), null)
  assert.equal(hasSpeed({ before: null, after: { mobile: { score: 50 }, desktop: null } }), true)
})

const PX = 'data:image/jpeg;base64,/9j/4AAQ'
const rich = () => ({
  lighthouseResult: {
    categories: { performance: { score: 0.55 }, accessibility: { score: 0.91 }, 'best-practices': { score: 1 }, seo: { score: 0.8 } },
    audits: {
      'final-screenshot': { details: { data: PX } },
      'screenshot-thumbnails': { details: { items: [{ timing: 300, data: PX }, { timing: 600, data: 'javascript:alert(1)' }, { timing: 900, data: PX }] } },
      'largest-contentful-paint-element': { details: { items: [{ type: 'table', items: [{ node: { snippet: '<img class="hero">', nodeLabel: 'Hero', selector: 'div > img' } }] }, { type: 'table', items: [{ phase: 'TTFB', timing: 400 }, { phase: 'Render Delay', timing: 900.4 }] }] } },
      'layout-shifts': { details: { items: [{ node: { snippet: '<div class="ad">' }, score: 0.12345 }] } },
      'third-party-summary': { details: { items: [{ entity: 'Google Tag Manager', blockingTime: 240, mainThreadTime: 500, transferSize: 51200 }, { entity: { text: 'Tiny' }, blockingTime: 0, mainThreadTime: 5 }] } },
      'render-blocking-resources': { details: { items: [{ url: 'https://example.com/css/app.css', wastedMs: 310, totalBytes: 20480 }] } },
      'total-byte-weight': { numericValue: 3145728 },
      'network-requests': { details: { items: [{}, {}, {}] } },
      'bootup-time': { numericValue: 1800 },
      'dom-size': { numericValue: 2100 },
      'mainthread-work-breakdown': { details: { items: [{ group: 'a', groupLabel: 'Script Evaluation', duration: 900 }, { group: 'b', groupLabel: 'Layout', duration: 200 }] } },
      'modern-image-formats': { score: 0.2, details: { overallSavingsBytes: 204800, items: [{ url: 'https://example.com/a.png' }] } },
      'uses-text-compression': { score: 1, details: { items: [] } },
    },
  },
  loadingExperience: { metrics: {
    LARGEST_CONTENTFUL_PAINT_MS: { percentile: 3100, category: 'AVERAGE', distributions: [{ proportion: 0.5 }, { proportion: 0.3 }, { proportion: 0.2 }] },
    CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 5, category: 'FAST', distributions: [{ proportion: 0.9 }, { proportion: 0.06 }, { proportion: 0.04 }] },
  } },
})

test('parses the four category scores, vitals verdict, media, causes, weight and fixes', () => {
  const run = parsePageSpeed(rich())
  assert.deepEqual(run.categories, { performance: 55, accessibility: 91, bestPractices: 100, seo: 80 })
  assert.equal(run.vitals.passed, false)
  assert.equal(run.vitals.metrics.lcp.good, 50)
  assert.equal(run.vitals.metrics.cls.p75, 0.05)
  assert.equal(run.media.filmstrip.length, 2)
  assert.equal(run.causes.lcpElement.snippet, '<img class="hero">')
  assert.equal(run.causes.lcpPhases[1].ms, 900)
  assert.equal(run.causes.shifts[0].score, 0.123)
  assert.equal(run.causes.thirdParty.length, 1)
  assert.equal(run.causes.blocking[0].url, 'example.com/css/app.css')
  assert.deepEqual([run.weight.totalKb, run.weight.requests, run.weight.domNodes], [3072, 3, 2100])
  assert.equal(run.weight.mainThread[0].label, 'Script Evaluation')
  assert.deepEqual(run.fixes.map((f) => f.id), ['modern-image-formats'])
})
test('a plain response still parses and leaves the extras out', () => {
  const run = parsePageSpeed({ lighthouseResult: { categories: { performance: { score: 0.9 } }, audits: {} } })
  assert.equal(run.score, 90)
  for (const k of ['vitals', 'media', 'causes', 'weight', 'fixes']) assert.equal(k in run, false)
})
test('the history keeps numbers but not screenshots', async () => {
  const { compareWithPrevious } = await import('../src/lib/geolintSpeedHistory.js')
  const mem = new Map()
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) }
  compareWithPrevious('https://a.com', { testedAt: 't1', mobile: parsePageSpeed(rich()), desktop: null }, storage)
  const saved = [...mem.values()][0]
  assert.equal(saved.includes('data:image'), false)
  assert.equal(JSON.parse(saved).last.mobile.categories.seo, 80)
})
