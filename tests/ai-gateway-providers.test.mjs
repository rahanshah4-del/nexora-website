/**
 * AI Gateway provider configuration and health reporting.
 *
 * Production returned 502 on every POST /chat while GET /health said "healthy":
 * deepseek was out of balance, the hardcoded gemini-2.0-flash had been retired
 * by Google, and openai/claude had no keys at all — yet all four looked like
 * equal "errors" in the fallback chain. These tests pin the distinction between
 * "not configured" (a deployment gap) and "failed" (a real outage), and that no
 * Gemini model id is hardcoded any more.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  configuredProviders,
  providerApiKey,
  providerModel,
  providerUnavailable,
  redactKeys,
  unconfiguredProviders,
} from '../workers/nexora-ai-gateway/src/index.js'

// What the deployed worker actually has today: two keys, no gemini model id yet.
const LIVE_ENV = { DEEPSEEK_API_KEY: 'ds-test', GEMINI_API_KEY: 'gm-test' }

test('a provider needs both a key and a model id before it is called', () => {
  assert.equal(providerUnavailable('deepseek', LIVE_ENV), '')
  assert.equal(providerUnavailable('openai', LIVE_ENV), 'OPENAI_API_KEY not configured')
  assert.equal(providerUnavailable('claude', LIVE_ENV), 'CLAUDE_API_KEY not configured')
  // Key present, model id missing — the exact state that produced 404s.
  assert.equal(providerUnavailable('gemini', LIVE_ENV), 'GEMINI_MODEL not configured')
  assert.equal(providerUnavailable('gemini', { ...LIVE_ENV, GEMINI_MODEL: 'some-flash' }), '')
  assert.equal(providerUnavailable('nope', LIVE_ENV), 'unknown provider')
})

test('unconfigured providers are listed separately, not as errors', () => {
  assert.deepEqual(configuredProviders(LIVE_ENV), ['deepseek'])
  assert.deepEqual(unconfiguredProviders(LIVE_ENV), [
    { provider: 'openai', reason: 'OPENAI_API_KEY not configured' },
    { provider: 'gemini', reason: 'GEMINI_MODEL not configured' },
    { provider: 'claude', reason: 'CLAUDE_API_KEY not configured' },
  ])
  // With a gemini model set, gemini joins the usable set.
  assert.deepEqual(configuredProviders({ ...LIVE_ENV, GEMINI_MODEL: 'some-flash' }), ['deepseek', 'gemini'])
  // Nothing configured at all is reported as such rather than crashing.
  assert.deepEqual(configuredProviders({}), [])
  assert.equal(unconfiguredProviders({}).length, 4)
})

test('no Gemini model id is hardcoded anywhere in the worker', () => {
  const source = readFileSync(
    new URL('../workers/nexora-ai-gateway/src/index.js', import.meta.url),
    'utf8',
  )
  // The retired id may only appear inside an explanatory comment.
  for (const line of source.split('\n')) {
    const code = line.replace(/\/\/.*$/, '')
    assert.ok(
      !/gemini-\d[\w.-]*/.test(code),
      `hardcoded Gemini model id in code: ${line.trim()}`,
    )
  }
  assert.equal(providerModel('gemini', {}), '', 'gemini must have no built-in default')
  // The other providers keep working defaults.
  assert.equal(providerModel('openai', {}), 'gpt-4o-mini')
  assert.equal(providerModel('deepseek', {}), 'deepseek-v4-flash')
})

test('<PROVIDER>_MODEL overrides the built-in default', () => {
  assert.equal(providerModel('deepseek', { DEEPSEEK_MODEL: 'deepseek-other' }), 'deepseek-other')
  assert.equal(providerModel('openai', { OPENAI_MODEL: '  gpt-x  ' }), 'gpt-x', 'trimmed')
  assert.equal(providerModel('openai', { OPENAI_MODEL: '' }), 'gpt-4o-mini', 'empty falls back')
})

test('api keys are read per provider and never cross over', () => {
  assert.equal(providerApiKey('deepseek', LIVE_ENV), 'ds-test')
  assert.equal(providerApiKey('gemini', LIVE_ENV), 'gm-test')
  assert.equal(providerApiKey('openai', LIVE_ENV), null)
})

