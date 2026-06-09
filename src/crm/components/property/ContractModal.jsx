import { AnimatePresence, motion } from 'framer-motion'
import { useMemo } from 'react'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Card from '../ui/Card.jsx'
import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'
import {
  CONTRACT_LATE_FEE_TYPES,
  contractDurationMonths,
  contractOutstandingBalance,
  contractRenewalValue,
  contractTotalValue,
} from '../../lib/propertyCalculations.js'
import { formatCurrency } from '../../utils/format.js'

const CURRENCIES = ['PKR', 'USD', 'AED', 'SAR', 'INR']
const DUE_DAYS = Array.from({ length: 28 }, (_, i) => i + 1)

function Field({ label, children, hint }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-slate-400">{hint}</span> : null}
    </label>
  )
}

function SummaryRow({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-600 dark:text-slate-300">{label}</span>
      <span className={strong ? 'font-semibold text-slate-950 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-200'}>{value}</span>
    </div>
  )
}

export default function ContractModal({
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
  const isRenew = mode === 'renew'
  const set = (key, value) => setDraft((current) => ({ ...current, [key]: value }))

  const preview = useMemo(() => {
    if (!draft) return null
    const months = contractDurationMonths(draft.startDate, draft.endDate)
    const total = contractTotalValue(draft)
    const outstanding = contractOutstandingBalance(draft)
    const renewalValue = contractRenewalValue({
      monthlyRent: draft.monthlyRent,
      durationMonths: months,
      increasePercent: draft.increasePercent,
    })
    return { months, total, outstanding, renewalValue }
  }, [draft])

  if (!draft || !preview) return null
  const currency = draft.currency || 'PKR'

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
            className="crm-modal-panel crm-modal-panel-wide"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            transition={{ duration: 0.18 }}
            onClick={(event) => event.stopPropagation()}
          >
            <Card className="rounded-3xl p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Badge variant="purple">Lease / Contract</Badge>
                  <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
                    {isRenew ? 'Renew lease' : mode === 'edit' ? 'Edit lease' : 'New lease / contract'}
                  </h2>
                </div>
                <Button variant="subtle" className="h-9 rounded-xl px-3 text-xs" type="button" onClick={onClose}>
                  Close
                </Button>
              </div>

              <form className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]" onSubmit={onSubmit}>
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Reference">
                      <Input placeholder="e.g. LEASE-2026-014" value={draft.reference} onChange={(e) => set('reference', e.target.value)} />
                    </Field>
                    {!isRenew ? (
                      <Field label="Status">
                        <Select value={draft.status} onChange={(e) => set('status', e.target.value)}>
                          <option>Draft</option>
                          <option>Active</option>
                        </Select>
                      </Field>
                    ) : (
                      <Field label="Status">
                        <Input value="Active (on renewal)" disabled />
                      </Field>
                    )}
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
                    <Input placeholder="Tenant name" value={draft.tenantName} onChange={(e) => set('tenantName', e.target.value)} />
                  </Field>

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

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Start date">
                      <Input type="date" value={draft.startDate} onChange={(e) => set('startDate', e.target.value)} />
                    </Field>
                    <Field label="End date">
                      <Input type="date" value={draft.endDate} onChange={(e) => set('endDate', e.target.value)} />
                    </Field>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Monthly rent">
                      <Input inputMode="decimal" placeholder="0" value={draft.monthlyRent} onChange={(e) => set('monthlyRent', e.target.value)} />
                    </Field>
                    <Field label="Security deposit">
                      <Input inputMode="decimal" placeholder="0" value={draft.securityDeposit} onChange={(e) => set('securityDeposit', e.target.value)} />
                    </Field>
                    <Field label="Advance payment">
                      <Input inputMode="decimal" placeholder="0" value={draft.advancePayment} onChange={(e) => set('advancePayment', e.target.value)} />
                    </Field>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Field label="Currency">
                      <Select value={draft.currency} onChange={(e) => set('currency', e.target.value)}>
                        {CURRENCIES.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Payment due day">
                      <Select value={draft.paymentDueDay} onChange={(e) => set('paymentDueDay', e.target.value)}>
                        <option value="0">—</option>
                        {DUE_DAYS.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Late fee">
                      <Select value={draft.lateFeeType} onChange={(e) => set('lateFeeType', e.target.value)}>
                        {CONTRACT_LATE_FEE_TYPES.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label={draft.lateFeeType === 'Percent' ? 'Late fee %' : 'Late fee amount'}>
                      <Input
                        inputMode="decimal"
                        placeholder="0"
                        value={draft.lateFeeValue}
                        onChange={(e) => set('lateFeeValue', e.target.value)}
                        disabled={!draft.lateFeeType || draft.lateFeeType === 'None'}
                      />
                    </Field>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Grace period (days)">
                      <Input inputMode="numeric" placeholder="0" value={draft.gracePeriodDays} onChange={(e) => set('gracePeriodDays', e.target.value)} />
                    </Field>
                    {isRenew ? (
                      <Field label="Rent increase %" hint="Applied to the renewal value.">
                        <Input inputMode="decimal" placeholder="0" value={draft.increasePercent} onChange={(e) => set('increasePercent', e.target.value)} />
                      </Field>
                    ) : null}
                  </div>

                  <Field label="Contract notes">
                    <textarea
                      className="focus-ring min-h-[72px] w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-sky-300 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                      placeholder="Clauses, terms, special conditions..."
                      value={draft.notes}
                      onChange={(e) => set('notes', e.target.value)}
                    />
                  </Field>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Document label" hint="Optional document name.">
                      <Input placeholder="e.g. signed-lease.pdf" value={draft.documentName} onChange={(e) => set('documentName', e.target.value)} />
                    </Field>
                    <Field label="Document link" hint="Paste a document URL.">
                      <Input placeholder="https://..." value={draft.documentUrl} onChange={(e) => set('documentUrl', e.target.value)} />
                    </Field>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Live summary</p>
                    <div className="mt-3 space-y-2">
                      <SummaryRow label="Duration" value={`${preview.months} mo`} />
                      <SummaryRow label="Total value" value={formatCurrency(preview.total, currency)} strong />
                      <SummaryRow label="Outstanding" value={formatCurrency(preview.outstanding, currency)} />
                      {isRenew ? (
                        <SummaryRow label="Renewal value" value={formatCurrency(preview.renewalValue, currency)} strong />
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button className="rounded-2xl" type="submit" disabled={busy}>
                      {busy ? 'Saving...' : isRenew ? 'Renew lease' : mode === 'edit' ? 'Save lease' : 'Create lease'}
                    </Button>
                    <Button variant="subtle" className="rounded-2xl" type="button" disabled={busy} onClick={onClose}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </form>
            </Card>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
