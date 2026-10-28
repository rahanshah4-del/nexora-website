import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ACCESS_GUIDES, accessGuideHref, guideById, guideForPlatform } from '../src/lib/geolintAccessGuide.js'
import { ACCESS_OPTIONS, PLATFORM_OPTIONS } from '../src/lib/geolintFix.js'

test('every wizard platform has a guide, and guides only use known access methods', () => {
  for (const p of PLATFORM_OPTIONS) assert.ok(guideForPlatform(p.value), `no guide for ${p.value}`)
  for (const g of ACCESS_GUIDES) {
    assert.ok(ACCESS_OPTIONS.some((o) => o.value === g.access), `${g.id}: unknown access ${g.access}`)
    assert.ok(g.steps.length >= 3 && g.remove && g.role && g.tip, `${g.id}: incomplete`)
    assert.ok(!/password\s*(is|=|:)/i.test(g.steps.join(' ')), `${g.id}: must never ask for a password`)
  }
  assert.equal(new Set(ACCESS_GUIDES.map((g) => g.id)).size, ACCESS_GUIDES.length)
})

test('the guide link preselects the chosen platform', () => {
  assert.equal(accessGuideHref('/g', 'shopify'), '/g?p=shopify')
  assert.equal(accessGuideHref('/g', 'other'), '/g?p=unsure')
  assert.equal(accessGuideHref('/g', ''), '/g')
  assert.equal(guideById('nope'), null)
})
