import { motion } from 'framer-motion'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import Input from '../components/ui/Input.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import FollowUpBoard from '../components/followups/FollowUpBoard.jsx'
import FollowUpCalendar from '../components/followups/FollowUpCalendar.jsx'
import { useFollowUps } from '../hooks/useFollowUps.js'
import FollowUpModal from '../components/followups/FollowUpModal.jsx'
import { useState } from 'react'
import Toast from '../components/ui/Toast.jsx'

export default function FollowUpsPage() {
  const followups = useFollowUps()
  const { grouped, loading, source, error } = followups
  const [createOpen, setCreateOpen] = useState(false)
  const [toast, setToast] = useState(null)

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}
      <PageHeader
        title="Follow-Up Automation"
        subtitle="Daily tasks, reminders, overdue alerts, and activity tracking (demo)."
        right={
          <Button className="rounded-2xl" onClick={() => setCreateOpen(true)} type="button">
            Create Follow-up
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Follow-up Board</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Auto reminders UI + assignments. {source === 'firestore' ? 'Synced to Firestore.' : 'Demo fallback.'}
              </p>
            </div>
            <Badge variant={source === 'firestore' ? 'success' : 'default'}>{loading ? 'Loading…' : source === 'firestore' ? 'Live' : 'Demo'}</Badge>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Input placeholder="Search tasks (placeholder)..." />
            <Input placeholder="Filter by priority/status (placeholder)..." />
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-800 dark:text-rose-200">
              {error}
            </div>
          ) : null}

          <div className="mt-4">
            {loading ? (
              <div className="grid min-h-[12rem] place-items-center text-sm text-slate-600 dark:text-slate-300">
                Loading tasks…
              </div>
            ) : (
              <FollowUpBoard grouped={grouped} />
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <FollowUpCalendar />
          <Card className="p-5">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Reminders</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Email + WhatsApp placeholders</p>
            <div className="mt-4 space-y-2">
              <Button variant="subtle" className="w-full rounded-2xl">
                Send Email Reminders
              </Button>
              <Button variant="ghost" className="w-full rounded-2xl">
                WhatsApp Placeholder
              </Button>
              <Button className="w-full rounded-2xl">Reminder Notifications</Button>
            </div>
          </Card>
        </div>
      </div>

      <FollowUpModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={async (payload) => {
          const res = await followups.createTask(payload)
          if (res.ok) {
            setToast({ tone: 'success', message: 'Task created successfully' })
            window.setTimeout(() => setToast(null), 1600)
            setCreateOpen(false)
          } else {
            setToast({ tone: 'error', message: res.error || 'Failed to create task' })
            window.setTimeout(() => setToast(null), 2400)
          }
        }}
      />
    </motion.div>
  )
}
