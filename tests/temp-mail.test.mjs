import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  allowedDomains, buildMessageRecord, corsHeaders, isValidMessageId, parseAddress,
  publicMessage, randomId, randomLocalPart, sanitizeHtml, ttlSeconds,
  describeAttachment, extractCode, htmlToText, b64urlEncode, isAllowedPushEndpoint, pushEnabled, sendPush, vapidAuthorization, extendSession, listMetadata, newSession, safeFilename,
  validateCustomLocal, verifyTurnstile, domainListed,
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
    async get(key, type) {
      const v = store.get(key)?.value
      if (v === undefined) return null
      if (type === 'json') return JSON.parse(v)
      if (type === 'arrayBuffer') return v instanceof ArrayBuffer ? v : new TextEncoder().encode(v).buffer
      return v
    },
    async put(key, value, opts) { store.set(key, { value, ttl: opts?.expirationTtl, metadata: opts?.metadata }) },
    async delete(key) { store.delete(key) },
    async list({ prefix }) { return { keys: [...store.entries()].filter(([k]) => k.startsWith(prefix)).map(([name, v]) => ({ name, metadata: v.metadata })) } },
  }
}

const req = (path, init = {}) => new Request(`https://api.test${path}`, { ...init, headers: { 'cf-connecting-ip': '1.1.1.1', ...(init.headers || {}) } })
const post = (path, body, ip = '1.1.1.1') => req(path, { method: 'POST', headers: { 'cf-connecting-ip': ip, 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}) })
const mail = (to, raw, extra = {}) => ({ to, from: 'sender@example.com', rawSize: raw.length, raw: new Response(raw).body, setReject: () => {}, ...extra })
const rfc = (to, subject, body) => `From: Sender <s@example.com>\r\nTo: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain\r\n\r\n${body}\r\n`

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

test('buildMessageRecord truncates and never embeds attachment bytes', () => {
  const rec = buildMessageRecord(
    { from: { name: 'N', address: 'a@b.c' }, subject: '', text: 'x'.repeat(50_000), html: '<p>h</p>', attachments: [{}, {}] },
    { id: 'abcdefghijkl', to: 't@mail.nexorasolution.us', receivedAt: '2026-10-23T00:00:00Z', rawSize: 100 },
  )
  assert.equal(rec.subject, '(no subject)')
  assert.equal(rec.attachmentCount, 2)
  assert.ok(rec.text.length <= 20_001)
  assert.deepEqual(rec.attachments, [])
  assert.equal(publicMessage(rec).html, '<p>h</p>')
})

test('cors only for allowed origins', () => {
  assert.deepEqual(corsHeaders('https://evil.example', ['https://nexorasolution.us']), {})
  assert.equal(corsHeaders('https://nexorasolution.us', ['https://nexorasolution.us'])['access-control-allow-origin'], 'https://nexorasolution.us')
  assert.deepEqual(allowedDomains({ TEMP_MAIL_DOMAINS: ' A.com , b.com ' }), ['a.com', 'b.com'])
})

test('API: create address, receive mail, list, read, delete', async () => {
  const e = env()
  const created = await (await handleRequest(post('/api/address'), e)).json()
  assert.match(created.address, /^[a-z2-9]{10}@mail\.nexorasolution\.us$/)
  assert.equal(created.expiresInSeconds, 3600)

  let rejected = null
  await handleEmail(mail(created.address, rfc(created.address, 'Verify your account', 'Your code is 123456'), { setReject: (m) => { rejected = m } }), e)
  assert.equal(rejected, null)

  const list = await (await handleRequest(req(`/api/inbox/${encodeURIComponent(created.address)}`), e)).json()
  assert.equal(list.messages.length, 1)
  assert.equal(list.messages[0].subject, 'Verify your account')
  assert.match(list.messages[0].preview, /123456/)
  assert.equal(list.messages[0].code, '123456')
  assert.equal(list.canExtend, true)

  const one = await (await handleRequest(req(`/api/inbox/${encodeURIComponent(created.address)}/${list.messages[0].id}`), e)).json()
  assert.match(one.message.text, /123456/)

  const del = await handleRequest(req(`/api/inbox/${encodeURIComponent(created.address)}/${list.messages[0].id}`, { method: 'DELETE' }), e)
  assert.equal(del.status, 200)
  const after = await (await handleRequest(req(`/api/inbox/${encodeURIComponent(created.address)}`), e)).json()
  assert.equal(after.messages.length, 0)
})

