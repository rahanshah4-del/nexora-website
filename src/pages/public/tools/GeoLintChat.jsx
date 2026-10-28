import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CHAT_FILE_ACCEPT, clockTime, CHAT_MAX_CHARS, CHAT_MAX_FILES, EMOJI_GROUPS, PREVIEW_TEXT_BYTES, buildRows, collectFiles, fileExt, fileKind, fileProblem, firstUnreadId, formatBytes,
  loadRecentEmoji, messageMatches, parseRichText, previewKind, receiptFor, rememberEmoji, stampLabel,
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

const Search = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
const Clip = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m20 11-8.2 8.2a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.6 8.6a1.7 1.7 0 0 1-2.4-2.4l7.9-7.9" /></svg>
const CopyIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2.5" /><path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15" /></svg>
/** Two ticks like a messenger: grey once delivered, blue once read. */
function Ticks({ read }) {
  return (
    <svg className={`gc-ticks ${read ? 'is-read' : ''}`} width="17" height="11" viewBox="0 0 17 11" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 5.8 4.2 9 10.2 1.6" /><path className="gc-tick-2" d="M6.3 7.6 7.3 9 13.3 1.6" />
    </svg>
  )
}
const Tick = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
const ArrowDown = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5.5 12.5 12 19l6.5-6.5" /></svg>

async function copyText(value) {
  try { await navigator.clipboard.writeText(value); return true } catch { return false }
}
function saveBlobUrl(url, name) {
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
}

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

function ImageFile({ file, getUrl, onOpenFile, onSettled }) {
  const [url, setUrl] = useState('')
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let live = true
    getUrl(file.id).then((u) => live && setUrl(u)).catch(() => live && setFailed(true))
    return () => { live = false }
  }, [file.id, getUrl])
  if (failed) return <div className="gc-file"><span className="gc-file-ico">IMG</span><span className="gc-file-meta"><span className="gc-file-name">{file.name}</span><span className="gc-file-size">Could not load</span></span></div>
  if (!url) return <div className="gc-img is-loading" role="img" aria-label={`Loading ${file.name}`} />
  return <button type="button" className="gc-img" onClick={() => onOpenFile(file)} aria-label={`Open ${file.name}`}><img src={url} alt={file.name} onLoad={onSettled} /></button>
}

function DocFile({ file, onOpenFile }) {
  const [busy, setBusy] = useState(false)
  const preview = previewKind(file) !== 'download'
  async function open() {
    if (busy) return
    setBusy(true)
    try { await onOpenFile(file) } finally { setBusy(false) }
  }
  return (
    <button type="button" className="gc-file" onClick={open} aria-label={`${preview ? 'Preview' : 'Download'} ${file.name}`}>
      <span className="gc-file-ico">{fileExt(file.name).slice(0, 4) || 'file'}</span>
      <span className="gc-file-meta"><span className="gc-file-name">{file.name}</span><span className="gc-file-size">{busy ? 'Opening…' : `${formatBytes(file.size)} · ${preview ? 'Preview' : 'Download'}`}</span></span>
    </button>
  )
}

/** Message text with code blocks, inline code and links. Everything is rendered as text, never as HTML. */
function CodeBlock({ value, lang }) {
  const [done, setDone] = useState(false)
  async function copy() {
    if (await copyText(value)) { setDone(true); setTimeout(() => setDone(false), 1500) }
  }
  return (
    <span className="gc-code">
      <span className="gc-code-bar"><span>{lang || 'code'}</span><button type="button" onClick={copy}>{done ? <><Tick /> Copied</> : <><CopyIcon /> Copy</>}</button></span>
      <code>{value}</code>
    </span>
  )
}
function RichText({ text }) {
  const parts = useMemo(() => parseRichText(text), [text])
  return parts.map((part, i) => {
    if (part.type === 'code') return <CodeBlock key={i} value={part.value} lang={part.lang} />
    if (part.type === 'inline') return <code key={i} className="gc-ic">{part.value}</code>
    if (part.type === 'link') return <a key={i} className="gc-link" href={part.href} target="_blank" rel="noopener noreferrer nofollow">{part.value}</a>
    return <span key={i}>{part.value}</span>
  })
}

