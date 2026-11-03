/**
 * Mailbox memory for the Control Centre Inbox, kept in D1 next to the inbox:
 *   - sent_emails     every mail Nexora sends from the Inbox (replies, new emails), so there is a real "Sent" folder;
 *   - ticket_events   what happened to a ticket (opened, replied, resolved, reopened by the customer, ...);
 *   - blocked_senders / spam_mail   addresses that must never reach the Inbox, and mail filed as spam.
 * The ticket timeline merges all of that with the customer's own messages and the automatic replies.
 * Writes never throw: a bookkeeping problem must never stop mail from being sent or received.
 */
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS sent_emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL DEFAULT 'reply',
    from_addr TEXT NOT NULL DEFAULT '',
    to_addr TEXT NOT NULL DEFAULT '',
    cc TEXT NOT NULL DEFAULT '',
    subject TEXT NOT NULL DEFAULT '',
    body_text TEXT NOT NULL DEFAULT '',
    attachments TEXT NOT NULL DEFAULT '[]',
    ticket_id TEXT NOT NULL DEFAULT '',
    inbound_id TEXT NOT NULL DEFAULT '',
    provider_id TEXT NOT NULL DEFAULT '',
    sent_at TEXT NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS idx_sent_emails_at ON sent_emails(sent_at DESC)',
  'CREATE INDEX IF NOT EXISTS idx_sent_emails_ticket ON sent_emails(ticket_id)',
  `CREATE TABLE IF NOT EXISTS ticket_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT '',
    at TEXT NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS idx_ticket_events_ticket ON ticket_events(ticket_id, at)',
  `CREATE TABLE IF NOT EXISTS blocked_senders (
    address TEXT PRIMARY KEY,
    kind TEXT NOT NULL DEFAULT 'blocked',
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS spam_mail (
    email_id TEXT PRIMARY KEY,
    reported_at TEXT NOT NULL
  )`,
]
const ready = new WeakSet()
export async function ensureMailboxSchema(db) {
  if (!db || ready.has(db)) return
  await db.batch(SCHEMA.map((sql) => db.prepare(sql)))
  ready.add(db)
}

const iso = (now) => new Date(now).toISOString()
const str = (v, max = 4000) => String(v ?? '').slice(0, max)

/** "Name <A@B.com>" -> "a@b.com" ('' when there is none). Pure. */
export function addressOf(value) {
  const text = String(value ?? '')
  const match = text.match(/<([^<>\s]+@[^<>\s]+)>/) || text.match(/([^\s<>"',;]+@[^\s<>"',;]+)/)
  return match ? match[1].toLowerCase() : ''
}

// ---- sent mail ------------------------------------------------------------------------------------------
export async function recordSent(db, mail, { now = Date.now() } = {}) {
  try {
    if (!db) return
    await ensureMailboxSchema(db)
    await db.prepare('INSERT INTO sent_emails (kind, from_addr, to_addr, cc, subject, body_text, attachments, ticket_id, inbound_id, provider_id, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(str(mail.kind || 'reply', 20), str(mail.from, 200), str(mail.to, 500), str(mail.cc, 500), str(mail.subject, 300), str(mail.body, 20000),
        JSON.stringify((mail.attachments || []).map((a) => ({ filename: str(a.filename, 120), size: Number(a.size) || 0 })).slice(0, 10)),
        str(mail.ticketId, 20), str(mail.inboundId, 120), str(mail.providerId, 120), iso(now)).run()
  } catch (error) { console.warn('record sent failed', String(error?.message || error).slice(0, 200)) }
}

const sentRow = (r) => ({
  id: `sent-${r.id}`, kind: r.kind, from: r.from_addr, to: r.to_addr, cc: r.cc, subject: r.subject, text: r.body_text,
  attachments: (() => { try { return JSON.parse(r.attachments || '[]') } catch { return [] } })(),
  ticketId: r.ticket_id, inboundId: r.inbound_id, sentAt: r.sent_at,
})

export async function listSent(db, { limit = 100, offset = 0 } = {}) {
  if (!db) return []
  await ensureMailboxSchema(db)
  const { results } = await db.prepare('SELECT * FROM sent_emails ORDER BY sent_at DESC LIMIT ? OFFSET ?').bind(Math.min(limit, 200), Math.max(0, offset)).all()
  return (results || []).map(sentRow)
}

// ---- ticket events --------------------------------------------------------------------------------------
export async function logTicketEvent(db, ticketId, kind, detail = '', { now = Date.now() } = {}) {
  try {
    if (!db || !ticketId) return
    await ensureMailboxSchema(db)
    await db.prepare('INSERT INTO ticket_events (ticket_id, kind, detail, at) VALUES (?, ?, ?, ?)').bind(ticketId, str(kind, 30), str(detail, 300), iso(now)).run()
  } catch (error) { console.warn('ticket event failed', String(error?.message || error).slice(0, 200)) }
}

/**
 * Everything that happened on one ticket, oldest first:
 * [{ type: 'inbound'|'sent'|'auto'|'event', at, ... }]. Never throws (returns [] on trouble).
 */
export async function ticketTimeline(db, ticketId) {
  try {
    if (!db || !ticketId) return []
    await ensureMailboxSchema(db)
    const [inbound, sent, replies, autos, events, ticket] = await Promise.all([
      db.prepare('SELECT i.id, i.from_addr, i.to_addr, i.subject, SUBSTR(i.text_body, 1, 600) AS snippet, i.received_at, i.attachments FROM email_ticket_map m JOIN inbound_emails i ON i.id = m.email_id WHERE m.ticket_id = ?').bind(ticketId).all(),
      db.prepare('SELECT * FROM sent_emails WHERE ticket_id = ?').bind(ticketId).all(),
      db.prepare('SELECT r.sent_email_id, r.recipient, r.subject, r.body_text, r.sent_at FROM email_replies r JOIN email_ticket_map m ON m.email_id = r.inbound_email_id WHERE m.ticket_id = ?').bind(ticketId).all().catch(() => ({ results: [] })),
      db.prepare('SELECT sent_at, address, kind, ok FROM auto_replies WHERE ticket = ?').bind(ticketId).all().catch(() => ({ results: [] })),
      db.prepare('SELECT kind, detail, at FROM ticket_events WHERE ticket_id = ?').bind(ticketId).all(),
      db.prepare('SELECT created_at FROM email_tickets WHERE ticket_id = ?').bind(ticketId).first().catch(() => null),
    ])
    const items = []
    for (const r of inbound.results || []) {
      let files = 0
      try { files = JSON.parse(r.attachments || '[]').length } catch { /* keep 0 */ }
      items.push({ type: 'inbound', id: r.id, at: r.received_at, from: r.from_addr, to: r.to_addr, subject: r.subject, snippet: String(r.snippet || '').replace(/\s+/g, ' ').trim(), attachments: files })
    }
    const sentProviderIds = new Set()
    for (const r of sent.results || []) {
      if (r.provider_id) sentProviderIds.add(r.provider_id)
      const s = sentRow(r)
      items.push({ type: 'sent', id: s.id, at: s.sentAt, from: s.from, to: s.to, subject: s.subject, snippet: s.text.replace(/\s+/g, ' ').trim().slice(0, 600), attachments: s.attachments.length })
    }
    for (const r of replies.results || []) {
      if (r.sent_email_id && sentProviderIds.has(r.sent_email_id)) continue // already recorded in sent_emails
      items.push({ type: 'sent', id: `reply-${r.sent_email_id || r.sent_at}`, at: r.sent_at, from: '', to: r.recipient, subject: r.subject, snippet: String(r.body_text || '').replace(/\s+/g, ' ').trim().slice(0, 600), attachments: 0 })
    }
    for (const r of autos.results || []) if (r.ok) items.push({ type: 'auto', id: `auto-${r.sent_at}`, at: r.sent_at, to: r.address, kind: r.kind })
    for (const r of events.results || []) items.push({ type: 'event', id: `ev-${r.at}-${r.kind}`, at: r.at, kind: r.kind, detail: r.detail })
    if (!items.some((i) => i.type === 'event' && i.kind === 'created') && ticket?.created_at) items.push({ type: 'event', id: 'ev-created', at: ticket.created_at, kind: 'created', detail: '' })
    return items.sort((a, b) => String(a.at).localeCompare(String(b.at)))
  } catch (error) {
    console.warn('timeline failed', String(error?.message || error).slice(0, 200))
    return []
  }
}

// ---- spam and blocked senders ---------------------------------------------------------------------------
export async function isBlockedSender(db, from) {
  try {
    const address = addressOf(from)
    if (!db || !address) return false
    await ensureMailboxSchema(db)
    return Boolean(await db.prepare('SELECT 1 AS hit FROM blocked_senders WHERE address = ?').bind(address).first())
  } catch { return false }
}

export async function blockedAmong(db, addresses) {
  const out = new Set()
  try {
    const list = [...new Set(addresses.map(addressOf).filter(Boolean))].slice(0, 100)
    if (!db || !list.length) return out
    await ensureMailboxSchema(db)
    const { results } = await db.prepare(`SELECT address FROM blocked_senders WHERE address IN (${list.map(() => '?').join(',')})`).bind(...list).all()
    for (const r of results || []) out.add(r.address)
  } catch { /* none blocked */ }
  return out
}

export async function setBlocked(db, address, blocked, { now = Date.now() } = {}) {
  const clean = addressOf(address)
  if (!db || !clean) return false
  await ensureMailboxSchema(db)
  if (blocked) await db.prepare('INSERT INTO blocked_senders (address, kind, created_at) VALUES (?, ?, ?) ON CONFLICT(address) DO NOTHING').bind(clean, 'blocked', iso(now)).run()
  else await db.prepare('DELETE FROM blocked_senders WHERE address = ?').bind(clean).run()
  return true
}

export async function listBlocked(db) {
  if (!db) return []
  await ensureMailboxSchema(db)
  const { results } = await db.prepare('SELECT address, created_at FROM blocked_senders ORDER BY created_at DESC LIMIT 500').all()
  return (results || []).map((r) => ({ address: r.address, createdAt: r.created_at }))
}

export async function setSpam(db, ids, spam, { now = Date.now() } = {}) {
  const list = [...new Set((ids || []).map((v) => String(v || '')).filter(Boolean))].slice(0, 50)
  if (!db || !list.length) return 0
  await ensureMailboxSchema(db)
  const stmts = list.map((id) => (spam
    ? db.prepare('INSERT INTO spam_mail (email_id, reported_at) VALUES (?, ?) ON CONFLICT(email_id) DO NOTHING').bind(id, iso(now))
    : db.prepare('DELETE FROM spam_mail WHERE email_id = ?').bind(id)))
  await db.batch(stmts)
  return list.length
}

export async function spamIds(db) {
  try {
    if (!db) return new Set()
    await ensureMailboxSchema(db)
    const { results } = await db.prepare('SELECT email_id FROM spam_mail').all()
    return new Set((results || []).map((r) => r.email_id))
  } catch { return new Set() }
}

/**
 * Called right after a mail is stored. A blocked sender's mail is filed as spam and nothing else happens
 * (no ticket, no auto-reply, no push alert, no Gmail copy). Returns true when the mail was stopped.
 */
export async function stopIfBlocked(db, inboundId) {
  try {
    if (!db || !inboundId) return false
    const row = await db.prepare('SELECT from_addr FROM inbound_emails WHERE id = ?').bind(inboundId).first()
    if (!row || !(await isBlockedSender(db, row.from_addr))) return false
    await setSpam(db, [inboundId], true)
    return true
  } catch { return false }
}
