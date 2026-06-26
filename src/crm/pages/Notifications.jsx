import { motion } from 'framer-motion'
import { useMemo } from 'react'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import NotificationHistory from '../components/notifications/NotificationHistory.jsx'
import ActivityTimeline from '../components/notifications/ActivityTimeline.jsx'
import QueueStatusMonitor from '../components/notifications/QueueStatusMonitor.jsx'
import { useNotifications } from '../hooks/useNotifications.js'
import { usePreferences } from '../hooks/usePreferences.js'

export default function NotificationsPage() {
  const api = useNotifications()
  const { notifications } = usePreferences()

  const timelineItems = useMemo(
    () =>
      api.items.slice(0, 8).map((n) => ({
        id: n.id,
        title: n.title,
        detail: n.message,
        badge: n.type,
        time: n.timeLabel,
      })),
    [api.items],
  )

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <PageHeader
        title="Notifications"
        subtitle="Enterprise notification center with read/unread states and history."
        right={
          <div className="flex items-center gap-2">
            <Badge variant={notifications.enabled ? 'purple' : 'warning'}>
              {notifications.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
        }
      />

      {api.error ? (
        <div className="mb-4">
          <Badge variant="danger">Error: {api.error}</Badge>
        </div>
      ) : null}

      <div className="mb-4">
        <QueueStatusMonitor />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <NotificationHistory enabled={notifications.enabled} api={api} />
        </div>
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Activity Timeline</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">Recent notification events</p>
            </div>
            <Badge variant="purple">Timeline</Badge>
          </div>
          <div className="mt-4">
            {timelineItems.length ? (
              <ActivityTimeline items={timelineItems} />
            ) : (
              <div className="rounded-2xl px-3 py-10 text-center text-sm text-slate-600 dark:text-slate-300">
                No recent activity.
              </div>
            )}
          </div>
        </Card>
      </div>
    </motion.div>
  )
}
