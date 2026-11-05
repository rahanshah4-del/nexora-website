import { useState } from 'react'
import { CausesPanel, FixesPanel } from './GeoLintSpeedInsights.jsx'
import SpeedBento from './GeoLintSpeedBento.jsx'
import { DEVICES, RATING_LABEL, SPEED_METRICS, formatMetric, speedGain } from '../../../lib/geolintSpeed.js'

const TONE = {
  emerald: { text: 'text-emerald-600', bar: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-800' },
  amber: { text: 'text-amber-600', bar: 'bg-amber-500', chip: 'bg-amber-100 text-amber-800' },
  rose: { text: 'text-rose-600', bar: 'bg-rose-500', chip: 'bg-rose-100 text-rose-800' },
  slate: { text: 'text-slate-500', bar: 'bg-slate-300', chip: 'bg-slate-100 text-slate-600' },
}
const RATING_CHIP = { good: TONE.emerald.chip, 'needs-improvement': TONE.amber.chip, poor: TONE.rose.chip }
const FIELD_WORD = { fast: 'Fast', average: 'Average', slow: 'Slow' }

/** The speed test on the client's Results tab: a bento dashboard per device, and a "details" area with every metric, fix and file. */
export default function SpeedResults({ speed, title = 'How fast your website loads', intro = '' }) {
  const available = DEVICES.filter((d) => speed.before?.[d.id] || speed.after?.[d.id])
  const [device, setDevice] = useState(available[0]?.id || 'mobile')
  const [open, setOpen] = useState(false)
  const b = speed.before?.[device] || null
  const a = speed.after?.[device] || null
  const latest = a || b
  const tested = (speed.after || speed.before)?.testedAt
  const testedOn = tested ? new Date(tested).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : ''
  const field = latest?.field
  const opps = latest?.opportunities || []
  const fixes = latest?.fixes || []
  const host = (() => { try { return new URL(speed.after?.url || speed.before?.url || '').hostname.replace(/^www\./, '') } catch { return '' } })()
  const defaultIntro = `Tested with Google PageSpeed on a phone and on a desktop${testedOn ? `, ${testedOn}` : ''}. Slow pages lose visitors and rank lower.${speed.before && speed.after ? ' You see the speed before and after our work.' : ''}`
  const fieldBits = field ? [field.lcpMs !== null && `Main content ${formatMetric('lcpMs', field.lcpMs)}`, field.inpMs !== null && `Tap response ${formatMetric('tbtMs', field.inpMs)}`, field.cls !== null && `Layout jump ${field.cls}`].filter(Boolean) : []
  const dev = DEVICES.find((d) => d.id === device)
  const gain = speedGain(speed, device)
  const was = typeof b?.score === 'number' && typeof a?.score === 'number' ? b.score : null
  const summary = fixes.length ? `${fixes.length} file ${fixes.length === 1 ? 'fix' : 'fixes'} found` : opps.length ? `${opps.length} ${opps.length === 1 ? 'thing slows' : 'things slow'} your page down` : 'All the numbers and details'
  const hint = fixes.length ? 'Old image formats, unused code, no compression, weak caching.' : 'Every metric, what it means and what to change.'

  return (
    <section className="gx-card p-5 sm:p-6" aria-labelledby="speed">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {title ? <h2 id="speed" className="text-[18px] font-bold text-slate-950">{title}</h2> : null}
          <p className="mt-1 text-[14px] leading-6 text-slate-600">{intro || defaultIntro}</p>
        </div>
        {available.length > 1 ? (
          <div className="inline-flex shrink-0 rounded-full bg-slate-100 p-1" role="group" aria-label="Device">
            {available.map((d) => (
              <button key={d.id} type="button" aria-pressed={device === d.id} onClick={() => setDevice(d.id)} className={`gx-focus min-h-[40px] rounded-full px-5 text-[14px] font-bold transition ${device === d.id ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600'}`}>{d.label}</button>
            ))}
          </div>
        ) : null}
      </div>

      {latest ? (
        <div className="mt-4">
          <SpeedBento run={latest} host={host} label={dev?.label || 'Phone'} was={was} gain={gain} device={device} />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-slate-950">{summary}</p>
              <p className="mt-0.5 text-[13.5px] text-slate-500">{hint}</p>
            </div>
            <button type="button" aria-expanded={open} aria-controls="speed-details" onClick={() => setOpen((v) => !v)} className="gx-focus min-h-[44px] rounded-full bg-slate-900 px-5 text-[14px] font-bold text-white hover:bg-slate-800">{open ? 'Hide details' : 'See all details'}</button>
          </div>

          {open ? (
            <div id="speed-details" className="mt-2">
              <FixesPanel fixes={fixes} />
              <CausesPanel causes={latest.causes} />
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
              <ul className="mt-5 divide-y divide-slate-100">
                {SPEED_METRICS.map((m) => {
                  const rating = latest.ratings?.[m.key]
                  const prev = b?.metrics?.[m.key]
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
                        {a && b && prev !== null && prev !== undefined && prev !== now ? <span className="block text-[12px] text-slate-500">was {formatMetric(m.key, prev)}</span> : null}
                        {rating ? <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${RATING_CHIP[rating]}`}>{RATING_LABEL[rating]}</span> : null}
                      </span>
                    </li>
                  )
                })}
              </ul>
              {field && !latest.vitals ? (
                <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-[14px] leading-6 text-sky-950">
                  <p className="font-bold">What real visitors experience{field.category ? `: ${FIELD_WORD[field.category]}` : ''}</p>
                  <p className="mt-0.5 text-[13.5px] text-sky-900/80">Google's own numbers from people who opened your site in Chrome.{fieldBits.length ? ` ${fieldBits.join(', ')}.` : ''}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
