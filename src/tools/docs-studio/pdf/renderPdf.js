/**
 * Draws a document with jsPDF (+ jspdf-autotable) from the SAME inputs as the
 * HTML paper: the content model (templates/paperModel.js) and the template
 * spec (templates/specs.js). Every size, spacing and colour below is read
 * from the spec; every string and amount from the model. No arithmetic on
 * money happens here.
 *
 * jsPDF and autoTable are passed in (not imported) so this module stays
 * cheap to import and runs unchanged in Node tests.
 */

import { PT_TO_MM } from '../templates/specs.js'
import { registerPdfFonts } from './fonts.js'

export const PDF_CREATOR = 'Nexora Docs Studio – nexorasolution.online'

function rgb(hex) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex || '#000000'))
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0]
}

/** Small drawing kit over one jsPDF instance (units: mm, sizes: pt). */
function kit(pdf, family, lineHeight) {
  const k = {
    family,
    lh: (sizePt, factor = lineHeight) => sizePt * PT_TO_MM * factor,
    font(sizePt, bold = false, color = '#000000') {
      pdf.setFont(family, bold ? 'bold' : 'normal')
      pdf.setFontSize(sizePt)
      pdf.setTextColor(...rgb(color))
      return k
    },
    width: (text) => pdf.getTextWidth(String(text)),
    wrap: (text, width) => (text === '' ? [] : pdf.splitTextToSize(String(text), Math.max(width, 1))),
    /** Draws wrapped lines from the top; returns the height used. */
    lines(lines, x, y, sizePt, align = 'left', factor = lineHeight) {
      if (!lines.length) return 0
      pdf.text(lines, x, y, { baseline: 'top', lineHeightFactor: factor, align })
      return lines.length * k.lh(sizePt, factor)
    },
    rule(x1, y, x2, color, widthMm, dash = null) {
      pdf.setDrawColor(...rgb(color))
      pdf.setLineWidth(widthMm)
      if (dash) pdf.setLineDashPattern(dash, 0)
      pdf.line(x1, y, x2, y)
      if (dash) pdf.setLineDashPattern([], 0)
    },
    fill(x, y, w, h, color) {
      pdf.setFillColor(...rgb(color))
      pdf.rect(x, y, w, h, 'F')
    },
  }
  return k
}

function fitImage(logo, maxW, maxH) {
  const ratio = logo.width && logo.height ? logo.width / logo.height : 1
  let w = maxW
  let h = w / ratio
  if (h > maxH) { h = maxH; w = h * ratio }
  return { w, h }
}

function addLogo(pdf, logo, x, y, w, h) {
  try {
    pdf.addImage(logo.dataUrl, logo.format || 'PNG', x, y, w, h, undefined, 'FAST')
    return true
  } catch {
    return false
  }
}

// ── Page templates (A4 / Letter) ─────────────────────────────────────────────

