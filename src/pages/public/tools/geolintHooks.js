import { useEffect, useRef, useState } from 'react'

const TONE_TEXT = { emerald: 'text-emerald-400', amber: 'text-amber-400', orange: 'text-orange-400', rose: 'text-rose-400', slate: 'text-slate-400' }

export const toneText = (tone) => TONE_TEXT[tone] || TONE_TEXT.slate

export function prefersReducedMotion() {
  try {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/** Counts up to `value` once on mount (instant under reduced motion). */
export function useCountUp(value, { duration = 1600, decimals = 1 } = {}) {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const target = Number(value)
    if (!Number.isFinite(target)) return undefined
    if (prefersReducedMotion()) {
      const id = requestAnimationFrame(() => setShown(target))
      return () => cancelAnimationFrame(id)
    }
    let raf
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      setShown(target * (1 - Math.pow(1 - t, 3)))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  const f = 10 ** decimals
  return Math.round(shown * f) / f
}

/** Flips to true one frame after mount so CSS transitions play. */
export function useMounted() {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setOn(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return on
}

/** Elapsed milliseconds while `active` (0 when idle). */
export function useElapsed(active) {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(0)
  useEffect(() => {
    if (!active) return undefined
    startRef.current = performance.now()
    const id = setInterval(() => setElapsed(performance.now() - startRef.current), 250)
    return () => {
      clearInterval(id)
      setElapsed(0)
    }
  }, [active])
  return elapsed
}
