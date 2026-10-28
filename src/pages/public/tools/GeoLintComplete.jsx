import { useEffect, useMemo, useState } from 'react'
import { downloadOrderReport } from '../../../lib/geolintReportPdf.js'
import { compareScores, signed } from '../../../lib/geolintFix.js'
import './GeoLintComplete.css'

const RADIUS = 54
const CIRC = 2 * Math.PI * RADIUS
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Counts from `from` to `to` with an ease-out, once, after a short delay. Reduced motion jumps to the end. */
function useCountUp(from, to, { ms = 1900, delay = 450 } = {}) {
  const [value, setValue] = useState(reducedMotion() ? to : from)
  const [finished, setFinished] = useState(reducedMotion())
  useEffect(() => {
    if (reducedMotion()) return undefined
    let raf = 0
    let start = 0
    const tick = (now) => {
      if (!start) start = now
      const p = Math.min(1, (now - start) / ms)
      const eased = 1 - (1 - p) ** 3
      setValue(from + (to - from) * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
      else setFinished(true)
    }
    const timer = setTimeout(() => { raf = requestAnimationFrame(tick) }, delay)
    return () => { clearTimeout(timer); cancelAnimationFrame(raf) }
  }, [from, to, ms, delay])
  return { value, finished }
}

// a ring of small confetti pieces; fixed values so the burst looks the same every time
const CONFETTI = Array.from({ length: 18 }, (_, i) => {
  const angle = (i / 18) * Math.PI * 2 + (i % 2 ? 0.2 : 0)
  const dist = 78 + (i % 3) * 22
  return { x: Math.round(Math.cos(angle) * dist), y: Math.round(Math.sin(angle) * dist), r: (i * 47) % 360, c: ['#30d158', '#0a84ff', '#ffd60a', '#ff9f0a', '#bf5af2', '#5ac8fa'][i % 6], d: (i % 6) * 40 }
})

/** The "your order is complete" card: check, the after score counting up on a ring, the gain, and the PDF report. */
export default function CompleteCard({ order, target = 90, onSeeResults }) {
  const cmp = useMemo(() => compareScores(order.before, order.after, target), [order.before, order.after, target])
  const hasScore = cmp.after !== null
  const from = cmp.before ?? 0
  const { value, finished } = useCountUp(from, cmp.after ?? 0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const shown = Math.round(value * 10) / 10
  const ratio = Math.max(0, Math.min(100, value)) / 100

  async function download() {
    setBusy(true)
    setError('')
    try { await downloadOrderReport(order, { target }) } catch { setError('Could not build the PDF. Please try again.') } finally { setBusy(false) }
  }

  return (
    <section className={`gd ${hasScore ? 'has-score' : ''} ${finished ? 'is-finished' : ''}`} aria-label="Order complete">
      <div className="gd-burst" aria-hidden="true">
        {CONFETTI.map((c, i) => <span key={i} style={{ '--x': `${c.x}px`, '--y': `${c.y}px`, '--r': `${c.r}deg`, '--c': c.c, '--d': `${c.d}ms` }} />)}
      </div>

      <div className="gd-top">
        <span className="gd-check" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path className="gd-check-path" d="m5.5 12.8 4.2 4.2L18.5 7.5" /></svg>
        </span>
        <div>
          <h2 className="gd-title">Your order is complete</h2>
          <p className="gd-sub">{hasScore ? 'We fixed your site and measured it again. Here is the result.' : 'We finished the work on your site. Your report is ready.'}</p>
        </div>
      </div>

      {hasScore ? (
        <div className="gd-score">
          <div className="gd-ring" role="img" aria-label={`Score after the fix: ${cmp.after} out of 100`}>
            <svg viewBox="0 0 128 128" width="170" height="170">
              <defs><linearGradient id="gd-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#30d158" /><stop offset="1" stopColor="#0a84ff" /></linearGradient></defs>
              <circle cx="64" cy="64" r={RADIUS} fill="none" stroke="rgba(60,60,67,0.12)" strokeWidth="10" />
              <circle cx="64" cy="64" r={RADIUS} fill="none" stroke="url(#gd-grad)" strokeWidth="10" strokeLinecap="round" transform="rotate(-90 64 64)" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - ratio)} />
            </svg>
            <span className="gd-num"><strong>{shown.toFixed(1)}</strong><small>/ 100</small></span>
          </div>
          <div className="gd-facts">
            <div className="gd-fact"><span>Before</span><strong>{cmp.before === null ? '-' : cmp.before}</strong></div>
            <div className="gd-fact is-after"><span>After</span><strong>{cmp.after}</strong></div>
            {cmp.gain !== null ? <div className={`gd-gain ${cmp.gain >= 0 ? 'is-up' : 'is-down'}`}>{signed(cmp.gain)} points</div> : null}
            <p className="gd-target">{cmp.reachedTarget ? `Our ${target}+ target is reached.` : `Our target was ${target}+. The score is measured, not promised.`}</p>
          </div>
        </div>
      ) : null}

      {order.siteCrawl ? (
        <div className="gd-site">
          <p className="gd-site-title">Your whole website</p>
          <dl className="gd-site-grid">
            <div><dt>Pages checked</dt><dd>{order.siteCrawl.pagesAudited}</dd></div>
            <div><dt>Site score</dt><dd>{order.siteCrawl.score?.indexable ?? '-'}</dd></div>
            <div><dt>Strong pages</dt><dd>{(order.siteCrawl.distribution?.excellent || 0) + (order.siteCrawl.distribution?.good || 0)}</dd></div>
            <div><dt>Findings</dt><dd>{order.siteCrawl.issues?.length || 0}</dd></div>
          </dl>
        </div>
      ) : null}

      <div className="gd-actions">
        <button type="button" className="gd-btn is-primary" onClick={download} disabled={busy}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v11M7 11l5 5 5-5M5 20h14" /></svg>
          {busy ? 'Building your PDF…' : 'Download PDF report'}
        </button>
        {onSeeResults ? <button type="button" className="gd-btn" onClick={onSeeResults}>See full results</button> : null}
      </div>
      {error ? <p role="alert" className="gd-error">{error}</p> : <p className="gd-note">The report has your before and after score, what we found, how you compare and what we did.{order.siteCrawl ? ' It also lists every page of your website with its score and problems.' : ''}</p>}
    </section>
  )
}
