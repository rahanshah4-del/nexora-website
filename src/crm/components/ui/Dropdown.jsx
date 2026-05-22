import { AnimatePresence, motion } from 'framer-motion'
import { useRef, useState } from 'react'
import { useOnClickOutside } from '../../hooks/useOnClickOutside.js'
import { cn } from '../../utils/cn.js'

export default function Dropdown({ align = 'right', trigger, children, onOpenChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useOnClickOutside(ref, () => {
    setOpen(false)
    onOpenChange?.(false)
  })

  return (
    <div className="relative" ref={ref}>
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
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className={cn(
              'glass absolute z-50 mt-2 w-56 overflow-hidden rounded-2xl p-1',
              align === 'right' ? 'right-0' : 'left-0',
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
