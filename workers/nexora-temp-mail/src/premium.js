/**
 * Temp Mail Premium: who has it, what it unlocks, and the forwarding helpers.
 *
 * An entitlement lives in KV as `pm:<firebase uid>` and is written by the payments Worker when Polar reports
 * a subscription (or by the Control Centre for a manual grant):
 *   { status: 'active' | 'canceled' | 'past_due' | 'expired' | 'revoked', cycle, expiresAt (ms), subscriptionId, email, source, updatedAt }
 * A premium address lives as long as the plan is paid (plus a short grace period) and is renewed lazily
 * when its owner opens the page (see syncOwnedAddresses in index.js).
 */
import { verifyFirebaseIdToken } from './admin.js'
import { clean, isTempMailDomain } from './lib.js'

export const DAY = 86400

export const PREMIUM_LIMITS = Object.freeze({
  maxAddresses: 10,
  maxMessages: 200,
  maxRawEmailBytes: 14 * 1024 * 1024,
  maxAttachmentBytes: 5 * 1024 * 1024,
  maxAttachmentTotalBytes: 10 * 1024 * 1024,
  maxAttachmentsPerMessage: 10,
  forwardPerDay: 100,
  forwardCodesPerHour: 5,
  graceSeconds: 3 * DAY,
  maxLifetimeSeconds: 400 * DAY,
})

export const entitlementKey = (uid) => `pm:${uid}`
export const ownerKey = (uid) => `u:${uid}`
export const forwardKey = (address) => `fw:${address}`
export const pendingForwardKey = (address) => `fwp:${address}`

const DEAD_STATUSES = new Set(['expired', 'revoked'])

/** True while the plan is paid: not ended or revoked, and its period end is still in the future. */
export function isPremiumActive(entitlement, now = Date.now()) {
  if (!entitlement || typeof entitlement !== 'object') return false
  if (DEAD_STATUSES.has(String(entitlement.status || ''))) return false
  return Number(entitlement.expiresAt) > now
}

/** When a premium address of this entitlement stops: the end of the paid period plus grace, never absurdly far out. */
export function premiumSessionUntil(entitlement, now = Date.now()) {
  const paidUntil = Number(entitlement?.expiresAt) || now
  return Math.min(paidUntil + PREMIUM_LIMITS.graceSeconds * 1000, now + PREMIUM_LIMITS.maxLifetimeSeconds * 1000)
}

export function newPremiumSession(entitlement, uid, now = Date.now()) {
  const until = premiumSessionUntil(entitlement, now)
  return { createdAt: now, expiresAt: until, hardExpiresAt: until, extensions: 0, premium: true, owner: uid }
}

/** Entitlement object for a manual grant (Control Centre). */
export function grantEntitlement({ days, email = '', now = Date.now() }) {
  const n = Math.max(1, Math.min(Number.parseInt(days, 10) || 30, 3650))
  return { status: 'active', cycle: 'manual', expiresAt: now + n * DAY * 1000, subscriptionId: '', email: clean(email).slice(0, 200), source: 'admin', updatedAt: new Date(now).toISOString() }
}

// ----------------------------------------------------------------- identity

let jwksCache = { at: 0, body: null }
const JWKS_CACHE_MS = 5 * 60 * 1000

/** Google's signing keys change rarely; cache them so every API call does not fetch them again. */
async function cachedJwksFetch(url) {
  if (jwksCache.body && Date.now() - jwksCache.at < JWKS_CACHE_MS) return new Response(JSON.stringify(jwksCache.body))
  const response = await fetch(url)
  const body = await response.json()
  jwksCache = { at: Date.now(), body }
  return new Response(JSON.stringify(body))
}

/** { uid, email } for a valid Firebase ID token in the Authorization header, otherwise null. */
export async function userFromRequest(request, env, fetchFn = cachedJwksFetch) {
  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) return null
  try {
    const claims = await verifyFirebaseIdToken(token, clean(env.FIREBASE_PROJECT_ID) || 'nexora-business-suite', fetchFn)
    return { uid: String(claims.sub), email: clean(claims.email).toLowerCase() }
  } catch {
    return null
  }
}

export async function getEntitlement(env, uid) {
  if (!uid) return null
  return env.TEMP_MAIL.get(entitlementKey(uid), 'json')
}

// ---------------------------------------------------------------- forwarding

const EMAIL_RE = /^[^\s@<>"]{1,64}@[a-z0-9.-]{1,190}\.[a-z]{2,}$/i

/** A forwarding destination must look like a normal mailbox and must not be one of our own temp domains. */
export function validForwardTarget(value, domains = []) {
  const to = clean(value).toLowerCase()
  if (!EMAIL_RE.test(to) || to.length > 200) return { ok: false, reason: 'invalid_email' }
  if (isTempMailDomain(to, domains)) return { ok: false, reason: 'own_domain' }
  return { ok: true, to }
}

export function randomCode() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000
  return String(n).padStart(6, '0')
}

export async function hashCode(code, salt) {
  const bytes = new TextEncoder().encode(`${salt}:${code}`)
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
  return [...digest].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Plain-text copy of a message for the owner's real mailbox: no HTML and no attachments, so nothing active is relayed. */
export function forwardBody(record, address) {
  const from = record.fromName ? `${record.fromName} <${record.fromAddress}>` : record.fromAddress
  const attachmentNote = record.attachmentCount > 0
    ? `\nThis message has ${record.attachmentCount} attachment(s). They are not forwarded; open ${address} in Nexora Temp Mail to download them.\n`
    : ''
  return {
    subject: `[Temp Mail] ${clean(record.subject) || '(no subject)'}`.slice(0, 200),
    text: `Forwarded from ${address}\nFrom: ${from}\nReceived: ${record.receivedAt}\n${attachmentNote}\n${clean(record.text) || '(This message has no plain-text body. Open it in Nexora Temp Mail to read it.)'}\n\n--\nNexora Temp Mail Premium forwarding. Manage it at https://nexorasolution.us/tools/temp-mail/`,
  }
}

/** Send one plain-text mail through Resend. Resolves true on success; never throws. */
export async function sendResendMail(env, { to, subject, text, replyTo = '' }, fetchFn = fetch) {
  const key = clean(env.RESEND_API_KEY)
  if (!key) return false
  try {
    const response = await fetchFn('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        from: clean(env.FORWARD_FROM) || 'Nexora Temp Mail <support@nexorasolution.us>',
        to: [to],
        subject,
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    })
    return response.ok
  } catch {
    return false
  }
}
