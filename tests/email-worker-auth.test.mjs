/**
 * workers/nexora-email-api /send-email authorization: no more open relay.
 * A real RS256 key signs test Firebase ID tokens; fetch is stubbed for the
 * Google JWKS and Resend so nothing leaves the process.
 */
import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'

import worker, {
  ANON_RESET_PER_RECIPIENT_DAILY_LIMIT,
  USER_THIRD_PARTY_DAILY_LIMIT,
  singleRecipient,
} from '../workers/nexora-email-api/src/index.js'

const PROJECT = 'nexora-business-suite'
const ADMIN_UID = 'oR66tNaNw5Z5kXYdTa2Egco9Uv22'
const ORIGIN = 'https://nexorasolution.online'
const INTERNAL_KEY = 'k'.repeat(40)

const { privateKey, publicKey } = await webcrypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true,
  ['sign', 'verify'],
)
const jwk = { ...(await webcrypto.subtle.exportKey('jwk', publicKey)), kid: 'test-kid', alg: 'RS256', use: 'sig' }
const b64url = (input) => Buffer.from(input).toString('base64url')

async function idToken(sub, email, extra = {}) {
  const header = b64url(JSON.stringify({ alg: 'RS256', kid: 'test-kid', typ: 'JWT' }))
  const now = Math.floor(Date.now() / 1000)
  const payload = b64url(JSON.stringify({
    aud: PROJECT, iss: `https://securetoken.google.com/${PROJECT}`, sub, email, email_verified: false, iat: now, exp: now + 3600, ...extra,
  }))
  const sig = await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(`${header}.${payload}`))
  return `${header}.${payload}.${b64url(new Uint8Array(sig))}`
}

// Minimal D1 stand-in for the daily counters.
function fakeD1() {
  const counts = new Map()
  return {
    counts,
    prepare(sql) {
      return {
        bind(...args) { this.args = args; return this },
        async run() { return { success: true } },
        async first() {
          if (!sql.includes('email_send_counters')) return null
          const key = this.args[0]
          counts.set(key, (counts.get(key) || 0) + 1)
          return { count: counts.get(key) }
        },
      }
    },
  }
}

let sent
let realFetch
let env
beforeEach(() => {
  sent = []
  realFetch = globalThis.fetch
  globalThis.fetch = async (url, init = {}) => {
    const target = String(url)
    if (target.includes('googleapis.com/service_accounts')) return new Response(JSON.stringify({ keys: [jwk] }))
    if (target.startsWith('https://api.resend.com/emails')) {
      sent.push(JSON.parse(init.body))
      return new Response(JSON.stringify({ id: 'email_1' }))
    }
    throw new Error(`unexpected fetch ${target}`)
  }
  env = { RESEND_API_KEY: 're_test', FIREBASE_PROJECT_ID: PROJECT, INTERNAL_EMAIL_KEY: INTERNAL_KEY, EMAIL_DB: fakeD1() }
})
afterEach(() => { globalThis.fetch = realFetch })

function send(body, { token, origin = ORIGIN, internal, ip = '1.2.3.4' } = {}) {
  const headers = { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip }
  if (origin) headers.Origin = origin
  if (token) headers.Authorization = `Bearer ${token}`
  if (internal) headers['X-Nexora-Internal-Key'] = internal
  return worker.fetch(new Request('https://nexora-email-api.example/send-email', { method: 'POST', headers, body: JSON.stringify(body) }), env)
}

const phishing = { to: 'victim@example.com', subject: 'Your account is locked', html: '<a href="https://evil.example">Login</a>' }

test('anonymous raw HTML is refused even with an allowed Origin (the open relay)', async () => {
  const res = await send(phishing)
  assert.equal(res.status, 401)
  assert.equal(sent.length, 0)
})

test('anonymous may only send the password-reset template, with a link the worker builds', async () => {
  const res = await send({ to: 'Owner@Example.com', type: 'password_reset', data: { resetUrl: 'https://evil.example/steal' } })
  assert.equal(res.status, 200)
  assert.equal(sent.length, 1)
  assert.equal(sent[0].to, 'owner@example.com')
  assert.ok(sent[0].html.includes('https://nexorasolution.online/login?email=owner%40example.com'))
  assert.ok(!sent[0].html.includes('evil.example'))
  for (const type of ['welcome', 'otp_verification', 'upgrade_approved']) {
    assert.equal((await send({ to: 'owner@example.com', type })).status, 401, type)
  }
})

