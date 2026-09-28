/**
 * Paper sizes, item columns, the thermal receipt template, and the resolver
 * that turns a validated template spec (registry.js / schema.js) plus the
 * document's paper and letterhead into the concrete layout both renderers
 * read: the HTML paper through CSS variables (cssVarsFor*), the jsPDF
 * renderer (pdf/renderPdf.js) directly. Nothing here is duplicated in
 * paper.css or in the PDF code, so the two outputs cannot drift apart.
 *
 * Units: millimetres (…Mm) and points (sizesPt).
 */

import { onAccentColor } from './color.js'
import { getTemplate } from './registry.js'
import { FONT_STACKS } from './schema.js'

export const PAPERS = Object.freeze({
  A4: { id: 'A4', label: 'A4', kind: 'page', widthMm: 210, heightMm: 297, cssSize: 'A4' },
  Letter: { id: 'Letter', label: 'US Letter', kind: 'page', widthMm: 215.9, heightMm: 279.4, cssSize: 'letter' },
  Thermal80: { id: 'Thermal80', label: 'Thermal 80 mm', kind: 'receipt', widthMm: 80, heightMm: null },
  Thermal58: { id: 'Thermal58', label: 'Thermal 58 mm', kind: 'receipt', widthMm: 58, heightMm: null },
})

/** Item table columns (page templates). widthMm: fixed width; none = takes the rest. */
export const COLUMNS = Object.freeze([
  { key: 'index', label: '#', align: 'left', widthMm: 10 },
  { key: 'description', label: 'Description', align: 'left' },
  { key: 'qty', label: 'Qty', align: 'right', widthMm: 14 },
  { key: 'unit', label: 'Unit', align: 'left', widthMm: 20, optional: true },
  { key: 'price', label: 'Unit price', align: 'right', widthMm: 26, pricing: true },
  { key: 'discount', label: 'Discount', align: 'right', widthMm: 22, pricing: true, optional: true },
  { key: 'amount', label: 'Amount', align: 'right', widthMm: 28, pricing: true },
])

function freeze(value) {
  Object.values(value).forEach((v) => { if (v && typeof v === 'object') freeze(v) })
  return Object.freeze(value)
}

/** Thermal receipt template (58 / 80 mm): single column, monochrome. */
export const RECEIPT_TEMPLATE = freeze({
  id: 'receipt',
  name: 'Receipt',
  lineHeight: 1.3,
  colors: { text: '#000000', muted: '#333333', rule: '#000000', paper: '#ffffff' },
  gapMm: 1.8,
  ruleGapMm: 1.5,
  ruleMm: 0.2,
  dashMm: [0.8, 0.6],
  papers: {
    Thermal80: { marginXMm: 4, marginYMm: 5, logoMaxHeightMm: 16, logoMaxWidthMm: 44, sizesPt: { base: 8, small: 7, brand: 10.5, title: 9, total: 10 } },
    Thermal58: { marginXMm: 2.5, marginYMm: 4, logoMaxHeightMm: 12, logoMaxWidthMm: 34, sizesPt: { base: 7, small: 6.2, brand: 9, title: 8, total: 8.5 } },
  },
})

export const PT_TO_MM = 25.4 / 72

const MIN_DESCRIPTION_MM = 40
const NARROW_CONTENT_MM = 150

/**
 * Item columns that fit `contentWidthMm`. In narrow content areas (the Modern
 * side-column layout, wide letterhead margins) the unit moves into the
 * quantity cell ("12 hrs"); then, if the fixed columns still leave less than
 * 40 mm for the description, they shrink together.
 * @returns {{ columns: object[], unitInQty: boolean }}
 */
export function fitColumns(columns, contentWidthMm) {
  const unitInQty = contentWidthMm < NARROW_CONTENT_MM && columns.some((c) => c.key === 'unit')
  let out = unitInQty
    ? columns.filter((c) => c.key !== 'unit').map((c) => (c.key === 'qty' ? { ...c, widthMm: c.widthMm + 8 } : c))
    : columns
  const fixed = out.reduce((sum, c) => sum + (c.widthMm || 0), 0)
  const room = Math.max(contentWidthMm - MIN_DESCRIPTION_MM, 0)
  if (fixed > room) {
    const factor = room / fixed
    out = out.map((c) => (c.widthMm ? { ...c, widthMm: Math.round(c.widthMm * factor * 10) / 10 } : c))
  }
  return { columns: out, unitInQty }
}

// Table cell padding per density (mm).
const DENSITY = Object.freeze({ compact: { x: 1.8, y: 1.3 }, normal: { x: 2.5, y: 2.2 }, relaxed: { x: 2.8, y: 3 } })
// Legacy enums the current PDF renderer understands (it is taught the full set in Step 3B).
const PDF_HEADER = { band: 'band', fullBand: 'block', plain: 'plain' }
const PDF_TABLE_HEAD = { filled: 'fill', tinted: 'tint', underline: 'underline', lined: 'underline', boxed: 'tint' }

