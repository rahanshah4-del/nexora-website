import { useEffect, useMemo, useState } from 'react'

/**
 * Live crawler animation for the whole-site audit. Every dot is a page the engine really audited
 * (coloured by its score); the radar sweep and pulse rings are decoration that shows work is running.
 */

const MAX_DOTS = 300
const GOLDEN = Math.PI * (3 - Math.sqrt(5))
const COLOR = { emerald: '#10b981', amber: '#f59e0b', orange: '#f97316', rose: '#f43f5e', slate: '#94a3b8' }
const toneOf = (p) => (p === null || p === undefined ? 'slate' : p >= 85 ? 'emerald' : p >= 70 ? 'amber' : p >= 50 ? 'orange' : 'rose')
const pathOf = (u) => { try { const x = new URL(u); return `${x.pathname}${x.search}` || '/' } catch { return u } }
const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

const CSS = `
.glc-sweep{transform-origin:150px 150px;animation:glc-spin 3.2s linear infinite}
.glc-ring{transform-origin:150px 150px;transform-box:view-box;animation:glc-ring 3s ease-out infinite;fill:none;stroke:#6366f1}
.glc-ring:nth-of-type(2){animation-delay:1s}.glc-ring:nth-of-type(3){animation-delay:2s}
.glc-dot{transform-box:fill-box;transform-origin:center;animation:glc-pop .6s cubic-bezier(.2,1.6,.4,1) both}
.glc-core{transform-box:fill-box;transform-origin:center;animation:glc-beat 1.6s ease-in-out infinite}
.glc-cursor{animation:glc-blink 1s steps(2) infinite}
.glc-bar{background-size:200% 100%;animation:glc-flow 1.4s linear infinite}
@keyframes glc-spin{to{transform:rotate(360deg)}}
@keyframes glc-ring{0%{r:14;opacity:.55;stroke-width:2}100%{r:140;opacity:0;stroke-width:.5}}
@keyframes glc-pop{0%{transform:scale(0);opacity:0}60%{opacity:1}100%{transform:scale(1);opacity:1}}
@keyframes glc-beat{0%,100%{transform:scale(1)}50%{transform:scale(1.18)}}
@keyframes glc-blink{50%{opacity:0}}
@keyframes glc-flow{to{background-position:-200% 0}}
@media (prefers-reduced-motion:reduce){.glc-sweep,.glc-ring,.glc-dot,.glc-core,.glc-cursor,.glc-bar{animation:none!important}.glc-ring{opacity:.2}}
`

function position(i, depth) {
  const ring = Math.min(depth || 0, 4)
  const r = i === 0 ? 0 : 34 + ring * 25 + ((i * 7) % 11)
  const a = i * GOLDEN
  return [150 + Math.cos(a) * r, 150 + Math.sin(a) * r]
}

function Steps({ stage }) {
  const items = [['Robots & sitemaps', 0], ['Crawling & scoring', 1], ['Building report', 2]]
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]">
      {items.map(([label, n], i) => (
        <li key={label} className="flex items-center gap-2">
          <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${stage > n ? 'bg-emerald-500 text-white' : stage === n ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{stage > n ? '✓' : n + 1}</span>
          <span className={stage === n ? 'font-semibold text-slate-900' : 'text-slate-500'}>{label}</span>
          {i < items.length - 1 ? <span className="mx-1 text-slate-300" aria-hidden="true">›</span> : null}
        </li>
      ))}
    </ol>
  )
}

