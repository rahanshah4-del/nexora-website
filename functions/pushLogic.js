/**
 * Web push notifications: who gets which push, when. Pure functions (no Firebase
 * imports) so they are unit tested.
 *
 * Audience rule (same spirit as the email audience): only Nexora's own signed-in
 * clients who pressed "Turn on alerts" themselves (a registered device token).
 * Client customer / lead data is never used. A push is never sent outside
 * 10:00-20:00 Pakistan time, and each device gets at most one automatic push
 * per day.
 */
import crypto from 'node:crypto'
import { moduleFromValue } from './marketingModules.js'
import { dayDiff, selectCandidates, toDate } from './marketingAutomationLogic.js'

export const PUSH_SITE_ORIGIN = 'https://nexorasolution.us'
export const PUSH_WINDOW_START_HOUR = 10 // Pakistan time, inclusive
export const PUSH_WINDOW_END_HOUR = 20 // exclusive
export const AUTOMATION_GAP_MS = 20 * 60 * 60 * 1000
export const CAMPAIGN_GAP_MS = 6 * 60 * 60 * 1000
export const MAX_DEVICES_PER_USER = 5
export const TITLE_MAX = 65
export const BODY_MAX = 180

const PKT_OFFSET_MS = 5 * 60 * 60 * 1000
const clean = (value) => (typeof value === 'string' ? value.trim() : '')
const lower = (value) => clean(value).toLowerCase()

const MODULE_FIELDS = ['moduleInterest', 'businessType', 'selectedBusinessType', 'primaryBusinessType', 'currentBusinessType', 'module', 'product', 'planName']

/** Automatic pushes. Trial/welcome reuse the email automation windows so both channels agree. */
export const PUSH_SEQUENCES = Object.freeze([
  { id: 'welcome', label: 'Welcome', when: 'Within 2 days after sign-up', kind: 'once' },
  { id: 'trial_7_days', label: 'Trial: 7 days left', when: '7 days before the trial ends', kind: 'once' },
  { id: 'trial_3_days', label: 'Trial: 3 days left', when: '3 days before the trial ends', kind: 'once' },
  { id: 'trial_1_day', label: 'Trial: last day', when: '1 day before the trial ends', kind: 'once' },
  { id: 'trial_ended', label: 'Trial ended', when: 'Up to 3 days after the trial ended, if not upgraded', kind: 'once' },
  { id: 'module_tip', label: 'Weekly module tip', when: 'Once a week per client, a tip for the module they use', kind: 'weekly' },
])
export const PUSH_SEQUENCE_IDS = PUSH_SEQUENCES.map((sequence) => sequence.id)

const FEATURE_COPY = Object.freeze({
  welcome: { title: 'Welcome to Nexora', body: 'Your workspace is ready. Add your first record in two minutes.', url: '/app/dashboard' },
  trial_7_days: { title: 'Your Nexora trial: 7 days left', body: 'Finish setting up now so your data and settings carry over when you subscribe.', url: '/app/subscriptions' },
  trial_3_days: { title: 'Your Nexora trial ends in 3 days', body: 'Pick a plan to keep your workspace running without a break.', url: '/app/subscriptions' },
  trial_1_day: { title: 'Last day of your Nexora trial', body: 'Your workspace locks tomorrow. Choose a plan today to keep access.', url: '/app/subscriptions' },
  trial_ended: { title: 'Your Nexora trial has ended', body: 'Your data is safe. Choose a plan to unlock your workspace again.', url: '/app/subscriptions' },
})