function drawPage({ pdf, autoTable, model, layout, family, logo }) {
  const { spec, paper } = layout
  const W = paper.widthMm
  const H = paper.heightMm
  const mx = spec.marginXMm
  const cw = W - 2 * mx
  const c = spec.colors
  const sz = spec.sizesPt
  const sp = spec.spacingMm
  const hd = spec.header
  const k = kit(pdf, family, spec.lineHeight)
  const accent = model.accent
  const onAccent = model.onAccent
  const labelBlock = (label, x, y, width) => {
    k.font(sz.label, true, c.muted)
    return k.lines(k.wrap(label.toUpperCase(), width), x, y, sz.label) + sp.labelGap
  }
  const ensureSpace = (y, needed) => {
    if (y + needed <= H - spec.marginBottomMm) return y
    pdf.addPage([W, H], 'portrait')
    return spec.marginTopMm
  }

  // Header
  let y = 0
  if (hd.style === 'band') {
    k.fill(0, 0, W, hd.bandHeightMm, accent)
    y = hd.bandHeightMm
  }
  const headTop = y + hd.padTopMm
  const titleText = hd.titleUppercase ? model.title.toUpperCase() : model.title
  const titleColor = hd.titleColor === 'accent' ? accent : hd.titleColor === 'onAccent' ? onAccent : c.text
  const numberText = model.number ? `# ${model.number}` : ''
  k.font(sz.title, true)
  const titleW = k.width(titleText)
  k.font(sz.number, true)
  const titleBlockW = Math.max(titleW, numberText ? k.width(numberText) : 0)
  const rightH = k.lh(sz.title, hd.titleLineHeight) + (numberText ? hd.numberGapMm + k.lh(sz.number) : 0)
  const brandW = cw - titleBlockW - sp.columnGap
  let leftH = 0
  let logoBox = null
  let brandLines = []
  if (logo) {
    logoBox = fitImage(logo, Math.min(hd.logoMaxWidthMm, brandW), hd.logoMaxHeightMm)
    leftH = logoBox.h
  } else if (model.brandName) {
    k.font(sz.brand, true)
    brandLines = k.wrap(model.brandName, brandW)
    leftH = brandLines.length * k.lh(sz.brand, hd.brandLineHeight)
  }
  const headContentH = Math.max(leftH, rightH)
  if (hd.style === 'block') k.fill(0, y, W, hd.padTopMm + headContentH + hd.padBottomMm, accent)
  const headColor = hd.style === 'block' ? onAccent : c.text
  if (logoBox) addLogo(pdf, logo, mx, headTop, logoBox.w, logoBox.h)
  else if (brandLines.length) { k.font(sz.brand, true, headColor); k.lines(brandLines, mx, headTop, sz.brand, 'left', hd.brandLineHeight) }
  k.font(sz.title, true, titleColor)
  k.lines([titleText], W - mx, headTop, sz.title, 'right', hd.titleLineHeight)
  if (numberText) {
    k.font(sz.number, true, hd.style === 'block' ? onAccent : c.muted)
    k.lines([numberText], W - mx, headTop + k.lh(sz.title, hd.titleLineHeight) + hd.numberGapMm, sz.number, 'right')
  }
  y = headTop + headContentH + hd.padBottomMm
  if (hd.style === 'block') y += sp.section

  // Parties
  if (hd.style !== 'block') { k.rule(mx, y, W - mx, c.border, sp.rule); y += sp.section }
  const cols = model.parties.length
  const colW = (cw - sp.columnGap * (cols - 1)) / cols
  let partiesH = 0
  model.parties.forEach((party, i) => {
    const x = mx + i * (colW + sp.columnGap)
    let h = labelBlock(party.label, x, y, colW)
    if (!party.empty) {
      if (party.name) { k.font(sz.party, true, c.text); h += k.lines(k.wrap(party.name, colW), x, y + h, sz.party) }
      k.font(sz.base, false, c.muted)
      party.lines.forEach((line) => { h += k.lines(k.wrap(line, colW), x, y + h, sz.base) })
    }
    partiesH = Math.max(partiesH, h)
  })
  y += partiesH + sp.section

  // Meta (flowing label/value pairs)
  if (model.meta.length) {
    k.rule(mx, y, W - mx, c.border, sp.rule)
    y += sp.section
    const rowH = k.lh(sz.label) + sp.labelGap + k.lh(sz.base)
    let x = mx
    model.meta.forEach((m) => {
      k.font(sz.label, true); const lw = k.width(m.label.toUpperCase())
      k.font(sz.base, true); const vw = k.width(m.value)
      const w = Math.max(lw, vw)
      if (x > mx && x + w > W - mx) { x = mx; y += rowH + sp.section * 0.6 }
      labelBlock(m.label, x, y, w + 1)
      k.font(sz.base, true, c.text)
      k.lines([m.value], x, y + k.lh(sz.label) + sp.labelGap, sz.base)
      x += w + sp.metaGap
    })
    y += rowH + sp.section
  }

  // Items (autoTable: wraps, paginates, repeats the header on every page)
  const tb = spec.table
  const head = tb.head === 'fill'
    ? { fillColor: rgb(accent), textColor: rgb(onAccent) }
    : tb.head === 'tint'
      ? { fillColor: rgb(c.tint), textColor: rgb(c.text) }
      : { fillColor: false, textColor: rgb(accent), lineWidth: { bottom: tb.headRuleMm }, lineColor: rgb(accent) }
  const body = model.rows.length
    ? model.rows.map((row) => model.columns.map((col) => row.cells[col.key]))
    : [[{ content: 'No items yet', colSpan: model.columns.length, styles: { halign: 'center', textColor: rgb(c.faint), fontStyle: 'normal' } }]]
  autoTable(pdf, {
    startY: y,
    margin: { left: mx, right: mx, top: spec.marginTopMm, bottom: spec.marginBottomMm },
    head: [model.columns.map((col) => col.label.toUpperCase())],
    body,
    theme: 'plain',
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
    styles: {
      font: family,
      fontSize: sz.base,
      textColor: rgb(c.text),
      cellPadding: { top: tb.cellPadYMm, bottom: tb.cellPadYMm, left: tb.cellPadXMm, right: tb.cellPadXMm },
      lineColor: rgb(c.border),
      lineWidth: { bottom: sp.rule },
      valign: 'top',
      overflow: 'linebreak',
      minCellHeight: 0,
    },
    headStyles: { fontStyle: 'bold', fontSize: sz.tableHead, lineWidth: 0, ...head },
    alternateRowStyles: tb.zebra ? { fillColor: rgb(c.zebra) } : {},
    columnStyles: Object.fromEntries(model.columns.map((col, i) => [i, {
      halign: col.align,
      cellWidth: col.widthMm ?? 'auto',
      fontStyle: col.key === 'amount' ? 'bold' : 'normal',
      ...(col.key === 'index' ? { textColor: rgb(c.muted) } : {}),
    }])),
    didParseCell: (data) => {
      if (data.section === 'head') data.cell.styles.halign = model.columns[data.column.index]?.align || 'left'
    },
  })
  y = pdf.lastAutoTable.finalY + sp.section

  // Summary: amount in words / reason (left) + totals (right)
  const ts = spec.totals
  const totalsX = W - mx - ts.widthMm
  const sideW = cw - ts.widthMm - sp.columnGap
  const rowSize = (row) => (row.tone === 'grand' ? sz.total : row.tone === 'balance' ? sz.balance : row.tone === 'muted' ? sz.small : sz.base)
  const totalsH = model.totals.reduce((h, row) => h + k.lh(rowSize(row)) + 2 * ts.rowPadYMm, 0)
  const sideBlocks = [model.words ? ['Amount in words', model.words] : null, model.reason ? ['Reason', model.reason] : null].filter(Boolean)
  k.font(sz.base)
  const sideH = sideBlocks.reduce((h, [, text]) => h + k.lh(sz.label) + sp.labelGap + k.wrap(text, sideW).length * k.lh(sz.base) + sp.section, 0)
  if (model.totals.length || sideBlocks.length) {
    y = ensureSpace(y, Math.max(totalsH, sideH))
    let sy = y
    sideBlocks.forEach(([label, text]) => {
      sy += labelBlock(label, mx, sy, sideW)
      k.font(sz.base, false, c.text)
      sy += k.lines(k.wrap(text, sideW), mx, sy, sz.base) + sp.section
    })
    let ty = y
    model.totals.forEach((row) => {
      const size = rowSize(row)
      const rowH = k.lh(size) + 2 * ts.rowPadYMm
      const strong = row.tone === 'strong' || row.tone === 'grand' || row.tone === 'balance'
      let color = row.tone === 'muted' ? c.faint : strong ? c.text : c.muted
      let valueColor = row.tone === 'muted' ? c.faint : c.text
      let padX = 0
      if (row.tone === 'grand') k.rule(totalsX, ty, totalsX + ts.widthMm, c.text, sp.rule * 1.4)
      if (row.tone === 'balance' && ts.balance === 'fill') {
        k.fill(totalsX, ty, ts.widthMm, rowH, accent)
        color = onAccent
        valueColor = onAccent
        padX = ts.balancePadXMm
      } else if (row.tone === 'balance') {
        color = accent
        valueColor = accent
      }
      k.font(size, strong, color)
      k.lines([row.label], totalsX + padX, ty + ts.rowPadYMm, size)
      k.font(size, strong, valueColor)
      k.lines([row.value], totalsX + ts.widthMm - padX, ty + ts.rowPadYMm, size, 'right')
      ty += rowH
    })
    y = Math.max(ty, sy) + sp.section
  }

  // Notes & terms
  const noteBlocks = [model.notes ? ['Notes', model.notes] : null, model.terms ? ['Terms', model.terms] : null].filter(Boolean)
  if (noteBlocks.length) {
    const nW = (cw - sp.columnGap * (noteBlocks.length - 1)) / noteBlocks.length
    k.font(sz.base)
    const notesH = Math.max(...noteBlocks.map(([, text]) => k.lh(sz.label) + sp.labelGap + k.wrap(text, nW).length * k.lh(sz.base)))
    y = ensureSpace(y + sp.section * 0.6, sp.section + notesH)
    k.rule(mx, y, W - mx, c.border, sp.rule)
    y += sp.section
    noteBlocks.forEach(([label, text], i) => {
      const x = mx + i * (nW + sp.columnGap)
      const h = labelBlock(label, x, y, nW)
      k.font(sz.base, false, c.muted)
      k.lines(k.wrap(text, nW), x, y + h, sz.base)
    })
    y += notesH + sp.section
  }

  // Footer
  if (model.footer) {
    k.font(sz.footer)
    const lines = k.wrap(model.footer, cw)
    y = ensureSpace(y + sp.section * 0.6, sp.section * 0.6 + lines.length * k.lh(sz.footer))
    k.rule(mx, y, W - mx, c.border, sp.rule)
    y += sp.section * 0.6
    k.font(sz.footer, false, c.faint)
    k.lines(lines, W / 2, y, sz.footer, 'center')
  }

  // Status stamp (page 1), rotated, translucent, with a rotated border
  if (model.stamp) {
    const st = spec.stamp
    pdf.setPage(1)
    const color = c[`stamp${model.stamp.tone[0].toUpperCase()}${model.stamp.tone.slice(1)}`] || c.stampNeutral
    const label = model.stamp.label.toUpperCase()
    k.font(sz.stamp, true, color)
    const tw = k.width(label)
    const th = sz.stamp * PT_TO_MM
    const cx = W / 2
    const cy = H * st.topRatio
    const a = (-st.rotateDeg * Math.PI) / 180
    const rot = (dx, dy) => [cx + dx * Math.cos(a) + dy * Math.sin(a), cy - dx * Math.sin(a) + dy * Math.cos(a)]
    pdf.saveGraphicsState()
    pdf.setGState(new pdf.GState({ opacity: st.opacity, 'stroke-opacity': st.opacity }))
    const [tx, ty] = rot(-tw / 2, th * 0.35)
    pdf.text(label, tx, ty, { angle: -st.rotateDeg })
    const bw = tw / 2 + 7
    const bh = th / 2 + 2.5
    const corners = [rot(-bw, -bh), rot(bw, -bh), rot(bw, bh), rot(-bw, bh)]
    pdf.setDrawColor(...rgb(color))
    pdf.setLineWidth(st.borderMm)
    corners.forEach((p, i) => { const q = corners[(i + 1) % 4]; pdf.line(p[0], p[1], q[0], q[1]) })
    pdf.restoreGraphicsState()
  }

  // Page x of y
  const pages = pdf.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i)
    k.font(sz.pageNumber, false, c.faint)
    pdf.text(`Page ${i} of ${pages}`, W - mx, H - spec.marginBottomMm / 2, { align: 'right', baseline: 'middle' })
  }
}

