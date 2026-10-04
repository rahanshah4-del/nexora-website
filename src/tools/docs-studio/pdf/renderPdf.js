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

import { PT_TO_MM, fitColumns } from '../templates/specs.js'
import { registerTemplateFonts } from './fonts.js'

export const PDF_CREATOR = 'Nexora Docs Studio – nexorasolution.online'

function rgb(hex) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex || '#000000'))
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0]
}

/** `a` over `b` at opacity t (the HTML side column's translucent text). */
function mix(a, b, t) {
  const [x, y] = [rgb(a), rgb(b)]
  return `#${x.map((v, i) => Math.round(v * t + y[i] * (1 - t)).toString(16).padStart(2, '0')).join('')}`
}

/** Small drawing kit over one jsPDF instance (units: mm, sizes: pt). */
function kit(pdf, family, lineHeight) {
  const k = {
    family,
    lh: (sizePt, factor = lineHeight) => sizePt * PT_TO_MM * factor,
    font(sizePt, bold = false, color = '#000000', fam = family) {
      pdf.setFont(fam, bold ? 'bold' : 'normal')
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
    vrule(x, y1, y2, color, widthMm) {
      pdf.setDrawColor(...rgb(color))
      pdf.setLineWidth(widthMm)
      pdf.line(x, y1, x, y2)
    },
    fill(x, y, w, h, color) {
      pdf.setFillColor(...rgb(color))
      pdf.rect(x, y, w, h, 'F')
    },
    box(x, y, w, h, color, widthMm) {
      pdf.setDrawColor(...rgb(color))
      pdf.setLineWidth(widthMm)
      pdf.rect(x, y, w, h, 'S')
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

function addLogo(pdf, logo, x, y, w, h, alias = 'logo') {
  try {
    pdf.addImage(logo.dataUrl, logo.format || 'PNG', x, y, w, h, alias, 'FAST')
    return true
  } catch {
    return false
  }
}

/** Letterhead image under the page content, placed by specs.js letterheadPlacement. */
function addLetterhead(pdf, letterhead, fit) {
  try {
    pdf.addImage(letterhead.data, letterhead.format || 'PNG', fit.x, fit.y, fit.w, fit.h, 'letterhead', 'FAST')
    return true
  } catch {
    return false
  }
}

// ── Page templates (A4 / Letter) ─────────────────────────────────────────────
// Mirrors templates/PaperTemplate.jsx + paper.css section by section; every
// number comes from the resolved layout (specs.js resolvePageLayout).

function drawPage({ pdf, autoTable, model, layout, families, logo, letterhead, signature = null, seal = null }) {
  const { spec, paper } = layout
  const W = paper.widthMm
  const H = paper.heightMm
  const c = spec.colors
  const sz = spec.sizesPt
  const sp = spec.spacingMm
  const hd = spec.header
  const show = spec.show
  const geo = spec.pages
  const lh = spec.letterhead
  const sidebar = spec.layout === 'sidebar'
  const sideW = sidebar ? spec.sidebar.widthMm : 0
  const left = sideW + spec.marginLeftMm
  const right = W - spec.marginRightMm
  const cw = right - left
  const accent = model.accent
  const onAccent = model.onAccent
  const k = kit(pdf, families.body, spec.lineHeight)
  const heading = families.heading
  const label = (text) => (spec.labelUppercase ? text.toUpperCase() : text)
  const labelBlock = (text, x, y, width, color = c.muted, align = 'left') => {
    k.font(sz.label, true, color)
    return k.lines(k.wrap(label(text), width), x, y, sz.label, align) + sp.labelGap
  }

  // Page decoration drawn before any content: the letterhead (all pages or
  // page 1) and the side column's background.
  const decorated = new Set()
  const decorate = (pageNo) => {
    if (decorated.has(pageNo)) return
    decorated.add(pageNo)
    if (letterhead && spec.letterheadFit && (lh.pages === 'all' || pageNo === 1)) addLetterhead(pdf, letterhead, spec.letterheadFit)
    if (sidebar) k.fill(0, 0, sideW, H, spec.sidebar.fill === 'accent' ? accent : c.surface)
  }
  decorate(1)
  const pageBottom = H - geo.bottomMm
  const newPage = () => {
    pdf.addPage([W, H], 'portrait')
    decorate(pdf.getNumberOfPages())
    return geo.laterTopMm
  }
  const ensureSpace = (y, needed) => (y + needed <= pageBottom ? y : newPage())

  // ── Side column (page 1): business, client, dates ──
  if (sidebar) {
    const px = spec.sidebar.padXMm
    const sw = sideW - 2 * px
    const onSide = spec.sidebar.fill === 'accent' ? onAccent : c.text
    const sideMuted = spec.sidebar.fill === 'accent' ? mix(onAccent, accent, 0.78) : c.muted
    let sy = spec.sidebar.padTopMm
    if (logo && show.logo) {
      const box = fitImage(logo, Math.min(hd.logoMaxWidthMm, sw - 5), hd.logoMaxHeightMm)
      pdf.setFillColor(255, 255, 255)
      pdf.roundedRect(px, sy, box.w + 5, box.h + 5, 2.5, 2.5, 'F')
      addLogo(pdf, logo, px + 2.5, sy + 2.5, box.w, box.h)
      sy += box.h + 5 + 3
    }
    k.font(sz.brand, true, model.brandName ? onSide : sideMuted, heading)
    sy += k.lines(k.wrap(model.brandName || 'Your business', sw), px, sy, sz.brand, 'left', hd.brandLineHeight) + 1.2
    const seller = model.parties.find((p) => p.role === 'from')
    k.font(sz.small, false, sideMuted)
    seller?.lines.forEach((line) => { sy += k.lines(k.wrap(line, sw), px, sy, sz.small) })
    const gap = sp.section * 1.4
    if (spec.sections.includes('parties')) {
      model.parties.filter((p) => p.role !== 'from').forEach((party) => {
        sy += gap
        sy += labelBlock(party.label, px, sy, sw, sideMuted)
        if (party.empty) {
          k.font(sz.party, true, sideMuted, heading)
          sy += k.lines(k.wrap(party.placeholder, sw), px, sy, sz.party)
          return
        }
        if (party.name) { k.font(sz.party, true, onSide, heading); sy += k.lines(k.wrap(party.name, sw), px, sy, sz.party) }
        k.font(sz.small, false, sideMuted)
        party.lines.forEach((line) => { sy += k.lines(k.wrap(line, sw), px, sy, sz.small) })
      })
    }
    if (spec.sections.includes('meta') && model.meta.length) {
      sy += gap
      model.meta.forEach((m, i) => {
        if (i) sy += sp.section * 0.8
        sy += labelBlock(m.label, px, sy, sw, sideMuted)
        k.font(sz.base, true, onSide)
        sy += k.lines(k.wrap(m.value, sw), px, sy, sz.base)
      })
    }
  }

  // ── Header ──
  const style = hd.htmlStyle
  let y
  if (lh) y = geo.firstTopMm
  else if (sidebar || style === 'fullBand') y = 0
  else if (style === 'band') { k.fill(0, 0, W, hd.bandHeightMm, accent); y = hd.bandHeightMm }
  else y = spec.marginTopMm

  const drawHeader = () => {
    const headTop = y + hd.padTopMm
    const titleText = hd.titleUppercase ? model.title.toUpperCase() : model.title
    const titleBold = hd.titleWeight >= 600
    const titleColor = hd.titleColor === 'accent' ? accent : hd.titleColor === 'onAccent' ? onAccent : c.text
    const numberText = model.number ? `# ${model.number}` : ''
    k.font(sz.title, titleBold, titleColor, heading)
    const titleW = k.width(titleText)
    k.font(sz.number, true)
    const titleBlockW = Math.max(titleW, numberText ? k.width(numberText) : 0)
    const titleH = k.lh(sz.title, hd.titleLineHeight) + (numberText ? hd.numberGapMm + k.lh(sz.number) : 0)
    const showBrand = hd.showBrand && !sidebar
    const brandW = cw - titleBlockW - sp.columnGap
    let brandH = 0
    let logoBox = null
    let brandLines = []
    if (showBrand && logo && show.logo) {
      logoBox = fitImage(logo, Math.min(hd.logoMaxWidthMm, brandW), hd.logoMaxHeightMm)
      brandH = logoBox.h
    } else if (showBrand) {
      k.font(sz.brand, true, c.text, heading)
      brandLines = k.wrap(model.brandName || 'Your business', brandW)
      brandH = brandLines.length * k.lh(sz.brand, hd.brandLineHeight)
    }
    const contentH = Math.max(brandH, titleH)
    const block = style === 'fullBand'
    if (block) k.fill(0, 0, W, headTop + contentH + hd.padBottomMm, accent)
    const titleLeft = hd.align === 'titleLeft' || sidebar
    // fullBand centres both blocks vertically (align-items: center).
    const brandY = headTop + (block ? (contentH - brandH) / 2 : 0)
    const titleY = headTop + (block ? (contentH - titleH) / 2 : 0)
    if (logoBox) {
      const lx = titleLeft ? right - logoBox.w : left
      if (block) { pdf.setFillColor(255, 255, 255); pdf.roundedRect(lx - 1.5, brandY - 1.5, logoBox.w + 3, logoBox.h + 3, 1.5, 1.5, 'F') }
      addLogo(pdf, logo, lx, brandY, logoBox.w, logoBox.h)
    } else if (brandLines.length) {
      k.font(sz.brand, true, block ? onAccent : model.brandName ? c.text : c.faint, heading)
      k.lines(brandLines, titleLeft ? right : left, brandY, sz.brand, titleLeft ? 'right' : 'left', hd.brandLineHeight)
    }
    const tx = titleLeft ? left : right
    const talign = titleLeft ? 'left' : 'right'
    k.font(sz.title, titleBold, titleColor, heading)
    k.lines([titleText], tx, titleY, sz.title, talign, hd.titleLineHeight)
    if (numberText) {
      k.font(sz.number, true, block ? mix(onAccent, accent, 0.85) : c.muted)
      k.lines([numberText], tx, titleY + k.lh(sz.title, hd.titleLineHeight) + hd.numberGapMm, sz.number, talign)
    }
    y = headTop + contentH + hd.padBottomMm
    if (block) y += sp.section
  }

  const drawParties = () => {
    if (sidebar) return
    const parties = hd.showBrand ? model.parties : model.parties.filter((p) => p.role !== 'from')
    if (!parties.length) return
    if (style !== 'fullBand' && !lh) { k.rule(left, y, right, c.border, sp.rule); y += sp.section }
    const colW = (cw - sp.columnGap * (parties.length - 1)) / parties.length
    let partiesH = 0
    parties.forEach((party, i) => {
      const x = left + i * (colW + sp.columnGap)
      let h = labelBlock(party.label, x, y, colW)
      if (party.empty) {
        k.font(sz.party, true, c.faint, heading)
        h += k.lines(k.wrap(party.placeholder, colW), x, y + h, sz.party)
      } else {
        if (party.name) { k.font(sz.party, true, c.text, heading); h += k.lines(k.wrap(party.name, colW), x, y + h, sz.party) }
        k.font(sz.base, false, c.muted)
        party.lines.forEach((line) => { h += k.lines(k.wrap(line, colW), x, y + h, sz.base) })
      }
      partiesH = Math.max(partiesH, h)
    })
    y += partiesH + sp.section
  }

  const drawMeta = () => {
    if (sidebar || !model.meta.length) return
    if (spec.metaStyle === 'boxed') {
      const cellW = cw / model.meta.length
      const padX = spec.table.cellPadXMm
      const padY = spec.table.cellPadYMm * 0.9
      const cells = model.meta.map((m) => {
        k.font(sz.base, true)
        return k.wrap(m.value, cellW - 2 * padX)
      })
      const boxH = 2 * padY + k.lh(sz.label) + sp.labelGap + Math.max(...cells.map((l) => l.length)) * k.lh(sz.base)
      y = ensureSpace(y, boxH)
      k.fill(left, y, cw, boxH, c.surface)
      model.meta.forEach((m, i) => {
        const x = left + i * cellW
        if (i) k.vrule(x, y, y + boxH, c.border, sp.rule)
        labelBlock(m.label, x + padX, y + padY, cellW - 2 * padX)
        k.font(sz.base, true, c.text)
        k.lines(cells[i], x + padX, y + padY + k.lh(sz.label) + sp.labelGap, sz.base)
      })
      k.box(left, y, cw, boxH, c.border, sp.rule)
      y += boxH + sp.section
      return
    }
    k.rule(left, y, right, c.border, sp.rule)
    y += sp.section
    const rowH = k.lh(sz.label) + sp.labelGap + k.lh(sz.base)
    let x = left
    model.meta.forEach((m) => {
      k.font(sz.label, true); const lw = k.width(label(m.label))
      k.font(sz.base, true); const vw = k.width(m.value)
      const w = Math.max(lw, vw)
      if (x > left && x + w > right) { x = left; y += rowH + sp.section * 0.6 }
      labelBlock(m.label, x, y, w + 1)
      k.font(sz.base, true, c.text)
      k.lines([m.value], x, y + k.lh(sz.label) + sp.labelGap, sz.base)
      x += w + sp.metaGap
    })
    y += rowH + sp.section
  }

  const drawItems = () => {
    const tb = spec.table
    const { columns, unitInQty } = fitColumns(show.itemNumbers ? model.columns : model.columns.filter((col) => col.key !== 'index'), cw)
    const cell = (row, key) => (key === 'qty' && unitInQty && row.cells.unit ? `${row.cells.qty} ${row.cells.unit}` : row.cells[key])
    const heads = {
      filled: { fillColor: rgb(accent), textColor: rgb(onAccent), lineWidth: 0 },
      tinted: { fillColor: rgb(c.surface), textColor: rgb(c.text), lineWidth: 0 },
      underline: { fillColor: false, textColor: rgb(accent), lineWidth: { bottom: tb.headRuleMm }, lineColor: rgb(accent) },
      lined: { fillColor: false, textColor: rgb(c.muted), lineWidth: { top: sp.rule, bottom: sp.rule }, lineColor: rgb(c.text) },
      boxed: { fillColor: rgb(c.surface), textColor: rgb(c.text), lineWidth: sp.rule, lineColor: rgb(c.border) },
    }
    const pad = { top: tb.cellPadYMm, bottom: tb.cellPadYMm, left: tb.cellPadXMm, right: tb.cellPadXMm }
    const last = columns.length - 1
    const body = model.rows.length
      ? model.rows.map((row) => columns.map((col) => cell(row, col.key)))
      : [[{ content: 'No items yet', colSpan: columns.length, styles: { halign: 'center', textColor: rgb(c.faint), fontStyle: 'normal' } }]]
    if (sidebar) y += sp.section
    autoTable(pdf, {
      startY: y,
      margin: { left, right: W - right, top: geo.laterTopMm, bottom: geo.bottomMm },
      head: [columns.map((col) => col.label.toUpperCase())],
      body,
      theme: 'plain',
      showHead: 'everyPage',
      rowPageBreak: 'avoid',
      styles: {
        font: families.body,
        fontSize: sz.base,
        textColor: rgb(c.text),
        cellPadding: pad,
        lineColor: rgb(c.border),
        lineWidth: tb.style === 'boxed' ? sp.rule : { bottom: sp.rule },
        valign: 'top',
        overflow: 'linebreak',
        minCellHeight: 0,
      },
      headStyles: { fontStyle: 'bold', fontSize: sz.tableHead, ...heads[tb.style] },
      alternateRowStyles: tb.zebra ? { fillColor: rgb(c.zebra) } : {},
      columnStyles: Object.fromEntries(columns.map((col, i) => [i, {
        halign: col.align,
        cellWidth: col.widthMm ?? 'auto',
        fontStyle: col.key === 'amount' ? 'bold' : 'normal',
        ...(col.key === 'index' ? { textColor: rgb(c.muted) } : {}),
        ...(col.align === 'right' ? { overflow: 'visible' } : {}),
        // "lined": the table's outer columns sit flush with the text column.
        ...(tb.style === 'lined' && (i === 0 || i === last) ? { cellPadding: { ...pad, ...(i === 0 ? { left: 0 } : {}), ...(i === last ? { right: 0 } : {}) } } : {}),
      }])),
      didParseCell: (data) => {
        if (data.section === 'head') data.cell.styles.halign = columns[data.column.index]?.align || 'left'
      },
      willDrawPage: () => decorate(pdf.getCurrentPageInfo().pageNumber),
    })
    y = pdf.lastAutoTable.finalY + sp.section
  }

  const drawSummary = () => {
    const ts = spec.totals
    const boxed = ts.style === 'boxed'
    const boxPad = boxed ? ts.boxPadMm : 0
    const totalsX = right - ts.widthMm
    const sideTextW = cw - ts.widthMm - sp.columnGap
    const rowSize = (row) => (row.tone === 'grand' ? sz.total : row.tone === 'balance' ? sz.balance : row.tone === 'muted' ? sz.small : sz.base)
    const firstPad = boxed ? 1.5 : 0
    const totalsH = model.totals.reduce((h, row) => h + k.lh(rowSize(row)) + 2 * ts.rowPadYMm, firstPad)
    const words = show.amountInWords ? model.words : ''
    const sideBlocks = [words ? ['Amount in words', words] : null, model.reason ? ['Reason', model.reason] : null].filter(Boolean)
    k.font(sz.base)
    const sideH = sideBlocks.reduce((h, [, text]) => h + k.lh(sz.label) + sp.labelGap + k.wrap(text, sideTextW).length * k.lh(sz.base) + sp.section, 0)
    if (!model.totals.length && !sideBlocks.length) return
    y = ensureSpace(y, Math.max(totalsH, sideH))
    let sy = y
    sideBlocks.forEach(([title, text]) => {
      sy += labelBlock(title, left, sy, sideTextW)
      k.font(sz.base, false, c.text)
      sy += k.lines(k.wrap(text, sideTextW), left, sy, sz.base) + sp.section
    })
    let ty = y
    if (model.totals.length && boxed) k.fill(totalsX, y, ts.widthMm, totalsH, c.surface)
    model.totals.forEach((row, i) => {
      const size = rowSize(row)
      const rowH = k.lh(size) + 2 * ts.rowPadYMm + (i === 0 ? firstPad : 0)
      // Half-leading above the glyphs, as CSS centres text in its line box.
      const textY = ty + ts.rowPadYMm + (i === 0 ? firstPad : 0) + (k.lh(size) - size * PT_TO_MM) / 2
      const strong = row.tone === 'strong' || row.tone === 'grand' || row.tone === 'balance'
      let color = row.tone === 'muted' ? c.faint : strong ? c.text : c.muted
      let valueColor = row.tone === 'muted' ? c.faint : c.text
      let padL = boxPad
      let padR = boxPad
      if (row.tone === 'grand') k.rule(totalsX, ty, totalsX + ts.widthMm, c.text, sp.rule * 1.4)
      if (row.tone === 'balance' && ts.balance === 'fill') {
        k.fill(totalsX, ty, ts.widthMm, rowH, accent)
        color = onAccent
        valueColor = onAccent
        padL = ts.balancePadXMm
        padR = ts.balancePadXMm
      } else if (row.tone === 'balance') {
        k.rule(totalsX, ty, totalsX + ts.widthMm, c.border, sp.rule)
        color = accent
        valueColor = accent
      }
      k.font(size, strong, color, row.tone === 'grand' ? heading : families.body)
      k.lines([row.label], totalsX + padL, textY, size)
      k.font(size, strong, valueColor)
      k.lines([row.value], totalsX + ts.widthMm - padR, textY, size, 'right')
      ty += rowH
    })
    if (model.totals.length && boxed) k.box(totalsX, y, ts.widthMm, totalsH, c.border, sp.rule)
    y = Math.max(ty, sy) + sp.section
  }

  // How to pay (rows, instructions, QR) on the left; signature and stamp on the right.
  const drawPayAndSign = () => {
    const pay = model.payment
    const so = model.signoff
    if (!pay && !so) return
    const signW = so ? Math.min(62, cw * 0.4) : 0
    const payW = pay ? cw - (so ? signW + sp.columnGap : 0) : 0
    const qrSize = pay?.qr ? 24 : 0
    const textW = pay ? payW - (qrSize ? qrSize + 4 : 0) : 0
    const labelW = Math.min(30, textW * 0.4)

    k.font(sz.base)
    const rowLines = pay ? pay.rows.map((row) => k.wrap(row.value, textW - labelW)) : []
    const instrLines = pay?.instructions ? k.wrap(pay.instructions, textW) : []
    const payTextH = pay
      ? k.lh(sz.label) + sp.labelGap + rowLines.reduce((h, l) => h + Math.max(1, l.length) * k.lh(sz.base), 0) + (instrLines.length ? 1.5 + instrLines.length * k.lh(sz.base) : 0)
      : 0
    const payH = pay ? Math.max(payTextH, qrSize ? qrSize + k.lh(sz.label) + 1 : 0) : 0
    const markH = so && (signature || seal) ? 20 : so ? 12 : 0
    const signH = so ? markH + 1.5 + k.lh(sz.label) + (so.name ? k.lh(sz.base) : 0) + (so.title ? k.lh(sz.base) : 0) : 0
    const blockH = Math.max(payH, signH)
    y = ensureSpace(y + sp.section * 0.4, blockH + sp.section * 0.6)
    const top = y

    if (pay) {
      let py = top + labelBlock('Payment details', left, top, textW)
      rowLines.forEach((lines, i) => {
        k.font(sz.base, false, c.muted)
        k.lines(k.wrap(pay.rows[i].label, labelW - 2).slice(0, 1), left, py, sz.base)
        k.font(sz.base, false, c.text)
        py += k.lines(lines.length ? lines : [''], left + labelW, py, sz.base)
      })
      if (instrLines.length) {
        py += 1.5
        k.font(sz.base, false, c.muted)
        k.lines(instrLines, left, py, sz.base)
      }
      if (pay.qr) {
        const qx = left + payW - qrSize
        const cell = qrSize / pay.qr.size
        pdf.setFillColor(0, 0, 0)
        // One rectangle per horizontal run of dark modules: small and crisp.
        for (let r = 0; r < pay.qr.size; r++) {
          let run = -1
          for (let col = 0; col <= pay.qr.size; col++) {
            const on = col < pay.qr.size && pay.qr.cells[r * pay.qr.size + col]
            if (on && run < 0) run = col
            if (!on && run >= 0) {
              pdf.rect(qx + run * cell, top + r * cell, (col - run) * cell + 0.01, cell + 0.01, 'F')
              run = -1
            }
          }
        }
        k.font(sz.label, false, c.muted)
        k.lines([pay.qrCaption], qx + qrSize / 2, top + qrSize + 1, sz.label, 'center')
      }
    }

    if (so) {
      const sx = right - signW
      if (seal) {
        const box = fitImage(seal, 22, 22)
        try {
          pdf.saveGraphicsState()
          pdf.setGState(new pdf.GState({ opacity: 0.9 }))
          pdf.addImage(seal.dataUrl, seal.format || 'PNG', sx + signW - box.w - 2, top + Math.max(0, (markH - box.h) / 2), box.w, box.h, 'seal', 'FAST')
          pdf.restoreGraphicsState()
        } catch { /* unreadable image: the line and names still print */ }
      }
      if (signature) {
        const box = fitImage(signature, signW - 6, markH - 1)
        addLogo(pdf, signature, sx + 2, top + markH - box.h, box.w, box.h, 'signature')
      }
      let sy = top + markH
      k.rule(sx, sy, right, c.text, sp.rule)
      sy += 1.5
      k.font(sz.label, false, c.muted)
      sy += k.lines([label(so.label)], sx, sy, sz.label)
      if (so.name) { k.font(sz.base, true, c.text); sy += k.lines(k.wrap(so.name, signW).slice(0, 1), sx, sy, sz.base) }
      if (so.title) { k.font(sz.base, false, c.muted); k.lines(k.wrap(so.title, signW).slice(0, 1), sx, sy, sz.base) }
    }
    y = top + blockH + sp.section
  }

  const drawNotes = () => {
    drawNotesText()
    drawPayAndSign()
  }

  const drawNotesText = () => {
    const blocks = [show.notes && model.notes ? ['Notes', model.notes] : null, show.terms && model.terms ? ['Terms', model.terms] : null].filter(Boolean)
    if (!blocks.length) return
    const nW = (cw - sp.columnGap * (blocks.length - 1)) / blocks.length
    k.font(sz.base)
    const notesH = Math.max(...blocks.map(([, text]) => k.lh(sz.label) + sp.labelGap + k.wrap(text, nW).length * k.lh(sz.base)))
    y = ensureSpace(y + sp.section * 0.6, sp.section + notesH)
    k.rule(left, y, right, c.border, sp.rule)
    y += sp.section
    blocks.forEach(([title, text], i) => {
      const x = left + i * (nW + sp.columnGap)
      const h = labelBlock(title, x, y, nW)
      k.font(sz.base, false, c.muted)
      k.lines(k.wrap(text, nW), x, y + h, sz.base)
    })
    y += notesH + sp.section
  }

  const drawFooter = () => {
    if (!show.footer || !model.footer) return
    k.font(sz.footer)
    const lines = k.wrap(model.footer, cw)
    y = ensureSpace(y + sp.section * 0.6, sp.section * 0.6 + lines.length * k.lh(sz.footer))
    k.rule(left, y, right, c.border, sp.rule)
    y += sp.section * 0.6
    k.font(sz.footer, false, c.faint)
    k.lines(lines, left + cw / 2, y, sz.footer, 'center')
  }

  const sections = { header: drawHeader, parties: drawParties, meta: drawMeta, items: drawItems, summary: drawSummary, notes: drawNotes, footer: drawFooter }
  spec.sections.forEach((id) => sections[id]?.())

  // Status stamp (page 1), rotated, translucent, with a rotated border
  if (show.stamp && model.stamp) {
    const st = spec.stamp
    pdf.setPage(1)
    const color = c[`stamp${model.stamp.tone[0].toUpperCase()}${model.stamp.tone.slice(1)}`] || c.stampNeutral
    const stampLabel = model.stamp.label.toUpperCase()
    k.font(sz.stamp, true, color)
    const tw = k.width(stampLabel)
    const th = sz.stamp * PT_TO_MM
    const cx = W / 2
    const cy = H * st.topRatio
    const a = (-st.rotateDeg * Math.PI) / 180
    const rot = (dx, dy) => [cx + dx * Math.cos(a) + dy * Math.sin(a), cy - dx * Math.sin(a) + dy * Math.cos(a)]
    pdf.saveGraphicsState()
    pdf.setGState(new pdf.GState({ opacity: st.opacity, 'stroke-opacity': st.opacity }))
    const [tx, ty] = rot(-tw / 2, th * 0.35)
    pdf.text(stampLabel, tx, ty, { angle: -st.rotateDeg })
    const bw = tw / 2 + 7
    const bh = th / 2 + 2.5
    const corners = [rot(-bw, -bh), rot(bw, -bh), rot(bw, bh), rot(-bw, bh)]
    pdf.setDrawColor(...rgb(color))
    pdf.setLineWidth(st.borderMm)
    corners.forEach((p, i) => { const q = corners[(i + 1) % 4]; pdf.line(p[0], p[1], q[0], q[1]) })
    pdf.restoreGraphicsState()
  }

  // Page x of y: centred in the bottom margin, or — letterheads — just inside
  // the bottom safe area, clear of the letterhead's own footer (as printed).
  if (show.pageNumbers) {
    const pages = pdf.getNumberOfPages()
    for (let i = 1; i <= pages; i++) {
      pdf.setPage(i)
      k.font(sz.pageNumber, false, c.faint)
      if (lh) pdf.text(`Page ${i} of ${pages}`, right, H - geo.bottomMm + 4, { align: 'right', baseline: 'top' })
      else pdf.text(`Page ${i} of ${pages}`, right, H - geo.bottomMm / 2, { align: 'right', baseline: 'middle' })
    }
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
 *   fonts?: { family: string, regular: string, bold: string } | null,       Noto Sans (null: Helvetica fallback)
 *   serifFonts?: { family: string, regular: string, bold: string } | null,  Noto Serif, for serif templates
 *   logo?: { dataUrl: string, width: number, height: number, format?: 'PNG' | 'JPEG' } | null,
 *   letterhead?: { data: Uint8Array | string, format: 'PNG' | 'JPEG' } | null,  image drawn under each page
 *   signature?, seal?: same shape as logo, drawn above the signature line (page templates only)
 *   compress?: boolean,
 * }} input
 * @returns {any} the jsPDF document
 */
export function renderPdf({ jsPDF, autoTable, model, layout, fonts = null, serifFonts = null, logo = null, letterhead = null, signature = null, seal = null, compress = true }) {
  const { paper } = layout
  const make = (height) => {
    const pdf = new jsPDF({ unit: 'mm', format: [paper.widthMm, height], orientation: 'portrait', compress, putOnlyUsedFonts: true })
    const families = registerTemplateFonts(pdf, { sans: fonts, serif: serifFonts }, layout)
    return { pdf, families, family: families.body }
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
    drawPage({ ...result, autoTable, model, layout, logo, letterhead, signature, seal })
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
