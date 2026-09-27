/**
 * Firestore paths for the AI blog knowledge store.
 *
 * These live in their own module — no network, no import.meta.env — so the
 * segment shapes can be asserted under plain Node. See
 * tests/blog-knowledge-paths.test.mjs.
 *
 * A Firestore document reference needs an EVEN number of path segments. The
 * per-post knowledge used to be written to `aiKnowledge/blogs/{slug}`, which is
 * three segments, so every getDoc/setDoc threw
 *
 *   Invalid document reference. Document references must have an even number
 *   of segments, but aiKnowledge/blogs/my-slug has 3.
 *
 * and the whole ingestion pipeline (per-post doc, global index, AI Gateway KV
 * sync) silently did nothing. Per-post docs therefore live in an `items`
 * subcollection under the `aiKnowledge/blogs` document, which keeps them in the
 * same tree as the index while staying a legal document path.
 */

export const AI_KNOWLEDGE_COLLECTION = 'aiKnowledge'

/** Collection path of the per-post knowledge docs (odd = a collection). */
export const BLOG_KNOWLEDGE_COLLECTION_PATH = [AI_KNOWLEDGE_COLLECTION, 'blogs', 'items']

/**
 * True when `slug` is usable as a single Firestore document id.
 * A slug containing '/' would add segments and bring the original bug back.
 */
export function isValidKnowledgeSlug(slug) {
  if (typeof slug !== 'string') return false
  if (slug.length === 0 || slug.length > 1500) return false
  if (slug.includes('/')) return false
  if (slug === '.' || slug === '..') return false
  return !/^__.*__$/.test(slug)
}

/** `aiKnowledge/index` — the global search index document (2 segments). */
export function aiKnowledgeIndexPath() {
  return [AI_KNOWLEDGE_COLLECTION, 'index']
}

/** `aiKnowledge/blogs/items/{slug}` — one post's knowledge document (4 segments). */
export function blogKnowledgeDocPath(slug) {
  if (!isValidKnowledgeSlug(slug)) {
    throw new Error(`Invalid blog knowledge slug: ${JSON.stringify(slug)}`)
  }
  return [...BLOG_KNOWLEDGE_COLLECTION_PATH, slug]
}
