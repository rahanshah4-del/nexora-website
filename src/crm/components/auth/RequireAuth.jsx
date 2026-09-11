import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import PageLoader from '../ui/PageLoader.jsx'
import { useAuth } from '../../hooks/useAuth.js'

// Firebase's cross-tab auth-state sync can momentarily report a null user on
// an already-authenticated session when another tab initializes (see
// src/lib/firebase.js's setPersistence guard for the related, partial fix —
// that alone did not eliminate the flicker). A bare `if (!user) redirect`
// here bounces an active session to /login on every such flicker, sometimes
// getting stuck there until a manual reload.
//
// To stay resilient: once this component has seen a real, authenticated
// user, a *new* null reading opens a short grace period during which we keep
// rendering normally (no flash) instead of redirecting. If `user` recovers
// within that window, nothing happens. If it doesn't, we redirect once the
// window elapses. A genuinely fresh visit — one where this component never
// saw an authenticated user — still redirects immediately, exactly as
// before, since there is nothing to debounce there.
const FLICKER_GRACE_PERIOD_MS = 1200

export default function RequireAuth({ children }) {
  const { user, ready } = useAuth()
  const location = useLocation()

  const hasAuthenticatedRef = useRef(false) // has this instance ever seen a truthy user
  const wasAuthedLastRenderRef = useRef(false) // detects the truthy -> falsy transition synchronously
  const graceExpiredRef = useRef(false) // true once a flicker's grace period has run out with no recovery
  const graceTimeoutRef = useRef(null)
  const [, forceRerender] = useState(0)

  if (user) {
    // Authenticated (recovered, or always has been) — reset all grace
    // bookkeeping synchronously so this render never acts on a stale
    // "expired" flag left over from an earlier flicker.
    hasAuthenticatedRef.current = true
    wasAuthedLastRenderRef.current = true
    graceExpiredRef.current = false
    if (graceTimeoutRef.current) {
      window.clearTimeout(graceTimeoutRef.current)
      graceTimeoutRef.current = null
    }
  } else if (wasAuthedLastRenderRef.current) {
    // The exact render that first observes user go from truthy -> falsy.
    // Open the grace window synchronously, in the render body itself, so
    // THIS render already renders `children` instead of redirecting — an
    // effect-based flag would only take effect one render late, which is
    // exactly the missed-frame race that let the original bug through.
    wasAuthedLastRenderRef.current = false
    graceExpiredRef.current = false
  }

  useEffect(() => {
    if (!ready || user || !hasAuthenticatedRef.current || graceExpiredRef.current) return undefined
    if (graceTimeoutRef.current) return undefined // a grace timer is already running for this flicker

    graceTimeoutRef.current = window.setTimeout(() => {
      graceTimeoutRef.current = null
      graceExpiredRef.current = true
      forceRerender((n) => n + 1)
    }, FLICKER_GRACE_PERIOD_MS)

    return () => {
      if (graceTimeoutRef.current) {
        window.clearTimeout(graceTimeoutRef.current)
        graceTimeoutRef.current = null
      }
    }
  }, [ready, user])

  if (!ready) return <PageLoader stage="auth" />
  if (!user) {
    if (!hasAuthenticatedRef.current || graceExpiredRef.current) {
      return <Navigate to="/login" replace state={{ from: location.pathname }} />
    }
    return children // within the grace window — render normally, no flash
  }
  return children
}
