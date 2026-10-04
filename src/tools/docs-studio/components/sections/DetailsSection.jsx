import { useMemo } from 'react'
import { addDays, dueDateFromTerms, getDocumentType } from '../../engine/index.js'
import { currencyOptions } from '../../ui/currencies.js'
import { COMMON_LOCALES, localeLabel } from '../../ui/locales.js'
import { useStudio } from '../../ui/StudioContext.js'
import { DateInput, SelectInput, TextArea, TextInput } from '../fields.jsx'
import SearchSelect from '../SearchSelect.jsx'
import SectionCard from '../SectionCard.jsx'

const TERM_PRESETS = [0, 7, 15, 30, 60]

export default function DetailsSection() {
  const { doc, actions, commands } = useStudio()
  const config = getDocumentType(doc.type)
  const f = config.features
  const set = actions.set
  const currencies = currencyOptions()
  const locales = useMemo(() => {
    const list = COMMON_LOCALES.includes(doc.locale) ? COMMON_LOCALES : [doc.locale, ...COMMON_LOCALES]
    return list.map((code) => ({ value: code, label: localeLabel(code), detail: code }))
  }, [doc.locale])

  const termsValue = doc.paymentTermsDays === null ? 'custom' : TERM_PRESETS.includes(doc.paymentTermsDays) ? String(doc.paymentTermsDays) : 'custom'

  const setIssueDate = (iso) => {
    set('issueDate', iso)
    if (f.dueDate && doc.paymentTermsDays !== null && iso) set('dueDate', dueDateFromTerms(iso, doc.paymentTermsDays))
    if (f.validUntil && iso && config.defaultValidityDays !== null && !doc.validUntil) set('validUntil', addDays(iso, config.defaultValidityDays))
  }

  return (
    <SectionCard id="details" title="Details" icon="calendar" summary={[doc.number, doc.currency, doc.locale].filter(Boolean).join(' · ')}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput label={`${config.label} number`} path="number" value={doc.number} onChange={(v) => set('number', v)} hint="Next number from your counter — edit freely." autoComplete="off" />
          <DateInput label="Issue date" path="issueDate" value={doc.issueDate} onChange={setIssueDate} />
        </div>
        {f.dueDate ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectInput
              label="Payment terms"
              path="paymentTermsDays"
              value={termsValue}
              onChange={(v) => {
                if (v === 'custom') { set('paymentTermsDays', null); return }
                const days = Number(v)
                set('paymentTermsDays', days)
                set('dueDate', dueDateFromTerms(doc.issueDate, days))
              }}
              options={[
                { value: '0', label: 'Due on receipt' },
                ...TERM_PRESETS.slice(1).map((d) => ({ value: String(d), label: `Net ${d}` })),
                { value: 'custom', label: 'Custom date' },
              ]}
            />
            <DateInput label="Due date" path="dueDate" value={doc.dueDate} onChange={(v) => { set('dueDate', v); set('paymentTermsDays', null) }} />
          </div>
        ) : null}
        {f.validUntil || f.deliveryDate ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {f.validUntil ? <DateInput label="Valid until" path="validUntil" value={doc.validUntil} onChange={(v) => set('validUntil', v)} /> : null}
            {f.deliveryDate ? <DateInput label="Delivery date" path="deliveryDate" value={doc.deliveryDate} onChange={(v) => set('deliveryDate', v)} /> : null}
          </div>
        ) : null}
        <TextInput
          label="Title on the document"
          path="titleOverride"
          value={doc.titleOverride}
          onChange={(v) => set('titleOverride', v)}
          placeholder={config.label}
          maxLength={60}
          hint={`Leave empty for “${config.label}”. e.g. Tax Invoice, VAT Invoice, Commercial Invoice.`}
          autoComplete="off"
        />
        <TextInput label={config.referenceLabel} path="reference" value={doc.reference} onChange={(v) => set('reference', v)} autoComplete="off" />
        {f.reason ? <TextArea label="Reason for credit" path="reason" value={doc.reason} onChange={(v) => set('reason', v)} rows={2} /> : null}
        {doc.sourceNumber ? (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Converted from {getDocumentType(doc.sourceType)?.label.toLowerCase() || 'document'}{' '}
            <button type="button" onClick={commands.openSource} className="font-semibold text-brand underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">{doc.sourceNumber}</button>
          </p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <SearchSelect label="Currency" value={doc.currency} options={currencies} onChange={(code) => actions.setCurrency(code)} placeholder="Search code or name…" />
          <SearchSelect label="Number & date format" value={doc.locale} options={locales} onChange={(code) => set('locale', code)} placeholder="Search language or region…" />
        </div>
      </div>
    </SectionCard>
  )
}
