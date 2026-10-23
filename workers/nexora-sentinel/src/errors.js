/**
 * Browser error reports from the public site, grouped by fingerprint.
 *
 * The endpoint is public, so everything here assumes a hostile caller:
 *  - personal data (emails, long numbers, tokens) is redacted before storing;
 *  - known browser noise (extensions, ResizeObserver) is dropped;
 *  - KV writes are throttled per isolate (KV free plan: 1,000 writes a day,
 *    shared with every other Worker), so a storm of reports cannot exhaust them;
 *  - the owner is emailed only when one error is reported at least ALERT_AT times
 *    by at least ALERT_REPORTERS different visitors, at most MAIL_PER_DAY times a day.
 */
const MAX_MESSAGE = 200
export const ALERT_AT = 10
export const ALERT_REPORTERS = 3
export const MAIL_PER_DAY = 3
const TTL = 3 * 24 * 3600
const FLUSH_MS = 60 * 1000 // per fingerprint, per isolate
const NEW_KEYS_PER_HOUR = 30 // per isolate

const NOISE = [
  /^script error\.?$/i,
  /resizeobserver loop/i,
  /chrome-extension:|moz-extension:|safari-extension:/i,
  /^network ?error$/i,
  /^load failed$/i,
  /^failed to fetch$/i,
]

export function redact(value) {
  return String(value ?? '')
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]')
    .replace(/\b[A-Za-z0-9_-]{24,}\b/g, '[id]')
    .replace(/\b(?=[0-9a-f]*\d)[0-9a-f]{12,}\b/gi, '[id]')
    .replace(/\d{6,}/g, '[number]')
}

export function normalizeReport(body) {
  const message = redact(String(body?.message ?? '').replace(/\s+/g, ' ').trim()).slice(0, MAX_MESSAGE)
  if (!message || NOISE.some((re) => re.test(message))) return null
  let page = redact(String(body?.page ?? '/').split(/[?#]/)[0]).slice(0, 120)
  if (!page.startsWith('/')) page = '/'
  const kind = ['error', 'rejection', 'boundary'].includes(body?.kind) ? body.kind : 'error'
  return { message, page, kind }
}

async function sha(text, bytes = 8) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].slice(0, bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Ids and numbers vary between users; the same bug should group together.
// Hex ids first, then digits (the other order breaks the hex match).
export async function fingerprint(report) {
  const message = report.message.replace(/\b[0-9a-f]{8,}\b/gi, '*').replace(/\d+/g, '#')
  return sha(`${report.kind}|${report.page.replace(/\d+/g, '#')}|${message}`)
}

// Per-isolate buffers. Counts are approximate by design (isolates come and go).
const pending = new Map() // fp -> { count, reporters:Set, lastFlush }
let keyBudget = { hour: 0, used: 0 }
export function resetErrorBuffers() { pending.clear(); keyBudget = { hour: 0, used: 0 } }

/**
 * Records one report. Returns { rec, notify, stored }. `stored` is false when the
 * report was only buffered in memory (throttled) or dropped (key budget spent).
 */
export async function recordError(kv, report, reporterId = '', now = Date.now()) {
  const fp = await fingerprint(report)
  const reporter = reporterId ? await sha(`${fp}|${reporterId}`, 4) : ''
  const buf = pending.get(fp) || { count: 0, reporters: new Set(), lastFlush: -Infinity }
  buf.count += 1
  if (reporter) buf.reporters.add(reporter)
  pending.set(fp, buf)
  if (pending.size > 2000) pending.clear()
  if (now - buf.lastFlush < FLUSH_MS) return { rec: null, notify: false, stored: false }

  const key = `err:${fp}`
  const old = JSON.parse((await kv.get(key)) || 'null')
  if (!old) {
    const hour = Math.floor(now / 3600000)
    if (keyBudget.hour !== hour) keyBudget = { hour, used: 0 }
    if (keyBudget.used >= NEW_KEYS_PER_HOUR) return { rec: null, notify: false, stored: false }
    keyBudget.used += 1
  }
  const rec = old || { fp, ...report, count: 0, first: now, notified: false, reporters: [] }
  rec.count += buf.count
  rec.reporters = [...new Set([...(rec.reporters || []), ...buf.reporters])].slice(0, 10)
  rec.last = now
  const notify = !rec.notified && rec.count >= ALERT_AT && rec.reporters.length >= ALERT_REPORTERS
  if (notify) rec.notified = true
  // The summary rides in list metadata, so the admin listing needs no extra reads.
  const metadata = { m: rec.message.slice(0, 160), p: rec.page.slice(0, 80), k: rec.kind, c: rec.count, u: rec.reporters.length, f: rec.first, l: rec.last }
  await kv.put(key, JSON.stringify(rec), { expirationTtl: TTL, metadata })
  buf.count = 0
  buf.reporters.clear()
  buf.lastFlush = now
  return { rec, notify, stored: true }
}

/** One KV list call, no per-key reads. */
export async function listErrors(kv, limit = 25) {
  const { keys } = await kv.list({ prefix: 'err:', limit: 200 })
  return keys
    .filter((k) => k.metadata)
    .map((k) => ({ fp: k.name.slice(4), message: k.metadata.m, page: k.metadata.p, kind: k.metadata.k, count: k.metadata.c, reporters: k.metadata.u, first: k.metadata.f, last: k.metadata.l }))
    .sort((a, b) => b.last - a.last)
    .slice(0, limit)
}

/** Daily cap on error emails; costs a KV read, and a write only when a mail is allowed. */
export async function takeMailSlot(kv, now = Date.now()) {
  const key = `mailcap:${new Date(now).toISOString().slice(0, 10)}`
  const used = Number(await kv.get(key)) || 0
  if (used >= MAIL_PER_DAY) return false
  await kv.put(key, String(used + 1), { expirationTtl: 2 * 24 * 3600 })
  return true
}
