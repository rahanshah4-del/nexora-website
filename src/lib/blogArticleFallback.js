/**
 * What BlogArticlePage does when the requested article is not in memory.
 *
 *   'show'     — the article is available.
 *   'wait'     — Firestore may still deliver it (skeleton).
 *   'reload'   — the reader arrived by in-app navigation: a full load of the
 *                URL serves the prerendered page, which embeds the article.
 *   'notFound' — this document was loaded for this very URL and still has no
 *                article, so a reload would only repeat itself.
 *
 * Loop safety: 'reload' requires the document's own URL (the navigation entry,
 * fixed when the document loaded) to differ from the route. After the reload
 * the new document IS that URL, so the same inputs can only give 'notFound'.
 * With no navigation entry at all, it also falls to 'notFound' — never a reload.
 */

export function normalizePath(path) {
  return String(path || '').replace(/\/+$/, '') || '/'
}

/** Path of the URL this document was loaded for, or '' when unknown. */
export function documentLoadPath(perf = typeof performance === 'undefined' ? null : performance) {
  try {
    const entry = perf?.getEntriesByType?.('navigation')?.[0]
    return entry?.name ? new URL(entry.name).pathname : ''
  } catch {
    return ''
  }
}

export function resolveMissingArticle({ hasArticle, loading, waitedOut, routePath, documentPath }) {
  if (hasArticle) return 'show'
  if (loading && !waitedOut) return 'wait'
  if (documentPath && normalizePath(documentPath) !== normalizePath(routePath)) return 'reload'
  return 'notFound'
}
