/**
 * nexora-sentinel: platform watchdog.
 *   cron every 5 min: run every check, apply first aid, open/close incidents, email on trouble
 *   POST /api/report            browser error reports (from the site, rate limited)
 *   GET  /api/admin/status      Control Centre: checks, incidents, errors (Firebase admin token)
 *   POST /api/admin/run         run the checks now
 *   POST /api/admin/test-email  send a test alert
 *   GET  /health
 */
import { authorizeAdmin } from './admin.js'
import { buildChecks, runAllChecks, runCheck } from './checks.js'
import { applyResults, emptyState, overallStatus } from './state.js'
import { remedyPlan, runRemedy } from './remedies.js'
import { composeIncidentMail, sendAlert } from './mail.js'
import { listErrors, normalizeReport, recordError } from './errors.js'

const STATE_KEY = 'state'

const origins = (env) => String(env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean)
function cors(request, env) {
  const origin = request.headers.get('origin') || ''
  return {
    'access-control-allow-origin': origins(env).includes(origin) ? origin : origins(env)[0] || '',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization',
    vary: 'origin',
  }
}
const json = (data, status, request, env) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...cors(request, env) } })

export async function loadState(env) {
  return JSON.parse((await env.SENTINEL.get(STATE_KEY)) || 'null') || emptyState()
}

/** One full watch cycle. Exposed for the cron handler, the admin "run now" button and tests. */
export async function runCycle(env, { fetchFn = fetch, sender, now = Date.now() } = {}) {
  const checks = buildChecks(env)
  const prev = await loadState(env)
  let results = await runAllChecks(checks, fetchFn)
  const fixesById = {}
  const fixLog = [...(prev.fixLog || [])]
  let lastRedeployAt = prev.lastRedeployAt || 0

  // First aid for failing checks, then look again once.
  for (let i = 0; i < results.length; i += 1) {
    const r = results[i]
    if (r.ok) continue
    const check = checks.find((c) => c.id === r.id)
    const steps = remedyPlan(check, (prev.checks?.[r.id]?.fails || 0) + 1, env, now, lastRedeployAt)
    if (!steps.length) continue
    const notes = []
    for (const step of steps) {
      notes.push(await runRemedy(step, env, fetchFn))
      if (step === 'redeploy') lastRedeployAt = now
    }
    const again = await runCheck(check, fetchFn)
    fixesById[r.id] = notes
    fixLog.unshift({ at: now, checkId: r.id, label: r.label, actions: notes, recovered: again.ok })
    if (again.ok) results[i] = { ...again, fixed: true }
  }

  const { state, events } = applyResults(prev, results, now)
  state.fixLog = fixLog.slice(0, 20)
  state.lastRedeployAt = lastRedeployAt
  for (const [id, notes] of Object.entries(fixesById)) {
    const incident = state.incidents.find((x) => x.checkId === id && !x.resolvedAt)
    if (incident) incident.fixes = [...new Set([...(incident.fixes || []), ...notes])].slice(0, 8)
  }

  const mailResults = []
  for (const event of events) {
    const mail = composeIncidentMail(event, event.incident.fixes || [])
    mailResults.push(await sendAlert(env, mail.subject, mail.text, sender))
  }
  state.lastMailError = mailResults.find((m) => !m.ok)?.error || (mailResults.length ? '' : state.lastMailError || '')
  await env.SENTINEL.put(STATE_KEY, JSON.stringify(state))
  return { state, events }
}

const hits = new Map()
function rateLimited(ip) {
  const now = Date.now()
  const rec = hits.get(ip) || { start: now, n: 0 }
  if (now - rec.start > 60000) { rec.start = now; rec.n = 0 }
  rec.n += 1
  hits.set(ip, rec)
  if (hits.size > 5000) hits.clear()
  return rec.n > 20
}

async function handleReport(request, env) {
  const origin = request.headers.get('origin') || ''
  if (!origins(env).includes(origin)) return json({ error: 'forbidden' }, 403, request, env)
  if (rateLimited(request.headers.get('cf-connecting-ip') || 'x')) return json({ error: 'rate_limited' }, 429, request, env)
  let body
  try { body = await request.json() } catch { return json({ error: 'bad_json' }, 400, request, env) }
  const report = normalizeReport(body)
  if (!report) return json({ error: 'bad_report' }, 400, request, env)
  const { rec, notify } = await recordError(env.SENTINEL, report)
  if (notify) {
    await sendAlert(env, `⚠️ Nexora: users hitting a site error (${rec.count}x)`, `Rahan, visitors are hitting the same browser error on the website.\n\nPage: ${rec.page}\nError: ${rec.message}\nReports so far: ${rec.count}\n\nControl Centre > System Health shows the full list.`)
  }
  return json({ ok: true }, 202, request, env)
}

async function handleAdmin(request, env, pathname) {
  const auth = await authorizeAdmin(request, env)
  if (!auth.ok) return json({ error: auth.error }, auth.status, request, env)
  if (pathname === '/api/admin/status' && request.method === 'GET') {
    const state = await loadState(env)
    return json({
      overall: overallStatus(state),
      lastRunAt: state.lastRunAt || 0,
      checks: Object.values(state.checks || {}),
      incidents: state.incidents || [],
      fixLog: state.fixLog || [],
      errors: await listErrors(env.SENTINEL),
      lastMailError: state.lastMailError || '',
      capabilities: { email: Boolean(env.ALERT_MAIL), purgeCache: Boolean(env.CF_API_TOKEN && env.CF_ZONE_ID), redeploy: Boolean(env.PAGES_DEPLOY_HOOK), alertTo: env.ALERT_TO || '' },
    }, 200, request, env)
  }
  if (pathname === '/api/admin/run' && request.method === 'POST') {
    const { state } = await runCycle(env)
    return json({ overall: overallStatus(state), lastRunAt: state.lastRunAt }, 200, request, env)
  }
  if (pathname === '/api/admin/test-email' && request.method === 'POST') {
    const result = await sendAlert(env, '✅ Nexora Sentinel test email', 'Rahan, ye test email hai. Agar ye aap tak pohanch gayi to alerts sahi kaam kar rahe hain.')
    return json(result, result.ok ? 200 : 502, request, env)
  }
  return json({ error: 'not_found' }, 404, request, env)
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(request, env) })
    if (url.pathname === '/health') return json({ status: 'ok', service: 'nexora-sentinel' }, 200, request, env)
    if (url.pathname === '/api/report' && request.method === 'POST') return handleReport(request, env)
    if (url.pathname.startsWith('/api/admin/')) return handleAdmin(request, env, url.pathname)
    return json({ error: 'not_found' }, 404, request, env)
  },
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(runCycle(env))
  },
}
