import { AnimatePresence, motion } from 'framer-motion'
import { memo, useEffect, useState } from 'react'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Card from '../ui/Card.jsx'
import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'

const sources = ['Website', 'Referral', 'LinkedIn', 'Ad Campaign', 'Webinar', 'Email', 'Other']

function LeadModal({ open, onClose, onCreate }) {
  const [draft, setDraft] = useState(null)

  useEffect(() => {
    if (!open) return
    Promise.resolve().then(() =>
      setDraft({
        name: '',
        email: '',
        phone: '',
        company: '',
        dealValue: 0,
        status: 'New',
        priority: 'Medium',
        source: 'Website',
      }),
    )
  }, [open])

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
                  <p className="text-base font-semibold text-slate-900 dark:text-white">Add New Lead</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Creates a real Workspace lead record.</p>
                </div>
                <Badge variant="purple">Lead</Badge>
              </div>

              {draft ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Name *</label>
                    <Input className="mt-1" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Email *</label>
                    <Input className="mt-1" type="email" value={draft.email} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Phone</label>
                    <Input className="mt-1" value={draft.phone} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Company</label>
                    <Input className="mt-1" value={draft.company} onChange={(e) => setDraft((d) => ({ ...d, company: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Deal Value (USD base)</label>
                    <Input
                      className="mt-1"
                      inputMode="numeric"
                      value={draft.dealValue}
                      onChange={(e) => setDraft((d) => ({ ...d, dealValue: Number(e.target.value || 0) }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Source</label>
                    <Select className="mt-1" value={draft.source} onChange={(e) => setDraft((d) => ({ ...d, source: e.target.value }))}>
                      {sources.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Status</label>
                    <Select className="mt-1" value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}>
                      <option>New</option>
                      <option>Contacted</option>
                      <option>Qualified</option>
                      <option>Proposal</option>
                      <option>Negotiation</option>
                      <option>Lost</option>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Priority</label>
                    <Select className="mt-1" value={draft.priority} onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value }))}>
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                    </Select>
                  </div>
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  className="rounded-2xl"
                  type="button"
                  onClick={() => {
                    if (!draft) return
                    onCreate?.(draft)
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

export default memo(LeadModal)
