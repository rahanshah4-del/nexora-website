import { CountUp } from './GeoLintSpeedMotion.jsx'
import { formatMetric } from '../../../lib/geolintSpeed.js'

/** The bento dashboard for one device: dark score tile, real-visitor bars, screenshot, weight numbers, blockers and main-thread time. */

const NAVY = '#0f1b33'
const dark = (s) => (s >= 90 ? '#4ade80' : s >= 50 ? '#fbbf24' : '#f87171')
const WORD = (s) => (s >= 90 ? 'Fast' : s >= 50 ? 'Needs work' : 'Slow')
const RATING = { good: ['text-emerald-700', 'Good'], 'needs-improvement': ['text-amber-700', 'Needs work'], poor: ['text-rose-700', 'Poor'] }
const VITAL_ROWS = [['lcp', 'Main content'], ['inp', 'Tap response'], ['cls', 'Layout jumping'], ['fcp', 'First paint'], ['ttfb', 'Server answer']]
const GROUP = ['#3b82f6', '#8b5cf6', '#f59e0b', '#14b8a6', '#ef4444', '#94a3b8']
const TILE = 'min-w-0 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6'

function ScoreTile({ run, host, label, was, gain, span }) {
  const c = run.categories
  const sub = [['Accessibility', c?.accessibility], ['Best practices', c?.bestPractices], ['SEO', c?.seo]].filter(([, v]) => typeof v === 'number')
  return (
    <div className={`flex min-h-[280px] min-w-0 flex-col justify-between rounded-3xl p-6 text-white sm:p-7 col-span-3 ${span}`} style={{ background: NAVY }}>
      <div>
        <p className="text-[13px] font-semibold" style={{ color: '#b7c4e0' }}>{label} speed score</p>
        {host ? <p className="mt-0.5 break-all text-[13px]" style={{ color: '#b7c4e0' }}>{host}</p> : null}
      </div>
      <div className="my-5 flex flex-wrap items-end gap-x-4 gap-y-2">
        <span className="text-[84px] font-extrabold leading-[0.9] tracking-tight tabular-nums sm:text-[96px]" style={{ color: dark(run.score) }}><CountUp value={run.score} /></span>
        <span className="mb-1 rounded-full px-3 py-1 text-[13px] font-extrabold" style={{ background: dark(run.score), color: NAVY }}>{WORD(run.score)}</span>
        {was !== null ? <span className="mb-2 text-[13px] font-semibold" style={{ color: '#b7c4e0' }}>was {was}{gain !== null ? <b className="ml-1.5" style={{ color: gain >= 0 ? '#4ade80' : '#f87171' }}>{gain >= 0 ? '+' : ''}{gain}</b> : null}</span> : null}
      </div>
      {sub.length ? (
        <div className="grid grid-cols-3 gap-2.5">
          {sub.map(([k, v]) => (
            <div key={k} className="min-w-0 rounded-2xl px-3 py-2.5" style={{ background: '#1b2a4a' }}>
              <p className="text-[11.5px] leading-4 sm:text-[12px]" style={{ color: '#b7c4e0' }}>{k}</p>
              <p className="mt-0.5 text-[20px] font-extrabold tabular-nums" style={{ color: dark(v) }}>{v}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function VisitorsTile({ run, span }) {
  const v = run.vitals
  if (!v?.metrics) return null
  const rows = VITAL_ROWS.filter(([k]) => v.metrics[k]).slice(0, 3)
  return (
    <div className={`${TILE} col-span-3 ${span}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[15px] font-bold text-slate-950">Real visitors</p>
        {v.passed === null ? null : <span className={`rounded-full px-2.5 py-1 text-[12px] font-extrabold ${v.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{v.passed ? 'Passed' : 'Failed'}</span>}
      </div>
      <ul className="mt-4 space-y-4">
        {rows.map(([k, label]) => {
          const m = v.metrics[k]
          const r = RATING[m.rating]
          const val = m.p75 === null || m.p75 === undefined ? '' : k === 'cls' ? String(m.p75) : formatMetric('lcpMs', m.p75)
          return (
            <li key={k}>
              <div className="flex items-baseline justify-between gap-2 text-[13px]"><span className="font-semibold text-slate-900">{label}</span><span className={`font-bold tabular-nums ${r ? r[0] : 'text-slate-600'}`}>{val}</span></div>
              <div className="mt-1.5 flex h-2.5 overflow-hidden rounded-full bg-slate-200" role="img" aria-label={`${m.good}% good, ${m.mid}% needs work, ${m.poor}% poor`}>
                <span className="block bg-emerald-500" style={{ width: `${m.good}%` }} /><span className="block bg-amber-400" style={{ width: `${m.mid}%` }} /><span className="block bg-rose-500" style={{ width: `${m.poor}%` }} />
              </div>
            </li>
          )
        })}
      </ul>
      <p className="mt-4 text-[12px] leading-5 text-slate-500">Chrome visitors, last 28 days{v.origin ? ' (whole site)' : ''}.</p>
    </div>
  )
}

function ShotTile({ media, device, span }) {
  if (!media?.screenshot && !media?.filmstrip?.length) return null
  const frames = media.filmstrip || []
  const pick = frames.length <= 4 ? frames : [0, 1, 2, 3].map((i) => frames[Math.round((i * (frames.length - 1)) / 3)])
  const phone = device === 'mobile'
  return (
    <div className={`${TILE} col-span-3 flex flex-col lg:col-span-3 ${span}`}>
      <p className="mb-3 text-[15px] font-bold text-slate-950">Google saw this</p>
      {media.screenshot ? <img src={media.screenshot} alt="Your page as Google saw it" loading="lazy" className={`w-full rounded-2xl border border-slate-200 bg-slate-50 object-cover object-top ${phone ? 'h-[300px]' : 'h-[190px] lg:h-[260px]'}`} /> : null}
      {pick.length ? (
        <div className="mt-3 flex gap-1.5">
          {pick.map((f, i) => <img key={i} src={f.data} alt={`Page at ${formatMetric('lcpMs', f.ms)}`} title={formatMetric('lcpMs', f.ms)} loading="lazy" className="h-11 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 object-cover object-top" />)}
        </div>
      ) : null}
      {pick.length ? <p className="mt-1.5 text-[11.5px] text-slate-500">Frames from {formatMetric('lcpMs', pick[0].ms)} to {formatMetric('lcpMs', pick[pick.length - 1].ms)}</p> : null}
    </div>
  )
}

function Stat({ label, value, note, bad, span }) {
  return (
    <div className={`${TILE} col-span-1 !p-3.5 sm:!p-6 ${span}`}>
      <p className="text-[12px] font-semibold leading-4 text-slate-500 sm:text-[13px]">{label}</p>
      <p className="mt-1.5 text-[22px] sm:text-[32px] font-extrabold leading-none tracking-tight tabular-nums text-slate-950">{value}</p>
      {note ? <p className={`mt-1.5 text-[11.5px] font-semibold leading-4 sm:mt-2 sm:text-[12.5px] ${bad ? 'text-rose-700' : 'text-amber-700'}`}>{note}</p> : null}
    </div>
  )
}

const mb = (kb) => (kb >= 1024 ? `${Math.round(kb / 102.4) / 10} MB` : `${kb} KB`)

function BlockersTile({ causes }) {
  const rows = [
    ...(causes?.thirdParty || []).map((t) => ({ name: t.name, ms: t.blockingMs || t.mainThreadMs || 0 })),
    ...(causes?.blocking || []).map((b) => ({ name: b.url, ms: b.ms || 0 })),
  ].filter((r) => r.ms > 0).sort((a, b) => b.ms - a.ms).slice(0, 5)
  if (!rows.length) return null
  const max = rows[0].ms
  return (
    <div className={`${TILE} col-span-3 lg:col-span-6`}>
      <p className="text-[15px] font-bold text-slate-950">What blocks your page</p>
      <ul className="mt-4 space-y-3.5">
        {rows.map((r) => (
          <li key={r.name}>
            <div className="flex items-baseline justify-between gap-3 text-[13.5px]"><span className="min-w-0 break-all font-semibold text-slate-900">{r.name}</span><span className="shrink-0 tabular-nums text-slate-600">{formatMetric('lcpMs', r.ms)}</span></div>
            <div className="mt-1.5 h-[7px] overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.max(4, (r.ms / max) * 100)}%` }} /></div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ThreadTile({ weight }) {
  const g = weight?.mainThread || []
  if (!g.length) return null
  const total = g.reduce((n, x) => n + x.ms, 0) || 1
  return (
    <div className={`${TILE} col-span-3 lg:col-span-6`}>
      <p className="text-[15px] font-bold text-slate-950">Where the browser spends time</p>
      <div className="mt-4 flex h-4 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">{g.map((x, i) => <span key={x.label} className="block" style={{ width: `${(x.ms / total) * 100}%`, background: GROUP[i % GROUP.length] }} />)}</div>
      <ul className="mt-4 grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
        {g.map((x, i) => <li key={x.label} className="flex min-w-0 items-center gap-2 text-[13px] text-slate-700"><span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: GROUP[i % GROUP.length] }} /><span className="truncate">{x.label}</span><span className="ml-auto shrink-0 font-semibold tabular-nums">{formatMetric('lcpMs', x.ms)}</span></li>)}
      </ul>
    </div>
  )
}

export default function SpeedBento({ run, host, label, was, gain, device }) {
  const w = run.weight
  const hasVisitors = Boolean(run.vitals?.metrics)
  const hasShot = Boolean(run.media?.screenshot || run.media?.filmstrip?.length)
  const stats = w ? [
    w.totalKb !== null && ['Page size', mb(w.totalKb), w.totalKb > 3072 ? 'Aim under 2 MB' : '', w.totalKb > 6144],
    w.requests !== null && ['Requests', String(w.requests), w.requests > 100 ? 'Merge or remove some' : '', w.requests > 200],
    w.scriptMs !== null && ['JavaScript time', formatMetric('lcpMs', w.scriptMs), w.scriptMs > 2000 ? 'Slow on phones' : '', w.scriptMs > 4000],
  ].filter(Boolean) : []
  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4 lg:grid-cols-12">
      <ScoreTile run={run} host={host} label={label} was={was} gain={gain} span={hasVisitors ? (hasShot ? 'lg:col-span-5' : 'lg:col-span-7') : (hasShot ? 'lg:col-span-9' : 'lg:col-span-12')} />
      <VisitorsTile run={run} span={hasShot ? 'lg:col-span-4' : 'lg:col-span-5'} />
      <ShotTile media={run.media} device={device} span={hasShot ? 'lg:row-span-2' : ''} />
      {stats.map(([l, v, n, bad]) => <Stat key={l} label={l} value={v} note={n} bad={bad} span={hasShot ? 'lg:col-span-3' : 'lg:col-span-4'} />)}
      <BlockersTile causes={run.causes} />
      <ThreadTile weight={w} />
    </div>
  )
}
