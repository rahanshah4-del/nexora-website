import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Card from '../ui/Card.jsx'
import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'
import { pipelineStages } from '../../data/pipelineDealsDemo.js'

export default function DealModal({ open, onClose, onCreate }) {
  const [draft, setDraft] = useState(null)

  useEffect(() => {
    if (!open) return
    const due = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
    Promise.resolve().then(() =>
      setDraft({
        title: '',
        customerName: '',
        stage: 'New Lead',
        priority: 'Medium',
        winProbability: 50,
        expectedCloseDate: due,
        dealValueUsd: 5000,
        notes: '',
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
                  <p className="text-base font-semibold text-slate-900 dark:text-white">Add Deal</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Creates a real Firestore pipeline deal.</p>
                </div>
                <Badge variant="purple">Pipeline</Badge>
              </div>

              {draft ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Deal title *</label>
                    <Input className="mt-1" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Customer *</label>
                    <Input className="mt-1" value={draft.customerName} onChange={(e) => setDraft((d) => ({ ...d, customerName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Stage</label>
                    <Select className="mt-1" value={draft.stage} onChange={(e) => setDraft((d) => ({ ...d, stage: e.target.value }))}>
                      {pipelineStages.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Priority</label>
                    <Select className="mt-1" value={draft.priority} onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value }))}>
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Win probability %</label>
                    <Input className="mt-1" inputMode="numeric" value={draft.winProbability} onChange={(e) => setDraft((d) => ({ ...d, winProbability: Number(e.target.value || 0) }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Expected close</label>
                    <Input className="mt-1" type="date" value={draft.expectedCloseDate} onChange={(e) => setDraft((d) => ({ ...d, expectedCloseDate: e.target.value }))} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Deal value (USD base)</label>
                    <Input className="mt-1" inputMode="numeric" value={draft.dealValueUsd} onChange={(e) => setDraft((d) => ({ ...d, dealValueUsd: Number(e.target.value || 0) }))} />
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

