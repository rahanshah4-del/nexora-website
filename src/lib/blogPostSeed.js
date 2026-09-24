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
 */

export const BLOG_POST_SEED_ID = '__BLOG_POST__'

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

/**
 * Reads the embedded article, but only when it is the one the route asked for —
 * a client-side navigation to a different post must not be handed the previous
 * page's data. Returns null on anything unexpected: no element, malformed JSON,
 * a slug mismatch. The caller then behaves exactly as it did before the seed
 * existed, so a bad seed degrades to the old skeleton rather than a broken page.
 *
 * Parsed from textContent with JSON.parse — never innerHTML, never eval.
 */
export function readBlogPostSeed(slug, doc = typeof document === 'undefined' ? null : document) {
  if (!slug || !doc) return null
  const node = doc.getElementById(BLOG_POST_SEED_ID)
  if (!node) return null
  let parsed
  try {
    parsed = JSON.parse(node.textContent || '')
  } catch {
    return null
  }
  if (!parsed || parsed.slug !== slug) return null
  // Consumed: later navigations read from Firestore, not from a stale document.
  node.remove()
  return parsed
}
