import { useState } from 'react'
import { CountUp } from './GeoLintSpeedMotion.jsx'
import { formatMetric } from '../../../lib/geolintSpeed.js'

const STYLES = `
@keyframes gi-ring { from { stroke-dashoffset: var(--gi-len); } to { stroke-dashoffset: var(--gi-off); } }
.gi-ring { stroke-dasharray: var(--gi-len); stroke-dashoffset: var(--gi-off); animation: gi-ring 1.1s cubic-bezier(.2,.8,.2,1) both; animation-delay: var(--gi-d, 0ms); }
.gi-frame { scroll-snap-type: x proximity; }
.gi-frame > * { scroll-snap-align: start; }
html.public-dark .gi-track { stroke: #2a3344; }
html.public-dark .gi-shot { background: #0f1522; border-color: #2a3344; }
@media (prefers-reduced-motion: reduce) { .gi-ring { animation: none; } }
`

const tone = (s) => (s >= 90 ? { c: '#0cce6b', t: 'text-emerald-600' } : s >= 50 ? { c: '#ffa400', t: 'text-amber-600' } : { c: '#ff4e42', t: 'text-rose-600' })
const RATING = { good: { bar: 'bg-emerald-500', text: 'text-emerald-700', word: 'Good' }, 'needs-improvement': { bar: 'bg-amber-500', text: 'text-amber-700', word: 'Needs work' }, poor: { bar: 'bg-rose-500', text: 'text-rose-700', word: 'Poor' } }

function Ring({ label, score, index }) {
  const R = 30
  const len = 2 * Math.PI * R
  const t = tone(score)
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <div className="relative h-[76px] w-[76px]">
        <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="38" cy="38" r={R} fill="none" strokeWidth="6" className="gi-track" stroke="#e2e8f0" />
          <circle cx="38" cy="38" r={R} fill="none" strokeWidth="6" strokeLinecap="round" stroke={t.c} className="gi-ring" style={{ '--gi-len': len, '--gi-off': len * (1 - score / 100), '--gi-d': `${index * 120}ms` }} />
        </svg>
        <span className={`absolute inset-0 grid place-items-center text-[21px] font-extrabold tabular-nums ${t.t}`}><CountUp value={score} delay={index * 120} /></span>
      </div>
      <p className="text-[12.5px] font-semibold leading-4 text-slate-700">{label}</p>
    </div>
  )
}

/** Performance, Accessibility, Best Practices and SEO as four rings, like Lighthouse. */
export function ScoreRings({ categories }) {
  const items = [['Performance', categories?.performance], ['Accessibility', categories?.accessibility], ['Best Practices', categories?.bestPractices], ['SEO', categories?.seo]].filter(([, s]) => typeof s === 'number')
  if (items.length < 2) return null
  return (
    <div className="mt-5 rounded-2xl bg-slate-50 p-4 sm:p-5">
      <style>{STYLES}</style>
      <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-4">{items.map(([l, s], i) => <Ring key={l} label={l} score={s} index={i} />)}</div>
    </div>
  )
}

const VITAL_ROWS = [['lcp', 'Main content (LCP)', 'lcpMs'], ['inp', 'Tap response (INP)', 'inpMs'], ['cls', 'Layout jumping (CLS)', 'cls'], ['fcp', 'First paint (FCP)', 'fcpMs'], ['ttfb', 'Server answer (TTFB)', 'ttfbMs']]

