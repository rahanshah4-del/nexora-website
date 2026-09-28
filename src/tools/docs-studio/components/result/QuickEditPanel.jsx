import { useEffect, useId, useRef, useState } from 'react'
import { getDocumentType } from '../../engine/index.js'
import { useStudio } from '../../ui/StudioContext.js'
import { Segmented, TextArea, TextInput } from '../fields.jsx'
import Icon from '../Icon.jsx'
import { AccentPicker, PaperPicker } from '../sections/FinishSections.jsx'
import PhoneField from '../PhoneField.jsx'
import TemplateGallery from '../TemplateGallery.jsx'
import { SimpleItems, SimpleTax, TotalsSummary } from '../wizard/StepClientItems.jsx'

/**
 * Edit the essentials next to the preview (side panel on desktop, bottom
 * drawer on mobile); the preview updates as you type.
 */
export default function QuickEditPanel({ onClose, drawer = false }) {
  const { doc, actions, setView, commands, pdfBusy } = useStudio()
  const [tab, setTab] = useState('items')
  const rootRef = useRef(null)
  const galleryLabel = useId()
  const config = getDocumentType(doc.type)
  const client = doc.client
  const update = (patch) => actions.updateParty('client', patch)

  useEffect(() => {
    if (drawer) rootRef.current?.querySelector('[role="radio"][aria-checked="true"]')?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawer, onClose])

  return (
    <div ref={rootRef} className="ds-quick p-4" data-testid="quick-edit">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-display text-base font-semibold text-slate-900">Quick edit</h3>
        <button type="button" onClick={onClose} aria-label="Close quick edit" className="flex h-[44px] w-[44px] items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
          <Icon name="x" className="h-5 w-5" />
        </button>
      </div>
      <Segmented
        label="Edit"
        srOnlyLabel
        value={tab}
        onChange={setTab}
        options={[{ value: 'client', label: 'Client' }, { value: 'items', label: 'Items' }, { value: 'design', label: 'Design' }]}
      />
      <div className="mt-4 space-y-4">
        {tab === 'client' ? (
          <>
            <TextInput label={`${config.partyLabels.to} — name`} path="client.name" value={client.name} onChange={(v) => update({ name: v })} autoComplete="off" />
            <TextInput label="Email" path="client.email" type="email" value={client.email} onChange={(v) => update({ email: v })} autoComplete="off" />
            <PhoneField label="Phone (for WhatsApp)" path="client.phone" value={client.phone} onChange={(v) => update({ phone: v })} locale={doc.locale} />
            <TextArea label="Address" path="client.address" value={client.address} onChange={(v) => update({ address: v })} rows={2} />
          </>
        ) : null}
        {tab === 'items' ? (
          <>
            <SimpleItems dense />
            {config.features.pricing ? <><SimpleTax /><TotalsSummary /></> : null}
          </>
        ) : null}
        {tab === 'design' ? (
          <>
            <div>
              <p id={galleryLabel} className="mb-2 text-xs font-semibold text-slate-600">Template</p>
              <TemplateGallery labelId={galleryLabel} columns="grid-cols-2" compact />
            </div>
            <AccentPicker />
            <PaperPicker size="sm" />
          </>
        ) : null}
      </div>
      <button
        type="button"
        onClick={commands.downloadPdf}
        disabled={pdfBusy}
        aria-busy={pdfBusy || undefined}
        className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-sm hover:bg-brand-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-wait disabled:opacity-80"
        data-testid="quick-edit-pdf"
      >
        {pdfBusy ? <span className="ds-spinner h-4 w-4" aria-hidden="true" /> : <Icon name="download" className="h-4 w-4" />}
        {pdfBusy ? 'Creating PDF…' : 'Download PDF'}
      </button>
      <div className="mt-4 border-t border-slate-100 pt-3">
        <button type="button" onClick={() => setView('advanced')} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40" data-testid="open-advanced">
          <Icon name="layout" className="h-4 w-4" />Open the advanced editor
        </button>
        <p className="px-2 text-xs text-slate-500">Every field: dates, numbering, discounts, deposits, payments, notes.</p>
      </div>
    </div>
  )
}
