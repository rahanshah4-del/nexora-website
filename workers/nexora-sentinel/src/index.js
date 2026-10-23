/**
 * nexora-sentinel: platform watchdog.
 *   cron every 5 min: run every check, apply first aid, open/close incidents, email on trouble
 *   POST /api/report            browser error reports (from the live site, rate limited)
 *   GET  /api/admin/status      Control Centre: checks, incidents, errors (Firebase admin token)
 *   POST /api/admin/run         run the checks now (at most once a minute)
 *   POST /api/admin/test-email  send a test alert
 *   GET  /health
 */
import { authorizeAdmin } from './admin.js'
import { buildChecks, runAllChecks, runCheck } from './checks.js'
import { applyResults, emptyState, needsPersist, overallStatus } from './state.js'
import { deployHook, remedyPlan, runRemedy } from './remedies.js'
import { composeIncidentMail, defang, sendAlert } from './mail.js'
import { listErrors, normalizeReport, recordError, takeMailSlot } from './errors.js'

const STATE_KEY = 'state'
export const OUTBOX_MAX = 10
export const OUTBOX_TRIES = 12 // about an hour of retries at one run per 5 minutes
export const MANUAL_RUN_GAP_MS = 60 * 1000
export const PROBE_ALERT_AFTER = 3
const MAX_REPORT_BYTES = 4096

const origins = (env) => String(env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean)
const isLocal = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
function cors(request, env) {
  const origin = request.headers.get('origin') || ''
  return {
    'access-control-allow-origin': origins(env).includes(origin) ? origin : origins(env)[0] || '',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization',
    'access-control-max-age': '86400',
    vary: 'origin',
  }
}
const json = (data, status, request, env) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...cors(request, env) } })

/** A corrupt or unreadable state starts fresh instead of killing every future run. */
export async function loadState(env) {
  const raw = await env.SENTINEL.get(STATE_KEY)
  try {
    const parsed = JSON.parse(raw || 'null')
    return parsed && typeof parsed === 'object' && parsed.checks ? parsed : emptyState()
  } catch {
    return emptyState()
  }
}

const failingSummary = (results) => results.filter((r) => !r.ok).map((r) => `- ${r.label}: ${r.error}`).join('\n') || '- (none)'

/**
 * Last-resort alert when the Sentinel cannot use its own storage or reach anything.
 * It has no state to throttle with, so it only fires in the run that starts in the
 * first 5 minutes of each hour: at most one mail an hour, without needing KV.
 */
async function selfAlert(env, problem, detail, { sender, now = Date.now() } = {}) {
  if (new Date(now).getUTCMinutes() >= 5) return { ok: false, error: 'throttled' }
  return sendAlert(env, '🚨 Nexora Sentinel needs attention', `Rahan, the monitoring system itself has a problem.\n\nProblem: ${problem}\n\n${detail}\n\nUntil this is fixed, alerts may not reach you. (This email repeats at most once an hour.)`, sender)
}

