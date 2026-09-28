import { createPortal } from 'react-dom'
import DocumentPaper from '../templates/DocumentPaper.jsx'
import { resolveLayout } from '../templates/specs.js'
import { useElementSize } from '../ui/hooks.js'
import { useStudio } from '../ui/StudioContext.js'
import { Segmented } from './fields.jsx'

const MM_TO_PX = 96 / 25.4

function Paper() {
  const { previewDocument, totals, logoUrl, amountInWords } = useStudio()
  return <DocumentPaper doc={previewDocument} totals={totals} logoUrl={logoUrl} amountWords={amountInWords} />
}

/** Live preview: the paper scaled to fit the pane, or at 75% / 100%. */
export function PreviewPane() {
  const { previewDocument, zoom, setZoom, isPreviewStale } = useStudio()
  const [paneRef, pane] = useElementSize()
  const [paperRef, paper] = useElementSize()
  const { paper: size, kind } = resolveLayout(previewDocument)
  const paperWidth = size.widthMm * MM_TO_PX
  // Receipts are small: "fit" never enlarges them beyond 100 %.
  const fit = pane.width ? Math.min(kind === 'receipt' ? 1 : 1.25, pane.width / paperWidth) : 0
  const scale = zoom === '75' ? 0.75 : zoom === '100' ? 1 : fit
  const paperHeight = paper.height || (size.heightMm || size.widthMm * 2) * MM_TO_PX

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="hidden items-center justify-between gap-3 pb-3 lg:flex">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Live preview · {size.label}</p>
        <Segmented
          label="Zoom"
          srOnlyLabel
          size="sm"
          className="w-56"
          value={zoom}
          onChange={setZoom}
          options={[{ value: 'fit', label: 'Fit' }, { value: '75', label: '75%' }, { value: '100', label: '100%' }]}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-auto rounded-2xl bg-slate-200/70 p-3 sm:p-5">
        <div ref={paneRef} className="w-full">
          {scale > 0 ? (
            <div className="mx-auto" style={{ width: paperWidth * scale, height: paperHeight * scale }}>
              <div
                ref={paperRef}
                className={`origin-top-left rounded-sm shadow-lift transition-opacity duration-150 motion-reduce:transition-none ${isPreviewStale ? 'opacity-90' : ''}`}
                style={{ width: paperWidth, transform: `scale(${scale})` }}
              >
                <Paper />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/**
 * Unscaled copy of the paper — the only thing visible when printing
 * (paper.css). Kept rendered off-screen so a receipt's height can be measured
 * and printed as ONE continuous page of exactly that length.
 */
export function PrintPortal() {
  const { previewDocument } = useStudio()
  const [ref, measured] = useElementSize()
  if (typeof document === 'undefined') return null
  const { kind, paper, spec } = resolveLayout(previewDocument)
  let pageCss
  if (kind === 'receipt') {
    const heightMm = Math.ceil((measured.height || 0) / MM_TO_PX) + 1
    pageCss = `@page { size: ${paper.widthMm}mm ${Math.max(heightMm, paper.widthMm)}mm; margin: 0; }`
  } else {
    // Same margins and "Page x of y" as the downloaded PDF (pdf/renderPdf.js).
    pageCss = `@page { size: ${paper.cssSize}; margin: ${spec.marginTopMm}mm 0 ${spec.marginBottomMm}mm;
      @bottom-right { content: "Page " counter(page) " of " counter(pages); font: ${spec.sizesPt.pageNumber}pt 'Inter', sans-serif; color: ${spec.colors.faint}; margin-right: ${spec.marginXMm}mm; } }
    @page :first { margin-top: 0; }`
  }
  return createPortal(
    <div className="ds-print-root" aria-hidden="true">
      <style>{pageCss}</style>
      <div ref={ref} style={{ width: 'max-content' }}><Paper /></div>
    </div>,
    document.body,
  )
}
