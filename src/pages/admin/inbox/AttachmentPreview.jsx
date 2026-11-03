import { useEffect, useState } from 'react'
import { formatBytes } from '../../../lib/inboxUtils.js'
import { fetchInboxAttachmentBlob } from '../../../lib/emailInbox.js'
import { mimeFor, previewKind } from '../../../lib/attachmentKind.js'

/**
 * Look at a client's attachment without leaving the Inbox: images, PDFs and text files open in a viewer,
 * with Download beside it. `items` are the previewable attachments of the open email; `index` is the shown one.
 */
export default function AttachmentPreview({ emailId, items, index, setIndex, onDownload, onClose }) {
  const attachment = items[index]
  const kind = previewKind(attachment?.filename, attachment?.content_type)
  const [state, setState] = useState({ key: '', url: '', text: '', error: '' })
  const key = `${emailId}:${attachment?.id}`
  const hosted = Boolean(attachment?.download_url)

  useEffect(() => {
    let cancelled = false
    let objectUrl = ''
    if (!attachment) return undefined
    if (hosted) {
      Promise.resolve().then(() => { if (!cancelled) setState({ key, url: attachment.download_url, text: '', error: '' }) })
      return () => { cancelled = true }
    }
    fetchInboxAttachmentBlob(emailId, attachment.id)
      .then(async (blob) => {
        if (cancelled) return
        const typed = new Blob([blob], { type: mimeFor(attachment.filename, attachment.content_type) })
        if (kind === 'text') { setState({ key, url: '', text: (await typed.text()).slice(0, 200000), error: '' }); return }
        objectUrl = URL.createObjectURL(typed)
        setState({ key, url: objectUrl, text: '', error: '' })
      })
      .catch((error) => { if (!cancelled) setState({ key, url: '', text: '', error: error?.message || 'Could not open this file.' }) })
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [key, emailId, attachment, kind, hosted])

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose()
      else if (event.key === 'ArrowRight' && index < items.length - 1) setIndex(index + 1)
      else if (event.key === 'ArrowLeft' && index > 0) setIndex(index - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, items.length, onClose, setIndex])

  if (!attachment) return null
  const ready = state.key === key
  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-slate-950/80" role="dialog" aria-modal="true" aria-label={`Preview ${attachment.filename}`} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 px-4 py-3 text-white">
        <p className="min-w-0 truncate text-sm font-bold">📎 {attachment.filename} {attachment.size ? <span className="font-normal text-slate-400">· {formatBytes(attachment.size)}</span> : null}{items.length > 1 ? <span className="font-normal text-slate-400"> · {index + 1} of {items.length}</span> : null}</p>
        <div className="flex items-center gap-2">
          {items.length > 1 ? <><button type="button" disabled={index === 0} onClick={() => setIndex(index - 1)} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold disabled:opacity-30">← Prev</button><button type="button" disabled={index === items.length - 1} onClick={() => setIndex(index + 1)} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold disabled:opacity-30">Next →</button></> : null}
          <button type="button" onClick={() => onDownload(attachment)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold">⬇ Download</button>
          <button type="button" onClick={onClose} aria-label="Close preview" className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold">✕ Close</button>
        </div>
      </div>
      <div className="grid min-h-0 flex-1 place-items-center overflow-auto p-3" onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
        {!ready ? <p className="text-sm text-slate-300">Opening file…</p>
          : state.error ? <div className="max-w-sm rounded-xl bg-white p-4 text-sm text-slate-700"><p className="font-black">❌ Could not open this file</p><p className="mt-1">{state.error}</p><p className="mt-1 text-xs text-slate-500">You can still download it.</p></div>
          : kind === 'image' ? <img src={state.url} alt={attachment.filename} className="max-h-full max-w-full rounded-lg bg-white object-contain shadow-2xl" />
          : kind === 'pdf' ? <iframe title={attachment.filename} src={state.url} className="h-full w-full max-w-5xl rounded-lg bg-white shadow-2xl" />
          : <pre className="max-h-full w-full max-w-4xl overflow-auto whitespace-pre-wrap break-words rounded-lg bg-white p-4 text-xs text-slate-800 shadow-2xl">{state.text}</pre>}
      </div>
    </div>
  )
}
