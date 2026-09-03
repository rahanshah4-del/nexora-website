import { AnimatePresence, motion } from 'framer-motion'
import { useLayoutEffect, useRef, useState } from 'react'
import { useOnClickOutside } from '../../hooks/useOnClickOutside.js'
import { cn } from '../../utils/cn.js'

// `fixedOnMobile`: below the `sm` breakpoint, anchoring the panel with
// `right-0`/`left-0` positions it relative to the (often narrow, off-center)
// trigger button rather than the viewport — if the trigger isn't right at
// the screen edge, a wide panel can hang off the opposite side. When this
// prop is set, the panel switches to `position: fixed` on mobile, anchored
// with a measured top offset just below the trigger's real on-screen
// position and constrained to the viewport width, so it can never overflow
// regardless of where the trigger sits. Desktop (`sm:`+) is unaffected.
export default function Dropdown({ align = 'right', trigger, children, onOpenChange, className, panelClassName, fixedOnMobile = false }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const [mobileTop, setMobileTop] = useState(null)

  useOnClickOutside(ref, () => {
    setOpen(false)
    onOpenChange?.(false)
  })

  useLayoutEffect(() => {
    if (!open || !fixedOnMobile) return
    const rect = ref.current?.getBoundingClientRect()
    if (rect) setMobileTop(rect.bottom + 8)
  }, [open, fixedOnMobile])

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
            style={fixedOnMobile && mobileTop != null ? { '--dd-mobile-top': `${mobileTop}px` } : undefined}
            className={cn(
              'glass z-50 max-h-[calc(100dvh-5rem)] overflow-x-hidden overflow-y-auto rounded-2xl p-1',
              fixedOnMobile
                ? 'fixed inset-x-3 top-[var(--dd-mobile-top,4.5rem)] w-auto sm:absolute sm:inset-x-auto sm:top-full sm:mt-2 sm:w-56 sm:max-w-[calc(100vw-2rem)]'
                : 'absolute top-full mt-2 w-56 max-w-[calc(100vw-2rem)]',
              (fixedOnMobile ? 'sm:' : '') + (align === 'right' ? 'right-0' : 'left-0'),
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
