/**
 * Where each free tool's user manual lives in the Help Center. Read by the
 * landing pages (the "User manual" button) and by tests/tool-manuals.test.mjs,
 * which checks that every target is a real help article.
 */
import { GEOLINT_HOW_PATH, GEOLINT_PATH, GEOLINT_WORDPRESS_PATH } from './geolintLaunch.js'
import { TOOLS_HUB_PATH } from './toolsLaunch.js'

export const HELP_CENTER_BASE = '/help-center'
export const GEOLINT_MANUAL_PATH = `${HELP_CENTER_BASE}/geolint`
export const TOOLS_HUB_MANUAL_PATH = `${HELP_CENTER_BASE}/free-tools`

/** Help Center path for the manual of a tool page, or null when the page has none. */
export function toolManualPath(pagePath) {
  const path = String(pagePath || '').replace(/\/+$/, '')
  if (path === TOOLS_HUB_PATH) return TOOLS_HUB_MANUAL_PATH
  if (path === GEOLINT_PATH || path === GEOLINT_HOW_PATH || path === GEOLINT_WORDPRESS_PATH) return GEOLINT_MANUAL_PATH
  if (path.startsWith('/tools/') && path.split('/').length === 3) return `${HELP_CENTER_BASE}/${path.split('/').pop()}`
  return null
}