test('inbox list is served from KV metadata (one list call, no per-message reads)', async () => {
  const e = env()
  const { address } = await (await handleRequest(post('/api/address'), e)).json()
  await handleEmail(mail(address, rfc(address, 'Hello', 'Body text')), e)
  const real = e.TEMP_MAIL.get
  let messageReads = 0
  e.TEMP_MAIL.get = async (key, type) => { if (key.startsWith('m:')) messageReads++; return real(key, type) }
  const list = await (await handleRequest(req(`/api/inbox/${encodeURIComponent(address)}`), e)).json()
  assert.equal(list.messages.length, 1)
  assert.equal(messageReads, 0)
})

test('custom address: valid name works, taken/reserved/invalid names are refused', async () => {
  const e = env()
  const ok = await handleRequest(post('/api/address', { local: 'John.Doe' }, '2.2.2.2'), e)
  assert.equal(ok.status, 201)
  assert.equal((await ok.json()).address, 'john.doe@mail.nexorasolution.us')
  assert.equal((await handleRequest(post('/api/address', { local: 'john.doe' }, '2.2.2.3'), e)).status, 409)
  assert.equal((await handleRequest(post('/api/address', { local: 'admin' }, '2.2.2.4'), e)).status, 400)
  assert.equal((await handleRequest(post('/api/address', { local: 'a' }, '2.2.2.5'), e)).status, 400)
  assert.equal((await handleRequest(post('/api/address', { local: 'bad name!' }, '2.2.2.6'), e)).status, 400)
  assert.deepEqual(validateCustomLocal('x..y'), { ok: false, reason: 'invalid_characters' })
})

test('mail for an address without a live session is rejected', async () => {
  const e = env()
  let reason = null
  await handleEmail(mail('nobody1@mail.nexorasolution.us', rfc('x', 's', 'b'), { setReject: (m) => { reason = m } }), e)
  assert.equal(reason, 'Unknown recipient')
  assert.equal([...e.TEMP_MAIL.store.keys()].some((k) => k.startsWith('m:')), false)
})

test('extend works once by default, then is refused; the hard cap still applies', async () => {
  const e = env({ MESSAGE_TTL_SECONDS: '3600', MAX_LIFETIME_SECONDS: '7200' })
  const created = await (await handleRequest(post('/api/address'), e)).json()
  assert.equal(created.canExtend, true)
  assert.equal(created.totalSeconds, 3600)
  const url = `/api/inbox/${encodeURIComponent(created.address)}/extend`
  const first = await handleRequest(post(url), e)
  assert.equal(first.status, 200)
  const body = await first.json()
  assert.ok(new Date(body.expiresAt) > new Date(created.expiresAt))
  assert.equal(body.canExtend, false)
  assert.equal(body.totalSeconds, 7200)
  const second = await handleRequest(post(url), e)
  assert.equal(second.status, 409)
  assert.equal((await second.json()).error, 'max_extensions')

  const many = env({ MAX_EXTENSIONS: '3', MAX_LIFETIME_SECONDS: '7200' })
  const c2 = await (await handleRequest(post('/api/address', {}, '4.4.4.4'), many)).json()
  const u2 = `/api/inbox/${encodeURIComponent(c2.address)}/extend`
  assert.equal((await handleRequest(post(u2, {}, '4.4.4.4'), many)).status, 200)
  assert.equal((await (await handleRequest(post(u2, {}, '4.4.4.4'), many)).json()).error, 'max_lifetime')
  const s0 = newSession({ MESSAGE_TTL_SECONDS: '3600', MAX_LIFETIME_SECONDS: '7200' }, 0)
  assert.equal(extendSession(extendSession(s0, { MESSAGE_TTL_SECONDS: '3600' }, 0), { MESSAGE_TTL_SECONDS: '3600' }, 0).expiresAt, s0.hardExpiresAt)
})

test('an expired address is closed, wiped and no longer receives mail', async () => {
  const e = env()
  const { address } = await (await handleRequest(post('/api/address'), e)).json()
  await handleEmail(mail(address, rfc(address, 'S', 'b')), e)
  const key = `a:${address}`
  const session = JSON.parse(e.TEMP_MAIL.store.get(key).value)
  e.TEMP_MAIL.store.set(key, { value: JSON.stringify({ ...session, expiresAt: Date.now() - 1000 }) })
  const res = await handleRequest(req(`/api/inbox/${encodeURIComponent(address)}`), e)
  assert.equal(res.status, 404)
  assert.equal([...e.TEMP_MAIL.store.keys()].some((k) => k.includes(address)), false)
  let reason = null
  await handleEmail(mail(address, rfc(address, 'S', 'b'), { setReject: (m) => { reason = m } }), e)
  assert.equal(reason, 'Unknown recipient')
})

