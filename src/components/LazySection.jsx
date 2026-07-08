import { Suspense, useEffect, useRef, useState } from 'react'

/**
 * Renders a placeholder with the given id for anchor-link support.
 * When the placeholder nears the viewport, the lazy component is loaded.
 * Once loaded, the real component replaces the placeholder.
 */
export default function LazySection({ id, load, placeholder }) {
  const [loaded, setLoaded] = useState(false)
  const [Component, setComponent] = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLoaded(true)
          observer.disconnect()
        }
      },
      { rootMargin: '300px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!loaded) return
    load().then((mod) => setComponent(() => mod.default))
  }, [loaded, load])

  return <div ref={ref} id={id}>{Component ? <Suspense fallback={null}><Component /></Suspense> : (placeholder || null)}</div>
}
