import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { HiOutlineXMark } from 'react-icons/hi2'
import Button from '../ui/Button.jsx'

export function Field({ label, children, className = '' }) {
  return (
    <label className={className}>
      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

export default function InventoryModal({
  open,
  title,
  subtitle,
  onClose,
  onSubmit,
  submitLabel = 'Save',
  submitDisabled = false,
  error,
  children,
  size = 'md',
}) {
  useEffect(() => {
    if (!open) return undefined
    function handleEscape(event) {
      if (event.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  const maxWidth = size === 'lg' ? 'max-w-3xl' : size === 'sm' ? 'max-w-md' : 'max-w-xl'

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex justify-end overflow-hidden bg-slate-950/35 p-2 backdrop-blur-sm sm:p-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            className={`flex h-full w-full ${maxWidth} flex-col overflow-hidden rounded-3xl border border-white/80 bg-white shadow-[0_24px_90px_-40px_rgba(15,23,42,0.55)] dark:border-slate-800 dark:bg-slate-950`}
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 32 }}
            transition={{ duration: 0.18 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 bg-white/95 px-4 py-3 dark:border-slate-800 dark:bg-slate-950 sm:px-5">
              <div className="min-w-0">
                <p className="text-base font-semibold text-slate-950 dark:text-white">{title}</p>
                {subtitle ? <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
              </div>
              <button
                type="button"
                title="Close"
                aria-label="Close"
                onClick={onClose}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                <HiOutlineXMark className="text-lg" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950 sm:px-5">
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-300">{error || ''}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="subtle" className="h-10 rounded-xl" type="button" onClick={onClose}>
                  Cancel
                </Button>
                <Button className="h-10 rounded-xl" type="button" disabled={submitDisabled} onClick={onSubmit}>
                  {submitLabel}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
