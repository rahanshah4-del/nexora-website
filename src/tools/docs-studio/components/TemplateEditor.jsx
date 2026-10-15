import { useEffect, useId } from 'react'
import { ENUMS } from '../templates/schema.js'
import { applyReceiptCustom, effectiveTemplate, getReceiptStyle, PAPERS } from '../templates/specs.js'
import { useStudio } from '../ui/StudioContext.js'
import Icon from './Icon.jsx'
import { TemplateThumb } from './TemplateGallery.jsx'

const FONT_LABELS = { inter: 'Inter (clean)', sora: 'Sora (rounded)', system: 'System', serif: 'Serif (classic)', mono: 'Mono (typewriter)' }
const CASE = [['upper', 'UPPERCASE'], ['none', 'Normal']]
const HEADER_STYLES = [['band', 'Top stripe'], ['fullBand', 'Full colour band'], ['plain', 'Plain']]
const TABLE_STYLES = [['filled', 'Filled header'], ['tinted', 'Tinted header'], ['underline', 'Underlined'], ['lined', 'Row lines'], ['boxed', 'Boxed grid']]

function Group({ title, children }) {
  return (
    <fieldset className="space-y-3 border-b border-slate-100 pb-5 last:border-0">
      <legend className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">{title}</legend>
      {children}
    </fieldset>
  )
}

function Select({ label, value, onChange, options }) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-slate-600">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25">
        {options.map(([v, l]) => <option key={String(v)} value={v}>{l}</option>)}
      </select>
    </div>
  )
}

function Range({ label, value, onChange, min, max, step = 1, unit = '' }) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-1 flex justify-between text-xs font-semibold text-slate-600"><span>{label}</span><span className="tabular-nums text-slate-500">{Math.round(value * 100) / 100}{unit}</span></label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[var(--ds-brand,#0071e3)]" />
    </div>
  )
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-1 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/40" />
    </label>
  )
}

function ColorField({ label, value, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm text-slate-700">
      <span>{label}</span>
      <span className="flex items-center gap-2">
        <span className="font-mono text-xs uppercase text-slate-400">{value}</span>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-10 cursor-pointer rounded border border-slate-200 bg-white p-0.5" aria-label={label} />
      </span>
    </label>
  )
}

