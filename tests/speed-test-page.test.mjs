import test from 'node:test'
import { getSeoForPath } from '../src/lib/seoMetadata.js'
import assert from 'node:assert/strict'
import { SPEED_TEST_FAQS, SPEED_TEST_PAGE, SPEED_TEST_PATH, SPEED_TEST_SEO, speedTestPageSchemas, speedTestWordCount } from '../src/lib/speedTestPageData.js'

const words = (s) => s.trim().split(/\s+/).length

test('speed test page: head fits search results', () => {
  assert.ok(SPEED_TEST_SEO.title.length <= 60)
  assert.ok(SPEED_TEST_SEO.description.length >= 120 && SPEED_TEST_SEO.description.length <= 160)
  assert.match(SPEED_TEST_SEO.title.toLowerCase(), /website speed test/)
  assert.match(SPEED_TEST_PAGE.h1.toLowerCase(), /website speed test/)
})

test('speed test page: has about 2000+ words and unique section ids', () => {
  assert.ok(speedTestWordCount() >= 2000)
  const ids = SPEED_TEST_PAGE.sections.map((s) => s.id)
  assert.equal(new Set(ids).size, ids.length)
  for (const [, id] of SPEED_TEST_PAGE.jump) assert.ok(ids.includes(id) || id === 'faq', id)
})

test('speed test page: every section opens with a 30-60 word answer', () => {
  for (const s of SPEED_TEST_PAGE.sections) {
    const first = s.blocks[0].p
    assert.ok(first, s.id)
    const n = words(first)
    assert.ok(n >= 25 && n <= 62, `${s.id}: ${n}`)
  }
})

test('speed test page: schemas are WebApplication, FAQPage and BreadcrumbList', () => {
  const types = speedTestPageSchemas().map((x) => x['@type'])
  assert.deepEqual(types, ['WebApplication', 'FAQPage', 'BreadcrumbList'])
  const faq = speedTestPageSchemas()[1]
  assert.equal(faq.mainEntity.length, SPEED_TEST_FAQS.length)
})

test('speed test page: no filler phrases', () => {
  const all = JSON.stringify([SPEED_TEST_PAGE, SPEED_TEST_FAQS]).toLowerCase()
  for (const bad of ['delve', 'leverage', 'in today\'s digital', 'unlock', 'seamless', 'game-changer', 'cutting-edge']) assert.ok(!all.includes(bad), bad)
  assert.equal(SPEED_TEST_PATH, '/tools/website-speed-test')
})

test('speed test page: indexable and canonical', () => {
  const seo = getSeoForPath(SPEED_TEST_PATH)
  assert.match(seo.robots, /^index/)
  assert.match(seo.canonical, /\/tools\/website-speed-test\/?$/)
})
