import { useEffect, useState, useSyncExternalStore } from 'react'

/** [callbackRef, { width, height }] of an element, kept current by ResizeObserver. */
export function useElementSize() {
  const [node, setNode] = useState(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    if (!node || typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }))
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [node])
  return [setNode, size]
}

/**
 * [callbackRef, scale]: the scale that fits a `widthPx`-wide paper into the
 * element's width (never above `max`), and optionally into `maxHeightPx`.
 */
export function useFitScale(widthPx, { max = 1, heightPx = 0, maxHeightPx = 0 } = {}) {
  const [ref, size] = useElementSize()
  if (!size.width) return [ref, 0]
  let scale = Math.min(max, size.width / widthPx)
  if (heightPx && maxHeightPx) scale = Math.min(scale, maxHeightPx / heightPx)
  return [ref, scale]
}

/** Object URL for a stored asset (logo), revoked when it changes or unmounts. */
export function useAssetUrl(repo, id) {
  const [entry, setEntry] = useState({ id: null, url: null })
  useEffect(() => {
    if (!id || !repo) return undefined
    let cancelled = false
    let url = null
    repo.getAsset(id).then((asset) => {
      if (cancelled || !asset?.blob) return
      url = URL.createObjectURL(asset.blob)
      setEntry({ id, url })
    }).catch(() => {})
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [repo, id])
  return id && entry.id === id ? entry.url : null
}

function subscribeReducedMotion(callback) {
  const query = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')
  query?.addEventListener?.('change', callback)
  return () => query?.removeEventListener?.('change', callback)
}

/** True when the visitor asked the OS for reduced motion. */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
    () => false,
  )
}
