/** Report page accessibility fixes found by the axe-core audit; these keep them from coming back. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

test('cards are dark in dark mode, so the light text stays readable', () => {
  assert.match(read('src/pages/public/tools/geolint.css'), /html\.public-dark \.gl-card\s*\{[^}]*background:\s*#121826/)
})

test('printing hides the site chrome and does not clip code', () => {
  const css = read('src/pages/public/tools/geolint.css')
  assert.match(css, /@media print\s*\{[^}]*header, footer, nav, button/s)
  assert.match(css, /@media print[\s\S]*pre\s*\{[^}]*overflow:\s*visible/)
})

test('scrollable code blocks can be reached with the keyboard', () => {
  for (const f of ['GeoAuditReportPage', 'GeoLintHealth', 'GeoLintSite', 'GeoLintExtras']) {
    const src = read(`src/pages/public/tools/${f}.jsx`)
    for (const m of src.matchAll(/<pre\b[^>]*>/g)) assert.match(m[0], /tabIndex=\{0\}/, `${f}: ${m[0]}`)
  }
})

test('the report headings do not skip a level under the page title', () => {
  const src = read('src/pages/public/tools/GeoAuditReportPage.jsx')
  assert.match(src, /<h2[^>]*>\{moduleLabel\(id\)\}<\/h2>/)
  assert.doesNotMatch(src, /<h3[^>]*>\{moduleLabel\(id\)\}<\/h3>/)
})

test('menu arrow buttons are at least 24px wide (WCAG 2.2 target size)', () => {
  const src = read('src/components/Header.jsx')
  for (const m of src.matchAll(/data-nav-trigger="[^"]+"[\s\S]{0,900}?className=\{`([^`]*)`/g)) if (/w-6\b/.test(m[1])) assert.match(m[1], /min-w-\[24px\]/)
})
