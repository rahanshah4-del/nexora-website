import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

/**
 * Real screenshots of a GeoLint report (an audit of nexorasolution.us, 5 Nov 2026) as a slider. Every slide is in the
 * HTML at once (a sliding track, not mount/unmount), so crawlers see all the images, their alt text and the captions.
 * Images: /public/geolint-report/*.webp, 1600 x 893.
 */

const W = 1600
const H = 893
const SLIDES = [
  {
    id: 'summary', tab: 'Summary', src: '/geolint-report/summary.webp',
    title: 'One score and four areas',
    text: 'A score out of 100 with a plain-language verdict, then Bot Access, JavaScript, BLUF Structure and Facts & Schema each scored on their own.',
    alt: 'GeoLint report summary for nexorasolution.us: score 94.8 out of 100, grade A Excellent, with Bot Access 30, JavaScript 25, BLUF Structure 21.8 and Facts and Schema 18',
  },
  {
    id: 'speed', tab: 'Website speed', src: '/geolint-report/speed.webp',
    title: 'Google PageSpeed, built in',
    text: 'Phone and desktop speed from Google itself, with accessibility, best practices, SEO, page size, requests and what the browser spends its time on.',
    alt: 'GeoLint Website speed screen: Google PageSpeed phone score 100 with accessibility, best practices and SEO scores, page size 743 KB and 32 requests, next to a Google screenshot of the page',
  },
  {
    id: 'bots', tab: 'AI bot access', src: '/geolint-report/bots.webp',
    title: 'Which AI bots can reach you',
    text: 'Every crawler is checked twice, against robots.txt and with a live request using its own user-agent: GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot, Claude-SearchBot, PerplexityBot and CCBot.',
    alt: 'GeoLint Bot access screen: GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot, Claude-SearchBot, PerplexityBot and CCBot each marked Allowed in robots.txt and Reachable with a 200 response',
  },
  {
    id: 'answer', tab: 'Answer-first', src: '/geolint-report/answer.webp',
    title: 'Does every heading open with an answer?',
    text: 'Each H2 and H3 on the page is scored on whether its opening lines answer the question, because AI tools quote those first sentences.',
    alt: 'GeoLint Answer-first structure screen: 60 headings checked, 59 passed and 1 partial, with a percentage bar for every heading on the page',
  },
  {
    id: 'health', tab: 'Page health', src: '/geolint-report/health.webp',
    title: 'Everyday SEO checks next to the score',
    text: 'Metrics, content, indexability, structured data, social tags, images, HTTP headers and outgoing links, each with what to fix and the code to copy.',
    alt: 'GeoLint Page health screen: 1 to fix, 3 to improve and 35 checks passed, with tabs for metrics, content, indexability, structured data, social tags, images, HTTP headers and outgoing links',
  },
  {
    id: 'fix', tab: 'Fix these first', src: '/geolint-report/fix.webp',
    title: 'One prompt that fixes everything',
    text: 'The audit becomes a ready prompt for Claude Code, ChatGPT, Cursor or Gemini. It lists every issue with what GeoLint measured and tells the tool not to invent facts.',
    alt: 'GeoLint Fix these first screen: a single AI prompt that fixes all 2 issues, with buttons for Claude Code, ChatGPT and Codex, Cursor and Gemini and a Copy prompt button',
  },
]
const AUTOPLAY_MS = 6500

function Arrow({ dir, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir < 0 ? 'Previous screen' : 'Next screen'}
      className={`absolute top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white/95 text-slate-800 shadow-lg backdrop-blur transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${dir < 0 ? 'left-3' : 'right-3'}`}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={dir < 0 ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
      </svg>
    </button>
  )
}

