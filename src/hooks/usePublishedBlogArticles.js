import { useEffect, useState } from 'react'
import { blogArticles, mergeBlogArticles } from '../lib/blogData.js'
import { listenPublishedBlogPosts } from '../lib/blogCms.js'
import { readBlogPostSeed } from '../lib/blogPostSeed.js'

/**
 * @param {string} [seedSlug] - On an article route, the slug being rendered. When
 *   the prerendered page embedded that article (see blogPostSeed.js) it becomes
 *   the initial state and `loading` starts false, so the page paints the article
 *   immediately instead of a skeleton. Omit it (the blog index) for the old
 *   behaviour. Passing a slug with no matching seed also keeps the old behaviour,
 *   which is what makes client-side navigation to an uncached post still show the
 *   skeleton rather than redirecting away from a post that does exist.
 */
export default function usePublishedBlogArticles(seedSlug = '') {
  const [seed] = useState(() => readBlogPostSeed(seedSlug))
  const [articles, setArticles] = useState(() => (seed ? mergeBlogArticles([seed]) : blogArticles))
  const [loading, setLoading] = useState(() => !seed)
  const [error, setError] = useState('')

  useEffect(() => {
    // The listener runs even when seeded: the build's copy can be older than the
    // CMS, so newer content swaps in silently once Firestore answers.
    if (!seed) setLoading(true)
    return listenPublishedBlogPosts(
      (rows) => {
        const next = rows.length ? rows : blogArticles
        // listenPublishedBlogPosts falls back to the static list when the read
        // fails, which for a CMS-only post would drop the article the reader is
        // looking at and bounce them to /blog. Keep the seed unless the live
        // data actually carries that slug, in which case the live copy wins.
        setArticles(seed && !next.some((item) => item.slug === seed.slug) ? mergeBlogArticles([seed], next) : next)
        setLoading(false)
      },
      (loadError) => {
        setError(loadError?.message || 'Using static blog fallback.')
        setLoading(false)
      },
    )
  }, [seed])

  return { articles, loading, error }
}
