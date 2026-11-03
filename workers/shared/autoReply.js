/**
 * Automatic acknowledgement for mail that arrives at Nexora's real addresses (support@, hello@, info@,
 * sales@, billing@, ai@ ...). Each address gets the reply that fits what people write there.
 *
 * Safe by design:
 *   - one reply per sender per 24 hours (D1 table auto_replies), and a daily cap for the whole site;
 *   - never answers bounces, no-reply senders, mailing lists, bulk mail, other auto-replies or Nexora's own addresses;
 *   - the reply carries Auto-Submitted so other systems do not answer it either;
 *   - it never throws and never blocks delivery: the mail is already stored and forwarded.
 *
 * The caller passes `send(payload)` (a Resend-shaped payload in, a fetch Response out), so each Worker
 * uses the sender it already has. Everything else here is pure and tested in plain Node.
 */

import { renderSupportEmail, signatureText } from './emailTemplate.js'

export const REPLY_DOMAIN = 'nexorasolution.us'
export const SENDER_NAME = 'Nexora Solution'
const ONE_DAY_MS = 24 * 3600 * 1000
export const DEFAULT_DAILY_CAP = 300

const SITE = 'https://nexorasolution.us'

/** What each address is for, and the reply that goes with it. `kind` only labels the log. */
export const ADDRESS_PROFILES = {
  support: {
    kind: 'support',
    emoji: '🛠️',
    heading: 'We have received your support request',
    wait: 'within 1 working day',
    body: [
      'Thank you for contacting Nexora Support. Your message has reached our team and a support specialist will reply {wait}.',
      'To help us fix this faster, please reply to this email with:',
    ],
    asks: ['Your business name and the email you log in with', 'The module you were using (for example POS, CRM, School ERP)', 'What happened and what you expected, plus a screenshot if you can'],
    links: [['Help Center', `${SITE}/help-center`]],
  },
  hello: {
    kind: 'general',
    emoji: '👋',
    heading: 'Thanks for getting in touch',
    wait: 'within 1 working day',
    body: ['Thank you for writing to Nexora. We have received your message and a member of our team will reply {wait}.', 'It helps if you tell us:'],
    asks: ['What kind of business you run', 'How many branches and users you have', 'Which problem you want software to solve'],
    links: [['See all modules', `${SITE}/`], ['Pricing', `${SITE}/pricing`]],
  },
  info: {
    kind: 'general',
    emoji: '📩',
    heading: 'Thanks for your enquiry',
    wait: 'within 1 working day',
    body: ['Thank you for your enquiry. We have received it and our team will reply {wait}.'],
    asks: [],
    links: [['See all modules', `${SITE}/`], ['Pricing', `${SITE}/pricing`]],
  },
  sales: {
    kind: 'sales',
    emoji: '💼',
    heading: 'Thanks for your interest in Nexora',
    wait: 'on the same or next working day',
    body: ['Thank you for your interest in Nexora. Our sales team has your message and will reply {wait}.', 'So we can prepare the right demo and quote, please tell us:'],
    asks: ['Your business type (restaurant, retail, school, clinic, property and so on)', 'Number of branches and users', 'Your city and a good phone number'],
    links: [['Pricing', `${SITE}/pricing`]],
  },
  billing: {
    kind: 'billing',
    emoji: '🧾',
    heading: 'We have received your billing message',
    wait: 'within 1 to 2 working days',
    body: ['Thank you for contacting Nexora Billing. Your message is with our accounts team and we will reply {wait}.', 'For payment or invoice questions, please reply with:'],
    asks: ['The email address of your Nexora account', 'The invoice number, or a screenshot or reference of the payment', 'The amount and date of the payment'],
    links: [],
  },
  ai: {
    kind: 'ai',
    emoji: '🤖',
    heading: 'Thanks for your question about Nexora AI',
    wait: 'within 1 to 2 working days',
    body: ['Thank you for writing about Nexora AI. Our team has your message and will reply {wait}.', 'To help us answer properly, please tell us:'],
    asks: ['Which Nexora module you want to use it with', 'What you would like the assistant to do'],
    links: [],
  },
  other: {
    kind: 'other',
    emoji: '📬',
    heading: 'We have received your message',
    wait: 'within 1 to 2 working days',
    body: ['Thank you for your message. It has reached the Nexora team and we will reply {wait}.', 'If your message is about an issue with your account, please write to support@nexorasolution.us and include your business name.'],
    asks: [],
    links: [],
  },
}

/** hallo@ is the same address as hello@ with a typo that already exists in Email Routing. */
const ALIASES = { hallo: 'hello', help: 'support', contact: 'info', enquiries: 'info', inquiries: 'info', accounts: 'billing', invoices: 'billing', payments: 'billing' }

/** Addresses that only send or are internal: they never get a reply. */
const SILENT = new Set(['alerts', 'nexora', 'noreply', 'no-reply', 'donotreply', 'do-not-reply', 'postmaster', 'abuse', 'admin', 'webmaster'])

