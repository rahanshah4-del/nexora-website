import { AnimatePresence, motion } from 'framer-motion'
import { useLayoutEffect, useRef, useState } from 'react'
import { useOnClickOutside } from '../../hooks/useOnClickOutside.js'
import { cn } from '../../utils/cn.js'

const MOBILE_BREAKPOINT = 640 // matches Tailwind's `sm`

// `fixedOnMobile` / `anchorViewport`: anchoring the panel with `right-0`/
// `left-0` positions it relative to the trigger's own (often narrow,
// off-center) wrapper div, not the true viewport — if the trigger isn't
// right at the screen edge (e.g. the notification bell, with the profile
// menu to its right), a wide panel can render partly off the opposite side
// even though it looks "attached" to the trigger. When either prop is set,
// the panel measures the trigger's real on-screen position and switches to
// `position: fixed` with numeric top/left/right applied via inline style —
// not Tailwind arbitrary-value classes referencing a CSS var with a
// comma-separated fallback (`[var(--x,4.5rem)]`); that pattern silently
// generates no CSS at all under this project's Tailwind + lightningcss
// build; verified against the compiled output, not just believed. Inline
// styles have no such failure mode. `fixedOnMobile` applies this only below
// the `sm` breakpoint (a near-full-width panel just under the trigger);
// `anchorViewport` applies it at `sm` and up too (a compact panel
// edge-aligned with the trigger's real position instead of its wrapper's).
export default function Dropdown({ align = 'right', trigger, children, onOpenChange, className, panelClassName, fixedOnMobile = false, anchorViewport = false }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const [fixedStyle, setFixedStyle] = useState(null)

  useOnClickOutside(ref, () => {
    setOpen(false)
    onOpenChange?.(false)
  })

  useLayoutEffect(() => {
    if (!open || (!fixedOnMobile && !anchorViewport)) {
      setFixedStyle(null)
      return undefined
    }
    const measure = () => {
      const rect = ref.current?.getBoundingClientRect()
      if (!rect) return
      const isMobile = window.innerWidth < MOBILE_BREAKPOINT
      if (isMobile && fixedOnMobile) {
        setFixedStyle({ position: 'fixed', top: rect.bottom + 8, left: 12, right: 12 })
      } else if (!isMobile && anchorViewport) {
        setFixedStyle({
          position: 'fixed',
          top: rect.bottom + 8,
          ...(align === 'right'
            ? { right: Math.max(window.innerWidth - rect.right, 12) }
            : { left: Math.max(rect.left, 12) }),
        })
      } else {
        setFixedStyle(null)
      }
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [open, fixedOnMobile, anchorViewport, align])

  return (
    <div className={cn('relative', className)} ref={ref}>
      <div
        onClick={() =>
          setOpen((o) => {
            const next = !o
            onOpenChange?.(next)
            return next
          })
        }
      >
        {trigger({ open })}
      </div>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
            style={fixedStyle || undefined}
            className={cn(
              'glass z-50 max-h-[calc(100dvh-5rem)] overflow-x-hidden overflow-y-auto rounded-2xl p-1',
              fixedStyle
                ? 'w-auto max-w-[calc(100vw-1.5rem)] sm:w-56'
                : cn('absolute top-full mt-2 w-56 max-w-[calc(100vw-2rem)]', align === 'right' ? 'right-0' : 'left-0'),
              panelClassName,
            )}
          >
            {children({
              close: () => {
                setOpen(false)
                onOpenChange?.(false)
              },
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
