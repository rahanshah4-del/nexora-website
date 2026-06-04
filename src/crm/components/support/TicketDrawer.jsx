import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { HiOutlineXMark } from 'react-icons/hi2'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Card from '../ui/Card.jsx'
import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'
import TicketComments from './TicketComments.jsx'

function statusVariant(status) {
  if (status === 'Resolved') return 'success'
  if (status === 'In Progress') return 'info'
  if (status === 'Closed') return 'default'
  return 'warning'
}

function priorityVariant(priority) {
  if (priority === 'Urgent') return 'danger'
  if (priority === 'High') return 'warning'
  if (priority === 'Medium') return 'info'
  return 'default'
}

export default function TicketDrawer({ open, ticket, onClose, onSave, onAddComment, canEdit = false, canComment = false }) {
  const [draft, setDraft] = useState(ticket)

  useEffect(() => {
    Promise.resolve().then(() => setDraft(ticket))
  }, [ticket])

  return (
    <AnimatePresence>
      {open && draft ? (
        <motion.div
          className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 30, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-0 h-full w-full max-w-xl p-4"
          >
            <Card className="h-full overflow-hidden p-0">
              <div className="flex items-start justify-between border-b border-white/15 p-5 dark:border-white/10">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-slate-900 dark:text-white">{draft.subject}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="purple">{draft.ticketNumber}</Badge>
                    <Badge variant={statusVariant(draft.status)}>{draft.status}</Badge>
                    <Badge variant={priorityVariant(draft.priority)}>{draft.priority}</Badge>
                  </div>
                </div>
                <button
                  type="button"
                  className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-2xl text-slate-700 hover:bg-slate-900/5 dark:text-slate-200 dark:hover:bg-white/10"
                  onClick={onClose}
                  aria-label="Close"
                >
                  <HiOutlineXMark className="text-xl" />
                </button>
              </div>

              <div className="h-full overflow-auto p-5 pb-28">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Customer</label>
                    <Input className="mt-1" value={draft.customerName} disabled={!canEdit} onChange={(e) => setDraft((d) => ({ ...d, customerName: e.target.value }))} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Email</label>
                    <Input className="mt-1" type="email" value={draft.customerEmail} disabled={!canEdit} onChange={(e) => setDraft((d) => ({ ...d, customerEmail: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Status</label>
                    <Select className="mt-1" value={draft.status} disabled={!canEdit} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}>
                      <option>Open</option>
                      <option>In Progress</option>
                      <option>Resolved</option>
                      <option>Closed</option>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Priority</label>
                    <Select className="mt-1" value={draft.priority} disabled={!canEdit} onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value }))}>
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                      <option>Urgent</option>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Assigned To</label>
                    <Select className="mt-1" value={draft.assignedTo} disabled={!canEdit} onChange={(e) => setDraft((d) => ({ ...d, assignedTo: e.target.value }))}>
                      <option>Unassigned</option>
                      <option>Owner</option>
                      <option>Admin</option>
                      <option>Manager</option>
                      <option>Support Agent</option>
                      <option>Sales Staff</option>
                      <option>Accountant</option>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Message</label>
                    <textarea
                      className="focus-ring mt-1 h-28 w-full rounded-xl border border-white/30 bg-white/40 p-3 text-sm text-slate-900 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-100"
                      value={draft.message}
                      disabled={!canEdit}
                      onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))}
                      placeholder="Describe the issue..."
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <TicketComments ticket={draft} canAdd={canComment} onAdd={(c) => onAddComment?.(draft, c)} />
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 border-t border-white/15 bg-white/40 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/40">
                <div className="flex flex-wrap items-center gap-2">
                  {canEdit ? (
                    <Button className="rounded-2xl" type="button" onClick={() => onSave?.(draft)}>
                      Save
                    </Button>
                  ) : null}
                  <Button variant="subtle" className="rounded-2xl" type="button" onClick={onClose}>
                    Close
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