export function profileFor(localPart) {
  const key = String(localPart || '').toLowerCase().split('+')[0]
  if (SILENT.has(key)) return null
  const name = ALIASES[key] || key
  return ADDRESS_PROFILES[name] || ADDRESS_PROFILES.other
}

const NO_REPLY_SENDER = /^(no[-_.]?reply|do[-_.]?not[-_.]?reply|donotreply|mailer-daemon|postmaster|bounces?|bounce[-+_.=].*|notifications?|notify|alerts?|newsletter|news|mailer|daemon|system|automated|auto|root)$/i
const OWN_DOMAIN = /(^|\.)nexorasolution\.(us|online)$/i

/** Bare address from "Name <a@b.c>" or "a@b.c". Lower-case, or '' when there is none. */
export function bareAddress(value) {
  const text = String(value || '')
  const match = text.match(/<([^<>\s]+@[^<>\s]+)>/) || text.match(/([^\s<>"',;]+@[^\s<>"',;]+)/)
  return match ? match[1].toLowerCase() : ''
}

function headerValue(headers, name) {
  try { return String(headers?.get?.(name) ?? '') } catch { return '' }
}

/**
 * Decide whether this message may get an automatic reply.
 * Returns { ok: true, to } or { ok: false, reason }.
 */
export function assessMessage({ headers, envelopeFrom, to }) {
  const recipientLocal = String(to || '').toLowerCase().split('@')[0]
  if (!profileFor(recipientLocal)) return { ok: false, reason: 'silent-address' }

  const envelope = bareAddress(envelopeFrom)
  if (!envelope) return { ok: false, reason: 'bounce' } // empty return-path = bounce or auto mail
  const replyTo = bareAddress(headerValue(headers, 'reply-to'))
  const from = bareAddress(headerValue(headers, 'from')) || envelope
  const target = replyTo || from
  if (!target || !target.includes('@')) return { ok: false, reason: 'no-sender' }

  for (const address of [envelope, from, target]) {
    const [local, domain = ''] = address.split('@')
    if (NO_REPLY_SENDER.test(local)) return { ok: false, reason: 'no-reply-sender' }
    if (OWN_DOMAIN.test(domain)) return { ok: false, reason: 'own-domain' }
  }

  const autoSubmitted = headerValue(headers, 'auto-submitted').toLowerCase()
  if (autoSubmitted && autoSubmitted !== 'no') return { ok: false, reason: 'auto-submitted' }
  if (/^(bulk|junk|list|auto_reply)$/i.test(headerValue(headers, 'precedence').trim())) return { ok: false, reason: 'bulk' }
  if (headerValue(headers, 'list-id') || headerValue(headers, 'list-unsubscribe') || headerValue(headers, 'list-post')) return { ok: false, reason: 'mailing-list' }
  if (headerValue(headers, 'x-auto-response-suppress') || headerValue(headers, 'x-autoreply') || headerValue(headers, 'x-autorespond')) return { ok: false, reason: 'auto-reply' }
  if (headerValue(headers, 'x-failed-recipients')) return { ok: false, reason: 'bounce' }
  if (/^(auto|automatic reply|out of office|undeliverable|delivery status|returned mail)/i.test(headerValue(headers, 'subject').trim())) return { ok: false, reason: 'auto-subject' }

  return { ok: true, to: target }
}

export const ticketFor = (id) => `NX-${String(id || '').replace(/^in_/, '').slice(-6).toUpperCase()}`


function cleanSubject(subject) {
  const s = String(subject || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 120)
  return s || 'your message'
}

/** The reply for one address. Pure: same input, same output. */
export function buildAutoReply({ localPart, subject, ticket }) {
  const p = profileFor(localPart)
  if (!p) return null
  const intro = p.body.map((line) => line.replace('{wait}', p.wait))
  const text = [
    `${p.emoji} ${p.heading}`,
    '',
    ...intro.slice(0, 1),
    '',
    `Reference: ${ticket}`,
    `Subject: ${cleanSubject(subject)}`,
    ...(intro.length > 1 ? ['', ...intro.slice(1)] : []),
    ...(p.asks.length ? ['', ...p.asks.map((a) => `- ${a}`)] : []),
    ...(p.links.length ? ['', ...p.links.map(([label, url]) => `${label}: ${url}`)] : []),
    '',
    'You can simply reply to this email to add more details. This is an automatic confirmation, so a person from our team will write to you personally.',
    '',
    signatureText(),
  ].join('\n')

  const html = renderSupportEmail({
    emoji: p.emoji,
    heading: p.heading,
    preheader: `Reference ${ticket}. We will reply ${p.wait}.`,
    blocks: [{ type: 'p', text: intro[0] }],
    ticket: { ticketId: ticket, subject: cleanSubject(subject), status: 'open' },
    askTitle: intro.length > 1 ? intro[1] : '',
    asks: p.asks,
    buttons: p.links.map(([label, url], i) => ({ label, url, primary: i === 0 })),
    closing: 'You can simply reply to this email to add more details. This is an automatic confirmation, so a person from our team will write to you personally.',
  })

  return { subject: `Re: ${cleanSubject(subject)} [${ticket}]`, text, html, kind: p.kind }
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS auto_replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sent_at TEXT NOT NULL,
    sender TEXT NOT NULL,
    address TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT '',
    ticket TEXT NOT NULL DEFAULT '',
    inbound_id TEXT NOT NULL DEFAULT '',
    ok INTEGER NOT NULL DEFAULT 1,
    detail TEXT NOT NULL DEFAULT ''
  )`,
  'CREATE INDEX IF NOT EXISTS idx_auto_replies_sender ON auto_replies(sender, sent_at DESC)',
  'CREATE INDEX IF NOT EXISTS idx_auto_replies_inbound ON auto_replies(inbound_id)',
]
const ready = new WeakSet()
async function ensureSchema(db) {
  if (ready.has(db)) return
  await db.batch(SCHEMA.map((sql) => db.prepare(sql)))
  ready.add(db)
}

export const autoReplyEnabled = (env) => String(env?.AUTO_REPLY_ENABLED ?? 'true').toLowerCase() !== 'false'

/**
 * Send the acknowledgement for one stored message. Returns { sent, reason }.
 * `send(payload)` must return a fetch-style Response. Never throws.
 */
export async function maybeAutoReply(env, message, { inboundId, ticket: ticketOverride, send, now = Date.now() } = {}) {
  try {
    const db = env?.EMAIL_DB
    if (!db || !inboundId || typeof send !== 'function') return { sent: false, reason: 'not-configured' }
    if (!autoReplyEnabled(env)) return { sent: false, reason: 'switched-off' }

    const to = String(message.to || '').toLowerCase()
    const verdict = assessMessage({ headers: message.headers, envelopeFrom: message.from, to })
    if (!verdict.ok) return { sent: false, reason: verdict.reason }

    await ensureSchema(db)
    const since = new Date(now - ONE_DAY_MS).toISOString()
    const [recent, today] = await Promise.all([
      db.prepare('SELECT 1 AS hit FROM auto_replies WHERE sender = ? AND ok = 1 AND sent_at > ? LIMIT 1').bind(verdict.to, since).first(),
      db.prepare('SELECT COUNT(*) AS n FROM auto_replies WHERE ok = 1 AND sent_at > ?').bind(since).first(),
    ])
    if (recent) return { sent: false, reason: 'already-replied' }
    const cap = Number(env.AUTO_REPLY_DAILY_CAP) || DEFAULT_DAILY_CAP
    if (Number(today?.n || 0) >= cap) return { sent: false, reason: 'daily-cap' }

    const localPart = to.split('@')[0]
    const ticket = ticketOverride || ticketFor(inboundId)
    const reply = buildAutoReply({ localPart, subject: headerValue(message.headers, 'subject'), ticket })
    if (!reply) return { sent: false, reason: 'silent-address' }

    const messageId = headerValue(message.headers, 'message-id').trim()
    const payload = {
      from: `${SENDER_NAME} <${localPart.split('+')[0]}@${REPLY_DOMAIN}>`,
      to: [verdict.to],
      reply_to: `${localPart.split('+')[0]}@${REPLY_DOMAIN}`,
      subject: reply.subject,
      text: reply.text,
      html: reply.html,
      headers: {
        'Auto-Submitted': 'auto-replied',
        'X-Auto-Response-Suppress': 'All',
        Precedence: 'auto_reply',
        ...(messageId ? { 'In-Reply-To': messageId, References: messageId } : {}),
      },
    }
    let ok = false
    let detail = ''
    try {
      const response = await send(payload)
      ok = Boolean(response?.ok)
      if (!ok) detail = `HTTP ${response?.status ?? '?'}`
    } catch (error) {
      detail = String(error?.message || error).slice(0, 160)
    }
    await db.prepare('INSERT INTO auto_replies (sent_at, sender, address, kind, ticket, inbound_id, ok, detail) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(new Date(now).toISOString(), verdict.to, to, reply.kind, ticket, inboundId, ok ? 1 : 0, detail).run()
    return ok ? { sent: true, reason: 'sent' } : { sent: false, reason: detail || 'send-failed' }
  } catch (error) {
    console.warn('auto-reply failed', String(error?.message || error).slice(0, 200))
    return { sent: false, reason: 'error' }
  }
}

/** Which of these inbox ids were auto-answered? Returns a Map id -> { ticket, kind }. Never throws. */
export async function autoRepliedMap(db, ids) {
  const map = new Map()
  try {
    if (!db || !ids?.length) return map
    await ensureSchema(db)
    const list = ids.slice(0, 100)
    const { results } = await db.prepare(`SELECT inbound_id, ticket, kind FROM auto_replies WHERE ok = 1 AND inbound_id IN (${list.map(() => '?').join(',')})`).bind(...list).all()
    for (const row of results || []) map.set(row.inbound_id, { ticket: row.ticket, kind: row.kind })
  } catch { /* the tag is a nicety */ }
  return map
}
