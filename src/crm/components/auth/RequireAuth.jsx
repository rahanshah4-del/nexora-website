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
// within that window, nothing happens.
//
// Live testing showed the grace period alone is not enough: in the observed
// flicker, onAuthStateChanged never re-fires with a valid user in that tab's
// lifetime — only a full page reload reliably re-resolves the session from
// persisted storage. So when the grace period expires and the tab HAD
// previously been authenticated, we do a hard window.location.reload()
// instead of an in-SPA <Navigate to="/login"> — a reload-loop guard (a
// short-lived sessionStorage timestamp) prevents this from reloading
// repeatedly against a genuinely dead/expired session, falling back to the
// normal redirect in that case. A genuinely fresh visit — one where this
// component never saw an authenticated user — still redirects immediately,
// exactly as before, since there is nothing to debounce or reload for.
const FLICKER_GRACE_PERIOD_MS = 1200
const RELOAD_COOLDOWN_MS = 10000
const RELOAD_GUARD_KEY = 'nexora:authFlickerReloadAt'

function readLastSelfReloadAt() {
  try {
    return Number(window.sessionStorage.getItem(RELOAD_GUARD_KEY)) || 0
  } catch {
    return 0
  }
}

function markSelfReload() {
  try {
    window.sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()))
  } catch {
    // sessionStorage unavailable (e.g. private mode edge case) — the reload
    // below still happens; only the loop guard's memory is lost, which just
    // means a following genuine-logout case falls through to /login on its
    // second attempt instead of being caught by the cooldown on the first.
  }
}

function clearSelfReloadGuard() {
  try {
    window.sessionStorage.removeItem(RELOAD_GUARD_KEY)
  } catch {
    // Nothing to clean up if storage isn't available.
  }
}

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
    // A successful authenticated render — whether this tab never had a
    // problem or just recovered from a flicker/self-triggered reload —
    // clears the reload-loop guard so a later, unrelated flicker still gets
    // its own fresh reload attempt instead of being blocked by an old
    // cooldown from an incident that's already resolved.
    clearSelfReloadGuard()
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

      const lastSelfReloadAt = readLastSelfReloadAt()
      const withinCooldown = lastSelfReloadAt > 0 && Date.now() - lastSelfReloadAt < RELOAD_COOLDOWN_MS

      if (!withinCooldown) {
        // First time hitting a stuck-null expiry (or the last self-triggered
        // reload was long enough ago to no longer count) — a hard reload has
        // been empirically confirmed to correctly re-resolve the session
        // from persisted storage in this exact flicker, whereas an in-SPA
        // navigation to /login does not recover on its own.
        markSelfReload()
        window.location.reload()
        return
      }

      // We already tried a self-triggered reload within the last
      // RELOAD_COOLDOWN_MS and are back here again with still no user —
      // this is a genuinely dead/expired session, not a flicker. Don't
      // reload again; fall through to the normal /login redirect.
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
