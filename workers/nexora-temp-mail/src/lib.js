/**
 * Pure helpers for nexora-temp-mail (no Worker globals, so they are unit tested
 * in tests/temp-mail.test.mjs).
 */

export const DEFAULT_TTL_SECONDS = 3600
export const MIN_TTL_SECONDS = 60 // KV's minimum expirationTtl
export const MAX_RAW_EMAIL_BYTES = 3 * 1024 * 1024 // bigger mail is rejected at SMTP time
export const MAX_ATTACHMENT_BYTES = 1024 * 1024 // one attachment
export const MAX_ATTACHMENTS_PER_MESSAGE = 5
export const MAX_ATTACHMENT_TOTAL_BYTES = 2 * 1024 * 1024 // all attachments of one message
export const DEFAULT_MAX_LIFETIME_SECONDS = 6 * 3600 // hard cap incl. extensions
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

/** True when the address belongs to one of the temp-mail receiving domains. */
export function isTempMailDomain(value, domains) {
  const text = clean(value).toLowerCase()
  const at = text.lastIndexOf('@')
  return at > 0 && domains.includes(text.slice(at + 1))
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

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

/** Visible text of an HTML mail (for previews, codes and "copy text"). Not a sanitiser: output is plain text. */
export function htmlToText(html) {
  return String(html ?? '')
    .replace(/<(script|style|head|title)\b[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|h[1-6]|li|tr|table|ul|ol|blockquote)\s*>/gi, '\n')
    .replace(/<\/?(?:b|i|u|em|strong|span|a|font|small|sup|sub|code|mark|abbr)\b[^>]*>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
      if (e[0] === '#') {
        const code = e[1].toLowerCase() === 'x' ? Number.parseInt(e.slice(2), 16) : Number.parseInt(e.slice(1), 10)
        return Number.isFinite(code) && code > 31 && code < 0x10ffff ? String.fromCodePoint(code) : ' '
      }
      return ENTITIES[e.toLowerCase()] ?? m
    })
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function truncate(value, max) {
  const text = String(value ?? '')
  return text.length > max ? `${text.slice(0, max)}…` : text
}

/** Build the stored record from postal-mime's parsed output. */
export function buildMessageRecord(parsed, { id, to, receivedAt, rawSize, attachments = [] }) {
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
    // Attachment bytes live in their own KV keys; the record only lists them.
    attachments: Array.isArray(attachments) ? attachments : [],
    text: truncate(clean(parsed?.text) ? parsed.text : htmlToText(parsed?.html), MAX_TEXT_CHARS),
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
    code: extractCode(record.text) || extractCode(htmlToText(record.html)),
    attachmentCount: record.attachmentCount,
  }
}

export function publicMessage(record) {
  return {
    ...summary(record),
    to: record.to,
    attachments: Array.isArray(record.attachments) ? record.attachments : [],
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
    'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization',
    'access-control-max-age': '86400',
    vary: 'Origin',
  }
}

// ---------------------------------------------------------------- addresses

/** Names nobody may claim as a custom address (role mailboxes, impersonation). */
export const RESERVED_LOCALS = new Set([
  'admin', 'administrator', 'root', 'postmaster', 'abuse', 'hostmaster', 'webmaster', 'security',
  'info', 'support', 'help', 'sales', 'contact', 'billing', 'noreply', 'no-reply', 'mailer-daemon',
  'nexora', 'nexorasolution', 'team', 'office', 'hello', 'ceo', 'owner', 'test', 'null', 'undefined',
])

/** Check a user-chosen local part. Returns { ok: true, local } or { ok: false, reason }. */
export function validateCustomLocal(value) {
  const local = clean(value).toLowerCase()
  if (local.length < 3) return { ok: false, reason: 'too_short' }
  if (local.length > 32) return { ok: false, reason: 'too_long' }
  if (!LOCAL_PART.test(local)) return { ok: false, reason: 'invalid_characters' }
  if (/[._-]{2,}/.test(local) || /[._-]$/.test(local)) return { ok: false, reason: 'invalid_characters' }
  if (RESERVED_LOCALS.has(local)) return { ok: false, reason: 'reserved' }
  return { ok: true, local }
}

