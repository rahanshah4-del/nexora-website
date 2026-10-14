import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { GEOLINT_API_URL, streamSiteAudit } from '../../../lib/geolint.js'
import { hostLabel } from '../../../lib/geolintReport.js'
import { filterPages, initialSiteState, pagesCsv, reduceSiteEvent, siteProgress } from '../../../lib/geolintSite.js'
import CrawlerAnimation from './GeoLintCrawler.jsx'
import { BadgePanel } from './GeoLintExtras.jsx'
import { Pill } from './GeoLintVisuals.jsx'

const LIMITS = [100, 250, 500, 1000]
const PAGE_SIZE = 25
const SEV = { critical: ['Critical', 'rose'], high: ['High', 'rose'], medium: ['Medium', 'amber'], low: ['Low', 'slate'], fail: ['Fix', 'rose'], warn: ['Improve', 'amber'] }
const MODULES = [['botAccess', 'Bot access'], ['jsDifferential', 'JavaScript'], ['bluf', 'Answer-first'], ['facts', 'Facts & schema']]
const HEALTH = [['metrics', 'Metrics'], ['content', 'Content'], ['indexability', 'Indexability'], ['structured', 'Structured data'], ['social', 'Social tags'], ['images', 'Images'], ['headers', 'HTTP headers'], ['links', 'Links']]
const STOPPED = { 'page-limit': 'The page limit was reached before every page was audited.', 'time-limit': 'The time limit was reached before every page was audited.', cancelled: 'The audit was stopped.' }
const tone = (p) => (p === null || p === undefined ? 'slate' : p >= 85 ? 'emerald' : p >= 70 ? 'amber' : p >= 50 ? 'orange' : 'rose')
const TEXT = { emerald: 'text-emerald-600', amber: 'text-amber-600', orange: 'text-orange-600', rose: 'text-rose-600', slate: 'text-slate-500' }
const BAR = { emerald: 'bg-emerald-500', amber: 'bg-amber-500', orange: 'bg-orange-500', rose: 'bg-rose-500', slate: 'bg-slate-300' }
const btn = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-5 text-[14px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-50'
const pathOf = (u) => { try { const x = new URL(u); return `${x.pathname}${x.search}` || '/' } catch { return u } }

function save(name, text, type) {
  try {
    const url = URL.createObjectURL(new Blob([text], { type }))
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch { /* downloads are a convenience */ }
}

function Code({ snippet, note }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => { try { await navigator.clipboard.writeText(snippet.code); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { setCopied(false) } }
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
        <span className="min-w-0 truncate text-[12px] font-medium text-slate-300">{snippet.label}{note ? ` · ${note}` : ''}</span>
        <button type="button" onClick={copy} className="shrink-0 rounded-md bg-white/10 px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300">{copied ? 'Copied' : 'Copy'}</button>
      </div>
      <pre className="max-h-64 overflow-auto p-3 text-[12px] leading-5 text-slate-100"><code>{snippet.code}</code></pre>
    </div>
  )
}

function Fix({ fix }) {
  if (!fix) return null
  return (
    <>
      {fix.steps?.length ? (
        <>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">How to fix it</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-[14px] leading-6 text-slate-700">{fix.steps.map((s) => <li key={s}>{s}</li>)}</ol>
        </>
      ) : null}
      {fix.snippet ? <Code snippet={fix.snippet} note={fix.exampleFrom ? `example from ${pathOf(fix.exampleFrom)}` : ''} /> : null}
    </>
  )
}

function Bar({ value }) {
  const t = tone(value)
  return <span className="block h-2 w-full overflow-hidden rounded-full bg-slate-100"><span className={`block h-full rounded-full ${BAR[t]}`} style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }} /></span>
}

function IssueRow({ issue }) {
  const [label, t] = SEV[issue.severity] || SEV.low
  return (
    <li>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-start gap-3 p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2"><Pill tone={t}>{label}</Pill><span className="text-[14.5px] font-semibold text-slate-900">{issue.title}</span></span>
            <span className="mt-1 block text-[13px] leading-5 text-slate-500">{issue.source === 'site' ? 'Found by crawling the site' : `${issue.count} page${issue.count === 1 ? '' : 's'}`} · {issue.detail}</span>
          </span>
          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-[12px] font-semibold tabular-nums text-slate-700">{issue.count}</span>
        </summary>
        <div className="px-4 pb-4">
          {issue.examples?.length ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Where</p>
              <ul className="mt-1 space-y-0.5 text-[12.5px] text-slate-600">{issue.examples.map((e) => <li key={e} className="break-all font-mono">{e}</li>)}</ul>
            </>
          ) : null}
          <Fix fix={issue.fix} />
        </div>
      </details>
    </li>
  )
}

