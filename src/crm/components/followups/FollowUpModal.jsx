import { AnimatePresence, motion } from 'framer-motion'
import { memo, useEffect, useState } from 'react'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Card from '../ui/Card.jsx'
import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'

const types = ['Call', 'WhatsApp', 'Email', 'Meeting']

function FollowUpModal({ open, onClose, onCreate, onUpdate, initialTask = null, mode = 'create' }) {
  const [draft, setDraft] = useState(null)

  useEffect(() => {
    if (!open) return
    const due = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    if (initialTask) {
      Promise.resolve().then(() =>
        setDraft({
          customerName: initialTask.customerName || '',
          phone: initialTask.phone || '',
          email: initialTask.email || '',
          assignedTo: initialTask.assignedTo || 'Sales Staff',
          dueDate: initialTask.dueDate || due,
          dueTime: initialTask.dueTime || '11:30',
          type: initialTask.type || 'WhatsApp',
          priority: initialTask.priority || 'Medium',
          status: initialTask.status || 'Upcoming',
          notes: initialTask.notes || '',
        }),
      )
      return
    }
    Promise.resolve().then(() =>
      setDraft({
        customerName: '',
        phone: '',
        email: '',
        assignedTo: 'Sales Staff',
        dueDate: due,
        dueTime: '11:30',
        type: 'WhatsApp',
        priority: 'Medium',
        status: 'Upcoming',
        notes: '',
      }),
    )
  }, [initialTask, open])

  const isEdit = mode === 'edit'

  return (
    <AnimatePresence>
      {open ? (
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
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="crm-modal-panel"
          >
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-900 dark:text-white">
                    {isEdit ? 'Edit Follow-up' : 'Create Follow-up'}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {isEdit ? 'Update this follow-up in your workspace.' : 'Creates a real Workspace task.'}
                  </p>
                </div>
                <Badge variant="purple">Task</Badge>
              </div>

              {draft ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Customer Name *</label>
                    <Input className="mt-1" value={draft.customerName} onChange={(e) => setDraft((d) => ({ ...d, customerName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Phone</label>
                    <Input className="mt-1" value={draft.phone} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Email</label>
                    <Input className="mt-1" type="email" value={draft.email} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Assigned To</label>
                    <Input className="mt-1" value={draft.assignedTo} onChange={(e) => setDraft((d) => ({ ...d, assignedTo: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Type</label>
                    <Select className="mt-1" value={draft.type} onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}>
                      {types.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Due Date *</label>
                    <Input className="mt-1" type="date" value={draft.dueDate} onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Due Time</label>
                    <Input className="mt-1" type="time" value={draft.dueTime} onChange={(e) => setDraft((d) => ({ ...d, dueTime: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Priority</label>
                    <Select className="mt-1" value={draft.priority} onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value }))}>
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                      <option>Urgent</option>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Status</label>
                    <Select className="mt-1" value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}>
                      <option>Today</option>
                      <option>Upcoming</option>
                      <option>Overdue</option>
                      <option>Completed</option>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Notes</label>
                    <textarea
                      className="focus-ring mt-1 h-28 w-full rounded-xl border border-white/30 bg-white/40 p-3 text-sm text-slate-900 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-100"
                      value={draft.notes}
                      onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                      placeholder="Notes…"
                    />
                  </div>
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  className="rounded-2xl"
                  type="button"
                  onClick={() => {
                    if (!draft) return
                    if (isEdit) onUpdate?.(draft)
                    else onCreate?.(draft)
                  }}
                >
                  {isEdit ? 'Save changes' : 'Create'}
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

export default memo(FollowUpModal)