test('attachments: stored, listed, downloaded as an opaque forced download; risky ones are not kept', async () => {
  const e = env()
  const { address } = await (await handleRequest(post('/api/address'), e)).json()
  const raw = [
    `From: S <s@example.com>`, `To: ${address}`, 'Subject: Files', 'MIME-Version: 1.0',
    'Content-Type: multipart/mixed; boundary="b1"', '', '--b1', 'Content-Type: text/plain', '', 'See files', '--b1',
    'Content-Type: text/plain; name="note.txt"', 'Content-Disposition: attachment; filename="note.txt"', '', 'hello attachment', '--b1',
    'Content-Type: application/octet-stream; name="run.exe"', 'Content-Disposition: attachment; filename="run.exe"', '', 'MZ', '--b1--', '',
  ].join('\r\n')
  await handleEmail(mail(address, raw), e)
  const list = await (await handleRequest(req(`/api/inbox/${encodeURIComponent(address)}`), e)).json()
  assert.equal(list.messages[0].attachmentCount, 2)
  const { message } = await (await handleRequest(req(`/api/inbox/${encodeURIComponent(address)}/${list.messages[0].id}`), e)).json()
  assert.equal(message.attachments.length, 2)
  assert.equal(message.attachments[0].available, true)
  assert.equal(message.attachments[1].available, false)
  assert.equal(message.attachments[1].reason, 'blocked_type')
  const dl = await handleRequest(req(`/api/inbox/${encodeURIComponent(address)}/${message.id}/attachment/0`), e)
  assert.equal(dl.status, 200)
  assert.equal(dl.headers.get('content-type'), 'application/octet-stream')
  assert.match(dl.headers.get('content-disposition'), /^attachment; filename="note\.txt"$/)
  assert.match(await dl.text(), /hello attachment/)
  assert.equal((await handleRequest(req(`/api/inbox/${encodeURIComponent(address)}/${message.id}/attachment/1`), e)).status, 404)
})

test('attachment helpers: names are sanitised, limits and blocked types enforced', () => {
  assert.equal(safeFilename('../../etc/passwd'), '.._.._etc_passwd')
  assert.equal(safeFilename('  '), 'attachment-1')
  const mb = (n) => ({ filename: 'a.pdf', content: new ArrayBuffer(n * 1024 * 1024) })
  assert.equal(describeAttachment(mb(0.5), 0).available, true)
  assert.equal(describeAttachment(mb(2), 0).reason, 'too_large')
  assert.equal(describeAttachment(mb(0.9), 1, 1.5 * 1024 * 1024).reason, 'too_large')
  assert.equal(describeAttachment(mb(0.1), 5).reason, 'too_many')
  assert.equal(describeAttachment({ filename: 'x.HTML', content: new ArrayBuffer(3) }, 0).reason, 'blocked_type')
})

test('verification codes are found in common mail wording', () => {
  assert.equal(extractCode('Your verification code is 482913. Valid for 10 minutes.'), '482913')
  assert.equal(extractCode('123456 is your code'), '123456')
  assert.equal(extractCode('Use 123 456 to sign in'), '123456')
  assert.equal(extractCode('Order 12345678 shipped. Your code: 9911'), '9911')
  assert.equal(extractCode('Welcome in 2026, version 1.2345'), '')
  // big styled code box: label and digits on separate lines, digits letter-spaced
  assert.equal(extractCode('Hi Rahan, enter this code on the page.\nVERIFICATION CODE\n509649\nExpires in 10 minutes.'), '509649')
  assert.equal(extractCode('Your code\n5 0 9 6 4 9\nExpires in 10 minutes'), '509649')
  assert.equal(extractCode('Sign in\n\n731904\n\nThanks'), '731904')
  assert.equal(extractCode('Posted\n2026\nThanks'), '')
  // auto-generated plain text flattens the layout: label and digits can land anywhere
  assert.equal(extractCode('NEXORA\nSecurity Verification | Secure Account Verification Hi Rahan, enter this on the page. Verification Code 509649 Expires in 10 minutes.'), '509649')
  assert.equal(extractCode('Hi, here it is *****\n509649 <https://x.y/v?c=1>\nVerify your account'), '509649')
  assert.equal(extractCode('Security Verification\nEmail\nx@mail.nexorasolution.us 509649 Expires 10 minutes'), '509649')
  assert.equal(extractCode('Order 20260101 and call 555-123456 later'), '')
})

