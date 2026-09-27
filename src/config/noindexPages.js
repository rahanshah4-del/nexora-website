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
 */
export const NOINDEX_PAGE_PATHS = new Set([
  '/solutions/email-marketing',
  '/solutions/inventory-management',
  '/solutions/property-erp',
  '/solutions/reports',
  '/solutions/reports-analytics',
  '/solutions/team-permissions',
  '/reviews',
])
