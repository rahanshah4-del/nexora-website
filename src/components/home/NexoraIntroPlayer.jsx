import { useEffect, useRef } from 'react'
import { NEXORA_INTRO } from '../../lib/nexoraIntroData.js'
import './nexoraIntroPlayer.css'

/**
 * Looping intro video with no controls at all, like a product demo: it starts by
 * itself (muted, so browsers allow autoplay) when it nears the screen. Nothing
 * is downloaded before that, so it never competes with the page's own load. The
 * chapter list under it, on the page, is what lets people jump to a product.
 * Visitors who prefer reduced motion get the poster and can click to play.
 * `intro` defaults to the homepage tour; the /tools/ tour passes its own.
 */
export default function NexoraIntroPlayer({ intro = NEXORA_INTRO }) {
  const video = useRef(null)
  const stage = useRef(null)
  const still = useRef(false)

  useEffect(() => {
    const v = video.current
    if (!v) return undefined
    v.muted = true
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      still.current = true
      stage.current?.classList.add('is-clickable')
    }
    let io
    if (typeof IntersectionObserver === 'function') {
      io = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting && !still.current) v.play().catch(() => {})
        else if (!entry.isIntersecting) v.pause()
      }, { threshold: 0.35, rootMargin: '150px 0px' })
      io.observe(v)
    }
    return () => io?.disconnect()
  }, [])

  const toggle = () => {
    const v = video.current
    if (!v || !still.current) return
    if (v.paused) v.play().catch(() => {})
    else v.pause()
  }

  return (
    <div className="nx-player">
      <div ref={stage} className="nx-player__stage" onClick={toggle}>
        <video
          ref={video}
          className="block h-auto w-full"
          muted
          loop
          playsInline
          preload="none"
          poster={intro.startFrame}
          width={intro.width}
          height={intro.height}
          aria-label={intro.label || 'Nexora Solution product tour, 72 seconds, no audio, plays on a loop'}
        >
          <source src={intro.mp4} type="video/mp4" />
        </video>
      </div>
    </div>
  )
}
