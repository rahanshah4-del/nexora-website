import assert from 'node:assert/strict'
import test from 'node:test'
import { buildInboundRow, formatAddress, getInbound, inboundToApi, isInboundId, listInbound, storeInboundMessage } from '../workers/shared/inboundMail.js'

const RAW = [
  'From: Ayesha Khan <ayesha@example.com>',
  'To: Support <support@nexorasolution.us>',
  'Subject: Need help with my invoice',
  'Message-ID: <abc123@example.com>',
  'Content-Type: text/plain; charset=utf-8',
  '',
  'Hello team, my invoice shows the wrong total.',
].join('\r\n')

// A tiny in-memory stand-in for D1: records prepared statements and rows.
function fakeDb() {
  const rows = []
  const db = {
    rows,
    batch: async () => [],
    prepare(sql) {
      return {
        bind(...args) {
          return {
            run: async () => {
              if (!sql.startsWith('INSERT OR IGNORE')) return { meta: { changes: 0 } }
              const [id, received_at, from_addr, to_addr, to_list, cc_list, reply_to, subject, text_body, html_body, message_id, refs, attachments, size] = args
              if (message_id && rows.some((r) => r.message_id === message_id && r.to_addr === to_addr)) return { meta: { changes: 0 } }
              rows.push({ id, received_at, from_addr, to_addr, to_list, cc_list, reply_to, subject, text_body, html_body, message_id, refs, attachments, size })
              return { meta: { changes: 1 } }
            },
            all: async () => ({ results: [...rows].sort((a, b) => b.received_at.localeCompare(a.received_at)) }),
            first: async () => rows.find((r) => r.id === args[0]) || null,
          }
        },
      }
    },
  }
  return db
}

const message = (raw = RAW, to = 'support@nexorasolution.us') => ({ raw: new Blob([raw]).stream(), rawSize: raw.length, from: 'ayesha@example.com', to, headers: new Headers() })

test('formatAddress shows name and address', () => {
  assert.equal(formatAddress({ name: 'Ayesha Khan', address: 'a@b.co' }), 'Ayesha Khan <a@b.co>')
  assert.equal(formatAddress({ name: '', address: 'a@b.co' }), 'a@b.co')
  assert.equal(formatAddress(null), '')
})

test('buildInboundRow shortens huge bodies and keeps attachment names, not content', () => {
  const row = buildInboundRow({ subject: 'x', text: 'a'.repeat(500000), attachments: [{ filename: 'inv.pdf', mimeType: 'application/pdf', content: new Uint8Array(10) }] }, { envelopeTo: 'Support@NexoraSolution.us' })
  assert.ok(row.text_body.length < 410000)
  assert.equal(row.to_addr, 'support@nexorasolution.us')
  assert.deepEqual(JSON.parse(row.attachments), [{ id: '0', filename: 'inv.pdf', content_type: 'application/pdf', size: 10 }])
})

test('a routed message is stored once and read back in the Control Centre shape', async () => {
  const db = fakeDb()
  const env = { EMAIL_DB: db }
  const id = await storeInboundMessage(env, message())
  assert.ok(isInboundId(id))
  assert.equal(await storeInboundMessage(env, message()), null) // same Message-ID and address: not stored twice
  const list = await listInbound(db)
  assert.equal(list.length, 1)
  assert.equal(list[0].from, 'Ayesha Khan <ayesha@example.com>')
  assert.equal(list[0].subject, 'Need help with my invoice')
  assert.equal(list[0].text, undefined) // the list carries no bodies
  const full = await getInbound(db, id)
  assert.match(full.text, /wrong total/)
  assert.equal(full.received_at_address, 'support@nexorasolution.us')
})

test('without a database nothing happens and nothing throws', async () => {
  assert.equal(await storeInboundMessage({}, message()), null)
  assert.equal(await storeInboundMessage(null, message()), null)
  assert.deepEqual(await listInbound(null), [])
  assert.equal(inboundToApi(null), null)
})
