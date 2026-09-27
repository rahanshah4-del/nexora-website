/**
 * Embeds a prerendered article in its own page so the client can render it on
 * the first paint.
 *
 * The app mounts with createRoot(), not hydrateRoot(), so React discards the
 * prerendered markup in #root and renders fresh. A static article survives that
 * because usePublishedBlogArticles() seeds from blogData.js; a CMS-only post
 * exists in neither the static list nor getBlogArticle(), so the page fell to a
 * skeleton for however long the Firestore read took — content, then grey boxes,
 * then content again. All 23 CMS-only posts did this and no static one did.
 *
 * The seed removes the gap: prerender writes the article as JSON, the hook uses
 * it as initial state, and the Firestore listener still runs to pick up edits
 * made since the build, swapping them in without a loading state.
 *
 * The blog listing pages (/blog/, /blog/category/*, /blog/page/N/, the author
 * page) get the same treatment with a compact list seed, so the listing renders
 * the full build-time article list instead of the 29 static articles plus a
 * "Loading articles..." line while Firestore answers.
 *
 * Reads are NOT destructive. The seed used to be removed on first read, but the
 * first read happens inside a render that React can throw away (the lazy route
 * chunk suspends it), and the retry then found nothing: with Firestore slow or
 * unreachable, every CMS-only post redirected to /blog. Parsed seeds are cached
 * per document instead, so every render gets the same object.
 */

export const BLOG_POST_SEED_ID = '__BLOG_POST__'
export const BLOG_LIST_SEED_ID = '__BLOG_LIST__'

// Only the fields a listing card needs. Full `sections` stay out of the list
// seed: 52 articles of body text would make every listing page ~1 MB heavier.
const LIST_SEED_FIELDS = ['slug', 'title', 'excerpt', 'category', 'tags', 'keywords', 'publishDate', 'updatedDate', 'featuredImage', 'featuredImageAlt', 'wordCount', 'order']

// U+2028 LINE SEPARATOR / U+2029 PARAGRAPH SEPARATOR. Built from char codes
// rather than written literally: they are invisible in an editor, and a literal
// one in this file is a newline waiting to happen.
const LINE_SEPARATOR = String.fromCharCode(0x2028)
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029)

// < > & can close or open markup. U+2028/U+2029 are legal inside a JSON string
// but are line terminators in JavaScript source. Replaced by their \uXXXX form
// the payload stays valid JSON — JSON.parse decodes the escapes back to the
// original characters — while being unable to express a tag.
const ESCAPES = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  [LINE_SEPARATOR]: '\\u2028',
  [PARAGRAPH_SEPARATOR]: '\\u2029',
}
const UNSAFE_IN_SCRIPT = new RegExp(`[${Object.keys(ESCAPES).join('')}]`, 'g')

/**
 * JSON for embedding inside a <script> element.
 *
 * JSON.stringify alone is not safe here: the article body is CMS-authored, so a
 * post containing "</script>" would close the element early and everything after
 * it would parse as markup.
 */
export function serializeBlogPostSeed(article) {
  return JSON.stringify(article).replace(UNSAFE_IN_SCRIPT, (char) => ESCAPES[char])
}

/** The full <script> tag to drop into the prerendered page. */
export function renderBlogPostSeedScript(article) {
  if (!article?.slug) return ''
  return `<script type="application/json" id="${BLOG_POST_SEED_ID}">${serializeBlogPostSeed(article)}</script>`
}

/** Listing-card fields only, in the order the listing already sorts them. */
export function toBlogListSeed(articles = []) {
  return articles
    .filter((article) => article?.slug)
    .map((article) => Object.fromEntries(LIST_SEED_FIELDS.filter((key) => article[key] !== undefined).map((key) => [key, article[key]])))
}

/** The <script> tag carrying the article list for the blog listing pages. */
export function renderBlogListSeedScript(articles) {
  const list = toBlogListSeed(articles)
  if (!list.length) return ''
  return `<script type="application/json" id="${BLOG_LIST_SEED_ID}">${serializeBlogPostSeed(list)}</script>`
}

// document -> { [seed element id]: parsed value or null }. A WeakMap so a test's
// fake document (or a replaced one) never leaks.
const seedCache = new WeakMap()

function readSeedJson(doc, id) {
  let perDoc = seedCache.get(doc)
  if (!perDoc) {
    perDoc = {}
    seedCache.set(doc, perDoc)
  }
  if (!(id in perDoc)) {
    let parsed
    try {
      const node = doc.getElementById(id)
      parsed = node ? JSON.parse(node.textContent || '') : null
    } catch {
      parsed = null
    }
    perDoc[id] = parsed
  }
  return perDoc[id]
}

/**
 * Reads the embedded article, but only when it is the one the route asked for —
 * a client-side navigation to a different post must not be handed the previous
 * page's data. Returns null on anything unexpected: no element, malformed JSON,
 * a slug mismatch. The caller then behaves exactly as it did before the seed
 * existed, so a bad seed degrades to the old skeleton rather than a broken page.
 *
 * Parsed from textContent with JSON.parse — never innerHTML, never eval. The
 * element is left in place and the parse is cached (see the note at the top).
 */
export function readBlogPostSeed(slug, doc = typeof document === 'undefined' ? null : document) {
  if (!slug || !doc) return null
  const parsed = readSeedJson(doc, BLOG_POST_SEED_ID)
  if (!parsed || typeof parsed !== 'object' || parsed.slug !== slug) return null
  return parsed
}

const normalizedLists = new WeakMap()

/** The embedded listing seed, or null when the page has none. */
export function readBlogListSeed(doc = typeof document === 'undefined' ? null : document) {
  if (!doc) return null
  const parsed = readSeedJson(doc, BLOG_LIST_SEED_ID)
  if (!Array.isArray(parsed) || !parsed.length) return null
  // Cards read these as arrays; a seed written before a field existed must
  // not crash the listing. Normalised once, so every call returns the same list.
  if (!normalizedLists.has(parsed)) normalizedLists.set(parsed, parsed.map((article) => ({ tags: [], keywords: [], ...article })))
  return normalizedLists.get(parsed)
}
