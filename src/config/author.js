/**
 * The author shown on every blog post (byline, author box, Article JSON-LD) and
 * on /author/. One file, read by the app, scripts/prerender.mjs and the sitemap.
 *
 * The author is the editorial team, not an individual, so the JSON-LD emits
 * "@type": "Organization" (see authorOrganizationSchema in scripts/prerender.mjs
 * and createArticleSchema in src/lib/seoStructuredData.js). Claiming a Person
 * that does not exist is exactly what the placeholder gate was there to stop.
 */
export const AUTHOR_PAGE_PATH = '/author/'

export const author = {
  name: 'Nexora Editorial Team',
  role: 'Editorial Team, Nexora Solution',
  // No photo: a team has no portrait, and inventing a stock one would be a
  // false signal. `emoji` below stands in for it.
  photo: '',
  // Avatar when there is no photo, rendered in the same circle as one. Falls
  // back to the name's first initial when empty.
  emoji: '✍️',
  bio: 'The Nexora Editorial Team writes practical guides for Pakistani businesses on POS, inventory, CRM and ERP software. Our articles draw on hands-on experience building Nexora Solution\'s own restaurant POS, pharmacy and business management tools for local SMBs.',
}

const isPlaceholder = (value) => !String(value || '').trim() || /^TODO\b/i.test(String(value).trim())

/** Fields still holding placeholders (photo is optional). */
export function missingAuthorFields(profile = author) {
  return ['name', 'role', 'bio'].filter((key) => isPlaceholder(profile[key]))
}

export function isAuthorConfigured(profile = author) {
  return missingAuthorFields(profile).length === 0
}
