// WhatsApp CRM — Manual Mode helpers.
//
// Pure, side-effect-free helpers shared by the WhatsApp manual-mode hooks,
// pages, and the WhatsApp CRM dashboard section. Manual mode is 100% frontend:
// no Meta Cloud API, no webhook, no stored tokens. Outbound messaging is done
// through click-to-WhatsApp (wa.me) links the agent opens in their own session.
import { toNumber } from './calculations.js'

export { toNumber }

/* ------------------------------ Constants ------------------------------ */

export const CONTACT_STATUSES = ['New', 'Active', 'Customer', 'Inactive', 'Blocked']
export const LEAD_STAGES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost']
export const FOLLOWUP_STATUSES = ['Pending', 'Completed', 'Cancelled']
export const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']
export const LEAD_SOURCES = ['WhatsApp', 'Referral', 'Website', 'Ad', 'Walk-in', 'Other']
export const TEMPLATE_CATEGORIES = ['Greeting', 'Follow-up', 'Sales', 'Support', 'Reminder', 'Marketing', 'Other']
export const NOTE_LINK_TYPES = ['contact', 'lead']

export const EXPIRING_SOON_DAYS = 3
const DAY_MS = 86400000

/* --------------------------- Phone & wa.me link --------------------------- */

// Normalize a phone number to the digits-only E.164 body wa.me expects
// (no '+', spaces, or separators). Leading '00' international prefix is dropped.
export function normalizePhone(value) {
  let digits = String(value ?? '').replace(/[^\d]/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  return digits
}

export function isValidPhone(value) {
  const digits = normalizePhone(value)
  return digits.length >= 8 && digits.length <= 15
}

// Build a click-to-WhatsApp deep link. Returns '' when the phone is unusable so
// callers can disable the action instead of opening a broken tab.
export function waLink(phone, text = '') {
  const digits = normalizePhone(phone)
  if (!digits) return ''
  const base = `https://wa.me/${digits}`
  const body = String(text || '').trim()
  return body ? `${base}?text=${encodeURIComponent(body)}` : base
}

/* ------------------------------ Templates ------------------------------ */

// Extract unique {{placeholder}} tokens from a template body, in first-seen order.
export function templateVariables(body) {
  const found = []
  const seen = new Set()
  const regex = /\{\{\s*([\w.-]+)\s*\}\}/g
  let match
  while ((match = regex.exec(String(body || ''))) !== null) {
    const key = match[1]
    if (!seen.has(key)) {
      seen.add(key)
      found.push(key)
    }
  }
  return found
}

// Render a template body, replacing {{key}} tokens from `vars`. Keys are matched
// case-insensitively. Unknown tokens are left untouched so the agent can spot
// and fill anything that's still missing before sending.
export function renderTemplate(body, vars = {}) {
  const lookup = {}
  for (const [key, value] of Object.entries(vars || {})) {
    if (value === undefined || value === null) continue
    lookup[String(key).toLowerCase()] = String(value)
  }
  return String(body || '').replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (whole, key) => {
    const hit = lookup[String(key).toLowerCase()]
    return hit === undefined ? whole : hit
  })
}

/* -------------------------------- Dates -------------------------------- */

export function toDateValue(value) {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value?.toDate === 'function') {
    const date = value.toDate()
    return Number.isNaN(date.getTime()) ? null : date
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function startOfDay(date) {
  const next = new Date(date.getTime())
  next.setHours(0, 0, 0, 0)
  return next
}

function resolveNow(now) {
  return now instanceof Date ? now : now ? toDateValue(now) || new Date() : new Date()
}

// Signed whole-day count until `date` — negative once it is in the past.
export function daysUntil(date, now = new Date()) {
  const target = toDateValue(date)
  if (!target) return null
  return Math.ceil((startOfDay(target).getTime() - startOfDay(resolveNow(now)).getTime()) / DAY_MS)
}

/* ------------------------------ Follow-ups ------------------------------ */

export function isFollowUpOpen(record = {}) {
  return String(record.status || 'Pending').trim().toLowerCase() === 'pending'
}

// Overdue when the due date has passed and the reminder is still pending.
export function isFollowUpOverdue(record = {}, now = new Date()) {
  if (!isFollowUpOpen(record)) return false
  const days = daysUntil(record.dueDate, now)
  return days !== null && days < 0
}

export function isFollowUpDueToday(record = {}, now = new Date()) {
  if (!isFollowUpOpen(record)) return false
  return daysUntil(record.dueDate, now) === 0
}

export function isFollowUpDueSoon(record = {}, now = new Date()) {
  if (!isFollowUpOpen(record)) return false
  const days = daysUntil(record.dueDate, now)
  return days !== null && days > 0 && days <= EXPIRING_SOON_DAYS
}

/* -------------------------------- Stats -------------------------------- */

export function contactStats(records = []) {
  const list = Array.isArray(records) ? records : []
  const byStatus = {}
  let customers = 0
  let active = 0
  let blocked = 0
  for (const record of list) {
    const status = String(record.status || 'New')
    byStatus[status] = (byStatus[status] || 0) + 1
    const value = status.toLowerCase()
    if (value === 'customer') customers += 1
    if (value === 'active' || value === 'customer') active += 1
    if (value === 'blocked') blocked += 1
  }
  return { total: list.length, customers, active, blocked, byStatus }
}

export function leadStats(records = []) {
  const list = Array.isArray(records) ? records : []
  const byStage = {}
  let open = 0
  let won = 0
  let lost = 0
  let pipelineValue = 0
  let wonValue = 0
  for (const record of list) {
    const stage = String(record.stage || 'New')
    byStage[stage] = (byStage[stage] || 0) + 1
    const value = Math.max(toNumber(record.value, 0), 0)
    const normalized = stage.toLowerCase()
    if (normalized === 'won') {
      won += 1
      wonValue += value
    } else if (normalized === 'lost') {
      lost += 1
    } else {
      open += 1
      pipelineValue += value
    }
  }
  return { total: list.length, open, won, lost, pipelineValue, wonValue, byStage }
}

export function followUpStats(records = [], now = new Date()) {
  const reference = resolveNow(now)
  const list = Array.isArray(records) ? records : []
  let pending = 0
  let completed = 0
  let cancelled = 0
  let overdue = 0
  let dueToday = 0
  let dueSoon = 0
  for (const record of list) {
    const status = String(record.status || 'Pending').toLowerCase()
    if (status === 'completed') completed += 1
    else if (status === 'cancelled' || status === 'canceled') cancelled += 1
    else pending += 1
    if (isFollowUpOverdue(record, reference)) overdue += 1
    if (isFollowUpDueToday(record, reference)) dueToday += 1
    if (isFollowUpDueSoon(record, reference)) dueSoon += 1
  }
  return { total: list.length, pending, completed, cancelled, overdue, dueToday, dueSoon }
}

export function templateStats(records = []) {
  const list = Array.isArray(records) ? records : []
  const byCategory = {}
  for (const record of list) {
    const category = String(record.category || 'Other')
    byCategory[category] = (byCategory[category] || 0) + 1
  }
  return { total: list.length, byCategory }
}
