import { useEffect, useRef, useState } from 'react'
import { ACCENT, hexA } from './fxMath.js'
import { introFiles, introForSlug, introSchema, MODULE_INTRO } from '../../lib/moduleIntros.js'

/**
 * The module intro video on a product page: a dark autoplaying player with a poster, plus a chapter list that seeks the video. It is silent, loads
 * nothing until pressed (preload="none") and renders nothing for products
 * without an intro. The page says the screens are illustrations with sample data.
 */
export default function ModuleIntroSection({ solutionSlug }) {
  const intro = introForSlug(solutionSlug)
  const videoRef = useRef(null)
  const [started, setStarted] = useState(false)
  const [reduced] = useState(() => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches))
  const [active, setActive] = useState(0)
  const hasIntro = Boolean(intro)

  // Muted loop that plays while the video is on screen and pauses when it scrolls away.
  // Skipped for people who ask for reduced motion (they get the poster and the player controls).
  useEffect(() => {
    const video = videoRef.current
    if (!hasIntro || !video || typeof IntersectionObserver === 'undefined') return undefined
    if (reduced) return undefined
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) video.play().then(() => setStarted(true)).catch(() => {})
      else video.pause()
    }, { threshold: 0.45 })
    observer.observe(video)
    return () => observer.disconnect()
  }, [hasIntro, reduced])

  if (!intro) return null
  const files = introFiles(intro.id)
  const [main, , glow] = ACCENT[intro.accent]

  const seek = (index) => {
    const video = videoRef.current
    if (!video) return
    setStarted(true)
    video.currentTime = intro.scenes[index].start
    video.play().catch(() => {})
  }
  const onTime = () => {
    const t = videoRef.current?.currentTime || 0
    let next = 0
    intro.scenes.forEach((scene, i) => { if (t >= scene.start) next = i })
    setActive(next)
  }

  return (
    <section id="intro-video" data-reveal className="bg-[#050914] py-16 sm:py-20 lg:py-24" style={{ backgroundColor: '#050914' }} aria-labelledby="intro-video-heading">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-mono text-xs uppercase tracking-[0.28em]" style={{ color: main }}>{intro.productName}</p>
          <h2 id="intro-video-heading" className="mt-4 text-3xl font-medium tracking-tight text-white sm:text-5xl">{intro.heading}</h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-400">{intro.description}</p>
        </div>

        <figure className="relative mx-auto mt-12 max-w-5xl">
          <div className="relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-black" style={{ boxShadow: `0 40px 120px -40px ${glow}` }}>
            <video
              key={intro.id}
              ref={videoRef}
              className="block h-auto w-full"
              width={MODULE_INTRO.width}
              height={MODULE_INTRO.height}
              poster={files.poster}
              preload="none"
              muted
              loop
              playsInline
              controls={reduced}
              aria-label={intro.description}
              onTimeUpdate={onTime}
              onPlay={() => setStarted(true)}
            >
              <source src={files.mp4} type="video/mp4" />
              <source src={files.webm} type="video/webm" />
            </video>
          </div>
          <figcaption className="sr-only">{intro.description}</figcaption>
        </figure>

        <ol className="mx-auto mt-8 grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {intro.scenes.map((scene, i) => (
            <li key={scene.id}>
              <button
                type="button"
                onClick={() => seek(i)}
                aria-current={i === active && started ? 'step' : undefined}
                className={`h-full w-full rounded-2xl border px-4 py-3 text-left transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${i === active && started ? '' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                style={i === active && started ? { borderColor: hexA(main, 0.6), backgroundColor: hexA(main, 0.1) } : undefined}
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">{String(i + 1).padStart(2, '0')}</span>
                <span className="mt-1 block text-sm font-medium text-white">{scene.title}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-400">{scene.caption}</span>
              </button>
            </li>
          ))}
        </ol>

        <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-6 text-slate-500">Illustration with sample data. The screens are simplified, and the figures and names are made up.</p>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(introSchema(intro)) }} />
    </section>
  )
}
