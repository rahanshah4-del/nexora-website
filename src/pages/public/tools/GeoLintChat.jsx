import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CHAT_FILE_ACCEPT, CHAT_MAX_CHARS, CHAT_MAX_FILES, EMOJI_GROUPS, buildRows, fileExt, fileKind, fileProblem, formatBytes, loadRecentEmoji, rememberEmoji,
} from '../../../lib/geolintChatKit.js'
import './GeoLintChat.css'

// ---- icons (drawn after SF Symbols: message.fill, plus, arrow.up, lock.fill, xmark)

export function BubbleIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.5c-5.52 0-10 3.8-10 8.5 0 2.55 1.3 4.82 3.38 6.38-.2 1.25-.85 2.4-1.8 3.3-.2.2-.05.54.22.52 1.8-.12 3.35-.78 4.55-1.7.52.12 1.07.2 1.65.26.67.07 1.33.1 2 .1 5.52 0 10-3.8 10-8.5S17.52 2.5 12 2.5z" />
    </svg>
  )
}
const Plus = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
const ArrowUp = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" /></svg>
const Close = ({ size = 12 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
const Lock = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 10V8a5 5 0 0 1 10 0v2h.5A1.5 1.5 0 0 1 19 11.5v8a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-8A1.5 1.5 0 0 1 6.5 10H7zm2 0h6V8a3 3 0 0 0-6 0v2z" /></svg>

/** Floating chat button with the unread count. */
export function ChatLauncher({ unread = 0, onClick }) {
  return (
    <button type="button" className="gc-fab" onClick={onClick} aria-label={unread ? `Open messages, ${unread} new` : 'Open messages'}>
      <BubbleIcon size={28} />
      {unread > 0 ? <span className="gc-fab-badge">{unread > 9 ? '9+' : unread}</span> : null}
    </button>
  )
}

// ---- files inside messages

function useBlobCache(loadFile) {
  const cache = useRef(new Map())
  useEffect(() => {
    const urls = cache.current
    return () => { urls.forEach((p) => p.then((u) => URL.revokeObjectURL(u)).catch(() => {})); urls.clear() }
  }, [])
  return useCallback((fileId) => {
    if (!cache.current.has(fileId)) {
      const p = Promise.resolve(loadFile(fileId)).then((blob) => URL.createObjectURL(blob))
      p.catch(() => cache.current.delete(fileId))
      cache.current.set(fileId, p)
    }
    return cache.current.get(fileId)
  }, [loadFile])
}

function ImageFile({ file, getUrl, onOpen, onSettled }) {
  const [url, setUrl] = useState('')
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let live = true
    getUrl(file.id).then((u) => live && setUrl(u)).catch(() => live && setFailed(true))
    return () => { live = false }
  }, [file.id, getUrl])
  if (failed) return <div className="gc-file"><span className="gc-file-ico">IMG</span><span className="gc-file-meta"><span className="gc-file-name">{file.name}</span><span className="gc-file-size">Could not load</span></span></div>
  if (!url) return <div className="gc-img is-loading" role="img" aria-label={`Loading ${file.name}`} />
  return <button type="button" className="gc-img" onClick={() => onOpen({ url, name: file.name })} aria-label={`Open ${file.name}`}><img src={url} alt={file.name} onLoad={onSettled} /></button>
}

function DocFile({ file, getUrl }) {
  const [busy, setBusy] = useState(false)
  async function open() {
    if (busy) return
    setBusy(true)
    try {
      const url = await getUrl(file.id)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch { /* the chip shows nothing more; the person can try again */ } finally { setBusy(false) }
  }
  return (
    <button type="button" className="gc-file" onClick={open} aria-label={`Download ${file.name}`}>
      <span className="gc-file-ico">{fileExt(file.name).slice(0, 4) || 'file'}</span>
      <span className="gc-file-meta"><span className="gc-file-name">{file.name}</span><span className="gc-file-size">{busy ? 'Opening…' : formatBytes(file.size)}</span></span>
    </button>
  )
}

function Row({ row, getUrl, onOpen, onSettled }) {
  const { message: m, own, first, last } = row
  const files = m.files || []
  const images = files.filter((f) => fileKind(f) === 'image')
  const docs = files.filter((f) => fileKind(f) !== 'image')
  const hasText = Boolean(m.text)
  const when = new Date(m.at)
  return (
    <div className={`gc-row ${own ? 'is-own' : 'is-their'} ${first ? 'is-first' : ''} ${last ? 'is-last' : ''}`} title={Number.isNaN(when.getTime()) ? '' : when.toLocaleString()}>
      {files.length ? (
        <div className="gc-files">
          {images.map((f) => <ImageFile key={f.id} file={f} getUrl={getUrl} onOpen={onOpen} onSettled={onSettled} />)}
          {docs.map((f) => <DocFile key={f.id} file={f} getUrl={getUrl} />)}
        </div>
      ) : null}
      {hasText ? <div className={`gc-bubble ${last ? 'has-tail' : ''}`}>{m.text}</div> : null}
    </div>
  )
}

// ---- emoji picker

function EmojiPicker({ onPick, onClose }) {
  const [recent, setRecent] = useState(() => loadRecentEmoji())
  const groups = useMemo(() => (recent.length ? [{ id: 'recent', label: 'Recent', icon: '🕘', emojis: recent }, ...EMOJI_GROUPS] : EMOJI_GROUPS), [recent])
  const [tab, setTab] = useState(0)
  const ref = useRef(null)
  const group = groups[Math.min(tab, groups.length - 1)]

  useEffect(() => {
    const away = (e) => { if (ref.current && !ref.current.contains(e.target) && !e.target.closest?.('[data-emoji-toggle]')) onClose() }
    const esc = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc) }
  }, [onClose])

  return (
    <div className="gc-emoji" ref={ref} role="dialog" aria-label="Emoji">
      <div className="gc-emoji-tabs" role="tablist">
        {groups.map((g, i) => <button key={g.id} type="button" role="tab" aria-selected={tab === i} aria-label={g.label} className="gc-emoji-tab" onClick={() => setTab(i)}>{g.icon}</button>)}
      </div>
      <p className="gc-emoji-label">{group.label}</p>
      <div className="gc-emoji-grid">
        {group.emojis.map((e) => <button key={e} type="button" aria-label={e} onClick={() => { setRecent(rememberEmoji(e)); onPick(e) }}>{e}</button>)}
      </div>
    </div>
  )
}