test('anonymous password resets are rate limited per recipient', async () => {
  for (let i = 0; i < ANON_RESET_PER_RECIPIENT_DAILY_LIMIT; i += 1) {
    assert.equal((await send({ to: 'owner@example.com', type: 'password_reset' }, { ip: `9.9.9.${i}` })).status, 200)
  }
  assert.equal((await send({ to: 'owner@example.com', type: 'password_reset' }, { ip: '9.9.9.99' })).status, 429)
})

test('a forged Origin without a token or key gets nothing', async () => {
  assert.equal((await send(phishing, { origin: 'https://evil.example' })).status, 403)
  assert.equal((await send({ to: 'x@example.com', type: 'password_reset' }, { origin: '' })).status, 403)
  assert.equal(sent.length, 0)
})

test('a signed-in user can email themselves anything (welcome, OTP, upgrade receipt)', async () => {
  const token = await idToken('user_abc', 'me@example.com')
  const res = await send({ to: 'ME@example.com', subject: 'Welcome', html: '<p>hi</p>' }, { token })
  assert.equal(res.status, 200)
  assert.equal(sent[0].tags[0].value, 'self')
  assert.equal(env.EMAIL_DB.counts.size, 0)
})

test('a signed-in user can email customers, tagged and capped per day', async () => {
  const token = await idToken('user_abc', 'me@example.com')
  const res = await send({ to: 'customer@example.com', subject: 'Invoice INV-1', html: '<p>invoice</p>' }, { token })
  assert.equal(res.status, 200)
  assert.equal(sent[0].headers['X-Nexora-Sender-Uid'], 'user_abc')
  for (let i = 1; i < USER_THIRD_PARTY_DAILY_LIMIT; i += 1) await send({ to: `c${i}@example.com`, subject: 's', html: 'h' }, { token })
  assert.equal((await send({ to: 'one-more@example.com', subject: 's', html: 'h' }, { token })).status, 429)
})

test('invalid or expired tokens are rejected', async () => {
  assert.equal((await send(phishing, { token: 'not.a.token' })).status, 401)
  const expired = await idToken('user_abc', 'me@example.com', { exp: Math.floor(Date.now() / 1000) - 10 })
  assert.equal((await send(phishing, { token: expired })).status, 401)
  const otherProject = await idToken('user_abc', 'me@example.com', { aud: 'someone-else' })
  assert.equal((await send(phishing, { token: otherProject })).status, 401)
  assert.equal(sent.length, 0)
})

test('the admin UID sends anything, uncapped; admin email on another UID is not admin', async () => {
  const admin = await idToken(ADMIN_UID, 'admin@nexora.com')
  assert.equal((await send(phishing, { token: admin })).status, 200)
  assert.equal(sent[0].tags[0].value, 'admin')
  const impostor = await idToken('impostorUid00000000000000001', 'admin@nexora.com', { email_verified: true })
  await send(phishing, { token: impostor })
  assert.equal(sent[1].tags[0].value, 'user')
})

test('Cloud Functions use the internal key; a wrong or missing key is not internal', async () => {
  assert.equal((await send(phishing, { internal: INTERNAL_KEY })).status, 200)
  assert.equal(sent[0].tags[0].value, 'internal')
  assert.equal((await send(phishing, { internal: 'wrong'.padEnd(40, 'x') })).status, 401)
  env.INTERNAL_EMAIL_KEY = ''
  assert.equal((await send(phishing, { internal: '' })).status, 401)
})

test('multiple or malformed recipients are refused', async () => {
  const token = await idToken(ADMIN_UID, 'admin@nexora.com')
  for (const to of ['a@example.com,b@example.com', 'a@example.com; b@example.com', 'Name <a@example.com>', 'not-an-email', '']) {
    assert.equal(singleRecipient(to), '', to)
    assert.equal((await send({ to, subject: 's', html: 'h' }, { token })).status, 400, to)
  }
})

test('admin-only endpoints use the UID, not the email', async () => {
  const impostor = await idToken('impostorUid00000000000000001', 'rahanshah2@gmail.com', { email_verified: true })
  const res = await worker.fetch(new Request('https://nexora-email-api.example/email-activity', { headers: { Origin: ORIGIN, Authorization: `Bearer ${impostor}` } }), env)
  assert.equal(res.status, 403)
})