function PageRow({ page }) {
  const t = tone(page.score?.percent)
  return (
    <li>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 flex-1">
            <span className="block truncate font-mono text-[12.5px] text-slate-800" title={page.finalUrl}>{pathOf(page.finalUrl || page.url)}</span>
            <span className="block truncate text-[12px] text-slate-500">{page.error || page.title || '—'}</span>
          </span>
          {!page.indexable && page.score ? <span className="hidden text-[11px] font-semibold uppercase text-slate-400 sm:inline">not indexable</span> : null}
          {page.score ? <span className={`w-14 text-right font-display text-[17px] font-bold tabular-nums ${TEXT[t]}`}>{Math.round(page.score.percent)}</span> : <Pill tone="rose">{page.status ?? 'Error'}</Pill>}
        </summary>
        <div className="space-y-2 bg-slate-50/70 px-4 pb-4 pt-2 text-[13px] text-slate-600">
          {page.score ? (
            <p>{page.score.earned} of {page.score.evaluatedMax} points{page.score.evaluatedMax < 100 ? ' (JavaScript not measured on this page)' : ''}. {page.rendered ? 'Rendered in a browser.' : ''} {page.verified ? 'Arithmetic re-checked.' : 'Arithmetic check failed: re-run this page.'}</p>
          ) : null}
          {page.modules ? <p className="flex flex-wrap gap-x-4 gap-y-1">{MODULES.map(([k, l]) => <span key={k}>{l}: {page.modules[k].status === 'unavailable' ? 'not measured' : `${page.modules[k].score}/${page.modules[k].max}`}</span>)}</p> : null}
          {(page.problems || []).length ? (
            <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
              {page.problems.slice(0, 15).map((pr) => (
                <li key={`${pr.source}:${pr.id}`}>
                  <details>
                    <summary className="flex cursor-pointer list-none items-start gap-2 p-3 [&::-webkit-details-marker]:hidden">
                      <Pill tone={(SEV[pr.severity] || SEV.low)[1]}>{(SEV[pr.severity] || SEV.low)[0]}</Pill>
                      <span className="min-w-0 flex-1"><span className="font-semibold text-slate-800">{pr.title}</span> <span className="text-slate-500">{pr.detail}</span></span>
                    </summary>
                    <div className="px-3 pb-3"><Fix fix={pr.fix} /></div>
                  </details>
                </li>
              ))}
            </ul>
          ) : page.score ? <p>No problems found on this page.</p> : null}
          <a href={page.finalUrl || page.url} target="_blank" rel="noopener noreferrer" className="inline-block font-semibold text-blue-700 hover:underline">Open page ↗</a>
        </div>
      </details>
    </li>
  )
}

