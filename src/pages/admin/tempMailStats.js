/**
 * Visitor numbers for the temp-mail page (/tools/temp-mail), taken from the same
 * analyticsEvents rows the Visitor Analytics tab uses. Pure: no Firebase or React.
 */
const PAGE = /^\/tools\/temp-mail(\/|$|\?)/

const toMs = (value) => {
  const date = value?.toDate?.() || (value ? new Date(value) : null)
  const ms = date ? date.getTime() : NaN
  return Number.isNaN(ms) ? 0 : ms
}
const dayKey = (ms) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const topN = (map, n) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([label, count]) => ({ label, count }))
const hostOf = (referrer) => {
  if (!referrer) return 'Direct / none'
  try { return new URL(referrer).hostname.replace(/^www\./, '') || 'Direct / none' } catch { return 'Direct / none' }
}

export function buildTempMailPageStats(events = [], { now = Date.now(), trendDays = 14 } = {}) {
  const visitors = new Set()
  const sessions = new Set()
  const todayVisitors = new Set()
  const devices = new Map()
  const referrers = new Map()
  const trend = new Map()
  for (let i = trendDays - 1; i >= 0; i -= 1) trend.set(dayKey(now - i * 86400000), { views: 0, visitors: new Set() })
  const today = dayKey(now)
  let views = 0

  for (const row of events) {
    if (row.eventType !== 'page_view' || !PAGE.test(row.page || '')) continue
    views += 1
    if (row.visitorId) visitors.add(row.visitorId)
    if (row.sessionId) sessions.add(row.sessionId)
    const ms = toMs(row.timestamp || row.createdAt)
    const key = ms ? dayKey(ms) : ''
    if (key === today && row.visitorId) todayVisitors.add(row.visitorId)
    if (row.deviceType) devices.set(row.deviceType, (devices.get(row.deviceType) || 0) + 1)
    const host = hostOf(row.referrer)
    if (!/nexorasolution\.(us|online)$/.test(host)) referrers.set(host, (referrers.get(host) || 0) + 1)
    const bucket = trend.get(key)
    if (bucket) {
      bucket.views += 1
      if (row.visitorId) bucket.visitors.add(row.visitorId)
    }
  }
  return {
    views,
    uniqueVisitors: visitors.size,
    visitorsToday: todayVisitors.size,
    sessions: sessions.size,
    devices: topN(devices, 3),
    referrers: topN(referrers, 6),
    trend: [...trend.entries()].map(([date, v]) => ({ date, views: v.views, visitors: v.visitors.size })),
  }
}
