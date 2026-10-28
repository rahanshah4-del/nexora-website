import { useCallback, useEffect, useRef, useState } from 'react'
import { checkSpeed } from '../../../lib/geolint.js'
import { compareWithPrevious } from '../../../lib/geolintSpeedHistory.js'

export const SPEED_SECTION_ID = 'website-speed'

/**
 * The free audit's speed test. It starts by itself when the report opens and runs beside the rest of the report.
 * The result is compared with the last test of the same page made in this browser. One test feeds the summary card
 * at the top, the full section further down and the PDF.
 */
export function useSpeedTest(url) {
  const [state, setState] = useState({ status: 'loading', speed: null, error: '' })
  const seq = useRef(0)
  const fetchSpeed = useCallback((fresh) => {
    const mine = ++seq.current
    checkSpeed(url, { fresh })
      .then((r) => { if (mine === seq.current) setState({ status: 'done', speed: compareWithPrevious(url, r.speed), error: '' }) })
      .catch((e) => { if (mine === seq.current) setState({ status: 'error', speed: null, error: e?.message || 'The speed test could not run.' }) })
  }, [url])
  useEffect(() => { if (!url) return undefined; fetchSpeed(false); return () => { seq.current += 1 } }, [url, fetchSpeed])
  const run = useCallback(() => { setState((s) => ({ ...s, status: 'loading', error: '' })); fetchSpeed(true) }, [fetchSpeed])
  return { ...state, run }
}