function Results({ state }) {
  const { summary, crawl } = state
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('score-asc')
  const [shown, setShown] = useState(PAGE_SIZE)
  const [allIssues, setAllIssues] = useState(false)
  const list = useMemo(() => filterPages(state.pages, { filter, query, sort }), [state.pages, filter, query, sort])
  const score = summary.score.indexable ?? summary.score.all
  const total = Object.values(summary.distribution).reduce((a, b) => a + b, 0) || 1
  const issues = allIssues ? summary.issues : summary.issues.slice(0, 12)
  const host = hostLabel(state.origin)
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
        <div className="rounded-2xl bg-slate-950 p-5 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-300">Site score</p>
          <p className="mt-1 font-display text-5xl font-bold tabular-nums">{score ?? '—'}<span className="text-xl text-slate-400">/100</span></p>
          <p className="mt-1 text-[12.5px] text-slate-400">Average of {summary.pages.indexable} indexable page{summary.pages.indexable === 1 ? '' : 's'} · median {summary.score.median ?? '—'}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[['Pages audited', crawl.audited], ['Found', crawl.discovered], ['Errors', summary.pages.errors], ['Rendered', crawl.renderedPages]].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{l}</p><p className="font-display text-2xl font-bold tabular-nums text-slate-950">{v}</p></div>
          ))}
          <div className="col-span-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200 sm:col-span-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Score spread</p>
            <div className="mt-2 flex h-3 overflow-hidden rounded-full">{[['excellent', 'bg-emerald-500'], ['good', 'bg-amber-400'], ['fair', 'bg-orange-500'], ['poor', 'bg-rose-500']].map(([k, c]) => <span key={k} className={c} style={{ width: `${(summary.distribution[k] / total) * 100}%` }} title={`${k}: ${summary.distribution[k]}`} />)}</div>
            <p className="mt-1.5 text-[12px] text-slate-500">85+ {summary.distribution.excellent} · 70-84 {summary.distribution.good} · 50-69 {summary.distribution.fair} · under 50 {summary.distribution.poor}</p>
          </div>
        </div>
      </div>
      {STOPPED[crawl.stoppedBy] ? <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-[13.5px] text-amber-900">{STOPPED[crawl.stoppedBy]} {crawl.notAudited} more page{crawl.notAudited === 1 ? ' was' : 's were'} found but not audited.</p> : null}
      <p className="text-[12.5px] leading-5 text-slate-500">Every page was fetched as OAI-SearchBot and scored with the same checks as a single-page audit. robots.txt is checked for every page; each AI crawler's firewall result was measured once on the homepage. {crawl.renderedPages} page{crawl.renderedPages === 1 ? ' was' : 's were'} rendered in a browser; on the rest the JavaScript check is left out of the score rather than guessed. Took {Math.round(state.durationMs / 1000)} s.</p>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl ring-1 ring-slate-200 p-4">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">GEO checks, site average</p>
          <ul className="mt-3 space-y-2.5">{MODULES.map(([k, l]) => <li key={k} className="grid grid-cols-[8.5rem_1fr_2.5rem] items-center gap-3 text-[13.5px]"><span className="text-slate-700">{l}</span><Bar value={summary.modules[k]} /><span className="text-right tabular-nums text-slate-600">{summary.modules[k] ?? '—'}</span></li>)}</ul>
        </div>
        <div className="rounded-2xl ring-1 ring-slate-200 p-4">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">Page health, site average</p>
          <ul className="mt-3 space-y-2">{HEALTH.map(([k, l]) => <li key={k} className="grid grid-cols-[8.5rem_1fr_2.5rem] items-center gap-3 text-[13.5px]"><span className="text-slate-700">{l}</span><Bar value={summary.health[k]} /><span className="text-right tabular-nums text-slate-600">{summary.health[k] ?? '—'}</span></li>)}</ul>
        </div>
      </div>

      <div>
        <h3 className="font-display text-lg font-bold text-slate-950">Fix these across the site</h3>
        <p className="mt-1 text-[13.5px] text-slate-500">Most urgent first, then by how many pages are affected. Open one for the pages, the steps and the code to copy.</p>
        {summary.issues.length ? (
          <>
            <ul className="mt-3 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">{issues.map((i) => <IssueRow key={`${i.source}:${i.id}`} issue={i} />)}</ul>
            {summary.issues.length > 12 ? <button type="button" onClick={() => setAllIssues((v) => !v)} className={`${btn} mt-3 border border-slate-300 text-slate-800 hover:bg-slate-50`}>{allIssues ? 'Show fewer' : `Show all ${summary.issues.length} issues`}</button> : null}
          </>
        ) : <p className="mt-3 rounded-xl bg-emerald-50 p-4 text-[14px] text-emerald-800">No issues found across the site.</p>}
      </div>

      <div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h3 className="font-display text-lg font-bold text-slate-950">Every page</h3>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => save(`geolint-site-${host}.csv`, pagesCsv(state.pages), 'text/csv;charset=utf-8')} className={`${btn} border border-slate-300 text-slate-800 hover:bg-slate-50`}>Download CSV</button>
            <button type="button" onClick={() => save(`geolint-site-${host}.json`, JSON.stringify({ origin: state.origin, crawl, summary, pages: state.pages }, null, 2), 'application/json')} className={`${btn} border border-slate-300 text-slate-800 hover:bg-slate-50`}>Download JSON</button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setShown(PAGE_SIZE) }} placeholder="Search URL or title" aria-label="Search pages" className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-slate-300 px-3 text-[14px] focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200" />
          <select value={filter} onChange={(e) => { setFilter(e.target.value); setShown(PAGE_SIZE) }} aria-label="Filter pages" className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-[14px]"><option value="all">All pages</option><option value="indexable">Indexable</option><option value="poor">Score under 50</option><option value="errors">Errors</option></select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort pages" className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-[14px]"><option value="score-asc">Lowest score first</option><option value="score-desc">Highest score first</option><option value="url">By address</option></select>
        </div>
        <p className="mt-2 text-[12.5px] text-slate-500">{list.length} page{list.length === 1 ? '' : 's'}</p>
        <ul className="mt-2 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">{list.slice(0, shown).map((p) => <PageRow key={p.url} page={p} />)}</ul>
        {list.length > shown ? <button type="button" onClick={() => setShown((n) => n + PAGE_SIZE)} className={`${btn} mt-3 border border-slate-300 text-slate-800 hover:bg-slate-50`}>Show {Math.min(PAGE_SIZE, list.length - shown)} more</button> : null}
      </div>

      {state.savedId ? (
        <div>
          <h3 className="font-display text-lg font-bold text-slate-950">Site score badge</h3>
          <div className="mt-3"><BadgePanel report={{ id: state.savedId, score: { earned: score ?? 0, evaluatedMax: 100 } }} /></div>
        </div>
      ) : null}
    </div>
  )
}

