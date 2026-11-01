import { useEffect, useState } from 'react'
import './ConnectionStatus.css'

/**
 * Calm "warming up" pill shown while the GeoLint engine starts from idle (see fetchWithWarmup in lib/geolint.js,
 * which fires `geolint:warming` with { active } while it retries). It replaces the scary "could not be reached"
 * error for the first 10-20 seconds; the real error only appears if every retry fails.
 * Safe for prerender: renders nothing on the server and until the first event.
 */
export default function GeoLintWarmupNotice() {
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const onWarming = (event) => setActive(Boolean(event?.detail?.active))
    window.addEventListener('geolint:warming', onWarming)
    return () => window.removeEventListener('geolint:warming', onWarming)
  }, [])

  if (!active) return null

  return (
    <div className="nx-conn-wrap" role="status" aria-live="polite">
      <div className="nx-conn nx-conn--warm">
        <span className="nx-conn__text">
          <strong>Warming up the audit service</strong>
          <span> · One moment, this takes a few seconds the first time. Retrying automatically…</span>
        </span>
        <span className="nx-conn__dots" aria-hidden="true"><i /><i /><i /></span>
      </div>
    </div>
  )
}