export function maxLifetimeSeconds(env) {
  const n = Number.parseInt(env?.MAX_LIFETIME_SECONDS, 10)
  if (!Number.isFinite(n)) return DEFAULT_MAX_LIFETIME_SECONDS
  return Math.max(ttlSeconds(env), Math.min(n, 24 * 3600))
}

/** How many times one address may be extended (default: once). */
export function maxExtensions(env) {
  const n = Number.parseInt(env?.MAX_EXTENSIONS, 10)
  return Number.isFinite(n) ? Math.max(0, Math.min(n, 10)) : 1
}

export function addressKey(address) {
  return `a:${address}`
}
export function attachmentKey(address, id, index) {
  return `f:${address}:${id}:${index}`
}
export function attachmentPrefix(address) {
  return `f:${address}:`
}

/** A fresh address session: visible until expiresAt, hard-capped at hardExpiresAt. */
export function newSession(env, now = Date.now()) {
  return {
    createdAt: now,
    expiresAt: now + ttlSeconds(env) * 1000,
    hardExpiresAt: now + maxLifetimeSeconds(env) * 1000,
    extensions: 0,
  }
}

/** Add one TTL period, never past the hard cap. Returns a new session. */
export function extendSession(session, env, now = Date.now()) {
  const next = Math.min(Math.max(session.expiresAt, now) + ttlSeconds(env) * 1000, session.hardExpiresAt)
  return { ...session, expiresAt: next, extensions: (session.extensions || 0) + 1 }
}

export function isLive(session, now = Date.now()) {
  return Boolean(session) && Number(session.expiresAt) > now
}

/** KV expirationTtl (seconds, at least 60) that reaches the session's hard cap. */
export function kvTtlUntilHardCap(session, now = Date.now()) {
  return Math.max(MIN_TTL_SECONDS, Math.ceil((Number(session.hardExpiresAt) - now) / 1000))
}

// ------------------------------------------------------------- attachments

const BLOCKED_EXTENSIONS = /\.(exe|msi|bat|cmd|com|scr|pif|js|jse|vbs|vbe|wsf|wsh|ps1|psm1|jar|hta|cpl|lnk|reg|dll|apk|app|dmg|iso|img|sh|chm|docm|xlsm|pptm|html?|svg|xhtml)$/i

