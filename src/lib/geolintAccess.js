/** Pure helpers for the Control Centre access screen (no network, no React). */

export const BLOCK_DURATIONS = [
  { hours: 1, label: '1 hour' },
  { hours: 6, label: '6 hours' },
  { hours: 24, label: '24 hours' },
  { hours: 168, label: '7 days' },
  { hours: 720, label: '30 days' },
  { hours: 0, label: 'Until I lift it' },
]

export const EXTRA_PAGE_PRESETS = [100, 250, 500, 1000]

/** One website per line (or comma-separated) -> clean, unique host names. Anything else is reported back. */
export function parseHosts(text) {
  const hosts = []
  const invalid = []
  for (const raw of String(text || '').split(/[\n,]+/)) {
    const t = raw.trim()
    if (!t) continue
    const h = t.toLowerCase().replace(/^[a-z]+:\/\//, '').split(/[/?#]/)[0].replace(/:\d+$/, '').replace(/\.$/, '')
    if (/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(h)) { if (!hosts.includes(h)) hosts.push(h) } else invalid.push(t)
  }
  return { hosts, invalid }
}

/** IPv4 or IPv6 as typed by an admin. */
export function isIpAddress(value) {
  const v = String(value || '').trim()
  if (/^(\d{1,3})(\.\d{1,3}){3}$/.test(v)) return v.split('.').every((n) => Number(n) <= 255)
  return /^[0-9a-f:]+$/i.test(v) && v.includes(':') && v.length <= 45 && (v.match(/::/g) || []).length <= 1
}

/** Badge for a client row: what an admin needs to see at a glance. */
export function clientBadge(c) {
  if (c.blocked) return { tone: 'rose', text: c.blockedUntil ? `Blocked until ${new Date(c.blockedUntil).toLocaleString()}` : 'Blocked' }
  if (c.exempt) return { tone: 'emerald', text: 'No limit' }
  if (c.remaining < 1) return { tone: 'amber', text: c.resetAt ? `Out of pages, resets ${new Date(c.resetAt).toLocaleString()}` : 'Out of pages' }
  return { tone: 'slate', text: c.used > 0 ? 'Active' : 'Idle' }
}

/** Share of the allowance used, 0-100. */
export function usedPercent(c) {
  return c.limit > 0 ? Math.min(100, Math.round((c.used / c.limit) * 100)) : 0
}

/** Body for the "block" action. */
export function blockPayload(reason, hours) {
  const r = String(reason || '').trim()
  if (r.length < 3) return { error: 'Write a reason of at least 3 characters.' }
  return { extra: { reason: r.slice(0, 200), ...(Number(hours) > 0 ? { hours: Number(hours) } : {}) } }
}

/** Body for the "grant extra pages" action. */
export function grantPayload(pages) {
  const n = Math.floor(Number(pages))
  if (!Number.isFinite(n) || n < 1 || n > 100000) return { error: 'Enter a number of pages between 1 and 100000.' }
  return { extra: { pages: n } }
}

export const EVENT_LABELS = { block: 'Blocked', unblock: 'Unblocked', grant: 'Extra pages', reset: 'Allowance reset', exempt: 'No limit on', unexempt: 'Limit restored', config: 'Settings changed' }
