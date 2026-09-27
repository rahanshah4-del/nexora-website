/**
 * The author shown on every blog post (byline, author box, Article JSON-LD) and
 * on /author/. One file, read by the app, scripts/prerender.mjs and the sitemap.
 *
 * TODO(owner): replace every placeholder below with the real person before
 * deploying. Until then the Cloudflare (CI) build stops with a message naming
 * this file, so "TODO" can never reach the live site, and /author/ stays
 * noindex and out of the sitemap.
 */
export const AUTHOR_PAGE_PATH = '/author/'

export const author = {
  // TODO(owner): the author's real full name.
  name: 'TODO: Author name',
  // TODO(owner): role or job title, e.g. "Product Lead, Nexora Solution".
  role: 'TODO: Author role',
  // TODO(owner): a real photo, e.g. '/authors/firstname-lastname.jpg' placed in
  // public/authors/. Left empty, the author box shows the name's initial.
  photo: '',
  // TODO(owner): two or three sentences on who the author is and their
  // first-hand experience with the software and businesses the blog covers.
  bio: 'TODO: Short author bio.',
}

const isPlaceholder = (value) => !String(value || '').trim() || /^TODO\b/i.test(String(value).trim())

/** Fields still holding placeholders (photo is optional). */
export function missingAuthorFields(profile = author) {
  return ['name', 'role', 'bio'].filter((key) => isPlaceholder(profile[key]))
}

export function isAuthorConfigured(profile = author) {
  return missingAuthorFields(profile).length === 0
}