test('codes from common real-world services are detected, and look-alikes are not', () => {
  const cases = [
    ['G-123456 is your Google verification code.', '123456'],
    ['Use verification code 8821 for Microsoft authentication.', '8821'],
    ['Hi, enter this confirmation code to continue: 482 913', '482913'],
    ["Here's your launch code!\n\nEnter the code below:\n\n48291037", '48291037'],
    ['Your Amazon OTP is 204815. Do not share it with anyone.', '204815'],
    ['Enter this code to sign in:\n\n3 9 1 0\n\nThis code expires in 15 minutes', '3910'],
    ['Confirm your email\nYour confirmation code is below - enter it in your open browser window.\n\nABC-123\n', 'ABC123'],
    ['Here is the Steam Guard code you need: K7X2M', 'K7X2M'],
    ['Your X confirmation code is rv3k8w9f', 'rv3k8w9f'],
    ['Click to verify your email: https://x.com/v?token=abc123def456', ''],
    ['Your order #123456 shipped on 2026-10-24. Total $45.00', ''],
  ]
  for (const [text, want] of cases) assert.equal(extractCode(text), want, text)
})

test('list metadata stays under the KV 1024-byte limit', () => {
  const rec = buildMessageRecord({ from: { name: 'N'.repeat(500), address: 'a'.repeat(500) + '@b.c' }, subject: 's'.repeat(900), text: 'x'.repeat(5000) }, { id: 'abcdefghijkl', to: 't@x.y', receivedAt: '2026-10-23T00:00:00Z', rawSize: 1 })
  assert.ok(JSON.stringify(listMetadata(rec)).length < 1000)
})

test('Turnstile: required and verified when a secret is set', async () => {
  const e = env({ TURNSTILE_SECRET: 'secret', TURNSTILE_SITE_KEY: 'site' })
  assert.equal((await handleRequest(post('/api/address', {}, '3.3.3.3'), e)).status, 403)
  const calls = []
  const fetchFn = async (url, init) => { calls.push([url, String(init.body)]); return { json: async () => ({ success: true }) } }
  assert.equal(await verifyTurnstile('tok', 'secret', '1.2.3.4', fetchFn), true)
  assert.match(calls[0][0], /turnstile\/v0\/siteverify$/)
  assert.equal(await verifyTurnstile('', 'secret', '', fetchFn), false)
  assert.equal(await verifyTurnstile('tok', 'secret', '', async () => ({ json: async () => ({ success: false }) })), false)
  assert.equal(await verifyTurnstile('tok', 'secret', '', async () => { throw new Error('net') }), false)
  const cfg = await (await handleRequest(req('/api/config'), e)).json()
  assert.equal(cfg.captchaRequired, true)
  assert.equal(cfg.turnstileSiteKey, 'site')
  const noKey = env({ TURNSTILE_SECRET: 'secret' })
  assert.equal((await handleRequest(post('/api/address', {}, '3.3.3.4'), noKey)).status, 201, 'no site key, no captcha')
})

test('abuse reports: three different inboxes block a sender domain; big providers are never blocked', async () => {
  const e = env()
  let ip = 0
  const received = async (fromHeader) => {
    const { address } = await (await handleRequest(post('/api/address', {}, `7.7.7.${ip++}`), e)).json()
    const raw = `From: ${fromHeader}\r\nTo: ${address}\r\nSubject: Win now\r\nContent-Type: text/plain\r\n\r\nspam\r\n`
    await handleEmail(mail(address, raw), e)
    const list = await (await handleRequest(req(`/api/inbox/${encodeURIComponent(address)}`), e)).json()
    return { address, id: list.messages[0].id }
  }
  const report = async (m) => handleRequest(post('/api/report', { address: m.address, id: m.id, reason: 'spam', details: 'junk' }, `8.8.8.${ip++}`), e)

  for (let i = 0; i < 2; i++) assert.equal((await report(await received('x@spam.example'))).status, 200)
  assert.equal(e.TEMP_MAIL.store.has('bl:spam.example'), false)
  assert.equal((await report(await received('x@spam.example'))).status, 200)
  assert.equal(e.TEMP_MAIL.store.has('bl:spam.example'), true)
  assert.ok([...e.TEMP_MAIL.store.keys()].some((k) => k.startsWith('report:')))

  for (let i = 0; i < 3; i++) await report(await received('x@gmail.com'))
  assert.equal(e.TEMP_MAIL.store.has('bl:gmail.com'), false)

  const { address } = await (await handleRequest(post('/api/address', {}, '6.6.6.6'), e)).json()
  let reason = null
  await handleEmail(mail(address, rfc(address, 'S', 'b'), { from: 'y@spam.example', setReject: (m) => { reason = m } }), e)
  assert.equal(reason, 'Sender blocked')
  // envelope sender is innocent, only the visible From is on the list
  reason = null
  await handleEmail(mail(address, `From: z@spam.example\r\nTo: ${address}\r\nSubject: x\r\n\r\nb\r\n`, { setReject: (m) => { reason = m } }), e)
  assert.equal(reason, 'Sender blocked')
})