/** One full watch cycle. Exposed for the cron handler, the admin "run now" button and tests. */
export async function runCycle(env, { fetchFn = fetch, sender, now = Date.now() } = {}) {
  const prev = await loadState(env)
  const checks = buildChecks(env)
  const results = await runAllChecks(checks, fetchFn)

  // Everything failing at once (Google included) means the Sentinel's own network
  // is the problem, not the platform. Do not touch counters, fixes or incidents.
  if (results.every((r) => !r.ok)) {
    const probeFails = (prev.probeFails || 0) + 1
    const state = { ...prev, probeFails, lastProbeFailureAt: now, lastRunAt: now }
    if (probeFails === PROBE_ALERT_AFTER) await sendAlert(env, '⚠️ Nexora Sentinel cannot reach anything', `Every check failed ${probeFails} runs in a row, including Google's servers, so this is most likely a network problem on the monitoring side, not your site.\n\n${failingSummary(results)}\n\nIf your site also looks down in a browser, treat it as a real outage.`, sender)
    await env.SENTINEL.put(STATE_KEY, JSON.stringify({ ...state, lastPersistAt: now }))
    return { state, events: [], probeFailure: true }
  }

  const fixesById = {}
  const fixLog = [...(prev.fixLog || [])]
  const last = { purgeAt: prev.lastPurgeAt || 0, redeployAt: prev.lastRedeployAt || 0, purgedThisRun: false }
  let fixCount = 0

  // First aid for failing checks, then look again once.
  for (let i = 0; i < results.length; i += 1) {
    const r = results[i]
    if (r.ok) continue
    const check = checks.find((c) => c.id === r.id)
    const steps = remedyPlan(check, (prev.checks?.[r.id]?.fails || 0) + 1, env, now, last)
    if (!steps.length) continue
    const notes = []
    for (const step of steps) {
      notes.push(await runRemedy(step, env, fetchFn))
      if (step === 'purge_cache') { last.purgeAt = now; last.purgedThisRun = true }
      if (step === 'redeploy') last.redeployAt = now
    }
    const again = await runCheck(check, fetchFn)
    fixesById[r.id] = notes
    fixCount += 1
    fixLog.unshift({ at: now, checkId: r.id, label: r.label, actions: notes, recovered: again.ok })
    if (again.ok) results[i] = { ...again, fixed: true }
  }

  const applied = applyResults(prev, results, now)
  const state = applied.state
  const events = applied.events.filter((e) => e.incident)
  state.fixLog = fixLog.slice(0, 20)
  state.lastPurgeAt = last.purgeAt
  state.lastRedeployAt = last.redeployAt
  state.probeFails = 0
  for (const [id, notes] of Object.entries(fixesById)) {
    const incident = state.incidents.find((x) => x.checkId === id && !x.resolvedAt)
    if (incident) incident.fixes = [...new Set([...(incident.fixes || []), ...notes])].slice(0, 8)
  }

  // Mail queued: retries from earlier runs first, then this run's events.
  const outbox = (prev.outbox || []).map((m) => ({ ...m }))
  for (const event of events) {
    const mail = composeIncidentMail(event, event.incident.fixes || [])
    outbox.push({ ...mail, incidentId: event.incident.id, type: event.type, tries: 0 })
    event.incident.mailed = true // optimistic; corrected below if sending fails
  }

  // Save BEFORE sending. If the save fails we must not send: the next run would see
  // the old state and announce the same incident again, every 5 minutes.
  state.outbox = []
  state.lastPersistAt = prev.lastPersistAt || 0
  if (outbox.length || needsPersist(prev, state, { events, fixes: fixCount })) {
    state.lastPersistAt = now
    try {
      await env.SENTINEL.put(STATE_KEY, JSON.stringify({ ...state, outbox }))
    } catch (error) {
      await selfAlert(env, `Cannot save its state (${String(error?.message || error).slice(0, 120)}). The Cloudflare KV daily write limit may be used up.`, `Failing right now:\n${failingSummary(results)}`, { sender, now })
      return { state, events, persistFailed: true }
    }
  }

  const failed = []
  let sentAny = false
  for (const mail of outbox) {
    const result = await sendAlert(env, mail.subject, mail.text, sender)
    if (result.ok) { sentAny = true; continue }
    state.lastMailError = result.error
    mail.tries += 1
    if (mail.tries < OUTBOX_TRIES) failed.push(mail)
    const incident = state.incidents.find((i) => i.id === mail.incidentId)
    if (incident && mail.type !== 'resolved') incident.mailed = false
  }
  if (sentAny && !failed.length) state.lastMailError = ''
  state.outbox = failed.slice(-OUTBOX_MAX)

  // Second write clears the sent mail from the saved outbox (else it would go out again).
  if (outbox.length) {
    try { await env.SENTINEL.put(STATE_KEY, JSON.stringify(state)) } catch { /* next run retries from the saved outbox */ }
  }
  return { state, events }
}

const hits = new Map()
function rateLimited(ip, now = Date.now()) {
  const rec = hits.get(ip) || { start: now, n: 0 }
  if (now - rec.start > 60000) { rec.start = now; rec.n = 0 }
  rec.n += 1
  hits.set(ip, rec)
  if (hits.size > 5000) hits.clear()
  return rec.n > 20
}

