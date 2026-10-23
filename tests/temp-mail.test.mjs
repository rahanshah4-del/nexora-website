import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  allowedDomains, buildMessageRecord, corsHeaders, isValidMessageId, parseAddress,
  publicMessage, randomId, randomLocalPart, sanitizeHtml, ttlSeconds,
} from '../workers/nexora-temp-mail/src/lib.js'
import { handleEmail, handleRequest } from '../workers/nexora-temp-mail/src/index.js'

const env = (extra = {}) => ({
  TEMP_MAIL_DOMAINS: 'mail.nexorasolution.us',
  ALLOWED_ORIGINS: 'https://nexorasolution.us',
  MESSAGE_TTL_SECONDS: '3600',
  TEMP_MAIL: fakeKv(),
  ...extra,
})

function fakeKv() {
  const store = new Map()
  return {
    store,
    async get(key, type) { const v = store.get(key)?.value; return v === undefined ? null : type === 'json' ? JSON.parse(v) : v },
    async put(key, value, opts) { store.set(key, { value, ttl: opts?.expirationTtl }) },
    async delete(key) { store.delete(key) },
    async list({ prefix }) { return { keys: [...store.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })) } },
  }
}

test('parseAddress accepts only our domains and sane local parts', () => {
  const d = ['mail.nexorasolution.us']
  assert.equal(parseAddress('Abc123@Mail.Nexorasolution.us', d).address, 'abc123@mail.nexorasolution.us')
  assert.equal(parseAddress('abc123@gmail.com', d), null)
  assert.equal(parseAddress('a@mail.nexorasolution.us', d), null)
  assert.equal(parseAddress('../x@mail.nexorasolution.us', d), null)
  assert.equal(parseAddress('no-at-sign', d), null)
})

test('random values have the expected shape', () => {
  assert.match(randomLocalPart(10), /^[a-z2-9]{10}$/)
  assert.ok(isValidMessageId(randomId()))
  assert.equal(isValidMessageId('../etc'), false)
})

test('ttl is clamped to KV minimum and one day', () => {
  assert.equal(ttlSeconds({ MESSAGE_TTL_SECONDS: '5' }), 60)
  assert.equal(ttlSeconds({ MESSAGE_TTL_SECONDS: '999999' }), 86400)
  assert.equal(ttlSeconds({}), 3600)
})

test('sanitizeHtml removes scripts, handlers, javascript urls and remote images', () => {
  const dirty = '<p onclick="x()">Hi</p><script>alert(1)</script><a href="javascript:alert(1)">l</a>'
    + '<img src="https://track.example/p.gif"><iframe src="//e"></iframe><style>body{background:url(https://t/x)}</style>'
    + '<form action="/x"><input name=a></form><svg onload=x()></svg>'
  const clean = sanitizeHtml(dirty)
  for (const bad of ['<script', 'onclick', 'javascript:', 'track.example', '<iframe', '<style', '<form', '<svg', 'onload']) {
    assert.ok(!clean.toLowerCase().includes(bad), `still contains ${bad}: ${clean}`)
  }
  assert.ok(clean.includes('Hi'))
})

test('buildMessageRecord truncates and never keeps attachments', () => {
  const rec = buildMessageRecord(
    { from: { name: 'N', address: 'a@b.c' }, subject: '', text: 'x'.repeat(50_000), html: '<p>h</p>', attachments: [{}, {}] },
    { id: 'abcdefghijkl', to: 't@mail.nexorasolution.us', receivedAt: '2026-10-23T00:00:00Z', rawSize: 100 },
  )
  assert.equal(rec.subject, '(no subject)')
  assert.equal(rec.attachmentCount, 2)
  assert.ok(rec.text.length <= 20_001)
  assert.equal('attachments' in rec, false)
  assert.equal(publicMessage(rec).html, '<p>h</p>')
})

test('cors only for allowed origins', () => {
  assert.deepEqual(corsHeaders('https://evil.example', ['https://nexorasolution.us']), {})
  assert.equal(corsHeaders('https://nexorasolution.us', ['https://nexorasolution.us'])['access-control-allow-origin'], 'https://nexorasolution.us')
  assert.deepEqual(allowedDomains({ TEMP_MAIL_DOMAINS: ' A.com , b.com ' }), ['a.com', 'b.com'])
})

