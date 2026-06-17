import { AnimatePresence, motion } from 'framer-motion'
import { memo, useEffect, useState } from 'react'
import { HiOutlineXMark } from 'react-icons/hi2'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Card from '../ui/Card.jsx'
import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'
import { pipelineStages } from '../../data/pipelineStages.js'
import { formatCurrency } from '../../utils/format.js'
import { usePreferences } from '../../hooks/usePreferences.js'

function DealDrawer({ open, deal, onClose, onSave, onDelete }) {
  const { currency } = usePreferences()
  const [draft, setDraft] = useState(deal)

  useEffect(() => {
    Promise.resolve().then(() => setDraft(deal))
  }, [deal])

  const value = draft?.dealValueUsd ? Number(draft.dealValueUsd) || 0 : 0

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
            className="absolute right-0 top-0 h-full w-full max-w-lg p-4"
          >
            <Card className="h-full overflow-hidden p-0">
              <div className="flex items-start justify-between border-b border-white/15 p-5 dark:border-white/10">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-slate-900 dark:text-white">{draft.title}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="info">{draft.stage}</Badge>
                    <Badge variant="purple">{draft.winProbability}%</Badge>
                    <Badge variant="default">{formatCurrency(value, currency)}</Badge>
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
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Deal title</label>
                    <Input className="mt-1" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Customer</label>
                    <Input
                      className="mt-1"
                      value={draft.customerName}
                      onChange={(e) => setDraft((d) => ({ ...d, customerName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Lead</label>
                    <Input className="mt-1" value={draft.leadName || ''} onChange={(e) => setDraft((d) => ({ ...d, leadName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Owner</label>
                    <Input className="mt-1" value={draft.owner || ''} onChange={(e) => setDraft((d) => ({ ...d, owner: e.target.value }))} />
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
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Source</label>
                    <Input className="mt-1" value={draft.source || ''} onChange={(e) => setDraft((d) => ({ ...d, source: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Status</label>
                    <Select className="mt-1" value={draft.status || 'Open'} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}>
                      <option>Open</option>
                      <option>Won</option>
                      <option>Lost</option>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Win probability %</label>
                    <Input
                      className="mt-1"
                      value={draft.winProbability}
                      onChange={(e) => setDraft((d) => ({ ...d, winProbability: Number(e.target.value || 0) }))}
                      inputMode="numeric"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Expected close</label>
                    <Input
                      className="mt-1"
                      type="date"
                      value={draft.expectedCloseDate}
                      onChange={(e) => setDraft((d) => ({ ...d, expectedCloseDate: e.target.value }))}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Sales notes</label>
                    <textarea
                      className="focus-ring mt-1 h-28 w-full rounded-xl border border-white/30 bg-white/40 p-3 text-sm text-slate-900 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-100"
                      value={draft.notes}
                      onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                      placeholder="Notes, next steps, objections…"
                    />
                  </div>
                  {draft.stage === 'Lost' ? (
                    <div className="sm:col-span-2">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Lost reason</label>
                      <Input
                        className="mt-1"
                        value={draft.lostReason || ''}
                        onChange={(e) => setDraft((d) => ({ ...d, lostReason: e.target.value }))}
                        placeholder="Pricing, timing, competitor…"
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 border-t border-white/15 bg-white/40 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/40">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    className="rounded-2xl"
                    type="button"
                    onClick={() => onSave?.(draft)}
                  >
                    Save
                  </Button>
                  <Button variant="subtle" className="rounded-2xl" type="button" onClick={onClose}>
                    Close
                  </Button>
                  <Button
                    variant="ghost"
                    className="ml-auto rounded-2xl text-rose-600 hover:bg-rose-500/10 dark:text-rose-300"
                    type="button"
                    onClick={() => onDelete?.(draft)}
                  >
                    Delete
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

export default memo(DealDrawer)
