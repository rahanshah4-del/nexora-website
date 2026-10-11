// Runs non-essential startup work (Firebase auth for the header login state,
// analytics, the AI assistant's auth check) once the page has settled: after
// the window `load` event, at the visitor's first interaction or SETTLE_DELAY_MS
// later, whichever comes first, and then in an idle period.
//
// These used to wait only for `load` + idle. On a real phone connection that
// moment arrives before the page's largest text has painted, so Firebase's SDK
// (~200 KB), its auth iframe and Firestore's channels were downloaded on the
// critical path and PageSpeed charged them to LCP (mobile LCP ~8 s). Waiting for
// a first interaction keeps the work immediate for anyone using the page; a
// visitor who does nothing gets it a few seconds later. Nothing is skipped.
//
// Shared state: once the page has settled, later callers (route changes, other
// components) only wait for an idle period.

const SETTLE_DELAY_MS = 3500
const INTERACTION_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'scroll', 'wheel']

let settledPromise = null

function settle() {
  if (settledPromise) return settledPromise
  settledPromise = new Promise((resolve) => {
    let done = false
    let timerId = null
    const finish = () => {
      if (done) return
      done = true
      if (timerId !== null) window.clearTimeout(timerId)
      INTERACTION_EVENTS.forEach((type) => window.removeEventListener(type, finish, true))
      resolve()
    }
    INTERACTION_EVENTS.forEach((type) => window.addEventListener(type, finish, { capture: true, passive: true }))
    const startTimer = () => { timerId = window.setTimeout(finish, SETTLE_DELAY_MS) }
    if (document.readyState === 'complete') startTimer()
    else window.addEventListener('load', startTimer, { once: true })
  })
  return settledPromise
}

function whenIdle(callback) {
  if ('requestIdleCallback' in window) {
    const id = window.requestIdleCallback(callback, { timeout: 2000 })
    return () => window.cancelIdleCallback?.(id)
  }
  const id = window.setTimeout(callback, 1)
  return () => window.clearTimeout(id)
}

/**
 * Calls `callback` once the page has settled (see above). Returns a cancel
 * function for effect cleanups.
 */
export function whenPageSettled(callback) {
  if (typeof window === 'undefined') return () => {}
  let cancelled = false
  let cancelIdle = null
  settle().then(() => {
    if (!cancelled) cancelIdle = whenIdle(() => { if (!cancelled) callback() })
  })
  return () => {
    cancelled = true
    if (cancelIdle) cancelIdle()
  }
}

/** Promise form of whenPageSettled. */
export function pageSettled() {
  return new Promise((resolve) => { whenPageSettled(resolve) })
}
