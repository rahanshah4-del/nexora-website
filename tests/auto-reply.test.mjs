import assert from 'node:assert/strict'
import test from 'node:test'
import { assessMessage, bareAddress, buildAutoReply, maybeAutoReply, profileFor, ticketFor } from '../workers/shared/autoReply.js'

const h = (o) => new Headers(o)
const base = { from: 'Ayesha <ayesha@example.com>', subject: 'Need help' }

test('each address gets its own reply', () => {
  const kinds = Object.fromEntries(['support', 'hello', 'hallo', 'info', 'sales', 'billing', 'ai', 'random'].map((a) => [a, profileFor(a).kind]))
  assert.deepEqual(kinds, { support: 'support', hello: 'general', hallo: 'general', info: 'general', sales: 'sales', billing: 'billing', ai: 'ai', random: 'other' })
  assert.equal(profileFor('alerts'), null)
  assert.equal(profileFor('nexora'), null)
  assert.equal(profileFor('support+vip').kind, 'support')
})

test('reply is English, has the ticket and the right asks', () => {
  const r = buildAutoReply({ localPart: 'billing', subject: 'Invoice <b>', ticket: 'NX-ABC123' })
  assert.match(r.subject, /^Re: Invoice <b> \[NX-ABC123\]$/)
  assert.match(r.text, /within 1 to 2 working days/)
  assert.match(r.text, /invoice number/i)
  assert.ok(!r.html.includes('<b>'), 'subject is escaped in html')
  assert.equal(buildAutoReply({ localPart: 'alerts', subject: 'x', ticket: 't' }), null)
})

test('ticket comes from the stored id', () => assert.equal(ticketFor('in_abc123def456'), 'NX-DEF456'))

test('bareAddress', () => {
  assert.equal(bareAddress('Ayesha <Ayesha@Example.com>'), 'ayesha@example.com')
  assert.equal(bareAddress('x@y.z'), 'x@y.z')
  assert.equal(bareAddress(''), '')
})

test('safe senders get a reply, Reply-To wins', () => {
  assert.deepEqual(assessMessage({ headers: h({ from: base.from }), envelopeFrom: 'ayesha@example.com', to: 'support@nexorasolution.us' }), { ok: true, to: 'ayesha@example.com' })
  assert.equal(assessMessage({ headers: h({ from: base.from, 'reply-to': 'boss@corp.com' }), envelopeFrom: 'ayesha@example.com', to: 'support@nexorasolution.us' }).to, 'boss@corp.com')
})

test('loops, bounces and bulk mail never get a reply', () => {
  const cases = [
    [{ from: base.from }, '', 'bounce'],
    [{ from: 'No Reply <noreply@shop.com>' }, 'noreply@shop.com', 'no-reply-sender'],
    [{ from: 'a@example.com', 'auto-submitted': 'auto-replied' }, 'a@example.com', 'auto-submitted'],
    [{ from: 'a@example.com', precedence: 'bulk' }, 'a@example.com', 'bulk'],
    [{ from: 'a@example.com', 'list-id': '<x.example.com>' }, 'a@example.com', 'mailing-list'],
    [{ from: 'a@example.com', 'x-auto-response-suppress': 'All' }, 'a@example.com', 'auto-reply'],
    [{ from: 'a@example.com', subject: 'Automatic reply: hi' }, 'a@example.com', 'auto-subject'],
    [{ from: 'me@nexorasolution.us' }, 'me@nexorasolution.us', 'own-domain'],
  ]
  for (const [headers, envelope, reason] of cases) {
    assert.deepEqual(assessMessage({ headers: h(headers), envelopeFrom: envelope, to: 'support@nexorasolution.us' }), { ok: false, reason }, reason)
  }
  assert.equal(assessMessage({ headers: h({ from: base.from }), envelopeFrom: 'ayesha@example.com', to: 'alerts@nexorasolution.us' }).reason, 'silent-address')
})

function fakeDb() {
  const log = []
  return {
    log,
    batch: async () => [],
    prepare: (sql) => ({
      bind: (...args) => ({
        run: async () => { if (sql.startsWith('INSERT INTO auto_replies')) log.push({ sender: args[1], ok: args[6], sent_at: args[0] }); return {} },
        first: async () => {
          if (sql.includes('COUNT(*)')) return { n: log.filter((r) => r.ok === 1).length }
          return log.find((r) => r.sender === args[0] && r.ok === 1) ? { hit: 1 } : null
        },
      }),
    }),
  }
}
const msg = (over = {}) => ({ from: 'ayesha@example.com', to: 'support@nexorasolution.us', headers: h({ from: base.from, subject: 'Help', 'message-id': '<m1@example.com>' }), ...over })

test('sends once per sender, with threading and auto headers', async () => {
  const env = { EMAIL_DB: fakeDb() }
  const sent = []
  const send = async (p) => { sent.push(p); return { ok: true } }
  assert.deepEqual(await maybeAutoReply(env, msg(), { inboundId: 'in_x1', send }), { sent: true, reason: 'sent' })
  assert.equal(sent[0].from, 'Nexora Solution <support@nexorasolution.us>')
  assert.deepEqual(sent[0].to, ['ayesha@example.com'])
  assert.equal(sent[0].headers['Auto-Submitted'], 'auto-replied')
  assert.equal(sent[0].headers['In-Reply-To'], '<m1@example.com>')
  assert.deepEqual(await maybeAutoReply(env, msg(), { inboundId: 'in_x2', send }), { sent: false, reason: 'already-replied' })
  assert.equal(sent.length, 1)
})

test('switch-off, daily cap, missing db and failing sender never throw', async () => {
  const send = async () => ({ ok: true })
  assert.equal((await maybeAutoReply({ EMAIL_DB: fakeDb(), AUTO_REPLY_ENABLED: 'false' }, msg(), { inboundId: 'in_1', send })).reason, 'switched-off')
  assert.equal((await maybeAutoReply({}, msg(), { inboundId: 'in_1', send })).reason, 'not-configured')
  assert.equal((await maybeAutoReply({ EMAIL_DB: fakeDb() }, msg(), { inboundId: null, send })).reason, 'not-configured')
  const env = { EMAIL_DB: fakeDb(), AUTO_REPLY_DAILY_CAP: '1' }
  await maybeAutoReply(env, msg(), { inboundId: 'in_1', send })
  assert.equal((await maybeAutoReply(env, msg({ from: 'b@example.org', headers: h({ from: 'b@example.org' }) }), { inboundId: 'in_2', send })).reason, 'daily-cap')
  const failing = await maybeAutoReply({ EMAIL_DB: fakeDb() }, msg(), { inboundId: 'in_3', send: async () => { throw new Error('boom') } })
  assert.equal(failing.sent, false)
})
