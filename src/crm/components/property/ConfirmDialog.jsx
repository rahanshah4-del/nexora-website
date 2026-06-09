import { AnimatePresence, motion } from 'framer-motion'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Card from '../ui/Card.jsx'

// Reusable safe-confirmation dialog for destructive Property ERP actions
// (delete / cancel / terminate). Renders nothing until `open` is true.
export default function ConfirmDialog({
  open,
  badge = 'Confirm',
  tone = 'danger',
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  busy = false,
  onConfirm,
  onClose,
  children,
}) {
  const confirmClass =
    tone === 'danger'
      ? 'bg-rose-600 hover:bg-rose-700'
      : tone === 'warning'
        ? 'bg-amber-600 hover:bg-amber-700'
        : ''

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            className="crm-modal-panel max-w-md"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.16 }}
            onClick={(event) => event.stopPropagation()}
          >
            <Card className="rounded-3xl p-5">
              <Badge variant={tone === 'warning' ? 'warning' : 'danger'}>{badge}</Badge>
              <p className="mt-3 text-base font-semibold text-slate-950 dark:text-white">{title}</p>
              {message ? (
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{message}</p>
              ) : null}
              {children ? <div className="mt-4">{children}</div> : null}
              <div className="mt-5 flex flex-wrap gap-2">
                <Button className={`rounded-2xl ${confirmClass}`} type="button" disabled={busy} onClick={onConfirm}>
                  {busy ? 'Working...' : confirmLabel}
                </Button>
                <Button variant="subtle" className="rounded-2xl" type="button" disabled={busy} onClick={onClose}>
                  {cancelLabel}
                </Button>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
