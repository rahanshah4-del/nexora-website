import { createPortal } from 'react-dom'
import DocumentPaper from '../templates/DocumentPaper.jsx'
import { printPageCss, receiptPageCss } from '../templates/printCss.js'
import { resolveLayout } from '../templates/specs.js'
import { useElementSize } from '../ui/hooks.js'
import { MM_TO_PX } from './ScaledPaper.jsx'

/**
 * Unscaled copy of the paper — the only thing visible when printing
 * (paper.css). Kept rendered off-screen so a receipt's height can be measured
 * and printed as ONE continuous page of exactly that length. Used by the
 * studio and by the share view page.
 */
export default function PrintRoot({ doc, totals, logoUrl = null, letterheadUrl = null, amountWords = '' }) {
  const [ref, measured] = useElementSize()
  if (typeof document === 'undefined') return null
  const { kind, paper, spec } = resolveLayout(doc)
  const pageCss = kind === 'receipt'
    ? receiptPageCss(paper, Math.ceil((measured.height || 0) / MM_TO_PX) + 1)
    : printPageCss(spec, paper)
  return createPortal(
    <div className="ds-print-root" aria-hidden="true">
      <style>{pageCss}</style>
      <div ref={ref} style={{ width: 'max-content' }}>
        <DocumentPaper doc={doc} totals={totals} logoUrl={logoUrl} letterheadUrl={letterheadUrl} amountWords={amountWords} />
      </div>
    </div>,
    document.body,
  )
}
