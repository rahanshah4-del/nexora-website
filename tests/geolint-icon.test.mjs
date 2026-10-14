import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

test('GeoLintIcon is decorative and derives unique gradient ids per instance', () => {
  const src = read('src/components/brand/GeoLintIcon.jsx')
  assert.match(src, /aria-hidden="true"/)
  assert.match(src, /useId\(\)/)
  assert.ok(!/id="gli-/.test(src), 'no hard-coded gradient ids')
  assert.match(read('src/index.css'), /prefers-reduced-motion: reduce\) \{ \.gl-icon-sweep/)
})

test('Header features GeoLint only behind its launch switch', () => {
  const src = read('src/components/Header.jsx')
  assert.match(src, /GEOLINT_LAUNCHED && toolLinks\.length > 0/)
  assert.equal((src.match(/showGeoLint \?/g) || []).length >= 2, true)
})