// ── Thermal receipt ─────────────────────────────────────────────────────────

/** Draws the receipt top to bottom; returns the y reached (mm). */
function drawReceipt({ pdf, model, layout, family, logo }) {
  const { spec, paper, receipt } = layout
  const W = paper.widthMm
  const mx = receipt.marginXMm
  const cw = W - 2 * mx
  const sz = receipt.sizesPt
  const c = spec.colors
  const k = kit(pdf, family, spec.lineHeight)
  let y = receipt.marginYMm
  const center = (text, size, bold = false, color = c.text) => {
    k.font(size, bold, color)
    y += k.lines(k.wrap(text, cw), W / 2, y, size, 'center')
  }
  const row = (left, right, size = sz.base, bold = false) => {
    k.font(size, bold, c.text)
    const rw = right ? k.width(right) : 0
    const lines = k.wrap(left, cw - rw - (right ? 2 : 0))
    if (right) k.lines([right], W - mx, y, size, 'right')
    y += Math.max(k.lines(lines, mx, y, size), k.lh(size))
  }
  const rule = () => {
    y += spec.ruleGapMm
    k.rule(mx, y, W - mx, c.rule, spec.ruleMm, spec.dashMm)
    y += spec.ruleGapMm
  }

  if (logo) {
    const box = fitImage(logo, receipt.logoMaxWidthMm, receipt.logoMaxHeightMm)
    addLogo(pdf, logo, (W - box.w) / 2, y, box.w, box.h)
    y += box.h + spec.gapMm * 0.5
  }
  if (model.brandName) center(model.brandName, sz.brand, true)
  model.parties[0].lines.forEach((line) => center(line, sz.small, false, c.muted))
  rule()
  center(model.title.toUpperCase(), sz.title, true)
  if (model.number) center(`#${model.number}`, sz.small, false, c.muted)
  if (model.stamp) center(`*** ${model.stamp.label.toUpperCase()} ***`, sz.title, true)
  model.meta.forEach((m) => row(m.label, m.value))
  if (model.receipt.customer) row('Customer', model.receipt.customer)
  rule()
  model.receipt.items.forEach((item) => {
    k.font(sz.base, false, c.text)
    y += k.lines(k.wrap(item.name || 'Item', cw), mx, y, sz.base)
    row(item.detail, item.total)
    if (item.discount) row('  Discount', item.discount)
    y += spec.gapMm * 0.3
  })
  if (model.totals.length) {
    rule()
    model.totals.forEach((t) => {
      const strong = t.tone === 'grand' || t.tone === 'balance' || t.tone === 'strong'
      row(t.label, t.value, strong ? sz.total : sz.base, strong)
    })
  }
  if (model.receipt.payments.length) {
    rule()
    k.font(sz.small, true, c.text)
    y += k.lines(['Payments'], mx, y, sz.small)
    model.receipt.payments.forEach((p) => row(p.label, p.value, sz.small))
  }
  if (model.words || model.notes || model.terms || model.footer || model.reason) rule()
  if (model.words) center(model.words, sz.small, false, c.muted)
  if (model.reason) { k.font(sz.small, false, c.muted); y += k.lines(k.wrap(model.reason, cw), mx, y, sz.small) }
  if (model.notes) center(model.notes, sz.small, false, c.muted)
  if (model.terms) { k.font(sz.small, false, c.muted); y += k.lines(k.wrap(model.terms, cw), mx, y, sz.small) }
  if (model.footer) center(model.footer, sz.small, false, c.muted)
  return y + receipt.marginYMm
}