test('sender blocklist rejects mail at SMTP time', async () => {
  const e = env({ BLOCKED_SENDER_DOMAINS: 'bad.example' })
  const { address } = await (await handleRequest(post('/api/address'), e)).json()
  let reason = null
  await handleEmail(mail(address, rfc(address, 'S', 'b'), { from: 'x@mail.bad.example', setReject: (m) => { reason = m } }), e)
  assert.equal(reason, 'Sender blocked')
  assert.equal(domainListed('mail.bad.example', ['bad.example']), true)
  assert.equal(domainListed('notbad.example', ['bad.example']), false)
})

test('oversized mail is rejected', async () => {
  const e = env({ FORWARD_TO: 'owner@example.com' })
  const { address } = await (await handleRequest(post('/api/address'), e)).json()
  let reason = null
  await handleEmail({ to: address, from: 'a@b.c', rawSize: 4 * 1024 * 1024, raw: new Response('x').body, setReject: (m) => { reason = m } }, e)
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
  e.TEMP_MAIL.get = async () => { throw new Error('kv down') }
  let forwarded = false
  await handleEmail({ to: 'abcdef@mail.nexorasolution.us', rawSize: 10, raw: new Response('x').body, setReject: () => {}, forward: async () => { forwarded = true } }, e)
  assert.equal(forwarded, false)
})

test('address creation is rate limited per IP (5 per minute)', async () => {
  const e = env()
  const statuses = []
  for (let i = 0; i < 6; i++) statuses.push((await handleRequest(post('/api/address', {}, '9.9.9.9'), e)).status)
  assert.deepEqual(statuses, [201, 201, 201, 201, 201, 429])
})

test('bad addresses and ids are refused', async () => {
  const e = env()
  assert.equal((await handleRequest(new Request('https://api.test/api/inbox/x@gmail.com'), e)).status, 400)
  assert.equal((await handleRequest(new Request('https://api.test/api/inbox/abcdef%40mail.nexorasolution.us/..%2F..'), e)).status, 400)
  assert.equal((await handleRequest(new Request('https://api.test/nope'), e)).status, 404)
  assert.equal((await handleRequest(post('/api/report', { address: 'x@gmail.com', id: 'abcdefghijkl', reason: 'spam' }), e)).status, 400)
})

test('HTML-only mail still gets text, preview and a detected code', async () => {
  assert.equal(htmlToText('<style>p{}</style><div><h2>Hi&nbsp;there</h2><p>Code <b>556677</b> &amp; more &#65;</p></div>'), 'Hi there\nCode 556677 & more A')
  const e = env()
  const { address } = await (await handleRequest(post('/api/address'), e)).json()
  const raw = `From: A <a@acme.test>\r\nTo: ${address}\r\nSubject: Welcome\r\nContent-Type: text/html\r\n\r\n<div><p>Confirm with code <b>556677</b>.</p></div>`
  await handleEmail(mail(address, raw), e)
  const list = await (await handleRequest(req(`/api/inbox/${encodeURIComponent(address)}`), e)).json()
  assert.equal(list.messages[0].code, '556677')
  assert.match(list.messages[0].preview, /Confirm with code 556677/)
})

async function vapidEnv(extra = {}) {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey)
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey))
  return { pair, raw, env: env({ VAPID_PUBLIC_KEY: b64urlEncode(raw), VAPID_PRIVATE_KEY: JSON.stringify(jwk), ...extra }) }
}

