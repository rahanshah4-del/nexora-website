/**
 * Build-time blog article loader, shared by scripts/prerender.mjs and
 * scripts/generate-sitemap.mjs so the prerendered pages, sitemap, RSS and
 * search index are always built from the same article list.
 *
 * That list is what the live site shows: the static articles in
 * src/lib/blogData.js merged with every published post in the Firestore
 * `blogPosts` collection (the CMS at /admin/control-centre), CMS winning on a
 * slug conflict — the same mergeBlogArticles() + normalizeBlogArticleDoc() path
 * that src/lib/blogCms.js listenPublishedBlogPosts() runs in the browser.
 *
 * Before this loader existed the build only knew the static list, so a post
 * published in the CMS rendered in-app but had no dist/blog/<slug>/index.html,
 * and worker/index.js answered it with a real 404 on direct load.
 *
 * Failure behaviour: on Cloudflare's git-connected builds (Workers Builds sets
 * CI=true and WORKERS_CI=1; Pages sets CF_PAGES=1) a failed fetch or an empty
 * result fails the build, because silently falling back to the static list
 * would deploy every CMS-only post as a 404. Locally it warns and falls back
 * so offline builds still work.
 */

import { blogArticles as sourceArticles, mergeBlogArticles, normalizeBlogArticleDoc } from '../../src/lib/blogData.js'

// Translated blog pages (/ur|hi|ar|bn/blog/<slug>/), read by prerender.mjs and
// generate-sitemap.mjs from Firestore `blogTranslations`. Those documents are
// keyed to CMS post slugs, so before this loader existed the build never saw a
// matching article and never produced a translated page. Merging CMS posts in
// would switch 36 of them on at once, along with hreflang on their English
// pages and sitemap entries for /<lang>/blog/ index pages that are never
// generated (worker/index.js 404s them). The Urdu script question in
// prerender.mjs ML_LANGS is still open, so translated output stays off until
// that is decided; flipping this re-enables it in both scripts together.
export const BLOG_TRANSLATIONS_ENABLED = false

