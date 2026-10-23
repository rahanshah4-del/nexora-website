import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import PageSeo from '../../../components/PageSeo.jsx'
import { getSeoForPath } from '../../../lib/seoMetadata.js'
import { TEMP_MAIL_CONTENT as page, TEMP_MAIL_PATH, tempMailPageSchemas } from '../../../lib/tempMailData.js'
import PublicPageShell from '../PublicPageShell.jsx'
import { Byline, FaqSection } from './ToolPageParts.jsx'

const API = (import.meta.env.VITE_TEMP_MAIL_API_URL || 'https://nexora-temp-mail.rahanshah4.workers.dev').replace(/\/+$/, '')
const STORAGE_KEY = 'nexora-temp-mail-address'
const POLL_MS = 5000

function readSaved() {
  try { return window.localStorage.getItem(STORAGE_KEY) || '' } catch { return '' }
}
function writeSaved(value) {
  try {
    if (value) window.localStorage.setItem(STORAGE_KEY, value)
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch { /* storage unavailable: the address just is not remembered */ }
}

async function api(path, options) {
  const res = await fetch(`${API}${path}`, options)
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return res.status === 204 ? null : res.json()
}

function formatTime(iso) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/** Mail body in a fully sandboxed frame (no scripts, no same-origin), or plain text. */
function MessageBody({ message }) {
  if (message.html) {
    const doc = `<!doctype html><meta charset="utf-8"><base target="_blank"><style>body{font:14px/1.5 system-ui,sans-serif;color:#0f172a;margin:12px;word-wrap:break-word}img{max-width:100%}</style>${message.html}`
    return <iframe title="Email content" sandbox="" srcDoc={doc} className="h-[420px] w-full rounded-lg border border-slate-200 bg-white" />
  }
  return <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-800">{message.text || '(empty message)'}</pre>
}

function TempMailTool() {
  const [initial] = useState(readSaved) // only rendered in the browser, so storage is readable
  const [address, setAddress] = useState(initial)
  const [messages, setMessages] = useState([])
  const [open, setOpen] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(!initial)
  const [copied, setCopied] = useState(false)
  const addressRef = useRef(initial)

  const createAddress = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const data = await api('/api/address', { method: 'POST' })
      addressRef.current = data.address
      setAddress(data.address)
      setMessages([])
      setOpen(null)
      writeSaved(data.address)
    } catch (e) {
      setError(e.status === 429 ? 'Too many new addresses from your network. Please wait a minute and try again.' : 'Could not create an address right now. Please try again.')
    } finally {
      setBusy(false)
    }
  }, [])

  const refresh = useCallback(async () => {
    const current = addressRef.current
    if (!current) return
    try {
      const data = await api(`/api/inbox/${encodeURIComponent(current)}`)
      if (addressRef.current === current) setMessages(data.messages || [])
    } catch { /* keep the last list; the next poll retries */ }
  }, [])

  // Start with the remembered address if there is one, otherwise a new one.
  useEffect(() => {
    if (addressRef.current) refresh()
    else createAddress()
  }, [createAddress, refresh])

  // Poll only while the tab is visible.
  useEffect(() => {
    if (!address) return undefined
    const id = window.setInterval(() => { if (document.visibilityState === 'visible') refresh() }, POLL_MS)
    return () => window.clearInterval(id)
  }, [address, refresh])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch { setError('Copy failed. Select the address and copy it manually.') }
  }

  const openMessage = async (id) => {
    try {
      const data = await api(`/api/inbox/${encodeURIComponent(address)}/${encodeURIComponent(id)}`)
      setOpen(data.message)
    } catch { setError('Could not open that message. It may have expired.') }
  }

  const clearInbox = async () => {
    try {
      await api(`/api/inbox/${encodeURIComponent(address)}`, { method: 'DELETE' })
      setMessages([])
      setOpen(null)
    } catch { setError('Could not delete the inbox. Please try again.') }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <label htmlFor="temp-mail-address" className="text-sm font-semibold text-slate-700">Your temporary email address</label>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <input
          id="temp-mail-address"
          readOnly
          value={busy && !address ? 'Creating address…' : address}
          onFocus={(e) => e.target.select()}
          className="min-h-[48px] w-full flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 font-mono text-[15px] text-slate-900"
        />
        <div className="flex gap-2">
          <button type="button" onClick={copy} disabled={!address} className="min-h-[48px] flex-1 rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50 sm:flex-none">{copied ? 'Copied' : 'Copy'}</button>
          <button type="button" onClick={createAddress} disabled={busy} className="min-h-[48px] flex-1 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 sm:flex-none">New address</button>
        </div>
      </div>
      <p className="mt-2 text-sm text-slate-500">Messages are deleted one hour after they arrive. New mail appears here automatically.</p>
      {error ? <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="mt-6 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-slate-950">Inbox {messages.length ? `(${messages.length})` : ''}</h2>
        {messages.length ? <button type="button" onClick={clearInbox} className="text-sm font-semibold text-red-700 hover:underline">Delete all</button> : null}
      </div>

      {open ? (
        <div className="mt-3">
          <button type="button" onClick={() => setOpen(null)} className="text-sm font-semibold text-blue-700 hover:underline">← Back to inbox</button>
          <h3 className="mt-3 break-words font-display text-base font-bold text-slate-950">{open.subject}</h3>
          <p className="mb-3 mt-1 break-words text-sm text-slate-500">From {open.fromName ? `${open.fromName} ` : ''}&lt;{open.fromAddress}&gt; · {formatTime(open.receivedAt)}</p>
          <MessageBody message={open} />
        </div>
      ) : messages.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500" aria-live="polite">
          Waiting for mail… Use the address above on any site and the message will show up here.
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200" aria-live="polite">
          {messages.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => openMessage(m.id)} className="block w-full px-4 py-3 text-left hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-semibold text-slate-900">{m.subject}</span>
                  <span className="shrink-0 text-xs text-slate-500">{formatTime(m.receivedAt)}</span>
                </span>
                <span className="block truncate text-xs text-slate-500">{m.fromName || m.fromAddress}</span>
                <span className="mt-1 block truncate text-sm text-slate-600">{m.preview}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** /tools/temp-mail/ — free temporary inbox backed by the nexora-temp-mail Worker. */
export default function TempMailPage() {
  const seo = getSeoForPath(TEMP_MAIL_PATH)
  const [schemas] = useState(() => tempMailPageSchemas())
  // false while prerendering/hydrating, true in the browser afterwards
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)

  return (
    <PublicPageShell backTo="/tools" backLabel="All Free Tools">
      <PageSeo
        title={seo.title}
        description={seo.description}
        canonical={seo.canonical}
        path={TEMP_MAIL_PATH}
        keywords={seo.keywords}
        robots={seo.robots}
        ogTitle={seo.ogTitle}
        ogDescription={seo.ogDescription}
        ogImage={seo.ogImage}
        ogLocale="en_US"
        ogLocaleAlternates={false}
        twitterCard="summary_large_image"
        defaultSchemas={false}
        structuredData={schemas}
      />

      <section className="bg-[linear-gradient(180deg,#ffffff_0%,#f5f8ff_100%)] px-4 pb-10 pt-16 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">{page.eyebrow}</p>
          <h1 className="mt-3 font-display text-[2rem] font-bold leading-[1.1] tracking-tight text-slate-950 sm:text-[2.6rem]">{page.h1}</h1>
          <p className="mt-4 text-[16px] leading-7 text-slate-600">{page.lead}</p>
          <div className="mt-6">
            {mounted ? <TempMailTool /> : <div className="min-h-[260px] rounded-2xl border border-slate-200 bg-white" aria-hidden="true" />}
          </div>
        </div>
      </section>

      <section aria-labelledby="tm-how" className="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-[70ch]">
          <h2 id="tm-how" className="font-display text-2xl font-bold tracking-tight text-slate-950">How to use a temporary email</h2>
          <ol className="mt-5 list-decimal space-y-2 pl-5 text-[16px] leading-7 text-slate-700">
            {page.steps.map((s) => <li key={s}>{s}</li>)}
          </ol>
        </div>
      </section>

      <section aria-labelledby="tm-uses" className="bg-slate-50 px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-[70ch]">
          <h2 id="tm-uses" className="font-display text-2xl font-bold tracking-tight text-slate-950">What a temporary email is good for</h2>
          <dl className="mt-5 space-y-4">
            {page.useCases.map((u) => (
              <div key={u.title}>
                <dt className="font-display text-[16px] font-semibold text-slate-900">{u.title}</dt>
                <dd className="mt-1 text-[16px] leading-7 text-slate-600">{u.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section aria-labelledby="tm-privacy" className="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-[70ch]">
          <h2 id="tm-privacy" className="font-display text-2xl font-bold tracking-tight text-slate-950">Privacy and limits</h2>
          <ul className="mt-5 list-disc space-y-2 pl-5 text-[16px] leading-7 text-slate-700">
            {page.privacy.map((p) => <li key={p}>{p}</li>)}
          </ul>
          <p className="mt-4 text-[16px] leading-7 text-slate-600">{page.limits}</p>
          <Byline className="mt-8" />
        </div>
      </section>

      <FaqSection heading="Temporary email: frequently asked questions" faqs={page.faqs} tone="alt" />
    </PublicPageShell>
  )
}
