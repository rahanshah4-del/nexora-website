import { useEffect, useMemo, useState } from 'react'
import { calculateDocument } from '../engine/index.js'
import DocumentPaper from '../templates/DocumentPaper.jsx'
import { designsForPaper, effectiveDesignId, FEATURED_COUNT, LIBRARY_TABS, LIBRARY_TAGS } from '../templates/library.js'
import { PAPERS } from '../templates/specs.js'
import { useFitScale } from '../ui/hooks.js'
import { asCreated } from '../ui/starter.js'
import { useStudio } from '../ui/StudioContext.js'
import Icon from './Icon.jsx'
import ScaledPaper, { MM_TO_PX } from './ScaledPaper.jsx'

/** Preview box per paper: real width, and a fixed height (receipts are cut off, like a roll). */
function boxFor(paperId) {
  const paper = PAPERS[paperId] || PAPERS.A4
  const heightMm = paper.kind === 'receipt' ? paper.widthMm * 2.1 : paper.heightMm
  return { widthPx: paper.widthMm * MM_TO_PX, heightPx: heightMm * MM_TO_PX, ratio: `${paper.widthMm} / ${heightMm}` }
}

/**
 * Live thumbnail of the visitor's own document in one template — a real
 * rendered paper (not an image), scaled to the card, first page only.
 */
export function TemplateThumb({ templateId, paperSize = null, maxLines = 6 }) {
  const { previewDocument, logoUrl, letterheadUrl, signatureUrl, sealUrl, amountInWords } = useStudio()
  const paperId = PAPERS[paperSize] ? paperSize : (PAPERS[previewDocument.appearance.paperSize]?.kind === 'page' ? previewDocument.appearance.paperSize : 'A4')
  const { doc, totals } = useMemo(() => {
    const d = {
      ...asCreated(previewDocument),
      templateId,
      lines: previewDocument.lines.slice(0, maxLines),
      appearance: { ...previewDocument.appearance, paperSize: paperId },
    }
    return { doc: d, totals: calculateDocument(d) }
  }, [previewDocument, templateId, maxLines, paperId])
  const box = boxFor(paperId)
  const [ref, scale] = useFitScale(box.widthPx)
  return (
    <div ref={ref} className="pointer-events-none relative w-full overflow-hidden rounded-lg bg-white ring-1 ring-slate-200" style={{ aspectRatio: box.ratio }} aria-hidden="true" inert data-analytics-ignore>
      {scale > 0 ? (
        <ScaledPaper scale={scale} widthPx={box.widthPx} estimatedHeightPx={box.heightPx}>
          <DocumentPaper doc={doc} totals={totals} logoUrl={logoUrl} letterheadUrl={letterheadUrl} signatureUrl={signatureUrl} sealUrl={sealUrl} amountWords={amountInWords} />
        </ScaledPaper>
      ) : null}
    </div>
  )
}

/** One selectable design card. */
function DesignCard({ design, paperSize, active, maxLines, compact, onSelect, tabIndex = 0 }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={`${design.name}: ${design.description}`}
      tabIndex={tabIndex}
      data-value={design.id}
      onClick={() => onSelect(design.id)}
      className={`group relative flex min-w-0 flex-col gap-2 rounded-2xl border-2 bg-white p-2 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/25 ${active ? 'border-brand shadow-md' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}
    >
      <TemplateThumb templateId={design.id} paperSize={paperSize} maxLines={maxLines} />
      <span className="flex items-start justify-between gap-2 px-1 pb-0.5">
        <span className="min-w-0">
          <span className={`block text-sm font-semibold ${active ? 'text-brand' : 'text-slate-800'}`}>{design.name}</span>
          {compact ? null : <span className="mt-0.5 block text-xs leading-snug text-slate-500">{design.description}</span>}
        </span>
        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${active ? 'bg-brand text-white' : 'border border-slate-300 bg-white'}`} aria-hidden="true">
          {active ? <Icon name="check" className="h-3.5 w-3.5" /> : null}
        </span>
      </span>
    </button>
  )
}

/**
 * Full template library: every design for every paper size, with paper tabs
 * and style filters. Choosing one sets the template AND its paper size.
 */
