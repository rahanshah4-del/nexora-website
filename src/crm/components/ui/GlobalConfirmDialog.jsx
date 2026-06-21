import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import Badge from './Badge.jsx'
import Button from './Button.jsx'
import Card from './Card.jsx'
import { setDialogPresenter } from './dialogActions.js'

export default function GlobalConfirmDialog() {
  const [request, setRequest] = useState(null)

  useEffect(() => {
    const presenter = (options, resolve) => {
      setRequest((current) => {
        current?.resolve?.(false)
        return { options, resolve }
      })
    }
    return setDialogPresenter(presenter)
  }, [])

  useEffect(() => {
    if (!request) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        request.resolve(false)
        setRequest(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [request])

  function close(result) {
    request?.resolve?.(result)
    setRequest(null)
  }

  const options = request?.options || {}
  const alertOnly = options.mode === 'alert'
  const tone = options.tone || (alertOnly ? 'info' : 'danger')
  const badgeVariant = tone === 'danger' ? 'danger' : tone === 'warning' ? 'warning' : 'info'
  const confirmClass = tone === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : tone === 'warning' ? 'bg-amber-600 hover:bg-amber-700' : ''

  return (
    <AnimatePresence>
      {request ? (
        <motion.div
          className="fixed inset-0 z-[120] grid place-items-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => close(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="global-confirm-title"
        >
          <motion.div
            className="crm-modal-panel max-w-md"
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.16 }}
            onClick={(event) => event.stopPropagation()}
          >
            <Card className="p-5">
              <Badge variant={badgeVariant}>{options.badge || (alertOnly ? 'Notice' : 'Warning')}</Badge>
              <h2 id="global-confirm-title" className="mt-3 text-lg font-semibold text-slate-950 dark:text-white">
                {options.title || (alertOnly ? 'Information' : 'Confirm action')}
              </h2>
              <p className="mt-2 break-words text-sm leading-6 text-slate-600 dark:text-slate-300">
                {options.message || 'Please confirm before continuing.'}
              </p>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                {alertOnly ? (
                  <Button className="rounded-2xl" type="button" onClick={() => close(true)}>{options.confirmLabel || 'OK'}</Button>
                ) : (
                  <>
                    <Button variant="subtle" className="rounded-2xl" type="button" onClick={() => close(false)}>{options.cancelLabel || 'Cancel'}</Button>
                    <Button className={`rounded-2xl ${confirmClass}`} type="button" onClick={() => close(true)}>{options.confirmLabel || 'Delete'}</Button>
                  </>
                )}
              </div>
            </Card>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
