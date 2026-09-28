import { useEffect, useRef, useState } from 'react'
import { formatMoney, getDocumentType } from '../engine/index.js'
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
  const { toasts, dismissToast } = useStudio()
  return (
    <div className="ds-toasts pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex flex-col items-center gap-2 px-4 lg:bottom-6" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`ds-pop pointer-events-auto flex max-w-md flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-4 py-2.5 text-sm font-medium shadow-lift ${TOAST_TONES[t.tone] || TOAST_TONES.info}`}>
          {t.tone === 'success' ? <Icon name="check" className="h-4 w-4 text-emerald-300" /> : t.tone === 'error' ? <Icon name="alert" className="h-4 w-4" /> : null}
          <span className="min-w-0 flex-1">{t.message}</span>
          {t.action ? (
            <button
              type="button"
              onClick={() => { dismissToast(t.id); t.action.onClick() }}
              className="rounded-lg bg-white/15 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              {t.action.label}
            </button>
          ) : null}
          <button type="button" onClick={() => dismissToast(t.id)} aria-label="Dismiss" className="rounded p-0.5 text-white/70 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"><Icon name="x" className="h-3.5 w-3.5" /></button>
        </div>
      ))}
    </div>
  )
}

/** "All documents": every saved document; search + type filter above 10. */
export function DocumentsDialog() {
  const { documentsOpen, setDocumentsOpen, commands, doc } = useStudio()
  const { listRecent } = commands // stable (useCallback); `commands` itself is rebuilt each render
  const [list, setList] = useState(null)
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const closeRef = useRef(null)

  useEffect(() => {
    if (!documentsOpen) return undefined
    let cancelled = false
    listRecent(1000).then((docs) => { if (!cancelled) setList(docs) }).catch(() => { if (!cancelled) setList([]) })
    closeRef.current?.focus()
    const onKey = (event) => { if (event.key === 'Escape') setDocumentsOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => { cancelled = true; window.removeEventListener('keydown', onKey) }
  }, [documentsOpen, listRecent, setDocumentsOpen])

  if (!documentsOpen) return null
  const docs = list || []
  const searchable = docs.length > 10
  const q = query.trim().toLowerCase()
  const shown = docs.filter((d) => (type === 'all' || d.type === type) && (!q || `${d.number} ${d.clientName}`.toLowerCase().includes(q)))
  const types = [...new Set(docs.map((d) => d.type))]
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/40 p-4 backdrop-blur-sm sm:items-center" onPointerDown={(e) => { if (e.target === e.currentTarget) setDocumentsOpen(false) }}>
      <div role="dialog" aria-modal="true" aria-labelledby="ds-docs-title" className="ds-pop flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-lift">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h2 id="ds-docs-title" className="font-display text-lg font-semibold text-slate-900">All documents</h2>
          <button ref={closeRef} type="button" onClick={() => setDocumentsOpen(false)} aria-label="Close" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"><Icon name="x" className="h-4 w-4" /></button>
        </div>
        {searchable ? (
          <div className="flex gap-2 border-b border-slate-100 px-5 py-3">
            <label className="sr-only" htmlFor="ds-docs-search">Search documents</label>
            <input id="ds-docs-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search number or client…" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30" />
            <label className="sr-only" htmlFor="ds-docs-type">Document type</label>
            <select id="ds-docs-type" value={type} onChange={(e) => setType(e.target.value)} className="rounded-xl border border-slate-200 px-2 py-2 text-sm focus:border-brand focus:outline-none">
              <option value="all">All types</option>
              {types.map((t) => <option key={t} value={t}>{getDocumentType(t)?.label || t}</option>)}
            </select>
          </div>
        ) : null}
        <ul className="min-h-0 flex-1 overflow-auto p-2" aria-label="Saved documents">
          {list === null ? <li className="px-3 py-6 text-center text-sm text-slate-500">Loading…</li> : null}
          {list && !shown.length ? <li className="px-3 py-6 text-center text-sm text-slate-500">{docs.length ? 'No documents match.' : 'Nothing saved yet — documents save automatically as you edit.'}</li> : null}
          {shown.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => { setDocumentsOpen(false); commands.openDocument(d.id) }}
                aria-current={d.id === doc.id ? 'true' : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${d.id === doc.id ? 'bg-blue-50' : ''}`}
              >
                <Icon name={d.type} className="h-4 w-4 shrink-0 text-brand" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-slate-900">{d.number || getDocumentType(d.type)?.label || 'Untitled'}</span>
                  <span className="block truncate text-xs text-slate-500">{[getDocumentType(d.type)?.label, d.clientName, d.issueDate].filter(Boolean).join(' · ')}</span>
                </span>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-600">{formatMoney(d.total_minor, d.currency, 'en')}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