/** Whole-site audit: streams progress from the engine, then shows the site score, grouped issues and every page. */
export default function SiteAuditPanel({ url }) {
  const [state, dispatch] = useReducer((s, e) => (e === 'reset' ? initialSiteState() : reduceSiteEvent(s, e)), undefined, initialSiteState)
  const [phase, setPhase] = useState('idle') // idle | running | finishing | done | error
  const [error, setError] = useState('')
  const [limit, setLimit] = useState(500)
  const abort = useRef(null)
  const finishTimer = useRef(null)
  const origin = (() => { try { return new URL(url).origin } catch { return '' } })()
  useEffect(() => () => { abort.current?.abort(); clearTimeout(finishTimer.current) }, [])

  const start = useCallback(async () => {
    const ctl = new AbortController()
    abort.current = ctl
    dispatch('reset')
    setError('')
    setPhase('running')
    try {
      await streamSiteAudit(origin, { maxPages: limit, signal: ctl.signal, onEvent: dispatch })
      setPhase('finishing')
      await new Promise((r) => { finishTimer.current = setTimeout(r, 1600) })
      setPhase('done')
    } catch (err) {
      if (err?.name === 'AbortError') { setPhase('idle'); return }
      setError(err?.message || 'The site audit could not finish.')
      setPhase('error')
    }
  }, [origin, limit])

  if (!GEOLINT_API_URL || !origin) return null
  if (phase === 'done' && state.summary) return <div className="gl-card p-5"><Results state={state} /><button type="button" onClick={() => { dispatch('reset'); setPhase('idle') }} className={`${btn} mt-6 border border-slate-300 text-slate-800 hover:bg-slate-50`}>Run a new site audit</button></div>

  const pct = siteProgress(state)
  return (
    <div className="gl-card p-5">
      {phase === 'running' || phase === 'finishing' ? (
        <CrawlerAnimation host={hostLabel(origin)} state={state} pct={pct} finishing={phase === 'finishing'} onStop={() => abort.current?.abort()} />
      ) : (
        <>
          <p className="text-[14px] leading-6 text-slate-600">Audit every page of {hostLabel(origin)}: we read robots.txt and every sitemap, follow the links on each page, and score each one with the same checks as this report. You get a site score, the problems that repeat across pages with the fix for each, and a table of every page.</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="text-[13.5px] text-slate-700">Up to
              <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="ml-2 min-h-[44px] rounded-xl border border-slate-300 px-3 text-[14px]">{LIMITS.map((n) => <option key={n} value={n}>{n} pages</option>)}</select>
            </label>
            <button type="button" onClick={start} className={`${btn} bg-slate-950 text-white hover:bg-slate-800`}>Audit the whole website</button>
          </div>
          {phase === 'error' ? <p role="alert" className="mt-3 text-[13.5px] text-rose-600">{error}</p> : null}
        </>
      )}
    </div>
  )
}
