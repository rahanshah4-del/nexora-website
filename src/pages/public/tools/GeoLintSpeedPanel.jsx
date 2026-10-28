import { useCallback, useEffect, useRef, useState } from 'react'
import { checkSpeed } from '../../../lib/geolint.js'
import { compareWithPrevious } from '../../../lib/geolintSpeedHistory.js'
import SpeedResults from './GeoLintSpeedResults.jsx'

/**
 * The free audit's speed test. It starts by itself when the report opens, runs beside the rest of the report,
 * and compares with the last test of the same page made in this browser. `onResult` hands the numbers to the PDF.
 */
export default function SpeedPanel({ url, onResult }) {
  const [state, setState] = useState({ status: 'loading', speed: null, error: '' })
  const seq = useRef(0)

  const fetchSpeed = useCallback((fresh) => {
    const mine = ++seq.current
    checkSpeed(url, { fresh })
      .then((r) => {
        if (mine !== seq.current) return
        const speed = compareWithPrevious(url, r.speed)
        setState({ status: 'done', speed, error: '' })
        onResult?.(speed)
      })
      .catch((e) => { if (mine === seq.current) setState({ status: 'error', speed: null, error: e?.message || 'The speed test could not run.' }) })
  }, [url, onResult])

  useEffect(() => { fetchSpeed(false); return () => { seq.current += 1 } }, [fetchSpeed])
  const run = () => { setState((s) => ({ ...s, status: 'loading', error: '' })); fetchSpeed(true) }

  const { status, speed, error } = state
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
        <p className="mt-1 text-[13.5px] text-slate-500">This takes about 20 to 40 seconds. The rest of your report is ready above.</p>
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
