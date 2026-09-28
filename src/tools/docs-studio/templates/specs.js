/**
 * Every layout number a document template uses — paper sizes, margins, type
 * sizes, spacing, colours, columns — as plain data. Both renderers read these
 * objects: the HTML paper through CSS variables (cssVarsFor*), the jsPDF
 * renderer (pdf/renderPdf.js) directly. Nothing here is duplicated in
 * paper.css or in the PDF code, so the two outputs cannot drift apart.
 *
 * Units: millimetres (…Mm) and points (sizesPt).
 */

import { onAccentColor } from './color.js'

export const PAPERS = Object.freeze({
  A4: { id: 'A4', label: 'A4', kind: 'page', widthMm: 210, heightMm: 297, cssSize: 'A4' },
  Letter: { id: 'Letter', label: 'US Letter', kind: 'page', widthMm: 215.9, heightMm: 279.4, cssSize: 'letter' },
  Thermal80: { id: 'Thermal80', label: 'Thermal 80 mm', kind: 'receipt', widthMm: 80, heightMm: null },
  Thermal58: { id: 'Thermal58', label: 'Thermal 58 mm', kind: 'receipt', widthMm: 58, heightMm: null },
})

/** Item table columns (page templates). widthMm: fixed width; none = takes the rest. */
export const COLUMNS = Object.freeze([
  { key: 'index', label: '#', align: 'left', widthMm: 8 },
  { key: 'description', label: 'Description', align: 'left' },
  { key: 'qty', label: 'Qty', align: 'right', widthMm: 14 },
  { key: 'unit', label: 'Unit', align: 'left', widthMm: 20, optional: true },
  { key: 'price', label: 'Unit price', align: 'right', widthMm: 26, pricing: true },
  { key: 'discount', label: 'Discount', align: 'right', widthMm: 22, pricing: true, optional: true },
  { key: 'amount', label: 'Amount', align: 'right', widthMm: 28, pricing: true },
])

const CLASSIC = {
  id: 'classic',
  name: 'Classic',
  description: 'Accent band, filled table header, right-aligned totals.',
  marginXMm: 16,
  marginTopMm: 14,
  marginBottomMm: 16,
  lineHeight: 1.4,
  sizesPt: { base: 9.5, small: 8.5, label: 7, brand: 15, title: 22, number: 10, party: 10.5, tableHead: 7.5, total: 12, balance: 11, footer: 8, stamp: 54, pageNumber: 7.5 },
  colors: {
    text: '#0f172a', muted: '#64748b', faint: '#94a3b8', border: '#e2e8f0', zebra: '#f8fafc', tint: '#f1f5f9', paper: '#ffffff',
    stampNeutral: '#475569', stampPositive: '#059669', stampNegative: '#dc2626',
  },
  header: { style: 'band', bandHeightMm: 5, padTopMm: 9, padBottomMm: 7, logoMaxHeightMm: 20, logoMaxWidthMm: 55, titleColor: 'accent', titleUppercase: true, titleLineHeight: 1.1, brandLineHeight: 1.2, numberGapMm: 1.5 },
  spacingMm: { section: 5, columnGap: 8, metaGap: 9, labelGap: 1.2, rule: 0.3 },
  table: { head: 'fill', headRuleMm: 0.6, zebra: true, cellPadXMm: 2.5, cellPadYMm: 2.2 },
  totals: { widthMm: 82, rowPadYMm: 1.3, balance: 'fill', balancePadXMm: 2.5 },
  stamp: { opacity: 0.13, rotateDeg: -18, topRatio: 0.42, borderMm: 1.2 },
}

function merge(base, over) {
  const out = { ...base }
  for (const [k, v] of Object.entries(over)) out[k] = v && typeof v === 'object' && !Array.isArray(v) ? merge(base[k] || {}, v) : v
  return out
}

function freeze(value) {
  Object.values(value).forEach((v) => { if (v && typeof v === 'object') freeze(v) })
  return Object.freeze(value)
}

/** Page templates (A4 / Letter). */
export const PAGE_TEMPLATES = freeze({
  classic: CLASSIC,
  modern: merge(CLASSIC, {
    id: 'modern',
    name: 'Modern',
    description: 'Full accent header block, underlined table header.',
    sizesPt: { title: 24 },
    header: { style: 'block', padTopMm: 10, padBottomMm: 10, titleColor: 'onAccent' },
    table: { head: 'underline', zebra: false },
  }),
  minimal: merge(CLASSIC, {
    id: 'minimal',
    name: 'Minimal',
    description: 'No colour blocks — typography and hairlines only.',
    sizesPt: { title: 20 },
    colors: { border: '#e5e7eb' },
    header: { style: 'plain', padTopMm: 16, titleColor: 'text', titleUppercase: false },
    table: { head: 'underline', zebra: false },
    totals: { balance: 'text' },
  }),
  compact: merge(CLASSIC, {
    id: 'compact',
    name: 'Compact',
    description: 'Smaller type and tight rows for long item lists.',
    marginXMm: 12,
    marginTopMm: 10,
    sizesPt: { base: 8.5, small: 7.5, label: 6.5, brand: 12, title: 16, number: 9, party: 9.5, tableHead: 7, total: 10.5, balance: 10 },
    header: { bandHeightMm: 2.5, padTopMm: 6, padBottomMm: 4, logoMaxHeightMm: 14 },
    spacingMm: { section: 3.5, columnGap: 6, metaGap: 7 },
    table: { head: 'tint', cellPadXMm: 1.8, cellPadYMm: 1.2 },
    totals: { widthMm: 72, rowPadYMm: 0.8 },
  }),
})

export const PAGE_TEMPLATE_IDS = Object.freeze(Object.keys(PAGE_TEMPLATES))

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

/** Which template and paper a document renders with. */
export function resolveLayout(doc) {
  const paper = PAPERS[doc?.appearance?.paperSize] || PAPERS.A4
  if (paper.kind === 'receipt') {
    return { kind: 'receipt', paper, spec: RECEIPT_TEMPLATE, receipt: RECEIPT_TEMPLATE.papers[paper.id] }
  }
  return { kind: 'page', paper, spec: PAGE_TEMPLATES[doc?.templateId] || PAGE_TEMPLATES.classic }
}

/** CSS custom properties for a page template (consumed by paper.css). */
export function cssVarsForPage(spec, paper, accent) {
  const vars = {
    '--dsp-accent': accent,
    '--dsp-on-accent': onAccentColor(accent),
    '--dsp-width': `${paper.widthMm}mm`,
    '--dsp-height': `${paper.heightMm}mm`,
    '--dsp-margin-x': `${spec.marginXMm}mm`,
    '--dsp-margin-top': `${spec.marginTopMm}mm`,
    '--dsp-margin-bottom': `${spec.marginBottomMm}mm`,
    '--dsp-line-height': String(spec.lineHeight),
    '--dsp-band': `${spec.header.bandHeightMm}mm`,
    '--dsp-title-line-height': String(spec.header.titleLineHeight),
    '--dsp-brand-line-height': String(spec.header.brandLineHeight),
    '--dsp-number-gap': `${spec.header.numberGapMm}mm`,
    '--dsp-head-pad-top': `${spec.header.padTopMm}mm`,
    '--dsp-head-pad-bottom': `${spec.header.padBottomMm}mm`,
    '--dsp-logo-max-h': `${spec.header.logoMaxHeightMm}mm`,
    '--dsp-logo-max-w': `${spec.header.logoMaxWidthMm}mm`,
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