const PROJECT_ID = 'nexora-business-suite'
// Public web API key (same one prerender.mjs / generate-sitemap.mjs already use
// for `blogTranslations`). firestore.rules lets anyone read a `blogPosts`
// document whose status is 'published', so no service account is needed.
const API_KEY = 'AIzaSyDOdQnY-Vjkwdl-0F7FnuVjVB-tAO-cnWc'
const RUN_QUERY_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery?key=${API_KEY}`
const PAGE_SIZE = 100
const MAX_PAGES = 50
const REQUEST_TIMEOUT_MS = 20000
const MAX_ATTEMPTS = 3

function isSet(value) {
  return Boolean(value) && !['0', 'false'].includes(String(value).toLowerCase())
}

export function isCiBuild(env = process.env) {
  return isSet(env.WORKERS_CI) || isSet(env.CF_PAGES) || isSet(env.CI)
}

// Firestore REST typed value → plain JS. Timestamps become ISO strings, which
// normalizeBlogArticleDoc's dateString() parses the same way it parses the
// SDK's Timestamp objects in the browser.
function decodeValue(value = {}) {
  if ('stringValue' in value) return value.stringValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return value.doubleValue
  if ('booleanValue' in value) return value.booleanValue
  if ('nullValue' in value) return null
  if ('timestampValue' in value) return value.timestampValue
  if ('referenceValue' in value) return value.referenceValue
  if ('bytesValue' in value) return value.bytesValue
  if ('geoPointValue' in value) return value.geoPointValue
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decodeValue)
  if ('mapValue' in value) return decodeFields(value.mapValue.fields)
  return undefined
}

function decodeFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]))
}

async function postWithRetry(body) {
  let lastError
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(RUN_QUERY_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      const text = await response.text()
      if (!response.ok) throw new Error(`Firestore runQuery HTTP ${response.status}: ${text.slice(0, 300)}`)
      return JSON.parse(text)
    } catch (err) {
      lastError = err
      if (attempt < MAX_ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** (attempt - 1)))
    }
  }
  throw lastError
}

// runQuery has no pageToken; it pages with a cursor instead: order by document
// name and start each page after the last document of the previous one.
export async function fetchPublishedCmsDocs() {
  const docs = []
  let cursor = null
  for (let page = 0; page < MAX_PAGES; page++) {
    const structuredQuery = {
      from: [{ collectionId: 'blogPosts' }],
      where: { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'published' } } },
      orderBy: [{ field: { fieldPath: '__name__' }, direction: 'ASCENDING' }],
      limit: PAGE_SIZE,
    }
    if (cursor) structuredQuery.startAt = { values: [{ referenceValue: cursor }], before: false }

    const rows = await postWithRetry({ structuredQuery })
    const rowError = rows.find((row) => row.error)
    if (rowError) throw new Error(`Firestore runQuery error: ${JSON.stringify(rowError.error).slice(0, 300)}`)

    const pageDocs = rows.filter((row) => row.document).map((row) => row.document)
    for (const document of pageDocs) {
      docs.push({ id: document.name.split('/').pop(), data: decodeFields(document.fields) })
    }
    if (pageDocs.length < PAGE_SIZE) return docs
    cursor = pageDocs[pageDocs.length - 1].name
  }
  throw new Error(`Firestore runQuery returned more than ${MAX_PAGES * PAGE_SIZE} published posts; raise MAX_PAGES`)
}

// The static list: src/lib/blogData.js decides WHICH static articles exist and
// their metadata (it is what the live site merges with); the AI-highlighted
// copy in src/lib/blogData.highlighted.js contributes only its `sections`, the
// one field scripts/aiHighlight.js rewrites — its other fields are a snapshot
// that goes stale (e.g. canonicals from before the trailing-slash change).
// Keying off blogData.js means a static article added there but not yet
// re-highlighted still gets built.
export async function loadStaticBlogArticles() {
  let highlighted = []
  try {
    highlighted = (await import('../../src/lib/blogData.highlighted.js')).blogArticles || []
  } catch {
    // No highlighted copy — plain blogData.js content is used throughout.
  }
  const highlightedBySlug = new Map(highlighted.map((article) => [article.slug, article]))
  const articles = sourceArticles.map((article) => {
    const sections = highlightedBySlug.get(article.slug)?.sections
    return sections?.length ? { ...article, sections } : article
  })
  return {
    articles: articles.filter((a) => a.slug && a.title),
    highlightedCount: articles.filter((a) => highlightedBySlug.has(a.slug)).length,
  }
}

/**
 * Returns the merged article list (static + published CMS posts), sorted the
 * way mergeBlogArticles sorts it for the live /blog page.
 * @param {{ label?: string }} options  label prefixes every log line.
 */
export async function loadBlogArticles({ label = '[blog]' } = {}) {
  const strict = isCiBuild()
  const { articles: staticArticles, highlightedCount } = await loadStaticBlogArticles()
  const staticSlugs = new Set(staticArticles.map((a) => a.slug))

  let cmsArticles = []
  let failure = null
  try {
    const docs = await fetchPublishedCmsDocs()
    cmsArticles = docs
      .map(({ id, data }) => normalizeBlogArticleDoc(id, data))
      .filter((a) => a.slug && a.title)
    if (!cmsArticles.length) failure = 'Firestore returned 0 published blogPosts'
  } catch (err) {
    failure = `could not fetch published blogPosts from Firestore: ${err?.cause?.code || err?.message || err}`
  }

  if (failure) {
    if (strict) {
      throw new Error(`${label} ✗ ${failure}. Refusing to build: without the CMS posts every one of them would deploy as a 404. (CI build detected via CI / WORKERS_CI / CF_PAGES.)`)
    }
    console.warn('')
    console.warn(`${label} ⚠⚠⚠ ${failure}`)
    console.warn(`${label} ⚠⚠⚠ LOCAL BUILD — falling back to the ${staticArticles.length} static articles only. CMS-only posts will be MISSING from this build (they would 404). Do not deploy this output.`)
    console.warn('')
    cmsArticles = []
  }

  const merged = mergeBlogArticles(cmsArticles, staticArticles)
  const cmsOnly = cmsArticles.filter((a) => !staticSlugs.has(a.slug)).map((a) => a.slug)
  const overridden = cmsArticles.filter((a) => staticSlugs.has(a.slug)).length

  console.log(`${label} Blog articles — static: ${staticArticles.length} (${highlightedCount} AI-highlighted), CMS published: ${cmsArticles.length} (${overridden} override a static slug), merged total: ${merged.length}`)
  if (cmsOnly.length) {
    console.log(`${label} CMS-only slugs (${cmsOnly.length}):`)
    for (const slug of cmsOnly.sort()) console.log(`${label}   /blog/${slug}/`)
  }
  return merged
}
