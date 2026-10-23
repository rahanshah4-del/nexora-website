import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { handleCspReport, CSP_REPORT_MAX_BYTES } from '../worker/index.js'

const headers = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8')

test('every _headers line stays under the Cloudflare 2000 character limit', () => {
  for (const [i, line] of headers.split('\n').entries()) {
    assert.ok(line.length < 2000, `line ${i + 1} is ${line.length} chars`)
  }
})

test('CSP is report-only and points at /csp-report', () => {
  assert.match(headers, /^\s+Content-Security-Policy-Report-Only: /m)
  assert.doesNotMatch(headers, /^\s+Content-Security-Policy: /m)
  assert.match(headers, /report-uri \/csp-report/)
  assert.match(headers, /Reporting-Endpoints: csp="\/csp-report"/)
})

test('policy keeps the safety directives and key third parties', () => {
  const policy = headers.match(/Content-Security-Policy-Report-Only: (.+)/)[1]
  for (const part of ["object-src 'none'", "base-uri 'self'", "frame-ancestors 'self'", 'googletagmanager.com', 'clarity.ms', 'tawk.to', 'paddle.com', 'firebaseio.com']) {
    assert.ok(policy.includes(part), `missing ${part}`)
  }
})

test('POST /csp-report is logged (truncated) and answered 204', async () => {
  const logged = []
  const body = 'x'.repeat(CSP_REPORT_MAX_BYTES + 500)
  const res = await handleCspReport(new Request('https://nexorasolution.us/csp-report', { method: 'POST', body }), (...a) => logged.push(a))
  assert.equal(res.status, 204)
  assert.equal(logged.length, 1)
  assert.equal(logged[0][1].length, CSP_REPORT_MAX_BYTES)
})

test('other methods get 405 and other paths fall through', async () => {
  const get = await handleCspReport(new Request('https://nexorasolution.us/csp-report'))
  assert.equal(get.status, 405)
  assert.equal(await handleCspReport(new Request('https://nexorasolution.us/blog/', { method: 'POST' })), null)
})
