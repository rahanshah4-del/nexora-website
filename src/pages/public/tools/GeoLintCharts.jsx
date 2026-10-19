import { moduleLabel } from '../../../lib/geolint.js'
import { useMounted } from './geolintHooks.js'

const STROKE = { emerald: '#10b981', amber: '#f59e0b', orange: '#f97316', rose: '#f43f5e', slate: '#94a3b8' }
const FILL = { emerald: 'bg-emerald-500', amber: 'bg-amber-500', orange: 'bg-orange-500', rose: 'bg-rose-500', slate: 'bg-slate-400' }
const TEXT = { emerald: 'text-emerald-600', amber: 'text-amber-600', orange: 'text-orange-600', rose: 'text-rose-600', slate: 'text-slate-500' }

const fmt = (n) => (Number.isInteger(n) ? String(n) : (Math.round(n * 10) / 10).toFixed(1))

/** Small card with a title, used for every chart so they line up in one grid. */
export function ChartCard({ title, hint, children, className = '' }) {
  return (
    <div className={`gl-card min-w-0 p-5 ${className}`}>
      <h3 className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      {hint ? <p className="mt-1 text-[12.5px] leading-5 text-slate-500">{hint}</p> : null}
      <div className="mt-4">{children}</div>
    </div>
  )
}

/**
 * Donut chart: one arc per segment, a total in the middle and a legend with
 * counts and shares. Arcs grow in on mount (instantly under reduced motion).
 */
export function DonutChart({ segments, centerValue, centerLabel, label, size = 132 }) {
  const on = useMounted()
  const r = 46
  const c = 2 * Math.PI * r
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  const arcs = segments.filter((s) => s.value > 0).reduce((list, s) => {
    const share = s.value / total
    const gap = total > s.value ? 2 : 0
    const offset = list.length ? list[list.length - 1].end : 0
    return [...list, { ...s, len: Math.max(0, share * c - gap), offset: -offset, end: offset + share * c }]
  }, [])
  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label}>
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(148,163,184,.22)" strokeWidth="14" />
          {arcs.map((a) => (
            <circle
              key={a.id} cx="60" cy="60" r={r} fill="none" stroke={STROKE[a.tone] || STROKE.slate} strokeWidth="14"
              strokeDasharray={`${on ? a.len : 0} ${c}`} strokeDashoffset={a.offset} className="gl-donut-seg"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl font-bold tabular-nums text-slate-950">{centerValue}</span>
          {centerLabel ? <span className="text-[11px] font-medium text-slate-500">{centerLabel}</span> : null}
        </div>
      </div>
      <ul className="min-w-[140px] flex-1 space-y-2">
        {segments.map((s) => (
          <li key={s.id} className="flex items-center gap-2 text-[13px]">
            <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${FILL[s.tone] || FILL.slate}`} />
            <span className="min-w-0 flex-1 text-slate-700">{s.label}</span>
            <span className="font-semibold tabular-nums text-slate-950">{s.value}</span>
            <span className="w-10 text-right text-[12px] tabular-nums text-slate-500">{total ? `${Math.round((s.value / total) * 100)}%` : '0%'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Stacked bars: the points earned in colour, the points lost in a light track. */
export function ScoreBars({ rows }) {
  const on = useMounted()
  return (
    <ul className="space-y-4">
      {rows.map((row, i) => {
        const pct = row.max > 0 ? (row.earned / row.max) * 100 : 0
        return (
          <li key={row.id}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
              <span className="font-medium text-slate-800">{moduleLabel(row.id)}</span>
              <span className="tabular-nums text-slate-500"><span className={`font-semibold ${TEXT[row.tone] || TEXT.slate}`}>{fmt(row.earned)}</span> / {fmt(row.max)}{row.lost > 0 ? <span className="ml-2 text-rose-500">−{fmt(row.lost)}</span> : null}</span>
            </div>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-rose-100/80" role="img" aria-label={`${moduleLabel(row.id)}: ${fmt(row.earned)} of ${fmt(row.max)} points`}>
              <div className={`gl-bar-fill h-full rounded-full ${FILL[row.tone] || FILL.slate}`} style={{ width: on ? `${pct}%` : '0%', '--d': `${0.15 + i * 0.1}s` }} />
            </div>
          </li>
        )
      })}
      <li className="flex flex-wrap items-center gap-4 pt-1 text-[12px] text-slate-500">
        <span className="flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Points earned</span>
        <span className="flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-rose-200" />Points lost</span>
      </li>
    </ul>
  )
}

/** One segmented bar with a count per segment (used for search-bot reachability), plus one row per item when given. */
export function SegmentBar({ segments, label, rows = [] }) {
  const on = useMounted()
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  return (
    <div>
      <div className="flex h-4 w-full overflow-hidden rounded-full bg-slate-200/70" role="img" aria-label={label}>
        {segments.filter((s) => s.value > 0).map((s) => (
          <div key={s.id} className={`gl-seg h-full ${FILL[s.tone] || FILL.slate}`} style={{ width: on && total ? `${(s.value / total) * 100}%` : '0%' }} />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
        {segments.map((s) => (
          <li key={s.id} className="flex items-center gap-1.5 text-[13px] text-slate-700">
            <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${FILL[s.tone] || FILL.slate}`} />
            {s.label}<span className="font-semibold tabular-nums text-slate-950">{s.value}</span>
          </li>
        ))}
      </ul>
      {rows.length ? (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {rows.map((row) => (
            <li key={row.name} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 text-[13px]">
              <span className="flex min-w-0 items-center gap-2 font-medium text-slate-800"><span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${FILL[row.tone] || FILL.slate}`} /><span className="truncate">{row.name}</span></span>
              <span className={`shrink-0 text-[12px] font-semibold ${TEXT[row.tone] || TEXT.slate}`}>{row.label}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

/** Ranked bars: each fix sized by the points it can win back; a click jumps to the fix. */
export function WinBackBars({ items, onJump }) {
  const on = useMounted()
  const top = Math.max(...items.map((i) => i.upTo), 1)
  return (
    <ol className="space-y-3">
      {items.map((item, i) => (
        <li key={item.id}>
          <button type="button" onClick={() => onJump(item.id)} className="group block w-full rounded-xl p-1.5 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">
            <span className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="min-w-0 truncate font-medium text-slate-800"><span className="mr-2 tabular-nums text-slate-400">{i + 1}</span>{item.title}</span>
              <span className="shrink-0 font-semibold tabular-nums text-emerald-600">+{fmt(item.upTo)} {item.upTo === 1 ? 'pt' : 'pts'}</span>
            </span>
            <span className="mt-1.5 block h-2.5 w-full overflow-hidden rounded-full bg-slate-200/70">
              <span className="gl-bar-fill block h-full rounded-full bg-emerald-500" style={{ width: on ? `${(item.upTo / top) * 100}%` : '0%', '--d': `${0.15 + i * 0.08}s` }} />
            </span>
            <span className="mt-1 block text-[12px] text-slate-500">{moduleLabel(item.module)} · <span className="font-semibold text-sky-700 group-hover:underline">See how to fix it</span></span>
          </button>
        </li>
      ))}
    </ol>
  )
}
