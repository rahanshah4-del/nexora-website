/**
 * Pure helpers for the GeoLint fix service: labels, the order timeline, score comparison,
 * Search Console numbers and the fix brief staff copy for Claude Code. No network, no React.
 */

import { GEOLINT_FIX_PATH, GEOLINT_ORDERS_PATH } from './geolintLaunch.js'

export const FIX_PATH = GEOLINT_FIX_PATH
export const ORDERS_PATH = GEOLINT_ORDERS_PATH
export const DEFAULT_TARGET = 90
export const DEFAULT_PRICE = 50

export const PLATFORM_OPTIONS = Object.freeze([
  { value: 'wordpress', label: 'WordPress' },
  { value: 'shopify', label: 'Shopify' },
  { value: 'wix', label: 'Wix' },
  { value: 'squarespace', label: 'Squarespace' },
  { value: 'webflow', label: 'Webflow' },
  { value: 'nextjs', label: 'Next.js / React app' },
  { value: 'custom', label: 'Custom code (HTML, PHP, other)' },
  { value: 'other', label: 'Not sure' },
])

export const ACCESS_OPTIONS = Object.freeze([
  { value: 'invite-admin-user', label: 'I will invite you as an admin or editor user', hint: 'Safest. You stay in control and can remove us any time.' },
  { value: 'hosting-panel-invite', label: 'I will invite you to my hosting panel', hint: 'cPanel, Hostinger, Vercel, Netlify and similar.' },
  { value: 'git-repo-access', label: 'I will add you to my code repository', hint: 'GitHub, GitLab or Bitbucket.' },
  { value: 'cloudflare-invite', label: 'I will invite you to my Cloudflare account', hint: 'Only if Cloudflare serves your site.' },
  { value: 'will-share-later', label: 'I am not sure yet, tell me what to do', hint: 'We will guide you step by step after you order.' },
])

export const optionLabel = (options, value) => options.find((o) => o.value === value)?.label || value || ''

/** Client-facing steps. Every status maps to one step; closed orders sit outside the line. */
export const STEPS = Object.freeze([
  { id: 'payment', label: 'Payment' },
  { id: 'fixing', label: 'We fix your site' },
  { id: 'review', label: 'Re-audit' },
  { id: 'done', label: 'Done' },
])

const STATUS_INFO = Object.freeze({
  awaiting_payment: { label: 'Waiting for payment', tone: 'amber', step: 0, text: 'Send the payment with the instructions below, then press “I have paid”.' },
  payment_submitted: { label: 'Checking your payment', tone: 'blue', step: 0, text: 'Thank you. We are confirming your payment. This usually takes a few hours.' },
  paid: { label: 'Paid, starting soon', tone: 'blue', step: 1, text: 'Payment received. We will contact you about access to your website, then start fixing.' },
  in_progress: { label: 'We are fixing your site', tone: 'blue', step: 1, text: 'We are working on your website now.' },
  ready_for_review: { label: 'Fixed, checking the score', tone: 'violet', step: 2, text: 'The fixes are in. We are running the audit again to show you the new score.' },
  completed: { label: 'Completed', tone: 'emerald', step: 3, text: 'All done. Your before and after score is below.' },
  cancelled: { label: 'Cancelled', tone: 'slate', step: -1, text: 'This order was cancelled.' },
  refunded: { label: 'Refunded', tone: 'slate', step: -1, text: 'This order was refunded.' },
})

export const statusInfo = (status) => STATUS_INFO[status] || { label: String(status || 'Unknown'), tone: 'slate', step: -1, text: '' }
export const ADMIN_STATUSES = Object.freeze(['awaiting_payment', 'payment_submitted', 'paid', 'in_progress', 'ready_for_review', 'completed', 'cancelled', 'refunded'])
export const OPEN = Object.freeze(['awaiting_payment', 'payment_submitted', 'paid', 'in_progress', 'ready_for_review'])
export const isOpen = (status) => OPEN.includes(status)

