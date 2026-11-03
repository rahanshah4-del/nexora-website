import assert from 'node:assert/strict'
import test from 'node:test'
import { DatabaseSync } from 'node:sqlite'
import { addressOf, blockedAmong, isBlockedSender, listSent, logTicketEvent, recordSent, setBlocked, setSpam, spamIds, stopIfBlocked, ticketTimeline } from '../workers/shared/mailbox.js'

// node:sqlite behind the small slice of the D1 API that mailbox.js uses.
function d1() {
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec(`CREATE TABLE inbound_emails (id TEXT PRIMARY KEY, received_at TEXT, from_addr TEXT, to_addr TEXT, subject TEXT, text_body TEXT, attachments TEXT DEFAULT '[]');
    CREATE TABLE email_ticket_map (email_id TEXT PRIMARY KEY, ticket_id TEXT);
    CREATE TABLE email_tickets (ticket_id TEXT PRIMARY KEY, created_at TEXT);
    CREATE TABLE email_replies (inbound_email_id TEXT, sent_email_id TEXT, recipient TEXT, subject TEXT, body_text TEXT, sent_at TEXT);
    CREATE TABLE auto_replies (sent_at TEXT, address TEXT, kind TEXT, ticket TEXT, ok INTEGER);`)
  const prep = (sql, args = []) => ({
    bind: (...a) => prep(sql, a),
    first: async () => sqlite.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: sqlite.prepare(sql).all(...args) }),
    run: async () => { sqlite.prepare(sql).run(...args); return {} },
  })
  return { sqlite, prepare: (sql) => prep(sql), batch: async (list) => { for (const s of list) await s.run() } }
}

test('addressOf finds the address in any format', () => {
  assert.equal(addressOf('Ali Khan <Ali@Example.com>'), 'ali@example.com')
  assert.equal(addressOf('bob@x.org'), 'bob@x.org')
  assert.equal(addressOf('nobody'), '')
})

test('sent mail is listed newest first', async () => {
  const db = d1()
  await recordSent(db, { kind: 'reply', from: 'support@nexorasolution.us', to: 'a@b.com', subject: 'Re: Hi', body: 'one' }, { now: 1000 })
  await recordSent(db, { kind: 'compose', from: 'sales@nexorasolution.us', to: 'c@d.com', subject: 'Hello', body: 'two', attachments: [{ filename: 'f.pdf', size: 5 }] }, { now: 2000 })
  const list = await listSent(db)
  assert.equal(list.length, 2)
  assert.equal(list[0].subject, 'Hello')
  assert.deepEqual(list[0].attachments, [{ filename: 'f.pdf', size: 5 }])
})

test('timeline merges customer mail, replies, auto reply and status events in order', async () => {
  const db = d1()
  db.sqlite.exec(`INSERT INTO inbound_emails VALUES ('in1','2026-11-03T10:00:00Z','Cust <c@x.com>','support@nexorasolution.us','Bill issue','My bill is unpaid','[]');
    INSERT INTO inbound_emails VALUES ('in2','2026-11-04T09:00:00Z','Cust <c@x.com>','support@nexorasolution.us','Re: Bill issue [NX-AAAAAA]','Still not fixed','[]');
    INSERT INTO email_ticket_map VALUES ('in1','NX-AAAAAA'); INSERT INTO email_ticket_map VALUES ('in2','NX-AAAAAA');
    INSERT INTO email_tickets VALUES ('NX-AAAAAA','2026-11-03T10:00:00Z');
    INSERT INTO email_replies VALUES ('in1','old-1','c@x.com','Re: Bill issue','Old reply before sent_emails existed','2026-11-03T11:00:00Z');
    INSERT INTO auto_replies VALUES ('2026-11-03T10:00:05Z','c@x.com','billing','NX-AAAAAA',1);`)
  await logTicketEvent(db, 'NX-AAAAAA', 'created', 'Priority high', { now: Date.parse('2026-11-03T10:00:00Z') })
  await logTicketEvent(db, 'NX-AAAAAA', 'status', 'pending -> resolved', { now: Date.parse('2026-11-03T12:00:00Z') })
  await logTicketEvent(db, 'NX-AAAAAA', 'reopened', 'Customer replied while resolved', { now: Date.parse('2026-11-04T09:00:01Z') })
  await recordSent(db, { kind: 'reply', from: 'billing@nexorasolution.us', to: 'c@x.com', subject: 'Re: Bill issue', body: 'Fixed', ticketId: 'NX-AAAAAA', providerId: 'new-1' }, { now: Date.parse('2026-11-03T11:30:00Z') })
  const t = await ticketTimeline(db, 'NX-AAAAAA')
  assert.deepEqual(t.map((i) => i.type + ':' + (i.kind || '')), ['event:created', 'inbound:', 'auto:billing', 'sent:', 'sent:', 'event:status', 'inbound:', 'event:reopened'])
  assert.equal(t.filter((i) => i.type === 'sent').length, 2)
})

test('blocked senders are stopped and their mail goes to spam', async () => {
  const db = d1()
  db.sqlite.exec("INSERT INTO inbound_emails VALUES ('m1','2026-11-04T00:00:00Z','Spammer <S@Bad.com>','support@nexorasolution.us','win','x','[]')")
  assert.equal(await stopIfBlocked(db, 'm1'), false)
  await setBlocked(db, 'Spammer <s@bad.com>', true)
  assert.equal(await isBlockedSender(db, 's@bad.com'), true)
  assert.equal(await stopIfBlocked(db, 'm1'), true)
  assert.equal((await spamIds(db)).has('m1'), true)
  assert.deepEqual([...(await blockedAmong(db, ['S@bad.com', 'ok@x.com']))], ['s@bad.com'])
  await setSpam(db, ['m1'], false)
  await setBlocked(db, 's@bad.com', false)
  assert.equal(await isBlockedSender(db, 's@bad.com'), false)
  assert.equal((await spamIds(db)).has('m1'), false)
})