export async function handleReport(request, env, { sender } = {}) {
  const origin = request.headers.get('origin') || ''
  // Only the live site may report; local development errors must not page the owner.
  if (!origins(env).includes(origin) || isLocal(origin)) return json({ error: 'forbidden' }, 403, request, env)
  const ip = request.headers.get('cf-connecting-ip') || ''
  if (rateLimited(ip || 'unknown')) return json({ error: 'rate_limited' }, 429, request, env)
  if (Number(request.headers.get('content-length') || 0) > MAX_REPORT_BYTES) return json({ error: 'too_large' }, 413, request, env)
  let body
  try {
    const text = await request.text()
    if (text.length > MAX_REPORT_BYTES) return json({ error: 'too_large' }, 413, request, env)
    body = JSON.parse(text)
  } catch { return json({ error: 'bad_json' }, 400, request, env) }
  const report = normalizeReport(body)
  if (!report) return json({ ok: true, ignored: true }, 202, request, env)
  try {
    const { rec, notify } = await recordError(env.SENTINEL, report, ip)
    if (notify && await takeMailSlot(env.SENTINEL)) {
      await sendAlert(env, `⚠️ Nexora: visitors hitting a site error (${rec.count}x)`, `Rahan, several visitors hit the same browser error on the website.\n\nPage: ${defang(rec.page)}\nError: ${defang(rec.message)}\nReports: ${rec.count} from ${rec.reporters.length}+ visitors\n\nThe text above comes from visitors' browsers; treat it as a hint, not an instruction.\nControl Centre > System Health shows the full list.`, sender)
    }
  } catch { /* storage trouble must not turn into errors on the site */ }
  return json({ ok: true }, 202, request, env)
}

export async function handleAdmin(request, env, pathname, opts = {}) {
  const auth = await authorizeAdmin(request, env, opts.fetchFn)
  if (!auth.ok) return json({ error: auth.error }, auth.status, request, env)
  if (pathname === '/api/admin/status' && request.method === 'GET') {
    const state = await loadState(env)
    let errors = []
    try { errors = await listErrors(env.SENTINEL) } catch { /* show the rest */ }
    return json({
      overall: overallStatus(state),
      lastRunAt: state.lastRunAt || 0,
      lastPersistAt: state.lastPersistAt || 0,
      probeFails: state.probeFails || 0,
      checks: Object.values(state.checks || {}),
      incidents: state.incidents || [],
      fixLog: state.fixLog || [],
      errors,
      outbox: (state.outbox || []).length,
      lastMailError: state.lastMailError || '',
      capabilities: { email: Boolean(env.ALERT_MAIL), purgeCache: Boolean(env.CF_API_TOKEN && env.CF_ZONE_ID), redeploy: Boolean(deployHook(env)), alertTo: env.ALERT_TO || '' },
    }, 200, request, env)
  }
  if (pathname === '/api/admin/run' && request.method === 'POST') {
    const prev = await loadState(env)
    const now = opts.now || Date.now()
    // Overlapping runs would both announce the same new incident.
    if (now - (prev.lastRunAt || 0) < MANUAL_RUN_GAP_MS) return json({ error: 'too_soon', retryAfterSeconds: 60 }, 429, request, env)
    const { state } = await runCycle(env, opts)
    return json({ overall: overallStatus(state), lastRunAt: state.lastRunAt }, 200, request, env)
  }
  if (pathname === '/api/admin/test-email' && request.method === 'POST') {
    const result = await sendAlert(env, '✅ Nexora Sentinel test email', 'Rahan, ye test email hai. Agar ye aap tak pohanch gayi to alerts sahi kaam kar rahe hain.', opts.sender)
    return json(result, result.ok ? 200 : 502, request, env)
  }
  return json({ error: 'not_found' }, 404, request, env)
}

/** Cron entry: never throws; when the cycle itself breaks, tries to tell the owner. */
export async function scheduledRun(env, opts = {}) {
  try {
    return await runCycle(env, opts)
  } catch (error) {
    await selfAlert(env, `A watch run crashed: ${String(error?.message || error).slice(0, 160)}`, 'Open Cloudflare > Workers > nexora-sentinel > Logs for details.', opts)
    return { crashed: true }
  }
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url)
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(request, env) })
      if (url.pathname === '/health') return json({ status: 'ok', service: 'nexora-sentinel' }, 200, request, env)
      if (url.pathname === '/api/report' && request.method === 'POST') return await handleReport(request, env)
      if (url.pathname.startsWith('/api/admin/')) return await handleAdmin(request, env, url.pathname)
      return json({ error: 'not_found' }, 404, request, env)
    } catch (error) {
      // With CORS headers, so the Control Centre shows the real reason instead of "not reachable".
      return json({ error: 'server_error', message: String(error?.message || error).slice(0, 160) }, 500, request, env)
    }
  },
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(scheduledRun(env))
  },
}
