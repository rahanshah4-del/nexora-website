import assert from 'node:assert/strict'
import test from 'node:test'
import { attachToTicket, detectPriority, extractTicketId, markPendingAfterReply, ticketsForEmails, updateTicket } from '../workers/shared/tickets.js'
import { alertPayload, alertAdmin, shouldAlert } from '../workers/shared/inboxAlert.js'

// Minimal in-memory D1 stand-in that understands just the statements tickets.js issues.
function fakeDb(mails = {}) {
  const tickets = new Map()
  const map = new Map()
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    first: async () => {
      if (sql.includes('FROM inbound_emails')) return mails[args[0]] || null
      if (sql.includes('FROM email_ticket_map WHERE email_id')) return map.has(args[0]) ? { ticket_id: map.get(args[0]) } : null
      if (sql.includes('FROM email_tickets WHERE ticket_id')) return tickets.get(args[0]) || null
      return null
    },
    all: async () => {
      if (sql.includes('SELECT email_id FROM email_ticket_map')) return { results: args.filter((id) => map.has(id)).map((email_id) => ({ email_id })) }
      if (sql.includes('JOIN email_tickets')) return { results: args.filter((id) => map.has(id)).map((email_id) => ({ email_id, ...tickets.get(map.get(email_id)) })) }
      if (sql.includes('GROUP BY')) return { results: args.map((ticket_id) => ({ ticket_id, n: [...map.values()].filter((t) => t === ticket_id).length })) }
      return { results: [] }
    },
    run: async () => {
      if (sql.startsWith('UPDATE email_tickets SET status = ?, priority = ?, assignee')) {
        const [status, priority, assignee, note, , , id] = args
        Object.assign(tickets.get(id), { status, priority, assignee, note })
      } else if (sql.includes("SET status = 'pending'")) {
        const t = tickets.get(map.get(args[2]))
        if (t?.status === 'open') t.status = 'pending'
      }
      return {}
    },
    sql, args,
  })
  return {
    tickets, map,
    prepare: (sql) => stmt(sql),
    batch: async (list) => {
      for (const s of list) {
        const { sql, args } = s
        if (sql.startsWith('INSERT OR IGNORE INTO email_tickets')) { if (!tickets.has(args[0])) tickets.set(args[0], { ticket_id: args[0], status: args[1], priority: args[2], assignee: '', note: '' }) }
        else if (sql.startsWith('INSERT OR IGNORE INTO email_ticket_map')) { if (!map.has(args[0])) map.set(args[0], args[1]) }
        else if (sql.startsWith('UPDATE email_tickets SET status = ?, priority = ?, updated_at')) Object.assign(tickets.get(args[4]), { status: args[0], priority: args[1] })
      }
      return []
    },
  }
}

test('priority comes from emergency words and from the address', () => {
  assert.equal(detectPriority({ to: 'support@nexorasolution.us', subject: 'URGENT: cannot login' }), 'urgent')
  assert.equal(detectPriority({ to: 'support@x.us', subject: 'Hello', text: 'my payment failed twice' }), 'urgent')
  assert.equal(detectPriority({ to: 'billing@nexorasolution.online', subject: 'Question' }), 'high')
  assert.equal(detectPriority({ to: 'sales@nexorasolution.us', subject: 'Pricing' }), 'high')
  assert.equal(detectPriority({ to: 'hello@nexorasolution.us', subject: 'Hi there', text: 'I would like a demo' }), 'normal')
  assert.equal(detectPriority({ to: 'hello@nexorasolution.us', subject: 'Download link', text: 'where is the guide' }), 'normal')
})

test('ticket reference is read from the subject', () => {
  assert.equal(extractTicketId('Re: Help [nx-6edb92]'), 'NX-6EDB92')
  assert.equal(extractTicketId('No reference here'), '')
  assert.equal(extractTicketId('NX-12345'), '')
})

