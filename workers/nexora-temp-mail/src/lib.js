/**
 * Pure helpers for nexora-temp-mail (no Worker globals, so they are unit tested
 * in tests/temp-mail.test.mjs).
 */

export const DEFAULT_TTL_SECONDS = 3600
export const MIN_TTL_SECONDS = 60 // KV's minimum expirationTtl
export const MAX_RAW_EMAIL_BYTES = 512 * 1024 // bigger mail is rejected, attachments are not kept
export const MAX_TEXT_CHARS = 20_000
export const MAX_HTML_CHARS = 120_000
export const MAX_MESSAGES_PER_ADDRESS = 50

const LOCAL_PART = /^[a-z0-9][a-z0-9._-]{2,31}$/
const ID_PATTERN = /^[a-z0-9]{12,32}$/

export function clean(value) {
  return String(value ?? '').trim()
}

export function ttlSeconds(env) {
  const n = Number.parseInt(env?.MESSAGE_TTL_SECONDS, 10)
  if (!Number.isFinite(n)) return DEFAULT_TTL_SECONDS
  return Math.max(MIN_TTL_SECONDS, Math.min(n, 24 * 3600))
}

export function allowedDomains(env) {
  return clean(env?.TEMP_MAIL_DOMAINS)
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean)
}

export function allowedOrigins(env) {
  return clean(env?.ALLOWED_ORIGINS)
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
}

/** "Abc@Mail.Nexorasolution.us" -> { local, domain, address } or null. */
export function parseAddress(value, domains) {
  const text = clean(value).toLowerCase()
  const at = text.lastIndexOf('@')
  if (at < 1) return null
  const local = text.slice(0, at)
  const domain = text.slice(at + 1)
  if (!LOCAL_PART.test(local)) return null
  if (!domains.includes(domain)) return null
  return { local, domain, address: `${local}@${domain}` }
}

export function isValidMessageId(id) {
  return ID_PATTERN.test(clean(id))
}

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789' // no look-alikes (i l o 0 1)

/** Random local part from a crypto source (injectable for tests). */
export function randomLocalPart(length = 10, getRandomValues = (a) => crypto.getRandomValues(a)) {
  const bytes = getRandomValues(new Uint8Array(length))
  let out = ''
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length]
  return out
}

export function randomId(getRandomValues = (a) => crypto.getRandomValues(a)) {
  const bytes = getRandomValues(new Uint8Array(16))
  return [...bytes].map((b) => (b % 36).toString(36)).join('')
}

/**
 * Remove what must never reach a browser from untrusted mail HTML. This is a
 * second line of defence: the tool page renders the result in a sandboxed
 * iframe (no scripts) with a CSP that blocks network loads, which is the real
 * protection. Remote images are replaced so opening a mail does not tell the
 * sender anything (tracking pixels).
 */
export function sanitizeHtml(html) {
  let out = String(html ?? '')
  out = out.replace(/<!--[\s\S]*?-->/g, '')
  out = out.replace(/<(script|style|iframe|frame|frameset|object|embed|applet|link|meta|base|form|noscript|template|svg|math)\b[\s\S]*?<\/\1\s*>/gi, '')
  out = out.replace(/<\/?(script|style|iframe|frame|frameset|object|embed|applet|link|meta|base|form|input|button|select|textarea|noscript|template|svg|math)\b[^>]*>/gi, '')
  out = out.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  out = out.replace(/\s(srcdoc|formaction)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  out = out.replace(/\s(href|src|xlink:href|action|background)\s*=\s*("\s*(javascript|vbscript|data):[^"]*"|'\s*(javascript|vbscript|data):[^']*'|(javascript|vbscript|data):[^\s>]*)/gi, ' $1="#"')
  // Remote images: drop the source so nothing is fetched.
  out = out.replace(/<img\b[^>]*>/gi, (tag) => tag.replace(/\ssrc\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i, ' data-blocked-src="1"').replace(/\ssrcset\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i, ''))
  out = out.replace(/url\(\s*(['"]?)https?:[^)]*\)/gi, 'url()')
  return out
}

function truncate(value, max) {
  const text = String(value ?? '')
  return text.length > max ? `${text.slice(0, max)}…` : text
}

/** Build the stored record from postal-mime's parsed output. */
export function buildMessageRecord(parsed, { id, to, receivedAt, rawSize }) {
  const from = parsed?.from || {}
  return {
    id,
    to,
    fromName: truncate(clean(from.name), 120),
    fromAddress: truncate(clean(from.address), 200),
    subject: truncate(clean(parsed?.subject) || '(no subject)', 300),
    receivedAt,
    size: rawSize || 0,
    attachmentCount: Array.isArray(parsed?.attachments) ? parsed.attachments.length : 0,
    text: truncate(parsed?.text, MAX_TEXT_CHARS),
    html: parsed?.html ? truncate(parsed.html, MAX_HTML_CHARS) : '',
  }
}

export function summary(record) {
  const preview = clean(record.text).replace(/\s+/g, ' ').slice(0, 140)
  return {
    id: record.id,
    fromName: record.fromName,
    fromAddress: record.fromAddress,
    subject: record.subject,
    receivedAt: record.receivedAt,
    preview,
    attachmentCount: record.attachmentCount,
  }
}

export function publicMessage(record) {
  return {
    ...summary(record),
    to: record.to,
    text: record.text,
    html: record.html ? sanitizeHtml(record.html) : '',
  }
}

export function messageKey(address, id) {
  return `m:${address}:${id}`
}

export function inboxPrefix(address) {
  return `m:${address}:`
}

/** CORS headers for an allowed origin only; null origin gets none. */
export function corsHeaders(origin, origins) {
  if (!origin || !origins.includes(origin)) return {}
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'Origin',
  }
}
