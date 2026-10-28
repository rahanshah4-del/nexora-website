import { useMemo, useState } from 'react'

const SEV = {
  critical: { label: 'Critical', chip: 'bg-rose-600 text-white', dot: 'bg-rose-600' },
  high: { label: 'High', chip: 'bg-rose-100 text-rose-800', dot: 'bg-rose-500' },
  medium: { label: 'Medium', chip: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' },
  low: { label: 'Low', chip: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' },
}
const SEV_ORDER = ['critical', 'high', 'medium', 'low']

const MODULE_LABELS = {
  botAccess: 'AI crawlers can reach you',
  jsDifferential: 'Content readable without JavaScript',
  bluf: 'Answer-first writing',
  facts: 'Concrete facts',
  pageHealth: 'Page health',
  health: 'Page health',
  structuredData: 'Structured data',
  schema: 'Structured data',
  speed: 'Speed',
  links: 'Links',
}
const prettify = (key) => MODULE_LABELS[key] || String(key).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase())

const grade = (n) => (n >= 90 ? { word: 'Excellent', tone: 'text-emerald-600', bar: 'bg-emerald-500' } : n >= 75 ? { word: 'Good', tone: 'text-sky-600', bar: 'bg-sky-500' } : n >= 55 ? { word: 'Needs work', tone: 'text-amber-600', bar: 'bg-amber-500' } : { word: 'Weak', tone: 'text-rose-600', bar: 'bg-rose-500' })
const scoreTone = (n) => (n === null || n === undefined ? 'bg-slate-100 text-slate-600' : n >= 90 ? 'bg-emerald-100 text-emerald-800' : n >= 75 ? 'bg-sky-100 text-sky-800' : n >= 55 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800')
const shortUrl = (u) => String(u || '').replace(/^https?:\/\/(www\.)?/, '')
const pct = (n, total) => (total > 0 ? Math.round((n / total) * 100) : 0)

function Distribution({ d, total }) {
  const parts = [
    { k: 'excellent', label: 'Excellent (90+)', n: d.excellent || 0, cls: 'bg-emerald-500' },
    { k: 'good', label: 'Good (75-89)', n: d.good || 0, cls: 'bg-sky-500' },
    { k: 'fair', label: 'Fair (55-74)', n: d.fair || 0, cls: 'bg-amber-500' },
    { k: 'poor', label: 'Poor (under 55)', n: d.poor || 0, cls: 'bg-rose-500' },
  ]
  const sum = parts.reduce((a, p) => a + p.n, 0) || total || 1
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100" role="img" aria-label={parts.map((p) => `${p.n} ${p.label}`).join(', ')}>
        {parts.map((p) => (p.n ? <span key={p.k} className={p.cls} style={{ width: `${(p.n / sum) * 100}%` }} /> : null))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
        {parts.map((p) => (
          <li key={p.k} className="flex items-center gap-2 text-slate-600"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${p.cls}`} /><span className="min-w-0"><strong className="text-slate-900">{p.n}</strong> {p.label}</span></li>
        ))}
      </ul>
    </div>
  )
}

function IssueCard({ issue, audited }) {
  const sev = SEV[issue.severity] || SEV.low
  const share = pct(issue.count, audited)
  return (
    <li className="rounded-2xl border border-slate-200 bg-white">
      <details className="group">
        <summary className="flex cursor-pointer list-none flex-col gap-2 p-4 sm:flex-row sm:items-center sm:gap-4">
          <span className="flex min-w-0 flex-1 items-start gap-2.5">
            <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[11px] font-black uppercase ${sev.chip}`}>{sev.label}</span>
            <span className="min-w-0 break-words text-[14.5px] font-semibold leading-6 text-slate-950">{issue.title}</span>
          </span>
          <span className="flex shrink-0 items-center gap-3 sm:w-52">
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100" aria-hidden="true"><span className={`block h-full rounded-full ${sev.dot}`} style={{ width: `${Math.max(4, share)}%` }} /></span>
            <span className="w-24 shrink-0 text-right text-[12.5px] font-semibold text-slate-600">{issue.count} page{issue.count === 1 ? '' : 's'} ({share}%)</span>
          </span>
        </summary>
        <div className="space-y-3 border-t border-slate-100 px-4 pb-4 pt-3 text-[14px] leading-6 text-slate-700">
          {issue.detail ? <p>{issue.detail}</p> : null}
          {issue.steps?.length ? (
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-emerald-700">How we fix it</p>
              <ol className="mt-1 list-decimal space-y-1 pl-5">{issue.steps.map((s) => <li key={s}>{s}</li>)}</ol>
            </div>
          ) : null}
          {issue.examples?.length ? (
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-slate-500">Examples</p>
              <ul className="mt-1 space-y-0.5 text-[13px] text-slate-600">{issue.examples.map((e) => <li key={e} className="break-all">{shortUrl(e)}</li>)}</ul>
            </div>
          ) : null}
        </div>
      </details>
    </li>
  )
}

/** The whole-website crawl on the client's Results tab: headline score, page quality, areas, grouped findings and a searchable page list. */
export default function CrawlResults({ crawl }) {
  const audited = crawl.pagesAudited || crawl.pages?.length || 0
  const score = crawl.score?.indexable
  const g = typeof score === 'number' ? grade(score) : null
  const d = crawl.distribution || {}
  const weak = (d.fair || 0) + (d.poor || 0)
  const issues = useMemo(() => crawl.issues || [], [crawl.issues])
  const bySev = useMemo(() => SEV_ORDER.map((k) => ({ k, n: issues.filter((i) => i.severity === k).length })).filter((x) => x.n), [issues])
  const modules = Object.entries(crawl.modules || {}).filter(([, v]) => typeof v === 'number').sort((a, b) => a[1] - b[1])

  const [sev, setSev] = useState('all')
  const [showAllIssues, setShowAllIssues] = useState(false)
  const shownIssues = issues.filter((i) => sev === 'all' || i.severity === sev)
  const issueList = showAllIssues ? shownIssues : shownIssues.slice(0, 8)

  const [query, setQuery] = useState('')
  const [weakOnly, setWeakOnly] = useState(false)
  const [limit, setLimit] = useState(20)
  const pages = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (crawl.pages || []).filter((p) => (!weakOnly || (p.scorePercent !== null && p.scorePercent !== undefined && p.scorePercent < 75) || p.scorePercent === null) && (!q || p.url.toLowerCase().includes(q) || (p.title || '').toLowerCase().includes(q)))
  }, [crawl.pages, query, weakOnly])

  const crawledOn = crawl.crawledAt ? new Date(crawl.crawledAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : ''
  const stopNote = { 'page-limit': 'We stopped at the page limit for this service.', 'time-limit': 'We stopped at the time limit.', cancelled: 'The crawl was stopped early.' }[crawl.stoppedBy]
  const top = issues.slice(0, 3)

  return (
    <section className="gx-card p-5 sm:p-6" aria-labelledby="crawl">
      <h2 id="crawl" className="text-[18px] font-bold text-slate-950">Your whole website, page by page</h2>
      <p className="mt-1 text-[14px] leading-6 text-slate-600">
        We checked {audited} page{audited === 1 ? '' : 's'}{crawl.pagesDiscovered > audited ? ` of the ${crawl.pagesDiscovered} we found` : ''}{crawledOn ? ` on ${crawledOn}` : ''}. {stopNote || ''} The same list is in your PDF report.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4 md:min-w-[230px]">
          <div className="text-center">
            <p className={`text-[44px] font-extrabold leading-none tabular-nums ${g?.tone || 'text-slate-950'}`}>{score ?? '-'}</p>
            <p className="mt-1 text-[12px] font-semibold text-slate-500">out of 100</p>
          </div>
          <div className="min-w-0">
            <p className={`text-[15px] font-bold ${g?.tone || 'text-slate-900'}`}>{g?.word || 'Site score'}</p>
            <p className="mt-0.5 text-[12.5px] leading-5 text-slate-500">Site score across pages search engines can index.{typeof crawl.score?.median === 'number' ? ` A typical page scores ${crawl.score.median}.` : ''}</p>
          </div>
        </div>
        <div className="min-w-0 rounded-2xl bg-slate-50 p-4">
          <p className="mb-3 text-[13px] font-semibold text-slate-700">How your {audited} pages score</p>
          <Distribution d={d} total={audited} />
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Pages checked', audited],
          ['Pages to improve', weak],
          ['Findings', issues.length],
          ['Critical or high', issues.filter((i) => i.severity === 'critical' || i.severity === 'high').length],
        ].map(([k, v]) => (
          <div key={k} className="min-w-0 rounded-xl border border-slate-200 p-3">
            <dt className="text-[12px] font-semibold text-slate-500">{k}</dt>
            <dd className="mt-0.5 text-[22px] font-extrabold tabular-nums text-slate-950">{v}</dd>
          </div>
        ))}
      </dl>

      {top.length ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-[13px] font-bold text-amber-900">Biggest wins first</p>
          <ul className="mt-2 space-y-1.5 text-[14px] leading-6 text-amber-950">
            {top.map((i) => <li key={i.title} className="flex gap-2"><span aria-hidden="true">&#9679;</span><span className="min-w-0 break-words"><strong>{i.title}</strong> affects {i.count} page{i.count === 1 ? '' : 's'} ({pct(i.count, audited)}%).</span></li>)}
          </ul>
        </div>
      ) : null}

      {modules.length ? (
        <div className="mt-6">
          <h3 className="text-[15px] font-bold text-slate-950">Where your site is strong and weak</h3>
          <ul className="mt-3 space-y-2.5">
            {modules.map(([k, v]) => (
              <li key={k} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[220px_minmax(0,1fr)_44px]">
                <span className="min-w-0 break-words text-[13.5px] font-semibold text-slate-800">{prettify(k)}</span>
                <span className="order-3 col-span-2 h-2.5 overflow-hidden rounded-full bg-slate-100 sm:order-none sm:col-span-1" aria-hidden="true"><span className={`block h-full rounded-full ${grade(v).bar}`} style={{ width: `${Math.max(3, Math.min(100, v))}%` }} /></span>
                <span className="text-right text-[13.5px] font-extrabold tabular-nums text-slate-900">{Math.round(v)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {issues.length ? (
        <div className="mt-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[15px] font-bold text-slate-950">What we found across the site ({issues.length})</h3>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter findings by priority">
              {[{ k: 'all', n: issues.length }, ...bySev].map((x) => (
                <button key={x.k} type="button" aria-pressed={sev === x.k} onClick={() => { setSev(x.k); setShowAllIssues(false) }} className={`gx-focus min-h-[34px] rounded-full px-3 text-[12.5px] font-bold transition ${sev === x.k ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                  {x.k === 'all' ? 'All' : SEV[x.k].label} {x.n}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-1 text-[13px] text-slate-500">Tap a finding to see what it means, how we fix it and examples.</p>
          <ul className="mt-3 space-y-2.5">{issueList.map((i) => <IssueCard key={i.title} issue={i} audited={audited} />)}</ul>
          {shownIssues.length > 8 ? <button type="button" onClick={() => setShowAllIssues((v) => !v)} className="gx-focus mt-3 min-h-[40px] rounded-full bg-slate-100 px-4 text-[13.5px] font-semibold text-slate-800 hover:bg-slate-200">{showAllIssues ? 'Show fewer' : `Show all ${shownIssues.length}`}</button> : null}
        </div>
      ) : null}

      {crawl.pages?.length ? (
        <div className="mt-7">
          <h3 className="text-[15px] font-bold text-slate-950">Every page, weakest first</h3>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setLimit(20) }} placeholder="Search pages" aria-label="Search pages" className="gx-focus min-h-[42px] w-full min-w-0 rounded-full border border-slate-200 px-4 text-[14px] sm:w-auto sm:max-w-xs sm:flex-1" />
            <label className="flex min-h-[42px] cursor-pointer items-center gap-2 rounded-full bg-slate-100 px-4 text-[13.5px] font-semibold text-slate-700"><input type="checkbox" checked={weakOnly} onChange={(e) => { setWeakOnly(e.target.checked); setLimit(20) }} className="h-4 w-4 accent-blue-600" />Only pages to improve</label>
            <span className="text-[12.5px] font-semibold text-slate-500">{pages.length} shown</span>
          </div>
          <ul className="mt-2 divide-y divide-slate-100">
            {pages.slice(0, limit).map((p) => (
              <li key={p.url} className="flex items-start gap-3 py-2.5">
                <span title={p.scorePercent === null || p.scorePercent === undefined ? `Not scored${p.status ? ` (HTTP ${p.status})` : ''}` : undefined} className={`w-12 shrink-0 rounded-lg px-1 py-1 text-center text-[13px] font-extrabold tabular-nums ${scoreTone(p.scorePercent)}`}>{p.scorePercent ?? 'n/a'}</span>
                <span className="min-w-0 flex-1">
                  {p.title ? <span className="block break-words text-[13.5px] font-semibold leading-5 text-slate-900">{p.title}</span> : null}
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="block break-all text-[12.5px] leading-5 text-blue-700 hover:underline">{shortUrl(p.url)}</a>
                  {p.top?.length ? <span className="mt-0.5 flex flex-wrap gap-1">{p.top.map((t) => <span key={t} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11.5px] font-semibold text-slate-600">{t}</span>)}</span> : p.problems === 0 ? <span className="text-[12px] font-semibold text-emerald-700">No problems found</span> : null}
                </span>
                {p.problems > 0 ? <span className="shrink-0 text-[12px] font-semibold text-slate-500">{p.problems} issue{p.problems === 1 ? '' : 's'}</span> : null}
              </li>
            ))}
          </ul>
          {pages.length > limit ? <button type="button" onClick={() => setLimit((n) => n + 30)} className="gx-focus mt-3 min-h-[40px] rounded-full bg-slate-100 px-4 text-[13.5px] font-semibold text-slate-800 hover:bg-slate-200">Show 30 more</button> : null}
          {pages.length === 0 ? <p className="mt-3 text-[14px] text-slate-500">No page matches.</p> : null}
          {crawl.pagesOmitted > 0 ? <p className="mt-3 text-[12.5px] text-slate-500">+ {crawl.pagesOmitted} more pages were checked and are not listed here.</p> : null}
        </div>
      ) : null}
    </section>
  )
}