/** What the admin can do from each status (mirrors the engine's TRANSITIONS). */
export const NEXT_STATUSES = Object.freeze({
  awaiting_payment: ['cancelled'],
  payment_submitted: ['awaiting_payment', 'cancelled'],
  paid: ['in_progress', 'refunded'],
  in_progress: ['ready_for_review', 'completed', 'refunded'],
  ready_for_review: ['in_progress', 'completed', 'refunded'],
  completed: ['in_progress', 'refunded'],
  cancelled: [],
  refunded: [],
})

export function formatMoney(price) {
  const amount = Number(price?.amount)
  if (!Number.isFinite(amount)) return '$—'
  return `$${Number.isInteger(amount) ? amount : amount.toFixed(2)}`
}

const pct = (n) => (Number.isFinite(Number(n)) ? Math.round(Number(n) * 10) / 10 : null)

/**
 * Before/after proof. Never promises a number: `reachedTarget` only says whether the real, re-measured
 * score is at or above the target; `gain` can be zero or negative and is shown as it is.
 */
export function compareScores(before, after, target = DEFAULT_TARGET) {
  const b = pct(before?.scorePercent)
  const a = pct(after?.scorePercent)
  return {
    before: b,
    after: a,
    gain: b !== null && a !== null ? Math.round((a - b) * 10) / 10 : null,
    target,
    reachedTarget: a !== null && a >= target,
    sameKind: Boolean(before && after && before.kind === after.kind),
  }
}

/** "+12.5", "-3", "0" */
export const signed = (n) => (n === null || n === undefined || !Number.isFinite(Number(n)) ? '—' : `${n > 0 ? '+' : ''}${n}`)

// ---- Search Console

