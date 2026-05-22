import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import NotificationItem from './NotificationItem.jsx'

function Toast({ tone = 'success', message, onClose }) {
  const toneClasses =
    tone === 'error'
      ? 'border-rose-500/20 bg-rose-500/10 text-rose-800 dark:text-rose-200'
      : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
  return (
    <div className={`glass fixed right-4 top-4 z-[60] w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl border p-3 ${toneClasses}`}>
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

export default function NotificationDropdown({ notificationsEnabled, api, onClose }) {
  const navigate = useNavigate()
  const [toast, setToast] = useState(null)

  const headerBadge = useMemo(() => {
    if (!notificationsEnabled) return <Badge variant="warning">Off</Badge>
    return <Badge variant={api.unreadCount ? 'purple' : 'default'}>{api.unreadCount} new</Badge>
  }, [notificationsEnabled, api.unreadCount])

  return (
    <>
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}
      <div className="p-1">
        <div className="flex items-center justify-between px-2 py-2">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</p>
          {headerBadge}
        </div>

        <div className="max-h-72 space-y-1 overflow-auto p-1">
          {api.loading ? (
            <div className="rounded-2xl px-3 py-8 text-center text-sm text-slate-600 dark:text-slate-300">Loading…</div>
          ) : api.items.length ? (
            api.items.map((n) => (
              <NotificationItem
                key={n.id}
                item={n}
                disabled={!notificationsEnabled}
                onClick={async () => {
                  try {
                    await api.markAsRead(n.id)
                    api.markDropdownSeen()
                    onClose?.()
                  } catch (e) {
                    setToast({ tone: 'error', message: e?.message || 'Failed to update notification' })
                    window.setTimeout(() => setToast(null), 2200)
                  }
                }}
              />
            ))
          ) : (
            <div className="rounded-2xl px-3 py-8 text-center text-sm text-slate-600 dark:text-slate-300">
              No notifications yet.
            </div>
          )}
        </div>

        <div className="mt-1 grid gap-2 px-2 pb-2 sm:grid-cols-2">
          <Button
            variant="subtle"
            className="w-full rounded-2xl"
            onClick={async () => {
              try {
                await api.markAllRead()
                api.markDropdownSeen()
                setToast({ tone: 'success', message: 'All notifications marked as read' })
                window.setTimeout(() => setToast(null), 1500)
              } catch (e) {
                setToast({ tone: 'error', message: e?.message || 'Failed to mark all read' })
                window.setTimeout(() => setToast(null), 2200)
              }
            }}
            disabled={!notificationsEnabled || !api.items.length}
            type="button"
          >
            Mark all read
          </Button>
          <Button
            variant="ghost"
            className="w-full rounded-2xl"
            onClick={() => {
              onClose?.()
              navigate('/app/notifications')
            }}
            type="button"
          >
            View all
          </Button>
          <Button
            variant="ghost"
            className="w-full rounded-2xl sm:col-span-2"
            onClick={async () => {
              try {
                await api.clearAll()
                api.markDropdownSeen()
                setToast({ tone: 'success', message: 'Notifications cleared' })
                window.setTimeout(() => setToast(null), 1500)
                onClose?.()
              } catch (e) {
                setToast({ tone: 'error', message: e?.message || 'Failed to clear notifications' })
                window.setTimeout(() => setToast(null), 2200)
              }
            }}
            disabled={!notificationsEnabled || !api.items.length}
            type="button"
          >
            Clear notifications
          </Button>
        </div>
      </div>
    </>
  )
}

