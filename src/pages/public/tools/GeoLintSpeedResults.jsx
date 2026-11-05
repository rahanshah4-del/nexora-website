import { useState } from 'react'
import { CausesPanel, FixesPanel, ScoreRings, ScreenshotStrip, VitalsBanner, VitalsPanel, WeightPanel } from './GeoLintSpeedInsights.jsx'
import { DEVICES, RATING_LABEL, SPEED_METRICS, formatMetric, speedGain, speedGrade } from '../../../lib/geolintSpeed.js'

const TONE = {
  emerald: { text: 'text-emerald-600', bar: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-800' },
  amber: { text: 'text-amber-600', bar: 'bg-amber-500', chip: 'bg-amber-100 text-amber-800' },
  rose: { text: 'text-rose-600', bar: 'bg-rose-500', chip: 'bg-rose-100 text-rose-800' },
  slate: { text: 'text-slate-500', bar: 'bg-slate-300', chip: 'bg-slate-100 text-slate-600' },
}
const RATING_CHIP = { good: TONE.emerald.chip, 'needs-improvement': TONE.amber.chip, poor: TONE.rose.chip }
const FIELD_WORD = { fast: 'Fast', average: 'Average', slow: 'Slow' }

const gainBits = (b, a, g) => (typeof b === 'number' && typeof a === 'number' ? `was ${b}${g !== null ? ` (${g >= 0 ? '+' : ''}${g})` : ''}` : '')

/** The three biggest wins first: each with what it saves, so the owner knows where to start. */
function TopFixes({ opps }) {
  const top = opps.slice(0, 3)
  if (!top.length) return null
  return (
    <div className="min-w-0 flex-1 basis-[300px] rounded-2xl border border-slate-200 p-4 sm:p-5">
      <h3 className="text-[16px] font-bold text-slate-950">Top {top.length} things to fix</h3>
      <p className="mt-0.5 text-[13.5px] text-slate-500">Biggest wins first.</p>
      <ol className="mt-3 space-y-2.5">
        {top.map((o, i) => (
          <li key={o.title} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-700 text-[13px] font-bold text-white">{i + 1}</span>
            <span className="min-w-0 flex-1 break-words text-[14px] font-semibold leading-5 text-slate-900">{o.title}</span>
            <span className="shrink-0 text-right text-[12.5px] font-bold text-emerald-700">{[o.savingsMs ? `-${formatMetric('lcpMs', o.savingsMs)}` : '', o.savingsKb ? `${o.savingsKb} KB` : ''].filter(Boolean).join(' / ')}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

/** The speed test on the client's Results tab: scores up top, then tabs (overview, real visitors, why it is slow, weight, file fixes). */
export default function SpeedResults({ speed, title = 'How fast your website loads', intro = '' }) {
  const available = DEVICES.filter((d) => speed.before?.[d.id] || speed.after?.[d.id])
  const [device, setDevice] = useState(available[0]?.id || 'mobile')
  const [tab, setTab] = useState('overview')
  const b = speed.before?.[device] || null
  const a = speed.after?.[device] || null
  const latest = a || b
  const tested = (speed.after || speed.before)?.testedAt
  const testedOn = tested ? new Date(tested).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : ''
  const field = latest?.field
  const opps = latest?.opportunities || []
  const defaultIntro = `Tested with Google PageSpeed on a phone and on a desktop${testedOn ? `, ${testedOn}` : ''}. Slow pages lose visitors and rank lower.${speed.before && speed.after ? ' You see the speed before and after our work.' : ''}`
  const fieldBits = field ? [field.lcpMs !== null && `Main content ${formatMetric('lcpMs', field.lcpMs)}`, field.inpMs !== null && `Tap response ${formatMetric('tbtMs', field.inpMs)}`, field.cls !== null && `Layout jump ${field.cls}`].filter(Boolean) : []

  const tabs = latest ? [
    { id: 'overview', label: 'Overview', show: true },
    { id: 'visitors', label: 'Real visitors', show: Boolean(latest.vitals || field) },
    { id: 'slow', label: 'Why it is slow', show: Boolean(latest.causes || opps.length > 3) },
    { id: 'weight', label: 'Page weight', show: Boolean(latest.weight) },
    { id: 'fixes', label: 'File fixes', show: Boolean(latest.fixes?.length), count: latest.fixes?.length },
  ].filter((t) => t.show) : []
  const active = tabs.some((t) => t.id === tab) ? tab : 'overview'
  const g = speedGrade(latest?.score)
  const gain = speedGain(speed, device)

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
        <>
          <div className="mt-4 flex flex-wrap items-center gap-5 rounded-2xl border border-slate-200 p-4 sm:p-5">
            {latest.categories ? <ScoreRings categories={latest.categories} /> : (
              <div className="min-w-0 flex-1 basis-[200px]">
                <p className="text-[13px] font-semibold text-slate-600">Speed score</p>
                <p className="text-[44px] font-extrabold leading-none tabular-nums text-slate-950">{latest.score}</p>
                <p className="mt-1 text-[13px] font-bold text-slate-600">{g.word}</p>
              </div>
            )}
            <VitalsBanner vitals={latest.vitals} />
          </div>
          {gainBits(b?.score, a?.score, gain) ? <p className="mt-2 text-[13px] font-semibold text-slate-500">Speed score {gainBits(b?.score, a?.score, gain)}</p> : null}

          {tabs.length > 1 ? (
            <div className="mt-5 flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist" aria-label="Speed details">
              {tabs.map((t) => (
                <button key={t.id} type="button" role="tab" id={`speed-tab-${t.id}`} aria-selected={active === t.id} aria-controls="speed-panel" onClick={() => setTab(t.id)} className={`gx-focus -mb-px shrink-0 whitespace-nowrap border-b-[3px] px-4 py-3 text-[14.5px] font-bold transition ${active === t.id ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-600 hover:text-slate-900'}`}>
                  {t.label}{t.count ? <span className="ml-1.5 rounded-full bg-blue-700 px-2 py-0.5 text-[12px] text-white">{t.count}</span> : null}
                </button>
              ))}
            </div>
          ) : null}

          <div id="speed-panel" role={tabs.length > 1 ? 'tabpanel' : undefined} aria-labelledby={tabs.length > 1 ? `speed-tab-${active}` : undefined}>
            {active === 'overview' ? (
              <div className="mt-4">
                <div className="flex flex-wrap items-start gap-4">
                  {latest.media ? <div className="min-w-0 flex-1 basis-[300px] rounded-2xl border border-slate-200 p-4 sm:p-5"><div className="-mt-5"><ScreenshotStrip media={latest.media} device={device} /></div></div> : null}
                  <TopFixes opps={opps} />
                </div>
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
              </div>
            ) : null}

            {active === 'visitors' ? (
              <>
                <VitalsPanel vitals={latest.vitals} />
                {field && !latest.vitals ? (
                  <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-[14px] leading-6 text-sky-950">
                    <p className="font-bold">What real visitors experience{field.category ? `: ${FIELD_WORD[field.category]}` : ''}</p>
                    <p className="mt-0.5 text-[13.5px] text-sky-900/80">Google's own numbers from people who opened your site in Chrome.{fieldBits.length ? ` ${fieldBits.join(', ')}.` : ''}</p>
                  </div>
                ) : null}
              </>
            ) : null}

            {active === 'slow' ? (
              <>
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
              </>
            ) : null}

            {active === 'weight' ? <WeightPanel weight={latest.weight} /> : null}
            {active === 'fixes' ? <FixesPanel fixes={latest.fixes} /> : null}
          </div>
        </>
      ) : null}
    </section>
  )
}
