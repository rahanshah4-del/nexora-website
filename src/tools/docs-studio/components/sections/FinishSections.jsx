import { useId, useMemo } from 'react'
import { calculateDocument, getDocumentType } from '../../engine/index.js'
import { ACCENT_PRESETS } from '../../templates/color.js'
import DocumentPaper from '../../templates/DocumentPaper.jsx'
import { TEMPLATES } from '../../templates/registry.js'
import { PAPERS } from '../../templates/specs.js'
import { useStudio } from '../../ui/StudioContext.js'
import { Segmented, TextArea, Toggle } from '../fields.jsx'
import Icon from '../Icon.jsx'
import SectionCard from '../SectionCard.jsx'

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

const THUMB_WIDTH = 132
const A4_WIDTH_PX = (210 * 96) / 25.4

/** Live mini-preview of the current document in one template (not an image). */
function TemplateThumb({ templateId }) {
  const { previewDocument, logoUrl } = useStudio()
  const { doc, totals } = useMemo(() => {
    const d = {
      ...previewDocument,
      templateId,
      lines: previewDocument.lines.slice(0, 4),
      appearance: { ...previewDocument.appearance, paperSize: 'A4' },
    }
    return { doc: d, totals: calculateDocument(d) }
  }, [previewDocument, templateId])
  const scale = THUMB_WIDTH / A4_WIDTH_PX
  return (
    <div className="pointer-events-none relative h-[150px] overflow-hidden rounded-lg bg-white ring-1 ring-slate-200" style={{ width: THUMB_WIDTH }} aria-hidden="true" inert>
      <div className="origin-top-left" style={{ width: A4_WIDTH_PX, transform: `scale(${scale})` }}>
        <DocumentPaper doc={doc} totals={totals} logoUrl={logoUrl} />
      </div>
    </div>
  )
}

const PAPER_OPTIONS = [
  { value: 'A4', label: 'A4' },
  { value: 'Letter', label: 'Letter' },
  { value: 'Thermal80', label: '80 mm' },
  { value: 'Thermal58', label: '58 mm' },
]

export function AppearanceSection() {
  const { doc, actions } = useStudio()
  const labelId = useId()
  const templatesLabelId = useId()
  const accent = doc.appearance.accentColor
  const isPreset = ACCENT_PRESETS.some((p) => p.value === accent)
  const thermal = PAPERS[doc.appearance.paperSize]?.kind === 'receipt'
  const templates = Object.values(TEMPLATES)
  const onSwatchKey = (event) => {
    const index = ACCENT_PRESETS.findIndex((p) => p.value === accent)
    const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0
    if (!delta) return
    event.preventDefault()
    const next = ACCENT_PRESETS[(Math.max(index, 0) + delta + ACCENT_PRESETS.length) % ACCENT_PRESETS.length]
    actions.setAppearance({ accentColor: next.value })
    event.currentTarget.querySelector(`[data-value="${next.value}"]`)?.focus()
  }
  const onTemplateKey = (event) => {
    const index = templates.findIndex((t) => t.id === doc.templateId)
    const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0
    if (!delta) return
    event.preventDefault()
    const next = templates[(Math.max(index, 0) + delta + templates.length) % templates.length]
    actions.set('templateId', next.id)
    event.currentTarget.querySelector(`[data-value="${next.id}"]`)?.focus()
  }
  return (
    <SectionCard id="appearance" title="Appearance" icon="palette" summary={`${thermal ? 'Receipt' : TEMPLATES[doc.templateId]?.name || 'Classic'} · ${PAPERS[doc.appearance.paperSize]?.label || 'A4'}`}>
      <div className="space-y-5">
        <Segmented label="Paper size" value={doc.appearance.paperSize} onChange={(v) => actions.setAppearance({ paperSize: v })} options={PAPER_OPTIONS} />
        {thermal ? <p className="-mt-3 text-xs text-slate-500">Thermal paper prints a single-column black-and-white receipt; the template and colour below apply to A4 and Letter.</p> : null}

        <div>
          <p id={templatesLabelId} className="mb-2 text-xs font-semibold text-slate-600">Template</p>
          <div role="radiogroup" aria-labelledby={templatesLabelId} onKeyDown={onTemplateKey} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {templates.map((t) => {
              const active = doc.templateId === t.id || (!TEMPLATES[doc.templateId] && t.id === 'classic')
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={`${t.name}: ${t.description}`}
                  tabIndex={active ? 0 : -1}
                  data-value={t.id}
                  onClick={() => actions.set('templateId', t.id)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${active ? 'border-brand bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                  <TemplateThumb templateId={t.id} />
                  <span className={`text-xs font-semibold ${active ? 'text-brand' : 'text-slate-700'}`}>{t.name}</span>
                </button>
              )
            })}
          </div>
        </div>

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
                    className={`ds-swatch flex h-9 w-9 items-center justify-center rounded-full ring-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 ${active ? 'ring-2 ring-slate-900' : ''}`}
                    style={{ backgroundColor: preset.value }}
                  >
                    {active ? <Icon name="check" className="h-4 w-4 text-white" /> : null}
                  </button>
                )
              })}
            </div>
            <label className={`ds-swatch relative flex h-9 cursor-pointer items-center gap-2 rounded-full border border-slate-200 pl-1 pr-3 text-xs font-semibold text-slate-600 focus-within:ring-2 focus-within:ring-brand/40 ${isPreset ? '' : 'ring-2 ring-slate-900 ring-offset-2'}`}>
              <span className="h-7 w-7 rounded-full border border-slate-200" style={{ backgroundColor: accent }} />
              Custom
              <input type="color" value={accent} onChange={(e) => actions.setAppearance({ accentColor: e.target.value })} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label="Custom accent colour" />
            </label>
          </div>
        </div>
      </div>
    </SectionCard>
  )
}
