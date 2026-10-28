import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

/** A sample of what the free audit returns, as a swipeable report preview. Sample numbers only, labelled as such. */

const SLIDES = [
  { id: 'score', tab: 'Score', title: 'One score, four areas', text: 'See at a glance how ready your site is for ChatGPT, Claude, Perplexity and Google AI.' },
  { id: 'speed', tab: 'Speed', title: 'Google PageSpeed, built in', text: 'Phone and desktop speed from Google itself, with the vitals that matter.' },
  { id: 'bots', tab: 'AI bots', title: 'Which AI bots can reach you', text: 'Each crawler is tested with its own user-agent, so you know who gets in and who is blocked.' },
]
const AREAS = [
  { name: 'Bot Access', earned: 30, max: 30, color: '#34d399' },
  { name: 'JavaScript', earned: 25, max: 25, color: '#34d399' },
  { name: 'BLUF Structure', earned: 21.9, max: 25, color: '#fbbf24' },
  { name: 'Facts & Schema', earned: 16.8, max: 20, color: '#fb923c' },
]
const VITALS = [['Main content (LCP)', '1.4 s'], ['First paint (FCP)', '0.8 s'], ['Ready to tap (TBT)', '40 ms'], ['Layout jump (CLS)', '0.01']]
const BOTS = ['ChatGPT-User', 'OAI-SearchBot', 'Claude-SearchBot', 'PerplexityBot']

function Google({ size = 34 }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-xl bg-white shadow-md ring-1 ring-white/20" style={{ width: size + 14, height: size + 14 }}>
      <svg aria-hidden="true" viewBox="0 0 48 48" width={size} height={size}>
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </svg>
    </span>
  )
}