/** A filename that is safe to show and to put in Content-Disposition. */
export function safeFilename(name, index = 0) {
  const noControl = [...String(name ?? '')].map((ch) => (ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127 ? '_' : ch)).join('')
  const base = noControl.replace(/["\\/:*?<>|]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 120)
  return base && base !== '.' && base !== '..' ? base : `attachment-${index + 1}`
}

/**
 * Decide what to do with one parsed attachment. Returns the public record
 * ({ index, filename, mimeType, size, available, reason? }); `available` means
 * the bytes are kept and can be downloaded.
 */
export function describeAttachment(att, index, usedBytes = 0) {
  const filename = safeFilename(att?.filename, index)
  const size = att?.content?.byteLength ?? att?.content?.length ?? 0
  const base = { index, filename, mimeType: clean(att?.mimeType).slice(0, 100) || 'application/octet-stream', size }
  if (index >= MAX_ATTACHMENTS_PER_MESSAGE) return { ...base, available: false, reason: 'too_many' }
  if (BLOCKED_EXTENSIONS.test(filename)) return { ...base, available: false, reason: 'blocked_type' }
  if (size > MAX_ATTACHMENT_BYTES) return { ...base, available: false, reason: 'too_large' }
  if (usedBytes + size > MAX_ATTACHMENT_TOTAL_BYTES) return { ...base, available: false, reason: 'too_large' }
  return { ...base, available: true }
}

// ------------------------------------------------------------ OTP / codes

/** First plausible verification code (4-8 digits) in a mail body, or ''. Also reads big styled codes such as "5 0 9 6 4 9" on their own line. */
export function extractCode(text) {
  let t = String(text ?? '').slice(0, 6000)
  // "5 0 9 6 4 9" (letter-spaced digits) -> "509649"
  t = t.replace(/(?<![\d])(\d)(?: \d){3,7}(?![\d])/g, (m) => m.replace(/ /g, ''))
  const afterWord = /(?:code|otp|pin|passcode|password|token|verification|verify|confirm\w*)\b[^0-9]{0,60}?(?<!\d|\d\.)(\d{4,8})(?!\d|\.\d)/i.exec(t)
  if (afterWord) return afterWord[1]
  const before = /(?<!\d|\d\.)(\d{4,8})(?!\d|\.\d)[^\n.]{0,25}?\b(?:is|as) (?:your|the)\b[^\n.]{0,30}?(?:code|otp|pin)/i.exec(t)
  if (before) return before[1]
  const spaced = /(?<!\d|\d\.)(\d{3})[ -](\d{3})(?!\d|\.\d)/.exec(t)
  if (spaced) return spaced[1] + spaced[2]
  // Letter+digit codes ("K7X2M", "rv3k8w9f", "ABC-123") right after the word code/otp/token. Needs a digit and a letter; URL tokens are too long to match.
  const alnum = /\b(?:code|otp|passcode|token)\b[^\d\n]{0,30}?\b((?=[A-Za-z0-9]*\d)(?=[A-Za-z0-9]*[A-Za-z])[A-Za-z0-9]{5,10})\b/i.exec(t)
  if (alnum) return alnum[1]
  const grouped = /\b(?:code|otp|passcode|token)\b[\s\S]{0,120}?\b((?=[A-Za-z0-9-]*\d)(?=[A-Za-z0-9-]*[A-Za-z])[A-Za-z0-9]{3,4})-([A-Za-z0-9]{3,4})\b/i.exec(t)
  if (grouped) return grouped[1] + grouped[2]
  // A number alone on its line (typical big code box); skip years.
  for (const m of t.matchAll(/^[ \t]*(\d{4,8})[ \t]*$/gm)) {
    if (!/^(19|20)\d\d$/.test(m[1])) return m[1]
  }
  // Last resort: the mail talks about a code/verification and holds exactly one standalone 6-digit number (any layout).
  if (/verif|otp|passcode|\bcode\b|security code/i.test(t)) {
    const six = [...t.matchAll(/(?<![\w.,:/-])(\d{6})(?![\w.,:/-])/g)].map((m) => m[1])
    if (six.length) return six[0]
  }
  return ''
}

// ------------------------------------------------------- KV list metadata

/** Compact summary stored as KV metadata (hard limit 1024 bytes) so the inbox list is one KV call. */
export function listMetadata(record) {
  const s = summary(record)
  const meta = {
    id: s.id,
    fromName: truncate(s.fromName, 60),
    fromAddress: truncate(s.fromAddress, 80),
    subject: truncate(s.subject, 100),
    receivedAt: s.receivedAt,
    preview: truncate(s.preview, 90),
    code: s.code,
    attachmentCount: s.attachmentCount,
  }
  while (JSON.stringify(meta).length > 900 && meta.preview.length > 0) meta.preview = meta.preview.slice(0, Math.max(0, meta.preview.length - 20))
  return meta
}

// -------------------------------------------------------- sender blocklist

/** Domains an abuse report can never block automatically (large real mail providers and ourselves). */
export const PROTECTED_SENDER_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'yahoo.com', 'icloud.com',
  'proton.me', 'protonmail.com', 'nexorasolution.us', 'nexorasolution.online',
])

