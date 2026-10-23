/**
 * Daily owner report: pure data shaping (no Firebase, no network), so it is unit
 * tested in plain Node. dailyReport.js gathers the inputs, dailyReportPdf.js draws it.
 *
 * Times: the report covers the 24 hours before `now`, compared with the 24 hours
 * before that. Hours of the day are shown in Pakistan time (UTC+5, no DST).
 */
export const PKT_OFFSET_MS = 5 * 3600 * 1000
export const DAY_MS = 24 * 3600 * 1000

// Logged-in product and admin screens are not website traffic.
const APP_PATH = /^\/(app|admin|workspace|login|signup|verify-email|crm)(\/|$|\?)/
const CRITICAL_FRONTEND = new Set(['frontend_runtime_error', 'frontend_unhandled_rejection', 'frontend_error_boundary'])

const TOOL_LABELS = {
  'temp-mail': 'Temp Mail',
  'geo-audit': 'GeoLint (GEO audit)',
  'invoice-generator': 'Invoice Generator',
  'gst-invoice-generator': 'GST Invoice Generator',
  'cis-invoice-generator': 'CIS Invoice Generator',
  'uae-vat-invoice-generator': 'UAE VAT Invoice Generator',
  'contractor-invoice-generator': 'Contractor Invoice Generator',
  'thermal-receipt-generator': 'Thermal Receipt Generator',
  'invoice-on-letterhead': 'Invoice on Letterhead',
  'quotation-generator': 'Quotation Generator',
  'pay-stub-generator': 'Pay Stub Generator',
  'pakistan-invoice-generator': 'Pakistan Invoice Generator',
}

const toMs = (value) => {
  if (!value) return 0
  if (typeof value === 'number') return value
  if (typeof value.toMillis === 'function') return value.toMillis()
  if (typeof value.toDate === 'function') return value.toDate().getTime()
  const ms = new Date(value).getTime()
  return Number.isNaN(ms) ? 0 : ms
}
export const eventTime = (row = {}) => toMs(row.timestamp || row.createdAt)

