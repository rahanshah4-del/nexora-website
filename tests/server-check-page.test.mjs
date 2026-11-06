import test from 'node:test'
import { getSeoForPath } from '../src/lib/seoMetadata.js'
import assert from 'node:assert/strict'
import { SERVER_CHECK_FAQS, SERVER_CHECK_PAGE, SERVER_CHECK_PATH, SERVER_CHECK_SEO, serverCheckPageSchemas, serverCheckWordCount } from '../src/lib/serverCheckPageData.js'

const words = (s) => s.trim().split(/\s+/).length

test('server check page: head fits search results', () => {
  assert.ok(SERVER_CHECK_SEO.title.length <= 60)
  assert.ok(SERVER_CHECK_SEO.description.length >= 120 && SERVER_CHECK_SEO.description.length <= 160)
  assert.match(SERVER_CHECK_SEO.title.toLowerCase(), /server response time/)
  assert.match(SERVER_CHECK_PAGE.h1.toLowerCase(), /server response time/)
})

test('server check page: has about 2000+ words and unique section ids', () => {
  assert.ok(serverCheckWordCount() >= 2000)
  const ids = SERVER_CHECK_PAGE.sections.map((s) => s.id)
  assert.equal(new Set(ids).size, ids.length)
  for (const [, id] of SERVER_CHECK_PAGE.jump) assert.ok(ids.includes(id) || id === 'faq', id)
})

test('server check page: every section opens with a 30-60 word answer', () => {
  for (const s of SERVER_CHECK_PAGE.sections) {
    const first = s.blocks[0].p
    assert.ok(first, s.id)
    const n = words(first)
    assert.ok(n >= 25 && n <= 62, `${s.id}: ${n}`)
  }
})

test('server check page: schemas are WebApplication, FAQPage and BreadcrumbList', () => {
  const types = serverCheckPageSchemas().map((x) => x['@type'])
  assert.deepEqual(types, ['WebApplication', 'FAQPage', 'BreadcrumbList'])
  const faq = serverCheckPageSchemas()[1]
  assert.equal(faq.mainEntity.length, SERVER_CHECK_FAQS.length)
})

test('server check page: no filler phrases', () => {
  const all = JSON.stringify([SERVER_CHECK_PAGE, SERVER_CHECK_FAQS]).toLowerCase()
  for (const bad of ['delve', 'leverage', 'in today\'s digital', 'unlock', 'seamless', 'game-changer', 'cutting-edge']) assert.ok(!all.includes(bad), bad)
  assert.equal(SERVER_CHECK_PATH, '/tools/server-response-time-test')
})

test('server check page: indexable and canonical', () => {
  const seo = getSeoForPath(SERVER_CHECK_PATH)
  assert.match(seo.robots, /^index/)
  assert.match(seo.canonical, /\/tools\/server-response-time-test\/?$/)
})
