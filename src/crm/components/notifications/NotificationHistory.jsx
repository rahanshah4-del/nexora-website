import { useMemo, useState } from 'react'
import Button from '../ui/Button.jsx'
import Badge from '../ui/Badge.jsx'
import Card from '../ui/Card.jsx'
import NotificationItem from './NotificationItem.jsx'

export default function NotificationHistory({ enabled, api }) {
  const [tab, setTab] = useState('all')

  const filtered = useMemo(() => {
    if (tab === 'unread') return api.items.filter((n) => !n.read)
    return api.items
  }, [api.items, tab])

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Notification History</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Live alerts with read and unread tracking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!enabled ? <Badge variant="warning">Notifications Off</Badge> : null}
          <Badge variant={api.source === 'firestore' ? 'success' : 'default'}>
            {api.loading ? 'Loading…' : api.source === 'firestore' ? 'Live Sync' : 'No data yet'}
          </Badge>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button
            variant={tab === 'all' ? 'subtle' : 'ghost'}
            className="rounded-2xl"
            onClick={() => setTab('all')}
            type="button"
          >
            All
          </Button>
          <Button
            variant={tab === 'unread' ? 'subtle' : 'ghost'}
            className="rounded-2xl"
            onClick={() => setTab('unread')}
            type="button"
          >
            Unread
            {enabled && api.unreadCount ? (
              <span className="ml-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-fuchsia-500 px-1 text-[11px] font-semibold text-white">
                {api.unreadCount}
              </span>
            ) : null}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="subtle"
            className="rounded-2xl"
            disabled={!enabled || !api.items.length}
            onClick={() => api.markAllRead()}
            type="button"
          >
            Mark all read
          </Button>
          <Button
            variant="ghost"
            className="rounded-2xl"
            disabled={!enabled || !api.items.length}
            onClick={() => api.clearAll()}
            type="button"
          >
            Clear
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-1">
        {api.loading ? (
          <div className="rounded-2xl px-3 py-10 text-center text-sm text-slate-600 dark:text-slate-300">Loading…</div>
        ) : filtered.length ? (
          filtered.map((n) => (
            <NotificationItem key={n.id} item={n} disabled={!enabled} onClick={() => api.markAsRead(n.id)} />
          ))
        ) : (
          <div className="rounded-2xl px-3 py-10 text-center text-sm text-slate-600 dark:text-slate-300">
            {tab === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}
          </div>
        )}
      </div>
    </Card>
  )
}
