/**
 * Blog Multilingual SEO — Language Configuration
 *
 * Single source of truth for all language codes, URL prefixes,
 * hreflang values, HTML lang attributes, and OG locale strings.
 */

// `htmlLang` / `hreflang` here MUST match the tags scripts/prerender.mjs bakes
// into the prerendered HTML (its ML_LANGS list): PageSeo removes every static
// hreflang link on hydration and re-adds the map built from this table, so any
// disagreement means the served page and the hydrated page advertise different
// alternates for the same URL. Two entries were out of step and are fixed here:
//   - ur-roman is Urdu transliterated into LATIN script, so it is "ur-Latn"
//     (LTR), not "ur"/"ur-PK" — see the RTL note in scripts/prerender.mjs.
//     The /ur/ homepage, which really is Arabic-script Urdu, is a separate
//     hreflang group and keeps plain "ur".
//   - hi/ar/bn carry no region: the content is not India- or Bangladesh-
//     specific, and "hi-IN" would exclude Hindi readers everywhere else.
export const BLOG_SEO_LANGUAGES = [
  { code: 'en',       urlPrefix: '',   htmlLang: 'en',      ogLocale: 'en_PK', hreflang: 'en',      xDefault: true,  label: 'English' },
  { code: 'ur-roman', urlPrefix: 'ur', htmlLang: 'ur-Latn', ogLocale: 'ur_PK', hreflang: 'ur-Latn', xDefault: false, label: 'Roman Urdu' },
  { code: 'hi',       urlPrefix: 'hi', htmlLang: 'hi',      ogLocale: 'hi_IN', hreflang: 'hi',      xDefault: false, label: 'हिन्दी (Hindi)' },
  { code: 'ar',       urlPrefix: 'ar', htmlLang: 'ar',      ogLocale: 'ar_AE', hreflang: 'ar',      xDefault: false, label: 'العربية (Arabic)' },
  { code: 'bn',       urlPrefix: 'bn', htmlLang: 'bn',      ogLocale: 'bn_BD', hreflang: 'bn',      xDefault: false, label: 'বাংলা (Bengali)' },
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
  // No translated sibling means no hreflang group, so emit nothing — matching
  // buildHreflangBlock() in scripts/prerender.mjs, which returns an empty block
  // in the same case. Both generators must agree: PageSeo clears every static
  // hreflang link on hydration and re-adds whatever this returns, so a lone
  // self-referencing "en" here would reintroduce a one-page "group" that the
  // served HTML does not have. Today this is every article — the translated
  // blog was retired (its Firestore documents are keyed to a previous
  // generation of slugs), and /<lang>/blog/<slug>/ URLs now 404, so advertising
  // them as alternates would point crawlers at dead pages.
  const translated = (availableCodes || []).filter((c) => c !== 'en')
  if (availableCodes && !translated.length) return {}

  const map = {}
  for (const lang of BLOG_SEO_LANGUAGES) {
    if (availableCodes && !availableCodes.includes(lang.code)) continue
    const href = buildLocalizedCanonical(slug, lang.code)
    // x-default is an ADDITIONAL tag, not a replacement for the language's own
    // self-reference. Emitting only x-default for English (as this did) left
    // the group without an hreflang="en" entry, so the English page was an
    // alternate nobody named — while prerender.mjs emitted both. Every page in
    // a reciprocal group must appear under its own language tag.
    if (lang.xDefault) map['x-default'] = href
    map[lang.hreflang] = href
  }
  return map
}
