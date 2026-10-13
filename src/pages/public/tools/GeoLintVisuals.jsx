import { useMounted, useCountUp } from './geolintHooks.js'

const TONE_STROKE = { emerald: '#34d399', amber: '#fbbf24', orange: '#fb923c', rose: '#fb7185', slate: '#94a3b8' }
const TONE_BAR = { emerald: 'bg-emerald-500', amber: 'bg-amber-500', orange: 'bg-orange-500', rose: 'bg-rose-500', slate: 'bg-slate-400' }
const TONE_PILL = {
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  orange: 'bg-orange-50 text-orange-700 ring-orange-200',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
}

/** Circular score gauge with an animated arc and a counting number. */
export function ScoreRing({ earned, max, tone = 'emerald', size = 220 }) {
  const on = useMounted()
  const shown = useCountUp(earned)
  const r = 86
  const c = 2 * Math.PI * r
  const ratio = max > 0 ? Math.max(0, Math.min(1, earned / max)) : 0
  return (
    <div className="relative" style={{ width: size, height: size }} role="img" aria-label={`Score ${earned} out of ${max}`}>
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
        <circle cx="100" cy="100" r={r} fill="none" stroke="rgba(148,163,184,.18)" strokeWidth="12" />
        <circle
          cx="100" cy="100" r={r} fill="none" stroke={TONE_STROKE[tone] || TONE_STROKE.slate} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={on ? c * (1 - ratio) : c} className="gl-ring-arc"
          style={{ filter: `drop-shadow(0 0 10px ${TONE_STROKE[tone] || TONE_STROKE.slate}88)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-6xl font-bold tabular-nums text-white">{shown.toFixed(1)}</span>
        <span className="mt-1 text-sm font-medium text-slate-400">out of {max}</span>
      </div>
    </div>
  )
}

/** Horizontal bar that grows from 0 on mount. */
export function GrowBar({ ratio, tone = 'emerald', delay = 0, className = 'h-2' }) {
  const on = useMounted()
  const pct = Number.isFinite(ratio) ? Math.max(0, Math.min(1, ratio)) * 100 : 0
  return (
    <div className={`w-full overflow-hidden rounded-full bg-slate-200/70 ${className}`}>
      <div className={`gl-bar-fill h-full rounded-full ${TONE_BAR[tone] || TONE_BAR.slate}`} style={{ width: on ? `${pct}%` : '0%', '--d': `${delay}s` }} />
    </div>
  )
}

export function Pill({ tone = 'slate', children, className = '' }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${TONE_PILL[tone] || TONE_PILL.slate} ${className}`}>{children}</span>
}

/** Hero artwork: grid, aurora blobs, radar and floating bot chips. Pure decoration. */
export function HeroBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="gl-grid absolute inset-0" />
      <div className="gl-blob absolute -left-24 top-10 h-72 w-72 rounded-full bg-blue-600" />
      <div className="gl-blob gl-blob-b absolute right-0 top-40 h-80 w-80 rounded-full bg-violet-600" />
    </div>
  )
}

const BOT_CHIPS = [
  { name: 'OAI-SearchBot', pos: 'left-[2%] top-[12%]' },
  { name: 'ChatGPT-User', pos: 'right-[0%] top-[22%]' },
  { name: 'Claude-SearchBot', pos: 'left-[-4%] bottom-[22%]' },
  { name: 'PerplexityBot', pos: 'right-[4%] bottom-[8%]' },
]

export function RadarArt() {
  return (
    <div aria-hidden="true" className="relative mx-auto hidden w-full max-w-[380px] lg:block">
      <div className="gl-radar">
        <div className="gl-radar-core" />
        <div className="gl-radar-ring" />
        <div className="gl-radar-ring" />
        <div className="gl-radar-ring" />
        <div className="gl-radar-sweep" />
        <div className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl bg-white/10 text-center text-[11px] font-bold leading-tight tracking-wide text-white ring-1 ring-white/25 backdrop-blur">YOUR<br />PAGE</div>
      </div>
      {BOT_CHIPS.map((chip) => (
        <span key={chip.name} className={`gl-chip absolute ${chip.pos} rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold text-slate-100 backdrop-blur`}>
          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />{chip.name}
        </span>
      ))}
    </div>
  )
}
