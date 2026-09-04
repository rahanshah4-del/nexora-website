// A handful of Firestore-backed actions (invoice/customer creation, etc.)
// only guard against their promise *rejecting* — a genuinely stuck call
// (no response, no rejection) leaves the caller awaiting forever, which
// shows up as a save button or modal stuck indefinitely with no feedback.
// Race the real work against a timeout so callers always get a result.
//
// The underlying write is never cancelled when the timeout wins — it can
// still succeed moments later even though the caller already saw a
// failure. Pass `onLateResolve(result, error)` to be notified when that
// happens, so the UI can correct a false "failed" message instead of
// leaving the user thinking the save was lost (and possibly retrying it).
export function withTimeout(promise, { ms = 25000, message = 'This is taking longer than expected. Please check your connection and try again.', onLateResolve } = {}) {
  let settled = false
  const trackedPromise = promise.then(
    (result) => {
      settled = true
      return result
    },
    (error) => {
      settled = true
      throw error
    },
  )
  return Promise.race([
    trackedPromise,
    new Promise((resolve) => {
      window.setTimeout(() => {
        if (settled) return
        resolve({ ok: false, error: message, timedOut: true })
        if (onLateResolve) {
          trackedPromise.then(
            (result) => onLateResolve(result, null),
            (error) => onLateResolve(null, error),
          )
        }
      }, ms)
    }),
  ])
}
