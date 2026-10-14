import { useState } from 'react'
import { Pill } from './GeoLintVisuals.jsx'

const STATUS = {
  fail: { label: 'Fix', tone: 'rose', dot: 'bg-rose-500' },
  warn: { label: 'Improve', tone: 'amber', dot: 'bg-amber-500' },
  pass: { label: 'Good', tone: 'emerald', dot: 'bg-emerald-500' },
  info: { label: 'Note', tone: 'slate', dot: 'bg-slate-400' },
}
const RANK = { fail: 0, warn: 1, info: 2, pass: 3 }
const scoreTone = (n) => (n === null ? 'slate' : n >= 85 ? 'emerald' : n >= 60 ? 'amber' : 'rose')
const btn = 'rounded-md bg-white/10 px-2.5 py-1 text-[12px] font-semibold text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300'

function Code({ snippet }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(snippet.code); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { setCopied(false) }
  }
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
        <span className="min-w-0 truncate text-[12px] font-medium text-slate-300">{snippet.label}</span>
        <button type="button" onClick={copy} className={`shrink-0 ${btn}`}>{copied ? 'Copied' : 'Copy'}</button>
      </div>
      <pre tabIndex={0} aria-label="Code you can copy" className="max-h-64 overflow-auto p-3 text-[12px] leading-5 text-slate-100"><code>{snippet.code}</code></pre>
    </div>
  )
}

function CheckRow({ item, open }) {
  const s = STATUS[item.status] || STATUS.info
  const hasFix = item.fix && (item.fix.steps?.length || item.fix.snippet)
  const head = (
    <span className="flex w-full items-start gap-3 text-left">
      <span aria-hidden="true" className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${s.dot}`} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2"><span className="text-[14.5px] font-semibold text-slate-900">{item.label}</span><Pill tone={s.tone}>{s.label}</Pill></span>
        <span className="mt-0.5 block text-[13.5px] leading-6 text-slate-600">{item.detail}</span>
      </span>
    </span>
  )
  if (!hasFix || item.status === 'pass') return <li className="p-4">{head}</li>
  return (
    <li>
      <details open={open} className="group">
        <summary className="flex cursor-pointer list-none items-start gap-2 p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400 [&::-webkit-details-marker]:hidden">
          {head}
          <svg viewBox="0 0 20 20" className="mt-1.5 h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true"><path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span className="sr-only">Show the fix</span>
        </summary>
        <div className="px-4 pb-4 pl-[2.6rem]">
          {item.why ? <p className="text-[13.5px] leading-6 text-slate-600"><span className="font-semibold text-slate-700">Why it matters:</span> {item.why}</p> : null}
          {item.fix?.steps?.length ? (
            <>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">How to fix it</p>
              <ol className="mt-1 list-decimal space-y-1 pl-5 text-[14px] leading-6 text-slate-700">{item.fix.steps.map((st) => <li key={st}>{st}</li>)}</ol>
            </>
          ) : null}
          {item.fix?.snippet ? <Code snippet={item.fix.snippet} /> : null}
        </div>
      </details>
    </li>
  )
}

/** The eight page-health groups: tabs with a score each, problems first, every one with a fix to copy. */
export default function PageHealthPanel({ health }) {
  const categories = Array.isArray(health?.categories) ? health.categories.filter((c) => c && Array.isArray(c.checks)) : []
  const firstBad = categories.find((c) => c.checks.some((k) => k.status === 'fail')) || categories.find((c) => c.checks.some((k) => k.status === 'warn')) || categories[0]
  const [active, setActive] = useState(firstBad?.id)
  if (!categories.length) return null
  const cat = categories.find((c) => c.id === active) || categories[0]
  const rows = [...cat.checks].sort((a, b) => (RANK[a.status] ?? 4) - (RANK[b.status] ?? 4))
  const s = health.summary || {}
  return (
    <div className="gl-card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[13px] text-slate-600">
        <span className="font-semibold text-slate-800">{(s.fail || 0) + (s.warn || 0) === 0 ? 'Nothing to fix here.' : `${s.fail || 0} to fix, ${s.warn || 0} to improve.`}</span>
        <span>{s.pass || 0} checks passed. Open any problem for the fix and the code to copy.</span>
      </div>
      <div role="tablist" aria-label="Page health groups" className="flex gap-1 overflow-x-auto border-b border-slate-200 p-2">
        {categories.map((c) => {
          const bad = c.checks.filter((k) => k.status === 'fail' || k.status === 'warn').length
          return (
            <button key={c.id} type="button" role="tab" aria-selected={c.id === cat.id} onClick={() => setActive(c.id)} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${c.id === cat.id ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
              {c.label}
              {bad > 0 ? <span className={`rounded-full px-1.5 text-[11px] ${c.id === cat.id ? 'bg-amber-300 text-slate-900' : 'bg-amber-100 text-amber-800'}`}>{bad}</span> : <span aria-hidden="true" className={c.id === cat.id ? 'text-emerald-300' : 'text-emerald-600'}>✓</span>}
            </button>
          )
        })}
      </div>
      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        <h3 className="font-display text-lg font-bold text-slate-950">{cat.label}</h3>
        {cat.score === null ? <Pill tone="slate">Information</Pill> : <Pill tone={scoreTone(cat.score)}>{cat.score}/100</Pill>}
      </div>
      <ul className="mt-2 divide-y divide-slate-100">
        {rows.map((item) => <CheckRow key={`${cat.id}:${item.id}`} item={item} open={false} />)}
      </ul>
      {health.basis?.jsOnlyTags?.length ? <p className="border-t border-slate-100 px-5 py-3 text-[12.5px] leading-5 text-slate-500">Some tags only exist after JavaScript runs. Social scrapers and many AI crawlers do not run JavaScript, so those tags are treated as missing.</p> : null}
    </div>
  )
}
