import { useCallback, useEffect, useRef, useState } from 'react'
import { GEOLINT_API_URL, geoBadgeUrl, planGeoSiteScan, runGeoAudit } from '../../../lib/geolint.js'
import { hostLabel } from '../../../lib/geolintReport.js'
import { GEOLINT_PATH } from '../../../lib/geolintLaunch.js'
import { badgeEmbed, pagesToScan, rowFromReport, summarizeSiteScan } from '../../../lib/geolintSite.js'
import { Pill } from './GeoLintVisuals.jsx'

const SITE = 'https://nexorasolution.online'
const SCAN_PAGES = 8
const tone = (p) => (p >= 80 ? 'emerald' : p >= 60 ? 'amber' : p >= 40 ? 'orange' : 'rose')
const btn = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-5 text-[14px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-50'
const pathOf = (u) => { try { const x = new URL(u); return `${x.pathname}${x.search}` || '/' } catch { return u } }

function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { setCopied(false) }
  }
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
        <span className="text-[12px] font-medium text-slate-300">{label}</span>
        <button type="button" onClick={copy} className="shrink-0 rounded-md bg-white/10 px-2.5 py-1 text-[12px] font-semibold text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300">{copied ? 'Copied' : 'Copy'}</button>
      </div>
      <pre className="overflow-x-auto p-3 text-[12px] leading-5 text-slate-100"><code>{value}</code></pre>
    </div>
  )
}

/** Shareable score badge: image preview plus HTML and Markdown embed code. */
export function BadgePanel({ report }) {
  const imageUrl = geoBadgeUrl(report?.id)
  const [broken, setBroken] = useState(false)
  if (!imageUrl) return null
  const earned = report?.score?.earned
  const max = report?.score?.evaluatedMax
  const score = max > 0 ? Math.round((earned / max) * 100) : 0
  const code = badgeEmbed({ imageUrl, toolUrl: `${SITE}${GEOLINT_PATH}/`, score })
  return (
    <div className="gl-card p-5">
      {broken ? (
        <p className="text-[14px] leading-6 text-slate-600">The badge is not available for this report right now. Run the audit again to get a fresh one.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-4">
            <img src={imageUrl} alt={`GeoLint AI-readiness score ${score}/100`} height="22" className="h-[22px]" onError={() => setBroken(true)} />
            <p className="text-[13.5px] leading-6 text-slate-600">It shows the score of this audit and links to GeoLint. It is drawn from the saved audit, so the number cannot be changed by hand.</p>
          </div>
          <CopyField label="HTML" value={code.html} />
          <CopyField label="Markdown" value={code.markdown} />
          <p className="mt-3 text-[12.5px] leading-5 text-slate-500">The badge stays up while the audit is stored (90 days). Run a new audit and swap the code to show a newer score.</p>
        </>
      )}
    </div>
  )
}

