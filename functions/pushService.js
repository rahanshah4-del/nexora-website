/**
 * Web push service (Firebase Functions).
 *   - registerPushToken / unregisterPushToken: a signed-in client turns alerts on or off for one device
 *   - runPushAutomationsScheduled: hourly, sends the switched-on automatic pushes (trial reminders, weekly tips)
 *   - sendPushCampaign: admin writes a push and picks an audience (or sends a test to their own devices)
 *   - pushNewLead / pushNewTicket: instant alert to the admin's devices
 *
 * Pure rules live in pushLogic.js (unit tested). Token and automation state is
 * server-only: no client rule on purpose, only these functions and the Admin SDK touch it.
 */
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions'
import { ADMIN_UIDS } from './adminUids.js'
import { MARKETING_MODULE_KEYS } from './marketingModules.js'
import {
  CAMPAIGN_GAP_MS,
  MAX_DEVICES_PER_USER,
  PUSH_SEQUENCES,
  PUSH_SEQUENCE_IDS,
  buildMessage,
  inPushWindow,
  isDeadTokenError,
  isValidToken,
  matchesSegment,
  normalizeCampaign,
  pushSendKey,
  selectPushTargets,
  tokenDocId,
  usableTokens,
} from './pushLogic.js'

const REGION = 'us-central1'
const db = () => getFirestore()
const tokensCol = () => db().collection('pushTokens')
const sendsCol = () => db().collection('pushAutomationSends')
const logsCol = () => db().collection('pushLogs')
const metaDoc = (name) => db().collection('pushMeta').doc(name)
const clean = (value) => (typeof value === 'string' ? value.trim() : '')
const isAdmin = (auth) => Boolean(auth?.uid && ADMIN_UIDS.includes(auth.uid))
const rows = (snap) => snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

function requireAdmin(request) {
  if (!isAdmin(request.auth)) throw new HttpsError('permission-denied', 'Only admin accounts can manage push notifications.')
}

function requireUser(request) {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in first.')
}

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------
/**
 * Send one payload to many device-token docs. Dead tokens are deleted, live ones
 * get lastPushAt. `tokenRows` are {id, token, ...} (id = pushTokens doc id).
 */
export async function sendToTokens(tokenRows, payload, { now = new Date() } = {}) {
  const result = { sent: 0, failed: 0, removed: 0, errors: [] }
  const messaging = getMessaging()
  for (let start = 0; start < tokenRows.length; start += 500) {
    const chunk = tokenRows.slice(start, start + 500)
    let response
    try {
      response = await messaging.sendEach(chunk.map((row) => buildMessage(row.token, payload)))
    } catch (error) {
      logger.error('Push sendEach failed', { message: error?.message })
      result.failed += chunk.length
      result.errors.push(error?.code || error?.message || 'send failed')
      continue
    }
    const writes = []
    response.responses.forEach((item, index) => {
      const row = chunk[index]
      if (item.success) {
        result.sent += 1
        row.lastPushAt = now
        writes.push(tokensCol().doc(row.id).set({ lastPushAt: now, pushCount: FieldValue.increment(1) }, { merge: true }).catch(() => {}))
      } else {
        result.failed += 1
        if (isDeadTokenError(item.error?.code)) {
          result.removed += 1
          writes.push(tokensCol().doc(row.id).delete().catch(() => {}))
        } else {
          logger.warn('Push send failed', { code: item.error?.code, message: item.error?.message })
        }
        const reason = `${item.error?.code || 'error'}: ${String(item.error?.message || '').slice(0, 160)}`
        if (!result.errors.includes(reason) && result.errors.length < 3) result.errors.push(reason)
      }
    })
    await Promise.all(writes)
  }
  return result
}

async function adminTokenRows() {
  const found = []
  for (let i = 0; i < ADMIN_UIDS.length; i += 10) {
    const snap = await tokensCol().where('uid', 'in', ADMIN_UIDS.slice(i, i + 10)).get()
    found.push(...rows(snap))
  }
  return found.filter((row) => row.enabled !== false && isValidToken(row.token))
}

async function alertAdmins(payload) {
  const config = (await metaDoc('config').get()).data() || {}
  if (config.adminAlerts === false) return { skipped: 'admin alerts off' }
  const devices = await adminTokenRows()
  if (!devices.length) return { skipped: 'no admin device registered' }
  return sendToTokens(devices, payload)
}

// ---------------------------------------------------------------------------
// Automations
// ---------------------------------------------------------------------------
export async function getPushConfig() {
  const data = (await metaDoc('automations').get()).data() || {}
  return Object.fromEntries(PUSH_SEQUENCE_IDS.map((id) => [id, { enabled: data[id]?.enabled === true }]))
}

async function claim(key, data) {
  try {
    await sendsCol().doc(key).create(data)
    return true
  } catch (error) {
    if (error?.code === 6 || /already exists/i.test(error?.message || '')) return false
    throw error
  }
}

