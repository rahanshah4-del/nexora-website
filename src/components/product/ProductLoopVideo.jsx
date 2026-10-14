import { useEffect, useRef, useState } from 'react'
import { HiOutlinePause, HiOutlinePlay } from 'react-icons/hi2'
import { clipFiles, PRODUCT_CLIP } from '../../lib/productVideos.js'

/**
 * A silent looping product clip with a step list beside it. The video loads when
 * it nears the screen, plays only while visible, and shows a poster until then.
 * People who prefer reduced motion get the poster and a Play button, and everyone
 * can pause it. The active step follows the video's own clock.
 */
export default function ProductLoopVideo({ clip, reverse = false }) {
  const files = clipFiles(clip.id)
  const videoRef = useRef(null)
  const boxRef = useRef(null)
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const pausedRef = useRef(false)

  useEffect(() => {
    const media = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
    if (media?.matches) pausedRef.current = true
    const video = videoRef.current
    const box = boxRef.current
    if (!video || !box || typeof IntersectionObserver !== 'function') return undefined
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        video.preload = 'auto'
        if (!pausedRef.current) video.play().catch(() => {})
      } else {
        video.pause()
      }
    }, { threshold: 0.45, rootMargin: '120px 0px' })
    observer.observe(box)
    return () => observer.disconnect()
  }, [])

  const onTime = () => {
    const t = videoRef.current?.currentTime || 0
    let active = 0
    clip.steps.forEach((s, i) => { if (t >= s.at) active = i })
    setStep(active)
  }

  const toggle = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      pausedRef.current = false
      video.play().catch(() => {})
    } else {
      pausedRef.current = true
      video.pause()
    }
  }

  return (
    <div className="grid items-center gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
      <div className={reverse ? 'lg:order-2' : ''}>
        <h3 className="text-2xl font-medium tracking-tight text-slate-900 sm:text-3xl">{clip.title}</h3>
        <ol className="mt-6 grid gap-1">
          {clip.steps.map((s, i) => (
            <li key={s.title} className={`flex gap-4 rounded-2xl px-4 py-3 transition-colors duration-300 ${i === step ? 'bg-slate-100' : ''}`} aria-current={i === step ? 'step' : undefined}>
              <span className={`mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold transition-colors duration-300 ${i === step ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'}`}>{i + 1}</span>
              <div>
                <p className={`text-base font-medium transition-colors duration-300 ${i === step ? 'text-slate-900' : 'text-slate-500'}`}>{s.title}</p>
                <p className={`mt-1 text-sm leading-6 transition-colors duration-300 ${i === step ? 'text-slate-600' : 'text-slate-400'}`}>{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <figure ref={boxRef} className={`relative m-0 ${reverse ? 'lg:order-1' : ''}`}>
        <div className="overflow-hidden rounded-[1.6rem] border border-slate-200/70 bg-white shadow-[0_40px_100px_-50px_rgba(15,23,42,0.5)]">
          <video
            ref={videoRef}
            className="block h-auto w-full"
            width={PRODUCT_CLIP.width}
            height={PRODUCT_CLIP.height}
            poster={files.poster}
            preload="none"
            muted
            loop
            playsInline
            aria-label={clip.description}
            onTimeUpdate={onTime}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          >
            <source src={files.mp4} type="video/mp4" />
            <source src={files.webm} type="video/webm" />
          </video>
        </div>
        <button
          type="button"
          onClick={toggle}
          className="absolute bottom-3 left-3 inline-flex h-10 items-center gap-2 rounded-full bg-slate-900/80 px-4 text-xs font-medium text-white backdrop-blur transition hover:bg-slate-900"
          aria-label={playing ? `Pause the ${clip.title} clip` : `Play the ${clip.title} clip`}
        >
          {playing ? <HiOutlinePause className="text-base" /> : <HiOutlinePlay className="text-base" />}
          {playing ? 'Pause' : 'Play'}
        </button>
        <figcaption className="sr-only">{clip.description}</figcaption>
      </figure>
    </div>
  )
}
