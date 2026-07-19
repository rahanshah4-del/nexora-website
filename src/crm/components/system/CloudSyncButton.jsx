import { useEffect, useState } from 'react'
import { HiOutlineCloud } from 'react-icons/hi2'

export default function CloudSyncButton() {
  const [online, setOnline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState(null)

  useEffect(() => {
    const onUp = () => { setOnline(true); setLastSync(Date.now()) }
    const onDown = () => setOnline(false)
    window.addEventListener('online', onUp)
    window.addEventListener('offline', onDown)
    const onStart = () => setSyncing(true)
    const onDone = () => { setSyncing(false); setLastSync(Date.now()) }
    window.addEventListener('nexora:sync:start', onStart)
    window.addEventListener('nexora:sync:done', onDone)
    return () => {
      window.removeEventListener('online', onUp)
      window.removeEventListener('offline', onDown)
      window.removeEventListener('nexora:sync:start', onStart)
      window.removeEventListener('nexora:sync:done', onDone)
    }
  }, [])

  const status = !online ? 'offline' : syncing ? 'syncing' : 'synced'
  const config = {
    synced:  { bg: 'bg-emerald-50/80', border: 'border-emerald-200/60', text: 'text-emerald-700', dot: 'bg-emerald-400', label: 'Synced', pulse: 'animate-pulse' },
    syncing: { bg: 'bg-sky-50/80',     border: 'border-sky-200/60',     text: 'text-sky-700',     dot: 'bg-sky-400',     label: 'Syncing…', spin: 'animate-spin' },
    offline: { bg: 'bg-amber-50/80',    border: 'border-amber-200/60',   text: 'text-amber-700',   dot: 'bg-amber-400',   label: 'Offline', pulse: 'animate-pulse' },
  }[status]

  return (
    <div
      className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-xs font-bold shadow-sm backdrop-blur-sm transition-all duration-300 ${config.bg} ${config.border} ${config.text}`}
      title={online ? (syncing ? 'Syncing…' : `Synced${lastSync ? ` · ${new Date(lastSync).toLocaleTimeString()}` : ''}`) : 'No internet'}
    >
      <HiOutlineCloud className={`h-4 w-4 ${config.spin || ''}`} />
      <span className="hidden sm:inline">{config.label}</span>
      <span className={`inline-flex h-2 w-2 rounded-full ${config.dot} ${config.pulse || ''}`} />
    </div>
  )
}
