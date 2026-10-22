import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '../../utils/cn.js'

const styles = {
  base: 'focus-ring inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-[13px] font-bold transition-all duration-200 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
  primary:
    'bg-slate-950 text-white shadow-sm hover:bg-slate-800 hover:shadow-md active:bg-slate-900',
  ghost:
    'text-slate-600 hover:bg-slate-100 hover:text-slate-950 active:bg-slate-200',
  subtle:
    'border border-slate-200/60 bg-white/80 text-slate-700 shadow-sm backdrop-blur-sm hover:border-slate-300 hover:bg-white hover:shadow-md active:bg-slate-50',
}

// A submit button clicked twice inside this window is a double click, never two
// intentional submissions.
const SUBMIT_DEBOUNCE_MS = 700

/**
 * Double-click protection for every <Button>.
 *
 * - If onClick returns a promise (an async save / pay / delete handler), the
 *   button ignores further clicks and shows disabled until it settles. The lock
 *   is a ref, so it also stops a second click that lands before React re-renders.
 * - A type="submit" button also ignores a second click within 700 ms, which covers
 *   handlers that start async work without returning the promise.
 * Plain synchronous handlers (counters, toggles, steppers) are untouched.
 */
export default function Button({
  variant = 'primary',
  className,
  onClick,
  disabled,
  type,
  ...props
}) {
  const lockRef = useRef(false)
  const lastClickRef = useRef(0)
  const mountedRef = useRef(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const handleClick = useCallback(
    (event) => {
      if (!onClick) return undefined
      if (lockRef.current) {
        event?.preventDefault?.()
        return undefined
      }
      if (type === 'submit') {
        const now = Date.now()
        if (now - lastClickRef.current < SUBMIT_DEBOUNCE_MS) {
          event?.preventDefault?.()
          return undefined
        }
        lastClickRef.current = now
      }
      const result = onClick(event)
      if (result && typeof result.then === 'function') {
        lockRef.current = true
        setBusy(true)
        const release = () => {
          lockRef.current = false
          if (mountedRef.current) setBusy(false)
        }
        result.then(release, release)
      }
      return result
    },
    [onClick, type],
  )

  return (
    <button
      className={cn(styles.base, styles[variant], className)}
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      onClick={onClick ? handleClick : undefined}
      {...props}
    />
  )
}
