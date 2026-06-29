import { AnimatePresence, motion } from 'framer-motion'
import { memo, useEffect, useState } from 'react'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Card from '../ui/Card.jsx'
import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'

function createDraft(initialCustomer) {
  const rand = Math.floor(100 + Math.random() * 900)
  return {
    ticketNumber: `TCK-${rand}`,
    customerName: initialCustomer?.name || '',
    customerEmail: initialCustomer?.email || '',
    subject: initialCustomer?.subject || '',
    message: initialCustomer?.message || '',
    status: 'Open',
    priority: initialCustomer?.priority || 'Medium',
    category: initialCustomer?.category || 'Technical Support',
    source: initialCustomer?.source || '',
    upgradeRequestId: initialCustomer?.upgradeRequestId || '',
    assignedTo: 'Unassigned',
    comments: [],
    screenshotFile: null,
    screenshotName: '',
  }
}

function TicketModal({ open, onClose, onCreate, initialCustomer }) {
  const [draft, setDraft] = useState(() => createDraft(initialCustomer))

  useEffect(() => {
    if (!open) return
    Promise.resolve().then(() => setDraft(createDraft(initialCustomer)))
  }, [open, initialCustomer])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4"
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
                  <p className="text-base font-semibold text-slate-900 dark:text-white">Create Support Ticket</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Assignments and replies are saved to your workspace.</p>
                </div>
                <Badge variant="purple">{draft.ticketNumber}</Badge>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Customer Name</label>
                  <Input className="mt-1" value={draft.customerName} onChange={(e) => setDraft((s) => ({ ...s, customerName: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Customer Email</label>
                  <Input className="mt-1" type="email" value={draft.customerEmail} onChange={(e) => setDraft((s) => ({ ...s, customerEmail: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Subject</label>
                  <Input className="mt-1" value={draft.subject} onChange={(e) => setDraft((s) => ({ ...s, subject: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Priority</label>
                  <Select className="mt-1" value={draft.priority} onChange={(e) => setDraft((s) => ({ ...s, priority: e.target.value }))}>
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Urgent</option>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Assigned To</label>
                  <Select className="mt-1" value={draft.assignedTo} onChange={(e) => setDraft((s) => ({ ...s, assignedTo: e.target.value }))}>
                    <option>Unassigned</option>
                    <option>Support Agent</option>
                    <option>Manager</option>
                    <option>Admin</option>
                    <option>Accountant</option>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Message</label>
                  <textarea
                    className="focus-ring mt-1 h-28 w-full rounded-xl border border-white/30 bg-white/40 p-3 text-sm text-slate-900 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-100"
                    value={draft.message}
                    onChange={(e) => setDraft((s) => ({ ...s, message: e.target.value }))}
                    placeholder="Describe your issue…"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Screenshot</label>
                  <div className="mt-1 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-900/40">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0] || null
                        setDraft((s) => ({ ...s, screenshotFile: file, screenshotName: file?.name || '' }))
                      }}
                      className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white"
                    />
                    <p className="mt-2 text-xs font-semibold text-slate-500">
                      {draft.screenshotName || 'PNG/JPG screenshot optional. Max 4MB.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  className="rounded-2xl"
                  type="button"
                  onClick={() => {
                    onCreate?.({ ...draft, createdAt: new Date().toISOString().slice(0, 10), updatedAt: new Date().toISOString().slice(0, 10) })
                    onClose?.()
                  }}
                >
                  Create
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

export default memo(TicketModal)
