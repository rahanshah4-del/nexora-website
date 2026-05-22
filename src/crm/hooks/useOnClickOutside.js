import { useEffect } from 'react'

export function useOnClickOutside(ref, handler) {
  useEffect(() => {
    function onPointerDown(event) {
      const el = ref?.current
      if (!el || el.contains(event.target)) return
      handler?.(event)
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [ref, handler])
}

