/**
 * One layout for every output. layoutPayStub() turns the pay stub and its
 * calculation into a flat list of drawing primitives in millimetres (rect,
 * line, text, image). The live preview and the PNG draw them as SVG; the PDF
 * draws the same list with jsPDF. So what you see is what you download.
 *
 * Text is measured through the `measure(text, sizePt, bold)` callback (canvas
 * in the browser, jsPDF for the PDF, a stub in tests), which keeps this module
 * pure.
 *
 * Every text baseline is alphabetic: item.y is the baseline.
 */

import { formatIsoDate } from '../docs-studio/engine/dates.js'
import { formatMoney } from '../docs-studio/engine/currency.js'
import { onAccentColor } from '../docs-studio/templates/color.js'
import { FREQUENCIES, PAPER_SIZES } from './engine.js'

export const PT = 25.4 / 72

export const TEMPLATES = Object.freeze({
  classic: { label: 'Classic', hint: 'Boxed tables, thin accent line', margin: 14, base: 9, headFill: true, band: false, boxed: true, zebra: false, rounded: 0 },
  modern: { label: 'Modern', hint: 'Accent bar and a rounded net-pay card', margin: 14, base: 9, headFill: true, band: true, boxed: false, zebra: true, rounded: 2 },
  minimal: { label: 'Minimal', hint: 'Clean lines, no fills', margin: 16, base: 9, headFill: false, band: false, boxed: false, zebra: false, rounded: 0 },
  compact: { label: 'Compact', hint: 'Dense layout for long stubs', margin: 10, base: 8, headFill: true, band: false, boxed: true, zebra: true, rounded: 0 },
})

const INK = '#0f172a'
const MUTED = '#64748b'
const RULE = '#cbd5e1'
const SOFT = '#f1f5f9'

function mixHex(a, b, t) {
  const parse = (h) => [1, 3, 5].map((i) => parseInt(String(h).slice(i, i + 2), 16) || 0)
  const [x, y] = [parse(a), parse(b)]
  return `#${x.map((v, i) => Math.round(v * t + y[i] * (1 - t)).toString(16).padStart(2, '0')).join('')}`
}

/** Word-wraps `text` (honouring \n) to `width` mm. */
export function wrapText(text, width, size, bold, measure) {
  const out = []
  for (const paragraph of String(text ?? '').split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (!words.length) { out.push(''); continue }
    let line = ''
    const push = () => { if (line) out.push(line); line = '' }
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word
      if (measure(candidate, size, bold) <= width) { line = candidate; continue }
      push()
      if (measure(word, size, bold) <= width) { line = word; continue }
      // a single word wider than the column: break it by characters
      let chunk = ''
      for (const ch of word) {
        if (measure(chunk + ch, size, bold) > width && chunk) { out.push(chunk); chunk = ch } else chunk += ch
      }
      line = chunk
    }
    push()
  }
  return out
}

/**
 * @param {{ state: object, calc: object, measure: (t: string, pt: number, bold: boolean) => number,
 *   sanitize?: (t: string) => string, currencyDisplay?: 'symbol' | 'code' }} input
 * @returns {{ width: number, height: number, items: object[], accent: string }}
 */
