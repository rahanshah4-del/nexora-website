import { useEffect, useRef, useState } from 'react'
import './ConnectionStatus.css'

/**
 * Site-wide internet connection banner.
 * - Goes offline: an amber banner slides in at the top with a pulsing "searching" animation and stays until the
 *   connection returns.
 * - Comes back: it turns green ("Back online"), a `nexora:online` event is fired on window so any tool
 *   (Temp Mail polling, GeoLint audit/report) can resume, and the banner hides itself after a few seconds.
 * Safe for prerender: it renders nothing on the server and until the browser reports a change.
 */

const WifiOffIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 2l20 20" />
    <path d="M8.5 16.4a5 5 0 0 1 7 0" />
    <path d="M5 12.9a10 10 0 0 1 5.2-2.7" />
    <path d="M13.8 10.2A10 10 0 0 1 19 12.9" />
    <path d="M2 8.8a15 15 0 0 1 4.2-2.6" />
    <path d="M10 5.1A15 15 0 0 1 22 8.8" />
    <path d="M12 20h.01" />
  </svg>
)

const WifiOnIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.9a10 10 0 0 1 14 0" />
    <path d="M2 8.8a15 15 0 0 1 20 0" />
    <path d="M8.5 16.4a5 5 0 0 1 7 0" />
    <path d="M12 20h.01" />
  </svg>
)

export default function ConnectionStatus() {
  // 'hidden' | 'offline' | 'online'
  const [state, setState] = useState('hidden')
  const wasOffline = useRef(false)
  const hideTimer = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const goOffline = () => {
      clearTimeout(hideTimer.current)
      wasOffline.current = true
      setState('offline')
    }

    const goOnline = () => {
      if (!wasOffline.current) return
      wasOffline.current = false
      setState('online')
      try { window.dispatchEvent(new CustomEvent('nexora:online')) } catch { /* old browsers */ }
      clearTimeout(hideTimer.current)
      hideTimer.current = setTimeout(() => setState('hidden'), 3500)
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) goOffline()

    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
      clearTimeout(hideTimer.current)
    }
  }, [])

  if (state === 'hidden') return null

  const offline = state === 'offline'
  return (
    <div className="nx-conn-wrap" role="status" aria-live="polite">
      <div className={`nx-conn ${offline ? 'nx-conn--off' : 'nx-conn--on'}`}>
        <span className="nx-conn__icon">
          {offline ? <WifiOffIcon /> : <WifiOnIcon />}
          {offline ? <span className="nx-conn__pulse" aria-hidden="true" /> : null}
        </span>
        <span className="nx-conn__text">
          {offline ? (
            <>
              <strong>You are offline</strong>
              <span> · Check your internet connection. Reconnecting automatically…</span>
            </>
          ) : (
            <>
              <strong>Back online</strong>
              <span> · Connection restored. Everything is working again.</span>
            </>
          )}
        </span>
        {offline ? <span className="nx-conn__dots" aria-hidden="true"><i /><i /><i /></span> : null}
      </div>
    </div>
  )
}
