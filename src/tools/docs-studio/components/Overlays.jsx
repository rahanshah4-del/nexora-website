import { useEffect, useRef, useState } from 'react'
import { useStudio } from '../ui/StudioContext.js'
import Icon from './Icon.jsx'

/** Confirmation dialog (alertdialog). Escape or Cancel closes; focus starts on Cancel. */
export function ConfirmDialog() {
  const { confirmState, closeConfirm } = useStudio()
  const cancelRef = useRef(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!confirmState) return undefined
    const previous = document.activeElement
    cancelRef.current?.focus()
    const onKey = (event) => { if (event.key === 'Escape') closeConfirm() }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      previous?.focus?.()
    }
  }, [confirmState, closeConfirm])

  if (!confirmState) return null
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/40 p-4 backdrop-blur-sm sm:items-center" onPointerDown={(e) => { if (e.target === e.currentTarget) closeConfirm() }}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="ds-confirm-title" aria-describedby="ds-confirm-body" className="ds-pop w-full max-w-md rounded-2xl bg-white p-6 shadow-lift">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600"><Icon name="alert" className="h-5 w-5" /></span>
          <div>
            <h2 id="ds-confirm-title" className="font-display text-lg font-semibold text-slate-900">{confirmState.title}</h2>
            <p id="ds-confirm-body" className="mt-1.5 text-sm leading-6 text-slate-600">{confirmState.body}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button ref={cancelRef} type="button" onClick={closeConfirm} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">Cancel</button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try { await confirmState.onConfirm() } finally { setBusy(false); closeConfirm() }
            }}
            className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {busy ? 'Deleting…' : confirmState.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

const TOAST_TONES = {
  info: 'bg-slate-900 text-white',
  success: 'bg-slate-900 text-white',
  error: 'bg-rose-600 text-white',
}

export function Toasts() {
  const { toasts } = useStudio()
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex flex-col items-center gap-2 px-4 lg:bottom-6" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`ds-pop pointer-events-auto flex max-w-sm items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-lift ${TOAST_TONES[t.tone] || TOAST_TONES.info}`}>
          {t.tone === 'success' ? <Icon name="check" className="h-4 w-4 text-emerald-300" /> : t.tone === 'error' ? <Icon name="alert" className="h-4 w-4" /> : null}
          {t.message}
        </div>
      ))}
    </div>
  )
}
