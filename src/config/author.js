/**
 * The author shown on every blog post (byline, author box, Article JSON-LD) and
 * on /author/. One file, read by the app, scripts/prerender.mjs and the sitemap.
 *
 * The author is a real person (the founder), so the JSON-LD emits
 * "@type": "Person" with jobTitle and worksFor (see authorPersonSchema in
 * scripts/prerender.mjs and createArticleSchema in src/lib/seoStructuredData.js).
 * The organization stays the publisher. Only state facts the founder confirmed.
 */
export const AUTHOR_PAGE_PATH = '/author/'

export const author = {
  name: 'Rahan Shah',
  role: 'Founder & CEO, Nexora Solution',
  jobTitle: 'Founder & CEO',
  // Real photo to be added later (path under /public). Until then the avatar
  // falls back to the name's first initial.
  photo: '',
  emoji: '',
  // Verified profile URLs (e.g. LinkedIn) go here; emitted as Person.sameAs.
  sameAs: [],
  bio: 'Rahan Shah founded Nexora Solution and builds its POS, ERP and CRM platform himself, from the restaurant POS desktop app to the school ERP. He writes about what he learns implementing software for real businesses.',
}

const isPlaceholder = (value) => !String(value || '').trim() || /^TODO\b/i.test(String(value).trim())

/** Fields still holding placeholders (photo is optional). */
export function missingAuthorFields(profile = author) {
  return ['name', 'role', 'bio'].filter((key) => isPlaceholder(profile[key]))
}

export function isAuthorConfigured(profile = author) {
  return missingAuthorFields(profile).length === 0
}