export async function runPushAutomations({ now = new Date() } = {}) {
  if (!inPushWindow(now)) return { skipped: 'outside 10:00-20:00 Pakistan time' }
  const config = await getPushConfig()
  const active = PUSH_SEQUENCES.filter((sequence) => config[sequence.id].enabled)
  if (!active.length) return { skipped: 'no push automation is switched on' }

  const [workspaces, users, tokens] = await Promise.all([
    db().collection('workspaces').limit(3000).get().then(rows),
    db().collection('users').limit(5000).get().then(rows),
    tokensCol().where('enabled', '==', true).limit(5000).get().then(rows),
  ])

  const sent = {}
  for (const sequence of active) {
    sent[sequence.id] = 0
    const targets = selectPushTargets(sequence.id, { workspaces, users, tokens, now })
    for (const target of targets) {
      const key = pushSendKey(sequence.id, target.uid, now)
      if (!(await claim(key, { sequence: sequence.id, uid: target.uid, claimedAt: FieldValue.serverTimestamp() }))) continue
      try {
        const result = await sendToTokens(target.tokens, { ...target.copy, tag: sequence.id }, { now })
        if (result.sent > 0) {
          sent[sequence.id] += 1
          if (sequence.id === 'module_tip') {
            await db().collection('workspaces').doc(target.workspaceId).set({ pushTipCount: FieldValue.increment(1) }, { merge: true }).catch(() => {})
          }
          await metaDoc('stats').set({ [`sent_${sequence.id}`]: FieldValue.increment(1), lastRunAt: FieldValue.serverTimestamp() }, { merge: true })
        } else {
          await sendsCol().doc(key).delete().catch(() => {}) // nothing delivered: let a later run retry
        }
      } catch (error) {
        logger.error('Push automation failed', { sequence: sequence.id, message: error?.message })
        await sendsCol().doc(key).delete().catch(() => {})
      }
    }
  }
  return { sent }
}

export const runPushAutomationsScheduled = onSchedule(
  { schedule: 'every 60 minutes', timeZone: 'Asia/Karachi', region: REGION, timeoutSeconds: 300, memory: '256MiB' },
  async () => {
    const result = await runPushAutomations()
    logger.info('Push automations run', result)
  },
)

// ---------------------------------------------------------------------------
// Client callables
// ---------------------------------------------------------------------------
export const registerPushToken = onCall({ region: REGION, memory: '256MiB' }, async (request) => {
  requireUser(request)
  const token = clean(request.data?.token)
  if (!isValidToken(token)) throw new HttpsError('invalid-argument', 'Invalid device token.')
  const uid = request.auth.uid
  const id = tokenDocId(token)
  const ref = tokensCol().doc(id)
  const existing = await ref.get()
  await ref.set({
    uid,
    token,
    enabled: true,
    platform: clean(request.data?.platform).slice(0, 40),
    browser: clean(request.data?.browser).slice(0, 40),
    lastSeenAt: FieldValue.serverTimestamp(),
    ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp(), pushCount: 0 }),
  }, { merge: true })

  // Keep at most MAX_DEVICES_PER_USER per person: drop the oldest extras.
  const mine = rows(await tokensCol().where('uid', '==', uid).get())
  if (mine.length > MAX_DEVICES_PER_USER) {
    const seen = (row) => row.lastSeenAt?.toMillis?.() || 0
    const extras = mine.filter((row) => row.id !== id).sort((a, b) => seen(a) - seen(b)).slice(0, mine.length - MAX_DEVICES_PER_USER)
    await Promise.all(extras.map((row) => tokensCol().doc(row.id).delete().catch(() => {})))
  }
  return { ok: true }
})

export const unregisterPushToken = onCall({ region: REGION, memory: '256MiB' }, async (request) => {
  requireUser(request)
  const token = clean(request.data?.token)
  if (!isValidToken(token)) return { ok: true }
  const ref = tokensCol().doc(tokenDocId(token))
  const snap = await ref.get()
  if (snap.exists && snap.data().uid === request.auth.uid) await ref.delete()
  return { ok: true }
})

// ---------------------------------------------------------------------------
// Admin callables
// ---------------------------------------------------------------------------
async function countOf(query) {
  const snap = await query.count().get()
  return snap.data().count
}

export const getPushStatus = onCall({ region: REGION, memory: '256MiB' }, async (request) => {
  requireAdmin(request)
  const [config, statsSnap, configSnap, devices, enabledDevices, logs, tokenSample] = await Promise.all([
    getPushConfig(),
    metaDoc('stats').get(),
    metaDoc('config').get(),
    countOf(tokensCol()),
    countOf(tokensCol().where('enabled', '==', true)),
    logsCol().orderBy('createdAt', 'desc').limit(10).get().then(rows),
    tokensCol().limit(5000).get().then(rows),
  ])
  const stats = statsSnap.data() || {}
  const users = new Set(tokenSample.map((row) => row.uid)).size
  return {
    devices,
    enabledDevices,
    users,
    adminAlerts: configSnap.data()?.adminAlerts !== false,
    adminDevices: tokenSample.filter((row) => ADMIN_UIDS.includes(row.uid)).length,
    sequences: PUSH_SEQUENCES.map((sequence) => ({
      id: sequence.id,
      label: sequence.label,
      when: sequence.when,
      enabled: config[sequence.id].enabled,
      sent: Number(stats[`sent_${sequence.id}`]) || 0,
    })),
    recent: logs.map((log) => ({
      id: log.id,
      title: log.title,
      body: log.body,
      segment: log.segment,
      sent: log.sent || 0,
      failed: log.failed || 0,
      test: log.test === true,
      at: log.createdAt?.toDate?.().toISOString() || null,
    })),
  }
})

