import assert from 'node:assert/strict'
import test from 'node:test'
import { fromBase64, getInboundAttachment, inboxPulse, MAX_STORED_ATTACHMENT_BYTES, storableAttachments, storeInboundMessage, toBase64 } from '../workers/shared/inboundMail.js'

test('base64 round trip keeps every byte', () => {
  const bytes = new Uint8Array(70000).map((_, i) => i % 256)
  assert.deepEqual(fromBase64(toBase64(bytes)), bytes)
  assert.deepEqual(fromBase64(toBase64(bytes.buffer)), bytes)
})

test('only attachments that fit are kept, with their original index', () => {
  const small = new Uint8Array([1, 2, 3])
  const parsed = { attachments: [
    { filename: 'a.pdf', mimeType: 'application/pdf', content: small },
    { filename: 'big.zip', mimeType: 'application/zip', content: { byteLength: MAX_STORED_ATTACHMENT_BYTES + 1 } },
    { filename: '', mimeType: '', content: small },
    { filename: 'empty.txt', content: new Uint8Array(0) },
  ] }
  const out = storableAttachments(parsed)
  assert.deepEqual(out.map((f) => [f.idx, f.filename, f.content_type, f.size]), [[0, 'a.pdf', 'application/pdf', 3], [2, 'attachment-3', 'application/octet-stream', 3]])
  assert.deepEqual(fromBase64(out[0].data), small)
  assert.deepEqual(storableAttachments({}), [])
})

function fakeDb({ attachments = [] } = {}) {
  const inserted = { mail: [], files: [] }
  return {
    inserted,
    batch: async (list) => { for (const s of list) if (s.sql.includes('INSERT OR REPLACE INTO inbound_attachments')) inserted.files.push(s.args) ; return [] },
    prepare: (sql) => ({
      sql, args: [],
      bind(...args) {
        const self = { sql, args,
          run: async () => { if (sql.startsWith('INSERT OR IGNORE INTO inbound_emails')) { inserted.mail.push(args); return { meta: { changes: 1 } } } return {} },
          first: async () => {
            if (sql.includes('FROM inbound_attachments')) return attachments.find((a) => a.email_id === args[0] && a.idx === args[1]) || null
            if (sql.includes('FROM inbound_emails')) return { n: 3, latest: '2026-11-03T18:00:00.000Z' }
            if (sql.includes('FROM email_state')) return { latest: '2026-11-03T18:01:00.000Z' }
            if (sql.includes('FROM email_tickets')) return { latest: '' }
            return null
          },
        }
        return self
      },
      first: async () => {
        if (sql.includes('FROM inbound_emails')) return { n: 3, latest: '2026-11-03T18:00:00.000Z' }
        if (sql.includes('FROM email_state')) return { latest: '2026-11-03T18:01:00.000Z' }
        if (sql.includes('FROM email_tickets')) return { latest: '' }
        return null
      },
    }),
  }
}

test('pulse changes when mail, flags or tickets change', async () => {
  const a = await inboxPulse(fakeDb())
  assert.equal(a.total, 3)
  assert.equal(a.version, '3|2026-11-03T18:00:00.000Z|2026-11-03T18:01:00.000Z|')
  assert.deepEqual(await inboxPulse(null), { version: '0', total: 0, latestAt: '' })
})

test('a stored attachment can be read back; a missing one is null', async () => {
  const db = fakeDb({ attachments: [{ email_id: 'in_1', idx: 0, filename: 'a.txt', content_type: 'text/plain', size: 3, data: toBase64(new Uint8Array([104, 105, 33])) }] })
  const file = await getInboundAttachment(db, 'in_1', 0)
  assert.equal(file.filename, 'a.txt')
  assert.equal(new TextDecoder().decode(file.bytes), 'hi!')
  assert.equal(await getInboundAttachment(db, 'in_1', 5), null)
  assert.equal(await getInboundAttachment(null, 'in_1', 0), null)
})

test('storing a message keeps its small attachments next to it', async () => {
  const raw = [
    'From: A <a@example.com>', 'To: support@nexorasolution.us', 'Subject: With file', 'Message-ID: <x1@example.com>',
    'MIME-Version: 1.0', 'Content-Type: multipart/mixed; boundary="b1"', '',
    '--b1', 'Content-Type: text/plain', '', 'See attached.', '--b1',
    'Content-Type: text/plain; name="note.txt"', 'Content-Disposition: attachment; filename="note.txt"', 'Content-Transfer-Encoding: base64', '', toBase64(new TextEncoder().encode('hello file')), '--b1--', '',
  ].join('\r\n')
  const db = fakeDb()
  const id = await storeInboundMessage({ EMAIL_DB: db }, { raw: new Response(raw).body, rawSize: raw.length, from: 'a@example.com', to: 'support@nexorasolution.us' })
  assert.match(id, /^in_/)
  assert.equal(db.inserted.files.length, 1)
  assert.equal(db.inserted.files[0][2], 'note.txt')
  assert.equal(new TextDecoder().decode(fromBase64(db.inserted.files[0][5])), 'hello file')
})
