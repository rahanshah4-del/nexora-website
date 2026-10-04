import { useId } from 'react'
import { REGION_PRESETS, getRegionPreset } from '../../ui/regionPresets.js'
import { useStudio } from '../../ui/StudioContext.js'
import { Toggle } from '../fields.jsx'

/**
 * "Where is your business?" — one tap sets currency, number format, tax-ID
 * labels and (for registered businesses) the invoice title and usual tax.
 */
export default function RegionPicker({ compact = false }) {
  const { region, commands } = useStudio()
  const labelId = useId()
  const preset = getRegionPreset(region?.code)
  const pick = (code) => commands.setRegion(code ? { code, registered: region?.code === code ? region.registered : false } : null)
  const chip = (active) => `inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${active ? 'border-brand bg-blue-50 text-brand' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`
  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <p id={labelId} className="text-sm font-semibold text-slate-800">Where is your business?</p>
      <div role="radiogroup" aria-labelledby={labelId} className="flex flex-wrap gap-2">
        {REGION_PRESETS.map((p) => (
          <button key={p.code} type="button" role="radio" aria-checked={region?.code === p.code} onClick={() => pick(p.code)} className={chip(region?.code === p.code)}>
            <span aria-hidden="true">{p.flag}</span>{p.name}
          </button>
        ))}
        <button type="button" role="radio" aria-checked={!region} onClick={() => pick(null)} className={chip(!region)}>
          Other / set manually
        </button>
      </div>
      {preset ? (
        <div className="space-y-2 rounded-2xl bg-slate-50 p-3">
          <p className="text-xs text-slate-600">
            {preset.currency} · {preset.sellerTaxIdLabel} · {preset.wordsSystem === 'indian' ? 'Lakh / crore' : 'Million / billion'}
          </p>
          {preset.registeredLabel ? (
            <Toggle
              label={preset.registeredLabel}
              description={`Adds “${preset.invoiceTitle}” as the invoice title and a ${preset.tax.name} ${preset.tax.rate_micro / 10000}% line you can change.`}
              checked={Boolean(region.registered)}
              onChange={(registered) => commands.setRegion({ code: preset.code, registered })}
            />
          ) : null}
          <p className="text-xs text-slate-500">{preset.note}</p>
        </div>
      ) : null}
    </div>
  )
}
