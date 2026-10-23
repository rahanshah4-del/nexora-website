import test from 'node:test'
import assert from 'node:assert/strict'
import { noindexPagePaths } from '../src/config/noindexPages.js'
import { TEMP_MAIL_PATH, TEMP_MAIL_LAUNCHED, TEMP_MAIL_SEO, TEMP_MAIL_CONTENT, tempMailPageSchemas } from '../src/lib/tempMailData.js'
import { getSeoForPath } from '../src/lib/seoMetadata.js'

test('temp mail stays noindex until its own launch switch is on', () => {
  assert.equal(noindexPagePaths(true).has(TEMP_MAIL_PATH), !TEMP_MAIL_LAUNCHED)
  assert.equal(noindexPagePaths(false).has(TEMP_MAIL_PATH), true)
})

test('temp mail SEO metadata follows the noindex rule', () => {
  const seo = getSeoForPath(TEMP_MAIL_PATH)
  assert.equal(seo.title, TEMP_MAIL_SEO.title)
  assert.equal(/noindex/.test(seo.robots), !TEMP_MAIL_LAUNCHED)
})

test('temp mail copy is consistent and schema is valid', () => {
  assert.ok(TEMP_MAIL_SEO.title.length <= 65)
  assert.ok(TEMP_MAIL_SEO.description.length <= 160)
  const types = tempMailPageSchemas().map((s) => s['@type'])
  assert.deepEqual(types, ['WebApplication', 'FAQPage', 'BreadcrumbList'])
  assert.ok(TEMP_MAIL_CONTENT.faqs.length >= 15)
  assert.ok(TEMP_MAIL_CONTENT.devSection.steps.length >= 5)
  assert.ok(TEMP_MAIL_CONTENT.devSection.scenarios.length >= 6)
  const all = JSON.stringify(TEMP_MAIL_CONTENT).toLowerCase()
  // the page must not promise features the tool does not have
  assert.ok(!all.includes("rest api"))
  assert.ok(all.includes('no public api'))
})