export default function CrawlerAnimation({ host, state, pct, finishing = false, onStop }) {
  const [secs, setSecs] = useState(0)
  useEffect(() => {
    if (finishing) return undefined
    const t0 = Date.now()
    const id = setInterval(() => setSecs(Math.floor((Date.now() - t0) / 1000)), 1000)
    return () => clearInterval(id)
  }, [finishing])

  const pages = state.pages
  const dots = useMemo(() => {
    const from = Math.max(0, pages.length - MAX_DOTS)
    return pages.slice(from).map((p, k) => {
      const i = from + k
      const [x, y] = position(i, p.depth)
      return { key: p.url, x, y, c: COLOR[toneOf(p.score?.percent)], bad: !p.score }
    })
  }, [pages])

  const stage = finishing ? 2 : pages.length > 0 ? 1 : 0
  const last = pages[pages.length - 1]
  const found = Math.max(state.sitemapUrls || 0, pages.length + (state.queued || 0))
  const headline = finishing ? `Scan complete: ${pages.length} page${pages.length === 1 ? '' : 's'} audited` : pages.length === 0 ? (state.sitemapUrls ? `Found ${state.sitemapUrls} URLs in the sitemap. Starting…` : 'Reading robots.txt and sitemaps…') : `Crawling ${host}`

  return (
    <div aria-live="polite" className="overflow-hidden">
      <style>{CSS}</style>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-slate-900">{headline}</p>
          <div className="mt-2"><Steps stage={stage} /></div>
        </div>
        {onStop && !finishing ? <button type="button" onClick={onStop} className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 px-5 text-[14px] font-semibold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">Stop</button> : null}
      </div>

      <div className="mt-4 grid grid-cols-1 items-center gap-5 sm:grid-cols-[minmax(0,300px)_1fr]">
        <div className="mx-auto w-full max-w-[300px] rounded-2xl bg-slate-950 p-2">
          <svg viewBox="0 0 300 300" role="img" aria-label={`Crawler map: ${pages.length} pages audited so far`} className="block h-auto w-full">
            <defs>
              <radialGradient id="glc-bg" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#1e1b4b" /><stop offset="100%" stopColor="#020617" /></radialGradient>
              <linearGradient id="glc-beam" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#818cf8" stopOpacity="0" /><stop offset="100%" stopColor="#818cf8" stopOpacity=".55" /></linearGradient>
            </defs>
            <rect width="300" height="300" rx="14" fill="url(#glc-bg)" />
            {[40, 65, 90, 115, 140].map((r) => <circle key={r} cx="150" cy="150" r={r} fill="none" stroke="#312e81" strokeWidth=".7" />)}
            <line x1="10" y1="150" x2="290" y2="150" stroke="#312e81" strokeWidth=".5" />
            <line x1="150" y1="10" x2="150" y2="290" stroke="#312e81" strokeWidth=".5" />
            {!finishing ? <><circle className="glc-ring" cx="150" cy="150" r="14" /><circle className="glc-ring" cx="150" cy="150" r="14" /><circle className="glc-ring" cx="150" cy="150" r="14" /></> : null}
            {!finishing ? <g className="glc-sweep"><path d="M150 150 L290 150 A140 140 0 0 0 270 80 Z" fill="url(#glc-beam)" /></g> : null}
            {dots.map((d) => <line key={`l${d.key}`} x1="150" y1="150" x2={d.x} y2={d.y} stroke={d.c} strokeOpacity=".12" strokeWidth=".6" />)}
            {dots.map((d) => <circle key={d.key} className="glc-dot" cx={d.x} cy={d.y} r={d.bad ? 2.6 : 3.2} fill={d.c} />)}
            <circle className="glc-core" cx="150" cy="150" r="9" fill={finishing ? '#10b981' : '#6366f1'} />
            <text x="150" y="153.5" textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff">{finishing ? '✓' : 'G'}</text>
          </svg>
        </div>

        <div className="min-w-0">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[['Audited', pages.length], ['Found', found], ['Waiting', state.queued || 0], ['Time', clock(finishing ? Math.round((state.durationMs || 0) / 1000) || secs : secs)]].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-slate-50 px-3 py-2.5"><dt className="text-[11.5px] uppercase tracking-wide text-slate-500">{k}</dt><dd className="text-[19px] font-semibold tabular-nums text-slate-900">{v}</dd></div>
            ))}
          </dl>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={finishing ? 100 : pct}>
            <div className="glc-bar h-full rounded-full bg-gradient-to-r from-blue-600 via-violet-500 to-blue-600 transition-[width] duration-500" style={{ width: `${finishing ? 100 : pct}%` }} />
          </div>
          <p className="mt-3 min-h-[22px] truncate font-mono text-[12.5px] text-slate-600">
            {finishing ? 'Preparing your report…' : last ? <>Audited <span className="text-slate-900">{pathOf(last.finalUrl || last.url)}</span><span className="glc-cursor ml-0.5 text-indigo-600">▍</span></> : <>Discovering pages<span className="glc-cursor ml-0.5 text-indigo-600">▍</span></>}
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-500">
            {[['emerald', '85+'], ['amber', '70-84'], ['orange', '50-69'], ['rose', 'below 50'], ['slate', 'error']].map(([t, l]) => <span key={t} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: COLOR[t] }} />{l}</span>)}
          </p>
          {!finishing ? <p className="mt-3 text-[12.5px] text-slate-500">Each dot is a page that has been audited. Keep this tab open; large sites take a few minutes and the results appear when the crawl ends.</p> : null}
        </div>
      </div>
    </div>
  )
}
