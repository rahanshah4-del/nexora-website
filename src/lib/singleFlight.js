/**
 * Module-level single-flight lock for async UI handlers.
 *
 * runOnce(key, fn, event) runs fn unless a call with the same key is still in
 * flight; a blocked call returns undefined and, if the first handler argument was
 * a DOM/React event, calls preventDefault() so a blocked <form> submit does not
 * fall through to a native page submit. The key includes a primitive id argument,
 * so acting on row A and then row B straight away is still allowed.
 */
const inFlight = new Set()

export function flightKey(name, args = []) {
  const first = args[0]
  const id = typeof first === 'string' || typeof first === 'number' ? `:${first}` : ''
  return `${name}${id}`
}

export function isInFlight(key) {
  return inFlight.has(key)
}

export async function runOnce(key, fn, event) {
  if (inFlight.has(key)) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault()
    return undefined
  }
  inFlight.add(key)
  try {
    return await fn()
  } finally {
    inFlight.delete(key)
  }
}
