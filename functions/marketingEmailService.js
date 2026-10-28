/**
 * Email Marketing service (Firebase Functions):
 *   - campaigns are QUEUED (one marketingEmailLogs doc per recipient)
 *   - processEmailQueue (every 10 min) sends at most the daily limit (default 50)
 *   - resendWebhook records delivered / opened / clicked / bounced / complained
 *   - marketingUnsubscribe is a real one-click opt-out (signed link)
 *
 * Pure rules live in marketingEmailLogic.js (unit tested). Server-only state is
 * kept in marketingEmailMeta (no client rule on purpose: only these functions
 * and the admin SDK can read or write it).
 */
import { FieldValue as AdminFieldValue, getFirestore } from 'firebase-admin/firestore'
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions'
import { ADMIN_UIDS } from './adminUids.js'
import {
  applyEmailEvent,
  batchForRun,
  estimatedDays,
  inSendWindow,
  isTrackedEvent,
  normalizeEmailSettings,
  pktDateKey,
  remainingQuota,
  unsubscribeUrl,
  verifySvixSignature,
  verifyUnsubscribeToken,
} from './marketingEmailLogic.js'
import { brandedEmail, brandedText } from './marketingEmailLayout.js'
import { TEMPLATE_SPECS } from './marketingTemplateSpecs.js'
import { AUTOMATION_SEQUENCES, automationKey, normalizeAutomationConfig, selectCandidates } from './marketingAutomationLogic.js'
import { isDisposableAddress } from './disposableDomains.js'
import { DAILY_PROMO_LIMIT, promoHistoryKey, selectDailyPromo } from './marketingDailyPromo.js'
import { AUDIENCE_SOURCES, mergeAudienceContacts } from './marketingAudience.js'

const REGION = 'us-central1'
const FROM_EMAIL = process.env.FROM_EMAIL || 'support@nexorasolution.us'
const FROM_NAME = process.env.FROM_NAME || 'Nexora Solution'
const RESEND_ENDPOINT = 'https://api.resend.com/emails'
const SEND_GAP_MS = 600 // Resend allows 2 requests/second
const MAX_ATTEMPTS = 3

// Overridable only by tests (an in-memory Firestore); production uses the Admin SDK.
let firestoreOverride = null
let FieldValue = AdminFieldValue
export const testing = {
  useFirestore(fake, fieldValue) { firestoreOverride = fake; FieldValue = fieldValue },
}
const db = () => firestoreOverride || getFirestore()
const meta = () => db().collection('marketingEmailMeta')
const logs = () => db().collection('marketingEmailLogs')
const campaignsCol = () => db().collection('marketingCampaigns')
const subscribersCol = () => db().collection('marketingSubscribers')

const clean = (value) => (typeof value === 'string' ? value.trim() : '')
const lower = (value) => clean(value).toLowerCase()
const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms) })
const isAdmin = (auth) => Boolean(auth?.uid && ADMIN_UIDS.includes(auth.uid))

function requireAdmin(request) {
  if (!isAdmin(request.auth)) throw new HttpsError('permission-denied', 'Only admin accounts can manage email marketing.')
}

function unsubscribeBase() {
  const project = process.env.GCLOUD_PROJECT || 'nexora-business-suite'
  return process.env.MARKETING_UNSUBSCRIBE_URL || `https://${REGION}-${project}.cloudfunctions.net/marketingUnsubscribe`
}

// The link is signed with this secret; falls back to the Resend key so no new setup is needed.
const unsubscribeSecret = () => process.env.UNSUBSCRIBE_SECRET || process.env.RESEND_API_KEY || ''

export async function getEmailSettings() {
  const snap = await meta().doc('settings').get()
  return normalizeEmailSettings(snap.exists ? snap.data() : {})
}

async function sentTodayCount(now = new Date()) {
  const snap = await meta().doc(`sent-${pktDateKey(now)}`).get()
  return Number(snap.data()?.count) || 0
}

