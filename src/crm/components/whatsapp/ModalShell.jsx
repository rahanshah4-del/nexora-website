import { AnimatePresence, motion } from 'framer-motion'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Card from '../ui/Card.jsx'

// Shared modal chrome for WhatsApp manual-mode create/edit dialogs.
export function ModalShell({ open, onClose, badge = 'WhatsApp', title, wide = false, children }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            className={`crm-modal-panel ${wide ? 'crm-modal-panel-wide' : ''}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            transition={{ duration: 0.18 }}
            onClick={(event) => event.stopPropagation()}
          >
            <Card className="rounded-3xl p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Badge variant="success">{badge}</Badge>
                  <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-950 dark:text-white">{title}</h2>
                </div>
                <Button variant="subtle" className="h-9 rounded-xl px-3 text-xs" type="button" onClick={onClose}>
                  Close
                </Button>
              </div>
              {children}
            </Card>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export function Field({ label, children, hint }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-slate-400">{hint}</span> : null}
    </label>
  )
}

const textareaClass =
  'focus-ring min-h-[72px] w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-sky-300 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100'

export function Textarea(props) {
  return <textarea className={textareaClass} {...props} />
}
