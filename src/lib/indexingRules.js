import { NOINDEX_PAGE_PATHS, noindexPagePaths } from '../config/noindexPages.js'
import { NOINDEX_POST_SLUGS } from '../config/noindexPosts.js'

export const NOINDEX_FOLLOW = 'noindex,follow'

function normalizePath(path) {
  return String(path || '').split(/[?#]/)[0].replace(/\/+$/, '') || '/'
}

export function isNoindexPost(slug) {
  return NOINDEX_POST_SLUGS.has(String(slug || ''))
}

/**
 * True for pages that must carry noindex,follow and stay out of the sitemap
 * (src/config/noindexPages.js, src/config/noindexPosts.js). Shared by the app
 * (DefaultSeo, PageSeo), scripts/prerender.mjs and scripts/generate-sitemap.mjs
 * so the HTML, the rendered page and the sitemap can never disagree.
 *
 * `toolsLaunched` overrides the launch switch (src/lib/toolsLaunch.js); only
 * tests pass it, everything else uses the switch's current value.
 */
export function isNoindexPath(path, { toolsLaunched } = {}) {
  const clean = normalizePath(path)
  const pages = toolsLaunched === undefined ? NOINDEX_PAGE_PATHS : noindexPagePaths(toolsLaunched)
  if (pages.has(clean)) return true
  const post = clean.match(/^\/blog\/([^/]+)$/)
  return Boolean(post && isNoindexPost(post[1]))
}
