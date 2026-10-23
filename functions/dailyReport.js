// Daily owner report. Every evening at 7 PM Pakistan time it reads the last two
// days of website analytics and the business queues from Firestore, asks the
// Sentinel Worker for system health and Temp Mail numbers, builds a PDF, and has
// the Sentinel email it to the owner through Cloudflare Email Routing.
//
// Secret (same value on both sides):
//   firebase functions:secrets:set SENTINEL_REPORT_KEY
//   npx wrangler secret put REPORT_KEY --config workers/nexora-sentinel/wrangler.toml

import { Timestamp, getFirestore } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions'
import { defineSecret, defineString } from 'firebase-functions/params'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { ADMIN_UIDS } from './adminUids.js'
import { DAY_MS, buildDailyReport, reportEmailHtml } from './dailyReportLogic.js'
import { renderReportPdf } from './dailyReportPdf.js'

const SENTINEL_REPORT_KEY = defineSecret('SENTINEL_REPORT_KEY')
const SENTINEL_URL = defineString('SENTINEL_URL', { default: 'https://nexora-sentinel.rahanshah4.workers.dev' })

export const EVENT_FIELDS = ['eventType', 'page', 'visitorId', 'sessionId', 'referrer', 'deviceType', 'browser', 'country', 'buttonLabel', 'timestamp', 'createdAt']
export const MAX_EVENTS = 15000

async function safe(name, sources, fn) {
  try {
    const value = await fn()
    sources[name] = true
    return value
  } catch (error) {
    sources[name] = false
    logger.warn(`dailyReport: could not read ${name}`, { error: String(error?.message || error) })
    return null
  }
}

async function count(query) {
  const snap = await query.count().get()
  return snap.data().count
}

/** Collects the inputs, builds the report and the PDF, and sends it. */
export async function runDailyReport({ now = Date.now(), db = getFirestore(), fetchFn = fetch, key = SENTINEL_REPORT_KEY.value(), sentinelUrl = SENTINEL_URL.value() } = {}) {
  const sources = {}
  const since = Timestamp.fromMillis(now - DAY_MS)
  const twoDays = Timestamp.fromMillis(now - 2 * DAY_MS)

  const events = await safe('website analytics', sources, async () => {
    const snap = await db.collection('analyticsEvents')
      .where('timestamp', '>=', twoDays)
      .orderBy('timestamp', 'desc')
      .limit(MAX_EVENTS)
      .select(...EVENT_FIELDS)
      .get()
    return snap.docs.map((d) => d.data())
  }) || []

  const one = (name, fn) => safe(name, sources, fn)
  const [newUsers, newWorkspaces, newLeads, uncontactedLeads, newUpgrades, pendingUpgrades, openTickets, newServiceRequests, pendingComments, trialsEndingSoon] = await Promise.all([
    one('new users', () => count(db.collection('users').where('createdAt', '>=', since))),
    one('new workspaces', () => count(db.collection('workspaces').where('createdAt', '>=', since))),
    one('new leads', () => count(db.collection('websiteLeads').where('createdAt', '>=', since))),
    one('uncontacted leads', () => count(db.collection('websiteLeads').where('status', '==', 'new'))),
    one('new upgrade requests', () => count(db.collection('upgradeRequests').where('createdAt', '>=', since))),
    one('pending upgrades', () => count(db.collection('upgradeRequests').where('status', '==', 'pending'))),
    one('open tickets', async () => {
      // A collection-group count covers top-level and per-workspace tickets; fall
      // back to the top-level collection if the group index is not there.
      try { return await count(db.collectionGroup('supportTickets').where('status', '==', 'open')) } catch { return count(db.collection('supportTickets').where('status', '==', 'open')) }
    }),
    one('service requests', () => count(db.collection('businessServiceRequests').where('createdAt', '>=', since))),
    one('blog comments', () => count(db.collection('blogComments').where('status', '==', 'pending'))),
    one('trials ending', () => count(db.collection('users').where('trialEndsAt', '>=', Timestamp.fromMillis(now)).where('trialEndsAt', '<=', Timestamp.fromMillis(now + 3 * DAY_MS)))),
  ])
  const business = { newUsers, newWorkspaces, newLeads, uncontactedLeads, newUpgrades, pendingUpgrades, openTickets, newServiceRequests, pendingComments, trialsEndingSoon }

  const sentinel = await safe('system health', sources, async () => {
    const res = await fetchFn(`${sentinelUrl}/api/internal/summary`, { headers: { 'x-report-key': key } })
    if (!res.ok) throw new Error(`Sentinel answered HTTP ${res.status}`)
    return res.json()
  })

  // Sources that worked are not listed; only failures become report lines.
  const failed = Object.fromEntries(Object.entries(sources).filter(([, ok]) => !ok))
  const report = buildDailyReport({ now, events, business, sentinel, sources: failed })
  const pdf = await renderReportPdf(report)
  const html = reportEmailHtml(report)
  const statusWord = { good: 'All good', watch: 'Things to watch', attention: 'Needs attention' }[report.status]
  const day = new Date(now + 5 * 3600 * 1000).toISOString().slice(0, 10)

  const res = await fetchFn(`${sentinelUrl}/api/internal/report-mail`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-report-key': key },
    body: JSON.stringify({
      subject: `Nexora daily report ${day}: ${statusWord} (${report.traffic.visitors} visitors)`,
      html,
      filename: `nexora-report-${day}.pdf`,
      pdfBase64: pdf.toString('base64'),
    }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(`Report mail failed: ${data?.error || res.status}`)
  logger.info('dailyReport sent', { visitors: report.traffic.visitors, problems: report.problems.length, pdfBytes: pdf.length, events: events.length })
  return { status: report.status, visitors: report.traffic.visitors, problems: report.problems.length, pdfBytes: pdf.length }
}

export const sendDailyReport = onSchedule(
  { region: 'us-central1', schedule: '0 19 * * *', timeZone: 'Asia/Karachi', timeoutSeconds: 300, memory: '512MiB', secrets: [SENTINEL_REPORT_KEY], retryCount: 1 },
  async () => { await runDailyReport() },
)

/** Control Centre button: send the report now (platform admin only). */
export const sendDailyReportNow = onCall(
  { region: 'us-central1', timeoutSeconds: 300, memory: '512MiB', secrets: [SENTINEL_REPORT_KEY] },
  async (request) => {
    if (!request.auth?.uid || !ADMIN_UIDS.includes(request.auth.uid)) throw new HttpsError('permission-denied', 'Only the platform admin can send the report.')
    try {
      return await runDailyReport()
    } catch (error) {
      logger.error('sendDailyReportNow failed', { error: String(error?.message || error) })
      throw new HttpsError('internal', String(error?.message || 'The report could not be sent.'))
    }
  },
)
