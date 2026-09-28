/**
 * /tools/invoice/view/#<payload> — a read-only document opened from a share
 * link. Lazily loaded, client-only; no storage (Dexie is never loaded here).
 * The payload is decoded and validated by ui/shareView.js; logos and
 * letterheads never travel in links.
 */

import '../templates/paper.css'
import './studio.css'
import { useCallback, useEffect, useState } from 'react'
import { amountInWords, calculateDocument, formatMoney, getDocumentType } from '../engine/index.js'
import { saveBlob } from '../io/files.js'
import DocumentPaper from '../templates/DocumentPaper.jsx'
import { resolveLayout } from '../templates/specs.js'
import { useFitScale } from '../ui/hooks.js'
import { decodeShareView } from '../ui/shareView.js'
import Icon from './Icon.jsx'
import PrintRoot from './PrintRoot.jsx'
import ScaledPaper, { MM_TO_PX } from './ScaledPaper.jsx'

const GENERATOR_PATH = '/tools/invoice-generator/'

const ERRORS = {
  empty: {
    title: 'There is no document in this link',
    body: 'This page shows documents shared from the free invoice generator. The link you opened does not include one — it may have been cut off when it was copied.',
  },
  broken: {
    title: 'This link is damaged',
    body: 'Part of the link is missing or was changed. Ask the sender to copy the link again, or to send the PDF.',
  },
  'too-large': {
    title: 'This link is too long',
    body: 'Share links are limited to 8,000 characters, and this one is longer. Ask the sender for the PDF instead.',
  },
  future: {
    title: 'This link needs a newer version',
    body: 'It was made by a newer version of the invoice generator. Reload the page to get the latest version; if it still does not open, ask the sender for the PDF.',
    reload: true,
  },
}

function CreateOwnLink({ primary = false }) {
  return (
    <a
      href={GENERATOR_PATH}
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${primary ? 'bg-brand text-white shadow-sm hover:bg-brand-deep' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
      data-testid="create-own"
    >
      <Icon name="sparkles" className="h-4 w-4" />Create your own free invoice
    </a>
  )
}

function ErrorScreen({ reason }) {
  const e = ERRORS[reason] || ERRORS.broken
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center" role="alert" data-testid="share-error" data-reason={reason}>
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><Icon name="link" className="h-7 w-7" /></span>
      <h2 className="mt-5 font-display text-2xl font-semibold text-slate-900">{e.title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">{e.body}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {e.reload ? (
          <button type="button" onClick={() => window.location.reload()} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
            <Icon name="refresh" className="h-4 w-4" />Reload
          </button>
        ) : null}
        <CreateOwnLink primary />
      </div>
    </div>
  )
}

function Viewer({ doc }) {
  const [totals] = useState(() => calculateDocument(doc))
  const [words] = useState(() => amountInWords(calculateDocument(doc).amountPayable, doc.currency, { lang: doc.options.wordsLanguage, system: doc.options.wordsSystem }))
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  const { paper, kind } = resolveLayout(doc)
  const widthPx = paper.widthMm * MM_TO_PX
  const [fitRef, scale] = useFitScale(widthPx, { max: kind === 'receipt' ? 1.4 : 1 })
  const config = getDocumentType(doc.type)

  const download = useCallback(async () => {
    setBusy(true)
    setNotice(null)
    try {
      const { createDocumentPdf } = await import('../pdf/downloadPdf.js')
      const result = await createDocumentPdf({ doc, totals, amountWords: words, repo: null })
      if (!result.ok) {
        setNotice({ tone: 'info', text: 'This document uses Arabic, Urdu or Hebrew text — use Print → Save as PDF.' })
        return
      }
      saveBlob(result.blob, result.fileName)
      setNotice({ tone: 'success', text: `Downloaded ${result.fileName}` })
    } catch {
      setNotice({ tone: 'error', text: 'The PDF could not be created — use Print → Save as PDF.' })
    } finally {
      setBusy(false)
    }
  }, [doc, totals, words])

  const summary = [doc.number, doc.seller.name ? `from ${doc.seller.name}` : '', config.features.pricing ? formatMoney(totals.amountPayable, doc.currency, doc.locale) : '']
    .filter(Boolean).join(' · ')
  return (
    <div className="pb-12" data-testid="share-view">
      <div className="sticky top-14 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-lg font-semibold text-slate-900">{config.label}</h2>
            <p className="truncate text-sm text-slate-500">{summary}</p>
          </div>
          <button type="button" onClick={download} disabled={busy} aria-busy={busy || undefined} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-sm hover:bg-brand-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-wait disabled:opacity-80" data-testid="view-download-pdf">
            {busy ? <span className="ds-spinner h-4 w-4" aria-hidden="true" /> : <Icon name="download" className="h-4 w-4" />}
            {busy ? 'Creating PDF…' : 'Download PDF'}
          </button>
          <button type="button" onClick={() => window.print()} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
            <Icon name="printer" className="h-4 w-4" />Print
          </button>
          <div className="hidden sm:block"><CreateOwnLink /></div>
        </div>
        {notice ? (
          <p role="status" className={`mx-auto max-w-5xl px-4 pb-2 text-sm ${notice.tone === 'error' ? 'text-rose-600' : notice.tone === 'success' ? 'text-emerald-700' : 'text-slate-600'}`}>{notice.text}</p>
        ) : null}
      </div>
      <div className="mx-auto max-w-5xl px-3 pt-5 sm:px-4">
        <div ref={fitRef} className="w-full" data-analytics-ignore>
          {scale > 0 ? (
            <ScaledPaper scale={scale} widthPx={widthPx} estimatedHeightPx={(paper.heightMm || paper.widthMm * 2) * MM_TO_PX} className="mx-auto" paperClassName="rounded-sm shadow-lift">
              <DocumentPaper doc={doc} totals={totals} amountWords={words} />
            </ScaledPaper>
          ) : null}
        </div>
        <div className="mx-auto mt-6 flex max-w-[794px] flex-col items-center gap-3 text-center">
          <p className="text-xs text-slate-500">A view-only copy shared from the free Nexora invoice generator. Nothing here is stored or sent anywhere.</p>
          <div className="sm:hidden"><CreateOwnLink primary /></div>
        </div>
      </div>
      <PrintRoot doc={doc} totals={totals} amountWords={words} />
    </div>
  )
}

export default function ShareView({ fallback = null }) {
  const [state, setState] = useState({ status: 'loading' })
  // See studio.css: lets the sticky action bar stick.
  useEffect(() => {
    document.documentElement.classList.add('ds-tool-page')
    return () => document.documentElement.classList.remove('ds-tool-page')
  }, [])
  useEffect(() => {
    let active = true
    const run = () => {
      decodeShareView(window.location.hash).then((result) => {
        if (active) setState(result.ok ? { status: 'ok', doc: result.doc } : { status: 'error', reason: result.reason })
      }).catch(() => { if (active) setState({ status: 'error', reason: 'broken' }) })
    }
    run()
    window.addEventListener('hashchange', run)
    return () => {
      active = false
      window.removeEventListener('hashchange', run)
    }
  }, [])
  let body = fallback
  if (state.status === 'error') body = <ErrorScreen reason={state.reason} />
  else if (state.status === 'ok') body = <Viewer key={window.location.hash} doc={state.doc} />
  return <div className="ds-studio ds-share bg-slate-50" data-analytics-ignore>{body}</div>
}
