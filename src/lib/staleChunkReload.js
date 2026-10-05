/**
 * After a deploy, a tab opened before it still references the old hashed
 * chunks (e.g. ToolsHubPage-<oldhash>.js). Opening a lazy page then fails with
 * "Failed to fetch dynamically imported module". The fix is a single reload,
 * which loads the new HTML and chunk names. Guarded so a real outage can never
 * cause a reload loop: at most one automatic reload per minute per tab.
 */
const KEY = 'nexoraChunkReloadAt'
const STALE_CHUNK = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i

export function isStaleChunkError(error) {
  return STALE_CHUNK.test(String(error?.message || error || ''))
}

/** Reloads once if allowed; returns true when a reload was started. */
export function reloadForStaleChunk() {
  if (typeof window === 'undefined') return false
  let last
  try {
    last = Number(window.sessionStorage.getItem(KEY) || 0)
  } catch {
    last = 0
  }
  if (Date.now() - last < 60000) return false
  try {
    window.sessionStorage.setItem(KEY, String(Date.now()))
  } catch {
    // Storage blocked: still reload once; the next failure shows the error page.
  }
  window.location.reload()
  return true
}

export function installStaleChunkReload() {
  if (typeof window === 'undefined') return
  // Vite fires this when a dynamic import's preload fails.
  window.addEventListener('vite:preloadError', (event) => {
    if (reloadForStaleChunk()) event.preventDefault()
  })
}