/** Count a send (also used for test emails) against today's quota. */
export async function recordSentToday(count = 1, now = new Date()) {
  if (!count) return
  await meta().doc(`sent-${pktDateKey(now)}`).set({ count: FieldValue.increment(count), day: pktDateKey(now), updatedAt: FieldValue.serverTimestamp() }, { merge: true })
}

/** Create one queued log per recipient. The scheduler sends them within the daily limit. */
export async function enqueueCampaign(campaignId, recipients = [], { priority = 0 } = {}) {
  for (let index = 0; index < recipients.length; index += 400) {
    const batch = db().batch()
    recipients.slice(index, index + 400).forEach((recipient) => {
      batch.set(logs().doc(), {
        campaignId,
        email: lower(recipient.email),
        name: clean(recipient.name),
        ...(recipient.accountId ? { accountId: clean(String(recipient.accountId)) } : {}),
        ...(recipient.sequence ? { sequence: clean(recipient.sequence) } : {}),
        status: 'queued',
        attempts: 0,
        ...(priority ? { priority } : {}),
        createdAt: FieldValue.serverTimestamp(),
      })
    })
     
    await batch.commit()
  }
}

async function isOptedOut(email) {
  const snap = await subscribersCol().where('email', '==', email).limit(10).get()
  return snap.docs.some((doc) => lower(doc.data().status) === 'unsubscribed' || doc.data().marketingOptOut === true)
}

/** Permanent opt-out (link click, hard bounce, spam complaint). Works for any source of the address. */
export async function suppressEmail(email, reason) {
  const address = lower(email)
  if (!address) return
  const snap = await subscribersCol().where('email', '==', address).limit(10).get()
  const patch = { status: 'unsubscribed', unsubscribedAt: FieldValue.serverTimestamp(), unsubscribeReason: reason, updatedAt: FieldValue.serverTimestamp() }
  if (snap.empty) {
    await subscribersCol().add({ email: address, name: '', phone: '', source: 'unsubscribe', moduleInterest: 'crm', createdAt: FieldValue.serverTimestamp(), ...patch })
  } else {
    await Promise.all(snap.docs.map((doc) => doc.ref.set(patch, { merge: true })))
  }
  const queued = await logs().where('email', '==', address).where('status', '==', 'queued').limit(200).get()
  if (!queued.empty) {
    const batch = db().batch()
    queued.docs.forEach((doc) => batch.update(doc.ref, { status: 'skipped', error: 'Unsubscribed' }))
    await batch.commit()
  }
}

function personalise(value, { name, link }) {
  return String(value || '').replaceAll('{{name}}', name || 'there').replaceAll('{{unsubscribe}}', link)
}

