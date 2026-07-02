import { useEffect, useRef, useState } from 'react'
import Toast from './Toast.jsx'

export default function GlobalToast() {
  const [toast, setToast] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    function onToast(event) {
      const detail = event.detail || {}
      if (!detail.message) return
      window.clearTimeout(timerRef.current)
      setToast({
        tone: detail.tone || 'success',
        message: detail.message,
      })
      timerRef.current = window.setTimeout(() => setToast(null), Number(detail.timeout || 2600))
    }

    window.addEventListener('nexora:global-toast', onToast)
    return () => {
      window.removeEventListener('nexora:global-toast', onToast)
      window.clearTimeout(timerRef.current)
    }
  }, [])

  return toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null
}
