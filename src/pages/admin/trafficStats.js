/**
 * Website traffic numbers for the admin Visitor Analytics tab (pure: no
 * Firebase or React). Works on the analyticsEvents rows the dashboard loads
 * for a time window, and says honestly when the window is capped.
 */
export const TRAFFIC_WINDOW_DAYS = 30
export const TRAFFIC_EVENT_LIMIT = 3000

const toMs = (value) => {
  const date = value?.toDate?.() || (value ? new Date(value) : null)
  const ms = date ? date.getTime() : NaN
  return Number.isNaN(ms) ? 0 : ms
}

export const eventTime = (row = {}) => toMs(row.timestamp || row.createdAt)

const CLICKS = new Set(['button_click', 'module_click', 'pricing_click', 'start_free_trial_click'])

function dayKey(ms) {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function topN(map, n = 8) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([label, count]) => ({ label, count }))
}

function hostOf(referrer) {
  if (!referrer) return 'Direct / none'
  try {
    return new URL(referrer).hostname.replace(/^www\./, '') || 'Direct / none'
  } catch {
    return 'Direct / none'
  }
}

export function buildTrafficStats(events = [], { now = Date.now(), days = TRAFFIC_WINDOW_DAYS, limit = TRAFFIC_EVENT_LIMIT, trendDays = 14 } = {}) {
  const todayKey = dayKey(now)
  const visitors = new Set()
  const todayVisitors = new Set()
  const sessions = new Set()
  const liveSessions = new Set()
  const pages = new Map()
  const devices = new Map()
  const referrers = new Map()
  const trend = new Map()
  for (let i = trendDays - 1; i >= 0; i -= 1) trend.set(dayKey(now - i * 86400000), { views: 0, visitors: new Set() })
  let pageViews = 0
  let clicksToday = 0
  let signupStarted = 0
  let signupCompleted = 0
  let loginCompleted = 0
  let oldest = 0

  events.forEach((row) => {
    const ms = eventTime(row)
    if (ms && (!oldest || ms < oldest)) oldest = ms
    if (row.visitorId) visitors.add(row.visitorId)
    if (row.sessionId) sessions.add(row.sessionId)
    const key = ms ? dayKey(ms) : ''
    if (key === todayKey && row.visitorId) todayVisitors.add(row.visitorId)
    if (ms && now - ms <= 5 * 60 * 1000) liveSessions.add(row.sessionId || row.visitorId)
    if (row.eventType === 'page_view') {
      pageViews += 1
      pages.set(row.page || '(unknown)', (pages.get(row.page || '(unknown)') || 0) + 1)
      if (row.deviceType) devices.set(row.deviceType, (devices.get(row.deviceType) || 0) + 1)
      const host = hostOf(row.referrer)
      if (!/nexorasolution\.online$/.test(host)) referrers.set(host, (referrers.get(host) || 0) + 1)
      const bucket = trend.get(key)
      if (bucket) {
        bucket.views += 1
        if (row.visitorId) bucket.visitors.add(row.visitorId)
      }
    }
    if (CLICKS.has(row.eventType) && key === todayKey) clicksToday += 1
    if (row.eventType === 'signup_started') signupStarted += 1
    if (row.eventType === 'signup_completed') signupCompleted += 1
    if (row.eventType === 'login_completed') loginCompleted += 1
  })

  const capped = events.length >= limit
  return {
    events: events.length,
    pageViews,
    uniqueVisitors: visitors.size,
    visitorsToday: todayVisitors.size,
    sessions: sessions.size,
    activeNow: liveSessions.size,
    clicksToday,
    signupStarted,
    signupCompleted,
    loginCompleted,
    dropOffs: Math.max(0, signupStarted - signupCompleted),
    topPages: topN(pages),
    devices: topN(devices, 3),
    referrers: topN(referrers, 6),
    trend: [...trend.entries()].map(([date, v]) => ({ date, views: v.views, visitors: v.visitors.size })),
    windowDays: days,
    capped,
    // When capped, the loaded events only reach back to `oldest`; say so.
    coverageSince: capped && oldest ? oldest : 0,
  }
}
