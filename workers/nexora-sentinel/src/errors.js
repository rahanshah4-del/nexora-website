/** Browser error reports from the site, grouped by fingerprint. */
const MAX_MESSAGE = 200
const ALERT_AT = 10 // reports of the same error before the owner is emailed
const TTL = 3 * 24 * 3600

export function normalizeReport(body) {
  const message = String(body?.message ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_MESSAGE)
  if (!message) return null
  let page = String(body?.page ?? '/').split(/[?#]/)[0].slice(0, 120)
  if (!page.startsWith('/')) page = '/'
  const kind = ['error', 'rejection', 'boundary'].includes(body?.kind) ? body.kind : 'error'
  return { message, page, kind }
}

// Numbers and ids vary between users; the same bug should group together.
export async function fingerprint(report) {
  const shape = `${report.kind}|${report.page}|${report.message.replace(/\d+/g, '#').replace(/[0-9a-f]{16,}/gi, '*')}`
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(shape))
  return [...new Uint8Array(digest)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Returns { count, notify } — notify is true exactly once, when the threshold is first reached. */
export async function recordError(kv, report, now = Date.now()) {
  const fp = await fingerprint(report)
  const key = `err:${fp}`
  const old = JSON.parse((await kv.get(key)) || 'null')
  const rec = old || { fp, ...report, count: 0, first: now, notified: false }
  rec.count += 1
  rec.last = now
  const notify = !rec.notified && rec.count >= ALERT_AT
  if (notify) rec.notified = true
  await kv.put(key, JSON.stringify(rec), { expirationTtl: TTL })
  return { rec, notify }
}

export async function listErrors(kv, limit = 25) {
  const { keys } = await kv.list({ prefix: 'err:', limit: 100 })
  const rows = (await Promise.all(keys.map(async (k) => JSON.parse((await kv.get(k.name)) || 'null')))).filter(Boolean)
  return rows.sort((a, b) => b.last - a.last).slice(0, limit)
}
