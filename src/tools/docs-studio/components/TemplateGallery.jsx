import { useMemo } from 'react'
import { calculateDocument } from '../engine/index.js'
import DocumentPaper from '../templates/DocumentPaper.jsx'
import { hasTemplate, listTemplates } from '../templates/registry.js'
import { PAPERS } from '../templates/specs.js'
import { useFitScale } from '../ui/hooks.js'
import { asCreated } from '../ui/starter.js'
import { useStudio } from '../ui/StudioContext.js'
import Icon from './Icon.jsx'
import ScaledPaper, { MM_TO_PX } from './ScaledPaper.jsx'

const A4_WIDTH_PX = PAPERS.A4.widthMm * MM_TO_PX
const A4_HEIGHT_PX = PAPERS.A4.heightMm * MM_TO_PX

/**
 * Live thumbnail of the visitor's own document in one template — a real
 * rendered paper (not an image), scaled to the card, first page only.
 */
export function TemplateThumb({ templateId, maxLines = 6 }) {
  const { previewDocument, logoUrl, letterheadUrl, amountInWords } = useStudio()
  const { doc, totals } = useMemo(() => {
    const paperSize = PAPERS[previewDocument.appearance.paperSize]?.kind === 'page' ? previewDocument.appearance.paperSize : 'A4'
    const d = {
      ...asCreated(previewDocument),
      templateId,
      lines: previewDocument.lines.slice(0, maxLines),
      appearance: { ...previewDocument.appearance, paperSize },
    }
    return { doc: d, totals: calculateDocument(d) }
  }, [previewDocument, templateId, maxLines])
  const [ref, scale] = useFitScale(A4_WIDTH_PX)
  return (
    <div ref={ref} className="pointer-events-none relative w-full overflow-hidden rounded-lg bg-white ring-1 ring-slate-200" style={{ aspectRatio: '210 / 297' }} aria-hidden="true" inert data-analytics-ignore>
      {scale > 0 ? (
        <ScaledPaper scale={scale} widthPx={A4_WIDTH_PX} estimatedHeightPx={A4_HEIGHT_PX}>
          <DocumentPaper doc={doc} totals={totals} logoUrl={logoUrl} letterheadUrl={letterheadUrl} amountWords={amountInWords} />
        </ScaledPaper>
      ) : null}
    </div>
  )
}

/**
 * The template picker: a radio group of live thumbnails.
 * @param {{ columns?: string, compact?: boolean }} props
 */
export default function TemplateGallery({ columns = 'grid-cols-2 lg:grid-cols-4', compact = false, labelId }) {
  const { doc, actions } = useStudio()
  const templates = listTemplates()
  const selected = hasTemplate(doc.templateId) ? doc.templateId : 'classic'
  const onKeyDown = (event) => {
    const index = templates.findIndex((t) => t.id === selected)
    const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0
    if (!delta) return
    event.preventDefault()
    const next = templates[(index + delta + templates.length) % templates.length]
    actions.set('templateId', next.id)
    event.currentTarget.querySelector(`[data-value="${next.id}"]`)?.focus()
  }
  return (
    <div role="radiogroup" aria-labelledby={labelId} onKeyDown={onKeyDown} className={`grid gap-3 sm:gap-4 ${columns}`}>
      {templates.map((t) => {
        const active = t.id === selected
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
            className={`group relative flex min-w-0 flex-col gap-2 rounded-2xl border-2 bg-white p-2 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/25 ${active ? 'border-brand shadow-md' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}
          >
            <TemplateThumb templateId={t.id} maxLines={compact ? 4 : 6} />
            <span className="flex items-start justify-between gap-2 px-1 pb-0.5">
              <span className="min-w-0">
                <span className={`block text-sm font-semibold ${active ? 'text-brand' : 'text-slate-800'}`}>{t.name}</span>
                {compact ? null : <span className="mt-0.5 block text-xs leading-snug text-slate-500">{t.description}</span>}
              </span>
              <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${active ? 'bg-brand text-white' : 'border border-slate-300 bg-white'}`} aria-hidden="true">
                {active ? <Icon name="check" className="h-3.5 w-3.5" /> : null}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
