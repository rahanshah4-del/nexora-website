import { HiOutlineBell } from 'react-icons/hi2'
import { useEffect, useMemo, useRef, useState } from 'react'
import Dropdown from '../ui/Dropdown.jsx'
import NotificationDropdown from './NotificationDropdown.jsx'
import { useNotifications } from '../../hooks/useNotifications.js'

function Toast({ message, onClose }) {
  return (
    <div className="glass fixed right-4 top-4 z-[60] w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-3 text-indigo-900 dark:text-indigo-100">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold">{message}</p>
        <button
          type="button"
          className="focus-ring rounded-xl px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-white/40 dark:text-slate-100 dark:hover:bg-white/10"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  )
}

export default function NotificationBell({ enabled }) {
  const api = useNotifications()
  const [openTick, setOpenTick] = useState(0)
  const [toast, setToast] = useState(null)
  const lastToastIdRef = useRef(null)

  const unread = useMemo(() => (enabled ? api.unreadCount : 0), [enabled, api.unreadCount])

  useEffect(() => {
    if (!enabled) return
    if (api.loading) return
    const top = api.items[0]
    if (!top || top.read) return
    if (lastToastIdRef.current === top.id) return
    if (!api.hasNewSinceLastSeen()) return
    lastToastIdRef.current = top.id
    Promise.resolve().then(() => setToast(`New: ${top.title}`))
    window.setTimeout(() => setToast(null), 2200)
  }, [enabled, api])

  return (
    <>
      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}
      <Dropdown
        trigger={() => (
          <button
            type="button"
            className="focus-ring relative grid h-10 w-10 place-items-center rounded-2xl text-slate-700 hover:bg-slate-900/5 dark:text-slate-200 dark:hover:bg-white/10"
            aria-label="Notifications"
            title="Notifications"
          >
            <HiOutlineBell className="text-xl" />
            {unread > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-fuchsia-500 px-1 text-[11px] font-semibold text-white shadow">
                {unread}
              </span>
            ) : null}
          </button>
        )}
        align="right"
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            setOpenTick((n) => n + 1)
            api.markDropdownSeen()
          }
        }}
      >
        {({ close }) => (
          <NotificationDropdown
            key={openTick}
            notificationsEnabled={enabled}
            api={api}
            onClose={() => close()}
          />
        )}
      </Dropdown>
    </>
  )
}
