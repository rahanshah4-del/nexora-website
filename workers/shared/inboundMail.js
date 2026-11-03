/**
 * Mail that arrives at Nexora's real addresses (support@, hello@, info@, ... on nexorasolution.us and
 * nexorasolution.online) is kept in the D1 database "nexora-email-state", table inbound_emails, so the
 * Control Centre Inbox can list, read, star, archive and reply to it.
 *
 * Used by two Workers through Cloudflare Email Routing:
 *   - nexora-email-api  (its email() handler: addresses routed to it)
 *   - nexora-temp-mail  (the zone catch-all: any address that is not a temp-mail address)
 * Both also forward a copy to a real mailbox, so storing here can never lose mail.
 *
 * Every function is safe to call without a database: it then does nothing.
 */
import PostalMime from 'postal-mime'

export const INBOUND_PREFIX = 'in_'
const MAX_RAW_BYTES = 10 * 1024 * 1024
const MAX_BODY_CHARS = 400_000
// D1 rows are limited to about 2 MB, so one attachment is kept only up to this size; bigger ones stay in the forwarded Gmail copy.
export const MAX_STORED_ATTACHMENT_BYTES = 700 * 1024
const MAX_STORED_ATTACHMENTS = 10

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS inbound_emails (
    id TEXT PRIMARY KEY,
    received_at TEXT NOT NULL,
    from_addr TEXT NOT NULL DEFAULT '',
    to_addr TEXT NOT NULL DEFAULT '',
    to_list TEXT NOT NULL DEFAULT '[]',
    cc_list TEXT NOT NULL DEFAULT '[]',
    reply_to TEXT NOT NULL DEFAULT '[]',
    subject TEXT NOT NULL DEFAULT '',
    text_body TEXT NOT NULL DEFAULT '',
    html_body TEXT NOT NULL DEFAULT '',
    message_id TEXT NOT NULL DEFAULT '',
    refs TEXT NOT NULL DEFAULT '',
    attachments TEXT NOT NULL DEFAULT '[]',
    size INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS inbound_attachments (
    email_id TEXT NOT NULL,
    idx INTEGER NOT NULL,
    filename TEXT NOT NULL DEFAULT '',
    content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
    size INTEGER NOT NULL DEFAULT 0,
    data TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (email_id, idx)
  )`,
  'CREATE INDEX IF NOT EXISTS idx_inbound_received ON inbound_emails(received_at DESC)',
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_inbound_msgid ON inbound_emails(message_id, to_addr) WHERE message_id != ''",
]

const schemaReady = new WeakSet()

export async function ensureInboundSchema(db) {
  if (!db || schemaReady.has(db)) return
  await db.batch(SCHEMA.map((sql) => db.prepare(sql)))
  schemaReady.add(db)
}

const text = (value) => String(value ?? '').trim()
const clip = (value) => text(value).length > MAX_BODY_CHARS ? `${String(value).slice(0, MAX_BODY_CHARS)}\n\n[Message shortened]` : String(value ?? '')
const json = (value) => JSON.stringify(value ?? [])
const parse = (value, fallback = []) => { try { const v = JSON.parse(value); return Array.isArray(v) ? v : fallback } catch { return fallback } }

/** "Name <a@b.c>" from a postal-mime address object. */
export function formatAddress(address) {
  if (!address) return ''
  const mail = text(address.address)
  const name = text(address.name)
  if (!mail) return name
  return name && name.toLowerCase() !== mail.toLowerCase() ? `${name.replace(/[<>"]/g, '')} <${mail}>` : mail
}

export function toBase64(bytes) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let binary = ''
  for (let i = 0; i < view.length; i += 0x8000) binary += String.fromCharCode(...view.subarray(i, i + 0x8000))
  return btoa(binary)
}

export function fromBase64(value) {
  const binary = atob(String(value || ''))
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i)
  return out
}

/** Attachments of a parsed message that fit in D1: [{ idx, filename, content_type, size, data(base64) }]. Pure. */
export function storableAttachments(parsed) {
  const list = Array.isArray(parsed?.attachments) ? parsed.attachments : []
  const out = []
  list.slice(0, 30).forEach((a, i) => {
    const size = a?.content?.byteLength ?? a?.content?.length ?? 0
    if (!size || size > MAX_STORED_ATTACHMENT_BYTES || out.length >= MAX_STORED_ATTACHMENTS) return
    out.push({ idx: i, filename: text(a.filename) || `attachment-${i + 1}`, content_type: text(a.mimeType) || 'application/octet-stream', size, data: toBase64(a.content) })
  })
  return out
}

const addressList = (list) => (Array.isArray(list) ? list.map(formatAddress).filter(Boolean) : [])

const newId = () => `${INBOUND_PREFIX}${Date.now().toString(36)}${crypto.randomUUID().replaceAll('-', '').slice(0, 10)}`

/** Turn a parsed message (postal-mime output) into the row we store. Pure. */
export function buildInboundRow(parsed, { envelopeFrom = '', envelopeTo = '', size = 0, now = new Date() } = {}) {
  const from = formatAddress(parsed?.from) || text(envelopeFrom)
  return {
    id: newId(),
    received_at: now.toISOString(),
    from_addr: from,
    to_addr: text(envelopeTo).toLowerCase(),
    to_list: json(addressList(parsed?.to)),
    cc_list: json(addressList(parsed?.cc)),
    reply_to: json(addressList(parsed?.replyTo)),
    subject: text(parsed?.subject).slice(0, 500),
    text_body: clip(parsed?.text),
    html_body: clip(parsed?.html),
    message_id: text(parsed?.messageId).slice(0, 500),
    refs: text(parsed?.references).slice(0, 2000),
    attachments: json((parsed?.attachments || []).slice(0, 30).map((a, i) => ({
      id: `${i}`,
      filename: text(a.filename) || `attachment-${i + 1}`,
      content_type: text(a.mimeType),
      size: a.content?.byteLength ?? a.content?.length ?? 0,
      stored: (a.content?.byteLength ?? a.content?.length ?? 0) > 0 && (a.content?.byteLength ?? a.content?.length ?? 0) <= MAX_STORED_ATTACHMENT_BYTES && i < 30,
    }))),
    size: Number(size) || 0,
  }
}

/**
 * Parse and store one Email Routing message. Returns the stored id, or null when there is no database,
 * the message is too big to parse, or it was already stored. Never throws.
 */
export async function storeInboundMessage(env, message, { now = new Date() } = {}) {
  const db = env?.EMAIL_DB
  if (!db || !message) return null
  try {
    await ensureInboundSchema(db)
    const size = Number(message.rawSize) || 0
    let parsed = null
    if (!size || size <= MAX_RAW_BYTES) {
      const raw = await new Response(message.raw).arrayBuffer()
      parsed = await PostalMime.parse(raw)
    } else {
      parsed = { subject: message.headers?.get?.('subject') || '', text: `[This message is ${(size / 1048576).toFixed(1)} MB and was not opened here. A copy was forwarded to your mailbox.]` }
    }
    const row = buildInboundRow(parsed, { envelopeFrom: message.from, envelopeTo: message.to, size, now })
    const result = await db.prepare(
      `INSERT OR IGNORE INTO inbound_emails
       (id, received_at, from_addr, to_addr, to_list, cc_list, reply_to, subject, text_body, html_body, message_id, refs, attachments, size)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(row.id, row.received_at, row.from_addr, row.to_addr, row.to_list, row.cc_list, row.reply_to, row.subject, row.text_body, row.html_body, row.message_id, row.refs, row.attachments, row.size).run()
    if (result?.meta?.changes) {
      const files = storableAttachments(parsed)
      if (files.length) {
        try {
          await db.batch(files.map((f) => db.prepare('INSERT OR REPLACE INTO inbound_attachments (email_id, idx, filename, content_type, size, data) VALUES (?, ?, ?, ?, ?, ?)')
            .bind(row.id, f.idx, f.filename, f.content_type, f.size, f.data)))
        } catch (error) {
          console.warn('attachment store failed', String(error?.message || error).slice(0, 160))
        }
      }
    }
    return result?.meta?.changes ? row.id : null
  } catch (error) {
    console.warn('inbound store failed', String(error?.message || error).slice(0, 200))
    return null
  }
}

/** The API shape the Control Centre expects (same field names as Resend's received-email objects). */
export function inboundToApi(row, { withBody = false } = {}) {
  if (!row) return null
  const to = parse(row.to_list)
  const out = {
    id: row.id,
    from: row.from_addr,
    to: to.length ? to : [row.to_addr].filter(Boolean),
    cc: parse(row.cc_list),
    reply_to: parse(row.reply_to),
    subject: row.subject,
    created_at: row.received_at,
    message_id: row.message_id,
    received_at_address: row.to_addr,
    attachments: parse(row.attachments),
    source: 'routing',
  }
  if (withBody) {
    out.text = row.text_body
    out.html = row.html_body
    out.headers = row.refs ? { references: row.refs } : {}
  }
  return out
}

export async function listInbound(db, limit = 100) {
  if (!db) return []
  await ensureInboundSchema(db)
  const { results } = await db.prepare(
    `SELECT id, received_at, from_addr, to_addr, to_list, cc_list, reply_to, subject, message_id, refs, attachments, size, SUBSTR(text_body, 1, 240) AS snippet
     FROM inbound_emails ORDER BY received_at DESC LIMIT ?`,
  ).bind(limit).all()
  return (results || []).map((row) => ({ ...inboundToApi(row), snippet: String(row.snippet || '').replace(/\s+/g, ' ').trim().slice(0, 140) }))
}

/** One stored attachment: { filename, content_type, size, bytes } or null. */
export async function getInboundAttachment(db, emailId, idx) {
  if (!db) return null
  await ensureInboundSchema(db)
  const row = await db.prepare('SELECT filename, content_type, size, data FROM inbound_attachments WHERE email_id = ? AND idx = ?').bind(emailId, idx).first()
  return row ? { filename: row.filename, content_type: row.content_type, size: row.size, bytes: fromBase64(row.data) } : null
}

/**
 * A cheap fingerprint of everything the Inbox shows, so the page can ask "did anything change?" every few
 * seconds without downloading the list. Changes when mail arrives, or a flag/ticket is edited anywhere.
 */
export async function inboxPulse(db) {
  if (!db) return { version: '0', total: 0, latestAt: '' }
  await ensureInboundSchema(db)
  const mail = await db.prepare('SELECT COUNT(*) AS n, COALESCE(MAX(received_at), \'\') AS latest FROM inbound_emails').first()
  let state = { latest: '' }
  let tickets = { latest: '' }
  try { state = (await db.prepare('SELECT COALESCE(MAX(updated_at), \'\') AS latest FROM email_state').first()) || state } catch { /* table may not exist yet */ }
  try { tickets = (await db.prepare('SELECT COALESCE(MAX(updated_at), \'\') AS latest FROM email_tickets').first()) || tickets } catch { /* same */ }
  return { version: `${mail?.n || 0}|${mail?.latest || ''}|${state.latest || ''}|${tickets.latest || ''}`, total: mail?.n || 0, latestAt: mail?.latest || '' }
}

export async function getInbound(db, id) {
  if (!db) return null
  await ensureInboundSchema(db)
  const row = await db.prepare('SELECT * FROM inbound_emails WHERE id = ?').bind(id).first()
  return inboundToApi(row, { withBody: true })
}

export const isInboundId = (id) => String(id || '').startsWith(INBOUND_PREFIX)