/**
 * Validated template spec + paper + letterhead → the concrete page layout.
 *
 * Letterhead mode is each template's "letterhead-compatible variant": the
 * layout becomes stacked (no side column), the header loses its band / block
 * and, unless the visitor keeps it, the business block, and the margins become
 * the letterhead's safe area. Fonts, colours, table and totals styles stay.
 *
 * @param {object} template  a validated spec (registry.getTemplate)
 * @param {{ paper?: object, letterhead?: import('../engine/model.js').Letterhead | null }} [options]
 */
export function resolvePageLayout(template, { paper = PAPERS.A4, letterhead = null } = {}) {
  const t = template
  const ty = t.typography
  const lh = letterhead || null
  const layout = lh ? 'stacked' : t.layout
  const headerStyle = lh || layout === 'sidebar' ? 'plain' : t.header.style
  const density = DENSITY[t.table.density] || DENSITY.normal
  const marginLeftMm = lh ? lh.leftMm : t.page.marginXMm
  const marginRightMm = lh ? lh.rightMm : t.page.marginXMm
  return freeze({
    id: t.id,
    name: t.name,
    layout,
    letterhead: lh ? { ...lh } : null,
    fonts: { heading: FONT_STACKS[t.fonts.heading], body: FONT_STACKS[t.fonts.body], headingId: t.fonts.heading, bodyId: t.fonts.body },
    marginXMm: marginLeftMm,
    marginLeftMm,
    marginRightMm,
    marginTopMm: lh ? lh.topMm : t.page.marginTopMm,
    marginBottomMm: lh ? lh.bottomMm : t.page.marginBottomMm,
    lineHeight: ty.lineHeight,
    labelUppercase: ty.labelCase === 'upper',
    sizesPt: {
      base: ty.basePt, small: ty.smallPt, label: ty.labelPt, brand: ty.brandPt, title: ty.titlePt, number: ty.numberPt,
      party: ty.partyPt, tableHead: ty.tableHeadPt, total: ty.totalPt, balance: ty.balancePt, footer: ty.footerPt,
      stamp: 54, pageNumber: 7.5,
    },
    colors: {
      ...t.colors,
      zebra: t.colors.surface,
      tint: t.colors.surface,
      stampNeutral: '#475569', stampPositive: '#059669', stampNegative: '#dc2626',
    },
    header: {
      htmlStyle: headerStyle,
      style: layout === 'sidebar' ? 'block' : PDF_HEADER[headerStyle],
      align: lh ? 'titleLeft' : t.header.align,
      showBrand: !(lh && lh.hideBusinessHeader),
      bandHeightMm: t.header.bandHeightMm,
      padTopMm: lh ? 0 : t.header.padTopMm,
      padBottomMm: t.header.padBottomMm,
      logoMaxHeightMm: t.header.logoMaxHeightMm,
      logoMaxWidthMm: t.header.logoMaxWidthMm,
      titleColor: headerStyle === 'fullBand' ? 'onAccent' : t.header.titleColor,
      titleUppercase: ty.titleCase === 'upper',
      titleWeight: ty.titleWeight,
      titleLineHeight: 1.1,
      brandLineHeight: 1.2,
      numberGapMm: 1.5,
    },
    sidebar: { widthMm: t.sidebar.widthMm, fill: t.sidebar.fill, padXMm: 8, padTopMm: t.page.marginTopMm + 2 },
    metaStyle: t.meta.style,
    spacingMm: { section: t.spacing.sectionMm, columnGap: t.spacing.columnGapMm, metaGap: t.spacing.metaGapMm, labelGap: 1.2, rule: 0.3 },
    table: {
      style: t.table.style,
      head: PDF_TABLE_HEAD[t.table.style],
      headRuleMm: 0.6,
      zebra: t.table.zebra,
      cellPadXMm: density.x,
      cellPadYMm: density.y,
    },
    totals: { style: t.totals.style, widthMm: t.totals.widthMm, rowPadYMm: 1.3, balance: t.totals.balance, balancePadXMm: 2.5, boxPadMm: 4 },
    stamp: { opacity: t.stamp.opacity, rotateDeg: t.stamp.rotateDeg, topRatio: 0.42, borderMm: 1.2 },
    sections: [...t.sections],
    show: { ...t.show, pageNumbers: t.show.pageNumbers && !lh },
    // Width of the main content column (items table), in mm.
    contentWidthMm: paper.widthMm - marginLeftMm - marginRightMm - (layout === 'sidebar' ? t.sidebar.widthMm : 0),
  })
}

