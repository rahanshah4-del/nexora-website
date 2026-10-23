/**
 * Admin side of the temp-mail Worker: who may call it, the runtime settings the
 * Control Centre edits, and the daily counters it charts.
 *
 * Auth is a Firebase ID token whose UID is on the platform admin list, exactly
 * like the other Nexora workers (scripts/check-admin-uids.mjs keeps the lists equal).
 * Settings live in KV (`cfg:settings`) so changing them needs no deploy.
 */
import { clean } from './lib.js'

// Platform admins, by Firebase Auth UID — never by email.
export const ADMIN_UIDS = Object.freeze(['oR66tNaNw5Z5kXYdTa2Egco9Uv22'])
const DEFAULT_PROJECT_ID = 'nexora-business-suite'
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'

function b64urlToString(input) {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/')
  return atob(padded + (padded.length % 4 ? '='.repeat(4 - (padded.length % 4)) : ''))
}
function b64urlToBytes(input) {
  const binary = b64urlToString(input)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** Verify a Firebase ID token (RS256). Returns the payload or throws. */
export async function verifyFirebaseIdToken(idToken, projectId = DEFAULT_PROJECT_ID, fetchFn = fetch) {
  const parts = String(idToken || '').split('.')
  if (parts.length !== 3) throw new Error('Malformed token')
  const [h, p, s] = parts
  const header = JSON.parse(b64urlToString(h))
  const payload = JSON.parse(b64urlToString(p))
  if (payload.aud !== projectId) throw new Error('Invalid audience')
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error('Invalid issuer')
  if (!payload.exp || payload.exp * 1000 < Date.now()) throw new Error('Token expired')
  if (!payload.sub) throw new Error('Invalid subject')
  const jwks = await (await fetchFn(JWKS_URL)).json()
  const jwk = (jwks.keys || []).find((k) => k.kid === header.kid)
  if (!jwk) throw new Error('Signing key not found')
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(s), new TextEncoder().encode(`${h}.${p}`))
  if (!ok) throw new Error('Invalid signature')
  return payload
}

/** { ok: true, uid } or { ok: false, status, error }. */
export async function authorizeAdmin(request, env, fetchFn = fetch) {
  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) return { ok: false, status: 401, error: 'unauthenticated' }
  try {
    const claims = await verifyFirebaseIdToken(token, clean(env.FIREBASE_PROJECT_ID) || DEFAULT_PROJECT_ID, fetchFn)
    if (!ADMIN_UIDS.includes(claims.sub)) return { ok: false, status: 403, error: 'forbidden' }
    return { ok: true, uid: claims.sub }
  } catch {
    return { ok: false, status: 401, error: 'unauthenticated' }
  }
}

// ----------------------------------------------------------------- settings

export const DEFAULT_SETTINGS = Object.freeze({
  creationEnabled: true, // new addresses (kill switch)
  receivingEnabled: true, // accept incoming mail
  customAddressEnabled: true,
  extensionsEnabled: true,
  attachmentsEnabled: true,
  maxExtensions: null, // null = use the deploy-time MAX_EXTENSIONS
  createPerMinute: 5,
  createPerHour: 20,
  notice: '', // short banner shown on the page (maintenance etc.)
  blockedDomains: [], // sender domains blocked by hand
})

const DOMAIN_RE = /^(?=.{3,100}$)([a-z0-9-]+\.)+[a-z]{2,}$/

const clampInt = (value, min, max, fallback) => {
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) ? Math.max(min, Math.min(n, max)) : fallback
}

/** Merge a partial update into the current settings, accepting only known, well-formed values. */
export function mergeSettings(current, patch = {}) {
  const base = { ...DEFAULT_SETTINGS, ...current }
  const next = { ...base }
  for (const key of ['creationEnabled', 'receivingEnabled', 'customAddressEnabled', 'extensionsEnabled', 'attachmentsEnabled']) {
    if (typeof patch[key] === 'boolean') next[key] = patch[key]
  }
  if ('maxExtensions' in patch) next.maxExtensions = patch.maxExtensions === null ? null : clampInt(patch.maxExtensions, 0, 3, base.maxExtensions)
  if ('createPerMinute' in patch) next.createPerMinute = clampInt(patch.createPerMinute, 1, 60, base.createPerMinute)
  if ('createPerHour' in patch) next.createPerHour = clampInt(patch.createPerHour, 1, 500, base.createPerHour)
  if (typeof patch.notice === 'string') next.notice = clean(patch.notice).replace(/[<>]/g, '').slice(0, 200)
  if (Array.isArray(patch.blockedDomains)) {
    next.blockedDomains = [...new Set(patch.blockedDomains.map((d) => clean(d).toLowerCase().replace(/^@/, '')).filter((d) => DOMAIN_RE.test(d)))].slice(0, 200)
  }
  return next
}