/** The Core Web Vitals verdict from real visitors, with the good / needs work / poor share of visits for each metric. */
export function VitalsPanel({ vitals }) {
  if (!vitals?.metrics) return null
  const rows = VITAL_ROWS.filter(([k]) => vitals.metrics[k])
  const pass = vitals.passed
  return (
    <div className="mt-5 rounded-2xl border border-slate-200 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        {pass === null ? null : (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-extrabold ${pass ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
            <span aria-hidden="true">{pass ? '✓' : '✕'}</span>Core Web Vitals {pass ? 'passed' : 'failed'}
          </span>
        )}
        <p className="min-w-0 basis-full text-[13px] leading-5 text-slate-500 sm:flex-1 sm:basis-0">Real Chrome visitors over the last 28 days{vitals.origin ? ' (whole site, this page has too little traffic)' : ''}. Green is a good visit.</p>
      </div>
      <ul className="mt-4 space-y-3.5">
        {rows.map(([k, label]) => {
          const m = vitals.metrics[k]
          const r = RATING[m.rating]
          const value = m.p75 === null || m.p75 === undefined ? '' : k === 'cls' ? String(m.p75) : formatMetric('lcpMs', m.p75)
          return (
            <li key={k}>
              <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
                <span className="font-semibold text-slate-900">{label}</span>
                <span className="shrink-0 tabular-nums text-slate-600">{value}{r ? <span className={`ml-2 font-bold ${r.text}`}>{r.word}</span> : null}</span>
              </div>
              <div className="mt-1.5 flex h-2.5 overflow-hidden rounded-full bg-slate-200" role="img" aria-label={`${m.good}% good, ${m.mid}% needs work, ${m.poor}% poor`}>
                <span className="block bg-emerald-500" style={{ width: `${m.good}%` }} />
                <span className="block bg-amber-400" style={{ width: `${m.mid}%` }} />
                <span className="block bg-rose-500" style={{ width: `${m.poor}%` }} />
              </div>
              <p className="mt-1 text-[11.5px] tabular-nums text-slate-500">{m.good}% good &middot; {m.mid}% needs work &middot; {m.poor}% poor</p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** How Google saw the page, then the page filling in frame by frame. */
export function ScreenshotStrip({ media, device }) {
  const [open, setOpen] = useState(null)
  if (!media || (!media.screenshot && !media.filmstrip?.length)) return null
  const phone = device === 'mobile'
  return (
    <div className="mt-5">
      <style>{STYLES}</style>
      <h3 className="text-[15px] font-bold text-slate-950">How your page loads</h3>
      <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start">
        {media.screenshot ? (
          <figure className="shrink-0">
            <img src={media.screenshot} alt="Your page as Google saw it" loading="lazy" className={`gi-shot rounded-xl border border-slate-200 bg-slate-50 object-cover object-top shadow-sm ${phone ? 'h-[260px] w-[146px]' : 'h-[150px] w-[240px]'}`} />
            <figcaption className="mt-1 text-[11.5px] text-slate-500">Final result</figcaption>
          </figure>
        ) : null}
        {media.filmstrip?.length ? (
          <div className="gi-frame flex min-w-0 flex-1 gap-2.5 overflow-x-auto pb-2" role="list" aria-label="Load filmstrip">
            {media.filmstrip.map((f, i) => (
              <figure key={`${f.ms}-${i}`} role="listitem" className="shrink-0" onMouseEnter={() => setOpen(i)} onMouseLeave={() => setOpen(null)}>
                <img src={f.data} alt={`Page at ${formatMetric('lcpMs', f.ms)}`} loading="lazy" className={`gi-shot rounded-lg border bg-slate-50 object-cover object-top ${open === i ? 'border-blue-400' : 'border-slate-200'} ${phone ? 'h-[120px] w-[68px]' : 'h-[78px] w-[124px]'}`} />
                <figcaption className="mt-1 text-center text-[11.5px] tabular-nums text-slate-500">{formatMetric('lcpMs', f.ms)}</figcaption>
              </figure>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function Block({ title, hint, children }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3.5">
      <p className="text-[14px] font-bold text-slate-950">{title}</p>
      {hint ? <p className="mt-0.5 text-[12.5px] leading-5 text-slate-500">{hint}</p> : null}
      <div className="mt-2.5">{children}</div>
    </div>
  )
}
const Code = ({ children }) => <code className="block break-all rounded-lg bg-slate-100 px-2.5 py-1.5 text-[12px] leading-5 text-slate-800">{children}</code>

/** The real reasons the page is slow: biggest element, what jumps, third-party scripts and files that block painting. */
export function CausesPanel({ causes }) {
  if (!causes) return null
  const { lcpElement, lcpPhases = [], shifts = [], thirdParty = [], blocking = [] } = causes
  const maxPhase = Math.max(1, ...lcpPhases.map((p) => p.ms))
  return (
    <div className="mt-5">
      <h3 className="text-[15px] font-bold text-slate-950">The real reason it is slow</h3>
      <div className="mt-2 grid gap-3 md:grid-cols-2">
        {lcpElement ? (
          <Block title="Slowest big element" hint="This is the thing Google waits for before it counts your page as loaded.">
            <Code>{lcpElement.snippet || lcpElement.label}</Code>
            {lcpPhases.length ? (
              <ul className="mt-2.5 space-y-1.5">
                {lcpPhases.map((p) => (
                  <li key={p.phase} className="text-[12px] text-slate-600">
                    <span className="flex justify-between gap-2"><span>{p.phase}</span><span className="tabular-nums font-semibold">{formatMetric('lcpMs', p.ms)}</span></span>
                    <span className="mt-0.5 block h-1.5 overflow-hidden rounded-full bg-slate-200"><span className="block h-full rounded-full bg-blue-500" style={{ width: `${Math.max(2, (p.ms / maxPhase) * 100)}%` }} /></span>
                  </li>
                ))}
              </ul>
            ) : null}
          </Block>
        ) : null}
        {shifts.length ? (
          <Block title="What jumps while loading" hint="These elements move after they appear, which makes visitors tap the wrong thing.">
            <ul className="space-y-2">{shifts.map((s, i) => <li key={i}><Code>{s.snippet || s.label}</Code>{s.score !== null ? <span className="mt-0.5 block text-[11.5px] text-slate-500">Shift {s.score}</span> : null}</li>)}</ul>
          </Block>
        ) : null}
        {thirdParty.length ? (
          <Block title="Outside scripts that slow you down" hint="Ads, chat, analytics and fonts from other companies. Blocking time is how long they freeze the page.">
            <ul className="divide-y divide-slate-100">
              {thirdParty.map((t) => (
                <li key={t.name} className="flex items-baseline justify-between gap-3 py-1.5 text-[13px]">
                  <span className="min-w-0 break-words font-semibold text-slate-800">{t.name}</span>
                  <span className="shrink-0 tabular-nums text-slate-600">{t.blockingMs ? `${t.blockingMs} ms blocking` : `${t.mainThreadMs} ms`}</span>
                </li>
              ))}
            </ul>
          </Block>
        ) : null}
        {blocking.length ? (
          <Block title="Files that hold back the first paint" hint="The browser must download these before it can show anything.">
            <ul className="divide-y divide-slate-100">
              {blocking.map((b) => (
                <li key={b.url} className="flex items-baseline justify-between gap-3 py-1.5 text-[12.5px]">
                  <span className="min-w-0 break-all text-slate-800">{b.url}</span>
                  <span className="shrink-0 tabular-nums text-slate-600">{[b.ms ? `${b.ms} ms` : '', b.kb ? `${b.kb} KB` : ''].filter(Boolean).join(' / ')}</span>
                </li>
              ))}
            </ul>
          </Block>
        ) : null}
      </div>
    </div>
  )
}

const mb = (kb) => (kb >= 1024 ? `${Math.round(kb / 102.4) / 10} MB` : `${kb} KB`)
const GROUP_COLOR = ['bg-blue-500', 'bg-violet-500', 'bg-amber-500', 'bg-emerald-500', 'bg-rose-500', 'bg-slate-400']

/** How heavy the page is, and where the browser spends its time. */
export function WeightPanel({ weight }) {
  if (!weight) return null
  const stats = [
    weight.totalKb !== null && ['Page size', mb(weight.totalKb), weight.totalKb > 3072 ? 'Heavy. Aim under 2 MB.' : ''],
    weight.requests !== null && ['Requests', String(weight.requests), weight.requests > 100 ? 'Many. Merge or remove some.' : ''],
    weight.scriptMs !== null && ['JavaScript time', formatMetric('lcpMs', weight.scriptMs), weight.scriptMs > 2000 ? 'Slow on phones.' : ''],
    weight.domNodes !== null && ['Page elements', weight.domNodes.toLocaleString(), weight.domNodes > 1500 ? 'Large. Under 1,500 is best.' : ''],
  ].filter(Boolean)
  const total = weight.mainThread.reduce((n, g) => n + g.ms, 0) || 1
  return (
    <div className="mt-5">
      <h3 className="text-[15px] font-bold text-slate-950">How heavy your page is</h3>
      <dl className="mt-2 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {stats.map(([k, v, note]) => (
          <div key={k} className="rounded-xl bg-slate-50 p-3">
            <dt className="text-[12px] font-semibold text-slate-500">{k}</dt>
            <dd className="mt-0.5 text-[20px] font-extrabold tabular-nums text-slate-950">{v}</dd>
            {note ? <p className="text-[11.5px] leading-4 text-amber-700">{note}</p> : null}
          </div>
        ))}
      </dl>
      {weight.mainThread.length ? (
        <div className="mt-3 rounded-xl border border-slate-200 p-3.5">
          <p className="text-[13.5px] font-bold text-slate-950">Where the browser spends its time</p>
          <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
            {weight.mainThread.map((g, i) => <span key={g.label} className={`block ${GROUP_COLOR[i % GROUP_COLOR.length]}`} style={{ width: `${(g.ms / total) * 100}%` }} />)}
          </div>
          <ul className="mt-2.5 grid gap-x-4 gap-y-1 sm:grid-cols-2">
            {weight.mainThread.map((g, i) => (
              <li key={g.label} className="flex items-center justify-between gap-2 text-[12.5px] text-slate-700">
                <span className="flex min-w-0 items-center gap-2"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${GROUP_COLOR[i % GROUP_COLOR.length]}`} /><span className="truncate">{g.label}</span></span>
                <span className="shrink-0 tabular-nums font-semibold">{formatMetric('lcpMs', g.ms)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

/** Big images, old formats, unused code, missing compression and weak caching, with the worst files named. */
export function FixesPanel({ fixes }) {
  if (!fixes?.length) return null
  return (
    <div className="mt-5">
      <h3 className="text-[15px] font-bold text-slate-950">Image and file fixes</h3>
      <ul className="mt-2 space-y-2">
        {fixes.map((f) => (
          <li key={f.id} className="rounded-xl border border-slate-200 p-3 text-[14px] leading-6 text-slate-800">
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0 font-semibold">{f.label} <span className="font-normal text-slate-500">({f.count} {f.count === 1 ? 'file' : 'files'})</span></span>
              <span className="shrink-0 text-right text-[12.5px] font-semibold text-emerald-700">{[f.savingsKb ? `save ${mb(f.savingsKb)}` : '', f.savingsMs ? `~${formatMetric('lcpMs', f.savingsMs)}` : ''].filter(Boolean).join(' / ')}</span>
            </div>
            {f.files.length ? <p className="mt-0.5 break-all text-[12px] leading-5 text-slate-500">{f.files.join(', ')}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