export function senderDomain(address) {
  const text = clean(address).toLowerCase()
  const at = text.lastIndexOf('@')
  return at > 0 ? text.slice(at + 1).replace(/[^a-z0-9.-]/g, '') : ''
}

export function blockedSenderDomains(env) {
  return clean(env?.BLOCKED_SENDER_DOMAINS).split(',').map((d) => d.trim().toLowerCase()).filter(Boolean)
}

/** True when the domain, or a parent of it, is on the list. */
export function domainListed(domain, list) {
  const d = clean(domain).toLowerCase()
  return Boolean(d) && list.some((entry) => d === entry || d.endsWith(`.${entry}`))
}

// --------------------------------------------------------------- Turnstile

/** Verify a Cloudflare Turnstile token. `fetchFn` is injectable for tests. */
export async function verifyTurnstile(token, secret, ip, fetchFn = fetch) {
  if (!clean(token) || String(token).length > 2048) return false
  try {
    const body = new URLSearchParams({ secret, response: String(token) })
    if (ip) body.set('remoteip', ip)
    const res = await fetchFn('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body })
    const data = await res.json()
    return data?.success === true
  } catch {
    return false
  }
}

// ------------------------------------------------------------- Web Push (VAPID)
// Push messages carry no payload (so no encryption is needed): the browser's
// service worker wakes up and reads the newest mail itself. Only the VAPID
// signature (RFC 8292) authenticates us to the push service.

export function b64urlEncode(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const PUSH_HOSTS = ['fcm.googleapis.com', 'push.services.mozilla.com', 'push.apple.com', 'notify.windows.com']

/** Only the big browser vendors' push services, over https: stops the Worker being pointed at arbitrary URLs. */
export function isAllowedPushEndpoint(value) {
  try {
    const url = new URL(String(value))
    return url.protocol === 'https:' && !url.username && !url.password && String(value).length <= 1200 && domainListed(url.hostname, PUSH_HOSTS)
  } catch {
    return false
  }
}

export function vapidPrivateJwk(env) {
  try {
    const jwk = JSON.parse(clean(env?.VAPID_PRIVATE_KEY))
    return jwk && jwk.kty === 'EC' && jwk.crv === 'P-256' && jwk.d ? jwk : null
  } catch {
    return null
  }
}

/** Push is on only when both halves of the key pair are configured. */
export function pushEnabled(env) {
  return Boolean(clean(env?.VAPID_PUBLIC_KEY)) && Boolean(vapidPrivateJwk(env))
}

/** Authorization header value for one push service origin. */
export async function vapidAuthorization(endpoint, env, now = Date.now(), subtle = crypto.subtle) {
  const jwk = vapidPrivateJwk(env)
  if (!jwk) throw new Error('vapid_not_configured')
  const enc = new TextEncoder()
  const part = (obj) => b64urlEncode(enc.encode(JSON.stringify(obj)))
  const unsigned = `${part({ typ: 'JWT', alg: 'ES256' })}.${part({
    aud: new URL(endpoint).origin,
    exp: Math.floor(now / 1000) + 12 * 3600,
    sub: clean(env.VAPID_SUBJECT) || 'mailto:info@nexorasolution.us',
  })}`
  const key = await subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const signature = await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(unsigned)) // raw r||s, as JWS wants
  return `vapid t=${unsigned}.${b64urlEncode(signature)}, k=${clean(env.VAPID_PUBLIC_KEY)}`
}

/** Send one empty push. Returns { ok, gone } where gone means the subscription is dead and should be dropped. */
export async function sendPush(endpoint, env, fetchFn = fetch) {
  try {
    const res = await fetchFn(endpoint, {
      method: 'POST',
      headers: { Authorization: await vapidAuthorization(endpoint, env), TTL: '120', Urgency: 'high' },
    })
    return { ok: res.status >= 200 && res.status < 300, gone: res.status === 404 || res.status === 410 }
  } catch {
    return { ok: false, gone: false }
  }
}

export function pushKey(address) {
  return `push:${address}`
}