export default function GeoLintReportShowcase() {
  const reduce = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const touch = useRef(null)
  const go = useCallback((next) => setIndex((next + SLIDES.length) % SLIDES.length), [])

  useEffect(() => {
    if (paused || reduce) return undefined
    const t = setTimeout(() => setIndex((i) => (i + 1) % SLIDES.length), AUTOPLAY_MS)
    return () => clearTimeout(t)
  }, [index, paused, reduce])

  const slide = SLIDES[index]
  const onKey = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1) }
  }
  const onTouchStart = (e) => { touch.current = e.touches[0].clientX; setPaused(true) }
  const onTouchEnd = (e) => {
    const start = touch.current
    touch.current = null
    setPaused(false)
    if (start === null) return
    const dx = e.changedTouches[0].clientX - start
    if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1))
  }

  return (
    <section className="glp-showcase relative overflow-hidden px-4 py-16 text-slate-900 sm:px-6 sm:py-20" aria-labelledby="gl-showcase-title">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-indigo-300/30 blur-[90px]" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-emerald-300/25 blur-[90px]" />
      <div className="relative mx-auto max-w-7xl">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6 }} className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">What your report looks like</p>
          <h2 id="gl-showcase-title" className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">A real GeoLint report, <span className="glp-text-grad">screen by screen</span></h2>
          <p className="mt-4 text-[16px] leading-7 text-slate-600">These are screenshots of a real audit of nexorasolution.us run on 5 November 2026. The free report gives you a score, Google speed, AI bot access, answer-first checks, SEO page health and a one-prompt fix, plus a PDF you can keep or send to your developer.</p>
        </motion.div>

        <div className="mt-9 grid items-start gap-8 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,21rem)_minmax(0,1fr)]">
          <div role="tablist" aria-label="Report screens" aria-orientation="vertical" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
            {SLIDES.map((s, i) => {
              const on = i === index
              return (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  id={`gl-tab-${s.id}`}
                  aria-selected={on}
                  aria-controls={`gl-slide-${s.id}`}
                  onClick={() => go(i)}
                  className={`relative shrink-0 rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 lg:w-full ${on ? 'border-indigo-300 bg-white shadow-[0_14px_34px_-20px_rgba(79,70,229,.7)]' : 'border-transparent bg-white/60 hover:bg-white'}`}
                >
                  <span className="flex items-center gap-3">
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-extrabold ${on ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>{i + 1}</span>
                    <span className={`whitespace-nowrap text-[15px] font-bold lg:whitespace-normal ${on ? 'text-slate-950' : 'text-slate-700'}`}>{s.tab}</span>
                  </span>
                  <span className={`mt-2 hidden text-[13.5px] leading-6 text-slate-600 ${on ? 'lg:block' : ''}`}>{s.text}</span>
                  {on && !reduce && !paused ? <motion.span key={`bar-${index}`} aria-hidden="true" className="absolute inset-x-4 bottom-0 h-[3px] origin-left rounded-full bg-indigo-500/70" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: AUTOPLAY_MS / 1000, ease: 'linear' }} /> : null}
                </button>
              )
            })}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            className="relative min-w-0"
          >
            <div className="absolute -inset-1 rounded-[1.75rem] bg-gradient-to-br from-sky-300/50 via-indigo-300/30 to-emerald-300/40 opacity-70 blur-xl" aria-hidden="true" />
            <div className="glp-window relative overflow-hidden rounded-[1.5rem]">
              <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" /><span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                <span className="ml-3 truncate rounded-md border border-slate-200 bg-white px-3 py-0.5 text-[11.5px] text-slate-500">GeoLint report · nexorasolution.us</span>
                <span className="ml-auto shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Real audit</span>
              </div>
              <div
                role="group"
                aria-roledescription="carousel"
                aria-label="GeoLint report screenshots"
                tabIndex={0}
                onKeyDown={onKey}
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
                className="relative touch-pan-y overflow-hidden bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400"
              >
                <div className="flex" style={{ transform: `translate3d(-${index * 100}%,0,0)`, transition: reduce ? 'none' : 'transform 600ms cubic-bezier(.2,.7,.2,1)' }}>
                  {SLIDES.map((s, i) => (
                    <figure
                      key={s.id}
                      id={`gl-slide-${s.id}`}
                      role="tabpanel"
                      aria-roledescription="slide"
                      aria-labelledby={`gl-tab-${s.id}`}
                      aria-hidden={i === index ? undefined : 'true'}
                      className="m-0 w-full shrink-0"
                    >
                      <img
                        src={s.src}
                        alt={s.alt}
                        width={W}
                        height={H}
                        loading={i === 0 || i === index || i === (index + 1) % SLIDES.length ? 'eager' : 'lazy'}
                        fetchPriority={i === 0 ? 'high' : undefined}
                        decoding="async"
                        draggable="false"
                        className="block h-auto w-full select-none"
                      />
                      <figcaption className="border-t border-slate-200 bg-white px-5 py-4">
                        <p className="text-[16px] font-bold text-slate-950">{s.title}</p>
                        <p className="mt-1 text-[14px] leading-6 text-slate-600 lg:hidden">{s.text}</p>
                      </figcaption>
                    </figure>
                  ))}
                </div>
                <Arrow dir={-1} onClick={() => go(index - 1)} />
                <Arrow dir={1} onClick={() => go(index + 1)} />
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 text-[12px] text-slate-500">
                <span aria-live="polite">Screen {index + 1} of {SLIDES.length}: {slide.tab}</span>
                <span className="flex gap-1.5">
                  {SLIDES.map((s, i) => (
                    <button key={s.id} type="button" onClick={() => go(i)} aria-label={`Show ${s.tab}`} aria-current={i === index ? 'true' : undefined} className="grid h-6 place-items-center px-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
                      <span className={`block h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-6 bg-indigo-500' : 'w-1.5 bg-slate-300'}`} />
                    </button>
                  ))}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