// ---- the chat

/**
 * The order chat. `mine` is who is looking ('client' or 'staff'): their bubbles are blue and on the right.
 * onSend({ text, files }) sends; onUpload(file) stores a file and resolves { id, name, type, size };
 * loadFile(id) resolves a file's Blob. Without onUpload the attach button is hidden.
 */
export default function GeoLintChat({
  messages = [], mine = 'client', canWrite = true, closedText = '', title = 'Nexora team', subtitle = 'GeoLint order chat',
  onSend, onUpload, loadFile, emptyText = 'No messages yet.', hint = '',
}) {
  const [text, setText] = useState('')
  const [drafts, setDrafts] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [viewer, setViewer] = useState(null)
  const listRef = useRef(null)
  const inputRef = useRef(null)
  const fileRef = useRef(null)
  const draftSeq = useRef(0)
  const getUrl = useBlobCache(loadFile || (() => Promise.reject(new Error('no files'))))
  const rows = useMemo(() => buildRows(messages, mine), [messages, mine])
  const lastId = messages.at(-1)?.id || ''
  const uploading = drafts.some((d) => d.status === 'uploading')
  const readyFiles = drafts.filter((d) => d.status === 'ready')
  const canSend = canWrite && !busy && !uploading && (text.trim().length > 0 || readyFiles.length > 0)

  // stay at the newest message, unless the reader has scrolled up to read older ones
  const stick = useRef(true)
  const keepAtBottom = useCallback(() => { const el = listRef.current; if (el && stick.current) el.scrollTop = el.scrollHeight }, [])
  useEffect(() => { stick.current = true; keepAtBottom() }, [lastId, keepAtBottom])
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`
  }, [text])
  useEffect(() => {
    if (!viewer) return undefined
    const esc = (e) => { if (e.key === 'Escape') setViewer(null) }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [viewer])
  useEffect(() => () => { drafts.forEach((d) => d.preview && URL.revokeObjectURL(d.preview)) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const patchDraft = (key, patch) => setDrafts((list) => list.map((d) => (d.key === key ? { ...d, ...patch } : d)))
  const dropDraft = (key) => setDrafts((list) => { const d = list.find((x) => x.key === key); if (d?.preview) URL.revokeObjectURL(d.preview); return list.filter((x) => x.key !== key) })

  function addFiles(fileList) {
    if (!onUpload || !canWrite) return
    const incoming = [...fileList]
    setError('')
    const room = CHAT_MAX_FILES - drafts.length
    if (incoming.length > room) setError(`You can send up to ${CHAT_MAX_FILES} files at once.`)
    incoming.slice(0, Math.max(room, 0)).forEach((file) => {
      const problem = fileProblem(file)
      if (problem) { setError(problem); return }
      const key = `d${(draftSeq.current += 1)}`
      const kind = fileKind({ name: file.name, type: file.type })
      setDrafts((list) => [...list, { key, name: file.name, size: file.size, kind, preview: kind === 'image' ? URL.createObjectURL(file) : '', status: 'uploading', meta: null }])
      onUpload(file)
        .then((meta) => patchDraft(key, { status: 'ready', meta }))
        .catch((err) => patchDraft(key, { status: 'error', error: err?.message || 'Upload failed.' }))
    })
  }

  async function submit(event) {
    event?.preventDefault()
    if (!canSend) return
    setBusy(true)
    setError('')
    try {
      await onSend({ text: text.trim(), files: readyFiles.map((d) => d.meta.id) })
      drafts.forEach((d) => d.preview && URL.revokeObjectURL(d.preview))
      setText('')
      setDrafts([])
      setEmojiOpen(false)
    } catch (err) {
      setError(err?.message || 'Your message was not sent. Try again.')
    } finally {
      setBusy(false)
    }
  }

  function insertEmoji(emoji) {
    const el = inputRef.current
    const start = el?.selectionStart ?? text.length
    const end = el?.selectionEnd ?? text.length
    const next = (text.slice(0, start) + emoji + text.slice(end)).slice(0, CHAT_MAX_CHARS)
    setText(next)
    const caret = start + emoji.length
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(caret, caret) })
  }

  const onPaste = (e) => {
    const files = [...(e.clipboardData?.files || [])]
    if (files.length && onUpload) { e.preventDefault(); addFiles(files) }
  }
  const onDragOver = (e) => { if (onUpload && canWrite && e.dataTransfer?.types?.includes('Files')) { e.preventDefault(); setDragging(true) } }
  const onDrop = (e) => { if (!dragging) return; e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }

  return (
    <div className="gc" onDragOver={onDragOver} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false) }} onDrop={onDrop}>
      <div className="gc-head">
        <span className="gc-avatar"><BubbleIcon size={22} /></span>
        <div><div className="gc-head-title">{title}</div><div className="gc-head-sub">{subtitle}</div></div>
      </div>

      <div className="gc-list" ref={listRef} onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 90 }} role="log" aria-live="polite" aria-label="Messages">
        {rows.length === 0 ? (
          <div className="gc-empty"><span className="gc-empty-icon"><BubbleIcon size={28} /></span>{emptyText}</div>
        ) : rows.map((row) => (row.type === 'stamp'
          ? <div key={row.key} className="gc-stamp">{row.label}</div>
          : <Row key={row.key} row={row} getUrl={getUrl} onOpen={setViewer} onSettled={keepAtBottom} />))}
      </div>

      {canWrite ? (
        <form className="gc-compose" onSubmit={submit}>
          {emojiOpen ? <EmojiPicker onPick={insertEmoji} onClose={() => setEmojiOpen(false)} /> : null}
          {hint ? <p className="gc-hint">{hint}</p> : null}
          {error ? <p role="alert" className="gc-error">{error}</p> : null}
          {drafts.length ? (
            <div className="gc-drafts">
              {drafts.map((d) => (
                <div key={d.key} className={`gc-draft ${d.status === 'error' ? 'is-error' : ''}`}>
                  <span className="gc-draft-thumb">{d.preview ? <img src={d.preview} alt="" /> : fileExt(d.name).slice(0, 4)}</span>
                  <span style={{ minWidth: 0 }}>
                    <span className="gc-draft-name" style={{ display: 'block' }}>{d.name}</span>
                    <span className="gc-draft-state">{d.status === 'uploading' ? 'Uploading…' : d.status === 'error' ? d.error : formatBytes(d.size)}</span>
                  </span>
                  {d.status === 'uploading' ? <span className="gc-draft-bar" /> : null}
                  <button type="button" className="gc-draft-x" onClick={() => dropDraft(d.key)} aria-label={`Remove ${d.name}`}><Close size={10} /></button>
                </div>
              ))}
            </div>
          ) : null}
          <div className="gc-bar">
            {onUpload ? (
              <>
                <button type="button" className="gc-round" onClick={() => fileRef.current?.click()} aria-label="Attach a file or screenshot" title="Attach a file or screenshot"><Plus /></button>
                <input ref={fileRef} type="file" hidden multiple accept={CHAT_FILE_ACCEPT} onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
              </>
            ) : null}
            <div className={`gc-field ${dragging ? 'is-drop' : ''}`}>
              <textarea
                ref={inputRef}
                className="gc-input"
                rows={1}
                value={text}
                maxLength={CHAT_MAX_CHARS}
                placeholder="Message"
                aria-label="Message"
                onChange={(e) => setText(e.target.value)}
                onPaste={onPaste}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) submit(e) }}
              />
              <button type="button" className="gc-emoji-btn" data-emoji-toggle aria-label="Emoji" aria-expanded={emojiOpen} onClick={() => setEmojiOpen((v) => !v)}>🙂</button>
              {text.length > CHAT_MAX_CHARS - 150 ? <span className="gc-count">{CHAT_MAX_CHARS - text.length} left</span> : null}
            </div>
            <button type="submit" className={`gc-send ${canSend || busy || uploading ? 'is-ready' : ''}`} disabled={!canSend} aria-label="Send">{busy ? <span className="gc-spin" /> : <ArrowUp />}</button>
          </div>
        </form>
      ) : (
        <p className="gc-closed"><Lock /><span>{closedText}</span></p>
      )}

      {dragging ? <div className="gc-dropveil">Drop files to attach</div> : null}
      {viewer ? (
        <div className="gc-lightbox" role="dialog" aria-label={viewer.name} onClick={() => setViewer(null)}>
          <img src={viewer.url} alt={viewer.name} onClick={(e) => e.stopPropagation()} />
          <button type="button" onClick={() => setViewer(null)} aria-label="Close"><Close size={16} /></button>
        </div>
      ) : null}
    </div>
  )
}