function ScoreSlide() {
  const r = 52
  const c = 2 * Math.PI * r
  return (
    <div className="grid items-center gap-6 sm:grid-cols-[auto_1fr]">
      <div className="relative mx-auto h-36 w-36 sm:h-40 sm:w-40">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(148,163,184,.2)" strokeWidth="9" />
          <motion.circle cx="60" cy="60" r={r} fill="none" stroke="#34d399" strokeWidth="9" strokeLinecap="round" strokeDasharray={c}
            initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - 0.937) }} transition={{ duration: 1.4, ease: [0.2, 0.7, 0.2, 1] }}
            style={{ filter: 'drop-shadow(0 0 8px rgba(52,211,153,.6))' }} />
        </svg>
        <div className="absolute inset-0 grid place-content-center text-center">
          <span className="font-display text-4xl font-bold tabular-nums text-white">93.7</span>
          <span className="text-[11px] font-medium text-slate-400">out of 100</span>
        </div>
      </div>
      <ul className="space-y-3.5">
        {AREAS.map((a, i) => (
          <li key={a.name}>
            <div className="mb-1 flex items-baseline justify-between text-[12.5px]"><span className="font-semibold text-slate-200">{a.name}</span><span className="tabular-nums text-slate-400">{a.earned} / {a.max}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div className="h-full rounded-full" style={{ background: a.color }} initial={{ width: 0 }} animate={{ width: `${(a.earned / a.max) * 100}%` }} transition={{ duration: 1.1, delay: 0.15 + i * 0.12, ease: [0.2, 0.7, 0.2, 1] }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SpeedSlide() {
  return (
    <div>
      <div className="flex items-center gap-3">
        <Google />
        <div><p className="text-[15px] font-bold text-white">Website speed</p><p className="text-[12px] text-slate-400">Tested with Google PageSpeed</p></div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {[['Phone', 90], ['Desktop', 100]].map(([label, score], i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.12 }} className="rounded-2xl border border-white/10 bg-white/[0.06] p-3.5">
            <p className="text-[12px] font-medium text-slate-400">{label}</p>
            <p className="mt-1 flex items-baseline gap-2"><span className="font-display text-3xl font-bold tabular-nums text-white">{score}</span><span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-bold text-emerald-300">Fast</span></p>
          </motion.div>
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
        {VITALS.map(([k, v], i) => (
          <motion.li key={k} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 + i * 0.08 }} className="flex items-center justify-between border-b border-white/10 pb-1.5 text-[12px]"><span className="text-slate-400">{k}</span><span className="font-semibold tabular-nums text-emerald-300">{v}</span></motion.li>
        ))}
      </ul>
    </div>
  )
}

function BotsSlide() {
  return (
    <ul className="space-y-2.5">
      {BOTS.map((b, i) => (
        <motion.li key={b} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.11, type: 'spring', stiffness: 260, damping: 24 }} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-3">
          <span className="flex items-center gap-2.5 text-[13.5px] font-semibold text-slate-100"><span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />{b}</span>
          <span className="rounded-full bg-emerald-400/15 px-2.5 py-0.5 text-[11.5px] font-bold text-emerald-300">Reachable</span>
        </motion.li>
      ))}
    </ul>
  )
}

const VIEW = { score: ScoreSlide, speed: SpeedSlide, bots: BotsSlide }

export default function GeoLintReportShowcase() {
  const reduce = useReducedMotion()
  const [[index, dir], setPage] = useState([0, 1])
  const [paused, setPaused] = useState(false)
  const go = useCallback((next) => setPage(([cur]) => [(next + SLIDES.length) % SLIDES.length, next > cur || (cur === SLIDES.length - 1 && next === 0) ? 1 : -1]), [])

  useEffect(() => {
    if (paused || reduce) return undefined
    const t = setTimeout(() => go(index + 1), 5500)
    return () => clearTimeout(t)
  }, [index, paused, reduce, go])

  const slide = SLIDES[index]
  const View = VIEW[slide.id]
  const variants = {
    enter: (d) => ({ x: reduce ? 0 : d * 90, opacity: 0, filter: 'blur(6px)' }),
    center: { x: 0, opacity: 1, filter: 'blur(0px)' },
    exit: (d) => ({ x: reduce ? 0 : d * -90, opacity: 0, filter: 'blur(6px)' }),
  }

  return (
    <section className="relative overflow-hidden bg-[#050a18] px-4 py-16 text-white sm:px-6 sm:py-20" aria-labelledby="gl-showcase-title">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-indigo-600/25 blur-[90px]" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-emerald-500/15 blur-[90px]" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6 }}>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-300">What your report looks like</p>
          <h2 id="gl-showcase-title" className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">Your audit, <span className="gl-text-grad">visual and clear</span></h2>
          <p className="mt-4 max-w-md text-[16px] leading-7 text-slate-300">A score, Google speed and AI bot access on one page. No jargon, and a PDF you can keep or send to your developer.</p>
          <div role="tablist" aria-label="Report preview" className="mt-6 flex flex-wrap gap-2">
            {SLIDES.map((s, i) => (
              <button key={s.id} type="button" role="tab" aria-selected={i === index} onClick={() => go(i)} className={`relative min-h-[44px] overflow-hidden rounded-full border px-5 text-[13.5px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${i === index ? 'border-sky-300/60 bg-sky-400/15 text-white' : 'border-white/15 text-slate-300 hover:bg-white/10'}`}>
                {s.tab}
                {i === index && !reduce && !paused ? <motion.span key={`${index}-bar`} className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-sky-300" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 5.5, ease: 'linear' }} /> : null}
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={slide.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="mt-6 max-w-md">
              <p className="text-[17px] font-bold text-white">{slide.title}</p>
              <p className="mt-1.5 text-[15px] leading-7 text-slate-300">{slide.text}</p>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 32, scale: 0.97 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}
          onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} className="relative">
          <div className="absolute -inset-1 rounded-[1.75rem] bg-gradient-to-br from-sky-400/40 via-indigo-500/20 to-emerald-400/30 opacity-60 blur-xl" aria-hidden="true" />
          <div className="relative overflow-hidden rounded-[1.5rem] border border-white/15 bg-slate-900/80 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.04] px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" /><span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
              <span className="ml-3 truncate rounded-md bg-white/10 px-3 py-0.5 text-[11.5px] text-slate-400">GEO Audit Report · example.com</span>
              <span className="ml-auto shrink-0 rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Sample</span>
            </div>
            <div className="relative min-h-[300px] touch-pan-y overflow-hidden p-5 sm:min-h-[320px] sm:p-7">
              {!reduce ? <motion.div aria-hidden="true" key={`sheen-${index}`} className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent" initial={{ x: '-100%' }} animate={{ x: '420%' }} transition={{ duration: 1.1, ease: 'easeOut' }} /> : null}
              <AnimatePresence mode="wait" custom={dir} initial={false}>
                <motion.div key={slide.id} custom={dir} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}
                  drag={reduce ? false : 'x'} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.18}
                  onDragStart={() => setPaused(true)}
                  onDragEnd={(_, info) => { setPaused(false); if (info.offset.x < -50 || info.velocity.x < -400) go(index + 1); else if (info.offset.x > 50 || info.velocity.x > 400) go(index - 1) }}
                  className="cursor-grab active:cursor-grabbing">
                  <View />
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 px-5 py-3 text-[12px] text-slate-500">
              <span>Swipe or tap a tab</span>
              <span className="flex gap-1.5" aria-hidden="true">{SLIDES.map((s, i) => <span key={s.id} className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-6 bg-sky-300' : 'w-1.5 bg-white/25'}`} />)}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
