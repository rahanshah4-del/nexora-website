import {
  currencyExponent, formatMoney, formatPercent, generateId, getDocumentType, parseScaledDecimal, scaledToDecimalString, todayIso,
} from '../../engine/index.js'
import { useStudio } from '../../ui/StudioContext.js'
import { DateInput, DecimalInput, MoneyInput, Segmented, SelectInput, TextInput } from '../fields.jsx'
import Icon from '../Icon.jsx'
import SectionCard from '../SectionCard.jsx'

const smallButton = 'inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40'
const removeButton = 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40'
const TAX_PRESETS = [
  { name: 'VAT', rate: 200000 },
  { name: 'GST', rate: 180000 },
  { name: 'Sales tax', rate: 80000 },
]
const CASH_STEPS = ['0.05', '0.1', '0.25', '0.5', '1', '5', '10']

function Checkbox({ label, checked, onChange }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/40" />
      {label}
    </label>
  )
}

function TaxChips({ taxIds, onToggle, label }) {
  const { doc } = useStudio()
  if (!doc.taxes.length) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={label}>
      {doc.taxes.map((tax) => {
        const on = taxIds.includes(tax.id)
        return (
          <button key={tax.id} type="button" aria-pressed={on} onClick={() => onToggle(tax.id)} className={`rounded-full border px-2.5 py-1 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${on ? 'border-brand bg-blue-50 text-brand' : 'border-slate-200 text-slate-500'}`}>
            {tax.name || 'Tax'}
          </button>
        )
      })}
    </div>
  )
}

const toggleId = (list, id) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