test('upstream error text is redacted before it leaves the worker', () => {
  assert.equal(redactKeys('GET /v1beta/models?key=AIzaSyVerySecret123456 failed'), 'GET /v1beta/models?key=[redacted] failed')
  assert.equal(redactKeys('Authorization: sk-proj-abcdefghijklmnopqrst'), 'Authorization: [redacted]')
  assert.match(redactKeys('models/x is no longer available'), /no longer available/, 'ordinary text survives')
  assert.equal(redactKeys(undefined), '')
  assert.equal(redactKeys(null), '')
})

test('wrangler.toml documents GEMINI_MODEL instead of shipping a guess', () => {
  const toml = readFileSync(
    new URL('../workers/nexora-ai-gateway/wrangler.toml', import.meta.url),
    'utf8',
  )
  assert.match(toml, /^GEMINI_MODEL\s*=\s*""$/m, 'declared and intentionally empty')
  assert.match(toml, /health\?deep=1/, 'points at the discovery endpoint')
})

test('plain /health makes no upstream calls', async () => {
  const { default: worker } = await import('../workers/nexora-ai-gateway/src/index.js')
  const fetchSpy = () => { throw new Error('plain /health must not call any provider') }
  const originalFetch = globalThis.fetch
  globalThis.fetch = fetchSpy
  try {
    const res = await worker.fetch(
      new Request('https://gw.test/health'),
      { ...LIVE_ENV },
      { waitUntil() {} },
    )
    const body = await res.json()
    assert.equal(res.status, 200)
    assert.equal(body.checked, 'shallow')
    assert.deepEqual(body.configured, ['deepseek'])
    assert.equal(body.notConfigured.length, 3)
    assert.match(body.hint, /deep=1/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('deep /health reports per-provider results and never leaks a key', async () => {
  const { default: worker } = await import('../workers/nexora-ai-gateway/src/index.js')
  const originalFetch = globalThis.fetch
  const calls = []
  globalThis.fetch = async (url) => {
    calls.push(String(url))
    // deepseek is out of balance, exactly as production reported.
    return new Response(JSON.stringify({ error: { message: 'Insufficient Balance' } }), { status: 402 })
  }
  try {
    const res = await worker.fetch(
      new Request('https://gw.test/health?deep=1'),
      { ...LIVE_ENV, GEMINI_MODEL: 'some-flash' },
      { waitUntil() {} },
    )
    const body = await res.json()
    const raw = JSON.stringify(body)

    assert.equal(body.checked, 'deep')
    assert.equal(body.status, 'unhealthy', 'nothing answered, so not "healthy"')
    assert.equal(res.status, 503)
    assert.deepEqual(body.working, [])
    assert.deepEqual(body.failing.sort(), ['deepseek', 'gemini'])
    assert.deepEqual(body.notConfigured.sort(), ['claude', 'openai'])

    const deepseek = body.providers.find((p) => p.provider === 'deepseek')
    assert.equal(deepseek.status, 'error')
    assert.match(deepseek.error, /402/)
    const openai = body.providers.find((p) => p.provider === 'openai')
    assert.equal(openai.status, 'not_configured')
    assert.equal(openai.reason, 'OPENAI_API_KEY not configured')

    assert.ok(!raw.includes('ds-test'), 'deepseek key must not appear')
    assert.ok(!raw.includes('gm-test'), 'gemini key must not appear')
    assert.ok(calls.length >= 2, 'one probe per configured provider')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('/chat answers 503, not 502, when nothing is configured', async () => {
  const { default: worker } = await import('../workers/nexora-ai-gateway/src/index.js')
  const originalFetch = globalThis.fetch
  globalThis.fetch = () => { throw new Error('must not call a provider when none is configured') }
  try {
    const res = await worker.fetch(
      new Request('https://gw.test/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
      }),
      {},
      { waitUntil() {} },
    )
    const body = await res.json()
    assert.equal(res.status, 503)
    assert.equal(body.error, 'no_provider_configured')
    assert.equal(body.notConfigured.length, 4)
  } finally {
    globalThis.fetch = originalFetch
  }
})
