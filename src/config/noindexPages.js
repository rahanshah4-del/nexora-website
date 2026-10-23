import { TOOLS_LAUNCHED, toolsNoindexPaths } from '../lib/toolsLaunch.js'
import { TEMP_MAIL_LAUNCHED, TEMP_MAIL_PATH } from '../lib/tempMailData.js'
import { NOINDEX_COUNTRY_PATHS } from '../lib/countries.js'
import { GEOLINT_FIX_PATH, GEOLINT_HOW_PATH, GEOLINT_LAUNCHED, GEOLINT_ORDERS_PATH, GEOLINT_PATH, GEOLINT_REPORT_PATH, GEOLINT_SIGNIN_PATH, GEOLINT_WORDPRESS_PATH } from '../lib/geolintLaunch.js'

/**
 * Non-blog pages kept out of the index (noindex,follow) and out of the sitemap:
 * thin pages the audit (ADSENSE_AUDIT.md §2) flagged as near-duplicates.
 *
 * - The six /solutions/* sub-pages share 46-51% of their text with the solution
 *   landing pages through one template and have ~210-250 words of their own;
 *   /solutions/reports-analytics/ also near-duplicates /solutions/reports/.
 * - /reviews/ shared 87% of its text with /pricing/, and with no approved
 *   reviews its own content is a heading and a short intro.
 *
 * Paths without trailing slash. Remove an entry once the page has enough
 * content of its own.
 *
 * The /tools/* entries come from the launch switch (src/lib/toolsLaunch.js):
 * all of them before launch, only the share-link viewer after.
 */
const STATIC_NOINDEX_PAGE_PATHS = [
  '/solutions/email-marketing',
  '/solutions/inventory-management',
  '/solutions/reports',
  '/solutions/reports-analytics',
  '/solutions/team-permissions',
  '/reviews',
  // Client-only upgrade flow behind a login guard (UpgradeRouteGuard); worker/index.js
  // already serves it noindex, this keeps the metadata and sitemap in agreement.
  '/upgrade-business',
  // Country pages without a real local presence (src/lib/countries.js).
  ...NOINDEX_COUNTRY_PATHS,
]

/** The noindex page set for a given launch state (tests pass it explicitly). */
export function noindexPagePaths(toolsLaunched = TOOLS_LAUNCHED) {
  // GeoLint has its own switch (src/lib/geolintLaunch.js): noindex until it is live.
  // It is a /tools/* page, so it also stays hidden while the tools themselves are.
  const always = [GEOLINT_REPORT_PATH, GEOLINT_FIX_PATH, GEOLINT_ORDERS_PATH, GEOLINT_SIGNIN_PATH, GEOLINT_WORDPRESS_PATH]
  const geolint = GEOLINT_LAUNCHED && toolsLaunched ? always : [GEOLINT_PATH, GEOLINT_HOW_PATH, ...always]
  // Temp mail has its own switch (src/lib/tempMailData.js): noindex until it is live.
  const tempMail = TEMP_MAIL_LAUNCHED && toolsLaunched ? [] : [TEMP_MAIL_PATH]
  return new Set([...STATIC_NOINDEX_PAGE_PATHS, ...toolsNoindexPaths(toolsLaunched), ...geolint, ...tempMail])
}

export const NOINDEX_PAGE_PATHS = noindexPagePaths()
