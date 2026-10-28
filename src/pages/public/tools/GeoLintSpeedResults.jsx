import { useState } from 'react'
import { DEVICES, RATING_LABEL, SPEED_METRICS, formatMetric, speedGain, speedGrade } from '../../../lib/geolintSpeed.js'

const TONE = {
  emerald: { text: 'text-emerald-600', bar: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-800' },
  amber: { text: 'text-amber-600', bar: 'bg-amber-500', chip: 'bg-amber-100 text-amber-800' },
  rose: { text: 'text-rose-600', bar: 'bg-rose-500', chip: 'bg-rose-100 text-rose-800' },
  slate: { text: 'text-slate-500', bar: 'bg-slate-300', chip: 'bg-slate-100 text-slate-600' },
}
const RATING_CHIP = { good: TONE.emerald.chip, 'needs-improvement': TONE.amber.chip, poor: TONE.rose.chip }
const FIELD_WORD = { fast: 'Fast', average: 'Average', slow: 'Slow' }

function DeviceScore({ label, before, after, gain }) {
  const latest = after ?? before
  const g = speedGrade(latest)
  const t = TONE[g.tone]
  return (
    <div className="min-w-0 rounded-2xl bg-slate-50 p-4">
      <p className="text-[13px] font-semibold text-slate-600">{label}</p>
      <div className="mt-1 flex flex-wrap items-end gap-x-3 gap-y-1">
        <p className={`text-[40px] font-extrabold leading-none tabular-nums ${t.text}`}>{latest ?? '-'}</p>
        {typeof before === 'number' && typeof after === 'number' ? <p className="pb-1 text-[13px] font-semibold text-slate-500">was {before}{gain !== null ? <span className={gain >= 0 ? 'ml-2 text-emerald-600' : 'ml-2 text-rose-600'}>{gain >= 0 ? '+' : ''}{gain}</span> : null}</p> : null}
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden="true"><span className={`block h-full rounded-full ${t.bar}`} style={{ width: `${Math.max(3, Math.min(100, latest ?? 0))}%` }} /></div>
      <p className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[12px] font-bold ${t.chip}`}>{g.word}</p>
    </div>
  )
}

/** The speed test on the client's Results tab: phone and desktop scores (before and after), the vitals in plain words, and what slows the page. */
export default function SpeedResults({ speed }) {
  const available = DEVICES.filter((d) => speed.before?.[d.id] || speed.after?.[d.id])
  const [device, setDevice] = useState(available[0]?.id || 'mobile')
  const b = speed.before?.[device] || null
  const a = speed.after?.[device] || null
  const latest = a || b
  const tested = (speed.after || speed.before)?.testedAt
  const testedOn = tested ? new Date(tested).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : ''
  const field = latest?.field
  const opps = latest?.opportunities || []
  const fieldBits = field ? [field.lcpMs !== null && `Main content ${formatMetric('lcpMs', field.lcpMs)}`, field.inpMs !== null && `Tap response ${formatMetric('tbtMs', field.inpMs)}`, field.cls !== null && `Layout jump ${field.cls}`].filter(Boolean) : []

  return (
    <section className="gx-card p-5 sm:p-6" aria-labelledby="speed">
      <h2 id="speed" className="text-[18px] font-bold text-slate-950">How fast your website loads</h2>
      <p className="mt-1 text-[14px] leading-6 text-slate-600">Tested with Google PageSpeed on a phone and on a desktop{testedOn ? `, ${testedOn}` : ''}. Slow pages lose visitors and rank lower.{speed.before && speed.after ? ' You see the speed before and after our work.' : ''}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {DEVICES.map((d) => (speed.before?.[d.id] || speed.after?.[d.id] ? <DeviceScore key={d.id} label={d.label} before={speed.before?.[d.id]?.score} after={speed.after?.[d.id]?.score} gain={speedGain(speed, d.id)} /> : null))}
      </div>

      {latest ? (
        <>
          {available.length > 1 ? (
            <div className="mt-5 inline-flex rounded-full bg-slate-100 p-1" role="tablist" aria-label="Device">
              {available.map((d) => (
                <button key={d.id} type="button" role="tab" aria-selected={device === d.id} onClick={() => setDevice(d.id)} className={`gx-focus min-h-[36px] rounded-full px-4 text-[13.5px] font-bold transition ${device === d.id ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600'}`}>{d.label}</button>
              ))}
            </div>
          ) : null}

          <ul className="mt-4 divide-y divide-slate-100">
            {SPEED_METRICS.map((m) => {
              const rating = latest.ratings?.[m.key]
              const was = b?.metrics?.[m.key]
              const now = latest.metrics?.[m.key]
              if (now === null || now === undefined) return null
              return (
                <li key={m.key} className="flex items-start justify-between gap-3 py-3">
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold text-slate-950">{m.label} <span className="font-normal text-slate-400">({m.short})</span></span>
                    <span className="block text-[12.5px] leading-5 text-slate-500">{m.plain}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[15px] font-extrabold tabular-nums text-slate-950">{formatMetric(m.key, now)}</span>
                    {a && b && was !== null && was !== undefined && was !== now ? <span className="block text-[12px] text-slate-500">was {formatMetric(m.key, was)}</span> : null}
                    {rating ? <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${RATING_CHIP[rating]}`}>{RATING_LABEL[rating]}</span> : null}
                  </span>
                </li>
              )
            })}
          </ul>

          {field ? (
            <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-[14px] leading-6 text-sky-950">
              <p className="font-bold">What real visitors experience{field.category ? `: ${FIELD_WORD[field.category]}` : ''}</p>
              <p className="mt-0.5 text-[13.5px] text-sky-900/80">Google's own numbers from people who opened your site in Chrome.{fieldBits.length ? ` ${fieldBits.join(', ')}.` : ''}</p>
            </div>
          ) : null}

          {opps.length ? (
            <div className="mt-5">
              <h3 className="text-[15px] font-bold text-slate-950">What slows your page down</h3>
              <ul className="mt-2 space-y-2">
                {opps.map((o) => (
                  <li key={o.title} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-3 text-[14px] leading-6 text-slate-800">
                    <span className="min-w-0 break-words">{o.title}</span>
                    <span className="shrink-0 text-right text-[12.5px] font-semibold text-slate-500">{[o.savingsMs ? `~${formatMetric('lcpMs', o.savingsMs)}` : '', o.savingsKb ? `${o.savingsKb} KB` : ''].filter(Boolean).join(' / ')}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