/** Audits a sample of the site's pages from its sitemap and summarises them. */
export function SiteScanPanel({ report }) {
  const [phase, setPhase] = useState('idle') // idle | planning | running | done | error
  const [rows, setRows] = useState([])
  const [note, setNote] = useState('')
  const abort = useRef(null)
  const origin = (() => { try { return new URL(report?.url).origin } catch { return '' } })()
  useEffect(() => () => abort.current?.abort(), [])

  const start = useCallback(async () => {
    const ctl = new AbortController()
    abort.current = ctl
    setPhase('planning')
    setNote('')
    try {
      const plan = await planGeoSiteScan(origin, { limit: SCAN_PAGES, signal: ctl.signal })
      const first = rowFromReport(report.url, report)
      const todo = pagesToScan(plan, report.url, SCAN_PAGES)
      let list = [first, ...todo.map((url) => ({ url, status: 'waiting', percent: null, fixes: [] }))]
      setRows(list)
      setNote(plan.sitemap ? `Found ${plan.total} pages in the sitemap. Auditing a sample of ${list.length}.` : 'No sitemap was found, so only this page could be scanned.')
      setPhase('running')
      for (let i = 1; i < list.length; i += 1) {
        const url = list[i].url
        list = list.map((r, j) => (j === i ? { ...r, status: 'running' } : r))
        setRows(list)
        let next
        try {
          next = rowFromReport(url, await runGeoAudit(url, { signal: ctl.signal }))
        } catch (err) {
          if (err?.name === 'AbortError') throw err
          next = { url, status: 'failed', percent: null, fixes: [], error: err?.message || 'The audit failed.' }
        }
        list = list.map((r, j) => (j === i ? next : r))
        setRows(list)
      }
      setPhase('done')
    } catch (err) {
      if (err?.name === 'AbortError') { setPhase('idle'); return }
      setNote(err?.message || 'The site scan could not start.')
      setPhase('error')
    }
  }, [origin, report])

  if (!GEOLINT_API_URL || !origin) return null
  const summary = summarizeSiteScan(rows)
  const running = phase === 'planning' || phase === 'running'
  return (
    <div className="gl-card p-5">
      {phase === 'idle' || phase === 'error' ? (
        <>
          <p className="text-[14px] leading-6 text-slate-600">One page is rarely the whole story. This audits up to {SCAN_PAGES} pages picked from your sitemap, including different sections of the site, and shows the average score and the pages that need work first. It takes about {SCAN_PAGES * 20} seconds per run.</p>
          <button type="button" onClick={start} className={`${btn} mt-4 bg-slate-950 text-white hover:bg-slate-800`}>Scan {hostLabel(origin)}</button>
          {phase === 'error' ? <p role="alert" className="mt-3 text-[13.5px] text-rose-600">{note}</p> : null}
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13.5px] text-slate-600" aria-live="polite">{phase === 'planning' ? 'Reading the sitemap…' : note}</p>
            {running ? <button type="button" onClick={() => abort.current?.abort()} className={`${btn} border border-slate-300 text-slate-800 hover:bg-slate-50`}>Stop</button> : null}
          </div>
          {phase === 'done' && summary.average !== null ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Site average</p><p className="font-display text-3xl font-bold text-slate-950">{summary.average}<span className="text-base text-slate-500">/100</span></p><p className="text-[12.5px] text-slate-500">{summary.pages} pages{summary.failed ? `, ${summary.failed} failed` : ''}</p></div>
              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200 sm:col-span-2"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Fixes that repeat across pages</p>{summary.repeated.length ? <ul className="mt-1 space-y-1 text-[13.5px] text-slate-700">{summary.repeated.map((r) => <li key={r.id}>{r.title} <span className="text-slate-500">({r.pages} pages)</span></li>)}</ul> : <p className="mt-1 text-[13.5px] text-slate-600">No single fix shows up on more than one page.</p>}</div>
            </div>
          ) : null}
          <ul className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200">
            {rows.map((r) => (
              <li key={r.url} className="p-3">
                <div className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-slate-700" title={r.url}>{pathOf(r.url)}</span>
                  {r.status === 'done' ? <Pill tone={tone(r.percent ?? 0)}>{r.percent ?? '—'}/100</Pill> : r.status === 'failed' ? <Pill tone="rose">Failed</Pill> : r.status === 'running' ? <Pill tone="amber">Auditing…</Pill> : <Pill tone="slate">Waiting</Pill>}
                </div>
                {r.status === 'done' && r.fixes.length ? <p className="mt-1.5 text-[12.5px] leading-5 text-slate-500">Fix first: {r.fixes.map((f) => f.title).join(' · ')}</p> : null}
                {r.status === 'failed' ? <p className="mt-1.5 text-[12.5px] text-rose-600">{r.error}</p> : null}
              </li>
            ))}
          </ul>
          {phase === 'done' ? <button type="button" onClick={() => { setRows([]); setPhase('idle') }} className={`${btn} mt-4 border border-slate-300 text-slate-800 hover:bg-slate-50`}>Scan again</button> : null}
        </>
      )}
    </div>
  )
}