export function pktDateLabel(ms) {
  const d = new Date(ms + PKT_OFFSET_MS)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return `${days[d.getUTCDay()]}, ${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}
export const pktHour = (ms) => new Date(ms + PKT_OFFSET_MS).getUTCHours()

/** Percent change, or null when there is nothing to compare with. */
export function change(now, before) {
  if (!before) return null
  return Math.round(((now - before) / before) * 100)
}

function hostOf(referrer) {
  if (!referrer) return 'Direct / none'
  try {
    return new URL(referrer).hostname.replace(/^www\./, '') || 'Direct / none'
  } catch {
    return 'Direct / none'
  }
}

function prettySlug(slug) {
  return slug.split('-').map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ')
}

/** '/tools/temp-mail/' -> 'temp-mail'; the hub itself and non-tool pages -> ''. */
export function toolSlug(page = '') {
  const m = /^\/tools\/([a-z0-9-]+)/.exec(String(page).toLowerCase())
  return m ? m[1] : ''
}

const bump = (map, key, n = 1) => map.set(key, (map.get(key) || 0) + n)
const top = (map, n = 8) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([label, count]) => ({ label, count }))

/** Traffic numbers for one window of analyticsEvents rows. */
export function summarizeTraffic(rows = []) {
  const visitors = new Set()
  const sessions = new Set()
  const pages = new Map()
  const referrers = new Map()
  const devices = new Map()
  const browsers = new Map()
  const countries = new Map()
  const toolViews = new Map()
  const toolVisitors = new Map()
  const hourly = Array(24).fill(0)
  const errors = new Map()
  let pageViews = 0
  let appViews = 0
  const funnel = { signupStarted: 0, signupCompleted: 0, loginCompleted: 0, loginFailed: 0, upgradeRequests: 0, onboardingCompleted: 0 }

  for (const row of rows) {
    const page = String(row.page || '')
    const ms = eventTime(row)
    if (row.eventType === 'page_view') {
      if (APP_PATH.test(page)) { appViews += 1; continue }
      pageViews += 1
      if (row.visitorId) visitors.add(row.visitorId)
      if (row.sessionId) sessions.add(row.sessionId)
      const path = page.split(/[?#]/)[0] || '/'
      bump(pages, path)
      const host = hostOf(row.referrer)
      if (!/nexorasolution\.(us|online)$/.test(host)) bump(referrers, host)
      if (row.deviceType) bump(devices, row.deviceType)
      if (row.browser) bump(browsers, row.browser)
      if (row.country) bump(countries, row.country)
      if (ms) hourly[pktHour(ms)] += 1
      const slug = toolSlug(path)
      if (slug) {
        bump(toolViews, slug)
        if (!toolVisitors.has(slug)) toolVisitors.set(slug, new Set())
        if (row.visitorId) toolVisitors.get(slug).add(row.visitorId)
      }
    } else if (CRITICAL_FRONTEND.has(row.eventType)) {
      const key = `${String(row.buttonLabel || 'Unknown error').slice(0, 120)}|${page.split(/[?#]/)[0] || '/'}`
      bump(errors, key)
    } else if (row.eventType === 'signup_started') funnel.signupStarted += 1
    else if (row.eventType === 'signup_completed') funnel.signupCompleted += 1
    else if (row.eventType === 'login_completed') funnel.loginCompleted += 1
    else if (row.eventType === 'login_failed') funnel.loginFailed += 1
    else if (row.eventType === 'upgrade_request_submitted') funnel.upgradeRequests += 1
    else if (row.eventType === 'onboarding_completed') funnel.onboardingCompleted += 1
  }

  return {
    pageViews,
    appViews,
    visitors: visitors.size,
    sessions: sessions.size,
    pagesPerVisitor: visitors.size ? Math.round((pageViews / visitors.size) * 10) / 10 : 0,
    topPages: top(pages, 10),
    referrers: top(referrers, 6),
    devices: top(devices, 4),
    browsers: top(browsers, 5),
    countries: top(countries, 6),
    hourly,
    funnel,
    frontendErrors: top(errors, 8).map(({ label, count }) => {
      const [message, page] = label.split('|')
      return { message, page, count }
    }),
    tools: [...toolViews.entries()].map(([slug, views]) => ({ slug, label: TOOL_LABELS[slug] || prettySlug(slug), views, visitors: toolVisitors.get(slug)?.size || 0 })),
  }
}

/** Tools ranked by visitors today, with yesterday's numbers next to them. */
export function rankTools(today = [], before = []) {
  const prev = new Map(before.map((t) => [t.slug, t]))
  const all = new Map(today.map((t) => [t.slug, t]))
  for (const t of before) if (!all.has(t.slug)) all.set(t.slug, { ...t, views: 0, visitors: 0 })
  return [...all.values()]
    .map((t) => ({ ...t, prevViews: prev.get(t.slug)?.views || 0, prevVisitors: prev.get(t.slug)?.visitors || 0, change: change(t.visitors, prev.get(t.slug)?.visitors || 0) }))
    .sort((a, b) => b.visitors - a.visitors || b.views - a.views)
}

function sumTempMail(rows = []) {
  const total = {}
  for (const r of rows) for (const [k, v] of Object.entries(r)) if (k !== 'date' && typeof v === 'number') total[k] = (total[k] || 0) + v
  return total
}

/**
 * Turns everything into the report. Every input may be missing (null) when its
 * source could not be read; the report then says so instead of showing zeros.
 */
export function buildDailyReport({ now = Date.now(), events = [], business = null, sentinel = null, sources = {} } = {}) {
  const since = now - DAY_MS
  const prevSince = now - 2 * DAY_MS
  const todayRows = []
  const prevRows = []
  for (const row of events) {
    const ms = eventTime(row)
    if (ms >= since && ms <= now) todayRows.push(row)
    else if (ms >= prevSince && ms < since) prevRows.push(row)
  }
  const traffic = summarizeTraffic(todayRows)
  const prev = summarizeTraffic(prevRows)
  const tools = rankTools(traffic.tools, prev.tools)
  const bestTool = tools.find((t) => t.visitors > 0) || null
  const risingTool = tools.filter((t) => t.visitors >= 3 && t.change !== null && t.change > 0).sort((a, b) => b.change - a.change)[0] || null

  const tm = sentinel?.tempMail || null
  const tempMail = tm ? { days: tm, today: tm[tm.length - 1] || {}, yesterday: tm[tm.length - 2] || {}, week: sumTempMail(tm) } : null

  const health = sentinel ? {
    overall: sentinel.overall || 'unknown',
    lastRunAt: sentinel.lastRunAt || 0,
    checks: (sentinel.checks || []).map((c) => ({ ...c, uptime: c.history?.length ? Math.round((c.history.filter(Boolean).length / c.history.length) * 100) : null })),
    incidents: sentinel.incidents || [],
    fixes: sentinel.fixes || [],
    browserErrors: sentinel.errors || [],
    lastMailError: sentinel.lastMailError || '',
  } : null

  const problems = []
  const add = (severity, title, detail, action) => problems.push({ severity, title, detail, action })

  if (health) {
    for (const i of health.incidents.filter((x) => !x.resolvedAt)) add('high', `${i.label} is down`, `Since ${new Date(i.openedAt).toISOString().slice(11, 16)} UTC: ${i.lastError}`, 'Open Control Centre > System Health and check the service.')
    const resolved = health.incidents.filter((x) => x.resolvedAt)
    if (resolved.length) add('low', `${resolved.length} short outage(s), now recovered`, resolved.map((i) => `${i.label} (${Math.max(1, Math.round((i.resolvedAt - i.openedAt) / 60000))} min)`).join(', '), 'No action needed; watch for repeats.')
    if (health.lastMailError) add('high', 'Alert emails are failing', health.lastMailError, 'Check Email Routing destination address in Cloudflare.')
    const slow = health.checks.filter((c) => c.ok && c.slow)
    if (slow.length) add('low', 'Slow responses', slow.map((c) => `${c.label} ${c.ms} ms`).join(', '), 'Keep an eye on it; act if it repeats.')
  } else {
    add('medium', 'System health data missing', 'The Sentinel could not be reached for this report.', 'Check that nexora-sentinel is deployed and REPORT_KEY matches.')
  }

  const errorCount = traffic.frontendErrors.reduce((n, e) => n + e.count, 0)
  if (errorCount) add(errorCount >= 5 ? 'high' : 'medium', `${errorCount} browser error(s) on the website`, traffic.frontendErrors.slice(0, 3).map((e) => `${e.message} (${e.page}, ${e.count}x)`).join('; '), 'Open the page, reproduce, and fix the code; see Bug Reports in Control Centre.')

  const visitorChange = change(traffic.visitors, prev.visitors)
  if (prev.visitors >= 20 && visitorChange !== null && visitorChange <= -30) add('medium', `Visitors down ${Math.abs(visitorChange)}%`, `${traffic.visitors} today vs ${prev.visitors} the day before.`, 'Check Search Console and recent deploys; look at which pages lost traffic.')

  const f = traffic.funnel
  if (f.signupStarted >= 3 && f.signupCompleted / f.signupStarted < 0.5) add('medium', 'Many signups are not finished', `${f.signupStarted} started, ${f.signupCompleted} completed.`, 'Try the signup yourself on mobile; check email-verification delivery.')
  if (f.loginFailed >= 10) add('medium', `${f.loginFailed} failed logins`, 'More failed logins than usual can mean confused users or a password-guessing attempt.', 'Check Security / Passkeys and login history in Control Centre.')

  if (business) {
    if (business.pendingUpgrades > 0) add('high', `${business.pendingUpgrades} upgrade request(s) waiting`, 'Customers are waiting to pay or be approved.', 'Control Centre > Upgrade Requests.')
    if (business.openTickets > 0) add('medium', `${business.openTickets} open support ticket(s)`, 'Unanswered tickets hurt trust.', 'Control Centre > Support Tickets.')
    if (business.newLeads > 0) add('medium', `${business.newLeads} new website lead(s)`, 'Fresh leads convert best when contacted the same day.', 'Control Centre > Website Leads.')
    if (business.pendingComments > 0) add('low', `${business.pendingComments} blog comment(s) waiting for approval`, '', 'Blog Manager > Comments.')
  }

  for (const [name, ok] of Object.entries(sources)) if (ok === false) add('low', `Could not read ${name}`, 'This part of the report is incomplete.', 'Usually temporary; check the function logs if it repeats.')

  const order = { high: 0, medium: 1, low: 2 }
  problems.sort((a, b) => order[a.severity] - order[b.severity])

  const highlights = []
  if (visitorChange !== null) highlights.push(`Visitors ${visitorChange >= 0 ? 'up' : 'down'} ${Math.abs(visitorChange)}% (${traffic.visitors} vs ${prev.visitors}).`)
  else highlights.push(`${traffic.visitors} visitors in the last 24 hours.`)
  if (bestTool) highlights.push(`Best tool: ${bestTool.label} with ${bestTool.visitors} visitors (${bestTool.views} views).`)
  if (risingTool && risingTool !== bestTool) highlights.push(`Fastest growing: ${risingTool.label} (+${risingTool.change}%).`)
  if (traffic.referrers[0]) highlights.push(`Top traffic source: ${traffic.referrers[0].label} (${traffic.referrers[0].count} views).`)
  if (traffic.countries[0]) highlights.push(`Top country: ${traffic.countries[0].label}.`)
  const peak = traffic.hourly.indexOf(Math.max(...traffic.hourly))
  if (traffic.pageViews) highlights.push(`Busiest hour: ${String(peak).padStart(2, '0')}:00-${String((peak + 1) % 24).padStart(2, '0')}:00 Pakistan time.`)
  if (tempMail?.today?.created) highlights.push(`Temp Mail: ${tempMail.today.created} addresses and ${tempMail.today.mail_received || 0} mails today (UTC).`)

  const status = problems.some((p) => p.severity === 'high') ? 'attention' : problems.some((p) => p.severity === 'medium') ? 'watch' : 'good'

  return {
    generatedAt: now,
    period: { from: since, to: now, label: pktDateLabel(now) },
    status,
    traffic,
    previous: { visitors: prev.visitors, pageViews: prev.pageViews, sessions: prev.sessions, funnel: prev.funnel },
    changes: { visitors: visitorChange, pageViews: change(traffic.pageViews, prev.pageViews), sessions: change(traffic.sessions, prev.sessions) },
    tools,
    bestTool,
    business,
    health,
    tempMail,
    problems,
    highlights,
  }
}

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const pct = (v) => (v === null || v === undefined ? '' : `${v >= 0 ? '+' : ''}${v}%`)

/** Short HTML body for the email; the PDF carries the details. */
export function reportEmailHtml(report) {
  const statusText = { good: 'All good today', watch: 'A few things to watch', attention: 'Needs your attention' }[report.status]
  const statusColor = { good: '#16a34a', watch: '#d97706', attention: '#dc2626' }[report.status]
  const kpi = (label, value, delta) => `<td style="padding:12px;border:1px solid #e2e8f0;border-radius:10px;text-align:center"><div style="font-size:12px;color:#64748b">${esc(label)}</div><div style="font-size:22px;font-weight:700;color:#0f172a">${esc(value)}</div><div style="font-size:12px;color:${String(delta).startsWith('-') ? '#dc2626' : '#16a34a'}">${esc(delta)}</div></td>`
  const problems = report.problems.slice(0, 6).map((p) => `<li style="margin:6px 0"><b style="color:${p.severity === 'high' ? '#dc2626' : p.severity === 'medium' ? '#d97706' : '#64748b'}">${esc(p.severity.toUpperCase())}</b> ${esc(p.title)}</li>`).join('')
  return `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
<div style="max-width:620px;margin:0 auto;padding:24px">
<div style="background:#0f172a;color:#fff;border-radius:14px;padding:20px 22px">
<div style="font-size:12px;letter-spacing:2px;color:#93c5fd">NEXORA DAILY REPORT</div>
<div style="font-size:20px;font-weight:700;margin-top:4px">${esc(report.period.label)}</div>
<div style="margin-top:10px;display:inline-block;background:${statusColor};border-radius:999px;padding:4px 12px;font-size:13px">${esc(statusText)}</div>
</div>
<table style="width:100%;border-spacing:8px;margin-top:12px"><tr>
${kpi('Visitors', report.traffic.visitors, pct(report.changes.visitors))}
${kpi('Page views', report.traffic.pageViews, pct(report.changes.pageViews))}
${kpi('Signups', report.traffic.funnel.signupCompleted, '')}
${kpi('Problems', report.problems.filter((p) => p.severity !== 'low').length, '')}
</tr></table>
<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px 18px;margin-top:8px">
<div style="font-weight:700">Highlights</div><ul style="padding-left:18px;margin:8px 0">${report.highlights.map((h) => `<li style="margin:4px 0">${esc(h)}</li>`).join('')}</ul>
${problems ? `<div style="font-weight:700;margin-top:10px">Problems and actions</div><ul style="padding-left:18px;margin:8px 0">${problems}</ul>` : '<div style="color:#16a34a;font-weight:700;margin-top:10px">No problems found.</div>'}
</div>
<p style="font-size:13px;color:#64748b">The full report with charts, tools ranking, business numbers and system health is attached as a PDF.</p>
</div></body></html>`
}