export const gscCtr = (ctr) => `${(Number(ctr) * 100).toFixed(1)}%`
export const gscPosition = (position) => (Number(position) > 0 ? Number(position).toFixed(1) : '—')
export const compact = (n) => {
  const v = Number(n)
  if (!Number.isFinite(v)) return '—'
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 10_000) return `${Math.round(v / 1000)}K`
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`
  return String(Math.round(v))
}

/** Change of a metric against the period before, in percent (position: lower is better, so the sign is flipped). */
export function gscDelta(now, previous, key) {
  const a = Number(now?.[key])
  const b = Number(previous?.[key])
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null
  const change = ((a - b) / b) * 100
  const value = key === 'position' ? -change : change
  return Math.round(value * 10) / 10
}

/** Queries that already get impressions but rank just outside the top results: the easiest wins. */
export function nearMisses(queries, limit = 10) {
  return (Array.isArray(queries) ? queries : [])
    .filter((q) => q.impressions >= 20 && q.position > 3 && q.position <= 20)
    .sort((x, y) => y.impressions - x.impressions)
    .slice(0, limit)
}

// ---- form

export function validateOrderForm(form) {
  const errors = {}
  const name = String(form.name || '').trim()
  if (name.length < 2) errors.name = 'Enter your name.'
  const phone = String(form.whatsapp || '').trim()
  if (phone && !/^[0-9+()\- ]{6,24}$/.test(phone)) errors.whatsapp = 'Enter a phone number like +92 300 1234567.'
  if (!String(form.siteUrl || '').trim()) errors.siteUrl = 'Enter the website address.'
  if (!form.platform) errors.platform = 'Choose your platform.'
  if (!form.accessMethod) errors.accessMethod = 'Choose how you will give us access.'
  if (!form.authorized) errors.authorized = 'Confirm that you own this website or may change it.'
  if (/(pass(word|wd)?|pwd|secret|api[-_ ]?key|token)\s*(is|=|:|-)/i.test(`${form.accessNotes || ''} ${form.notes || ''}`)) {
    errors.accessNotes = 'Please do not write passwords here. We will ask you for an invite instead.'
  }
  return errors
}

export function orderErrorMessage(error) {
  if (error?.code === 'UNAUTHENTICATED') return 'Please sign in again.'
  if (error?.unreachable) return 'We could not reach the server. Check your internet and try again.'
  return error?.message || 'Something went wrong. Please try again.'
}

// ---- the brief staff copy for Claude Code (English on purpose)

const PRIORITY_ORDER = ['critical', 'high', 'medium', 'low']

/**
 * A complete, self-contained work order: what the site is, how to get in, what the audit found,
 * what "done" means. `report` is the full audit JSON (optional); the order summary is enough without it.
 */
export function buildFixBrief(order, { target = DEFAULT_TARGET } = {}) {
  const lines = []
  const b = order.before
  lines.push(`# GeoLint fix order ${order.id}: ${order.host}`)
  lines.push('')
  lines.push('## Goal')
  lines.push(`Make ${order.siteUrl} readable and citable for AI search crawlers (GEO). Fix what the audit below found, change nothing else, and keep the site working exactly as before for visitors.`)
  lines.push(`Success is measured by re-running the GeoLint audit afterwards. Aim for ${target}+ but report the real score honestly; never claim a number that was not measured.`)
  lines.push('')
  lines.push('## Site')
  lines.push(`- URL: ${order.siteUrl}`)
  lines.push(`- Platform: ${optionLabel(PLATFORM_OPTIONS, order.platform)}`)
  lines.push(`- Access: ${optionLabel(ACCESS_OPTIONS, order.accessMethod)}${order.accessNotes ? ` (client note: ${order.accessNotes})` : ''}`)
  lines.push(`- Client: ${order.name}, ${order.email}${order.whatsapp ? `, ${order.whatsapp}` : ''}`)
  if (order.notes) lines.push(`- Client request: ${order.notes}`)
  lines.push('- Never ask the client for a password. Work through the invite they gave, and keep a note of every change you make.')
  lines.push('')
  if (b) {
    lines.push(`## Baseline audit (${b.kind === 'site' ? 'whole site' : 'single page'}), score ${b.scorePercent}/100`)
    lines.push(`Audited: ${b.url || order.siteUrl}${b.auditedAt ? ` on ${b.auditedAt.slice(0, 10)}` : ''}`)
    const sorted = [...(b.issues || [])].sort((x, y) => PRIORITY_ORDER.indexOf(x.priority) - PRIORITY_ORDER.indexOf(y.priority))
    if (sorted.length) {
      lines.push('')
      lines.push('Findings, most important first:')
      sorted.forEach((i, n) => lines.push(`${n + 1}. [${i.priority}] ${i.title}`))
      if (b.moreIssues > 0) lines.push(`(+${b.moreIssues} more lower-priority findings in the full report)`)
    } else {
      lines.push('No findings were listed.')
    }
  } else {
    lines.push('## Baseline audit')
    lines.push('No baseline is attached yet. Run the GeoLint audit first and attach it to the order.')
  }
  lines.push('')
  if (order.gsc?.queries?.length) {
    lines.push(`## Search Console (${order.gsc.range.start} to ${order.gsc.range.end})`)
    if (order.gsc.totals) lines.push(`Totals: ${order.gsc.totals.clicks} clicks, ${order.gsc.totals.impressions} impressions, average position ${gscPosition(order.gsc.totals.position)}.`)
    const top = order.gsc.queries.slice(0, 15)
    lines.push('Top queries (query: clicks / impressions / position):')
    top.forEach((q) => lines.push(`- ${q.query}: ${q.clicks} / ${q.impressions} / ${gscPosition(q.position)}`))
    lines.push('Use these when you write answer-first headings and FAQ text, so the page answers the questions people already search for.')
    lines.push('')
  }
  lines.push('## How to work')
  lines.push('1. Reproduce each finding on the live site before you change it.')
  lines.push('2. Fix in order of priority. Prefer small, reversible changes (robots.txt, llms.txt, meta, structured data, answer-first openings, server-rendered text).')
  lines.push('3. After each batch, re-test the page as a plain HTTP fetch (no JavaScript) to confirm the text and schema are present.')
  lines.push('4. When done, re-run the GeoLint audit from the Control Centre (“Re-audit now”) and compare with the baseline.')
  lines.push('5. Write the client a short, plain-language summary of what changed.')
  return lines.join('\n')
}