export function TemplateLibrary({ onClose }) {
  const { doc, actions } = useStudio()
  const [paper, setPaper] = useState(doc.appearance.paperSize in PAPERS ? doc.appearance.paperSize : 'A4')
  const [tag, setTag] = useState('all')
  useEffect(() => {
    const previous = document.activeElement
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); previous?.focus?.() }
  }, [onClose])
  const designs = designsForPaper(paper).filter((d) => tag === 'all' || d.tags.includes(tag))
  const current = effectiveDesignId(doc.appearance.paperSize, doc.templateId)
  const choose = (id) => {
    if (doc.appearance.paperSize !== paper) actions.setAppearance({ paperSize: paper })
    actions.set('templateId', id)
    onClose()
  }
  const receipt = PAPERS[paper].kind === 'receipt'
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-6" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div role="dialog" aria-modal="true" aria-labelledby="ds-lib-title" data-testid="template-library" className="ds-pop flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-lift sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <h2 id="ds-lib-title" className="font-display text-lg font-semibold text-slate-900 sm:text-xl">Template library</h2>
            <p className="mt-0.5 text-sm text-slate-500">Pick any design. Its paper size is set for you.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close library" className="rounded-full p-2 text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"><Icon name="x" className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3 border-b border-slate-100 px-5 py-3 sm:px-6">
          <div role="tablist" aria-label="Paper size" className="flex flex-wrap gap-1.5">
            {LIBRARY_TABS.map((t) => (
              <button key={t.paper} type="button" role="tab" aria-selected={paper === t.paper} onClick={() => { setPaper(t.paper); setTag('all') }}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${paper === t.paper ? 'bg-brand text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5" aria-label="Style filter">
            {LIBRARY_TAGS.map((t) => (
              <button key={t.id} type="button" aria-pressed={tag === t.id} onClick={() => setTag(t.id)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${tag === t.id ? 'border-brand bg-brand/10 text-brand' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-y-auto px-5 py-5 sm:px-6">
          {receipt ? <p className="mb-4 text-xs text-slate-500">Thermal rolls print a black-and-white receipt. These styles change the layout, lines and type size.</p> : null}
          {designs.length ? (
            <div role="radiogroup" aria-label="Designs" className={`grid gap-3 sm:gap-4 ${receipt ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'}`}>
              {designs.map((d) => (
                <DesignCard key={d.id} design={d} paperSize={paper} maxLines={receipt ? 5 : 6} compact={false} active={doc.appearance.paperSize === paper && current === d.id} onSelect={choose} />
              ))}
            </div>
          ) : <p className="py-10 text-center text-sm text-slate-500">No designs match this filter for this paper size.</p>}
        </div>
      </div>
    </div>
  )
}

/**
 * The template picker: a radio group of live thumbnails — the first few
 * designs for the current paper, then a "More designs" tile that opens the
 * full library.
 * @param {{ columns?: string, compact?: boolean }} props
 */
export default function TemplateGallery({ columns = 'grid-cols-2 lg:grid-cols-5', compact = false, labelId }) {
  const { doc, actions } = useStudio()
  const [open, setOpen] = useState(false)
  const paperId = doc.appearance.paperSize
  const all = designsForPaper(paperId)
  const selected = effectiveDesignId(paperId, doc.templateId)
  // Always show the chosen design: if it is beyond the featured ones, it takes the last slot.
  const featured = all.slice(0, FEATURED_COUNT)
  if (!featured.some((d) => d.id === selected)) featured[FEATURED_COUNT - 1] = all.find((d) => d.id === selected)
  const pick = (id) => actions.set('templateId', id)
  const onKeyDown = (event) => {
    const index = featured.findIndex((t) => t.id === selected)
    const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0
    if (!delta) return
    event.preventDefault()
    const next = featured[(index + delta + featured.length) % featured.length]
    pick(next.id)
    event.currentTarget.querySelector(`[data-value="${next.id}"]`)?.focus()
  }
  return (
    <>
      <div role="radiogroup" aria-labelledby={labelId} onKeyDown={onKeyDown} className={`grid gap-3 sm:gap-4 ${columns}`}>
        {featured.map((d) => (
          <DesignCard key={d.id} design={d} paperSize={paperId} maxLines={compact ? 4 : 6} compact={compact} active={d.id === selected} tabIndex={d.id === selected ? 0 : -1} onSelect={pick} />
        ))}
        <button
          type="button"
          onClick={() => setOpen(true)}
          data-testid="template-more"
          className="group flex min-h-[9rem] min-w-0 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-3 text-center transition hover:border-brand hover:bg-brand/5 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/25"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-brand shadow-sm ring-1 ring-slate-200 group-hover:ring-brand/40"><Icon name="grid" className="h-5 w-5" /></span>
          <span className="text-sm font-semibold text-slate-800">More designs</span>
          <span className="text-xs text-slate-500">All sizes · {LIBRARY_TABS.reduce((n, t) => n + designsForPaper(t.paper).length, 0)} designs</span>
        </button>
      </div>
      {open ? <TemplateLibrary onClose={() => setOpen(false)} /> : null}
    </>
  )
}
