import { useRef, useState } from 'react'
import { formatBytes } from '../../../lib/inboxUtils.js'
import { addFiles } from '../../../lib/attachmentFiles.js'
import { MAX_FILES, MAX_TOTAL_BYTES } from '../../../../workers/shared/outgoingAttachments.js'

/** Attach files to an outgoing email: button, drag and drop, list with remove. `files` is controlled by the parent. */
export default function AttachPicker({ files, setFiles, disabled }) {
  const input = useRef(null)
  const [error, setError] = useState('')
  const [over, setOver] = useState(false)

  async function take(list) {
    const result = await addFiles(files, list)
    setFiles(result.items)
    setError(result.error)
  }

  return (
    <div
      onDragOver={(event) => { event.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => { event.preventDefault(); setOver(false); if (!disabled) take(event.dataTransfer.files) }}
      className={`rounded-lg border border-dashed px-3 py-2 text-xs ${over ? 'border-blue-400 bg-blue-50' : 'border-slate-200'}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={disabled || files.length >= MAX_FILES} onClick={() => input.current?.click()} className="rounded-lg border border-slate-200 px-2.5 py-1.5 font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">📎 Attach files</button>
        <span className="text-slate-400">or drop files here · up to {MAX_FILES} files, {MAX_TOTAL_BYTES / 1048576} MB total</span>
        <input ref={input} type="file" multiple hidden onChange={(event) => { take(event.target.files); event.target.value = '' }} />
      </div>
      {files.length ? <ul className="mt-2 flex flex-wrap gap-1.5">{files.map((file, index) => <li key={`${file.filename}-${index}`} className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">📄 {file.filename} <span className="font-normal text-slate-400">{formatBytes(file.size)}</span><button type="button" aria-label={`Remove ${file.filename}`} onClick={() => setFiles(files.filter((_, i) => i !== index))} className="text-slate-400 hover:text-rose-600">✕</button></li>)}</ul> : null}
      {error ? <p role="alert" className="mt-1.5 font-semibold text-rose-600">{error}</p> : null}
    </div>
  )
}