test('push: only vendor push services over https are accepted as endpoints', () => {
  assert.equal(isAllowedPushEndpoint('https://fcm.googleapis.com/fcm/send/abc'), true)
  assert.equal(isAllowedPushEndpoint('https://updates.push.services.mozilla.com/wpush/v2/abc'), true)
  assert.equal(isAllowedPushEndpoint('https://web.push.apple.com/abc'), true)
  assert.equal(isAllowedPushEndpoint('http://fcm.googleapis.com/x'), false)
  assert.equal(isAllowedPushEndpoint('https://evil.example/x'), false)
  assert.equal(isAllowedPushEndpoint('https://fcm.googleapis.com.evil.example/x'), false)
  assert.equal(isAllowedPushEndpoint('https://user:pw@fcm.googleapis.com/x'), false)
  assert.equal(isAllowedPushEndpoint('not a url'), false)
})

test('push: the VAPID JWT is a valid ES256 signature over the endpoint origin', async () => {
  const { pair, raw, env: e } = await vapidEnv()
  assert.equal(pushEnabled(e), true)
  assert.equal(pushEnabled(env()), false)
  const auth = await vapidAuthorization('https://fcm.googleapis.com/fcm/send/abc', e, 1_700_000_000_000)
  const m = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(auth)
  assert.ok(m, auth)
  assert.equal(m[4], b64urlEncode(raw))
  const claims = JSON.parse(Buffer.from(m[2], 'base64url').toString())
  assert.equal(claims.aud, 'https://fcm.googleapis.com')
  assert.equal(claims.exp, 1_700_000_000 + 12 * 3600)
  assert.match(claims.sub, /^mailto:/)
  const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pair.publicKey, Buffer.from(m[3], 'base64url'), new TextEncoder().encode(`${m[1]}.${m[2]}`))
  assert.equal(ok, true)
})

test('push: subscribe, notify on new mail, drop dead subscriptions', async () => {
  const { env: e } = await vapidEnv()
  const cfg = await (await handleRequest(req('/api/config'), e)).json()
  assert.ok(cfg.vapidPublicKey)
  assert.equal((await (await handleRequest(req('/api/config'), env())).json()).vapidPublicKey, '')

  const { address } = await (await handleRequest(post('/api/address'), e)).json()
  assert.equal((await handleRequest(post('/api/push', { address, endpoint: 'https://evil.example/x' }), e)).status, 400)
  assert.equal((await handleRequest(post('/api/push', { address: 'nobody@mail.nexorasolution.us', endpoint: 'https://fcm.googleapis.com/x' }), e)).status, 404)
  assert.equal((await handleRequest(post('/api/push', { address, endpoint: 'https://fcm.googleapis.com/fcm/send/abc' }), e)).status, 200)

  const calls = []
  const realFetch = globalThis.fetch
  let status = 201
  globalThis.fetch = async (url, init) => { calls.push({ url: String(url), init }); return new Response(null, { status }) }
  try {
    await handleEmail(mail(address, rfc(address, 'Hi', 'Your code is 123456')), e)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].url, 'https://fcm.googleapis.com/fcm/send/abc')
    assert.match(calls[0].init.headers.Authorization, /^vapid t=/)
    assert.equal(calls[0].init.headers.TTL, '120')
    status = 410
    await handleEmail(mail(address, rfc(address, 'Again', 'second')), e)
    assert.equal(e.TEMP_MAIL.store.has(`push:${address}`), false, 'a 410 removes the subscription')
    await handleEmail(mail(address, rfc(address, 'Third', 'third')), e)
    assert.equal(calls.length, 2, 'no push once the subscription is gone')
    assert.deepEqual(await sendPush('https://fcm.googleapis.com/x', e), { ok: false, gone: true })
  } finally { globalThis.fetch = realFetch }

  assert.equal((await handleRequest(post('/api/push', { address, endpoint: 'https://fcm.googleapis.com/fcm/send/abc' }), e)).status, 200)
  assert.equal((await handleRequest(req('/api/push', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address }) }), e)).status, 200)
  assert.equal(e.TEMP_MAIL.store.has(`push:${address}`), false)
})

test('push: a failing push service never loses the mail', async () => {
  const { env: e } = await vapidEnv()
  const { address } = await (await handleRequest(post('/api/address'), e)).json()
  await handleRequest(post('/api/push', { address, endpoint: 'https://fcm.googleapis.com/fcm/send/abc' }), e)
  const realFetch = globalThis.fetch
  globalThis.fetch = async () => { throw new Error('push service down') }
  try { await handleEmail(mail(address, rfc(address, 'Still here', 'body')), e) } finally { globalThis.fetch = realFetch }
  const list = await (await handleRequest(req(`/api/inbox/${encodeURIComponent(address)}`), e)).json()
  assert.equal(list.messages.length, 1)
})