export function layoutPayStub({ state, calc, measure, sanitize = (t) => t, currencyDisplay = 'symbol' }) {
  const spec = TEMPLATES[state.appearance.template] || TEMPLATES.modern
  const paper = PAPER_SIZES[state.appearance.paper] || PAPER_SIZES.A4
  const accent = state.appearance.accent
  const onAccent = onAccentColor(accent)
  const tint = mixHex(accent, '#ffffff', 0.09)
  const W = paper.w
  const M = spec.margin
  const CW = W - M * 2
  const base = spec.base
  const items = []
  const clean = (t) => sanitize(String(t ?? ''))
  const money = (minor) => clean(formatMoney(minor, calc.currency, state.locale || 'en', { display: currencyDisplay }))
  const date = (iso) => clean(formatIsoDate(iso, state.locale || 'en', { dateStyle: 'medium' }))
  const lh = (size, f = 1.4) => size * PT * f

  const rect = (x, y, w, h, o = {}) => items.push({ type: 'rect', x, y, w, h, fill: o.fill || null, stroke: o.stroke || null, strokeWidth: o.strokeWidth ?? 0.25, radius: o.radius || 0 })
  const line = (x1, y1, x2, y2, color = RULE, width = 0.25) => items.push({ type: 'line', x1, y1, x2, y2, color, width })
  const text = (x, y, str, o = {}) => {
    const s = clean(str)
    if (s === '') return
    items.push({ type: 'text', x, y, text: s, size: o.size || base, bold: Boolean(o.bold), color: o.color || INK, align: o.align || 'left' })
  }
  /** Draws wrapped lines from `top`; returns the height used. */
  const paragraph = (x, top, str, width, o = {}) => {
    const size = o.size || base
    const lines = wrapText(clean(str), width, size, Boolean(o.bold), measure)
    let y = top
    for (const l of lines) {
      y += size * PT * 0.82
      text(x, y, l, { ...o, size })
      y += size * PT * 0.58
    }
    return lines.length * lh(size)
  }
  const fitImage = (img, maxW, maxH) => {
    const ratio = Math.min(maxW / img.width, maxH / img.height)
    return { w: img.width * ratio, h: img.height * ratio }
  }

  let y = 0
  if (spec.band) rect(0, 0, W, 6, { fill: accent })
  y = spec.band ? M + 4 : M

  /* ── Header: company on the left, document title on the right ── */
  const headTop = y
  const half = CW * 0.56
  let left = 0
  if (state.company.logo) {
    const f = fitImage(state.company.logo, 42, 16)
    items.push({ type: 'image', x: M, y: headTop, w: f.w, h: f.h, dataUrl: state.company.logo.dataUrl })
    left += f.h + 2.5
  }
  if (state.company.name) left += paragraph(M, headTop + left, state.company.name, half, { size: base + 4.5, bold: true })
  const contact = [state.company.address, [state.company.email, state.company.phone].filter(Boolean).join('  ·  '), state.company.taxId].filter(Boolean).join('\n')
  if (contact) left += paragraph(M, headTop + left, contact, half, { size: base - 0.5, color: MUTED })

  const titleSize = spec.band || spec.boxed ? 21 : 19
  const titleY = headTop + titleSize * PT * 0.82
  text(W - M, titleY, state.docTitle, { size: titleSize, bold: true, color: accent, align: 'right' })
  let right = lh(titleSize, 1.15)
  const periodLine = `${date(state.period.start)} – ${date(state.period.end)}`
  const freq = FREQUENCIES.find((f) => f.value === state.period.frequency)?.label
  text(W - M, headTop + right + base * PT * 0.9, periodLine, { size: base, color: MUTED, align: 'right' })
  right += lh(base)
  if (freq) { text(W - M, headTop + right + base * PT * 0.9, `Paid ${freq.toLowerCase()}`, { size: base - 0.5, color: MUTED, align: 'right' }); right += lh(base - 0.5) }

  y = headTop + Math.max(left, right) + 4
  line(M, y, W - M, y, spec.boxed || spec.band ? accent : RULE, spec.boxed || spec.band ? 0.6 : 0.3)
  y += 5

  /* ── Employee and pay details ── */
  const colGap = 8
  const colW = (CW - colGap) / 2
  const infoTop = y
  const infoStart = items.length
  const pad = spec.boxed || spec.band ? 3.5 : 0
  const small = base - 1.5
  text(M + pad, infoTop + pad + small * PT * 0.82, 'EMPLOYEE', { size: small, bold: true, color: accent })
  let ey = infoTop + pad + lh(small) + 0.5
  if (state.employee.name) ey += paragraph(M + pad, ey, state.employee.name, colW - pad * 2, { size: base + 2, bold: true })
  const empLines = [
    state.employee.id && `Employee ID: ${state.employee.id}`,
    [state.employee.title, state.employee.department].filter(Boolean).join(' · '),
    state.employee.address,
    state.employee.email,
    state.employee.taxId && `Tax ID: ${state.employee.taxId}`,
  ].filter(Boolean).join('\n')
  if (empLines) ey += paragraph(M + pad, ey, empLines, colW - pad * 2, { size: base - 0.5, color: MUTED })

  const rx = M + colW + colGap
  text(rx + pad, infoTop + pad + small * PT * 0.82, 'PAY DETAILS', { size: small, bold: true, color: accent })
  let ry = infoTop + pad + lh(small) + 0.5
  const pairs = [
    ['Pay period', periodLine],
    ['Pay date', date(state.period.payDate)],
    ['Pay frequency', freq || ''],
    ['Currency', calc.currency],
  ].filter(([, v]) => v)
  for (const [label, value] of pairs) {
    text(rx + pad, ry + base * PT * 0.85, label, { size: base - 0.5, color: MUTED })
    text(rx + colW - pad, ry + base * PT * 0.85, value, { size: base - 0.5, bold: true, align: 'right' })
    ry += lh(base - 0.5, 1.45)
  }
  const infoH = Math.max(ey, ry) - infoTop + pad
  // The boxes go behind the text already drawn for them.
  const boxes = []
  const box = (x, o) => boxes.push({ type: 'rect', x, y: infoTop, w: colW, h: infoH, fill: o.fill || null, stroke: o.stroke || null, strokeWidth: 0.25, radius: o.radius || 0 })
  if (spec.boxed) { box(M, { stroke: RULE }); box(rx, { stroke: RULE }) }
  else if (spec.band) { box(M, { fill: tint, radius: spec.rounded }); box(rx, { fill: tint, radius: spec.rounded }) }
  items.splice(infoStart, 0, ...boxes)
  y = infoTop + infoH + 6

  /* ── Tables ── */
  const showYtd = state.options.showYtd
  const colMoney = 27
  const colDetail = 46
  const cols = {
    ytdX: W - M - 2,
    curX: W - M - 2 - (showYtd ? colMoney : 0),
  }
  const detailRight = cols.curX - colMoney - 2
  const descW = detailRight - colDetail - M - 4

  const tableHead = (title) => {
    const h = lh(base, 1.55) + 1.4
    if (spec.headFill) rect(M, y, CW, h, { fill: accent, radius: spec.rounded && 1 })
    else line(M, y + h, W - M, y + h, INK, 0.4)
    const color = spec.headFill ? onAccent : INK
    const by = y + h / 2 + base * PT * 0.36
    text(M + 2, by, title, { size: base, bold: true, color })
    text(detailRight, by, 'Details', { size: base - 0.5, bold: true, color, align: 'right' })
    text(cols.curX, by, 'Current', { size: base - 0.5, bold: true, color, align: 'right' })
    if (showYtd) text(cols.ytdX, by, 'YTD', { size: base - 0.5, bold: true, color, align: 'right' })
    y += h
  }
  const tableRows = (rows, { ytd }) => {
    rows.forEach((row, i) => {
      const lines = wrapText(clean(row.label), descW, base, false, measure)
      const rowH = Math.max(lines.length * lh(base, 1.3), lh(base, 1.3)) + 2.6
      if (spec.zebra && i % 2 === 1) rect(M, y, CW, rowH, { fill: SOFT })
      lines.forEach((l, li) => text(M + 2, y + 1.3 + base * PT * 0.85 + li * lh(base, 1.3), l, { size: base }))
      const by = y + 1.3 + base * PT * 0.85
      if (row.detail) text(detailRight, by, row.detail, { size: base - 1, color: MUTED, align: 'right' })
      text(cols.curX, by, money(row.amount), { size: base, align: 'right' })
      if (ytd) { text(cols.ytdX, by, row.ytd ? money(row.ytd) : '–', { size: base, color: row.ytd ? INK : MUTED, align: 'right' }) }
      y += rowH
      if (!spec.zebra) line(M, y, W - M, y, RULE, 0.2)
    })
  }
  const totalRow = (label, amount, ytdAmount) => {
    const h = lh(base, 1.3) + 3
    line(M, y, W - M, y, INK, 0.4)
    const by = y + 1.5 + base * PT * 0.85
    text(M + 2, by, label, { size: base, bold: true })
    text(cols.curX, by, money(amount), { size: base, bold: true, align: 'right' })
    if (showYtd) text(cols.ytdX, by, ytdAmount ? money(ytdAmount) : '–', { size: base, bold: true, align: 'right' })
    y += h
  }

  tableHead('Earnings')
  if (calc.earnings.length) tableRows(calc.earnings, { ytd: showYtd })
  totalRow('Gross pay', calc.gross, calc.ytd.gross)
  y += 5

  tableHead('Deductions')
  if (calc.deductions.length) tableRows(calc.deductions, { ytd: showYtd })
  totalRow('Total deductions', calc.totalDeductions, calc.ytd.deductions)
  y += 6

  /* ── Net pay ── */
  const netW = Math.min(88, CW * 0.52)
  const netH = 17
  const netX = W - M - netW
  const sumTop = y
  const leftW = CW - netW - 8
  let wordsH = 0
  if (state.options.showWords && calc.net > 0 && calc.netWords) {
    text(M, sumTop + small * PT * 0.82, 'NET PAY IN WORDS', { size: small, bold: true, color: accent })
    wordsH = lh(small) + 0.8
    wordsH += paragraph(M, sumTop + wordsH, calc.netWords, leftW, { size: base - 0.5, color: INK })
  }
  rect(netX, sumTop, netW, netH, { fill: spec.band || spec.boxed || spec.headFill ? accent : null, stroke: spec.headFill ? null : INK, strokeWidth: 0.4, radius: spec.rounded ? 2.5 : 0 })
  const netColor = spec.headFill ? onAccent : INK
  text(netX + 4, sumTop + 6.4, 'NET PAY', { size: base - 0.5, bold: true, color: netColor })
  text(netX + netW - 4, sumTop + 13.2, money(calc.net), { size: base + 8, bold: true, color: netColor, align: 'right' })
  if (showYtd && calc.ytd.hasYtd) text(netX + 4, sumTop + 12.4, `YTD ${money(calc.ytd.net)}`, { size: base - 1.5, color: netColor })
  y = sumTop + Math.max(netH, wordsH) + 6

  /* ── Employer contributions ── */
  if (state.options.showEmployer && calc.employer.length) {
    text(M, y + base * PT * 0.85, 'EMPLOYER CONTRIBUTIONS', { size: small, bold: true, color: accent })
    text(W - M, y + base * PT * 0.85, '(paid by the employer, not deducted from pay)', { size: small - 0.5, color: MUTED, align: 'right' })
    y += lh(small, 1.7)
    for (const row of calc.employer) {
      const by = y + base * PT * 0.85
      text(M + 2, by, row.label, { size: base - 0.5 })
      if (row.detail) text(detailRight, by, row.detail, { size: base - 1.5, color: MUTED, align: 'right' })
      text(cols.curX, by, money(row.amount), { size: base - 0.5, align: 'right' })
      y += lh(base - 0.5, 1.35)
      line(M, y, W - M, y, RULE, 0.15)
    }
    y += 2
    text(cols.curX, y + base * PT * 0.85, money(calc.employerTotal), { size: base - 0.5, bold: true, align: 'right' })
    text(M + 2, y + base * PT * 0.85, 'Total employer contributions', { size: base - 0.5, bold: true })
    y += lh(base, 1.5) + 4
  }

  /* ── Notes and signature ── */
  const noteTop = y
  let noteH = 0
  if (state.notes.trim()) {
    text(M, noteTop + small * PT * 0.82, 'NOTES', { size: small, bold: true, color: accent })
    noteH = lh(small) + 0.8
    noteH += paragraph(M, noteTop + noteH, state.notes, state.options.showSignature ? leftW : CW, { size: base - 0.5, color: INK })
  }
  let signH = 0
  if (state.options.showSignature) {
    const sw = 56
    const sx = W - M - sw
    const sy = noteTop + 14
    if (state.signature) {
      const f = fitImage(state.signature, sw - 6, 13)
      items.push({ type: 'image', x: sx + (sw - f.w) / 2, y: sy - f.h - 0.5, w: f.w, h: f.h, dataUrl: state.signature.dataUrl })
    }
    line(sx, sy, sx + sw, sy, INK, 0.3)
    text(sx + sw / 2, sy + base * PT * 0.95, 'Authorized signature', { size: base - 1.5, color: MUTED, align: 'center' })
    signH = 14 + lh(base - 1.5)
  }
  y = noteTop + Math.max(noteH, signH) + 4

  if (state.options.showComputerNote) {
    text(W / 2, y + small * PT, 'This is a computer-generated statement.', { size: small, color: MUTED, align: 'center' })
    y += lh(small, 1.6)
  }

  const height = Math.max(paper.h, y + M)
  return { width: W, height, items, accent }
}

