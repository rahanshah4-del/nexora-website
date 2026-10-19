import { useEffect } from 'react'

/**
 * The mobile login and signup screens are dark by design. Telling the browser so (color-scheme "dark")
 * stops phone browsers' automatic dark mode from re-inverting them (black sheets, faded gradient text,
 * grey logo tile). Applies only up to `maxWidth`; wider screens keep the normal light page.
 * The previous values are put back when the screen is left.
 */
export default function useMobileDarkScheme(maxWidth = 1023) {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const scheme = document.querySelector('meta[name="color-scheme"]')
    const themeColor = document.querySelector('meta[name="theme-color"]')
    const before = { scheme: scheme?.getAttribute('content'), color: themeColor?.getAttribute('content') }
    const query = window.matchMedia(`(max-width: ${maxWidth}px)`)
    const apply = () => {
      if (query.matches) {
        scheme?.setAttribute('content', 'dark')
        themeColor?.setAttribute('content', '#0b1226')
      } else {
        if (before.scheme != null) scheme?.setAttribute('content', before.scheme)
        if (before.color != null) themeColor?.setAttribute('content', before.color)
      }
    }
    apply()
    query.addEventListener?.('change', apply)
    return () => {
      query.removeEventListener?.('change', apply)
      if (before.scheme != null) scheme?.setAttribute('content', before.scheme)
      if (before.color != null) themeColor?.setAttribute('content', before.color)
    }
  }, [maxWidth])
}
