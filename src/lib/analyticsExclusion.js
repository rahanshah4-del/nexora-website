// The owner/admin using the site must not count as traffic, a client, or an
// "online" user: their own clicks in /admin would otherwise show up in Visitor
// Analytics, Live Client Activity and the funnel.
import { isAdminUid } from './adminUids.js'

const ADMIN_PAGE = /^\/admin(\/|$|\?|#)/

export function isInternalAnalytics({ userId, uid, page } = {}) {
  return isAdminUid(userId || uid) || ADMIN_PAGE.test(String(page || ''))
}

export function withoutInternalAnalytics(rows = []) {
  return rows.filter((row) => !isInternalAnalytics(row))
}

// Crawlers and headless browsers (Googlebot, Lighthouse, our own prerender run)
// execute JS but are not visitors.
const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|prerender|pagespeed|preview|facebookexternalhit|bingpreview|gtmetrix|python-requests|curl\//i

export function isBotUserAgent(userAgent = '') {
  return BOT_UA.test(String(userAgent || ''))
}

// Set once the admin has used this browser, so their later visits to the public
// site (where auth has not loaded yet at the first page view) are not counted either.
export const INTERNAL_DEVICE_KEY = 'nexoraInternalDevice'

export function markInternalDevice() {
  try { window.localStorage.setItem(INTERNAL_DEVICE_KEY, '1') } catch { /* storage blocked */ }
}

export function isInternalDevice() {
  try { return window.localStorage.getItem(INTERNAL_DEVICE_KEY) === '1' } catch { return false }
}