test('a new mail opens a ticket named after the mail id', async () => {
  const db = fakeDb({ in_a1b2c3d4e5f6: { subject: 'Need help', text_body: '', to_addr: 'support@nexorasolution.us', from_addr: 'a@example.com' } })
  const t = await attachToTicket(db, 'in_a1b2c3d4e5f6')
  assert.deepEqual([t.ticketId, t.isNew, t.priority], ['NX-D4E5F6', true, 'normal'])
  assert.equal(db.tickets.get('NX-D4E5F6').status, 'open')
  // idempotent
  assert.equal((await attachToTicket(db, 'in_a1b2c3d4e5f6')).isNew, false)
})

test('a customer reply joins the ticket, reopens it and can raise priority', async () => {
  const db = fakeDb({
    in_000000first1: { subject: 'Question', text_body: '', to_addr: 'support@nexorasolution.us', from_addr: 'a@example.com' },
    in_000000answer: { subject: 'Re: Question [NX-FIRST1] this is urgent now', text_body: '', to_addr: 'support@nexorasolution.us', from_addr: 'a@example.com' },
  })
  await attachToTicket(db, 'in_000000first1')
  db.tickets.get('NX-FIRST1').status = 'resolved'
  const t = await attachToTicket(db, 'in_000000answer')
  assert.deepEqual([t.ticketId, t.isNew, t.reopened, t.priority], ['NX-FIRST1', false, true, 'urgent'])
  assert.equal(db.tickets.get('NX-FIRST1').status, 'open')
  const list = await ticketsForEmails(db, ['in_000000first1', 'in_000000answer'])
  assert.equal(list.get('in_000000answer').count, 2)
})

test('updating a ticket validates values and replying sets it to pending', async () => {
  const db = fakeDb({ in_00000000abcd: { subject: 'x', text_body: '', to_addr: 'info@nexorasolution.us', from_addr: 'a@example.com' } })
  await attachToTicket(db, 'in_00000000abcd')
  const id = 'NX-00ABCD'.replace('00ABCD', '00ABCD')
  const updated = await updateTicket(db, db.map.get('in_00000000abcd'), { status: 'bogus', priority: 'high', assignee: ' Rahan ', note: 'call back' })
  assert.deepEqual([updated.status, updated.priority, updated.assignee, updated.note], ['open', 'high', 'Rahan', 'call back'])
  assert.equal(await updateTicket(db, 'NX-NOPE00', {}), null)
  await markPendingAfterReply(db, 'in_00000000abcd')
  assert.equal(db.tickets.get(db.map.get('in_00000000abcd')).status, 'pending')
  assert.ok(id)
})

test('no database means no tickets and no crash', async () => {
  assert.equal(await attachToTicket(null, 'in_x'), null)
  assert.equal((await ticketsForEmails(null, ['in_x'])).size, 0)
  await markPendingAfterReply(null, 'in_x')
})

test('only urgent mail and new high-priority mail raise an alert', async () => {
  assert.equal(shouldAlert({ priority: 'urgent' }), true)
  assert.equal(shouldAlert({ priority: 'high', isNew: true }), true)
  assert.equal(shouldAlert({ priority: 'high', isNew: false, reopened: false }), false)
  assert.equal(shouldAlert({ priority: 'normal', isNew: true }), false)
  assert.equal(shouldAlert(null), false)
  const ticket = { priority: 'urgent', ticketId: 'NX-ABC123', subject: 'Down!', from: 'Ayesha <a@example.com>', to: 'support@nexorasolution.us' }
  assert.match(alertPayload(ticket).title, /^Urgent email: Ayesha/)

  const calls = []
  const fetchFn = async (url, init) => { calls.push({ url, init }); return { ok: true } }
  assert.deepEqual(await alertAdmin({}, ticket, { fetchFn }), { sent: false, reason: 'not-configured' })
  const env = { INBOX_ALERT_URL: 'https://example.test/alert', INBOX_ALERT_SECRET: 's3cret' }
  assert.deepEqual(await alertAdmin(env, { ...ticket, priority: 'normal' }, { fetchFn }), { sent: false, reason: 'not-urgent' })
  assert.deepEqual(await alertAdmin(env, ticket, { fetchFn }), { sent: true, reason: 'sent' })
  assert.equal(calls[0].init.headers['x-nexora-secret'], 's3cret')
  assert.equal((await alertAdmin(env, ticket, { fetchFn: async () => { throw new Error('net') } })).sent, false)
})