/** Two tips per module; the second one is used the following week. */
const MODULE_TIPS = Object.freeze({
  crm: [
    { title: 'Follow up on your hot leads', body: 'Open Leads and sort by score. The top ones are worth a call today.', url: '/app/dashboard' },
    { title: 'Turn a lead into a deal', body: 'Move interested leads into Deals so nothing stalls in your pipeline.', url: '/app/dashboard' },
  ],
  retail: [
    { title: 'Check low stock before the rush', body: 'Open Inventory and filter low stock so best sellers never run out.', url: '/app/dashboard' },
    { title: 'See what sold best this week', body: 'Your sales report shows top products. Reorder those first.', url: '/app/dashboard' },
  ],
  school: [
    { title: 'Fees due this month', body: 'Open Fees to see which students are pending and send reminders in one go.', url: '/app/dashboard' },
    { title: 'Mark attendance in seconds', body: 'Daily attendance feeds your reports. Take it from the dashboard.', url: '/app/dashboard' },
  ],
  property: [
    { title: 'Rent due soon', body: 'Check upcoming rent and overdue tenants from your property dashboard.', url: '/app/dashboard' },
    { title: 'Track every maintenance request', body: 'Log repairs against each unit so nothing is forgotten.', url: '/app/dashboard' },
  ],
  restaurant: [
    { title: 'Review yesterday\'s sales', body: 'Open your reports to see top dishes and peak hours, then plan today\'s prep.', url: '/app/dashboard' },
    { title: 'Keep kitchen stock accurate', body: 'Update ingredient stock so you never run out mid-service.', url: '/app/dashboard' },
  ],
  transport: [
    { title: 'Vehicles due for service', body: 'Check maintenance reminders so no vehicle goes off the road unexpectedly.', url: '/app/dashboard' },
    { title: 'Review this week\'s trips', body: 'Your trip report shows income and expenses per vehicle.', url: '/app/dashboard' },
  ],
  whatsapp: [
    { title: 'Reply to waiting chats', body: 'Open WhatsApp CRM and clear the conversations that have no reply yet.', url: '/app/dashboard' },
    { title: 'Schedule a follow-up', body: 'Set follow-ups on warm contacts so they are not forgotten.', url: '/app/dashboard' },
  ],
  pharmacy: [
    { title: 'Check expiring medicines', body: 'Open Inventory and review items close to expiry before they are wasted.', url: '/app/dashboard' },
    { title: 'Low stock medicines', body: 'See which medicines need reordering this week.', url: '/app/dashboard' },
  ],
})

export function moduleOfWorkspace(workspace = {}) {
  for (const field of MODULE_FIELDS) {
    const found = moduleFromValue(clean(workspace[field]))
    if (found) return found
  }
  return 'crm'
}

export function isPayingWorkspace(workspace = {}) {
  const status = lower(workspace.subscriptionStatus || workspace.planStatus)
  return ['active', 'paid', 'subscribed', 'past_due'].includes(status) && workspace.isTrialActive !== true
}

export function isUnavailableWorkspace(workspace = {}) {
  const status = lower(workspace.status)
  return workspace.blocked === true || workspace.isBlocked === true || workspace.deleted === true || workspace.isDeleted === true
    || ['blocked', 'deleted', 'disabled'].includes(status)
}

/** Pakistan-time hour (0-23) for a Date. */
export function pktHour(now = new Date()) {
  return new Date(now.getTime() + PKT_OFFSET_MS).getUTCHours()
}

export function inPushWindow(now = new Date()) {
  const hour = pktHour(now)
  return hour >= PUSH_WINDOW_START_HOUR && hour < PUSH_WINDOW_END_HOUR
}

