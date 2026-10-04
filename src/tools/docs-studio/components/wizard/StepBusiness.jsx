import { useId, useState } from 'react'
import { useStudio } from '../../ui/StudioContext.js'
import { TextArea, TextInput } from '../fields.jsx'
import Icon from '../Icon.jsx'
import { LogoDrop, TaxIdFields } from '../sections/PartySections.jsx'
import RegionPicker from '../sections/RegionPicker.jsx'
import LetterheadPanel, { LetterheadDrop } from './LetterheadPanel.jsx'
import { WizardFooter } from './Wizard.jsx'

function BrandChoice({ mode, onChange }) {
  const labelId = useId()
  const options = [
    { value: 'logo', title: 'Logo', text: 'We design the page around your logo.', icon: 'image' },
    { value: 'letterhead', title: 'My letterhead', text: 'Print on your own letterhead (PNG, JPG or PDF).', icon: 'letterhead' },
  ]
  return (
    <div>
      <p id={labelId} className="mb-2 text-sm font-semibold text-slate-800">How should your documents look?</p>
      <div role="radiogroup" aria-labelledby={labelId} className="grid grid-cols-2 gap-3">
        {options.map((o) => {
          const active = o.value === mode
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              data-value={o.value}
              onClick={() => onChange(o.value)}
              className={`flex min-h-[88px] flex-col items-start gap-1 rounded-2xl border-2 p-3 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/25 sm:p-4 ${active ? 'border-brand bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
            >
              <span className="flex items-center gap-2">
                <Icon name={o.icon} className={`h-5 w-5 ${active ? 'text-brand' : 'text-slate-400'}`} />
                <span className="text-sm font-semibold text-slate-900">{o.title}</span>
              </span>
              <span className="text-xs leading-snug text-slate-600">{o.text}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Step 1 — who is issuing the document. Remembered on this device after "Continue". */
export default function StepBusiness({ headingRef }) {
  const { doc, actions, commands, setWizardStep, returning, preset } = useStudio()
  const seller = doc.seller
  const letterhead = doc.appearance.letterhead
  const letterheadFirst = preset?.brandMode === 'letterhead'
  const [mode, setMode] = useState(letterhead || letterheadFirst ? 'letterhead' : 'logo')
  const [showError, setShowError] = useState(false)
  const update = (patch) => actions.updateParty('seller', patch)
  const missingName = !seller.name.trim() && !letterhead

  const next = async () => {
    if (missingName) {
      setShowError(true)
      document.getElementById('ds-f-seller-name')?.focus()
      return
    }
    await commands.saveBusinessProfile()
    setWizardStep(2)
  }

  return (
    <div>
      <h2 ref={headingRef} tabIndex={-1} className="font-display text-2xl font-semibold tracking-tight text-slate-900 focus:outline-none sm:text-[1.7rem]">Your business</h2>
      <p className="mt-1 text-sm text-slate-600 sm:text-base">Enter it once. It stays on this device and fills in every new document.</p>

      <div className="mt-6 space-y-6">
        <RegionPicker />
        <BrandChoice mode={mode} onChange={setMode} />
        {mode === 'logo' ? (
          <div>
            <LogoDrop />
            {letterhead ? (
              <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                A letterhead is still set.
                <button type="button" onClick={commands.removeLetterhead} className="min-h-[44px] rounded-lg px-2 font-semibold text-rose-600 hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300">Remove letterhead</button>
              </p>
            ) : null}
          </div>
        ) : letterhead ? <LetterheadPanel /> : <LetterheadDrop highlight={letterheadFirst} />}

        <div className="space-y-4">
          <TextInput
            label={letterhead ? 'Business name' : 'Business name (required)'}
            path="seller.name"
            value={seller.name}
            onChange={(v) => { update({ name: v }); if (v.trim()) setShowError(false) }}
            autoComplete="organization"
            placeholder="e.g. Northwind Studio"
            aria-required={!letterhead}
          />
          {showError && missingName ? <p role="alert" className="-mt-2 text-sm font-medium text-rose-600">Add your business name to continue.</p> : null}
          <TextArea label="Address" path="seller.address" value={seller.address} onChange={(v) => update({ address: v })} rows={2} autoComplete="street-address" placeholder={'Street and number\nCity, postcode'} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Email" path="seller.email" type="email" value={seller.email} onChange={(v) => update({ email: v })} autoComplete="email" inputMode="email" />
            <TextInput label="Phone" path="seller.phone" type="tel" value={seller.phone} onChange={(v) => update({ phone: v })} autoComplete="tel" inputMode="tel" />
          </div>
          <TaxIdFields role="seller" party={seller} update={update} />
        </div>
      </div>

      <WizardFooter
        onBack={returning ? () => setWizardStep(2) : null}
        backLabel="Cancel"
        primaryLabel="Continue"
        onPrimary={next}
        primaryTestId="wizard-next"
      />
    </div>
  )
}
