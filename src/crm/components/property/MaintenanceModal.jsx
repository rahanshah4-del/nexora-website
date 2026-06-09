import { AnimatePresence, motion } from 'framer-motion'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Card from '../ui/Card.jsx'
import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'
import {
  MAINTENANCE_ASSIGNEE_TYPES,
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_STATUSES,
  maintenanceBalanceDue,
} from '../../lib/propertyCalculations.js'
import { formatCurrency } from '../../utils/format.js'

const MAINTENANCE_CATEGORIES = [
  'General',
  'Plumbing',
  'Electrical',
  'HVAC',
  'Carpentry',
  'Painting',
  'Appliance',
  'Cleaning',
  'Security',
  'Other',
]

const CURRENCIES = ['PKR', 'USD', 'AED', 'SAR', 'INR']

function Field({ label, children, hint }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-slate-400">{hint}</span> : null}
    </label>
  )
}

export default function MaintenanceModal({
  open,
  mode = 'create',
  draft,
  setDraft,
  busy = false,
  onSubmit,
  onClose,
  properties = [],
  tenants = [],
}) {
  if (!draft) return null
  const set = (key, value) => setDraft((current) => ({ ...current, [key]: value }))
  const balanceDue = maintenanceBalanceDue(draft)

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            className="crm-modal-panel"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            transition={{ duration: 0.18 }}
            onClick={(event) => event.stopPropagation()}
          >
            <Card className="rounded-3xl p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Badge variant="purple">Maintenance</Badge>
                  <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
                    {mode === 'edit' ? 'Edit maintenance request' : 'New maintenance request'}
                  </h2>
                </div>
                <Button variant="subtle" className="h-9 rounded-xl px-3 text-xs" type="button" onClick={onClose}>
                  Close
                </Button>
              </div>

              <form className="mt-4 space-y-4" onSubmit={onSubmit}>
                <Field label="Title">
                  <Input placeholder="e.g. Leaking kitchen tap" value={draft.title} onChange={(e) => set('title', e.target.value)} />
                </Field>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Category">
                    <Select value={draft.category} onChange={(e) => set('category', e.target.value)}>
                      {MAINTENANCE_CATEGORIES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Priority">
                    <Select value={draft.priority} onChange={(e) => set('priority', e.target.value)}>
                      {MAINTENANCE_PRIORITIES.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </Select>
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Property" hint={properties.length ? 'Pick from your properties or type a name.' : undefined}>
                    {properties.length ? (
                      <Select
                        className="mb-2"
                        value={draft.propertyId || ''}
                        onChange={(e) => {
                          const match = properties.find((p) => p.id === e.target.value)
                          setDraft((current) => ({
                            ...current,
                            propertyId: match?.id || '',
                            propertyName: match?.name || current.propertyName,
                          }))
                        }}
                      >
                        <option value="">— Select property —</option>
                        {properties.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </Select>
                    ) : null}
                    <Input placeholder="Property name" value={draft.propertyName} onChange={(e) => set('propertyName', e.target.value)} />
                  </Field>
                  <Field label="Unit">
                    <Input placeholder="e.g. Flat 2B" value={draft.unit} onChange={(e) => set('unit', e.target.value)} />
                  </Field>
                </div>

                <Field label="Tenant" hint={tenants.length ? 'Pick from your tenants or type a name.' : undefined}>
                  {tenants.length ? (
                    <Select
                      className="mb-2"
                      value={draft.tenantId || ''}
                      onChange={(e) => {
                        const match = tenants.find((t) => t.id === e.target.value)
                        setDraft((current) => ({
                          ...current,
                          tenantId: match?.id || '',
                          tenantName: match?.name || current.tenantName,
                        }))
                      }}
                    >
                      <option value="">— Select tenant —</option>
                      {tenants.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </Select>
                  ) : null}
                  <Input placeholder="Tenant name (optional)" value={draft.tenantName} onChange={(e) => set('tenantName', e.target.value)} />
                </Field>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Assign to (staff / vendor)">
                    <Input placeholder="e.g. Ali Plumbing Co." value={draft.assignedTo} onChange={(e) => set('assignedTo', e.target.value)} />
                  </Field>
                  <Field label="Assignee type">
                    <Select value={draft.assigneeType} onChange={(e) => set('assigneeType', e.target.value)}>
                      {MAINTENANCE_ASSIGNEE_TYPES.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </Select>
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Status">
                    <Select value={draft.status} onChange={(e) => set('status', e.target.value)}>
                      {MAINTENANCE_STATUSES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Currency">
                    <Select value={draft.currency} onChange={(e) => set('currency', e.target.value)}>
                      {CURRENCIES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </Select>
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Estimated cost">
                    <Input inputMode="decimal" placeholder="0" value={draft.estimatedCost} onChange={(e) => set('estimatedCost', e.target.value)} />
                  </Field>
                  <Field label="Actual cost">
                    <Input inputMode="decimal" placeholder="0" value={draft.actualCost} onChange={(e) => set('actualCost', e.target.value)} />
                  </Field>
                  <Field label="Paid amount">
                    <Input inputMode="decimal" placeholder="0" value={draft.paidAmount} onChange={(e) => set('paidAmount', e.target.value)} />
                  </Field>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5">
                  <span className="font-medium text-slate-600 dark:text-slate-300">Balance due</span>
                  <span className="float-right font-semibold text-slate-950 dark:text-white">
                    {formatCurrency(balanceDue, draft.currency || 'PKR')}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Due date">
                    <Input type="date" value={draft.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
                  </Field>
                  <Field label="Completion date">
                    <Input type="date" value={draft.completionDate} onChange={(e) => set('completionDate', e.target.value)} />
                  </Field>
                </div>

                <Field label="Notes">
                  <textarea
                    className="focus-ring min-h-[72px] w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-sky-300 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                    placeholder="Describe the issue, parts needed, access details..."
                    value={draft.notes}
                    onChange={(e) => set('notes', e.target.value)}
                  />
                </Field>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Attachment label" hint="Optional photo/document name.">
                    <Input placeholder="e.g. before-photo.jpg" value={draft.attachmentName} onChange={(e) => set('attachmentName', e.target.value)} />
                  </Field>
                  <Field label="Attachment link" hint="Paste an image/document URL.">
                    <Input placeholder="https://..." value={draft.attachmentUrl} onChange={(e) => set('attachmentUrl', e.target.value)} />
                  </Field>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button className="rounded-2xl" type="submit" disabled={busy}>
                    {busy ? 'Saving...' : mode === 'edit' ? 'Save request' : 'Add request'}
                  </Button>
                  <Button variant="subtle" className="rounded-2xl" type="button" disabled={busy} onClick={onClose}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
