import { AnimatePresence, motion } from 'framer-motion'
import { useRef, useState } from 'react'
import { useOnClickOutside } from '../../hooks/useOnClickOutside.js'
import { cn } from '../../utils/cn.js'

export default function Dropdown({ align = 'right', trigger, children, onOpenChange, className, panelClassName }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useOnClickOutside(ref, () => {
    setOpen(false)
    onOpenChange?.(false)
  })

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
            className={cn(
              'glass absolute top-full z-50 mt-2 w-56 max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-5rem)] overflow-x-hidden overflow-y-auto rounded-2xl p-1',
              align === 'right' ? 'right-0' : 'left-0',
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