/** Which template and paper a document renders with. */
export function resolveLayout(doc) {
  const paper = PAPERS[doc?.appearance?.paperSize] || PAPERS.A4
  if (paper.kind === 'receipt') {
    return { kind: 'receipt', paper, spec: RECEIPT_TEMPLATE, receipt: RECEIPT_TEMPLATE.papers[paper.id] }
  }
  const template = getTemplate(doc?.templateId)
  return { kind: 'page', paper, template, spec: resolvePageLayout(template, { paper, letterhead: doc?.appearance?.letterhead || null }) }
}

/** CSS custom properties for a page layout (consumed by paper.css). Values are validated numbers / hex colours / allowlisted font stacks. */
export function cssVarsForPage(spec, paper, accent) {
  const vars = {
    '--dsp-accent': accent,
    '--dsp-on-accent': onAccentColor(accent),
    '--dsp-font-body': spec.fonts.body,
    '--dsp-font-heading': spec.fonts.heading,
    '--dsp-width': `${paper.widthMm}mm`,
    '--dsp-height': `${paper.heightMm}mm`,
    '--dsp-margin-x': `${spec.marginXMm}mm`,
    '--dsp-margin-left': `${spec.marginLeftMm}mm`,
    '--dsp-margin-right': `${spec.marginRightMm}mm`,
    '--dsp-margin-top': `${spec.marginTopMm}mm`,
    '--dsp-margin-bottom': `${spec.marginBottomMm}mm`,
    '--dsp-line-height': String(spec.lineHeight),
    '--dsp-band': `${spec.header.bandHeightMm}mm`,
    '--dsp-title-weight': String(spec.header.titleWeight),
    '--dsp-title-line-height': String(spec.header.titleLineHeight),
    '--dsp-brand-line-height': String(spec.header.brandLineHeight),
    '--dsp-number-gap': `${spec.header.numberGapMm}mm`,
    '--dsp-head-pad-top': `${spec.header.padTopMm}mm`,
    '--dsp-head-pad-bottom': `${spec.header.padBottomMm}mm`,
    '--dsp-logo-max-h': `${spec.header.logoMaxHeightMm}mm`,
    '--dsp-logo-max-w': `${spec.header.logoMaxWidthMm}mm`,
    '--dsp-side-w': `${spec.sidebar.widthMm}mm`,
    '--dsp-side-pad-x': `${spec.sidebar.padXMm}mm`,
    '--dsp-side-pad-top': `${spec.sidebar.padTopMm}mm`,
    '--dsp-section': `${spec.spacingMm.section}mm`,
    '--dsp-column-gap': `${spec.spacingMm.columnGap}mm`,
    '--dsp-meta-gap': `${spec.spacingMm.metaGap}mm`,
    '--dsp-label-gap': `${spec.spacingMm.labelGap}mm`,
    '--dsp-rule': `${spec.spacingMm.rule}mm`,
    '--dsp-head-rule': `${spec.table.headRuleMm}mm`,
    '--dsp-cell-x': `${spec.table.cellPadXMm}mm`,
    '--dsp-cell-y': `${spec.table.cellPadYMm}mm`,
    '--dsp-totals-w': `${spec.totals.widthMm}mm`,
    '--dsp-total-row-y': `${spec.totals.rowPadYMm}mm`,
    '--dsp-balance-x': `${spec.totals.balancePadXMm}mm`,
    '--dsp-totals-box-pad': `${spec.totals.boxPadMm}mm`,
    '--dsp-stamp-opacity': String(spec.stamp.opacity),
    '--dsp-stamp-rotate': `${spec.stamp.rotateDeg}deg`,
    '--dsp-stamp-top': `${spec.stamp.topRatio * 100}%`,
    '--dsp-stamp-border': `${spec.stamp.borderMm}mm`,
  }
  for (const [name, value] of Object.entries(spec.sizesPt)) vars[`--dsp-fs-${name}`] = `${value}pt`
  for (const [name, value] of Object.entries(spec.colors)) vars[`--dsp-c-${name}`] = value
  return vars
}

/** CSS custom properties for the thermal receipt. */
export function cssVarsForReceipt(spec, paper) {
  const r = spec.papers[paper.id]
  const vars = {
    '--dsr-width': `${paper.widthMm}mm`,
    '--dsr-margin-x': `${r.marginXMm}mm`,
    '--dsr-margin-y': `${r.marginYMm}mm`,
    '--dsr-line-height': String(spec.lineHeight),
    '--dsr-gap': `${spec.gapMm}mm`,
    '--dsr-rule': `${spec.ruleMm}mm`,
    '--dsr-rule-gap': `${spec.ruleGapMm}mm`,
    '--dsr-logo-max-h': `${r.logoMaxHeightMm}mm`,
    '--dsr-logo-max-w': `${r.logoMaxWidthMm}mm`,
  }
  for (const [name, value] of Object.entries(r.sizesPt)) vars[`--dsr-fs-${name}`] = `${value}pt`
  for (const [name, value] of Object.entries(spec.colors)) vars[`--dsr-c-${name}`] = value
  return vars
}
