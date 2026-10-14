import { useCallback, useEffect, useRef, useState } from 'react'
import { NEXORA_INTRO, NEXORA_INTRO_SCENES } from '../../lib/nexoraIntroData.js'
import './nexoraIntroPlayer.css'

/**
 * Looping, auto-starting intro player with a custom control row: a play/pause
 * button wrapped in a progress ring, the current chapter, and a segmented
 * timeline (one segment per chapter, click to jump). The video is muted so
 * browsers allow autoplay; it plays only while on screen and starts paused for
 * visitors who prefer reduced motion. Progress is written straight to the DOM
 * from requestAnimationFrame, so playback does not re-render React every frame.
 */
const RING = 2 * Math.PI * 21
const DURATION = NEXORA_INTRO.duration
const chapterAt = (t) => {
  const i = NEXORA_INTRO_SCENES.findIndex((sc) => t >= sc.start && t < sc.end)
  return i === -1 ? NEXORA_INTRO_SCENES.length - 1 : i
}
const mmss = (t) => `0:${String(Math.min(DURATION, Math.floor(t))).padStart(2, '0')}`

export default function NexoraIntroPlayer() {
  const video = useRef(null)
  const frame = useRef(0)
  const ring = useRef(null)
  const fills = useRef([])
  const inView = useRef(false)
  const userPaused = useRef(false)
  const [playing, setPlaying] = useState(false)
  const [chapter, setChapter] = useState(0)
  const [second, setSecond] = useState(0)
  const [pressed, setPressed] = useState(0)

  const paint = useCallback(() => {
    const v = video.current
    if (!v) return
    const t = v.currentTime || 0
    if (ring.current) ring.current.style.strokeDashoffset = String(RING * (1 - Math.min(1, t / DURATION)))
    NEXORA_INTRO_SCENES.forEach((sc, i) => {
      const el = fills.current[i]
      if (el) el.style.transform = `scaleX(${Math.min(1, Math.max(0, (t - sc.start) / (sc.end - sc.start)))})`
    })
    setChapter((c) => { const n = chapterAt(t); return c === n ? c : n })
    setSecond((s) => { const n = Math.floor(t); return s === n ? s : n })
  }, [])

  useEffect(() => {
    if (!playing) return undefined
    const tick = () => { paint(); frame.current = requestAnimationFrame(tick) }
    frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
  }, [playing, paint])

  const play = useCallback(() => { video.current?.play().catch(() => setPlaying(false)) }, [])

  useEffect(() => {
    const v = video.current
    if (!v) return undefined
    v.muted = true
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) userPaused.current = true
    const onPlay = () => setPlaying(true)
    const onPause = () => { setPlaying(false); paint() }
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    let io
    if (typeof IntersectionObserver === 'function') {
      io = new IntersectionObserver(([entry]) => {
        inView.current = entry.isIntersecting
        if (entry.isIntersecting && !userPaused.current) play()
        else if (!entry.isIntersecting) v.pause()
      }, { threshold: 0.35 })
      io.observe(v)
    }
    return () => { v.removeEventListener('play', onPlay); v.removeEventListener('pause', onPause); io?.disconnect() }
  }, [play, paint])

  const toggle = useCallback(() => {
    const v = video.current
    if (!v) return
    setPressed((n) => n + 1)
    if (v.paused) { userPaused.current = false; play() } else { userPaused.current = true; v.pause() }
  }, [play])

  const seek = useCallback((i) => {
    const v = video.current
    if (!v) return
    v.currentTime = NEXORA_INTRO_SCENES[i].start + 0.05
    paint()
    if (v.paused && !userPaused.current) play()
  }, [paint, play])

  const sc = NEXORA_INTRO_SCENES[chapter]
  return (
    <div className="nx-player">
      <div className="nx-player__stage" onClick={toggle}>
        <video
          ref={video}
          className="block h-auto w-full"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={NEXORA_INTRO.startFrame}
          width={NEXORA_INTRO.width}
          height={NEXORA_INTRO.height}
          aria-label="Nexora Solution product tour, 72 seconds, no audio, plays on a loop"
        >
          <source src={NEXORA_INTRO.mp4} type="video/mp4" />
        </video>
        <span aria-hidden="true" className={`nx-player__flash ${playing ? 'is-play' : 'is-pause'}`} key={pressed} data-on={pressed > 0 ? '1' : '0'}>
          {playing ? <PlayGlyph /> : <PauseGlyph />}
        </span>
      </div>
      <div className="nx-player__bar">
        <button type="button" onClick={toggle} className="nx-player__btn" aria-label={playing ? 'Pause the video' : 'Play the video'} aria-pressed={playing}>
          <svg viewBox="0 0 48 48" className="nx-player__ring" aria-hidden="true">
            <circle cx="24" cy="24" r="21" className="nx-player__ring-track" />
            <circle ref={ring} cx="24" cy="24" r="21" className="nx-player__ring-fill" strokeDasharray={RING} strokeDashoffset={RING} />
          </svg>
          <span className={`nx-player__icon ${playing ? 'is-hidden' : ''}`}><PlayGlyph /></span>
          <span className={`nx-player__icon ${playing ? '' : 'is-hidden'}`}><PauseGlyph /></span>
        </button>
        <div className="nx-player__meta">
          <p className="nx-player__label" key={sc.id}><span>{String(chapter + 1).padStart(2, '0')}</span>{sc.title}</p>
          <p className="nx-player__time" aria-hidden="true">{mmss(second)} / {mmss(DURATION)}</p>
        </div>
        <ol className="nx-player__timeline" aria-label="Chapters">
          {NEXORA_INTRO_SCENES.map((s, i) => (
            <li key={s.id} style={{ flexGrow: s.end - s.start }} className="nx-player__seg">
              <button type="button" onClick={() => seek(i)} aria-label={`Jump to ${s.title}`} aria-current={i === chapter ? 'true' : undefined}>
                <span className="nx-player__seg-track"><span ref={(el) => { fills.current[i] = el }} className="nx-player__seg-fill" /></span>
                <span className="nx-player__tip">{s.title}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

function PlayGlyph() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" fill="currentColor" /></svg> }
function PauseGlyph() { return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4.2" height="14" rx="1.4" fill="currentColor" /><rect x="13.8" y="5" width="4.2" height="14" rx="1.4" fill="currentColor" /></svg> }
