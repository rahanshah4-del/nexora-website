/** GeoLint report page: Fix Pack panel wiring. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const page = readFileSync(new URL('../src/pages/public/tools/GeoAuditReportPage.jsx', import.meta.url), 'utf8')

test('report shows the Fix Pack only when the engine sent one', () => {
  assert.match(page, /report\.fixPack && Array\.isArray\(report\.fixPack\.files\)/)
  assert.match(page, /\{fixPack \? \(/)
  assert.match(page, /<FixPackPanel pack=\{fixPack\} \/>/)
})

test('Fix Pack files can be copied and downloaded', () => {
  assert.match(page, /role="tablist"/)
  assert.match(page, /new Blob\(\[file\.code\]/)
  assert.match(page, /<CopyBlock snippet=/)
})
