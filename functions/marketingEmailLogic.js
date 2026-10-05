/**
 * Email Marketing: pure logic (no Firebase imports) so it can be unit tested.
 *
 *  - daily quota / sending window, in Pakistan time
 *  - Resend (Svix) webhook signature check
 *  - the per-recipient status state machine fed by webhook events
 *  - signed one-click unsubscribe links
 */
import crypto from 'node:crypto'

export const DEFAULT_EMAIL_SETTINGS = Object.freeze({
  dailyLimit: 50,
  windowStartHour: 9,
  windowEndHour: 21,
  paused: false,
})
export const MAX_DAILY_LIMIT = 500
export const EMAIL_TIME_ZONE = 'Asia/Karachi'

// Furthest-along state wins; a late "delivered" never moves an "opened" email back.
const RANK = { queued: 0, sent: 1, delivered: 2, opened: 3, clicked: 4 }
const TERMINAL = new Set(['failed', 'bounced', 'complained', 'skipped', 'cancelled'])

export function normalizeEmailSettings(raw = {}) {
  const limit = Math.round(Number(raw.dailyLimit))
  const start = Math.round(Number(raw.windowStartHour))
  const end = Math.round(Number(raw.windowEndHour))
  const windowStartHour = Number.isFinite(start) && start >= 0 && start <= 23 ? start : DEFAULT_EMAIL_SETTINGS.windowStartHour
  const windowEndHour = Number.isFinite(end) && end >= 1 && end <= 24 && end > windowStartHour ? end : DEFAULT_EMAIL_SETTINGS.windowEndHour
  return {
    dailyLimit: Number.isFinite(limit) && limit >= 1 ? Math.min(limit, MAX_DAILY_LIMIT) : DEFAULT_EMAIL_SETTINGS.dailyLimit,
    windowStartHour,
    windowEndHour: windowEndHour > windowStartHour ? windowEndHour : DEFAULT_EMAIL_SETTINGS.windowEndHour,
    paused: raw.paused === true,
  }
}

function partsInPakistan(date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: EMAIL_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type) => parts.find((part) => part.type === type)?.value
  return { year: get('year'), month: get('month'), day: get('day'), hour: Number(get('hour')) }
}

/** YYYY-MM-DD in Pakistan time: the day the daily quota counts against. */
export function pktDateKey(date = new Date()) {
  const { year, month, day } = partsInPakistan(date)
  return `${year}-${month}-${day}`
}

export function inSendWindow(date, settings) {
  const { hour } = partsInPakistan(date)
  return hour >= settings.windowStartHour && hour < settings.windowEndHour
}

export function remainingQuota(settings, sentToday) {
  return Math.max(0, settings.dailyLimit - Math.max(0, Number(sentToday) || 0))
}

/** How many emails one scheduler run may send: spread the day instead of bursting. */
export function batchForRun(settings, sentToday, { maxPerRun = 10 } = {}) {
  return Math.min(remainingQuota(settings, sentToday), maxPerRun)
}

export function estimatedDays(queued, settings) {
  return queued > 0 ? Math.ceil(queued / settings.dailyLimit) : 0
}

// ---------------------------------------------------------------------------
// Resend webhooks are signed with Svix: HMAC-SHA256 over "id.timestamp.body",
// key = base64 part of the "whsec_..." secret, header "v1,<sig> v1,<sig2>".
// ---------------------------------------------------------------------------
export function verifySvixSignature({ secret, id, timestamp, signature, rawBody, now = Date.now(), toleranceMs = 5 * 60 * 1000 } = {}) {
  if (!secret || !id || !timestamp || !signature || typeof rawBody !== 'string') return { ok: false, reason: 'missing' }
  const sentAt = Number(timestamp) * 1000
  if (!Number.isFinite(sentAt) || Math.abs(now - sentAt) > toleranceMs) return { ok: false, reason: 'timestamp' }
  const key = Buffer.from(String(secret).replace(/^whsec_/, ''), 'base64')
  const expected = crypto.createHmac('sha256', key).update(`${id}.${timestamp}.${rawBody}`).digest()
  const candidates = String(signature).split(' ').map((part) => part.split(',')[1]).filter(Boolean)
  const ok = candidates.some((candidate) => {
    const given = Buffer.from(candidate, 'base64')
    return given.length === expected.length && crypto.timingSafeEqual(given, expected)
  })
  return ok ? { ok: true } : { ok: false, reason: 'signature' }
}

