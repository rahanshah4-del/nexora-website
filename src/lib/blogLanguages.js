/**
 * Blog Multilingual SEO — Language Configuration
 *
 * Single source of truth for all language codes, URL prefixes,
 * hreflang values, HTML lang attributes, and OG locale strings.
 */

export const BLOG_SEO_LANGUAGES = [
  { code: 'en',       urlPrefix: '',   htmlLang: 'en', ogLocale: 'en_PK', hreflang: 'en',    xDefault: true,  label: 'English' },
  { code: 'ur-roman', urlPrefix: 'ur', htmlLang: 'ur', ogLocale: 'ur_PK', hreflang: 'ur-PK', xDefault: false, label: 'Roman Urdu' },
  { code: 'hi',       urlPrefix: 'hi', htmlLang: 'hi', ogLocale: 'hi_IN', hreflang: 'hi-IN', xDefault: false, label: 'हिन्दी (Hindi)' },
  { code: 'ar',       urlPrefix: 'ar', htmlLang: 'ar', ogLocale: 'ar_AE', hreflang: 'ar',    xDefault: false, label: 'العربية (Arabic)' },
  { code: 'bn',       urlPrefix: 'bn', htmlLang: 'bn', ogLocale: 'bn_BD', hreflang: 'bn',    xDefault: false, label: 'বাংলা (Bengali)' },
]

const BY_CODE = Object.fromEntries(BLOG_SEO_LANGUAGES.map(l => [l.code, l]))
const BY_PREFIX = Object.fromEntries(BLOG_SEO_LANGUAGES.map(l => [l.urlPrefix, l]))

export function getLangConfig(code) { return BY_CODE[code] || BY_CODE['en'] }
export function getLangByUrlPrefix(prefix) { return BY_PREFIX[prefix] || BY_PREFIX[''] }

/**
 * Extract language code and remaining path from a URL pathname.
 * e.g. "/ur/blog/slug" → { langCode: "ur-roman", remainingPath: "/blog/slug" }
 *      "/blog/slug"    → { langCode: "en", remainingPath: "/blog/slug" }
 */
export function extractLangFromPath(pathname) {
  const path = String(pathname || '/')
  for (const lang of BLOG_SEO_LANGUAGES) {
    if (lang.urlPrefix && path.startsWith(`/${lang.urlPrefix}/`)) {
      return { langCode: lang.code, remainingPath: path.slice(lang.urlPrefix.length + 1) }
    }
  }
  return { langCode: 'en', remainingPath: path }
}

/**
 * Build a localized URL path for a blog article.
 * en → "/blog/slug", ur-roman → "/ur/blog/slug"
 */
export function buildLocalizedPath(slug, langCode = 'en') {
  const cfg = getLangConfig(langCode)
  const prefix = cfg.urlPrefix ? `/${cfg.urlPrefix}` : ''
  return `${prefix}/blog/${slug}`
}

/**
 * Build a full canonical URL for a blog article.
 */
export function buildLocalizedCanonical(slug, langCode = 'en') {
  const base = 'https://nexorasolution.online'
  // Trailing slash matches the sitemap + prerendered HTML exactly (…/blog/<slug>/).
  return `${base}${buildLocalizedPath(slug, langCode)}/`
}

/**
 * Build a localized blog index path.
 */
export function buildLocalizedBlogIndex(langCode = 'en') {
  const cfg = getLangConfig(langCode)
  const prefix = cfg.urlPrefix ? `/${cfg.urlPrefix}` : ''
  return `${prefix}/blog`
}

/**
 * Check if a pathname is a blog page (with or without language prefix).
 */
export function isBlogPath(pathname) {
  const path = String(pathname || '/')
  if (path === '/blog' || path.startsWith('/blog/')) return true
  for (const lang of BLOG_SEO_LANGUAGES) {
    if (lang.urlPrefix && (path === `/${lang.urlPrefix}/blog` || path.startsWith(`/${lang.urlPrefix}/blog/`))) {
      return true
    }
  }
  return false
}

/**
 * Get Hreflang map for a slug. Pass `availableCodes` (from
 * getAvailableTranslationLangs() in blogTranslate.js) to only advertise
 * languages that actually have a real, distinct translated page — an
 * hreflang entry pointing at a language with no real content just becomes
 * a "hreflang to redirect/broken page" report with no reciprocal page to
 * link back. Omit it to get every configured language (used server-side by
 * prerender.mjs, which computes its own real availability separately).
 */
export function getHreflangMap(slug, availableCodes = null) {
  const map = {}
  for (const lang of BLOG_SEO_LANGUAGES) {
    if (availableCodes && !availableCodes.includes(lang.code)) continue
    const key = lang.xDefault ? 'x-default' : lang.hreflang
    map[key] = buildLocalizedCanonical(slug, lang.code)
  }
  return map
}
