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
import admin from 'firebase-admin'
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

const REGION = 'us-central1'
const FROM_EMAIL = process.env.FROM_EMAIL || 'support@nexorasolution.online'
const FROM_NAME = process.env.FROM_NAME || 'Nexora Solution'
const RESEND_ENDPOINT = 'https://api.resend.com/emails'
const SEND_GAP_MS = 600 // Resend allows 2 requests/second
const MAX_ATTEMPTS = 3

// Overridable only by tests (an in-memory Firestore); production uses the Admin SDK.
let firestoreOverride = null
let FieldValue = admin.firestore.FieldValue
export const testing = {
  useFirestore(fake, fieldValue) { firestoreOverride = fake; FieldValue = fieldValue },
}
const db = () => firestoreOverride || admin.firestore()
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
export async function enqueueCampaign(campaignId, recipients = []) {
  for (let index = 0; index < recipients.length; index += 400) {
    const batch = db().batch()
    recipients.slice(index, index + 400).forEach((recipient) => {
      batch.set(logs().doc(), {
        campaignId,
        email: lower(recipient.email),
        name: clean(recipient.name),
        status: 'queued',
        attempts: 0,
        createdAt: FieldValue.serverTimestamp(),
      })
    })
    // eslint-disable-next-line no-await-in-loop
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

  const snap = await logs().where('status', '==', 'queued').limit(take).get()
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
    // eslint-disable-next-line no-await-in-loop
    const campaign = await campaignFor(log.campaignId)
    touched.add(log.campaignId)
    if (!campaign || campaign.status === 'cancelled') {
      // eslint-disable-next-line no-await-in-loop
      await doc.ref.update({ status: 'cancelled' })
      continue
    }
    // eslint-disable-next-line no-await-in-loop
    if (await isOptedOut(log.email)) {
      // eslint-disable-next-line no-await-in-loop
      await doc.ref.update({ status: 'skipped', error: 'Unsubscribed' })
      skipped += 1
      continue
    }
    let result
    try {
      // eslint-disable-next-line no-await-in-loop
      result = await sendOne({ log, campaign })
    } catch (error) {
      result = { ok: false, status: 0, message: error?.message || 'Network error' }
    }

    if (result.ok) {
      // eslint-disable-next-line no-await-in-loop
      await doc.ref.update({ status: 'sent', providerId: result.id, sentAt: FieldValue.serverTimestamp(), attempts: (log.attempts || 0) + 1, error: FieldValue.delete() })
      // eslint-disable-next-line no-await-in-loop
      await recordSentToday(1, now)
      // eslint-disable-next-line no-await-in-loop
      await campaignsCol().doc(log.campaignId).update({ sentCount: FieldValue.increment(1), status: 'sending', lastSentAt: FieldValue.serverTimestamp() })
      sent += 1
    } else if (result.status === 429) {
      // Resend's own rate/daily limit: stop now, the rows stay queued for the next run.
      if (result.name === 'daily_quota_exceeded') {
        // eslint-disable-next-line no-await-in-loop
        await meta().doc(`sent-${pktDateKey(now)}`).set({ count: settings.dailyLimit, day: pktDateKey(now), providerLimitHit: true }, { merge: true })
      }
      logger.warn('Resend rate limit, stopping this run', { name: result.name, message: result.message })
      break
    } else if (result.status >= 400 && result.status < 500) {
      // eslint-disable-next-line no-await-in-loop
      await doc.ref.update({ status: 'failed', error: String(result.message).slice(0, 300), attempts: (log.attempts || 0) + 1 })
      // eslint-disable-next-line no-await-in-loop
      await campaignsCol().doc(log.campaignId).update({ failedCount: FieldValue.increment(1) })
      failed += 1
    } else {
      // Server / network problem: retry on a later run, give up after MAX_ATTEMPTS.
      const attempts = (log.attempts || 0) + 1
      if (attempts >= MAX_ATTEMPTS) {
        // eslint-disable-next-line no-await-in-loop
        await doc.ref.update({ status: 'failed', error: String(result.message || 'Send failed').slice(0, 300), attempts })
        // eslint-disable-next-line no-await-in-loop
        await campaignsCol().doc(log.campaignId).update({ failedCount: FieldValue.increment(1) })
        failed += 1
      } else {
        // eslint-disable-next-line no-await-in-loop
        await doc.ref.update({ attempts, error: String(result.message || 'Send failed').slice(0, 300) })
      }
      break
    }
    // eslint-disable-next-line no-await-in-loop
    await sleep(SEND_GAP_MS)
  }

  for (const campaignId of touched) {
    // eslint-disable-next-line no-await-in-loop
    const left = await logs().where('campaignId', '==', campaignId).where('status', '==', 'queued').limit(1).get()
    if (left.empty) {
      // eslint-disable-next-line no-await-in-loop
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
    // eslint-disable-next-line no-await-in-loop
    const snap = await logs().where('campaignId', '==', campaignId).where('status', '==', 'queued').limit(400).get()
    if (snap.empty) break
    const batch = db().batch()
    snap.docs.forEach((doc) => batch.update(doc.ref, { status: 'cancelled' }))
    // eslint-disable-next-line no-await-in-loop
    await batch.commit()
    cancelled += snap.size
  }
  return { ok: true, cancelled }
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