const esc = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const f2 = (n) => Number(n.toFixed(3))

/** The layout as one SVG document string (viewBox in mm). */
export function layoutToSvg(layout, { fontFamily = 'Inter, "Noto Sans", Arial, sans-serif', size = null, background = '#ffffff' } = {}) {
  const dims = size ? ` width="${size.width}" height="${size.height}"` : ''
  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${f2(layout.width)} ${f2(layout.height)}"${dims} font-family='${fontFamily}'>`]
  parts.push(`<rect width="${f2(layout.width)}" height="${f2(layout.height)}" fill="${background}"/>`)
  for (const it of layout.items) {
    if (it.type === 'rect') {
      parts.push(`<rect x="${f2(it.x)}" y="${f2(it.y)}" width="${f2(it.w)}" height="${f2(it.h)}"${it.radius ? ` rx="${it.radius}"` : ''} fill="${it.fill || 'none'}"${it.stroke ? ` stroke="${it.stroke}" stroke-width="${it.strokeWidth}"` : ''}/>`)
    } else if (it.type === 'line') {
      parts.push(`<line x1="${f2(it.x1)}" y1="${f2(it.y1)}" x2="${f2(it.x2)}" y2="${f2(it.y2)}" stroke="${it.color}" stroke-width="${it.width}"/>`)
    } else if (it.type === 'text') {
      const anchor = it.align === 'right' ? 'end' : it.align === 'center' ? 'middle' : 'start'
      parts.push(`<text x="${f2(it.x)}" y="${f2(it.y)}" font-size="${f2(it.size * PT)}" font-weight="${it.bold ? 700 : 400}" fill="${it.color}" text-anchor="${anchor}">${esc(it.text)}</text>`)
    } else if (it.type === 'image') {
      parts.push(`<image x="${f2(it.x)}" y="${f2(it.y)}" width="${f2(it.w)}" height="${f2(it.h)}" href="${esc(it.dataUrl)}" xlink:href="${esc(it.dataUrl)}" preserveAspectRatio="xMidYMid meet"/>`)
    }
  }
  parts.push('</svg>')
  return parts.join('')
}