async function sendOne({ log, campaign }) {
  const link = unsubscribeUrl(log.email, { base: unsubscribeBase(), secret: unsubscribeSecret() })
  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `nexora-mkt-${log.id}`,
    },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: log.email,
      subject: personalise(campaign.subject, { name: log.name, link }),
      html: personalise(campaign.bodyHtml, { name: log.name, link }),
      text: personalise(campaign.bodyText, { name: log.name, link }) || undefined,
      headers: { 'List-Unsubscribe': `<${link}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      // Webhook events carry these tags, which is how an event finds its log row.
      tags: [{ name: 'log', value: log.id }, { name: 'campaign', value: log.campaignId }],
    }),
  })
  const data = await response.json().catch(() => null)
  return { status: response.status, ok: response.ok, id: data?.id || '', name: data?.name || '', message: data?.message || data?.error || '' }
}

async function acquireLock(now = Date.now()) {
  const ref = meta().doc('queue-lock')
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const until = Number(snap.data()?.until) || 0
    if (until > now) return false
    tx.set(ref, { until: now + 4 * 60 * 1000 })
    return true
  })
}

/** One scheduler tick: send what today's quota and the sending window allow. */
export async function runEmailQueue({ now = new Date() } = {}) {
  if (!process.env.RESEND_API_KEY) return { skipped: 'RESEND_API_KEY missing' }
  const settings = await getEmailSettings()
  if (settings.paused) return { skipped: 'paused' }
  if (!inSendWindow(now, settings)) return { skipped: 'outside sending window' }
  const take = batchForRun(settings, await sentTodayCount(now))
  if (!take) return { skipped: 'daily limit reached' }
  if (!await acquireLock(now.getTime())) return { skipped: 'another run in progress' }

  // Automatic emails (welcome, trial reminders) go first; campaigns use what is left of the quota.
  const urgent = await logs().where('status', '==', 'queued').where('priority', '==', 1).limit(take).get()
  const docs = [...urgent.docs]
  if (docs.length < take) {
    const rest = await logs().where('status', '==', 'queued').limit(take).get()
    const have = new Set(docs.map((doc) => doc.id))
    for (const doc of rest.docs) {
      if (docs.length >= take) break
      if (!have.has(doc.id)) docs.push(doc)
    }
  }
  const snap = { docs }
  const campaigns = new Map()
  const touched = new Set()
  let sent = 0
  let failed = 0
  let skipped = 0

  const campaignFor = async (id) => {
    if (!campaigns.has(id)) {
      const doc = await campaignsCol().doc(id).get()
      campaigns.set(id, doc.exists ? doc.data() : null)
    }
    return campaigns.get(id)
  }

  for (const doc of snap.docs) {
    const log = { id: doc.id, ...doc.data() }
     
    const campaign = await campaignFor(log.campaignId)
    touched.add(log.campaignId)
    if (!campaign || campaign.status === 'cancelled') {
       
      await doc.ref.update({ status: 'cancelled' })
      continue
    }
     
    if (isDisposableAddress(log.email, { includeOwn: true })) {
      // temp-mail addresses never get marketing: it only hurts the sender reputation
      await doc.ref.update({ status: 'skipped', error: 'Disposable address' })
      skipped += 1
      continue
    }
    if (await isOptedOut(log.email)) {
       
      await doc.ref.update({ status: 'skipped', error: 'Unsubscribed' })
      skipped += 1
      continue
    }
    let result
    try {
       
      result = await sendOne({ log, campaign })
    } catch (error) {
      result = { ok: false, status: 0, message: error?.message || 'Network error' }
    }

    if (result.ok) {
       
      await doc.ref.update({ status: 'sent', providerId: result.id, sentAt: FieldValue.serverTimestamp(), attempts: (log.attempts || 0) + 1, error: FieldValue.delete() })
       
      await recordSentToday(1, now)
       
      await campaignsCol().doc(log.campaignId).update({ sentCount: FieldValue.increment(1), status: 'sending', lastSentAt: FieldValue.serverTimestamp() })
      sent += 1
    } else if (result.status === 429) {
      // Resend's own rate/daily limit: stop now, the rows stay queued for the next run.
      if (result.name === 'daily_quota_exceeded') {
         
        await meta().doc(`sent-${pktDateKey(now)}`).set({ count: settings.dailyLimit, day: pktDateKey(now), providerLimitHit: true }, { merge: true })
      }
      logger.warn('Resend rate limit, stopping this run', { name: result.name, message: result.message })
      break
    } else if (result.status >= 400 && result.status < 500) {
       
      await doc.ref.update({ status: 'failed', error: String(result.message).slice(0, 300), attempts: (log.attempts || 0) + 1 })
       
      await campaignsCol().doc(log.campaignId).update({ failedCount: FieldValue.increment(1) })
      failed += 1
    } else {
      // Server / network problem: retry on a later run, give up after MAX_ATTEMPTS.
      const attempts = (log.attempts || 0) + 1
      if (attempts >= MAX_ATTEMPTS) {
         
        await doc.ref.update({ status: 'failed', error: String(result.message || 'Send failed').slice(0, 300), attempts })
         
        await campaignsCol().doc(log.campaignId).update({ failedCount: FieldValue.increment(1) })
        failed += 1
      } else {
         
        await doc.ref.update({ attempts, error: String(result.message || 'Send failed').slice(0, 300) })
      }
      break
    }
     
    await sleep(SEND_GAP_MS)
  }

  for (const campaignId of touched) {
     
    const left = await logs().where('campaignId', '==', campaignId).where('status', '==', 'queued').limit(1).get()
    if (left.empty) {
       
      await campaignsCol().doc(campaignId).update({ status: 'completed', completedAt: FieldValue.serverTimestamp() }).catch(() => {})
    }
  }
  await meta().doc('queue-lock').set({ until: 0 })
  return { sent, failed, skipped }
}

export const processEmailQueue = onSchedule(
  { schedule: 'every 10 minutes', timeZone: 'Asia/Karachi', region: REGION, timeoutSeconds: 300, memory: '256MiB' },
  async () => {
    const result = await runEmailQueue()
    logger.info('Email queue run', result)
  },
)

// ---------------------------------------------------------------------------
// Automations: welcome, trial reminders, trial ended, lead follow-up.
// Each tick finds the people each ENABLED sequence applies to today and puts them
// into the same queue as campaigns (priority 1), so the daily limit, sending
// window, unsubscribe check, delivered/opened/clicked tracking and the report all
// work unchanged. An automation campaign doc ("automation-<id>") holds the stats.
// ---------------------------------------------------------------------------
const automationSends = () => db().collection('marketingAutomationSends')
const automationCampaignId = (id) => `automation-${id}`

function automationContent(sequence) {
  const spec = TEMPLATE_SPECS.find((item) => item.id === sequence.templateId)
  if (!spec) throw new Error(`Template ${sequence.templateId} is missing`)
  return { subject: spec.subject, bodyHtml: brandedEmail(spec), bodyText: brandedText(spec) }
}

async function claimAutomationSend(key, data) {
  const ref = automationSends().doc(key)
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (snap.exists) return false
    tx.set(ref, data)
    return true
  })
}

export async function getAutomationConfig() {
  const snap = await meta().doc('automations').get()
  return normalizeAutomationConfig(snap.exists ? snap.data() : {})
}

async function loadAutomationData() {
  const rows = (snap) => snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  const [workspaces, users, leads, subscribers, geolintLeads, geolintOrders] = await Promise.all([
    db().collection('workspaces').limit(3000).get().then(rows),
    db().collection('users').limit(5000).get().then(rows),
    db().collection('websiteLeads').limit(3000).get().then(rows),
    subscribersCol().limit(5000).get().then(rows),
    db().collection('geolintLeads').limit(5000).get().then(rows),
    db().collection('geolint_orders').limit(5000).get().then(rows),
  ])
  // anyone with a real (not cancelled, not unpaid) GeoLint order is a customer, not a lead
  const buyers = new Set(geolintOrders
    .filter((order) => !['awaiting_payment', 'cancelled'].includes(lower(order.status)))
    .map((order) => lower(order.email))
    .filter(Boolean))
  const unsubscribed = new Set(
    subscribers
      .filter((row) => lower(row.status) === 'unsubscribed' || row.marketingOptOut === true)
      .map((row) => lower(row.email))
      .filter(Boolean),
  )
  return { workspaces, users, leads, geolintLeads, buyers, unsubscribed }
}

/** Who each automation would email right now (switched on or not), without queueing anything. */
export async function previewMarketingAutomations({ now = new Date() } = {}) {
  const config = await getAutomationConfig()
  const data = await loadAutomationData()
  const sequences = []
  for (const sequence of AUTOMATION_SEQUENCES) {
    const due = []
    if (sequence.id === DAILY_PROMO_ID) {
      const picked = await previewDailyPromo({ now })
      sequences.push({ id: sequence.id, enabled: config[sequence.id].enabled, due: picked })
      continue
    }
    for (const candidate of selectCandidates(sequence.id, { ...data, now })) {
       
      const already = await automationSends().doc(automationKey(sequence.id, candidate.email)).get()
      if (!already.exists) due.push(candidate)
    }
    sequences.push({ id: sequence.id, enabled: config[sequence.id].enabled, due })
  }
  return { sequences }
}


// ---------------------------------------------------------------------------
// Daily module promotion (sequence "daily_promotion"): up to DAILY_PROMO_LIMIT
// people a day, 7-day cooldown per person, promotion matched to their module,
// template rotating on every send. History lives in marketingPromoHistory.
// ---------------------------------------------------------------------------
const promoHistoryCol = () => db().collection('marketingPromoHistory')
const DAILY_PROMO_ID = 'daily_promotion'

async function loadPromoData() {
  const rows = (snap) => snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  const sources = {}
  await Promise.all(AUDIENCE_SOURCES.map(async (source) => {
    sources[source.key] = await db().collection(source.collection).limit(5000).get().then(rows)
  }))
  const history = new Map()
  const snap = await promoHistoryCol().limit(10000).get()
  snap.docs.forEach((doc) => { const row = doc.data(); if (row.email) history.set(lower(row.email), row) })
  return { contacts: mergeAudienceContacts(sources), history }
}

export async function previewDailyPromo({ now = new Date() } = {}) {
  const { contacts, history } = await loadPromoData()
  return selectDailyPromo({ contacts, history, now })
}

export async function runDailyPromotion({ now = new Date() } = {}) {
  const settings = await getEmailSettings()
  if (settings.paused || !inSendWindow(now, settings)) return { skipped: 'outside the sending window' }
  const dayDoc = meta().doc(`promo-${pktDateKey(now)}`)
  const done = Number((await dayDoc.get()).data()?.count) || 0
  const queuedSnap = await logs().where('sequence', '==', DAILY_PROMO_ID).where('status', '==', 'queued').count().get()
  const room = Math.min(DAILY_PROMO_LIMIT - done, DAILY_PROMO_LIMIT - queuedSnap.data().count)
  if (room <= 0) return { queued: 0, reason: 'daily promotion limit reached' }

  const { contacts, history } = await loadPromoData()
  const picked = selectDailyPromo({ contacts, history, now, limit: room })
  const byTemplate = new Map()
  picked.forEach((person) => {
    if (!byTemplate.has(person.templateId)) byTemplate.set(person.templateId, [])
    byTemplate.get(person.templateId).push(person)
  })
  let queued = 0
  for (const [templateId, people] of byTemplate) {
    const spec = TEMPLATE_SPECS.find((item) => item.id === templateId)
    if (!spec) { logger.error('Promotion template missing', { templateId }); continue }
    const campaignId = `${automationCampaignId(DAILY_PROMO_ID)}--${templateId}`
    const existing = await campaignsCol().doc(campaignId).get()
    await campaignsCol().doc(campaignId).set({
      ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp(), sentCount: 0, failedCount: 0 }),
      kind: 'automation',
      automationId: DAILY_PROMO_ID,
      title: `Daily promotion: ${spec.name}`,
      subject: spec.subject,
      bodyHtml: brandedEmail(spec),
      bodyText: brandedText(spec),
      audienceType: 'automation',
      status: 'sending',
      totalRecipients: FieldValue.increment(people.length),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })
    await enqueueCampaign(campaignId, people.map((person) => ({ ...person, sequence: DAILY_PROMO_ID })), { priority: 0 })
    for (const person of people) {
      const past = history.get(person.email) || {}
      await promoHistoryCol().doc(promoHistoryKey(person.email)).set({
        email: person.email, module: person.module, lastTemplate: templateId,
        count: (Number(past.count) || 0) + 1, lastSentAt: FieldValue.serverTimestamp(),
      }, { merge: true })
    }
    queued += people.length
  }
  if (queued) await dayDoc.set({ count: FieldValue.increment(queued), day: pktDateKey(now), updatedAt: FieldValue.serverTimestamp() }, { merge: true })
  return { queued, modules: Array.from(new Set(picked.map((person) => person.module))) }
}

export async function runMarketingAutomations({ now = new Date() } = {}) {
  const config = await getAutomationConfig()
  const active = AUTOMATION_SEQUENCES.filter((sequence) => config[sequence.id].enabled)
  if (!active.length) return { skipped: 'no automation is switched on' }

  const { workspaces, users, leads, geolintLeads, buyers, unsubscribed } = await loadAutomationData()

  const queued = {}
  const people = []
  for (const sequence of active) {
    queued[sequence.id] = 0
    if (sequence.id === DAILY_PROMO_ID) {
      const promo = await runDailyPromotion({ now }).catch((error) => { logger.error('Daily promotion failed', { message: error?.message }); return {} })
      queued[sequence.id] = promo.queued || 0
      continue
    }
    const candidates = selectCandidates(sequence.id, { workspaces, users, leads, geolintLeads, buyers, unsubscribed, now })
    for (const candidate of candidates) {
      const key = automationKey(sequence.id, candidate.email)
       
      const claimed = await claimAutomationSend(key, { sequence: sequence.id, email: candidate.email, claimedAt: FieldValue.serverTimestamp() })
      if (!claimed) continue
      try {
        const content = automationContent(sequence)
        const campaignId = automationCampaignId(sequence.id)
         
        const existing = await campaignsCol().doc(campaignId).get()
         
        await campaignsCol().doc(campaignId).set({
          ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp(), sentCount: 0, failedCount: 0 }),
          kind: 'automation',
          automationId: sequence.id,
          title: `Automation: ${sequence.label}`,
          ...content,
          audienceType: 'automation',
          status: 'sending',
          totalRecipients: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true })
         
        await enqueueCampaign(campaignId, [{ ...candidate, sequence: sequence.id }], { priority: 1 })
        queued[sequence.id] += 1
        people.push({ sequence: sequence.id, email: candidate.email, accountId: candidate.accountId })
      } catch (error) {
        logger.error('Automation enqueue failed', { sequence: sequence.id, message: error?.message })
         
        await automationSends().doc(key).delete().catch(() => {}) // let the next tick retry this person
      }
    }
  }
  return { queued, people }
}

export const runMarketingAutomationsScheduled = onSchedule(
  { schedule: 'every 60 minutes', timeZone: 'Asia/Karachi', region: REGION, timeoutSeconds: 300, memory: '256MiB' },
  async () => {
    const result = await runMarketingAutomations()
    logger.info('Marketing automations run', result)
  },
)

// ---------------------------------------------------------------------------
// Admin callables
// ---------------------------------------------------------------------------
export const getMarketingEmailStatus = onCall({ region: REGION, memory: '256MiB' }, async (request) => {
  requireAdmin(request)
  const now = new Date()
  const settings = await getEmailSettings()
  const sentToday = await sentTodayCount(now)
  const queuedSnap = await logs().where('status', '==', 'queued').count().get()
  const queued = queuedSnap.data().count
  return {
    settings,
    dayKey: pktDateKey(now),
    sentToday,
    remainingToday: remainingQuota(settings, sentToday),
    queued,
    estimatedDays: estimatedDays(queued, settings),
    windowOpenNow: inSendWindow(now, settings),
    resendConfigured: Boolean(process.env.RESEND_API_KEY),
    webhookConfigured: Boolean(process.env.RESEND_WEBHOOK_SECRET),
  }
})

export const setMarketingEmailSettings = onCall({ region: REGION, memory: '256MiB' }, async (request) => {
  requireAdmin(request)
  const settings = normalizeEmailSettings(request.data || {})
  await meta().doc('settings').set({ ...settings, updatedAt: FieldValue.serverTimestamp(), updatedBy: request.auth.uid })
  return { ok: true, settings }
})

export const cancelMarketingCampaign = onCall({ region: REGION, memory: '256MiB' }, async (request) => {
  requireAdmin(request)
  const campaignId = clean(request.data?.campaignId)
  if (!campaignId) throw new HttpsError('invalid-argument', 'campaignId is required.')
  await campaignsCol().doc(campaignId).set({ status: 'cancelled', cancelledAt: FieldValue.serverTimestamp() }, { merge: true })
  let cancelled = 0
  for (;;) {
     
    const snap = await logs().where('campaignId', '==', campaignId).where('status', '==', 'queued').limit(400).get()
    if (snap.empty) break
    const batch = db().batch()
    snap.docs.forEach((doc) => batch.update(doc.ref, { status: 'cancelled' }))
     
    await batch.commit()
    cancelled += snap.size
  }
  return { ok: true, cancelled }
})

export const getMarketingAutomations = onCall({ region: REGION, memory: '256MiB' }, async (request) => {
  requireAdmin(request)
  const config = await getAutomationConfig()
  const sequences = []
  for (const sequence of AUTOMATION_SEQUENCES) {
     
    let stats = {}
    if (sequence.id === DAILY_PROMO_ID) {
      const family = await campaignsCol().where('automationId', '==', DAILY_PROMO_ID).get()
      family.docs.forEach((doc) => {
        const row = doc.data()
        ;['totalRecipients', 'sentCount', 'deliveredCount', 'openedCount', 'clickedCount', 'bouncedCount'].forEach((key) => { stats[key] = (Number(stats[key]) || 0) + (Number(row[key]) || 0) })
      })
    } else {
      const campaign = await campaignsCol().doc(automationCampaignId(sequence.id)).get()
      stats = campaign.exists ? campaign.data() : {}
    }
    const enabledAt = config[sequence.id].enabledAt
    sequences.push({
      id: sequence.id,
      label: sequence.label,
      when: sequence.when,
      templateId: sequence.templateId,
      enabled: config[sequence.id].enabled,
      enabledAt: enabledAt?.toDate ? enabledAt.toDate().toISOString() : enabledAt || null,
      total: Number(stats.totalRecipients) || 0,
      sent: Number(stats.sentCount) || 0,
      delivered: Number(stats.deliveredCount) || 0,
      opened: Number(stats.openedCount) || 0,
      clicked: Number(stats.clickedCount) || 0,
      bounced: Number(stats.bouncedCount) || 0,
    })
  }
  return { sequences, resendConfigured: Boolean(process.env.RESEND_API_KEY) }
})

export const setMarketingAutomation = onCall({ region: REGION, memory: '256MiB' }, async (request) => {
  requireAdmin(request)
  const id = clean(request.data?.id)
  if (!AUTOMATION_SEQUENCES.some((sequence) => sequence.id === id)) throw new HttpsError('invalid-argument', 'Unknown automation.')
  const enabled = request.data?.enabled === true
  const current = (await getAutomationConfig())[id]
  await meta().doc('automations').set({
    [id]: { enabled, enabledAt: enabled && !current.enabled ? FieldValue.serverTimestamp() : current.enabledAt || null },
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: request.auth.uid,
  }, { merge: true })
  return { ok: true, id, enabled }
})

export const previewMarketingAutomationsCallable = onCall({ region: REGION, memory: '256MiB', timeoutSeconds: 60 }, async (request) => {
  requireAdmin(request)
  return { ok: true, ...(await previewMarketingAutomations()) }
})

export const runMarketingAutomationsNow = onCall({ region: REGION, memory: '256MiB', timeoutSeconds: 120 }, async (request) => {
  requireAdmin(request)
  return { ok: true, ...(await runMarketingAutomations()) }
})

// ---------------------------------------------------------------------------
// Resend webhook
// ---------------------------------------------------------------------------
function tagValue(tags, name) {
  if (!tags) return ''
  if (Array.isArray(tags)) return clean(tags.find((tag) => tag?.name === name)?.value)
  return clean(tags[name])
}

export async function handleResendEvent(event, eventId) {
  if (!isTrackedEvent(event?.type)) return { ignored: true }
  const data = event.data || {}
  let logRef = null
  const logId = tagValue(data.tags, 'log')
  if (logId) logRef = logs().doc(logId)
  if (!logRef && data.email_id) {
    const found = await logs().where('providerId', '==', String(data.email_id)).limit(1).get()
    if (!found.empty) logRef = found.docs[0].ref
  }
  if (!logRef) return { ignored: true } // a transactional email (OTP, invoice…), not a campaign

  const outcome = await db().runTransaction(async (tx) => {
    const snap = await tx.get(logRef)
    if (!snap.exists) return null
    const log = snap.data()
    const change = applyEmailEvent(log, event, { eventId })
    if (!change) return null
    tx.update(logRef, change.patch)
    const inc = Object.fromEntries(Object.entries(change.campaignInc).map(([key, value]) => [key, FieldValue.increment(value)]))
    if (Object.keys(inc).length && log.campaignId) tx.update(campaignsCol().doc(log.campaignId), inc)
    return { email: log.email, optOut: change.optOut, reason: event.type }
  })
  if (outcome?.optOut && outcome.email) await suppressEmail(outcome.email, outcome.reason)
  return { ok: true }
}

export const resendWebhook = onRequest({ region: REGION, memory: '256MiB', cors: false }, async (req, res) => {
  if (req.method !== 'POST') { res.status(405).send('POST only'); return }
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) { res.status(500).send('RESEND_WEBHOOK_SECRET missing'); return } // fail closed
  const rawBody = req.rawBody ? req.rawBody.toString('utf8') : ''
  const check = verifySvixSignature({
    secret,
    id: req.get('svix-id'),
    timestamp: req.get('svix-timestamp'),
    signature: req.get('svix-signature'),
    rawBody,
  })
  if (!check.ok) { logger.warn('Resend webhook rejected', { reason: check.reason }); res.status(401).send('Invalid signature'); return }
  try {
    await handleResendEvent(JSON.parse(rawBody), req.get('svix-id'))
    res.status(200).send('ok')
  } catch (error) {
    logger.error('Resend webhook failed', { message: error?.message })
    res.status(500).send('retry') // Resend retries on non-2xx
  }
})

// ---------------------------------------------------------------------------
// One-click unsubscribe. GET only shows a confirm button (mail scanners that
// prefetch links must not unsubscribe people); POST does it, which is also what
// the List-Unsubscribe-Post header of mail clients sends.
// ---------------------------------------------------------------------------
const esc = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

function page(title, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title></head><body style="font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:40px 16px;color:#0f172a"><div style="max-width:440px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:28px"><h1 style="font-size:20px;margin:0 0 12px">${esc(title)}</h1>${body}<p style="font-size:12px;color:#94a3b8;margin-top:24px">Nexora Solution</p></div></body></html>`
}

