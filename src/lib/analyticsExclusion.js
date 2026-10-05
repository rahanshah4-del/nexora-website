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
