/**
 * "Classic" template as data. The HTML paper (ClassicTemplate.jsx) reads its
 * colors, sizes and section order from here, and the Step 3 PDF renderer will
 * read the same object, so both outputs share one design definition.
 * Lengths are millimetres, type sizes points.
 */

export const classicSpec = Object.freeze({
  id: 'classic',
  name: 'Classic',
  description: 'Accent header band, clean item table, right-aligned totals.',
  page: {
    A4: { widthMm: 210, heightMm: 297 },
    Letter: { widthMm: 215.9, heightMm: 279.4 },
    marginXMm: 16,
    marginYMm: 14,
  },
  fonts: { body: 'Inter', heading: 'Sora' },
  sizesPt: { base: 9.5, small: 8, label: 7.5, title: 22, party: 10.5, total: 12.5 },
  colors: {
    text: '#0f172a',
    muted: '#64748b',
    faint: '#94a3b8',
    border: '#e2e8f0',
    zebra: '#f8fafc',
    paper: '#ffffff',
  },
  header: { bandHeightMm: 5, logoMaxHeightMm: 20, logoMaxWidthMm: 55, title: 'right' },
  sections: ['header', 'parties', 'meta', 'items', 'summary', 'notes', 'footer'],
  table: {
    headerFill: 'accent',
    zebra: true,
    columns: [
      { key: 'index', label: '#', align: 'left', widthMm: 8 },
      { key: 'description', label: 'Description', align: 'left' },
      { key: 'qty', label: 'Qty', align: 'right', widthMm: 16 },
      { key: 'unit', label: 'Unit', align: 'left', widthMm: 16, optional: true },
      { key: 'price', label: 'Unit price', align: 'right', widthMm: 26, pricing: true },
      { key: 'discount', label: 'Discount', align: 'right', widthMm: 20, pricing: true, optional: true },
      { key: 'amount', label: 'Amount', align: 'right', widthMm: 28, pricing: true },
    ],
  },
  totals: { widthMm: 82 },
  stamp: { opacity: 0.13, rotateDeg: -18, sizePt: 54 },
})
