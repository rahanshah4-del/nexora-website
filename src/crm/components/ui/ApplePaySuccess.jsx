import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HiOutlineCheck } from 'react-icons/hi2'

export default function ApplePaySuccess({ show, duration = 2000, onDone }) {
  const [visible, setVisible] = useState(false)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    if (!show) return
    setVisible(true)
    const timer = setTimeout(() => {
      setVisible(false)
      onDoneRef.current?.()
    }, duration)
    return () => clearTimeout(timer)
  }, [show, duration])

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className="pointer-events-none fixed bottom-4 left-4 z-[100]"
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200/60 bg-white/95 px-4 py-3 shadow-[0_12px_40px_-12px_rgba(16,185,129,0.35)] backdrop-blur-xl">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.4)]">
              <HiOutlineCheck className="h-6 w-6 text-white" strokeWidth={3} />
            </div>
            <p className="text-sm font-extrabold text-emerald-700">Payment Successful</p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
