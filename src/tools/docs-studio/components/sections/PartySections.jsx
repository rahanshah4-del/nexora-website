import { useState } from 'react'
import { getDocumentType } from '../../engine/index.js'
import { ACCEPTED_IMAGE_TYPES } from '../../io/images.js'
import { useStudio } from '../../ui/StudioContext.js'
import Combobox from '../Combobox.jsx'
import { TextArea, TextInput, Toggle } from '../fields.jsx'
import Icon from '../Icon.jsx'
import SectionCard from '../SectionCard.jsx'

const TAX_ID_LABELS = ['VAT No', 'GST No', 'GSTIN', 'NTN', 'EIN', 'TRN', 'ABN', 'Tax ID']

export function TaxIdFields({ role, party, update }) {
  const listId = `ds-taxlabels-${role}`
  return (
    <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3">
      <TextInput label="Tax ID label" path={`${role}.taxIdLabel`} value={party.taxIdLabel} onChange={(v) => update({ taxIdLabel: v })} list={listId} placeholder="VAT No" />
      <datalist id={listId}>{TAX_ID_LABELS.map((l) => <option key={l} value={l} />)}</datalist>
      <TextInput label="Tax ID" path={`${role}.taxId`} value={party.taxId} onChange={(v) => update({ taxId: v })} autoComplete="off" />
    </div>
  )
}

export function LogoDrop() {
  const { doc, logoUrl, commands } = useStudio()
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const upload = async (file) => {
    if (!file) return
    setBusy(true)
    try { await commands.uploadLogo(file) } finally { setBusy(false) }
  }
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); upload(e.dataTransfer.files?.[0]) }}
      className={`flex items-center gap-4 rounded-2xl border-2 border-dashed p-3 transition-colors ${dragging ? 'border-brand bg-blue-50' : 'border-slate-200 bg-slate-50'}`}
    >
      <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        {logoUrl ? <img src={logoUrl} alt="Your logo" className="max-h-full max-w-full object-contain" /> : <Icon name="upload" className="h-6 w-6 text-slate-300" />}
      </div>
      <div className="min-w-0 flex-1 text-sm">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 font-semibold text-brand shadow-sm ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-brand/40 hover:bg-slate-50">
          <Icon name="upload" className="h-4 w-4" />
          {busy ? 'Processing…' : logoUrl ? 'Replace logo' : 'Upload logo'}
          <input type="file" accept={ACCEPTED_IMAGE_TYPES} className="sr-only" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = '' }} />
        </label>
        {doc.seller.logoAssetId ? (
          <button type="button" onClick={commands.removeLogo} className="ml-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">Remove</button>
        ) : null}
        <p className="mt-1 text-xs text-slate-500">Drag &amp; drop or choose a file. Resized to 600 px, stays in your browser.</p>
      </div>
    </div>
  )
}

export function BusinessSection() {
  const { doc, actions, businessDefault, commands } = useStudio()
  const seller = doc.seller
  const update = (patch) => actions.updateParty('seller', patch)
  return (
    <SectionCard id="business" title="Your business" icon="building" summary={seller.name || 'Name, address, logo, tax ID'}>
      <div className="space-y-4">
        <LogoDrop />
        <TextInput label="Business name" path="seller.name" value={seller.name} onChange={(v) => update({ name: v })} autoComplete="organization" />
        <TextArea label="Address" path="seller.address" value={seller.address} onChange={(v) => update({ address: v })} rows={2} autoComplete="street-address" />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput label="Email" path="seller.email" type="email" value={seller.email} onChange={(v) => update({ email: v })} autoComplete="email" />
          <TextInput label="Phone" path="seller.phone" type="tel" value={seller.phone} onChange={(v) => update({ phone: v })} autoComplete="tel" />
        </div>
        <TaxIdFields role="seller" party={seller} update={update} />
        <Toggle
          label="Save as my default business"
          description="New documents start with these details and logo."
          checked={businessDefault.enabled}
          onChange={(enabled) => commands.setBusinessDefaultEnabled(enabled)}
        />
      </div>
    </SectionCard>
  )
}

export function ClientSection() {
  const { doc, actions, repo, commands } = useStudio()
  const config = getDocumentType(doc.type)
  const client = doc.client
  const update = (patch) => actions.updateParty('client', patch)
  const [suggestions, setSuggestions] = useState([])
  const search = (q) => { repo.searchClients(q).then(setSuggestions).catch(() => {}) }
  const shipTo = doc.shipTo
  return (
    <SectionCard id="client" title={config.partyLabels.to} icon="user" summary={client.company || client.name || 'Who is this for?'}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Combobox
            label="Name"
            path="client.name"
            value={client.name}
            onChange={(v) => update({ name: v })}
            onQuery={search}
            options={suggestions.map((c) => ({ key: c.id, label: c.name || c.company, detail: [c.company !== c.name ? c.company : '', c.email].filter(Boolean).join(' · ') }))}
            onPick={(key) => {
              const c = suggestions.find((s) => s.id === key)
              if (c) update({ name: c.name, company: c.company, address: c.address, email: c.email, phone: c.phone, taxIdLabel: c.taxIdLabel, taxId: c.taxId })
            }}
            emptyText=""
            inputProps={{ autoComplete: 'off' }}
          />
          <TextInput label="Company" path="client.company" value={client.company} onChange={(v) => update({ company: v })} />
        </div>
        <TextArea label="Address" path="client.address" value={client.address} onChange={(v) => update({ address: v })} rows={2} />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput label="Email" path="client.email" type="email" value={client.email} onChange={(v) => update({ email: v })} />
          <TextInput label="Phone" path="client.phone" type="tel" value={client.phone} onChange={(v) => update({ phone: v })} />
        </div>
        <TaxIdFields role="client" party={client} update={update} />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={commands.saveClient} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
            <Icon name="save" className="h-4 w-4" /> Save client
          </button>
          <span className="text-xs text-slate-500">Saved clients appear as suggestions when you type a name.</span>
        </div>
        {config.features.shipTo ? (
          <div className="rounded-2xl bg-slate-50 p-3">
            <Toggle
              label={doc.type === 'purchase_order' ? 'Deliver to a different address' : 'Different shipping address'}
              checked={Boolean(shipTo)}
              onChange={(on) => actions.updateParty('shipTo', on ? { name: client.company || client.name } : null)}
            />
            {shipTo ? (
              <div className="mt-3 grid gap-3">
                <TextInput label="Ship-to name" path="shipTo.name" value={shipTo.name} onChange={(v) => actions.updateParty('shipTo', { name: v })} />
                <TextArea label="Ship-to address" path="shipTo.address" value={shipTo.address} onChange={(v) => actions.updateParty('shipTo', { address: v })} rows={2} />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </SectionCard>
  )
}
