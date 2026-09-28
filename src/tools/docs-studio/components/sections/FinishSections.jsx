import { useId } from 'react'
import { getDocumentType } from '../../engine/index.js'
import { ACCENT_PRESETS } from '../../templates/color.js'
import { getTemplate } from '../../templates/registry.js'
import { PAPERS } from '../../templates/specs.js'
import { useStudio } from '../../ui/StudioContext.js'
import { Segmented, TextArea, Toggle } from '../fields.jsx'
import Icon from '../Icon.jsx'
import SectionCard from '../SectionCard.jsx'
import LetterheadFitNotice from '../LetterheadFitNotice.jsx'
import TemplateGallery from '../TemplateGallery.jsx'

export function NotesSection() {
  const { doc, actions, amountInWords } = useStudio()
  const pricing = getDocumentType(doc.type).features.pricing
  return (
    <SectionCard id="notes" title="Notes & terms" icon="note" summary={doc.notes ? doc.notes.split('\n')[0] : 'Notes, terms, footer, amount in words'}>
      <div className="space-y-4">
        <TextArea label="Notes" path="notes" value={doc.notes} onChange={(v) => actions.set('notes', v)} rows={2} placeholder="Thank you for your business!" />
        <TextArea label="Terms & conditions" path="terms" value={doc.terms} onChange={(v) => actions.set('terms', v)} rows={2} placeholder="Payment terms, bank details, late fees…" />
        <TextArea label="Footer" path="footer" value={doc.footer} onChange={(v) => actions.set('footer', v)} rows={1} placeholder="Company registration, website…" />
        {pricing ? (
          <div className="space-y-3 rounded-2xl bg-slate-50 p-3">
            <Toggle label="Show amount in words" checked={doc.options.showAmountInWords} onChange={(v) => actions.setOption('showAmountInWords', v)} />
            {doc.options.showAmountInWords ? (
              <>
                <Segmented
                  label="Number system"
                  size="sm"
                  value={doc.options.wordsSystem}
                  onChange={(v) => actions.setOption('wordsSystem', v)}
                  options={[{ value: 'western', label: 'Million / billion' }, { value: 'indian', label: 'Lakh / crore' }]}
                />
                <p className="text-xs italic text-slate-600">{amountInWords}</p>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </SectionCard>
  )
}

const PAPER_OPTIONS = [
  { value: 'A4', label: 'A4' },
  { value: 'Letter', label: 'Letter' },
  { value: 'Thermal80', label: '80 mm' },
  { value: 'Thermal58', label: '58 mm' },
]

/** Paper size (A4 / Letter / thermal 80 / 58 mm) with a note for thermal. */
export function PaperPicker({ size = 'md' }) {
  const { doc, actions } = useStudio()
  const thermal = PAPERS[doc.appearance.paperSize]?.kind === 'receipt'
  return (
    <div>
      <Segmented label="Paper size" size={size} value={doc.appearance.paperSize} onChange={(v) => actions.setAppearance({ paperSize: v })} options={PAPER_OPTIONS} />
      {thermal ? <p className="mt-2 text-xs text-slate-500">Thermal paper prints a single-column black-and-white receipt; templates and colours apply to A4 and Letter.</p> : null}
      {doc.appearance.letterhead && !thermal ? <div className="mt-2"><LetterheadFitNotice /></div> : null}
    </div>
  )
}

/** Accent colour presets plus a custom colour. */
export function AccentPicker() {
  const { doc, actions } = useStudio()
  const labelId = useId()
  const accent = doc.appearance.accentColor
  const isPreset = ACCENT_PRESETS.some((p) => p.value === accent)
  const onSwatchKey = (event) => {
    const index = ACCENT_PRESETS.findIndex((p) => p.value === accent)
    const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0
    if (!delta) return
    event.preventDefault()
    const next = ACCENT_PRESETS[(Math.max(index, 0) + delta + ACCENT_PRESETS.length) % ACCENT_PRESETS.length]
    actions.setAppearance({ accentColor: next.value })
    event.currentTarget.querySelector(`[data-value="${next.value}"]`)?.focus()
  }
  return (
    <div>
      <p id={labelId} className="mb-2 text-xs font-semibold text-slate-600">Accent colour</p>
      <div className="flex flex-wrap items-center gap-2.5">
        <div role="radiogroup" aria-labelledby={labelId} className="flex flex-wrap gap-2.5" onKeyDown={onSwatchKey}>
          {ACCENT_PRESETS.map((preset) => {
            const active = preset.value === accent
            return (
              <button
                key={preset.value}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={preset.name}
                title={preset.name}
                tabIndex={active || (!isPreset && preset === ACCENT_PRESETS[0]) ? 0 : -1}
                data-value={preset.value}
                onClick={() => actions.setAppearance({ accentColor: preset.value })}
                className={`ds-swatch flex h-[44px] w-[44px] items-center justify-center rounded-full ring-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 sm:h-9 sm:w-9 ${active ? 'ring-2 ring-slate-900' : ''}`}
                style={{ backgroundColor: preset.value }}
              >
                {active ? <Icon name="check" className="h-4 w-4 text-white" /> : null}
              </button>
            )
          })}
        </div>
        <label className={`ds-swatch relative flex h-[44px] cursor-pointer items-center gap-2 rounded-full border border-slate-200 pl-1 pr-3 text-xs font-semibold text-slate-600 focus-within:ring-2 focus-within:ring-brand/40 sm:h-9 ${isPreset ? '' : 'ring-2 ring-slate-900 ring-offset-2'}`}>
          <span className="h-8 w-8 rounded-full border border-slate-200 sm:h-7 sm:w-7" style={{ backgroundColor: accent }} />
          Custom
          <input type="color" value={accent} onChange={(e) => actions.setAppearance({ accentColor: e.target.value })} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label="Custom accent colour" />
        </label>
      </div>
    </div>
  )
}

export function AppearanceSection() {
  const { doc } = useStudio()
  const templatesLabelId = useId()
  const thermal = PAPERS[doc.appearance.paperSize]?.kind === 'receipt'
  return (
    <SectionCard id="appearance" title="Appearance" icon="palette" summary={`${thermal ? 'Receipt' : getTemplate(doc.templateId).name} · ${PAPERS[doc.appearance.paperSize]?.label || 'A4'}`}>
      <div className="space-y-5">
        <PaperPicker />
        <div>
          <p id={templatesLabelId} className="mb-2 text-xs font-semibold text-slate-600">Template</p>
          <TemplateGallery labelId={templatesLabelId} columns="grid-cols-2 sm:grid-cols-4" compact />
        </div>
        <AccentPicker />
      </div>
    </SectionCard>
  )
}
