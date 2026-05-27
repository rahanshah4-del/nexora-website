import { useEffect, useState } from 'react'
import Badge from '../ui/Badge.jsx'

export default function OfflineStatus() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))

  useEffect(() => {
    function onUp() {
      setOnline(true)
    }
    function onDown() {
      setOnline(false)
    }
    window.addEventListener('online', onUp)
    window.addEventListener('offline', onDown)
    return () => {
      window.removeEventListener('online', onUp)
      window.removeEventListener('offline', onDown)
    }
  }, [])

  return <Badge variant={online ? 'success' : 'warning'}>{online ? 'Live Sync' : 'Sync paused'}</Badge>
}
