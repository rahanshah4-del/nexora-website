import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Wraps an async handler so a second call while the first is still running is
 * ignored. The lock is a ref, so it holds even when two clicks arrive before React
 * re-renders (the gap a `disabled={saving}` state alone cannot close).
 *
 *   const [save, saving] = useSingleFlight(async () => { await api.save(draft) })
 *   <button disabled={saving} onClick={save}>Save</button>
 */
export function useSingleFlight(fn) {
  const fnRef = useRef(fn)
  const lockRef = useRef(false)
  const mountedRef = useRef(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fnRef.current = fn
  })
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const run = useCallback(async (...args) => {
    if (lockRef.current) return undefined
    lockRef.current = true
    if (mountedRef.current) setBusy(true)
    try {
      return await fnRef.current(...args)
    } finally {
      lockRef.current = false
      if (mountedRef.current) setBusy(false)
    }
  }, [])

  return [run, busy]
}
