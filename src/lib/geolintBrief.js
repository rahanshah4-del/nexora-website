/**
 * The extra answers of the 7-step order wizard (market, language, business, audience, what to fix) and how
 * they travel with the order. The order service stores one `notes` text (1000 characters), so these answers
 * are written into that text as a short, readable block that staff and the fix brief show as it is.
 * Pure functions only: no React, no network.
 */

import { PRIORITY_LABELS } from './geolintReport.js'

export const NOTES_MAX = 1000
/** Room kept for the client's own free text; the rest of the 1000 characters is for the block above it. */
export const CLIENT_NOTES_MAX = 380

export const MARKET_OPTIONS = Object.freeze([
  'Worldwide', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Pakistan', 'India', 'United Arab Emirates', 'Saudi Arabia', 'Bahrain',
  'Qatar', 'Germany', 'France', 'Spain', 'Italy', 'Netherlands', 'Turkey', 'Nigeria', 'South Africa', 'Singapore', 'Malaysia', 'Indonesia',
])

export const LANGUAGE_OPTIONS = Object.freeze([
  'English', 'Urdu', 'Arabic', 'Hindi', 'Spanish', 'French', 'German', 'Portuguese', 'Italian', 'Turkish', 'Indonesian', 'Dutch',
])

const clip = (value, max) => {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`
}

/** The fixes of the client's own audit, in the order the report lists them. Empty when there is no audit of this site. */
export function fixChoices(report, host = '') {
  if (!report || !Array.isArray(report.remediation)) return []
  const bare = (h) => String(h || '').toLowerCase().replace(/^www\./, '')
  let reportHost = ''
  try { reportHost = bare(new URL(report.url || report.page?.url || '').hostname) } catch { /* no usable address in the report */ }
  if (host && reportHost && bare(host) !== reportHost) return []
  return report.remediation
    .filter((item) => item && item.title)
    .map((item, index) => ({
      id: String(item.id || `fix-${index + 1}`),
      title: clip(item.title, 160),
      priority: PRIORITY_LABELS[item.priority] ? item.priority : 'medium',
      upTo: Number(item.upTo) > 0 ? Number(item.upTo) : 0,
    }))
}

/** Which of the choices the client keeps. `off` lists the ids switched off; everything else counts as chosen. */
export const chosenFixes = (choices, off = []) => choices.filter((c) => !off.includes(c.id))

/** The sentence about scope that goes into the order. */
export function scopeLine(choices, off = []) {
  if (!choices.length) return 'Fix scope: everything the audit finds'
  const kept = chosenFixes(choices, off)
  if (kept.length === choices.length) return `Fix scope: all ${choices.length} fixes from the audit`
  if (!kept.length) return `Fix scope: none of the ${choices.length} audit fixes yet (client will say what to do)`
  const skipped = choices.filter((c) => off.includes(c.id)).map((c) => c.title)
  return `Fix scope: ${kept.length} of ${choices.length} fixes. Do NOT touch: ${clip(skipped.join('; '), 170)}`
}

/** Everything the client answered beyond the order form, plus their own notes, as one text of at most 1000 characters. */
export function composeOrderNotes({ market, language, business, audience, choices = [], off = [], notes = '' }) {
  const lines = [
    `Target market: ${clip(market, 40) || 'Worldwide'}`,
    `Language: ${clip(language, 30) || 'English'}`,
  ]
  if (clip(business, 1)) lines.push(`Business: ${clip(business, 230)}`)
  if (clip(audience, 1)) lines.push(`Audience: ${clip(audience, 130)}`)
  lines.push(scopeLine(choices, off))
  const own = clip(notes, CLIENT_NOTES_MAX)
  if (own) lines.push(`Client notes: ${own}`)
  return lines.join('\n').slice(0, NOTES_MAX)
}