export function TaxesSection() {
  const { doc, actions } = useStudio()
  const config = getDocumentType(doc.type)
  if (!config.features.pricing) {
    return (
      <SectionCard id="taxes" title="Taxes & adjustments" icon="percent" summary="Not used on this document type">
        <p className="text-sm text-slate-500">A {config.label.toLowerCase()} lists quantities only — no prices, taxes or totals.</p>
      </SectionCard>
    )
  }
  const exponent = currencyExponent(doc.currency)
  const cashOptions = [{ value: '0', label: 'Off' }, ...CASH_STEPS.flatMap((step) => {
    const minor = parseScaledDecimal(step, exponent)
    if (minor === null || minor < 1n || scaledToDecimalString(minor, exponent).replace(/\.?0+$/, '') !== step) return []
    return [{ value: String(minor), label: `Nearest ${step}` }]
  })]
  const cashValue = String(doc.options.cashRoundingIncrement_minor || 0)
  const discount = doc.discount
  const addTax = (preset) => {
    const id = generateId()
    actions.addTax({ id, name: preset?.name || 'Tax', rate_micro: preset?.rate ?? 0 })
    // The first tax on an untaxed document applies to every item.
    if (!doc.taxes.length && doc.lines.every((l) => !l.taxIds.length)) {
      doc.lines.forEach((l) => actions.updateLine(l.id, { taxIds: [id] }))
    }
  }
  const applyToAll = (taxId) => doc.lines.forEach((l) => { if (!l.taxIds.includes(taxId)) actions.updateLine(l.id, { taxIds: [...l.taxIds, taxId] }) })
  const summary = doc.taxes.length ? doc.taxes.map((t) => `${t.name || 'Tax'} ${formatPercent(t.rate_micro, doc.locale)}`).join(', ') : 'Taxes, discount, shipping, rounding'

  return (
    <SectionCard id="taxes" title="Taxes & adjustments" icon="percent" summary={summary}>
      <div className="space-y-6">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-800">Taxes</h3>
          <ul className="space-y-2">
            {doc.taxes.map((tax, i) => (
              <li key={tax.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-end gap-2">
                  <TextInput className="flex-1" label="Tax name" path={`taxes[${i}].name`} value={tax.name} onChange={(v) => actions.updateTax(tax.id, { name: v })} autoComplete="off" />
                  <DecimalInput className="w-28" label="Rate" path={`taxes[${i}].rate_micro`} value={tax.rate_micro} digits={4} suffix="%" onChange={(v) => actions.updateTax(tax.id, { rate_micro: v })} />
                  <button type="button" className={removeButton} aria-label={`Remove ${tax.name || 'tax'}`} onClick={() => actions.removeTax(tax.id)}><Icon name="trash" className="h-4 w-4" /></button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <Checkbox label="Compound (tax on tax)" checked={tax.compound} onChange={(v) => actions.updateTax(tax.id, { compound: v, withholding: v ? false : tax.withholding })} />
                  <Checkbox label="Withholding (deducted)" checked={tax.withholding} onChange={(v) => actions.updateTax(tax.id, { withholding: v, compound: v ? false : tax.compound })} />
                  {doc.lines.some((l) => !l.taxIds.includes(tax.id)) ? (
                    <button type="button" onClick={() => applyToAll(tax.id)} className="text-xs font-semibold text-brand hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">Apply to all items</button>
                  ) : <span className="text-xs text-slate-400">Applied to all items</span>}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={smallButton} onClick={() => addTax()}><Icon name="plus" className="h-4 w-4" /> Add tax</button>
            {TAX_PRESETS.map((p) => (
              <button key={p.name} type="button" className="rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40" onClick={() => addTax(p)}>
                + {p.name} {formatPercent(p.rate, doc.locale)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Segmented label="Prices" value={doc.options.taxMode} onChange={(v) => actions.setOption('taxMode', v)} options={[{ value: 'exclusive', label: 'Exclude tax' }, { value: 'inclusive', label: 'Include tax' }]} />
          <SelectInput label="Tax rounding" value={doc.options.taxRounding} onChange={(v) => actions.setOption('taxRounding', v)} options={[{ value: 'line', label: 'Round per line' }, { value: 'document', label: 'Round per document' }]} />
        </div>

        {config.features.discount ? (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-800">Discount on the whole document</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Segmented
                label="Discount type"
                srOnlyLabel
                value={discount ? discount.kind : 'none'}
                onChange={(v) => actions.setDiscount(v === 'none' ? null : { kind: v, value: 0 })}
                options={[{ value: 'none', label: 'None' }, { value: 'percent', label: 'Percent' }, { value: 'amount', label: 'Amount' }]}
              />
              {discount?.kind === 'percent' ? <DecimalInput label="Discount" srOnlyLabel path="discount.value" value={discount.value} digits={4} suffix="%" onChange={(v) => actions.setDiscount({ kind: 'percent', value: v })} /> : null}
              {discount?.kind === 'amount' ? <MoneyInput label="Discount" srOnlyLabel path="discount.value" value={discount.value} onChange={(v) => actions.setDiscount({ kind: 'amount', value: v })} /> : null}
            </div>
          </div>
        ) : null}

        {config.features.shipping ? (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-800">Shipping</h3>
            {doc.shipping ? (
              <div className="space-y-2">
                <div className="flex items-end gap-2">
                  <TextInput className="flex-1" label="Label" path="shipping.label" value={doc.shipping.label} onChange={(v) => actions.setShipping({ label: v })} />
                  <MoneyInput className="w-36" label="Amount" path="shipping.amount_minor" value={doc.shipping.amount_minor} onChange={(v) => actions.setShipping({ amount_minor: v })} />
                  <button type="button" className={removeButton} aria-label="Remove shipping" onClick={() => actions.setShipping(null)}><Icon name="trash" className="h-4 w-4" /></button>
                </div>
                <TaxChips label="Taxes on shipping" taxIds={doc.shipping.taxIds} onToggle={(id) => actions.setShipping({ taxIds: toggleId(doc.shipping.taxIds, id) })} />
              </div>
            ) : <button type="button" className={smallButton} onClick={() => actions.setShipping({ label: 'Shipping', amount_minor: 0 })}><Icon name="plus" className="h-4 w-4" /> Add shipping</button>}
          </div>
        ) : null}

        {config.features.fees ? (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-800">Extra fees</h3>
            <ul className="space-y-2">
              {doc.fees.map((fee, i) => (
                <li key={fee.id} className="space-y-2">
                  <div className="flex items-end gap-2">
                    <TextInput className="flex-1" label="Fee" path={`fees[${i}].label`} value={fee.label} onChange={(v) => actions.updateFee(fee.id, { label: v })} />
                    <MoneyInput className="w-36" label="Amount" path={`fees[${i}].amount_minor`} value={fee.amount_minor} onChange={(v) => actions.updateFee(fee.id, { amount_minor: v })} />
                    <button type="button" className={removeButton} aria-label={`Remove ${fee.label || 'fee'}`} onClick={() => actions.removeFee(fee.id)}><Icon name="trash" className="h-4 w-4" /></button>
                  </div>
                  <TaxChips label={`Taxes on ${fee.label || 'fee'}`} taxIds={fee.taxIds} onToggle={(id) => actions.updateFee(fee.id, { taxIds: toggleId(fee.taxIds, id) })} />
                </li>
              ))}
            </ul>
            <button type="button" className={`${smallButton} mt-2`} onClick={() => actions.addFee({ label: 'Service fee' })}><Icon name="plus" className="h-4 w-4" /> Add fee</button>
          </div>
        ) : null}

        <SelectInput label="Cash rounding" path="options.cashRoundingIncrement_minor" value={cashOptions.some((o) => o.value === cashValue) ? cashValue : '0'} onChange={(v) => actions.setOption('cashRoundingIncrement_minor', Number(v))} options={cashOptions} className="sm:max-w-xs" />
      </div>
    </SectionCard>
  )
}

export function PaymentsSection() {
  const { doc, totals, actions } = useStudio()
  const config = getDocumentType(doc.type)
  const f = config.features
  const money = (minor) => formatMoney(minor, doc.currency, doc.locale)
  const deposit = doc.deposit
  if (!f.deposit && !f.payments) {
    return (
      <SectionCard id="payments" title="Payments & deposits" icon="wallet" summary="Not used on this document type">
        <p className="text-sm text-slate-500">Payments are recorded on invoices and receipts; deposits on quotations and proforma invoices.</p>
      </SectionCard>
    )
  }
  const summary = f.payments ? `Balance due ${money(totals.balanceDue)}` : totals.deposit ? `Deposit ${money(totals.deposit.due)}` : 'No deposit requested'
  return (
    <SectionCard id="payments" title={f.payments ? (doc.type === 'receipt' ? 'Payment received' : 'Payments') : 'Deposit'} icon="wallet" summary={summary}>
      <div className="space-y-5">
        {f.deposit ? (
          <div className="space-y-3">
            <Segmented
              label="Deposit requested"
              value={deposit ? deposit.kind : 'none'}
              onChange={(v) => actions.setDeposit(v === 'none' ? null : { kind: v, value: v === 'percent' ? 500000 : 0, paidAmount_minor: deposit?.paidAmount_minor || 0, paidDate: deposit?.paidDate || null, method: deposit?.method || '' })}
              options={[{ value: 'none', label: 'None' }, { value: 'percent', label: 'Percent' }, { value: 'amount', label: 'Amount' }]}
            />
            {deposit ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  {deposit.kind === 'percent'
                    ? <DecimalInput label="Deposit" path="deposit.value" value={deposit.value} digits={4} suffix="%" onChange={(v) => actions.setDeposit({ ...deposit, value: v })} />
                    : <MoneyInput label="Deposit" path="deposit.value" value={deposit.value} onChange={(v) => actions.setDeposit({ ...deposit, value: v })} />}
                  <div>
                    <p className="mb-1 text-xs font-semibold text-slate-600">Deposit due</p>
                    <p className="py-2 text-sm font-semibold tabular-nums text-slate-900">{money(totals.deposit?.due || 0)}</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <MoneyInput label="Deposit received" path="deposit.paidAmount_minor" value={deposit.paidAmount_minor} onChange={(v) => actions.setDeposit({ ...deposit, paidAmount_minor: v })} />
                  <DateInput label="Received on" path="deposit.paidDate" value={deposit.paidDate} onChange={(v) => actions.setDeposit({ ...deposit, paidDate: v })} />
                  <TextInput label="Method" path="deposit.method" value={deposit.method} onChange={(v) => actions.setDeposit({ ...deposit, method: v })} placeholder="Bank transfer" />
                </div>
                <p className="text-xs text-slate-500">A received deposit is carried over as a payment when this is converted to an invoice.</p>
              </>
            ) : null}
          </div>
        ) : null}

        {f.payments ? (
          <div className="space-y-2">
            <ul className="space-y-2">
              {doc.payments.map((p, i) => (
                <li key={p.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
                    <DateInput label="Date" path={`payments[${i}].date`} value={p.date} onChange={(v) => actions.updatePayment(p.id, { date: v })} />
                    <MoneyInput label="Amount" path={`payments[${i}].amount_minor`} value={p.amount_minor} onChange={(v) => actions.updatePayment(p.id, { amount_minor: v })} />
                    <TextInput label="Method" path={`payments[${i}].method`} value={p.method} onChange={(v) => actions.updatePayment(p.id, { method: v })} placeholder="Card, cash…" />
                    <button type="button" className={removeButton} aria-label={`Remove payment ${i + 1}`} onClick={() => actions.removePayment(p.id)}><Icon name="trash" className="h-4 w-4" /></button>
                  </div>
                  {p.source === 'deposit' ? <p className="mt-1 text-xs text-slate-500">Deposit carried over from {doc.sourceNumber || 'the quotation'}</p> : null}
                </li>
              ))}
            </ul>
            <button type="button" className={smallButton} onClick={() => actions.addPayment({ date: todayIso(), amount_minor: Math.max(totals.balanceDue, 0) })}>
              <Icon name="plus" className="h-4 w-4" /> Record payment
            </button>
          </div>
        ) : null}

        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
          <span className="text-sm font-semibold text-slate-700">{f.payments ? 'Balance due' : 'Still to pay after deposit'}</span>
          <span className={`text-base font-bold tabular-nums ${totals.balanceDue < 0 ? 'text-amber-600' : 'text-slate-900'}`}>{money(totals.balanceDue)}</span>
        </div>
      </div>
    </SectionCard>
  )
}
