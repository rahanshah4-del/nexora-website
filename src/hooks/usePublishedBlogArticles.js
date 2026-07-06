import { useEffect, useState } from 'react'
import { blogArticles } from '../lib/blogData.js'
import { listenPublishedBlogPosts } from '../lib/blogCms.js'

export default function usePublishedBlogArticles() {
  const [articles, setArticles] = useState(blogArticles)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    return listenPublishedBlogPosts(
      (rows) => {
        setArticles(rows.length ? rows : blogArticles)
        setLoading(false)
      },
      (loadError) => {
        setError(loadError?.message || 'Using static blog fallback.')
        setLoading(false)
      },
    )
  }, [])

  return { articles, loading, error }
}
