/** @page CSS for printing the HTML paper (kept in step with pdf/renderPdf.js). */

/**
 * @page rules for a page template — the same margins and "Page x of y" as the
 * PDF (pdf/renderPdf.js, geometry from spec.pages). Letterheads print
 * full-bleed, so their sheets have no page margins (Chromium clips everything,
 * even @page backgrounds, to the page area); the safe area is the paper's
 * repeating spacer rows, and the page number is lifted from the sheet edge
 * into the bottom safe area.
 */
export function printPageCss(spec, paper) {
  const pageNumber = (lift) => (spec.show.pageNumbers
    ? `@bottom-right { content: "Page " counter(page) " of " counter(pages); font: ${spec.sizesPt.pageNumber}pt 'Inter', sans-serif; color: ${spec.colors.faint}; margin-right: ${spec.marginRightMm}mm;${lift ? ` vertical-align: top; margin-top: -${lift}mm;` : ''} }`
    : '')
  const lh = spec.letterhead
  if (!lh) {
    return `@page { size: ${paper.cssSize}; margin: ${spec.pages.laterTopMm}mm 0 ${spec.pages.bottomMm}mm; ${pageNumber(0)} }
    @page :first { margin-top: 0; }`
  }
  const lift = Math.max(lh.bottomMm - 4, 0)
  if (lh.pages === 'all') return `@page { size: ${paper.cssSize}; margin: 0; ${pageNumber(lift)} }`
  // First page only: page 1 is full-bleed; later pages use the template's top margin.
  const extraBottom = Math.max(spec.pages.bottomMm - lh.bottomMm, 0)
  return `@page { size: ${paper.cssSize}; margin: ${spec.pages.laterTopMm}mm 0 ${extraBottom}mm; ${pageNumber(lift)} }
    @page :first { margin: 0 0 ${extraBottom}mm; }`
}

/** A thermal receipt prints as one continuous page of its measured height. */
export function receiptPageCss(paper, heightMm) {
  return `@page { size: ${paper.widthMm}mm ${Math.max(heightMm, paper.widthMm)}mm; margin: 0; }`
}