const cache = new WeakMap() // env -> { at, value }
const CACHE_MS = 10_000

export async function getSettings(env) {
  const hit = cache.get(env)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value
  let stored = null
  try { stored = await env.TEMP_MAIL.get('cfg:settings', 'json') } catch { /* defaults */ }
  const value = mergeSettings(stored || {}, {})
  cache.set(env, { at: Date.now(), value })
  return value
}

export async function saveSettings(env, patch) {
  const value = mergeSettings(await getSettings(env), patch)
  await env.TEMP_MAIL.put('cfg:settings', JSON.stringify(value))
  cache.set(env, { at: Date.now(), value })
  return value
}

/** The env the rest of the Worker sees: runtime settings override the deploy-time MAX_EXTENSIONS. */
export function applySettings(env, settings) {
  if (!settings.extensionsEnabled) return { ...env, MAX_EXTENSIONS: '0' }
  return settings.maxExtensions === null ? env : { ...env, MAX_EXTENSIONS: String(settings.maxExtensions) }
}

// -------------------------------------------------------------------- stats

export const STAT_NAMES = [
  'visits', // page loads (each one asks /api/config)
  'created', 'created_custom', 'mail_received', 'mail_rejected', 'mail_blocked_sender',
  'codes_found', 'attachments_stored', 'extended', 'reports', 'push_enabled', 'push_sent',
  'captcha_failed', 'rate_limited',
]

const dayKey = (date) => `stat:${date}`
export const isoDay = (ms = Date.now()) => new Date(ms).toISOString().slice(0, 10)

/** Add to today's counters. Approximate by design (KV has no atomic increment) and never throws. */
export async function bumpStats(env, increments) {
  try {
    const key = dayKey(isoDay())
    const row = (await env.TEMP_MAIL.get(key, 'json')) || {}
    for (const [name, n] of Object.entries(increments)) if (STAT_NAMES.includes(name)) row[name] = (row[name] || 0) + n
    await env.TEMP_MAIL.put(key, JSON.stringify(row), { expirationTtl: 100 * 24 * 3600 })
  } catch { /* stats must never break mail or the API */ }
}

export async function readStats(env, days = 30) {
  const out = []
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = isoDay(Date.now() - i * 86400000)
    const row = (await env.TEMP_MAIL.get(dayKey(date), 'json')) || {}
    out.push({ date, ...Object.fromEntries(STAT_NAMES.map((n) => [n, row[n] || 0])) })
  }
  return out
}

async function countPrefix(env, prefix, cap = 3000) {
  let count = 0
  let cursor
  do {
    const page = await env.TEMP_MAIL.list({ prefix, limit: 1000, ...(cursor ? { cursor } : {}) })
    count += page.keys.length
    cursor = page.list_complete === false ? page.cursor : undefined
  } while (cursor && count < cap)
  return count
}

// ---------------------------------------------------------------- endpoints

export async function adminOverview(env, { domains, pushOn }) {
  const [settings, days, activeAddresses, pushSubscriptions, reportList, blockList] = await Promise.all([
    getSettings(env),
    readStats(env, 30),
    countPrefix(env, 'a:'),
    countPrefix(env, 'push:'),
    env.TEMP_MAIL.list({ prefix: 'report:', limit: 50 }),
    env.TEMP_MAIL.list({ prefix: 'bl:', limit: 100 }),
  ])
  const reports = (await Promise.all(reportList.keys.map((k) => env.TEMP_MAIL.get(k.name, 'json')))).filter(Boolean)
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
  const totals = Object.fromEntries(STAT_NAMES.map((n) => [n, days.reduce((sum, d) => sum + d[n], 0)]))
  return {
    settings,
    days,
    totals,
    activeAddresses,
    pushSubscriptions,
    reports,
    autoBlocked: blockList.keys.map((k) => ({ domain: k.name.slice(3), until: k.expiration ? new Date(k.expiration * 1000).toISOString() : '' })),
    system: {
      domains,
      captchaEnforced: Boolean(clean(env.TURNSTILE_SECRET)) && Boolean(clean(env.TURNSTILE_SITE_KEY)),
      captchaSiteKeySet: Boolean(clean(env.TURNSTILE_SITE_KEY)),
      captchaSecretSet: Boolean(clean(env.TURNSTILE_SECRET)),
      pushReady: pushOn,
      forwardToSet: Boolean(clean(env.FORWARD_TO)),
      staticBlockedDomains: clean(env.BLOCKED_SENDER_DOMAINS).split(',').map((d) => d.trim()).filter(Boolean),
      ttlSeconds: Number.parseInt(env.MESSAGE_TTL_SECONDS, 10) || 3600,
    },
  }
}
