/** GeoLint explainer: timeline, SEO, schemas and the numbers shown in the video. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { GEOLINT_HOW_PATH } from '../src/lib/geolintLaunch.js'
import {
  GEOLINT_HOW_DURATION, GEOLINT_HOW_FAQS, GEOLINT_HOW_PAGE, GEOLINT_HOW_POSTER_T, GEOLINT_HOW_SEO, GEOLINT_SCENES, geolintHowPageSchemas,
} from '../src/lib/geolintHowData.js'
import { seoMetadata } from '../src/lib/seoMetadata.js'

const words = (t) => t.trim().split(/\s+/).length

test('scenes are contiguous, start at 0 and fill the duration', () => {
  assert.equal(GEOLINT_SCENES[0].start, 0)
  for (let i = 1; i < GEOLINT_SCENES.length; i += 1) assert.equal(GEOLINT_SCENES[i].start, GEOLINT_SCENES[i - 1].end)
  assert.equal(GEOLINT_SCENES.at(-1).end, GEOLINT_HOW_DURATION)
  assert.ok(GEOLINT_HOW_POSTER_T > GEOLINT_SCENES.at(-1).start && GEOLINT_HOW_POSTER_T < GEOLINT_HOW_DURATION)
})

test('scored scenes add up to 100 points', () => {
  assert.equal(GEOLINT_SCENES.reduce((sum, s) => sum + (s.points || 0), 0), 100)
})

test('the example in the video adds up to 79.9', () => {
  const src = readFileSync(new URL('../src/pages/public/tools/GeoLintExplainer.jsx', import.meta.url), 'utf8')
  const m = src.match(/EXAMPLE = \{ bots: ([\d.]+), js: ([\d.]+), answer: ([\d.]+), facts: ([\d.]+), total: ([\d.]+) \}/)
  assert.ok(m, 'EXAMPLE constant present')
  const [bots, js, answer, facts, total] = m.slice(1).map(Number)
  assert.equal(Math.round((bots + js + answer + facts) * 10) / 10, total)
  // 3 of 4 bots at 7.5 points each; JS gap 35% on the 20%-60% slope (25 -> 10)
  assert.equal(bots, 3 * 7.5)
  assert.equal(Math.round((25 - ((0.35 - 0.2) / 0.4) * 15) * 10) / 10, js)
  // facts tiles 5 + 4 + 6 + 2
  assert.equal(5 + 4 + 6 + 2, facts)
})

test('SEO title and description fit search limits', () => {
  assert.ok(GEOLINT_HOW_SEO.title.length <= 60, `title ${GEOLINT_HOW_SEO.title.length}`)
  assert.ok(GEOLINT_HOW_SEO.description.length >= 110 && GEOLINT_HOW_SEO.description.length <= 160, `desc ${GEOLINT_HOW_SEO.description.length}`)
  const seo = seoMetadata[GEOLINT_HOW_PATH]
  assert.equal(seo.canonical, 'https://nexorasolution.online/tools/geo-audit/how-it-works/')
  assert.equal(seo.robots, 'index,follow')
})

test('FAQ answers are direct and 30-60 words; schema mirrors the visible FAQ', () => {
  for (const f of GEOLINT_HOW_FAQS) {
    const n = words(f.answer)
    assert.ok(n >= 30 && n <= 60, `${f.question}: ${n} words`)
  }
  const schemas = geolintHowPageSchemas()
  assert.deepEqual(schemas.map((s) => s['@type']), ['VideoObject', 'FAQPage', 'BreadcrumbList'])
  assert.equal(schemas[1].mainEntity.length, GEOLINT_HOW_FAQS.length)
  assert.equal(schemas[0].contentUrl, 'https://nexorasolution.online/geolint-how-it-works.mp4')
  assert.equal(schemas[0].duration, `PT${GEOLINT_HOW_DURATION}S`)
  assert.equal(schemas[2].itemListElement.at(-1).item, 'https://nexorasolution.online/tools/geo-audit/how-it-works/')
})

test('page sections have unique ids and each opens with a paragraph', () => {
  const ids = GEOLINT_HOW_PAGE.sections.map((s) => s.id)
  assert.equal(new Set(ids).size, ids.length)
  for (const s of GEOLINT_HOW_PAGE.sections) assert.ok(s.blocks[0].p, `${s.id} opens with a direct paragraph`)
})

test('wired into router, sitemap, prerender and llms.txt', () => {
  const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
  assert.match(read('../src/AppRouter.jsx'), /tools\/geo-audit\/how-it-works/)
  assert.match(read('../scripts/generate-sitemap.mjs'), /GEOLINT_HOW_PATH/)
  assert.match(read('../scripts/prerender.mjs'), /geolintHowPageSchemas/)
  assert.match(read('../public/llms.txt'), /geo-audit\/how-it-works\//)
})

test('rendered video and poster exist and are web-sized', () => {
  const mp4 = readFileSync(new URL('../public/geolint-how-it-works.mp4', import.meta.url))
  const jpg = readFileSync(new URL('../public/geolint-how-it-works-poster.jpg', import.meta.url))
  assert.equal(mp4.subarray(4, 8).toString(), 'ftyp')
  assert.ok(mp4.length < 6_000_000, 'MP4 under 6 MB')
  assert.equal(jpg[0], 0xff)
  assert.equal(jpg[1], 0xd8)
})