export const setPushAutomation = onCall({ region: REGION, memory: '256MiB' }, async (request) => {
  requireAdmin(request)
  const id = clean(request.data?.id)
  const enabled = request.data?.enabled === true
  if (id === 'adminAlerts') {
    await metaDoc('config').set({ adminAlerts: enabled }, { merge: true })
    return { ok: true, id, enabled }
  }
  if (!PUSH_SEQUENCE_IDS.includes(id)) throw new HttpsError('invalid-argument', 'Unknown automation.')
  await metaDoc('automations').set({ [id]: { enabled, updatedAt: FieldValue.serverTimestamp() }, updatedBy: request.auth.uid }, { merge: true })
  return { ok: true, id, enabled }
})

async function campaignAudience(segment, now = new Date()) {
  const [workspaces, tokens] = await Promise.all([
    db().collection('workspaces').limit(3000).get().then(rows),
    tokensCol().where('enabled', '==', true).limit(5000).get().then(rows),
  ])
  const allowed = new Set(workspaces.filter((workspace) => matchesSegment(workspace, segment, now)).map((workspace) => workspace.id))
  const matching = tokens.filter((token) => allowed.has(token.uid) && !ADMIN_UIDS.includes(token.uid))
  return { matching, ready: usableTokens(matching, { now, gapMs: CAMPAIGN_GAP_MS }) }
}

export const previewPushAudience = onCall({ region: REGION, memory: '256MiB', timeoutSeconds: 60 }, async (request) => {
  requireAdmin(request)
  const segment = clean(request.data?.segment) || 'all'
  const { matching, ready } = await campaignAudience(segment)
  return { segment, devices: matching.length, users: new Set(matching.map((row) => row.uid)).size, readyDevices: ready.length }
})

export const sendPushCampaign = onCall({ region: REGION, memory: '512MiB', timeoutSeconds: 300 }, async (request) => {
  requireAdmin(request)
  const parsed = normalizeCampaign(request.data, Array.from(MARKETING_MODULE_KEYS).filter((key) => key !== 'all'))
  if (!parsed.ok) throw new HttpsError('invalid-argument', parsed.error)
  const { title, body, url, segment, test } = parsed.value
  const now = new Date()

  let targets
  if (test) {
    targets = await adminTokenRows()
    if (!targets.length) throw new HttpsError('failed-precondition', 'Turn on alerts on this device first (Control Centre > Push Notifications > Turn on alerts here).')
  } else {
    targets = (await campaignAudience(segment, now)).ready
    if (!targets.length) throw new HttpsError('failed-precondition', 'No opted-in devices match this audience right now.')
  }
  const result = await sendToTokens(targets, { title, body, url, tag: test ? 'test' : 'campaign' }, { now })
  await logsCol().add({ title, body, url, segment: test ? 'test' : segment, test, sent: result.sent, failed: result.failed, removed: result.removed, by: request.auth.uid, createdAt: FieldValue.serverTimestamp() })
  return { ok: true, ...result, targeted: targets.length }
})

export const runPushAutomationsNow = onCall({ region: REGION, memory: '256MiB', timeoutSeconds: 120 }, async (request) => {
  requireAdmin(request)
  return { ok: true, ...(await runPushAutomations()) }
})

// ---------------------------------------------------------------------------
// Instant admin alerts
// ---------------------------------------------------------------------------
const short = (text, max) => {
  const value = clean(String(text || '')).replace(/\s+/g, ' ')
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

export const pushNewLead = onDocumentCreated(
  { region: REGION, document: 'websiteLeads/{leadId}', memory: '256MiB', timeoutSeconds: 60 },
  async (event) => {
    const lead = event.data?.data()
    if (!lead) return
    const result = await alertAdmins({
      title: 'New website lead',
      body: short(`${clean(lead.name) || 'Someone'}: ${clean(lead.message) || clean(lead.email) || 'contact form'}`, 120),
      url: '/admin/control-centre',
      tag: 'lead',
    }).catch((error) => { logger.error('pushNewLead failed', { message: error?.message }) })
    logger.info('pushNewLead', result)
  },
)

export const pushNewTicket = onDocumentCreated(
  { region: REGION, document: 'workspaces/{workspaceId}/supportTickets/{ticketId}', memory: '256MiB', timeoutSeconds: 60 },
  async (event) => {
    const ticket = event.data?.data()
    if (!ticket) return
    const result = await alertAdmins({
      title: 'New support ticket',
      body: short(clean(ticket.subject) || clean(ticket.title) || clean(ticket.message) || 'A client needs help', 120),
      url: '/admin/control-centre',
      tag: 'ticket',
    }).catch((error) => { logger.error('pushNewTicket failed', { message: error?.message }) })
    logger.info('pushNewTicket', result)
  },
)