/** ISO-like week bucket in Pakistan time, e.g. 2026-W44 (Monday start). */
export function pktWeekKey(now = new Date()) {
  const date = new Date(now.getTime() + PKT_OFFSET_MS)
  const day = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - day + 3)
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4))
  const week = 1 + Math.round(((date - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7)
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export function tokenDocId(token) {
  return crypto.createHash('sha1').update(clean(token)).digest('hex')
}

export function isValidToken(token) {
  const value = clean(token)
  return value.length >= 100 && value.length <= 4096 && !/\s/.test(value)
}

/** Only Nexora pages (relative path or the Nexora origin). Anything else becomes the dashboard. */
export function safePushUrl(url, fallback = '/app/dashboard') {
  const value = clean(url)
  if (!value) return fallback
  if (value.startsWith('/') && !value.startsWith('//')) return value
  try {
    const parsed = new URL(value)
    if (parsed.origin === PUSH_SITE_ORIGIN) return `${parsed.pathname}${parsed.search}${parsed.hash}` || fallback
  } catch { /* fall through */ }
  return fallback
}

export function buildPushData({ title, body, url, tag } = {}) {
  return {
    title: clean(title).slice(0, TITLE_MAX),
    body: clean(body).slice(0, BODY_MAX),
    url: safePushUrl(url),
    tag: clean(tag).slice(0, 60) || 'nexora',
  }
}

/** FCM message for one device token (data-only: the service worker shows it). */
export function buildMessage(token, payload) {
  return {
    token,
    data: buildPushData(payload),
    webpush: { headers: { TTL: '86400', Urgency: 'normal' } },
  }
}

export function isDeadTokenError(code = '') {
  return ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token', 'messaging/invalid-argument'].includes(code)
}

export function copyFor(sequenceId, workspace = {}, sentCount = 0) {
  if (sequenceId === 'module_tip') {
    const tips = MODULE_TIPS[moduleOfWorkspace(workspace)] || MODULE_TIPS.crm
    return tips[Math.max(0, Number(sentCount) || 0) % tips.length]
  }
  return FEATURE_COPY[sequenceId] || null
}

/** Dedupe key: once per client for lifecycle pushes, once per week for tips. */
export function pushSendKey(sequenceId, uid, now = new Date()) {
  const sequence = PUSH_SEQUENCES.find((item) => item.id === sequenceId)
  const period = sequence?.kind === 'weekly' ? pktWeekKey(now) : 'once'
  return `${sequenceId}__${period}__${crypto.createHash('sha1').update(clean(uid)).digest('hex').slice(0, 24)}`
}

/** Device tokens that may receive a push now (enabled, not inside the gap). */
export function usableTokens(tokens = [], { now = new Date(), gapMs = AUTOMATION_GAP_MS } = {}) {
  return tokens.filter((token) => {
    if (!token || token.enabled === false || !isValidToken(token.token)) return false
    const last = toDate(token.lastPushAt)
    return !last || now.getTime() - last.getTime() >= gapMs
  })
}

/**
 * Which clients get which automatic push right now.
 * @param {string} sequenceId
 * @param {{workspaces: object[], users?: object[], tokens: object[], now?: Date}} data tokens carry {uid, token, lastPushAt, enabled}
 * @returns {{uid: string, workspaceId: string, copy: object, tokens: object[]}[]}
 */
export function selectPushTargets(sequenceId, { workspaces = [], users = [], tokens = [], now = new Date() } = {}) {
  if (!inPushWindow(now)) return []
  const tokensByUid = new Map()
  tokens.forEach((token) => {
    const uid = clean(token?.uid)
    if (!uid) return
    if (!tokensByUid.has(uid)) tokensByUid.set(uid, [])
    tokensByUid.get(uid).push(token)
  })
  const byId = new Map(workspaces.map((workspace) => [clean(String(workspace.id || '')), workspace]))
  let accountIds
  if (sequenceId === 'module_tip') {
    accountIds = workspaces
      .filter((workspace) => !isUnavailableWorkspace(workspace))
      .filter((workspace) => {
        const created = toDate(workspace.createdAt)
        return !created || dayDiff(now, created) >= 3 // let the welcome / first days breathe
      })
      .map((workspace) => clean(String(workspace.id || '')))
  } else {
    accountIds = selectCandidates(sequenceId, { workspaces, users, now }).map((candidate) => candidate.accountId)
  }
  const targets = []
  accountIds.forEach((accountId) => {
    if (!accountId || !tokensByUid.has(accountId)) return
    const workspace = byId.get(accountId) || {}
    if (sequenceId === 'module_tip' && !isPayingWorkspace(workspace) && toDate(workspace.trialEndsAt) && toDate(workspace.trialEndsAt) < now) return // expired clients get trial_ended, not tips
    const devices = usableTokens(tokensByUid.get(accountId), { now }).slice(0, MAX_DEVICES_PER_USER)
    if (!devices.length) return
    const copy = copyFor(sequenceId, workspace, Number(workspace.pushTipCount) || 0)
    if (copy) targets.push({ uid: accountId, workspaceId: accountId, copy, tokens: devices })
  })
  return targets
}

export const SEGMENTS = Object.freeze(['all', 'trial', 'paid', 'expired'])

/** Admin campaign segment test: all | trial | paid | expired | module:<key>. */
export function matchesSegment(workspace = {}, segment = 'all', now = new Date()) {
  if (!workspace || isUnavailableWorkspace(workspace)) return false
  const seg = clean(segment) || 'all'
  if (seg === 'all') return true
  if (seg.startsWith('module:')) return moduleOfWorkspace(workspace) === seg.slice(7)
  const paying = isPayingWorkspace(workspace)
  const trialEnd = toDate(workspace.trialEndsAt)
  if (seg === 'paid') return paying
  if (seg === 'trial') return !paying && Boolean(trialEnd) && trialEnd >= now
  if (seg === 'expired') return !paying && Boolean(trialEnd) && trialEnd < now
  return false
}

export function isValidSegment(segment, moduleKeys = []) {
  const seg = clean(segment)
  return SEGMENTS.includes(seg) || (seg.startsWith('module:') && moduleKeys.includes(seg.slice(7)))
}

/** Validates an admin-written campaign. Returns {ok, error?, value?}. */
export function normalizeCampaign(input = {}, moduleKeys = []) {
  const title = clean(input.title)
  const body = clean(input.body)
  if (!title) return { ok: false, error: 'Add a title.' }
  if (title.length > TITLE_MAX) return { ok: false, error: `Title must be ${TITLE_MAX} characters or fewer.` }
  if (!body) return { ok: false, error: 'Add a message.' }
  if (body.length > BODY_MAX) return { ok: false, error: `Message must be ${BODY_MAX} characters or fewer.` }
  const segment = clean(input.segment) || 'all'
  if (!isValidSegment(segment, moduleKeys)) return { ok: false, error: 'Unknown audience.' }
  return { ok: true, value: { title, body, segment, url: safePushUrl(input.url), test: input.test === true } }
}

// ---------------------------------------------------------------------------
// Payment alerts (driven by the Firestore writes the Polar webhook already makes)
// ---------------------------------------------------------------------------
const planStatusOf = (workspace) => lower(workspace?.planStatus || workspace?.subscriptionStatus)

function workspaceLabel(workspace = {}) {
  return clean(workspace.name || workspace.workspaceName || workspace.company || workspace.ownerEmail || workspace.email) || 'A client'
}

/**
 * A workspace changed: did billing just break or end? Returns null or
 * { admin: {title, body, url}, client?: {title, body, url}, ownerUid } .
 * Only the moment of change counts, so a retried webhook never alerts twice.
 */
export function workspacePaymentAlert(before, after, workspaceId = '') {
  if (!after) return null
  const was = planStatusOf(before)
  const now = planStatusOf(after)
  if (was === now) return null
  const label = workspaceLabel(after)
  const ownerUid = clean(after.ownerId) || clean(String(workspaceId || ''))
  if (now === 'past_due') {
    return {
      ownerUid,
      admin: { title: 'Payment failed', body: `${label}: the renewal payment could not be collected.`, url: '/admin/control-centre', tag: 'payment-failed' },
      client: { title: 'Your Nexora payment did not go through', body: 'Update your card to keep your workspace running without a break.', url: '/app/subscriptions', tag: 'payment-failed' },
    }
  }
  if (['canceled', 'cancelled'].includes(now) && !['canceled', 'cancelled', 'expired'].includes(was)) {
    return { ownerUid, admin: { title: 'Subscription cancelled', body: `${label} cancelled their plan.`, url: '/admin/control-centre', tag: 'subscription-cancelled' } }
  }
  return null
}

/** A platformPayments record became paid (and is not a zero-amount trial order). Returns an admin alert or null. */
export function paidPaymentAlert(before, after) {
  if (!after || lower(after.status) !== 'paid' || lower(before?.status) === 'paid') return null
  const amount = Number(after.amount)
  if (!Number.isFinite(amount) || amount <= 0) return null
  const money = `${clean(after.currency) || 'USD'} ${amount.toFixed(2)}`
  const plan = clean(after.plan)
  return {
    title: `Payment received: ${money}`,
    body: `${clean(after.clientEmail) || 'A client'}${plan ? ` paid for the ${plan} plan` : ' paid'}.`,
    url: '/admin/control-centre',
    tag: 'payment-paid',
  }
}
