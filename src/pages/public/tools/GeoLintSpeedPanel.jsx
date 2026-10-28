import { SPEED_SECTION_ID } from './geolintSpeedHooks.js'
import { DEVICES, speedGain, speedGrade } from '../../../lib/geolintSpeed.js'
import SpeedResults from './GeoLintSpeedResults.jsx'

const TONE = {
  emerald: { text: 'text-emerald-600', bar: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-800' },
  amber: { text: 'text-amber-600', bar: 'bg-amber-500', chip: 'bg-amber-100 text-amber-800' },
  rose: { text: 'text-rose-600', bar: 'bg-rose-500', chip: 'bg-rose-100 text-rose-800' },
  slate: { text: 'text-slate-500', bar: 'bg-slate-300', chip: 'bg-slate-100 text-slate-600' },
}

/** The full-colour Google "G" logo, inline so it always shows (no network call). */
function GoogleMark({ size = 44 }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-xl bg-white ring-1 ring-slate-200" style={{ width: size, height: size }}>
      <svg aria-hidden="true" viewBox="0 0 48 48" width={size - 16} height={size - 16}>
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </svg>
    </span>
  )
}

/** The compact card next to the four score cards: both scores at a glance, with a link to the full section. */
export function SpeedCard({ test }) {
  const { status, speed, error, run } = test
  const latest = (d) => speed?.after?.[d]?.score
  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label="Website speed">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-4">
        <div className="flex min-w-0 items-center gap-3">
          <GoogleMark />
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-slate-950">Website speed</p>
            <p className="text-[12.5px] text-slate-500">Tested with Google PageSpeed</p>
          </div>
        </div>

        {speed ? (
          <div className="flex basis-full flex-wrap items-stretch gap-3 sm:flex-1 sm:basis-0">
            {DEVICES.map((d) => {
              const s = latest(d.id)
              if (typeof s !== 'number') return null
              const g = speedGrade(s)
              const t = TONE[g.tone]
              const gain = speedGain(speed, d.id)
              return (
                <div key={d.id} className="min-w-[150px] flex-1 rounded-xl bg-slate-50 px-4 py-2.5">
                  <p className="text-[12px] font-semibold text-slate-500">{d.label}</p>
                  <p className="flex items-baseline gap-2"><span className={`text-[26px] font-extrabold leading-none tabular-nums ${t.text}`}>{s}</span><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${t.chip}`}>{g.word}</span>{gain !== null ? <span className={`text-[12px] font-bold ${gain >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{gain >= 0 ? '+' : ''}{gain}</span> : null}</p>
                  <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-slate-200" aria-hidden="true"><span className={`block h-full rounded-full ${t.bar}`} style={{ width: `${Math.max(3, Math.min(100, s))}%` }} /></span>
                </div>
              )
            })}
          </div>
        ) : status === 'error' ? (
          <p role="alert" className="min-w-0 basis-full text-[13.5px] font-semibold leading-5 text-rose-700 sm:flex-1 sm:basis-0">{error}</p>
        ) : (
          <div className="basis-full sm:flex-1 sm:basis-0" role="status" aria-live="polite">
            <p className="text-[13.5px] font-semibold text-slate-700">Testing on a phone and a desktop… about 30 seconds</p>
            <span className="mt-2 block h-2 max-w-sm overflow-hidden rounded-full bg-slate-100" aria-hidden="true"><span className="block h-full w-1/3 animate-pulse rounded-full bg-blue-500" /></span>
          </div>
        )}

        <div className="flex shrink-0 items-center gap-2">
          {status === 'error' ? <button type="button" onClick={run} className="gx-focus min-h-[40px] rounded-full bg-slate-900 px-4 text-[13.5px] font-semibold text-white hover:bg-slate-800">Try again</button> : null}
          {speed ? <a href={`#${SPEED_SECTION_ID}`} className="gx-focus inline-flex min-h-[40px] items-center rounded-full bg-slate-100 px-4 text-[13.5px] font-semibold text-slate-800 hover:bg-slate-200">See details &rsaquo;</a> : null}
        </div>
      </div>
    </div>
  )
}

/** The full speed section: scores, vitals, what slows the page, and the retest button. */
export default function SpeedPanel({ test }) {
  const { status, speed, error, run } = test
  const compared = Boolean(speed?.before)
  const prevDate = speed?.before?.testedAt ? new Date(speed.before.testedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : ''
  const retest = (
    <button type="button" onClick={run} disabled={status === 'loading'} className="gx-focus mt-4 inline-flex min-h-[44px] items-center rounded-full bg-slate-900 px-5 text-[14px] font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
      {status === 'loading' ? 'Testing…' : 'Test speed again'}
    </button>
  )

  if (status === 'error') {
    return (
      <div className="gx-card p-5 text-[14px] leading-6 text-slate-700">
        <p role="alert" className="font-semibold text-rose-700">{error}</p>
        {retest}
      </div>
    )
  }
  if (!speed) {
    return (
      <div className="gx-card p-5" role="status" aria-live="polite">
        <p className="text-[15px] font-semibold text-slate-950">Testing your speed on a phone and a desktop…</p>
        <p className="mt-1 text-[13.5px] text-slate-500">This takes about 20 to 40 seconds.</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true"><span className="block h-full w-1/3 animate-pulse rounded-full bg-blue-500" /></div>
      </div>
    )
  }
  return (
    <div>
      <SpeedResults
        speed={speed}
        title=""
        intro={compared ? `Compared with your last test of this page on ${prevDate}. Fix things, then press "Test speed again" to see the difference.` : 'Tested with Google PageSpeed on a phone and on a desktop. Fix what is listed, then press "Test speed again" and you see how much faster the page got.'}
      />
      {retest}
    </div>
  )
}
