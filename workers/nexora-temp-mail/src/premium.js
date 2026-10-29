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
export async function sendResendMail(env, { to, subject, text, html = '', replyTo = '' }, fetchFn = fetch) {
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
        ...(html ? { html } : {}),
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    })
    return response.ok
  } catch {
    return false
  }
}

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

/** The "forwarding code" email: { subject, text, html }. Inline styles and tables only, so mail apps render it the same. */
export function forwardCodeEmail({ code, address, minutes = 15 }) {
  const safeCode = escapeHtml(code)
  const safeAddress = escapeHtml(address)
  const spaced = safeCode.split('').join('&#8202;')
  const text = [
    `Your code is ${code}`,
    '',
    `Enter it on the Temp Mail page to start forwarding mail from ${address} to this inbox.`,
    `The code expires in ${minutes} minutes and works once.`,
    '',
    'If you did not ask for this, ignore this email. Nothing will be forwarded and nobody can read this inbox.',
    '',
    'Nexora Temp Mail · nexorasolution.us/tools/temp-mail/',
  ].join('\n')
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Your Nexora Temp Mail code</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your code is ${safeCode}. It expires in ${minutes} minutes.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
<tr><td style="background:#4f46e5;background-image:linear-gradient(135deg,#4f46e5,#7c3aed);padding:22px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<div style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#c7d2fe;font-weight:700;">Nexora Temp Mail</div>
<div style="font-size:22px;line-height:1.3;color:#ffffff;font-weight:800;margin-top:4px;">Confirm your forwarding</div>
</td></tr>
<tr><td style="padding:28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0f172a;">
<p style="margin:0 0 6px;font-size:15px;line-height:1.6;color:#334155;">Use this code to start forwarding mail from</p>
<p style="margin:0 0 20px;font-size:15px;line-height:1.5;font-weight:700;color:#0f172a;word-break:break-all;">${safeAddress}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="background:#eef2ff;border:2px dashed #a5b4fc;border-radius:14px;padding:18px 8px;">
<div style="font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:36px;line-height:1;font-weight:800;letter-spacing:.18em;color:#3730a3;">${spaced}</div>
</td></tr></table>
<p style="margin:18px 0 0;font-size:14px;line-height:1.6;color:#475569;">Enter it on the Temp Mail page. The code works once and expires in <b>${minutes} minutes</b>.</p>
<div style="margin-top:22px;padding:14px 16px;background:#f8fafc;border-radius:12px;font-size:13px;line-height:1.6;color:#64748b;">Did not ask for this? Ignore this email. Nothing will be forwarded and nobody can read your inbox.</div>
</td></tr>
<tr><td style="padding:16px 28px 22px;border-top:1px solid #e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;line-height:1.6;color:#94a3b8;text-align:center;">Nexora Temp Mail &middot; <a href="https://nexorasolution.us/tools/temp-mail/" style="color:#6366f1;text-decoration:none;">nexorasolution.us/tools/temp-mail</a></td></tr>
</table>
</td></tr></table>
</body></html>`
  return { subject: `${code} is your Nexora Temp Mail code`, text, html }
}