/** Every setting of the chosen design, editable. Changes apply to the document at once; "Reset" returns to the design as shipped. */
export function TemplateEditor({ onClose }) {
  const { doc, actions } = useStudio()
  const paper = PAPERS[doc.appearance.paperSize] || PAPERS.A4
  const receipt = paper.kind === 'receipt'
  const custom = doc.appearance.custom || {}
  const spec = effectiveTemplate(doc.templateId, doc.appearance.custom)
  const style = applyReceiptCustom(getReceiptStyle(doc.templateId), doc.appearance.custom)

  useEffect(() => {
    const previous = document.activeElement
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); previous?.focus?.() }
  }, [onClose])

  /** set('header', 'style', 'plain') → custom.header.style = 'plain' */
  const set = (section, key, value) => {
    const next = { ...custom, [section]: { ...(custom[section] || {}), [key]: value } }
    actions.setAppearance({ custom: next })
  }
  const setLayout = (layout) => actions.setAppearance({ custom: { ...custom, layout } })
  const reset = () => actions.setAppearance({ custom: null })
  const edited = Boolean(doc.appearance.custom)

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/50 backdrop-blur-sm sm:items-center sm:p-6" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div role="dialog" aria-modal="true" aria-labelledby="ds-edit-title" data-testid="template-editor" className="ds-pop flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-lift sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <h2 id="ds-edit-title" className="font-display text-lg font-semibold text-slate-900 sm:text-xl">Customize design</h2>
            <p className="mt-0.5 text-sm text-slate-500">{receipt ? `${paper.label} receipt` : spec.name}. Every change shows in the preview at once.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close editor" className="rounded-full p-2 text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"><Icon name="x" className="h-5 w-5" /></button>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 overflow-hidden md:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-h-0 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
            {receipt ? (
              <>
                <Group title="Text">
                  <Range label="Text size" value={style.sizeScale} min={0.8} max={1.4} step={0.05} unit="×" onChange={(v) => set('receipt', 'sizeScale', v)} />
                  <Range label="Business name size" value={style.brandScale} min={0.7} max={1.8} step={0.05} unit="×" onChange={(v) => set('receipt', 'brandScale', v)} />
                  <Range label="Total size" value={style.totalScale} min={0.8} max={1.8} step={0.05} unit="×" onChange={(v) => set('receipt', 'totalScale', v)} />
                </Group>
                <Group title="Layout">
                  <Select label="Alignment" value={style.align} onChange={(v) => set('receipt', 'align', v)} options={[['center', 'Centred'], ['left', 'Left']]} />
                  <Select label="Divider lines" value={style.rule} onChange={(v) => set('receipt', 'rule', v)} options={[['dashed', 'Dashed'], ['dotted', 'Dotted'], ['solid', 'Solid'], ['none', 'None']]} />
                  <Range label="Spacing" value={style.gapScale} min={0.4} max={2} step={0.05} unit="×" onChange={(v) => set('receipt', 'gapScale', v)} />
                  <Toggle label="Black title strip" checked={style.titleBar} onChange={(v) => set('receipt', 'titleBar', v)} />
                </Group>
              </>
            ) : (
              <>
                <Group title="Fonts">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Select label="Headings and title" value={spec.fonts.heading} onChange={(v) => set('fonts', 'heading', v)} options={ENUMS.font.map((f) => [f, FONT_LABELS[f] || f])} />
                    <Select label="Body text" value={spec.fonts.body} onChange={(v) => set('fonts', 'body', v)} options={ENUMS.font.map((f) => [f, FONT_LABELS[f] || f])} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Select label="Title case" value={spec.typography.titleCase} onChange={(v) => set('typography', 'titleCase', v)} options={CASE} />
                    <Select label="Title weight" value={spec.typography.titleWeight} onChange={(v) => set('typography', 'titleWeight', Number(v))} options={[[500, 'Light'], [600, 'Medium'], [700, 'Bold']]} />
                  </div>
                </Group>
                <Group title="Text size">
                  <Range label="Body text" value={spec.typography.basePt} min={7} max={12} step={0.5} unit=" pt" onChange={(v) => set('typography', 'basePt', v)} />
                  <Range label="Title" value={spec.typography.titlePt} min={12} max={40} step={1} unit=" pt" onChange={(v) => set('typography', 'titlePt', v)} />
                  <Range label="Business name" value={spec.typography.brandPt} min={9} max={28} step={0.5} unit=" pt" onChange={(v) => set('typography', 'brandPt', v)} />
                  <Range label="Totals" value={spec.typography.totalPt} min={8} max={20} step={0.5} unit=" pt" onChange={(v) => set('typography', 'totalPt', v)} />
                  <Range label="Line spacing" value={spec.typography.lineHeight} min={1.1} max={1.8} step={0.05} onChange={(v) => set('typography', 'lineHeight', v)} />
                </Group>
                <Group title="Colours">
                  <ColorField label="Text" value={spec.colors.text} onChange={(v) => set('colors', 'text', v)} />
                  <ColorField label="Secondary text" value={spec.colors.muted} onChange={(v) => set('colors', 'muted', v)} />
                  <ColorField label="Paper background" value={spec.colors.paper} onChange={(v) => set('colors', 'paper', v)} />
                  <ColorField label="Tinted areas" value={spec.colors.surface} onChange={(v) => set('colors', 'surface', v)} />
                  <ColorField label="Lines" value={spec.colors.border} onChange={(v) => set('colors', 'border', v)} />
                  <p className="text-xs text-slate-500">The accent colour is set in the design step.</p>
                </Group>
                <Group title="Header">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Select label="Header style" value={spec.header.style} onChange={(v) => set('header', 'style', v)} options={HEADER_STYLES} />
                    <Select label="Alignment" value={spec.header.align} onChange={(v) => set('header', 'align', v)} options={[['brandLeft', 'Business left, title right'], ['titleLeft', 'Title left, business right']]} />
                    <Select label="Title colour" value={spec.header.titleColor} onChange={(v) => set('header', 'titleColor', v)} options={[['accent', 'Accent'], ['text', 'Text']]} />
                    <Select label="Details box" value={spec.meta.style} onChange={(v) => set('meta', 'style', v)} options={[['inline', 'Open'], ['boxed', 'Boxed']]} />
                  </div>
                  <Range label="Logo height" value={spec.header.logoMaxHeightMm} min={8} max={40} unit=" mm" onChange={(v) => set('header', 'logoMaxHeightMm', v)} />
                </Group>
                <Group title="Layout">
                  <Select label="Page layout" value={spec.layout} onChange={setLayout} options={[['stacked', 'Full width'], ['sidebar', 'Side column']]} />
                  {spec.layout === 'sidebar' ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Select label="Side column colour" value={spec.sidebar.fill} onChange={(v) => set('sidebar', 'fill', v)} options={[['accent', 'Accent'], ['tint', 'Light tint']]} />
                      <Range label="Side column width" value={spec.sidebar.widthMm} min={45} max={85} unit=" mm" onChange={(v) => set('sidebar', 'widthMm', v)} />
                    </div>
                  ) : null}
                  <Range label="Top margin" value={spec.page.marginTopMm} min={6} max={40} unit=" mm" onChange={(v) => set('page', 'marginTopMm', v)} />
                  <Range label="Side margins" value={spec.page.marginXMm} min={8} max={30} unit=" mm" onChange={(v) => set('page', 'marginXMm', v)} />
                  <Range label="Bottom margin" value={spec.page.marginBottomMm} min={8} max={40} unit=" mm" onChange={(v) => set('page', 'marginBottomMm', v)} />
                  <Range label="Space between sections" value={spec.spacing.sectionMm} min={2} max={14} step={0.5} unit=" mm" onChange={(v) => set('spacing', 'sectionMm', v)} />
                </Group>
                <Group title="Items table">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Select label="Table style" value={spec.table.style} onChange={(v) => set('table', 'style', v)} options={TABLE_STYLES} />
                    <Select label="Row spacing" value={spec.table.density} onChange={(v) => set('table', 'density', v)} options={[['compact', 'Compact'], ['normal', 'Normal'], ['relaxed', 'Roomy']]} />
                  </div>
                  <Toggle label="Alternate row shading" checked={spec.table.zebra} onChange={(v) => set('table', 'zebra', v)} />
                </Group>
                <Group title="Totals">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Select label="Totals style" value={spec.totals.style} onChange={(v) => set('totals', 'style', v)} options={[['plain', 'Plain'], ['boxed', 'Boxed']]} />
                    <Select label="Amount due" value={spec.totals.balance} onChange={(v) => set('totals', 'balance', v)} options={[['fill', 'Coloured bar'], ['text', 'Coloured text']]} />
                  </div>
                  <Range label="Totals width" value={spec.totals.widthMm} min={60} max={110} unit=" mm" onChange={(v) => set('totals', 'widthMm', v)} />
                </Group>
                <Group title="Show or hide">
                  <div className="grid gap-x-4 sm:grid-cols-2">
                    {[['logo', 'Logo'], ['itemNumbers', 'Item numbers'], ['amountInWords', 'Amount in words'], ['stamp', 'Status stamp'], ['notes', 'Notes'], ['terms', 'Terms'], ['footer', 'Footer'], ['pageNumbers', 'Page numbers']].map(([key, label]) => (
                      <Toggle key={key} label={label} checked={spec.show[key]} onChange={(v) => set('show', key, v)} />
                    ))}
                  </div>
                </Group>
              </>
            )}
          </div>
          <aside className="hidden border-l border-slate-100 bg-slate-50/70 p-5 md:block" aria-label="Preview">
            <p className="mb-2 text-xs font-semibold text-slate-500">Preview</p>
            <TemplateThumb templateId={doc.templateId} paperSize={doc.appearance.paperSize} maxLines={receipt ? 5 : 6} withCustom />
          </aside>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <button type="button" onClick={reset} disabled={!edited} data-testid="template-reset" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-40">Reset to original design</button>
          <button type="button" onClick={onClose} className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">Done</button>
        </div>
      </div>
    </div>
  )
}
