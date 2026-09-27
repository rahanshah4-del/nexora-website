import { useEffect, useMemo, useState } from 'react'
import { blogArticles, mergeBlogArticles } from '../lib/blogData.js'
import { listenPublishedBlogPosts } from '../lib/blogCms.js'
import { readBlogListSeed, readBlogPostSeed } from '../lib/blogPostSeed.js'

/**
 * @param {string} [seedSlug] - On an article route, the slug being rendered. When
 *   the prerendered page embedded that article (see blogPostSeed.js) it is part
 *   of the returned list on every render and `loading` is false, so the page
 *   paints the article immediately and keeps it whatever Firestore does. Passing
 *   a slug with no matching seed (a client-side navigation to a post) keeps the
 *   old behaviour: `loading` until Firestore answers.
 *
 * Listing pages (no slug) start from the embedded list seed when the page has
 * one, so they show the full build-time list instead of the static articles
 * plus a loading state.
 */
export default function usePublishedBlogArticles(seedSlug = '') {
  const seed = useMemo(() => readBlogPostSeed(seedSlug), [seedSlug])
  // Listing pages only: the list seed holds card fields without article bodies,
  // and after an in-app navigation from /blog/ it is still in the document, so
  // an article route must never take its article from it.
  const [listSeed] = useState(() => (seedSlug ? null : readBlogListSeed()))
  // null until Firestore delivers a real answer.
  const [liveArticles, setLiveArticles] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let failed = false
    return listenPublishedBlogPosts(
      (rows) => {
        // After a failed read, listenPublishedBlogPosts hands over the static
        // list as a fallback. A page with a list seed already shows a fuller,
        // build-time list, so the fallback must not replace it (it would drop
        // every CMS-only post from the listing).
        if (failed && listSeed) return
        setLiveArticles(rows.length ? rows : blogArticles)
      },
      (loadError) => {
        failed = true
        setError(loadError?.message || 'Using static blog fallback.')
      },
    )
  }, [listSeed])

  const articles = useMemo(() => {
    const base = liveArticles || listSeed || blogArticles
    // The live data wins when it carries the seeded slug; otherwise the seed is
    // merged in, so an unreachable or not-yet-answered Firestore can never make
    // a prerendered post disappear (and redirect the reader away).
    return seed && !base.some((item) => item.slug === seed.slug) ? mergeBlogArticles([seed], base) : base
  }, [liveArticles, listSeed, seed])

  return { articles, loading: !liveArticles && !seed && !listSeed && !error, error }
}
