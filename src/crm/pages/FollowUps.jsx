import { motion } from 'framer-motion'
import { AnimatePresence } from 'framer-motion'
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
import { useWorkspaceAccess } from '../hooks/useWorkspaceAccess.js'

function DeleteConfirmModal({ task, onClose, onConfirm }) {
  return (
    <AnimatePresence>
      {task ? (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            className="crm-modal-panel max-w-md"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            transition={{ duration: 0.18 }}
            onClick={(event) => event.stopPropagation()}
          >
            <Card className="p-5">
              <p className="text-base font-semibold text-slate-900 dark:text-white">Delete follow-up?</p>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                This will remove the follow-up for <span className="font-semibold">{task.customerName}</span>.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button className="rounded-2xl bg-rose-600 hover:bg-rose-700" type="button" onClick={onConfirm}>
                  Delete
                </Button>
                <Button variant="subtle" className="rounded-2xl" type="button" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export default function FollowUpsPage() {
  const followups = useFollowUps()
  const { grouped, loading, source, error } = followups
  const access = useWorkspaceAccess()
  const [createOpen, setCreateOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [deletingTask, setDeletingTask] = useState(null)
  const [toast, setToast] = useState(null)
  const canCreate = access.canEditFollowUps
  const canEdit = access.canEditFollowUps
  const canDelete = access.canDeleteFollowUps

  function showToast(tone, message, timeout = 1800) {
    setToast({ tone, message })
    window.setTimeout(() => setToast(null), timeout)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}
      <PageHeader
        title="Follow-Up Automation"
        subtitle="Daily tasks, reminders, overdue alerts, and activity tracking."
        right={
          <div className="flex flex-wrap items-center gap-2">
            {access.isStaff && !canCreate ? <Badge variant="warning">Permission required</Badge> : null}
            <Button
              className="rounded-2xl"
              onClick={() => {
                if (!canCreate) {
                  showToast('error', 'Follow-up edit permission is required.', 2400)
                  return
                }
                setCreateOpen(true)
              }}
              type="button"
            >
              Create Follow-up
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Follow-up Board</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Auto reminders and assignments. {source === 'firestore' ? 'Live Sync enabled.' : 'No data yet.'}
              </p>
            </div>
            <Badge variant={source === 'firestore' ? 'success' : 'default'}>{loading ? 'Loading…' : source === 'firestore' ? 'Live Sync' : 'No data yet'}</Badge>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Input placeholder="Search tasks..." />
            <Input placeholder="Filter by priority/status..." />
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
              <FollowUpBoard
                grouped={grouped}
                canEdit={canEdit}
                canDelete={canDelete}
                onEdit={(task) => setEditingTask(task)}
                onDelete={(task) => setDeletingTask(task)}
              />
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <FollowUpCalendar />
          <Card className="p-5">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Reminders</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Email and WhatsApp reminders</p>
            <div className="mt-4 space-y-2">
              <Button variant="subtle" className="w-full rounded-2xl">
                Send Email Reminders
              </Button>
              <Button variant="ghost" className="w-full rounded-2xl">
                WhatsApp Reminder
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
            showToast('success', 'Follow-up created successfully')
            setCreateOpen(false)
          } else {
            showToast('error', res.error || 'Failed to create follow-up', 2400)
          }
        }}
      />
      <FollowUpModal
        open={Boolean(editingTask)}
        mode="edit"
        initialTask={editingTask}
        onClose={() => setEditingTask(null)}
        onUpdate={async (payload) => {
          if (!editingTask) return
          if (!canEdit) {
            showToast('error', 'Follow-up edit permission is required.', 2400)
            return
          }
          const res = await followups.updateTask(editingTask.id, payload)
          if (res.ok) {
            showToast('success', 'Follow-up updated successfully')
            setEditingTask(null)
          } else {
            showToast('error', res.error || 'Failed to update follow-up', 2400)
          }
        }}
      />
      <DeleteConfirmModal
        task={deletingTask}
        onClose={() => setDeletingTask(null)}
        onConfirm={async () => {
          if (!deletingTask) return
          if (!canDelete) {
            showToast('error', 'Follow-up delete permission is required.', 2400)
            setDeletingTask(null)
            return
          }
          const res = await followups.deleteTask(deletingTask.id)
          if (res.ok) {
            showToast('success', 'Follow-up deleted successfully')
          } else {
            showToast('error', res.error || 'Failed to delete follow-up', 2400)
          }
          setDeletingTask(null)
        }}
      />
    </motion.div>
  )
}
