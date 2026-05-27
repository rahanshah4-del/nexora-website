import { AnimatePresence, motion } from 'framer-motion'
import { memo, useEffect, useState } from 'react'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Card from '../ui/Card.jsx'
import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'

function CustomerModal({ open, onClose, onCreate }) {
  const [draft, setDraft] = useState(null)

  useEffect(() => {
    if (!open) return
    Promise.resolve().then(() =>
      setDraft({
        name: '',
        email: '',
        phone: '',
        company: '',
        customerType: 'Retail',
        status: 'Active',
        notes: '',
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
            <Card className="rounded-3xl p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-900 dark:text-white">Add Customer</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Creates a real Workspace customer record.</p>
                </div>
                <Badge variant="purple">Customer</Badge>
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
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Customer Type</label>
                    <Select className="mt-1" value={draft.customerType} onChange={(e) => setDraft((d) => ({ ...d, customerType: e.target.value }))}>
                      <option>Retail</option>
                      <option>Business</option>
                      <option>Enterprise</option>
                      <option>Partner</option>
                      <option>General</option>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Status</label>
                    <Select className="mt-1" value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}>
                      <option>Active</option>
                      <option>At Risk</option>
                      <option>Trial</option>
                      <option>Churned</option>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Notes</label>
                    <textarea
                      className="focus-ring mt-1 min-h-24 w-full resize-none rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-sky-300 focus:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                      value={draft.notes}
                      onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                    />
                  </div>
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-2">
                <Button className="rounded-2xl" type="button" onClick={() => draft && onCreate?.(draft)}>
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

export default memo(CustomerModal)
