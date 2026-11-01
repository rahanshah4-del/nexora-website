import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('index.html starts the temp-mail config call and captcha script early, only on the tool page', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  assert.match(html, /p !== '\/tools\/temp-mail' && p !== '\/tools\/temp-mail\/'/)
  assert.match(html, /__tmEarly = \{ api: API, config: config \}/)
  assert.match(html, /id = 'tm-turnstile'/)
  assert.ok(html.indexOf('__tmEarly') < html.indexOf('src="/src/main.jsx"'), 'must run before the app bundle')
})

test('loadConfig reuses the early request instead of fetching again', async () => {
  let calls = 0
  globalThis.window = { __tmEarly: { api: 'https://nexora-temp-mail.rahanshah4.workers.dev', config: Promise.resolve({ domains: ['early.test'] }) } }
  globalThis.fetch = async () => { calls += 1; return { ok: true, status: 200, json: async () => ({ domains: ['late.test'] }) } }
  const { loadConfig } = await import('../src/pages/public/tools/tempMailClient.js')
  const cfg = await loadConfig()
  assert.deepEqual(cfg.domains, ['early.test'])
  assert.equal(calls, 0)
})