export const marketingUnsubscribe = onRequest({ region: REGION, memory: '256MiB', cors: false }, async (req, res) => {
  res.set('Cache-Control', 'no-store')
  const email = lower(String(req.query.e || ''))
  const token = String(req.query.t || '')
  if (!verifyUnsubscribeToken(email, token, unsubscribeSecret())) {
    res.status(400).send(page('Invalid link', '<p>This unsubscribe link is not valid. Please reply to the email with "unsubscribe" and we will remove you.</p>'))
    return
  }
  if (req.method === 'POST') {
    try {
      await suppressEmail(email, 'unsubscribe_link')
      res.status(200).send(page('You are unsubscribed', `<p>${esc(email)} will no longer receive marketing emails from Nexora. Account and billing emails may still be sent.</p>`))
    } catch (error) {
      logger.error('Unsubscribe failed', { message: error?.message })
      res.status(500).send(page('Something went wrong', '<p>Please try again in a minute, or reply to the email with "unsubscribe".</p>'))
    }
    return
  }
  res.status(200).send(page('Unsubscribe', `<p>Stop marketing emails to <strong>${esc(email)}</strong>?</p><form method="POST"><button type="submit" style="background:#0f172a;color:#fff;border:0;border-radius:10px;padding:12px 18px;font-weight:700;cursor:pointer">Yes, unsubscribe me</button></form>`))
})
