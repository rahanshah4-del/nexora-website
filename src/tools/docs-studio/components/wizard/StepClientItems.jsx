import { useCallback, useId, useMemo, useState } from 'react'
import {
  DOCUMENT_TYPE_IDS, formatMoney, getDocumentType, primaryTax, taxIdsForNewLine,
} from '../../engine/index.js'
import { buildTotalsRows } from '../../templates/summary.js'
import { currencyOptions } from '../../ui/currencies.js'
import { fieldId } from '../../ui/issues.js'
import { StudioContext, useStudio } from '../../ui/StudioContext.js'
import { DecimalInput, MoneyInput, TextArea, TextInput } from '../fields.jsx'
import Icon from '../Icon.jsx'
import SearchSelect from '../SearchSelect.jsx'
import { PaymentsSection, TaxesSection } from '../sections/AdjustmentSections.jsx'
import DetailsSection from '../sections/DetailsSection.jsx'
import { NotesSection } from '../sections/FinishSections.jsx'
import ShareMessageSection from '../sections/ShareMessageSection.jsx'
import PhoneField from '../PhoneField.jsx'
import { WizardFooter } from './Wizard.jsx'

const rowLabel = 'mb-1 block text-xs font-semibold text-slate-600 sm:sr-only'

/**
 * Description / qty / price rows with a live line amount. Shared by the
 * wizard and the result screen's quick edit panel.
 */
