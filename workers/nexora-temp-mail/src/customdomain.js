/**
 * Premium custom domains: a customer points their own domain at Nexora (one MX record) and every mail sent to
 * anything@their-domain is forwarded to a mailbox they have verified.
 *
 * Mail for these domains is received by Resend Inbound (Cloudflare Email Routing only serves domains in our own
 * Cloudflare account) and arrives at the Worker as a signed webhook. Pure helpers live here; routes are in index.js.
 */
import { clean } from './lib.js'

export const MAX_CUSTOM_DOMAINS = 3
export const customDomainKey = (domain) => `cd:${domain}`
export const customOwnerKey = (uid) => `cdo:${uid}`
export const customPendingKey = (domain) => `cdp:${domain}`

const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/
// Free mail providers and our own domains can never be pointed at Nexora.
const REFUSED = new Set(['gmail.com', 'googlemail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'live.com', 'icloud.com', 'proton.me', 'protonmail.com', 'resend.com', 'resend.dev', 'cloudflare.com'])

/** Lower-cased bare domain from what a person typed (a URL or an email address is accepted), or a reason it is not usable. */
export function normalizeDomain(input, ownDomains = []) {
  let text = clean(input).toLowerCase()
  text = text.replace(/^[a-z]+:\/\//, '').replace(/^.*@/, '').split(/[/?#:]/)[0].replace(/\.+$/, '')
  if (!text || text.length > 190) return { ok: false, reason: 'invalid_domain' }
  const labels = text.split('.')
  if (labels.length < 2 || labels.some((label) => !LABEL.test(label)) || !/^[a-z]{2,}$/.test(labels[labels.length - 1])) return { ok: false, reason: 'invalid_domain' }
  const base = labels.slice(-2).join('.')
  const own = ['nexorasolution.us', 'nexorasolution.online', ...ownDomains.map((d) => String(d).split('.').slice(-2).join('.'))]
  if (REFUSED.has(base) || own.includes(base)) return { ok: false, reason: 'domain_not_allowed' }
  return { ok: true, domain: text }
}

/** DNS rows to show the customer: only what is needed to receive mail. */
export function shapeRecords(records = []) {
  return records
    .filter((r) => String(r.type).toUpperCase() === 'MX' || String(r.record || '').toLowerCase().includes('receiv'))
    .map((r) => ({ type: String(r.type || '').toUpperCase(), name: String(r.name || ''), value: String(r.value || ''), priority: r.priority ?? '', status: String(r.status || 'not_started') }))
}

const RESEND = 'https://api.resend.com'

async function resend(env, path, { method = 'GET', body } = {}, fetchFn = fetch) {
  const key = clean(env.RESEND_API_KEY)
  if (!key) return { ok: false, status: 503, data: null }
  try {
    const response = await fetchFn(`${RESEND}${path}`, {
      method,
      headers: { authorization: `Bearer ${key}`, ...(body ? { 'content-type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    const data = await response.json().catch(() => null)
    return { ok: response.ok, status: response.status, data }
  } catch {
    return { ok: false, status: 502, data: null }
  }
}

export const resendCreateDomain = (env, name, fetchFn) => resend(env, '/domains', { method: 'POST', body: { name, capabilities: { sending: 'disabled', receiving: 'enabled' } } }, fetchFn)
export const resendGetDomain = (env, id, fetchFn) => resend(env, `/domains/${encodeURIComponent(id)}`, {}, fetchFn)
export const resendVerifyDomain = (env, id, fetchFn) => resend(env, `/domains/${encodeURIComponent(id)}/verify`, { method: 'POST' }, fetchFn)
export const resendDeleteDomain = (env, id, fetchFn) => resend(env, `/domains/${encodeURIComponent(id)}`, { method: 'DELETE' }, fetchFn)
export const resendGetReceived = (env, id, fetchFn) => resend(env, `/emails/receiving/${encodeURIComponent(id)}`, {}, fetchFn)

/** Verified once Resend says the domain (or its receiving MX record) is verified. */
export function domainIsVerified(domain) {
  if (!domain) return false
  if (String(domain.status) === 'verified') return true
  const mx = shapeRecords(domain.records || [])
  return mx.length > 0 && mx.every((r) => r.status === 'verified')
}

/** Check a Resend (Svix) webhook signature. `secret` looks like whsec_<base64>. */
export async function verifyWebhook(secret, headers, rawBody, now = Date.now()) {
  const id = headers.get('svix-id')
  const timestamp = headers.get('svix-timestamp')
  const signatures = headers.get('svix-signature')
  const key = clean(secret)
  if (!id || !timestamp || !signatures || !key) return false
  if (Math.abs(now / 1000 - Number(timestamp)) > 300) return false
  const raw = Uint8Array.from(atob(key.replace(/^whsec_/, '')), (c) => c.charCodeAt(0))
  const hmac = await crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signed = new Uint8Array(await crypto.subtle.sign('HMAC', hmac, new TextEncoder().encode(`${id}.${timestamp}.${rawBody}`)))
  let expected = ''
  for (const b of signed) expected += String.fromCharCode(b)
  expected = btoa(expected)
  return signatures.split(' ').some((part) => {
    const [version, sig] = part.split(',')
    return version === 'v1' && sig === expected
  })
}

const stripTags = (html) => String(html || '').replace(/<(style|script)[\s\S]*?<\/\1>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|tr|li|h\d)>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\n{3,}/g, '\n\n').trim()

/** Plain-text copy for the customer's own mailbox (no HTML, no attachments, like Premium address forwarding). */
export function customForwardBody(email, recipient) {
  const attachments = Array.isArray(email.attachments) ? email.attachments.length : 0
  const note = attachments ? `\nThis message has ${attachments} attachment(s). They are not forwarded.\n` : ''
  const body = clean(email.text) || stripTags(email.html) || '(This message has no readable text.)'
  return {
    subject: `[${recipient.split('@')[1] || 'Mail'}] ${clean(email.subject) || '(no subject)'}`.slice(0, 200),
    text: `Forwarded from ${recipient}\nFrom: ${clean(email.from)}\n${note}\n${body.slice(0, 200_000)}\n\n--\nNexora Temp Mail Premium forwarding. Manage it at https://nexorasolution.us/tools/temp-mail/`,
  }
}

/** The email address inside "Name <a@b.c>" (or the text itself). */
export function bareAddress(value) {
  const text = clean(value)
  const match = text.match(/<([^>]+)>/)
  return (match ? match[1] : text).toLowerCase()
}
