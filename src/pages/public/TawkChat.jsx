import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

const TAWK_SCRIPT_ID = 'nexora-tawk-to-widget'
const TAWK_PROPERTY_ID = import.meta.env.VITE_TAWK_TO_PROPERTY_ID || '6a21bb86204aec1c2e8c2b59'
const TAWK_WIDGET_ID = import.meta.env.VITE_TAWK_TO_WIDGET_ID || '1jq9s92p1'
const PUBLIC_PATHS = new Set(['/', '/pricing', '/industries', '/contact', '/about'])
const BLOCKED_PATHS = new Set(['/login', '/signup', '/verify-email', '/workspace'])
const BLOCKED_PREFIXES = ['/app', '/admin']

function canLoadTawk(pathname) {
  if (!TAWK_PROPERTY_ID) return false
  if (BLOCKED_PATHS.has(pathname)) return false
  if (BLOCKED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return false
  return PUBLIC_PATHS.has(pathname) || pathname.startsWith('/solutions/')
}

function removeTawkWidget() {
  if (typeof document === 'undefined') return
  document.getElementById(TAWK_SCRIPT_ID)?.remove()

  document
    .querySelectorAll('iframe[src*="tawk.to"], iframe[src*="tawk.link"], [id*="tawk"], [class*="tawk"]')
    .forEach((element) => {
      if (element.id === TAWK_SCRIPT_ID) return
      element.remove()
    })
}

export default function TawkChat() {
  const { pathname } = useLocation()
  const shouldLoad = canLoadTawk(pathname)
  const loadTimerRef = useRef(null)

  useEffect(() => {
    console.log('[Tawk] config', {
      pathname,
      propertyId: TAWK_PROPERTY_ID,
      widgetId: TAWK_WIDGET_ID,
      shouldLoad,
    })
  }, [pathname, shouldLoad])

  useEffect(() => {
    if (!shouldLoad) {
      if (loadTimerRef.current) {
        window.clearTimeout(loadTimerRef.current)
        loadTimerRef.current = null
      }
      window.Tawk_API?.hideWidget?.()
      removeTawkWidget()
      return undefined
    }

    window.Tawk_API = window.Tawk_API || {}
    window.Tawk_LoadStart = new Date()

    if (!document.getElementById(TAWK_SCRIPT_ID)) {
      const deferFn = typeof window.requestIdleCallback === 'function'
        ? (fn) => window.requestIdleCallback(fn, { timeout: 3000 })
        : (fn) => window.setTimeout(fn, 1)
      const targetPathname = pathname
      // Store the defer handle for cleanup
      const deferredId = deferFn(() => {
        loadTimerRef.current = null
        if (!canLoadTawk(targetPathname)) return
        if (document.getElementById(TAWK_SCRIPT_ID)) return
        const script = document.createElement('script')
        script.id = TAWK_SCRIPT_ID
        script.async = true
        script.src = `https://embed.tawk.to/${TAWK_PROPERTY_ID}/${TAWK_WIDGET_ID}`
        script.charset = 'UTF-8'
        script.setAttribute('crossorigin', '*')
        document.body.appendChild(script)
        console.log('[Tawk] script injected', { src: script.src })
      })
      // requestIdleCallback returns an id (possibly undefined for setTimeout)
      if (typeof deferredId === 'number') loadTimerRef.current = deferredId
    }

    return () => {
      if (loadTimerRef.current) {
        window.cancelIdleCallback?.(loadTimerRef.current) || window.clearTimeout(loadTimerRef.current)
        loadTimerRef.current = null
      }
      window.Tawk_API?.hideWidget?.()
      removeTawkWidget()
    }
  }, [shouldLoad, pathname])

  return null
}
