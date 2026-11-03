/**
 * Support tickets for the Control Centre Inbox.
 *
 * Every mail that arrives at a real Nexora address belongs to exactly one ticket:
 *   - a customer reply that carries the ticket reference ("[NX-6EDB92]" in the subject, which the auto-reply
 *     and the Inbox's own replies add) joins that ticket, and reopens it if it was resolved;
 *   - any other mail opens a new ticket whose reference is derived from the mail id (same value the
 *     auto-reply quotes, see ticketFor in autoReply.js).
 * Status (open / pending / resolved), priority (normal / high / urgent), assignee and an internal note live
 * in D1 next to the inbox. Priority is set from the address and from words that signal an emergency.
 *
 * Every function is safe to call without a database, and the write paths never throw: a ticket problem must
 * never lose or delay mail.
 */
import { ticketFor } from './autoReply.js'
import { logTicketEvent } from './mailbox.js'

export const STATUSES = ['open', 'pending', 'resolved']
export const PRIORITIES = ['normal', 'high', 'urgent']
const RANK = { normal: 0, high: 1, urgent: 2 }

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS email_tickets (
    ticket_id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'open',
    priority TEXT NOT NULL DEFAULT 'normal',
    assignee TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_activity_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS email_ticket_map (
    email_id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS idx_ticket_map_ticket ON email_ticket_map(ticket_id)',
  'CREATE INDEX IF NOT EXISTS idx_tickets_status ON email_tickets(status, last_activity_at DESC)',
]
const ready = new WeakSet()
export async function ensureTicketSchema(db) {
  if (!db || ready.has(db)) return
  await db.batch(SCHEMA.map((sql) => db.prepare(sql)))
  ready.add(db)
}

const URGENT_WORDS = /\b(urgent|urgently|asap|emergency|immediately|right now|critical|down|outage|not working|stopped working|cannot login|can't login|cant login|unable to login|locked out|data lost|lost data|hacked|breach|charged twice|double charged|wrong charge|payment failed|refund|chargeback|fraud|scam|legal|lawyer|cancel(?:l)?ation)\b/i
const HIGH_ADDRESSES = new Set(['billing', 'sales'])

/** 'normal' | 'high' | 'urgent' from the address mail came to, the subject and the body. Pure. */
export function detectPriority({ to = '', subject = '', text = '' } = {}) {
  const sample = `${subject}\n${String(text).slice(0, 1500)}`
  if (URGENT_WORDS.test(sample)) return 'urgent'
  const local = String(to).toLowerCase().split('@')[0].split('+')[0]
  if (HIGH_ADDRESSES.has(local)) return 'high'
  return 'normal'
}

/** "NX-6EDB92" found in a subject line, upper-cased, or ''. */
export function extractTicketId(subject) {
  const match = String(subject || '').match(/\bNX-([A-Z0-9]{6})\b/i)
  return match ? `NX-${match[1].toUpperCase()}` : ''
}

const higher = (a, b) => (RANK[b] > RANK[a] ? b : a)
const iso = (now) => new Date(now).toISOString()

/**
 * Put one stored inbox mail on a ticket (new or existing). Returns
 * { ticketId, isNew, reopened, priority, subject, from, to } or null. Never throws.
 */
export async function attachToTicket(db, emailId, { now = Date.now() } = {}) {
  if (!db || !emailId) return null
  try {
    await ensureTicketSchema(db)
    const mail = await db.prepare('SELECT subject, text_body, to_addr, from_addr FROM inbound_emails WHERE id = ?').bind(emailId).first()
    if (!mail) return null
    const priority = detectPriority({ to: mail.to_addr, subject: mail.subject, text: mail.text_body })
    const stamp = iso(now)

    const existingMap = await db.prepare('SELECT ticket_id FROM email_ticket_map WHERE email_id = ?').bind(emailId).first()
    if (existingMap) return { ticketId: existingMap.ticket_id, isNew: false, reopened: false, priority, subject: mail.subject, from: mail.from_addr, to: mail.to_addr }

    const referenced = extractTicketId(mail.subject)
    const current = referenced ? await db.prepare('SELECT ticket_id, status, priority FROM email_tickets WHERE ticket_id = ?').bind(referenced).first() : null
    if (current) {
      const reopened = current.status === 'resolved' || current.status === 'pending'
      await db.batch([
        db.prepare('INSERT OR IGNORE INTO email_ticket_map (email_id, ticket_id) VALUES (?, ?)').bind(emailId, current.ticket_id),
        db.prepare('UPDATE email_tickets SET status = ?, priority = ?, updated_at = ?, last_activity_at = ? WHERE ticket_id = ?')
          .bind('open', higher(current.priority, priority), stamp, stamp, current.ticket_id),
      ])
      await logTicketEvent(db, current.ticket_id, reopened ? 'reopened' : 'customer_replied', reopened ? `Customer replied while ${current.status}` : '', { now })
      return { ticketId: current.ticket_id, isNew: false, reopened, priority: higher(current.priority, priority), subject: mail.subject, from: mail.from_addr, to: mail.to_addr }
    }

    const ticketId = ticketFor(emailId)
    await db.batch([
      db.prepare('INSERT OR IGNORE INTO email_tickets (ticket_id, status, priority, created_at, updated_at, last_activity_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(ticketId, 'open', priority, stamp, stamp, stamp),
      db.prepare('INSERT OR IGNORE INTO email_ticket_map (email_id, ticket_id) VALUES (?, ?)').bind(emailId, ticketId),
    ])
    await logTicketEvent(db, ticketId, 'created', `Priority ${priority}`, { now })
    return { ticketId, isNew: true, reopened: false, priority, subject: mail.subject, from: mail.from_addr, to: mail.to_addr }
  } catch (error) {
    console.warn('ticket attach failed', String(error?.message || error).slice(0, 200))
    return null
  }
}

/** Tickets for these inbox mails: Map email_id -> { ticketId, status, priority, assignee, note, count }. Never throws. */
export async function ticketsForEmails(db, emailIds, { now = Date.now() } = {}) {
  const out = new Map()
  try {
    if (!db || !emailIds?.length) return out
    await ensureTicketSchema(db)
    const ids = emailIds.slice(0, 100)
    // Mail that arrived before tickets existed gets its ticket now, so old mail is not left out.
    const placeholders = ids.map(() => '?').join(',')
    const mapped = new Set(((await db.prepare(`SELECT email_id FROM email_ticket_map WHERE email_id IN (${placeholders})`).bind(...ids).all()).results || []).map((r) => r.email_id))
    for (const id of ids.filter((x) => !mapped.has(x))) await attachToTicket(db, id, { now })

    const { results } = await db.prepare(
      `SELECT m.email_id, t.ticket_id, t.status, t.priority, t.assignee, t.note, t.last_activity_at
       FROM email_ticket_map m JOIN email_tickets t ON t.ticket_id = m.ticket_id WHERE m.email_id IN (${placeholders})`,
    ).bind(...ids).all()
    const ticketIds = [...new Set((results || []).map((r) => r.ticket_id))]
    const counts = new Map()
    if (ticketIds.length) {
      const q = ticketIds.map(() => '?').join(',')
      const rows = (await db.prepare(`SELECT ticket_id, COUNT(*) AS n FROM email_ticket_map WHERE ticket_id IN (${q}) GROUP BY ticket_id`).bind(...ticketIds).all()).results || []
      for (const r of rows) counts.set(r.ticket_id, r.n)
    }
    for (const r of results || []) {
      out.set(r.email_id, { ticketId: r.ticket_id, status: r.status, priority: r.priority, assignee: r.assignee, note: r.note, lastActivityAt: r.last_activity_at, count: counts.get(r.ticket_id) || 1 })
    }
  } catch (error) {
    console.warn('ticket lookup failed', String(error?.message || error).slice(0, 200))
  }
  return out
}

/** Change a ticket from the Control Centre. Returns the updated ticket or null when it does not exist. */
export async function updateTicket(db, ticketId, patch = {}, { now = Date.now() } = {}) {
  await ensureTicketSchema(db)
  const row = await db.prepare('SELECT * FROM email_tickets WHERE ticket_id = ?').bind(ticketId).first()
  if (!row) return null
  const next = {
    status: STATUSES.includes(patch.status) ? patch.status : row.status,
    priority: PRIORITIES.includes(patch.priority) ? patch.priority : row.priority,
    assignee: typeof patch.assignee === 'string' ? patch.assignee.trim().slice(0, 80) : row.assignee,
    note: typeof patch.note === 'string' ? patch.note.slice(0, 2000) : row.note,
  }
  const stamp = iso(now)
  await db.prepare('UPDATE email_tickets SET status = ?, priority = ?, assignee = ?, note = ?, updated_at = ?, last_activity_at = ? WHERE ticket_id = ?')
    .bind(next.status, next.priority, next.assignee, next.note, stamp, stamp, ticketId).run()
  if (next.status !== row.status) await logTicketEvent(db, ticketId, 'status', `${row.status} -> ${next.status}`, { now })
  if (next.priority !== row.priority) await logTicketEvent(db, ticketId, 'priority', `${row.priority} -> ${next.priority}`, { now })
  if (next.assignee !== row.assignee && next.assignee) await logTicketEvent(db, ticketId, 'assigned', next.assignee, { now })
  return { ticketId, ...next, lastActivityAt: stamp }
}

/** After Nexora answers a ticket it is waiting for the customer. Resolved tickets stay resolved. Never throws. */
export async function markPendingAfterReply(db, emailId, { now = Date.now() } = {}) {
  try {
    if (!db || !emailId) return
    await ensureTicketSchema(db)
    const stamp = iso(now)
    const ticket = await db.prepare('SELECT t.ticket_id AS id FROM email_tickets t JOIN email_ticket_map m ON m.ticket_id = t.ticket_id WHERE m.email_id = ? AND t.status = \'open\'').bind(emailId).first()
    await db.prepare(
      `UPDATE email_tickets SET status = 'pending', updated_at = ?, last_activity_at = ?
       WHERE status = 'open' AND ticket_id = (SELECT ticket_id FROM email_ticket_map WHERE email_id = ?)`,
    ).bind(stamp, stamp, emailId).run()
    if (ticket?.id) await logTicketEvent(db, ticket.id, 'status', 'open -> pending (reply sent)', { now })
  } catch { /* the reply itself already went out */ }
}

/** The ticket reference for a mail (for the subject of Inbox replies). Falls back to the mail-derived one. */
export async function ticketIdFor(db, emailId) {
  try {
    if (!db) return ticketFor(emailId)
    await ensureTicketSchema(db)
    const row = await db.prepare('SELECT ticket_id FROM email_ticket_map WHERE email_id = ?').bind(emailId).first()
    return row?.ticket_id || ticketFor(emailId)
  } catch { return ticketFor(emailId) }
}
