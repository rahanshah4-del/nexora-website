/**
 * Daily module promotion: who gets which promotion email today. Pure functions
 * (no Firebase imports) so they are unit tested.
 *
 * Industry-standard practice applied here:
 *  - a hard daily cap (default 70) so volume grows slowly and the sender
 *    reputation stays healthy
 *  - a cooldown per person (7 days) so nobody is emailed every day
 *  - never anyone who unsubscribed, bounced or complained
 *  - content matched to the module the person chose, and the template rotates
 *    on every send so the same person never sees the same email twice in a row
 *  - modules are mixed in each day's batch (round robin) instead of one module
 *    taking the whole quota
 */
import crypto from 'node:crypto'

export const DAILY_PROMO_LIMIT = 70
export const PROMO_COOLDOWN_DAYS = 7

/** Rotation per module: the module's own promotion first, then helpful extras. */
export const PROMO_ROTATION = Object.freeze({
  crm: ['crm_promo', 'tools_hub_promo', 'invoice_tool_promo', 'geolint_promo'],
  retail: ['retail_promo', 'invoice_tool_promo', 'receipt_tool_promo', 'tools_hub_promo'],
  school: ['school_promo', 'tools_hub_promo', 'geolint_promo'],
  property: ['property_promo', 'quotation_tool_promo', 'tools_hub_promo', 'geolint_promo'],
  restaurant: ['restaurant_promo', 'receipt_tool_promo', 'tools_hub_promo', 'geolint_promo'],
  transport: ['transport_promo', 'invoice_tool_promo', 'tools_hub_promo', 'geolint_promo'],
  whatsapp: ['whatsapp_promo', 'crm_promo', 'tools_hub_promo', 'geolint_promo'],
  pharmacy: ['pharmacy_promo', 'receipt_tool_promo', 'tools_hub_promo', 'geolint_promo'],
})

export const PROMO_TEMPLATE_IDS = Array.from(new Set(Object.values(PROMO_ROTATION).flat()))

const DAY_MS = 24 * 60 * 60 * 1000
const lower = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '')

export function promoHistoryKey(email) {
  return crypto.createHash('sha1').update(lower(email)).digest('hex').slice(0, 24)
}

export function promoTemplateFor(module, sentCount = 0) {
  const list = PROMO_ROTATION[module] || PROMO_ROTATION.crm
  return list[Math.max(0, Number(sentCount) || 0) % list.length]
}

function millis(value) {
  if (!value) return 0
  if (typeof value.toMillis === 'function') return value.toMillis()
  if (typeof value.toDate === 'function') return value.toDate().getTime()
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime()
  return Number.isFinite(time) ? time : 0
}

/**
 * @param {{contacts: object[], history: Map<string, {count?: number, lastSentAt?: any}>, unsubscribed?: Set<string>,
 *          now?: Date, limit?: number, cooldownDays?: number}} input contacts come from mergeAudienceContacts()
 * @returns {{email: string, name: string, module: string, templateId: string}[]}
 */
export function selectDailyPromo({ contacts = [], history = new Map(), unsubscribed = new Set(), now = new Date(), limit = DAILY_PROMO_LIMIT, cooldownDays = PROMO_COOLDOWN_DAYS } = {}) {
  if (limit <= 0) return []
  const cutoff = now.getTime() - cooldownDays * DAY_MS
  const byModule = new Map()
  contacts.forEach((contact) => {
    const email = lower(contact?.email)
    if (!email || contact.status === 'unsubscribed' || contact.optedOut || unsubscribed.has(email)) return
    const past = history.get(email) || {}
    const last = millis(past.lastSentAt)
    if (last && last > cutoff) return // inside the cooldown
    const module = PROMO_ROTATION[contact.moduleInterest] ? contact.moduleInterest : 'crm'
    if (!byModule.has(module)) byModule.set(module, [])
    byModule.get(module).push({ email, name: contact.name || '', module, count: Number(past.count) || 0, last })
  })
  // never-emailed first, then the one waiting longest
  byModule.forEach((list) => list.sort((a, b) => a.last - b.last || a.email.localeCompare(b.email)))
  const lanes = Array.from(byModule.values()).sort((a, b) => b.length - a.length)
  const picked = []
  while (picked.length < limit && lanes.some((lane) => lane.length)) {
    for (const lane of lanes) {
      if (picked.length >= limit) break
      const next = lane.shift()
      if (next) picked.push({ email: next.email, name: next.name, module: next.module, templateId: promoTemplateFor(next.module, next.count) })
    }
  }
  return picked
}
