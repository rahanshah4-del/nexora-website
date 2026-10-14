import { useCallback, useEffect, useRef, useState } from 'react'
import { NEXORA_INTRO, NEXORA_INTRO_SCENES } from '../../lib/nexoraIntroData.js'
import './nexoraIntroPlayer.css'

/**
 * Looping, auto-starting intro player with no play or pause button. A slim bar
 * under the video shows the current chapter and a segmented timeline (one
 * segment per chapter, click to jump). The video is muted so browsers allow
 * autoplay and plays only while on screen. Visitors who prefer reduced motion
 * get the poster and can click the video to play it. Progress is written straight to the DOM
 * from requestAnimationFrame, so playback does not re-render React every frame.
 */
const chapterAt = (scenes, t) => {
  const i = scenes.findIndex((sc) => t >= sc.start && t < sc.end)
  return i === -1 ? scenes.length - 1 : i
}
const mmss = (t, duration) => { const n = Math.min(duration, Math.floor(t)); return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}` }

/** `intro` and `scenes` default to the homepage tour; the /tools/ tour passes its own. */
export default function NexoraIntroPlayer({ intro = NEXORA_INTRO, scenes = NEXORA_INTRO_SCENES }) {
  const DURATION = intro.duration
  const SCENES = scenes
  const video = useRef(null)
  const frame = useRef(0)
  const fills = useRef([])
  const inView = useRef(false)
  const userPaused = useRef(false)
  const reduced = useRef(false)
  const stage = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [chapter, setChapter] = useState(0)
  const [second, setSecond] = useState(0)

  const paint = useCallback(() => {
    const v = video.current
    if (!v) return
    const t = v.currentTime || 0
    SCENES.forEach((sc, i) => {
      const el = fills.current[i]
      if (el) el.style.transform = `scaleX(${Math.min(1, Math.max(0, (t - sc.start) / (sc.end - sc.start)))})`
    })
    setChapter((c) => { const n = chapterAt(SCENES, t); return c === n ? c : n })
    setSecond((s) => { const n = Math.floor(t); return s === n ? s : n })
  }, [SCENES])

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
    if (reduce) { userPaused.current = true; reduced.current = true; stage.current?.classList.add('is-clickable') }
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
    if (!v || !reduced.current) return
    if (v.paused) { userPaused.current = false; play() } else { userPaused.current = true; v.pause() }
  }, [play])

  const seek = useCallback((i) => {
    const v = video.current
    if (!v) return
    v.currentTime = SCENES[i].start + 0.05
    paint()
    if (v.paused && !userPaused.current) play()
  }, [SCENES, paint, play])

  const sc = SCENES[chapter]
  return (
    <div className="nx-player">
      <div ref={stage} className="nx-player__stage" onClick={toggle}>
        <video
          ref={video}
          className="block h-auto w-full"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={intro.startFrame}
          width={intro.width}
          height={intro.height}
          aria-label={intro.label || 'Nexora Solution product tour, 72 seconds, no audio, plays on a loop'}
        >
          <source src={intro.mp4} type="video/mp4" />
        </video>
      </div>
      <div className="nx-player__bar">
        <div className="nx-player__meta">
          <p className="nx-player__label" key={sc.id}><span>{String(chapter + 1).padStart(2, '0')}</span>{sc.title}</p>
          <p className="nx-player__time" aria-hidden="true">{mmss(second, DURATION)} / {mmss(DURATION, DURATION)}</p>
        </div>
        <ol className="nx-player__timeline" aria-label="Chapters">
          {SCENES.map((s, i) => (
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

