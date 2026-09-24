import { useCallback, useSyncExternalStore } from 'react'

/* Light / dark theme for the public marketing website only.
   The dark palette lives in src/styles/public-dark.css and is scoped to
   `html.public-dark.public-website` — `public-website` is only present while
   a marketing page (App.jsx / PublicPageShell.jsx) is mounted, so the CRM,
   POS, admin and auth screens are never affected. The inline script in
   index.html applies the same class before first paint to avoid a flash. */

export const PUBLIC_THEME_STORAGE_KEY = 'nexora-public-theme'
const DARK_CLASS = 'public-dark'
const THEME_COLORS = { light: '#0ea5e9', dark: '#121826' }

const listeners = new Set()
let memoryTheme = null // fallback when localStorage is blocked

function readStoredTheme() {
  try {
    const value = window.localStorage.getItem(PUBLIC_THEME_STORAGE_KEY)
    return value === 'dark' || value === 'light' ? value : null
  } catch {
    return null
  }
}

function systemPrefersDark() {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}

export function getPublicTheme() {
  if (typeof window === 'undefined') return 'light'
  return readStoredTheme() || memoryTheme || (systemPrefersDark() ? 'dark' : 'light')
}

function applyThemeClass(theme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.classList.toggle(DARK_CLASS, theme === 'dark')
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', THEME_COLORS[theme] || THEME_COLORS.light)
}

function notify() {
  const theme = getPublicTheme()
  applyThemeClass(theme)
  listeners.forEach((listener) => listener(theme))
}

let systemListenerBound = false
function bindSystemListener() {
  if (systemListenerBound || typeof window === 'undefined' || !window.matchMedia) return
  systemListenerBound = true
  const query = window.matchMedia('(prefers-color-scheme: dark)')
  const onChange = () => {
    if (!readStoredTheme() && !memoryTheme) notify()
  }
  if (query.addEventListener) query.addEventListener('change', onChange)
  else query.addListener?.(onChange)
  window.addEventListener('storage', (event) => {
    if (event.key === PUBLIC_THEME_STORAGE_KEY) notify()
  })
}

/* Called by the public page shells on mount. Returns a cleanup that removes
   the dark class again when leaving the public site (e.g. into /app). */
export function mountPublicTheme() {
  bindSystemListener()
  applyThemeClass(getPublicTheme())
  return () => {
    if (typeof document === 'undefined') return
    document.documentElement.classList.remove(DARK_CLASS)
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', THEME_COLORS.light)
  }
}

export function setPublicTheme(theme) {
  const next = theme === 'dark' ? 'dark' : 'light'
  memoryTheme = next
  try {
    window.localStorage.setItem(PUBLIC_THEME_STORAGE_KEY, next)
  } catch {
    /* storage blocked — memoryTheme keeps the choice for this visit */
  }
  applyThemeClass(next)
  listeners.forEach((listener) => listener(next))
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function usePublicTheme() {
  const theme = useSyncExternalStore(subscribe, getPublicTheme, () => 'light')
  const toggleTheme = useCallback(() => {
    setPublicTheme(getPublicTheme() === 'dark' ? 'light' : 'dark')
  }, [])
  return { theme, toggleTheme }
}
