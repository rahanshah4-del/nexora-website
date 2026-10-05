/**
 * Email automation: who should get which automatic email today. Pure functions
 * (no Firebase imports) so they are unit tested.
 *
 * Every rule looks at a short day window, never "all time", so switching an
 * automation on cannot blast the whole customer list at once, and a person gets
 * each automatic email at most once (see automationKey).
 */
import crypto from 'node:crypto'

const PKT_OFFSET_MS = 5 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const AUTOMATION_SEQUENCES = Object.freeze([
  { id: 'welcome', label: 'Welcome email', when: 'Within 2 days after sign-up', templateId: 'welcome' },
  { id: 'trial_7_days', label: 'Trial: 7 days left', when: '7 days before the trial ends', templateId: 'trial_7_days' },
  { id: 'trial_3_days', label: 'Trial: 3 days left', when: '3 days before the trial ends', templateId: 'trial_3_days' },
  { id: 'trial_1_day', label: 'Trial: last day', when: '1 day before the trial ends', templateId: 'trial_1_day' },
  { id: 'trial_ended', label: 'Trial ended', when: 'Up to 3 days after the trial ended, if not upgraded', templateId: 'trial_ended' },
  { id: 'lead_followup', label: 'Website lead follow-up', when: '1 to 4 days after a contact-form lead with an email', templateId: 'lead_nurture' },
])

export const AUTOMATION_IDS = AUTOMATION_SEQUENCES.map((sequence) => sequence.id)

// Never email these (the platform admin account).
const NEVER_EMAIL = new Set(['admin@nexora.com'])
const MAX_PER_SEQUENCE_PER_RUN = 40

const clean = (value) => (typeof value === 'string' ? value.trim() : '')
const lower = (value) => clean(value).toLowerCase()

/** Firestore Timestamp, Date, ISO string or millis -> Date (or null). */
export function toDate(value) {
  if (!value) return null
  if (typeof value.toDate === 'function') return toDate(value.toDate())
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === 'object' && Number.isFinite(Number(value.seconds ?? value._seconds))) return new Date(Number(value.seconds ?? value._seconds) * 1000)
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  return null
}

/** Calendar days (Pakistan time) from `from` to `to`; 0 means the same day. */
export function dayDiff(to, from) {
  return Math.floor((to.getTime() + PKT_OFFSET_MS) / DAY_MS) - Math.floor((from.getTime() + PKT_OFFSET_MS) / DAY_MS)
}

export function automationKey(sequenceId, email) {
  return `${sequenceId}__${crypto.createHash('sha1').update(lower(email)).digest('hex').slice(0, 24)}`
}

function validEmail(value) {
  const email = lower(value)
  return EMAIL_PATTERN.test(email) && !NEVER_EMAIL.has(email) ? email : ''
}

function firstName(...values) {
  for (const value of values) {
    const name = clean(value)
    if (name && !/workspace$/i.test(name) && !name.includes('@')) return name.split(/\s+/)[0]
  }
  return ''
}

const isPaying = (workspace) => {
  const status = lower(workspace.subscriptionStatus || workspace.planStatus)
  return ['active', 'paid', 'subscribed', 'past_due'].includes(status) && workspace.isTrialActive !== true
}

const isUnavailable = (workspace) => {
  const status = lower(workspace.status)
  return workspace.blocked === true || workspace.isBlocked === true || workspace.deleted === true || workspace.isDeleted === true
    || ['blocked', 'deleted', 'disabled'].includes(status)
}

function workspaceEmail(workspace) {
  return validEmail(workspace.ownerEmail) || validEmail(workspace.email) || validEmail(workspace.adminEmail)
}

/**
 * @param {string} sequenceId
 * @param {{workspaces?: object[], users?: object[], leads?: object[], unsubscribed?: Set<string>, now?: Date}} data
 * @returns {{email: string, name: string, accountId: string}[]} accountId = workspace id (the user's uid), or the lead id
 */
export function selectCandidates(sequenceId, { workspaces = [], users = [], leads = [], unsubscribed = new Set(), now = new Date() } = {}) {
  const names = new Map()
  users.forEach((user) => {
    const email = validEmail(user.email)
    if (email) names.set(email, firstName(user.fullName, user.displayName, user.name))
  })
  const out = new Map()
  const add = (email, name, accountId = '') => {
    if (!email || unsubscribed.has(email) || out.has(email)) return
    out.set(email, { email, name: names.get(email) || firstName(name), accountId: clean(String(accountId || '')) })
  }

  if (sequenceId === 'lead_followup') {
    leads.forEach((lead) => {
      const email = validEmail(lead.email)
      const created = toDate(lead.createdAt)
      if (!email || !created || lower(lead.status || 'new') !== 'new') return
      const age = dayDiff(now, created)
      if (age >= 1 && age <= 4) add(email, lead.name, lead.id)
    })
  } else {
    workspaces.forEach((workspace) => {
      if (!workspace || isUnavailable(workspace)) return
      const email = workspaceEmail(workspace)
      if (!email) return
      if (sequenceId === 'welcome') {
        const created = toDate(workspace.createdAt)
        if (!created) return
        const age = dayDiff(now, created)
        if (age >= 0 && age <= 2) add(email, workspace.ownerName, workspace.id)
        return
      }
      const trialEnd = toDate(workspace.trialEndsAt)
      if (!trialEnd || isPaying(workspace)) return
      const left = dayDiff(trialEnd, now) // days until the trial ends (negative = already ended)
      const match = (sequenceId === 'trial_7_days' && left === 7)
        || (sequenceId === 'trial_3_days' && left === 3)
        || (sequenceId === 'trial_1_day' && left === 1)
        || (sequenceId === 'trial_ended' && left >= -3 && left <= -1)
      if (match) add(email, workspace.ownerName, workspace.id)
    })
  }
  return Array.from(out.values()).slice(0, MAX_PER_SEQUENCE_PER_RUN)
}

/** marketingEmailMeta/automations -> { id: { enabled, enabledAt } } for every known sequence. */
export function normalizeAutomationConfig(raw = {}) {
  return Object.fromEntries(AUTOMATION_IDS.map((id) => [id, { enabled: raw?.[id]?.enabled === true, enabledAt: raw?.[id]?.enabledAt || null }]))
}
