import { TOOLS_LAUNCHED, toolsNoindexPaths } from '../lib/toolsLaunch.js'
import { NOINDEX_COUNTRY_PATHS } from '../lib/countries.js'

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
  // Country pages without a real local presence (src/lib/countries.js).
  ...NOINDEX_COUNTRY_PATHS,
]

/** The noindex page set for a given launch state (tests pass it explicitly). */
export function noindexPagePaths(toolsLaunched = TOOLS_LAUNCHED) {
  return new Set([...STATIC_NOINDEX_PAGE_PATHS, ...toolsNoindexPaths(toolsLaunched)])
}

export const NOINDEX_PAGE_PATHS = noindexPagePaths()
