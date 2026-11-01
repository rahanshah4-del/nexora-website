import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchWithWarmup, shouldRetryResponse } from '../src/lib/geolint.js'

const resp = (status, contentType = 'text/plain') => ({
  status,
  ok: status >= 200 && status < 300,
  headers: { get: (name) => (name.toLowerCase() === 'content-type' ? contentType : null) },
})

const noWait = async () => {}

function stubFetch(sequence) {
  const calls = []
  const original = globalThis.fetch
  globalThis.fetch = async (...args) => {
    calls.push(args)
    const next = sequence[Math.min(calls.length - 1, sequence.length - 1)]
    if (next instanceof Error) throw next
    return next
  }
  return { calls, restore: () => { globalThis.fetch = original } }
}

test('shouldRetryResponse: Cloud Run 429 is retried, an engine JSON 429 is final', () => {
  assert.equal(shouldRetryResponse(resp(429)), true)
  assert.equal(shouldRetryResponse(resp(429, 'application/json')), false)
})

test('shouldRetryResponse: 502/503/504 only retried for idempotent requests', () => {
  assert.equal(shouldRetryResponse(resp(503), { idempotent: true }), true)
  assert.equal(shouldRetryResponse(resp(503), { idempotent: false }), false)
  assert.equal(shouldRetryResponse(resp(503, 'application/json'), { idempotent: true }), false)
  assert.equal(shouldRetryResponse(resp(404), { idempotent: true }), false)
})

test('fetchWithWarmup waits out a cold start (network error, then 429, then success)', async () => {
  const stub = stubFetch([new TypeError('Failed to fetch'), resp(429), resp(200, 'application/json')])
  try {
    const waits = []
    const res = await fetchWithWarmup('https://x/api', { method: 'GET' }, { sleepFn: async (ms) => { waits.push(ms) } })
    assert.equal(res.status, 200)
    assert.equal(stub.calls.length, 3)
    assert.deepEqual(waits, [3000, 6000])
  } finally { stub.restore() }
})

test('fetchWithWarmup gives up after 4 retries and returns the last response', async () => {
  const stub = stubFetch([resp(429)])
  try {
    const res = await fetchWithWarmup('https://x/api', { method: 'GET' }, { sleepFn: noWait })
    assert.equal(res.status, 429)
    assert.equal(stub.calls.length, 5)
  } finally { stub.restore() }
})

test('fetchWithWarmup rethrows the network error after the last retry', async () => {
  const stub = stubFetch([new TypeError('Failed to fetch')])
  try {
    await assert.rejects(fetchWithWarmup('https://x/api', {}, { sleepFn: noWait }), TypeError)
    assert.equal(stub.calls.length, 5)
  } finally { stub.restore() }
})

test('fetchWithWarmup never retries a POST on 503 (no duplicate orders) but does on 429', async () => {
  const stub503 = stubFetch([resp(503), resp(200, 'application/json')])
  try {
    const res = await fetchWithWarmup('https://x/api/orders', { method: 'POST', body: '{}' }, { sleepFn: noWait })
    assert.equal(res.status, 503)
    assert.equal(stub503.calls.length, 1)
  } finally { stub503.restore() }
  const stub429 = stubFetch([resp(429), resp(200, 'application/json')])
  try {
    const res = await fetchWithWarmup('https://x/api/orders', { method: 'POST', body: '{}' }, { sleepFn: noWait })
    assert.equal(res.status, 200)
    assert.equal(stub429.calls.length, 2)
  } finally { stub429.restore() }
})

test('fetchWithWarmup does not retry an engine answer or an abort', async () => {
  const stubJson = stubFetch([resp(429, 'application/json')])
  try {
    const res = await fetchWithWarmup('https://x/api', {}, { sleepFn: noWait })
    assert.equal(res.status, 429)
    assert.equal(stubJson.calls.length, 1)
  } finally { stubJson.restore() }
  const abort = Object.assign(new Error('aborted'), { name: 'AbortError' })
  const stubAbort = stubFetch([abort])
  try {
    await assert.rejects(fetchWithWarmup('https://x/api', {}, { sleepFn: noWait }), { name: 'AbortError' })
    assert.equal(stubAbort.calls.length, 1)
  } finally { stubAbort.restore() }
})
