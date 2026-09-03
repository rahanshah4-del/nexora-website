// A handful of Firestore-backed actions (invoice/customer creation, etc.)
// only guard against their promise *rejecting* — a genuinely stuck call
// (no response, no rejection) leaves the caller awaiting forever, which
// shows up as a save button or modal stuck indefinitely with no feedback.
// Race the real work against a timeout so callers always get a result.
export function withTimeout(promise, { ms = 25000, message = 'This is taking longer than expected. Please check your connection and try again.' } = {}) {
  return Promise.race([
    promise,
    new Promise((resolve) => {
      window.setTimeout(() => resolve({ ok: false, error: message }), ms)
    }),
  ])
}
