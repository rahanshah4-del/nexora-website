/**
 * Document numbers from patterns such as "{PREFIX}-{YYYY}-{seq:4}".
 *
 * Tokens: {PREFIX}  the type's prefix (options.prefix)
 *         {YYYY}    4-digit year        {YY}  2-digit year
 *         {MM}      2-digit month
 *         {seq:N}   sequence, zero-padded to at least N digits
 *         {seq}     sequence, unpadded
 * Everything else is literal text.
 *
 * The counter itself lives in storage (Step 2). periodKey() tells it when to
 * restart: a pattern containing {YYYY}/{YY} numbers per year, one containing
 * {MM} per month, anything else runs forever.
 */

import { isoParts, todayIso } from './dates.js'

const TOKEN = /\{(PREFIX|YYYY|YY|MM|seq(?::(\d{1,2}))?)\}/g

function dateParts(date) {
  const iso = date instanceof Date ? todayIso(date) : date
  return isoParts(iso) || isoParts(todayIso(new Date()))
}

/**
 * @param {string} pattern
 * @param {{ prefix?: string, seq?: number, date?: string | Date }} values
 */
export function formatNumber(pattern, { prefix = '', seq = 1, date = new Date() } = {}) {
  const p = dateParts(date)
  return String(pattern || '').replace(TOKEN, (_, token, pad) => {
    if (token === 'PREFIX') return prefix
    if (token === 'YYYY') return String(p.year).padStart(4, '0')
    if (token === 'YY') return String(p.year % 100).padStart(2, '0')
    if (token === 'MM') return String(p.month).padStart(2, '0')
    return String(Math.max(0, Math.trunc(Number(seq) || 0))).padStart(pad ? Number(pad) : 0, '0')
  })
}

/**
 * The number after `lastSeq` (0 when nothing has been issued yet).
 * @returns {{ number: string, seq: number }}
 */
export function nextNumber(pattern, lastSeq, date = new Date(), { prefix = '' } = {}) {
  const seq = Math.max(0, Math.trunc(Number(lastSeq) || 0)) + 1
  return { number: formatNumber(pattern, { prefix, seq, date }), seq }
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * The sequence number inside `number`, if it matches `pattern`; else null.
 * Without options.prefix, {PREFIX} matches any text.
 */
export function parseSeq(number, pattern, { prefix } = {}) {
  let hasSeq = false
  let source = ''
  let last = 0
  const text = String(pattern || '')
  for (const match of text.matchAll(TOKEN)) {
    source += escapeRegExp(text.slice(last, match.index))
    const token = match[1]
    if (token === 'PREFIX') source += prefix === undefined ? '.*?' : escapeRegExp(prefix)
    else if (token === 'YYYY') source += '\\d{4}'
    else if (token === 'YY' || token === 'MM') source += '\\d{2}'
    else if (hasSeq) source += '\\d+'
    else {
      hasSeq = true
      source += match[2] ? `(\\d{${Number(match[2])},})` : '(\\d+)'
    }
    last = match.index + match[0].length
  }
  source += escapeRegExp(text.slice(last))
  if (!hasSeq) return null
  const m = new RegExp(`^${source}$`).exec(String(number ?? ''))
  if (!m) return null
  const seq = Number(m[1])
  return Number.isSafeInteger(seq) ? seq : null
}

/** "2026" / "2026-09" / "all": the counter bucket for `pattern` on `date`. */
export function periodKey(pattern, date = new Date()) {
  const p = dateParts(date)
  const text = String(pattern || '')
  const year = String(p.year).padStart(4, '0')
  if (text.includes('{MM}')) return `${year}-${String(p.month).padStart(2, '0')}`
  if (text.includes('{YYYY}') || text.includes('{YY}')) return year
  return 'all'
}