export function SimpleItems({ dense = false }) {
  const { doc, actions, totals } = useStudio()
  const pricing = getDocumentType(doc.type).features.pricing
  const amounts = useMemo(() => new Map(totals.lines.map((l) => [l.id, l.net])), [totals.lines])
  const add = () => {
    const index = doc.lines.length
    actions.addLine({ taxIds: taxIdsForNewLine(doc) })
    requestAnimationFrame(() => document.getElementById(fieldId(`lines[${index}].description`))?.focus())
  }
  const cols = pricing ? 'sm:grid-cols-[minmax(0,1fr)_5rem_8.5rem_7rem_2.75rem]' : 'sm:grid-cols-[minmax(0,1fr)_6rem_2.75rem]'
  return (
    <div>
      <div className={`hidden gap-3 px-1 pb-1.5 text-xs font-semibold text-slate-500 sm:grid ${cols} ${dense ? 'sm:hidden' : ''}`} aria-hidden="true">
        <span>Description</span><span className="text-right">Qty</span>
        {pricing ? <><span className="text-right">Price</span><span className="text-right">Amount</span></> : null}
        <span />
      </div>
      <ul className="space-y-3 sm:space-y-2" aria-label="Items">
        {doc.lines.map((line, i) => (
          <li key={line.id} className={`ds-row-enter relative grid grid-cols-[minmax(0,0.75fr)_minmax(0,1.3fr)_minmax(0,1fr)] gap-x-3 gap-y-3 rounded-2xl border border-slate-200 bg-white p-3 pr-12 ${dense ? '' : `sm:items-start sm:gap-y-0 sm:rounded-none sm:border-0 sm:p-0 sm:pr-0 ${cols}`}`}>
            <TextInput
              className={`col-span-3 ${dense ? '' : 'sm:col-span-1'}`}
              label={`Item ${i + 1} description`}
              labelClassName={dense ? 'mb-1 block text-xs font-semibold text-slate-600' : rowLabel}
              path={`lines[${i}].description`}
              value={line.description}
              onChange={(v) => actions.updateLine(line.id, { description: v })}
              placeholder="What did you sell or do?"
            />
            <DecimalInput label="Qty" labelClassName={dense ? undefined : rowLabel} path={`lines[${i}].qty_milli`} value={line.qty_milli} digits={3} onChange={(v) => actions.updateLine(line.id, { qty_milli: v })} />
            {pricing ? (
              <>
                <MoneyInput label="Price" labelClassName={dense ? undefined : rowLabel} path={`lines[${i}].unitPrice_minor`} value={line.unitPrice_minor} onChange={(v) => actions.updateLine(line.id, { unitPrice_minor: v })} />
                <div className="min-w-0">
                  <p className={dense ? 'mb-1 text-xs font-semibold text-slate-600' : `${rowLabel.replace('sm:sr-only', 'sm:hidden')}`}>Amount</p>
                  <p className="flex h-[44px] items-center justify-end truncate text-right text-sm font-semibold tabular-nums text-slate-900" aria-live="off">{formatMoney(amounts.get(line.id) || 0, doc.currency, doc.locale)}</p>
                </div>
              </>
            ) : null}
            <button
              type="button"
              onClick={() => actions.removeLine(line.id)}
              aria-label={`Remove item ${i + 1}`}
              className={`absolute right-1 top-1 flex h-[44px] w-[44px] items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 ${dense ? '' : 'sm:static sm:self-end'}`}
            >
              <Icon name="trash" className="h-[18px] w-[18px]" />
            </button>
          </li>
        ))}
      </ul>
      {!doc.lines.length ? <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">No items yet.</p> : null}
      <button type="button" onClick={add} className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-xl px-3 text-sm font-semibold text-brand hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40" data-testid="add-item">
        <Icon name="plus" className="h-4 w-4" />Add item
      </button>
    </div>
  )
}

/** The one "Tax %" field: a single ordinary tax on every item. */
export function SimpleTax() {
  const { doc, actions } = useStudio()
  const tax = primaryTax(doc)
  const extra = doc.taxes.length > (tax ? 1 : 0)
  return (
    <DecimalInput
      label={tax && tax.name && tax.name !== 'Tax' ? `${tax.name} %` : 'Tax %'}
      path={tax ? `taxes[${doc.taxes.indexOf(tax)}].rate_micro` : undefined}
      value={tax ? tax.rate_micro : 0}
      digits={4}
      suffix="%"
      blankZero
      placeholder="0"
      hint={extra ? 'More taxes are set under More options.' : 'Leave empty for no tax.'}
      onChange={(v) => actions.setSimpleTax(v)}
    />
  )
}

export function TotalsSummary() {
  const { previewDocument, totals } = useStudio()
  const rows = buildTotalsRows(previewDocument, totals)
  if (!rows.length) return null
  const money = (v) => formatMoney(v, previewDocument.currency, previewDocument.locale)
  return (
    <dl className="space-y-1.5 rounded-2xl bg-slate-50 p-4 text-sm tabular-nums" data-testid="wizard-totals">
      {rows.map((row) => (
        <div key={row.key} className={`flex items-baseline justify-between gap-4 ${row.tone === 'grand' || row.tone === 'balance' ? 'border-t border-slate-200 pt-2 text-base font-semibold text-slate-900' : 'text-slate-600'}`}>
          <dt className="min-w-0 truncate">{row.label}</dt>
          <dd className="shrink-0">{money(row.amount)}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Everything beyond the essentials, collapsed by default: the full editor's
 * details, taxes & adjustments, payments & deposits, and notes cards (each
 * with its own open state, all closed at first).
 */
function MoreOptions() {
  const studio = useStudio()
  const [open, setOpen] = useState(false)
  const [openSections, setOpenSections] = useState(() => new Set())
  const toggleSection = useCallback((id, force) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (force ?? !next.has(id)) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])
  const value = useMemo(() => ({ ...studio, openSections, toggleSection }), [studio, openSections, toggleSection])
  const bodyId = useId()
  return (
    <div className="ds-more rounded-2xl border border-slate-200">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[56px] w-full items-center gap-3 rounded-2xl px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40"
        data-testid="more-options"
      >
        <Icon name="sliders" className="h-5 w-5 shrink-0 text-slate-400" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-800">More options</span>
          <span className="block text-xs text-slate-500">Due date, discounts, shipping, deposits, notes, more taxes, message…</span>
        </span>
        <Icon name="chevronDown" className={`h-5 w-5 shrink-0 text-slate-400 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
      </button>
      <div id={bodyId} className={`ds-collapse ${open ? 'ds-collapse-open' : ''}`} inert={open ? undefined : true}>
        <div className="ds-collapse-inner">
          <StudioContext.Provider value={value}>
            <div className="space-y-3 border-t border-slate-200 p-3">
              <DetailsSection />
              <TaxesSection />
              <PaymentsSection />
              <NotesSection />
              <ShareMessageSection />
            </div>
          </StudioContext.Provider>
        </div>
      </div>
    </div>
  )
}

/** Step 2 — who it is for and what it is for. */
export default function StepClientItems({ headingRef }) {
  const { doc, actions, commands, setWizardStep } = useStudio()
  const config = getDocumentType(doc.type)
  const client = doc.client
  const [attempted, setAttempted] = useState(false)
  const typeId = useId()
  const update = (patch) => actions.updateParty('client', patch)
  const clientMissing = !client.name.trim() && !client.company.trim()
  const itemsMissing = !doc.lines.some((l) => l.description.trim())

  const next = () => {
    if (clientMissing || itemsMissing) {
      setAttempted(true)
      document.getElementById(clientMissing ? 'ds-f-client-name' : fieldId('lines[0].description'))?.focus()
      return
    }
    setWizardStep(3)
  }

  return (
    <div>
      {doc.seller.name || doc.appearance.letterhead ? (
        <p className="mb-4 flex flex-wrap items-center gap-x-2 text-sm text-slate-500">
          <span>From <strong className="font-semibold text-slate-700">{doc.seller.name || 'your letterhead'}</strong></span>
          <span aria-hidden="true">·</span>
          <button type="button" onClick={() => setWizardStep(1)} className="min-h-[44px] rounded-lg font-semibold text-brand underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40" data-testid="edit-business">Edit business details</button>
        </p>
      ) : null}
      <h2 ref={headingRef} tabIndex={-1} className="font-display text-2xl font-semibold tracking-tight text-slate-900 focus:outline-none sm:text-[1.7rem]">Client &amp; items</h2>
      <p className="mt-1 text-sm text-slate-600 sm:text-base">A name and one item are enough. Everything else is optional.</p>

      <div className="mt-6 space-y-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="min-w-0">
            <label htmlFor={typeId} className="mb-1 block text-xs font-semibold text-slate-600">Document type</label>
            <select
              id={typeId}
              value={doc.type}
              onChange={(e) => commands.switchType(e.target.value)}
              className="block h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 pr-8 text-base text-slate-900 shadow-sm focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 sm:text-sm"
              data-testid="doc-type"
            >
              {DOCUMENT_TYPE_IDS.map((type) => <option key={type} value={type}>{getDocumentType(type).label}</option>)}
            </select>
          </div>
          <SearchSelect label="Currency" value={doc.currency} options={currencyOptions()} onChange={(code) => actions.setCurrency(code)} placeholder="Search currencies" />
        </div>

        <fieldset className="space-y-4">
          <legend className="mb-3 text-sm font-semibold text-slate-800">{config.partyLabels.to}</legend>
          <TextInput label="Client name (required)" path="client.name" value={client.name} onChange={(v) => update({ name: v })} autoComplete="off" placeholder="Person or company" aria-required="true" />
          {attempted && clientMissing ? <p role="alert" className="-mt-2 text-sm font-medium text-rose-600">Add who this {config.label.toLowerCase()} is for.</p> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Email" path="client.email" type="email" value={client.email} onChange={(v) => update({ email: v })} inputMode="email" autoComplete="off" />
            <PhoneField label="Phone (for WhatsApp)" path="client.phone" value={client.phone} onChange={(v) => update({ phone: v })} locale={doc.locale} />
          </div>
          <TextArea label="Address" path="client.address" value={client.address} onChange={(v) => update({ address: v })} rows={2} />
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-sm font-semibold text-slate-800">Items</legend>
          <SimpleItems />
          {attempted && itemsMissing ? <p role="alert" className="mt-2 text-sm font-medium text-rose-600">Describe at least one item.</p> : null}
        </fieldset>

        {config.features.pricing ? (
          <div className="grid gap-4 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:items-start">
            <SimpleTax />
            <TotalsSummary />
          </div>
        ) : null}

        <MoreOptions />
      </div>

      <WizardFooter onBack={() => setWizardStep(1)} backLabel="Business" primaryLabel="Choose design" onPrimary={next} primaryTestId="wizard-next" />
    </div>
  )
}
