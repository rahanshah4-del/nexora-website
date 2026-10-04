import DocumentPaper from '../templates/DocumentPaper.jsx'
import { resolveLayout } from '../templates/specs.js'
import { useElementSize } from '../ui/hooks.js'
import { useStudio } from '../ui/StudioContext.js'
import { Segmented } from './fields.jsx'
import PrintRoot from './PrintRoot.jsx'
import ScaledPaper, { MM_TO_PX } from './ScaledPaper.jsx'

export function Paper() {
  const { previewDocument, totals, logoUrl, letterheadUrl, signatureUrl, sealUrl, amountInWords } = useStudio()
  return <DocumentPaper doc={previewDocument} totals={totals} logoUrl={logoUrl} letterheadUrl={letterheadUrl} signatureUrl={signatureUrl} sealUrl={sealUrl} amountWords={amountInWords} />
}

/** Live preview: the paper scaled to fit the pane, or at 75% / 100%. */
export function PreviewPane() {
  const { previewDocument, zoom, setZoom, isPreviewStale } = useStudio()
  const [paneRef, pane] = useElementSize()
  const { paper: size, kind } = resolveLayout(previewDocument)
  const paperWidth = size.widthMm * MM_TO_PX
  // Receipts are small: "fit" never enlarges them beyond 100 %.
  const fit = pane.width ? Math.min(kind === 'receipt' ? 1 : 1.25, pane.width / paperWidth) : 0
  const scale = zoom === '75' ? 0.75 : zoom === '100' ? 1 : fit

  return (
    <div className="flex min-h-0 flex-col">
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
      {/* Sized by its content up to the column's max height, then scrolls. */}
      <div className="min-h-0 overflow-auto rounded-2xl bg-slate-200/70 p-3 sm:p-5" data-testid="preview-pane">
        <div ref={paneRef} className="w-full">
          {scale > 0 ? (
            <ScaledPaper
              scale={scale}
              widthPx={paperWidth}
              estimatedHeightPx={(size.heightMm || size.widthMm * 2) * MM_TO_PX}
              className="mx-auto"
              paperClassName={`rounded-sm shadow-lift transition-opacity duration-150 motion-reduce:transition-none ${isPreviewStale ? 'opacity-90' : ''}`}
            >
              <Paper />
            </ScaledPaper>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/** The print root for the studio's current document (see PrintRoot.jsx). */
export function PrintPortal() {
  const { previewDocument, totals, logoUrl, letterheadUrl, signatureUrl, sealUrl, amountInWords } = useStudio()
  return <PrintRoot doc={previewDocument} totals={totals} logoUrl={logoUrl} letterheadUrl={letterheadUrl} signatureUrl={signatureUrl} sealUrl={sealUrl} amountWords={amountInWords} />
}