function Row({ row, getUrl, onOpenFile, onSettled, receipt, otherReadAt, divider }) {
  const { message: m, own, first, last } = row
  const files = m.files || []
  const images = files.filter((f) => fileKind(f) === 'image')
  const docs = files.filter((f) => fileKind(f) !== 'image')
  const hasText = Boolean(m.text)
  const hasCode = hasText && m.text.includes('```')
  const [copied, setCopied] = useState(false)
  const when = new Date(m.at)
  async function copy() {
    if (await copyText(m.text)) { setCopied(true); setTimeout(() => setCopied(false), 1400) }
  }
  return (
    <>
      {divider ? <div className="gc-newline" role="separator"><span>New messages</span></div> : null}
      <div className={`gc-row ${own ? 'is-own' : 'is-their'} ${first ? 'is-first' : ''} ${last ? 'is-last' : ''}`} title={Number.isNaN(when.getTime()) ? '' : when.toLocaleString()}>
        {files.length ? (
          <div className="gc-files">
            {images.map((f) => <ImageFile key={f.id} file={f} getUrl={getUrl} onOpenFile={onOpenFile} onSettled={onSettled} />)}
            {docs.map((f) => <DocFile key={f.id} file={f} onOpenFile={onOpenFile} />)}
          </div>
        ) : null}
        {hasText ? (
          <div className={`gc-bubble ${last ? 'has-tail' : ''} ${hasCode ? 'has-code' : ''}`}>
            <RichText text={m.text} />
            <button type="button" className="gc-copy" onClick={copy} aria-label="Copy message" title="Copy message">{copied ? <Tick /> : <CopyIcon />}</button>
          </div>
        ) : null}
        {own && last && otherReadAt !== null ? (
          <div className={`gc-receipt ${(otherReadAt && String(otherReadAt) >= String(m.at)) ? 'is-read' : ''}`} aria-live="polite">
            <span>{clockTime(m.at)}</span>
            <Ticks read={Boolean(otherReadAt) && String(otherReadAt) >= String(m.at)} />
            {receipt && receipt.id === m.id ? <span className="gc-receipt-label">{receipt.label}</span> : null}
          </div>
        ) : null}
      </div>
    </>
  )
}

// ---- file viewer: images, PDFs and text files open in place, with a download button

function Viewer({ viewer, onClose }) {
  const [text, setText] = useState({ state: viewer.kind === 'text' ? 'loading' : 'ready', value: '', cut: false })
  useEffect(() => {
    if (viewer.kind !== 'text') return undefined
    let live = true
    fetch(viewer.url).then((r) => r.blob()).then((blob) => {
      const cut = blob.size > PREVIEW_TEXT_BYTES
      return blob.slice(0, PREVIEW_TEXT_BYTES).text().then((value) => live && setText({ state: 'ready', value, cut }))
    }).catch(() => live && setText({ state: 'error', value: '', cut: false }))
    return () => { live = false }
  }, [viewer])
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div className="gc-viewer" role="dialog" aria-label={viewer.name} onClick={onClose}>
      <div className="gc-viewer-bar" onClick={(e) => e.stopPropagation()}>
        <span className="gc-viewer-name">{viewer.name}<small>{formatBytes(viewer.size)}</small></span>
        <button type="button" className="gc-viewer-btn" onClick={() => saveBlobUrl(viewer.url, viewer.name)}>Download</button>
        <button type="button" className="gc-viewer-x" onClick={onClose} aria-label="Close"><Close size={14} /></button>
      </div>
      <div className="gc-viewer-body" onClick={(e) => e.stopPropagation()}>
        {viewer.kind === 'image' ? <img src={viewer.url} alt={viewer.name} /> : null}
        {viewer.kind === 'pdf' ? <iframe title={viewer.name} src={viewer.url} /> : null}
        {viewer.kind === 'text' ? (
          <pre className="gc-viewer-text">{text.state === 'loading' ? 'Loading…' : text.state === 'error' ? 'Could not read this file.' : text.value}{text.cut ? '\n\n… the rest is cut. Download the file to read all of it.' : ''}</pre>
        ) : null}
      </div>
    </div>
  )
}