/**
 * @param {{
 *   jsPDF: any, autoTable: Function,
 *   model: ReturnType<import('../templates/paperModel.js').buildPaperModel>,
 *   layout: ReturnType<import('../templates/specs.js').resolveLayout>,
 *   fonts?: { family: string, regular: string, bold: string } | null,
 *   logo?: { dataUrl: string, width: number, height: number, format?: 'PNG' | 'JPEG' } | null,
 *   compress?: boolean,
 * }} input
 * @returns {any} the jsPDF document
 */
export function renderPdf({ jsPDF, autoTable, model, layout, fonts = null, logo = null, compress = true }) {
  const { paper } = layout
  const make = (height) => {
    const pdf = new jsPDF({ unit: 'mm', format: [paper.widthMm, height], orientation: 'portrait', compress, putOnlyUsedFonts: true })
    const family = registerPdfFonts(pdf, fonts)
    return { pdf, family }
  }

  let result
  if (layout.kind === 'receipt') {
    // Two passes: measure the content height on a very tall page, then draw
    // on one continuous page of exactly that height.
    const probe = make(5000)
    const height = Math.max(drawReceipt({ ...probe, model, layout, logo }), paper.widthMm)
    result = make(height)
    drawReceipt({ ...result, model, layout, logo })
  } else {
    result = make(paper.heightMm)
    drawPage({ ...result, autoTable, model, layout, logo })
  }

  result.pdf.setProperties({
    title: [model.title, model.number].filter(Boolean).join(' '),
    subject: model.title,
    author: model.brandName || '',
    creator: PDF_CREATOR,
  })
  result.pdf.setCreationDate(new Date())
  return result.pdf
}
