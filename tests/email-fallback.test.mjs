import test from 'node:test'
import assert from 'node:assert/strict'
import { shouldFallBack, parseMailbox, toCloudflarePayload, sendWithFallback } from '../workers/shared/emailFallback.js'

const res = (status, body = {}) => new Response(JSON.stringify(body), { status })

test('only quota/rate/server errors fall back to Cloudflare', () => {
  for (const s of [429, 402, 500, 503]) assert.equal(shouldFallBack(s), true)
  for (const s of [200, 400, 401, 403, 404, 422]) assert.equal(shouldFallBack(s), false)
})

test('mailboxes and payload map to the Cloudflare shape', () => {
  assert.deepEqual(parseMailbox('Nexora Solution <support@nexorasolution.us>'), { email: 'support@nexorasolution.us', name: 'Nexora Solution' })
  assert.equal(parseMailbox('a@b.com'), 'a@b.com')
  const out = toCloudflarePayload({ from: 'N <a@b.com>', to: 'x@y.com', reply_to: 'r@b.com', subject: 'S', html: '<p>h</p>', text: 't', tags: [{ name: 'a', value: 'b' }], attachments: [{ filename: 'f.pdf', content: 'AAA', content_type: 'application/pdf' }] })
  assert.deepEqual(out.from, { email: 'a@b.com', name: 'N' })
  assert.deepEqual(out.to, ['x@y.com'])
  assert.equal(out.replyTo, 'r@b.com')
  assert.equal(out.tags, undefined)
  assert.deepEqual(out.attachments, [{ content: 'AAA', filename: 'f.pdf', type: 'application/pdf', disposition: 'attachment' }])
})

test('Resend success never touches Cloudflare', async () => {
  let cf = 0
  const env = { EMAIL: { send: async () => { cf++ } } }
  const r = await sendWithFallback(env, { from: 'a@b.com', to: 'x@y.com', subject: 's' }, async () => res(200, { id: 'r1' }))
  assert.equal(r.ok, true)
  assert.equal(cf, 0)
})

test('Resend quota (429) or an exception falls back to Cloudflare', async () => {
  const sent = []
  const env = { EMAIL: { send: async (m) => { sent.push(m); return { messageId: 'cf1' } } } }
  const a = await sendWithFallback(env, { from: 'a@b.com', to: 'x@y.com', subject: 's' }, async () => res(429, { message: 'quota' }))
  assert.equal(a.ok, true)
  assert.equal((await a.json()).provider, 'cloudflare')
  const b = await sendWithFallback(env, { from: 'a@b.com', to: 'x@y.com', subject: 's' }, async () => { throw new Error('timeout') })
  assert.equal(b.ok, true)
  assert.equal(sent.length, 2)
})

test('a 422 from Resend is returned as is, and without a binding Resend errors stay', async () => {
  const env = { EMAIL: { send: async () => { throw new Error('should not be called') } } }
  assert.equal((await sendWithFallback(env, {}, async () => res(422))).status, 422)
  assert.equal((await sendWithFallback({}, {}, async () => res(429))).status, 429)
})

test('when both fail the Resend error is kept; with no Resend key Cloudflare error is a 502', async () => {
  const env = { EMAIL: { send: async () => { const e = new Error('daily'); e.code = 'E_DAILY_LIMIT_EXCEEDED'; throw e } } }
  assert.equal((await sendWithFallback(env, { to: 'x@y.com' }, async () => res(429))).status, 429)
  const none = await sendWithFallback(env, { to: 'x@y.com' }, null)
  assert.equal(none.status, 502)
  assert.match((await none.json()).message, /E_DAILY_LIMIT_EXCEEDED/)
})

test('usage hook is told which service sent, and a failing hook never blocks the send', async () => {
  const seen = []
  const env = { EMAIL: { send: async () => ({ messageId: 'cf' }) } }
  await sendWithFallback(env, { to: 'x@y.com' }, async () => res(429), (provider, ok) => { seen.push([provider, ok]) })
  assert.deepEqual(seen, [['resend', false], ['cloudflare', true]])
  const ok = await sendWithFallback(env, { to: 'x@y.com' }, async () => res(200), () => { throw new Error('db down') })
  assert.equal(ok.ok, true)
})