export function signSvix({ secret, id, timestamp, rawBody }) {
  const key = Buffer.from(String(secret).replace(/^whsec_/, ''), 'base64')
  return `v1,${crypto.createHmac('sha256', key).update(`${id}.${timestamp}.${rawBody}`).digest('base64')}`
}

// ---------------------------------------------------------------------------
// Webhook event -> update for the marketingEmailLogs doc and its campaign.
// `log` is the current doc data; returns { patch, campaignInc, optOut } or null
// when the event changes nothing (duplicate / out-of-date).
// ---------------------------------------------------------------------------
const EVENT_TYPES = {
  'email.sent': 'sent',
  'email.delivered': 'delivered',
  'email.delivery_delayed': 'delayed',
  'email.opened': 'opened',
  'email.clicked': 'clicked',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
  'email.failed': 'failed',
}

export function isTrackedEvent(type) {
  return Object.hasOwn(EVENT_TYPES, type)
}

function higher(current, next) {
  if (TERMINAL.has(current)) return current
  return (RANK[next] ?? -1) > (RANK[current] ?? 0) ? next : current
}

export function applyEmailEvent(log = {}, event = {}, { eventId = '' } = {}) {
  const kind = EVENT_TYPES[event.type]
  if (!kind) return null
  const seen = Array.isArray(log.eventIds) ? log.eventIds : []
  if (eventId && seen.includes(eventId)) return null

  const at = event.created_at || event.data?.created_at || new Date().toISOString()
  const data = event.data || {}
  const patch = {}
  const campaignInc = {}
  let optOut = false

  if (kind === 'sent') {
    patch.status = higher(log.status, 'sent')
  } else if (kind === 'delivered') {
    patch.status = higher(log.status, 'delivered')
    if (!log.deliveredAt) { patch.deliveredAt = at; campaignInc.deliveredCount = 1 }
  } else if (kind === 'delayed') {
    patch.delayedAt = at
  } else if (kind === 'opened') {
    patch.status = higher(log.status, 'opened')
    patch.openCount = (Number(log.openCount) || 0) + 1
    patch.lastOpenedAt = at
    if (!log.openedAt) { patch.openedAt = at; campaignInc.openedCount = 1 }
  } else if (kind === 'clicked') {
    patch.status = higher(log.status, 'clicked')
    patch.clickCount = (Number(log.clickCount) || 0) + 1
    patch.lastClickedAt = at
    const link = data.click?.link || data.link || ''
    if (link) patch.lastClickUrl = String(link).slice(0, 500)
    if (!log.clickedAt) { patch.clickedAt = at; campaignInc.clickedCount = 1 }
  } else if (kind === 'bounced') {
    const type = String(data.bounce?.type || '')
    patch.status = 'bounced'
    patch.bouncedAt = at
    patch.bounceType = type
    patch.error = String(data.bounce?.message || data.bounce?.subType || 'Bounced').slice(0, 300)
    if (log.status !== 'bounced') campaignInc.bouncedCount = 1
    // Only hard bounces permanently suppress the address.
    optOut = type === 'Permanent'
  } else if (kind === 'complained') {
    patch.status = 'complained'
    patch.complainedAt = at
    if (log.status !== 'complained') campaignInc.complainedCount = 1
    optOut = true
  } else if (kind === 'failed') {
    patch.status = 'failed'
    patch.error = String(data.failed?.reason || data.reason || 'Failed').slice(0, 300)
  }

  if (eventId) patch.eventIds = [...seen, eventId].slice(-30)
  return { patch, campaignInc, optOut }
}

// ---------------------------------------------------------------------------
// One-click unsubscribe link tokens: HMAC of the lowercased address, so a link
// cannot be forged to unsubscribe somebody else.
// ---------------------------------------------------------------------------
export function unsubscribeToken(email, secret) {
  return crypto.createHmac('sha256', String(secret || '')).update(String(email || '').trim().toLowerCase()).digest('base64url').slice(0, 32)
}

export function verifyUnsubscribeToken(email, token, secret) {
  if (!secret || !email || !token) return false
  const expected = Buffer.from(unsubscribeToken(email, secret))
  const given = Buffer.from(String(token))
  return expected.length === given.length && crypto.timingSafeEqual(expected, given)
}

export function unsubscribeUrl(email, { base, secret }) {
  const clean = String(email || '').trim().toLowerCase()
  return `${base}?e=${encodeURIComponent(clean)}&t=${unsubscribeToken(clean, secret)}`
}