/** Every file of the conversation in one list. */
function FilesPanel({ files, onOpenFile, onClose }) {
  return (
    <div className="gc-panel" role="dialog" aria-label="Files in this chat">
      <div className="gc-panel-head"><strong>Files ({files.length})</strong><button type="button" className="gc-panel-x" onClick={onClose} aria-label="Close files"><Close size={12} /></button></div>
      {files.length === 0 ? <p className="gc-panel-empty">No files in this chat yet.</p> : (
        <ul>
          {files.map((f) => (
            <li key={`${f.messageId}-${f.id}`}>
              <button type="button" onClick={() => onOpenFile(f)}>
                <span className="gc-file-ico">{fileExt(f.name).slice(0, 4) || 'file'}</span>
                <span className="gc-file-meta"><span className="gc-file-name">{f.name}</span><span className="gc-file-size">{formatBytes(f.size)} · {f.own ? 'You' : 'Client'} · {stampLabel(f.at)}</span></span>
              </button>
            </li>
          ))}
        </ul>
      )}
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
  quickReplies = [], otherReadAt = null, myReadAt = null,
}) {
  const [text, setText] = useState('')
  const [drafts, setDrafts] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [viewer, setViewer] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [filesOpen, setFilesOpen] = useState(false)
  const [away, setAway] = useState(false)
  const [missed, setMissed] = useState(0)
  const [dividerId] = useState(() => (myReadAt === null ? '' : firstUnreadId(messages, mine, myReadAt)))
  const listRef = useRef(null)
  const inputRef = useRef(null)
  const fileRef = useRef(null)
  const draftSeq = useRef(0)
  const getUrl = useBlobCache(loadFile || (() => Promise.reject(new Error('no files'))))
  const shown = useMemo(() => (query.trim() ? messages.filter((m) => messageMatches(m, query)) : messages), [messages, query])
  const rows = useMemo(() => buildRows(shown, mine), [shown, mine])
  const receipt = useMemo(() => receiptFor(messages, mine, otherReadAt), [messages, mine, otherReadAt])
  const allFiles = useMemo(() => collectFiles(messages, mine), [messages, mine])
  const lastId = messages.at(-1)?.id || ''
  const uploading = drafts.some((d) => d.status === 'uploading')
  const readyFiles = drafts.filter((d) => d.status === 'ready')
  const canSend = canWrite && !busy && !uploading && (text.trim().length > 0 || readyFiles.length > 0)

  // stay at the newest message, unless the reader has scrolled up to read older ones
  const stick = useRef(true)
  const keepAtBottom = useCallback(() => { const el = listRef.current; if (el && stick.current) el.scrollTop = el.scrollHeight }, [])
  const seenCount = useRef(messages.length)
  useEffect(() => {
    const added = messages.length - seenCount.current
    seenCount.current = messages.length
    if (added > 0 && !stick.current) { setMissed((n) => n + added); return }
    stick.current = true
    keepAtBottom()
  }, [lastId, messages.length, keepAtBottom])
  const jumpToLatest = () => { stick.current = true; setAway(false); setMissed(0); const el = listRef.current; if (el) el.scrollTop = el.scrollHeight }
  const onListScroll = (e) => {
    const el = e.currentTarget
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 90
    stick.current = near
    setAway((prev) => (prev === !near ? prev : !near))
    if (near) setMissed(0)
  }
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`
  }, [text])
  const openFile = useCallback(async (file) => {
    try {
      const url = await getUrl(file.id)
      const kind = previewKind(file)
      if (kind === 'download') saveBlobUrl(url, file.name)
      else setViewer({ kind, url, name: file.name, size: file.size })
    } catch { setError('Could not open this file. Try again.') }
  }, [getUrl])
  const closeViewer = useCallback(() => setViewer(null), [])
  function fillReply(reply) {
    setText((t) => (t.trim() ? `${t.trimEnd()} ${reply}` : reply).slice(0, CHAT_MAX_CHARS))
    requestAnimationFrame(() => inputRef.current?.focus())
  }
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
        <div className="gc-head-text"><div className="gc-head-title">{title}</div><div className="gc-head-sub">{subtitle}</div></div>
        <div className="gc-head-tools">
          <button type="button" className="gc-tool" aria-pressed={searchOpen} aria-label="Search in chat" title="Search in chat" onClick={() => { setSearchOpen((v) => !v); if (searchOpen) setQuery('') }}><Search /></button>
          <button type="button" className="gc-tool" aria-pressed={filesOpen} aria-label={`Files in chat, ${allFiles.length}`} title="Files in chat" onClick={() => setFilesOpen((v) => !v)}><Clip />{allFiles.length ? <span className="gc-tool-n">{allFiles.length}</span> : null}</button>
        </div>
      </div>
      {searchOpen ? (
        <div className="gc-search">
          <input autoFocus type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search messages and file names" aria-label="Search messages" />
          <span className="gc-search-n">{query.trim() ? `${shown.length} found` : ''}</span>
        </div>
      ) : null}

      <div className="gc-stage">
        <div className="gc-list" ref={listRef} onScroll={onListScroll} role="log" aria-live="polite" aria-label="Messages">
          {rows.length === 0 ? (
            <div className="gc-empty"><span className="gc-empty-icon"><BubbleIcon size={28} /></span>{query.trim() ? 'No messages match your search.' : emptyText}</div>
          ) : rows.map((row) => (row.type === 'stamp'
            ? <div key={row.key} className="gc-stamp">{row.label}</div>
            : <Row key={row.key} row={row} getUrl={getUrl} onOpenFile={openFile} onSettled={keepAtBottom} receipt={receipt} otherReadAt={otherReadAt} divider={!query.trim() && row.key === dividerId} />))}
        </div>
        {away ? <button type="button" className="gc-jump" onClick={jumpToLatest}><ArrowDown />{missed ? `${missed} new` : 'Latest'}</button> : null}
        {filesOpen ? <FilesPanel files={allFiles} onOpenFile={openFile} onClose={() => setFilesOpen(false)} /> : null}
      </div>

      {canWrite ? (
        <form className="gc-compose" onSubmit={submit}>
          {emojiOpen ? <EmojiPicker onPick={insertEmoji} onClose={() => setEmojiOpen(false)} /> : null}
          {hint ? <p className="gc-hint">{hint}</p> : null}
          {quickReplies.length ? (
            <div className="gc-quick" role="group" aria-label="Quick replies">
              {quickReplies.map((q) => <button key={q.label} type="button" onClick={() => fillReply(q.text)} title={q.text}>{q.label}</button>)}
            </div>
          ) : null}
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
          {mine === 'staff' ? <p className="gc-keys"><kbd>Enter</kbd> send · <kbd>Shift</kbd>+<kbd>Enter</kbd> new line · <code>```</code> code block · paste a screenshot to attach</p> : null}
        </form>
      ) : (
        <p className="gc-closed"><Lock /><span>{closedText}</span></p>
      )}

      {dragging ? <div className="gc-dropveil">Drop files to attach</div> : null}
      {viewer ? <Viewer viewer={viewer} onClose={closeViewer} /> : null}
    </div>
  )
}
