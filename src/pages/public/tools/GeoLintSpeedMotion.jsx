import { useEffect, useState } from 'react'

// Android / Google style motion for the GeoLint speed test: a Material circular spinner that cycles the four Google
// colours, a four-colour indeterminate bar, skeleton tiles with a shimmer, rotating step text, and a count-up +
// bar-grow when the scores arrive. Pure CSS + one small hook. Everything is calm (static) under prefers-reduced-motion.

const CSS = `
@keyframes gs-rotate { to { transform: rotate(360deg); } }
@keyframes gs-dash { 0% { stroke-dasharray: 2, 200; stroke-dashoffset: 0; } 50% { stroke-dasharray: 90, 200; stroke-dashoffset: -35px; } 100% { stroke-dasharray: 90, 200; stroke-dashoffset: -125px; } }
@keyframes gs-color { 0%, 100% { stroke: #4285f4; } 25% { stroke: #ea4335; } 50% { stroke: #fbbc05; } 75% { stroke: #34a853; } }
@keyframes gs-bar { 0% { transform: translateX(-110%) scaleX(.5); } 50% { transform: translateX(60%) scaleX(1); } 100% { transform: translateX(330%) scaleX(.5); } }
@keyframes gs-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
@keyframes gs-ripple { 0% { box-shadow: 0 0 0 0 rgba(66,133,244,.22); } 70%, 100% { box-shadow: 0 0 0 7px rgba(66,133,244,0); } }
@keyframes gs-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@keyframes gs-pop { from { opacity: 0; transform: translateY(14px) scale(.96); } to { opacity: 1; transform: none; } }
@keyframes gs-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
.gs-spinner { animation: gs-rotate 1.4s linear infinite; }
.gs-spinner circle { fill: none; stroke-width: 4; stroke-linecap: round; animation: gs-dash 1.4s ease-in-out infinite, gs-color 5.6s ease-in-out infinite; }
.gs-track { position: relative; overflow: hidden; background: #e8eaed; border-radius: 9999px; }
.gs-bar { position: absolute; inset: 0 auto 0 0; width: 38%; border-radius: 9999px; background: linear-gradient(90deg, #4285f4, #ea4335 35%, #fbbc05 68%, #34a853); animation: gs-bar 1.7s cubic-bezier(.4, 0, .2, 1) infinite; }
.gs-skel { background: linear-gradient(100deg, #f1f3f4 30%, #fafbfc 50%, #f1f3f4 70%); background-size: 200% 100%; animation: gs-shimmer 1.6s linear infinite; border-radius: 8px; }
.gs-live { animation: gs-ripple 2s ease-out infinite; }
.gs-step { animation: gs-fade .35s ease both; }
.gs-pop { animation: gs-pop .6s cubic-bezier(.2, .8, .2, 1) both; animation-delay: var(--gs-d, 0ms); }
.gs-grow { transform-origin: left center; animation: gs-grow .9s cubic-bezier(.2, .8, .2, 1) both; animation-delay: calc(var(--gs-d, 0ms) + 150ms); }
html.public-dark .gs-track { background: #2a3344; }
html.public-dark .gs-skel { background: linear-gradient(100deg, #1f2736 30%, #2b3549 50%, #1f2736 70%); background-size: 200% 100%; }
@media (prefers-reduced-motion: reduce) {
  .gs-spinner, .gs-spinner circle, .gs-bar, .gs-skel, .gs-live { animation: none; }
  .gs-spinner circle { stroke: #4285f4; stroke-dasharray: 60, 200; }
  .gs-bar { width: 45%; }
  .gs-step, .gs-pop, .gs-grow { animation: none; }
}`

export function SpeedMotionStyles() {
  return <style>{CSS}</style>
}

/** Material circular progress, four Google colours. Drop it around or instead of an icon. */
export function GoogleSpinner({ size = 48, className = '', style }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" width={size} height={size} style={style} className={`gs-spinner ${className}`}>
      <circle cx="24" cy="24" r="19" />
    </svg>
  )
}

/** Four-colour indeterminate linear bar (the Android loading bar). */
export function GoogleBar({ className = 'h-1.5' }) {
  return <span aria-hidden="true" className={`gs-track block ${className}`}><span className="gs-bar" /></span>
}

/** Grey shimmering block. */
export function Skel({ className = '' }) {
  return <span aria-hidden="true" className={`gs-skel block ${className}`} />
}

const STEPS = [
  'Opening your page on a phone…',
  'Measuring how fast it loads…',
  'Checking Core Web Vitals…',
  'Now testing on a desktop…',
  'Almost done, collecting the results…',
]

/** Moves through STEPS every few seconds and stays on the last one. */
export function useSpeedStep(active = true, every = 5200) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (!active) { setI(0); return undefined }
    const id = setInterval(() => setI((n) => Math.min(n + 1, STEPS.length - 1)), every)
    return () => clearInterval(id)
  }, [active, every])
  return { index: i, text: STEPS[i], total: STEPS.length }
}

/** Rotating step text. Visible to everyone, announced once (not on every change). */
export function StepText({ className = '' }) {
  const { index, text } = useSpeedStep()
  return <p key={index} aria-hidden="true" className={`gs-step ${className}`}>{text}</p>
}

/** Counts up from 0 once; shows the value straight away under reduced motion. */
export function CountUp({ value, duration = 900, delay = 0 }) {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    if (typeof value !== 'number') return undefined
    if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(value); return undefined }
    let frame
    const start = performance.now() + delay
    const tick = (now) => {
      const t = Math.min(1, Math.max(0, (now - start) / duration))
      setShown(Math.round(value * (1 - (1 - t) ** 3)))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, duration, delay])
  return <>{shown}</>
}
