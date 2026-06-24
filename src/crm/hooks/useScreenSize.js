import { useEffect, useMemo, useState } from 'react'

const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  laptop: 1024,
  desktop: 1440,
  largeDesktop: 1920,
}

function resolveScreenSize(width = 0) {
  if (width >= BREAKPOINTS.largeDesktop) return 'largeDesktop'
  if (width >= BREAKPOINTS.desktop) return 'desktop'
  if (width >= BREAKPOINTS.laptop) return 'laptop'
  if (width >= BREAKPOINTS.tablet) return 'tablet'
  return 'mobile'
}

export default function useScreenSize() {
  const getSnapshot = () => ({
    width: typeof window === 'undefined' ? 0 : window.innerWidth,
    height: typeof window === 'undefined' ? 0 : window.innerHeight,
  })

  const [size, setSize] = useState(getSnapshot)

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const update = () => setSize(getSnapshot())
    update()
    window.addEventListener('resize', update, { passive: true })
    window.addEventListener('orientationchange', update, { passive: true })
    window.visualViewport?.addEventListener('resize', update, { passive: true })
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
      window.visualViewport?.removeEventListener('resize', update)
    }
  }, [])

  return useMemo(
    () => ({
      ...size,
      breakpoint: resolveScreenSize(size.width),
      isMobile: size.width < BREAKPOINTS.tablet,
      isTablet: size.width >= BREAKPOINTS.tablet && size.width < BREAKPOINTS.laptop,
      isLaptop: size.width >= BREAKPOINTS.laptop && size.width < BREAKPOINTS.desktop,
      isDesktop: size.width >= BREAKPOINTS.desktop,
      isLargeDesktop: size.width >= BREAKPOINTS.largeDesktop,
      breakpoints: BREAKPOINTS,
    }),
    [size],
  )
}
