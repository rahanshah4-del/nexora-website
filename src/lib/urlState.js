/** Keep "where am I" in the address bar (?tab=...&section=...) so a refresh opens the same page. */

/** New query string with `name` set, or removed when it equals the default. Pure. */
export function withParam(search, name, value, defaultValue = '') {
  const params = new URLSearchParams(search || '')
  if (!value || value === defaultValue) params.delete(name)
  else params.set(name, value)
  const text = params.toString()
  return text ? `?${text}` : ''
}

/** The value of ?name= if it is one of `allowed`, else the fallback. Pure. */
export function readParam(search, name, allowed, fallback) {
  const value = new URLSearchParams(search || '').get(name)
  return value && allowed.includes(value) ? value : fallback
}

export function readUrlParam(name, allowed, fallback) {
  if (typeof window === 'undefined') return fallback
  return readParam(window.location.search, name, allowed, fallback)
}

export function writeUrlParam(name, value, defaultValue = '') {
  if (typeof window === 'undefined') return
  try {
    const next = withParam(window.location.search, name, value, defaultValue)
    if (next === window.location.search) return
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${next}${window.location.hash}`)
  } catch { /* the address bar is a convenience only */ }
}
