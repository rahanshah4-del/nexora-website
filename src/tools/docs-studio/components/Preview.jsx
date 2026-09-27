import { createPortal } from 'react-dom'
import { getTemplate } from '../templates/registry.js'
import { useElementSize } from '../ui/hooks.js'
import { useStudio } from '../ui/StudioContext.js'
import { Segmented } from './fields.jsx'

const MM_TO_PX = 96 / 25.4

function PaperDocument() {
  const { previewDocument, totals, logoUrl, amountInWords } = useStudio()
  const { Component } = getTemplate(previewDocument.templateId)
  return <Component doc={previewDocument} totals={totals} logoUrl={logoUrl} amountWords={amountInWords} />
}

/** Live preview: the paper scaled to fit the pane, or at 75% / 100%. */
export function PreviewPane() {
  const { previewDocument, zoom, setZoom, isPreviewStale } = useStudio()
  const [paneRef, pane] = useElementSize()
  const [paperRef, paper] = useElementSize()
  const spec = getTemplate(previewDocument.templateId).spec
  const size = spec.page[previewDocument.appearance.paperSize] || spec.page.A4
  const paperWidth = size.widthMm * MM_TO_PX
  const fit = pane.width ? Math.min(1.25, pane.width / paperWidth) : 0
  const scale = zoom === '75' ? 0.75 : zoom === '100' ? 1 : fit
  const paperHeight = paper.height || size.heightMm * MM_TO_PX

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="hidden items-center justify-between gap-3 pb-3 lg:flex">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Live preview · {previewDocument.appearance.paperSize}</p>
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
                <PaperDocument />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/** Unscaled copy of the paper, the only thing visible when printing (paper.css). */
export function PrintPortal() {
  const { previewDocument } = useStudio()
  if (typeof document === 'undefined') return null
  const spec = getTemplate(previewDocument.templateId).spec
  const pageSize = previewDocument.appearance.paperSize === 'Letter' ? 'letter' : 'A4'
  const pageCss = `@page { size: ${pageSize}; margin: ${spec.page.marginYMm}mm 0; } @page :first { margin-top: 0; } .ds-print-root .dsp { padding-bottom: 0; }`
  return createPortal(
    <div className="ds-print-root" aria-hidden="true">
      <style>{pageCss}</style>
      <PaperDocument />
    </div>,
    document.body,
  )
}
