import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Card from '../ui/Card.jsx'
import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'

export default function CustomerModal({ open, onClose, onCreate }) {
  const [draft, setDraft] = useState(null)

  useEffect(() => {
    if (!open) return
    Promise.resolve().then(() =>
      setDraft({
        name: '',
        company: '',
        email: '',
        plan: 'Free',
        status: 'Active',
        spendUsd: 0,
      }),
    )
  }, [open])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl"
          >
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-900 dark:text-white">Add Customer</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Creates a real Firestore customer record.</p>
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
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Company *</label>
                    <Input className="mt-1" value={draft.company} onChange={(e) => setDraft((d) => ({ ...d, company: e.target.value }))} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Email *</label>
                    <Input className="mt-1" type="email" value={draft.email} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Plan</label>
                    <Select className="mt-1" value={draft.plan} onChange={(e) => setDraft((d) => ({ ...d, plan: e.target.value }))}>
                      <option>Free</option>
                      <option>Starter</option>
                      <option>Business</option>
                      <option>Enterprise</option>
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
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Spend (USD base)</label>
                    <Input
                      className="mt-1"
                      inputMode="numeric"
                      value={draft.spendUsd}
                      onChange={(e) => setDraft((d) => ({ ...d, spendUsd: Number(e.target.value || 0) }))}
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

