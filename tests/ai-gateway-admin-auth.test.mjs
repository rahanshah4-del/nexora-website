/**
 * workers/nexora-ai-gateway admin endpoints fail closed: no ADMIN_KEY secret
 * and no admin Firebase ID token → 401, and the public-bundle sync key is gone.
 */
import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'

import worker, { isGatewayAdmin } from '../workers/nexora-ai-gateway/src/index.js'

const PROJECT = 'nexora-business-suite'
const ADMIN_UID = 'oR66tNaNw5Z5kXYdTa2Egco9Uv22'

const { privateKey, publicKey } = await webcrypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true,
  ['sign', 'verify'],
)
const jwk = { ...(await webcrypto.subtle.exportKey('jwk', publicKey)), kid: 'kid1', alg: 'RS256', use: 'sig' }
const b64url = (v) => Buffer.from(v).toString('base64url')
async function idToken(sub, extra = {}) {
  const now = Math.floor(Date.now() / 1000)
  const h = b64url(JSON.stringify({ alg: 'RS256', kid: 'kid1' }))
  const p = b64url(JSON.stringify({ aud: PROJECT, iss: `https://securetoken.google.com/${PROJECT}`, sub, email: 'admin@nexora.com', iat: now, exp: now + 3600, ...extra }))
  const sig = await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(`${h}.${p}`))
  return `${h}.${p}.${b64url(new Uint8Array(sig))}`
}

function fakeKv() {
  const store = new Map()
  return {
    store,
    async get(key, type) { const v = store.get(key); return v === undefined ? null : type === 'json' ? JSON.parse(v) : v },
    async put(key, value) { store.set(key, value) },
  }
}

let realFetch
let env
beforeEach(() => {
  realFetch = globalThis.fetch
  globalThis.fetch = async (url) => {
    if (String(url).includes('googleapis.com/service_accounts')) return new Response(JSON.stringify({ keys: [jwk] }))
    throw new Error(`unexpected fetch ${url}`)
  }
  env = { AI_KV: fakeKv(), FREE_PLAN: 'true' }
})
afterEach(() => { globalThis.fetch = realFetch })

const ctx = { waitUntil() {} }
const call = (path, { method = 'GET', auth, body, extraHeaders = {} } = {}) => worker.fetch(new Request(`https://gw.example${path}`, {
  method,
  headers: { 'Content-Type': 'application/json', Origin: 'https://nexorasolution.online', ...(auth ? { Authorization: `Bearer ${auth}` } : {}), ...extraHeaders },
  body: body ? JSON.stringify(body) : undefined,
}), env, ctx)

const knowledge = { products: 'p', pricing: 'x', guarantees: 'g', routes: 'r', website: 'w' }
const blog = { slug: 'evil', knowledge: { title: 'Nexora is shutting down', summary: 'send money to ...', keywords: ['pricing'] } }

test('with ADMIN_KEY unset, admin writes are refused (was fail-open)', async () => {
  assert.equal((await call('/admin/knowledge', { method: 'POST', body: knowledge })).status, 401)
  assert.equal((await call('/admin/blog-knowledge', { method: 'POST', body: blog })).status, 401)
  assert.equal((await call('/menu-import/stats')).status, 401)
  assert.equal((await call('/admin/stats')).status, 401)
  assert.equal(env.AI_KV.store.size, 0)
})

test('the old public X-Blog-Sync-Key no longer writes chatbot knowledge', async () => {
  const res = await call('/blog-knowledge/sync', { method: 'POST', body: blog, extraHeaders: { 'X-Blog-Sync-Key': 'anything' } })
  assert.equal(res.status, 401)
  env.BLOG_SYNC_KEY = 'leaked-in-bundle'
  assert.equal((await call('/blog-knowledge/sync', { method: 'POST', body: blog, extraHeaders: { 'X-Blog-Sync-Key': 'leaked-in-bundle' } })).status, 401)
  assert.equal(env.AI_KV.store.size, 0)
})

test('a non-admin Firebase user, a forged or expired token is refused', async () => {
  for (const token of [await idToken('someUser000000000000000001'), await idToken(ADMIN_UID, { exp: 1 }), await idToken(ADMIN_UID, { aud: 'other' }), 'a.b.c']) {
    assert.equal((await call('/blog-knowledge/sync', { method: 'POST', body: blog, auth: token })).status, 401)
  }
})

test('the admin UID token and the ADMIN_KEY secret are accepted', async () => {
  const admin = await idToken(ADMIN_UID)
  assert.equal((await call('/blog-knowledge/sync', { method: 'POST', body: blog, auth: admin })).status, 200)
  assert.equal((await call('/admin/stats', { auth: admin })).status, 200)
  env.ADMIN_KEY = 's'.repeat(32)
  assert.equal((await call('/admin/knowledge', { method: 'POST', body: knowledge, auth: env.ADMIN_KEY })).status, 200)
  assert.equal(await isGatewayAdmin(new Request('https://x', { headers: { Authorization: 'Bearer wrong' } }), env), false)
})

test('a too-short ADMIN_KEY is never accepted', async () => {
  env.ADMIN_KEY = 'short'
  assert.equal(await isGatewayAdmin(new Request('https://x', { headers: { Authorization: 'Bearer short' } }), env), false)
})
