/**
 * Calendar dates as ISO strings ("2026-09-27"), never Date objects.
 *
 * Invoice dates are calendar days, not instants: storing them as strings and
 * doing arithmetic in UTC means a document never shifts a day when it is
 * opened in another time zone (or rendered at build time on a server).
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/** True for a real calendar date in YYYY-MM-DD form ("2026-02-30" is false). */
export function isIsoDate(value) {
  const m = ISO_DATE.exec(String(value ?? ''))
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const date = new Date(Date.UTC(y, mo - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d
}

/** { year, month, day } of an ISO date, or null. */
export function isoParts(value) {
  if (!isIsoDate(value)) return null
  const [y, m, d] = value.split('-').map(Number)
  return { year: y, month: m, day: d }
}

function toIso(date) {
  return date.toISOString().slice(0, 10)
}

/** Today's LOCAL calendar date. Pass `now` for deterministic output. */
export function todayIso(now = new Date()) {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** ISO date plus `days` (may be negative); null for an invalid date. */
export function addDays(iso, days) {
  const p = isoParts(iso)
  if (!p) return null
  return toIso(new Date(Date.UTC(p.year, p.month - 1, p.day + Math.trunc(Number(days) || 0))))
}

/** -1, 0 or 1; null when either date is invalid. */
export function compareIsoDates(a, b) {
  if (!isIsoDate(a) || !isIsoDate(b)) return null
  return a < b ? -1 : a > b ? 1 : 0
}

/** Whole days from `a` to `b` (b − a); null when either is invalid. */
export function daysBetween(a, b) {
  const pa = isoParts(a)
  const pb = isoParts(b)
  if (!pa || !pb) return null
  return Math.round((Date.UTC(pb.year, pb.month - 1, pb.day) - Date.UTC(pa.year, pa.month - 1, pa.day)) / 86_400_000)
}

/** Due date for net-N payment terms; null when terms are not a number ≥ 0. */
export function dueDateFromTerms(issueDate, termsDays) {
  const days = Number(termsDays)
  if (termsDays === null || termsDays === undefined || termsDays === '' || !Number.isInteger(days) || days < 0) return null
  return addDays(issueDate, days)
}

/**
 * Localized date label. Formatted in UTC from the calendar parts, so the day
 * shown is the day stored whatever the viewer's time zone.
 * @param {string} iso
 * @param {string} [locale]
 * @param {Intl.DateTimeFormatOptions} [options]  default { dateStyle: 'medium' }
 */
export function formatIsoDate(iso, locale = 'en', options = { dateStyle: 'medium' }) {
  const p = isoParts(iso)
  if (!p) return ''
  try {
    return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(new Date(Date.UTC(p.year, p.month - 1, p.day)))
  } catch {
    return iso
  }
}