test('API: create address, receive mail, list, read, delete', async () => {
  const e = env()
  const req = (path, init) => new Request(`https://api.test${path}`, init)
  const created = await (await handleRequest(req('/api/address', { method: 'POST', headers: { 'cf-connecting-ip': '1.1.1.1' } }), e)).json()
  assert.match(created.address, /^[a-z2-9]{10}@mail\.nexorasolution\.us$/)

  const raw = 'From: Sender <s@example.com>\r\nTo: ' + created.address + '\r\nSubject: Verify your account\r\nContent-Type: text/plain\r\n\r\nYour code is 123456\r\n'
  const stream = new Response(raw).body
  let rejected = null
  await handleEmail({ to: created.address, rawSize: raw.length, raw: stream, setReject: (m) => { rejected = m } }, e)
  assert.equal(rejected, null)

  const list = await (await handleRequest(req(`/api/inbox/${encodeURIComponent(created.address)}`), e)).json()
  assert.equal(list.messages.length, 1)
  assert.equal(list.messages[0].subject, 'Verify your account')
  assert.match(list.messages[0].preview, /123456/)
  const ttl = [...e.TEMP_MAIL.store.values()].find((v) => v.ttl === 3600)
  assert.ok(ttl, 'message stored with a TTL')

  const one = await (await handleRequest(req(`/api/inbox/${encodeURIComponent(created.address)}/${list.messages[0].id}`), e)).json()
  assert.match(one.message.text, /123456/)

  const del = await handleRequest(req(`/api/inbox/${encodeURIComponent(created.address)}/${list.messages[0].id}`, { method: 'DELETE' }), e)
  assert.equal(del.status, 200)
  const after = await (await handleRequest(req(`/api/inbox/${encodeURIComponent(created.address)}`), e)).json()
  assert.equal(after.messages.length, 0)
})

test('oversized mail and invalid temp-mail recipients are rejected', async () => {
  const e = env({ FORWARD_TO: 'owner@example.com' })
  let reason = null
  await handleEmail({ to: 'a@mail.nexorasolution.us', rawSize: 10, raw: new Response('x').body, setReject: (m) => { reason = m }, forward: async () => {} }, e)
  assert.equal(reason, 'Unknown recipient')
  reason = null
  await handleEmail({ to: 'abcdef@mail.nexorasolution.us', rawSize: 600 * 1024, raw: new Response('x').body, setReject: (m) => { reason = m }, forward: async () => {} }, e)
  assert.equal(reason, 'Message too large')
})

test('mail for the real domain is forwarded untouched, never stored', async () => {
  const e = env({ FORWARD_TO: 'owner@example.com' })
  const forwarded = []
  const msg = (to) => ({ to, rawSize: 10, raw: new Response('x').body, setReject: () => { throw new Error('rejected') }, forward: async (a) => { forwarded.push(a) } })
  await handleEmail(msg('info@nexorasolution.us'), e)
  await handleEmail(msg('someone@other.nexorasolution.us'), e)
  assert.deepEqual(forwarded, ['owner@example.com', 'owner@example.com'])
  assert.equal(e.TEMP_MAIL.store.size, 0)
})

test('real mail is rejected loudly only when FORWARD_TO is missing', async () => {
  const e = env({ FORWARD_TO: '' })
  let reason = null
  await handleEmail({ to: 'info@nexorasolution.us', rawSize: 1, raw: new Response('x').body, setReject: (m) => { reason = m }, forward: async () => {} }, e)
  assert.equal(reason, 'Mailbox unavailable')
})

test('a temp-mail storage failure never throws and never forwards', async () => {
  const e = env({ FORWARD_TO: 'owner@example.com' })
  e.TEMP_MAIL.list = async () => { throw new Error('kv down') }
  let forwarded = false
  await handleEmail({ to: 'abcdef@mail.nexorasolution.us', rawSize: 10, raw: new Response('x').body, setReject: () => {}, forward: async () => { forwarded = true } }, e)
  assert.equal(forwarded, false)
})

test('address creation is rate limited per IP', async () => {
  const e = env()
  let last
  for (let i = 0; i < 11; i++) last = await handleRequest(new Request('https://api.test/api/address', { method: 'POST', headers: { 'cf-connecting-ip': '9.9.9.9' } }), e)
  assert.equal(last.status, 429)
})

test('bad addresses and ids are refused', async () => {
  const e = env()
  assert.equal((await handleRequest(new Request('https://api.test/api/inbox/x@gmail.com'), e)).status, 400)
  assert.equal((await handleRequest(new Request('https://api.test/api/inbox/abcdef%40mail.nexorasolution.us/..%2F..'), e)).status, 400)
  assert.equal((await handleRequest(new Request('https://api.test/nope'), e)).status, 404)
})
