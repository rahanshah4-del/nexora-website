/**
 * Everything that leaves the editor: PDF (jsPDF), PNG (the layout rasterised
 * through an SVG image), Excel (real numbers), print, and the share links.
 * jsPDF and the PDF font are loaded only when a PDF is made.
 */

import { currencyNumberFormat } from '../docs-studio/io/xlsxExport.js'
import { saveBlob } from '../docs-studio/io/files.js'
import { buildXlsx } from '../docs-studio/io/xlsx.js'
import { loadPdfFonts, registerPdfFonts } from '../docs-studio/pdf/fonts.js'
import { toWinAnsi } from '../docs-studio/pdf/text.js'
import { onAccentColor } from '../docs-studio/templates/color.js'
import { formatIsoDate } from '../docs-studio/engine/dates.js'
import { whatsappUrl, mailtoUrl } from '../docs-studio/ui/share.js'
import { FREQUENCIES, stubFileName } from './engine.js'
import { PT, layoutPayStub, layoutToSvg } from './layout.js'

export const FONT_STACK = 'Inter, "Noto Sans", Arial, sans-serif'
export const CREATOR = 'Nexora Free Pay Stub Generator – nexorasolution.online'

// Arabic, Hebrew, Syriac, Thaana, N'Ko and presentation forms need text shaping jsPDF cannot do.
const COMPLEX_SCRIPT = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/

export function stubNeedsComplexScript(state) {
  const { company, employee, notes, earnings, deductions, employer, docTitle } = state
  const strings = [docTitle, notes, ...Object.values(company).filter((v) => typeof v === 'string'), ...Object.values(employee),
    ...[...earnings, ...deductions, ...employer].map((l) => l.label)]
  return strings.some((s) => COMPLEX_SCRIPT.test(String(s || '')))
}

/* ── Measuring ─────────────────────────────────────────────────────────── */

let measureCtx = null

/** Text width in mm through a canvas (same font stack as the preview SVG). */
export function canvasMeasure(family = FONT_STACK) {
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d')
  const ctx = measureCtx
  return (text, sizePt, bold) => {
    ctx.font = `${bold ? 700 : 400} 100px ${family}`
    return (ctx.measureText(text).width / 100) * sizePt * PT
  }
}

/** The layout the on-screen preview, the PNG and the print use. */
export function browserLayout(state, calc) {
  return layoutPayStub({ state, calc, measure: canvasMeasure() })
}

/* ── PDF ───────────────────────────────────────────────────────────────── */

function rgb(hex) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex || ''))
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0]
}

/** Draws a layout onto a jsPDF page (units: mm; baselines are alphabetic). */
export function drawLayoutPdf(pdf, layout, family) {
  for (const it of layout.items) {
    if (it.type === 'rect') {
      const style = it.fill && it.stroke ? 'FD' : it.fill ? 'F' : 'S'
      if (it.fill) pdf.setFillColor(...rgb(it.fill))
      if (it.stroke) { pdf.setDrawColor(...rgb(it.stroke)); pdf.setLineWidth(it.strokeWidth) }
      if (it.radius) pdf.roundedRect(it.x, it.y, it.w, it.h, it.radius, it.radius, style)
      else pdf.rect(it.x, it.y, it.w, it.h, style)
    } else if (it.type === 'line') {
      pdf.setDrawColor(...rgb(it.color))
      pdf.setLineWidth(it.width)
      pdf.line(it.x1, it.y1, it.x2, it.y2)
    } else if (it.type === 'text') {
      pdf.setFont(family, it.bold ? 'bold' : 'normal')
      pdf.setFontSize(it.size)
      pdf.setTextColor(...rgb(it.color))
      pdf.text(it.text, it.x, it.y, { align: it.align })
    } else if (it.type === 'image') {
      const format = /^data:image\/jpe?g/i.test(it.dataUrl) ? 'JPEG' : 'PNG'
      try { pdf.addImage(it.dataUrl, format, it.x, it.y, it.w, it.h) } catch { /* an unreadable image is skipped, not fatal */ }
    }
  }
}

/**
 * @param {{ state: object, calc: object, fonts?: object | null, jsPDFClass?: Function }} input
 *   fonts: base64 Noto Sans (undefined → fetched; null → Helvetica fallback)
 * @returns {Promise<{ ok: true, blob: Blob, fileName: string, fontFallback: boolean } | { ok: false, reason: 'complex-script' }>}
 */
export async function createPdf({ state, calc, fonts, jsPDFClass }) {
  if (stubNeedsComplexScript(state)) return { ok: false, reason: 'complex-script' }
  const JsPdf = jsPDFClass || (await import('jspdf')).jsPDF
  const resolved = fonts === undefined ? await loadPdfFonts().catch(() => null) : fonts
  const fallback = !resolved
  const paperW = layoutPayStub({ state, calc, measure: () => 0 }).width

  // Pass 1 measures with the real font; pass 2 draws on a page of the exact height.
  const probe = new JsPdf({ unit: 'mm', format: [paperW, 297], orientation: 'portrait' })
  const family = registerPdfFonts(probe, resolved)
  const measure = (text, size, bold) => {
    probe.setFont(family, bold ? 'bold' : 'normal')
    probe.setFontSize(size)
    return probe.getTextWidth(text)
  }
  const layout = layoutPayStub({
    state, calc, measure,
    sanitize: fallback ? toWinAnsi : undefined,
    currencyDisplay: fallback ? 'code' : 'symbol',
  })
  const pdf = new JsPdf({ unit: 'mm', format: [layout.width, layout.height], orientation: 'portrait', compress: true })
  registerPdfFonts(pdf, resolved)
  pdf.setProperties({ title: `${state.docTitle}${state.employee.name ? ` – ${state.employee.name}` : ''}`, creator: CREATOR, subject: state.docTitle })
  drawLayoutPdf(pdf, layout, family)
  const blob = new Blob([pdf.output('arraybuffer')], { type: 'application/pdf' })
  return { ok: true, blob, fileName: stubFileName(state, 'pdf'), fontFallback: fallback }
}

export async function downloadPdf(input) {
  const result = await createPdf(input)
  if (result.ok) saveBlob(result.blob, result.fileName)
  return result
}

/* ── PNG ───────────────────────────────────────────────────────────────── */

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('The pay stub could not be drawn as an image.'))
    img.src = url
  })
}

/** PNG of the pay stub at `pxPerMm` (8 ≈ 200 dpi). */
export async function createPng({ state, calc, pxPerMm = 8 }) {
  const layout = browserLayout(state, calc)
  const svg = layoutToSvg(layout, { fontFamily: FONT_STACK, size: { width: Math.round(layout.width * pxPerMm), height: Math.round(layout.height * pxPerMm) } })
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const img = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(layout.width * pxPerMm)
    canvas.height = Math.round(layout.height * pxPerMm)
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('The browser could not create the PNG.')
    return { blob, fileName: stubFileName(state, 'png') }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function downloadPng(input) {
  const { blob, fileName } = await createPng(input)
  saveBlob(blob, fileName)
  return { fileName }
}

/* ── Print ─────────────────────────────────────────────────────────────── */

/** Prints the layout through a hidden iframe at its exact paper size. */
export function printStub({ state, calc }) {
  const layout = browserLayout(state, calc)
  const svg = layoutToSvg(layout, { fontFamily: FONT_STACK })
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${state.docTitle}</title><style>@page{size:${layout.width}mm ${layout.height}mm;margin:0}html,body{margin:0;padding:0;background:#fff}svg{display:block;width:${layout.width}mm;height:${layout.height}mm}</style></head><body>${svg}</body></html>`
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0'
  frame.srcdoc = html
  frame.onload = () => {
    const win = frame.contentWindow
    win.focus()
    win.addEventListener('afterprint', () => frame.remove())
    setTimeout(() => win.print(), 50)
    setTimeout(() => frame.remove(), 120_000)
  }
  document.body.appendChild(frame)
}

/* ── Excel ─────────────────────────────────────────────────────────────── */

/** @returns {Uint8Array} .xlsx bytes (numbers are numbers, dates are dates) */
export function buildStubXlsx(state, calc, now = new Date()) {
  const exp = calc.exponent
  const amount = (minor) => Number(minor || 0) / 10 ** exp
  const moneyFmt = currencyNumberFormat(calc.currency, state.locale || 'en-US')
  const accent = state.appearance.accent
  const onAccent = onAccentColor(accent)
  const styles = {
    title: { bold: true, size: 16, color: accent },
    label: { bold: true, color: '#64748B', valign: 'top' },
    block: { wrap: true, valign: 'top' },
    text: {},
    date: { numFmt: 14, halign: 'left' },
    head: { bold: true, color: onAccent, fill: accent, border: 'box', borderColor: accent },
    headRight: { bold: true, color: onAccent, fill: accent, border: 'box', borderColor: accent, halign: 'right' },
    cell: { border: 'bottom', valign: 'top', wrap: true },
    muted: { border: 'bottom', valign: 'top', color: '#64748B' },
    money: { border: 'bottom', valign: 'top', numFmt: moneyFmt },
    totalLabel: { bold: true, border: 'top', borderColor: '#0F172A' },
    totalMoney: { bold: true, border: 'top', borderColor: '#0F172A', numFmt: moneyFmt },
    netLabel: { bold: true, size: 12, color: onAccent, fill: accent },
    netMoney: { bold: true, size: 12, color: onAccent, fill: accent, numFmt: moneyFmt },
  }
  const rows = []
  const merges = []
  const put = (r, c, cell) => { rows[r] = rows[r] || []; rows[r][c] = cell }
  const freq = FREQUENCIES.find((f) => f.value === state.period.frequency)?.label || ''

  put(0, 0, { v: state.docTitle, s: 'title' })
  merges.push('A1:D1')
  put(2, 0, { v: 'Employer', s: 'label' })
  put(2, 2, { v: 'Employee', s: 'label' })
  const employer = [state.company.name, state.company.address, state.company.email, state.company.phone, state.company.taxId].filter(Boolean).join('\n')
  const employee = [state.employee.name, state.employee.id && `ID: ${state.employee.id}`, [state.employee.title, state.employee.department].filter(Boolean).join(' · '), state.employee.address, state.employee.email, state.employee.taxId && `Tax ID: ${state.employee.taxId}`].filter(Boolean).join('\n')
  put(3, 0, { v: employer, s: 'block' })
  put(3, 2, { v: employee, s: 'block' })
  merges.push('A4:B4', 'C4:D4')
  const metaLines = Math.max(employer.split('\n').length, employee.split('\n').length, 1)
  const meta = [
    ['Pay period start', { v: state.period.start, t: 'd', s: 'date' }],
    ['Pay period end', { v: state.period.end, t: 'd', s: 'date' }],
    ['Pay date', { v: state.period.payDate, t: 'd', s: 'date' }],
    ['Pay frequency', { v: freq, s: 'text' }],
    ['Currency', { v: calc.currency, s: 'text' }],
  ]
  meta.forEach(([label, value], i) => { put(5 + i, 0, { v: label, s: 'label' }); put(5 + i, 1, value) })

  let r = 5 + meta.length + 1
  const head = (title) => {
    const labels = [title, 'Details', 'Current', 'YTD']
    labels.forEach((label, c) => put(r, c, { v: label, s: c >= 2 ? 'headRight' : 'head' }))
    r++
  }
  const body = (list, withYtd) => {
    for (const l of list) {
      put(r, 0, { v: l.label, s: 'cell' })
      put(r, 1, { v: l.detail, s: 'muted' })
      put(r, 2, { v: amount(l.amount), s: 'money' })
      put(r, 3, withYtd && l.ytd ? { v: amount(l.ytd), s: 'money' } : { v: null, s: 'money' })
      r++
    }
  }
  const total = (label, minor, ytd) => {
    put(r, 0, { v: label, s: 'totalLabel' })
    put(r, 1, { v: '', s: 'totalLabel' })
    put(r, 2, { v: amount(minor), s: 'totalMoney' })
    put(r, 3, { v: ytd ? amount(ytd) : null, s: 'totalMoney' })
    r += 2
  }
  head('Earnings'); body(calc.earnings, true); total('Gross pay', calc.gross, calc.ytd.gross)
  head('Deductions'); body(calc.deductions, true); total('Total deductions', calc.totalDeductions, calc.ytd.deductions)
  put(r, 0, { v: 'NET PAY', s: 'netLabel' })
  put(r, 1, { v: '', s: 'netLabel' })
  put(r, 2, { v: amount(calc.net), s: 'netMoney' })
  put(r, 3, { v: calc.ytd.hasYtd ? amount(calc.ytd.net) : null, s: 'netMoney' })
  r += 2
  if (state.options.showWords && calc.netWords) {
    put(r, 0, { v: 'Net pay in words', s: 'label' }); put(r, 1, { v: calc.netWords, s: 'block' }); merges.push(`B${r + 1}:D${r + 1}`); r++
  }
  if (state.options.showEmployer && calc.employer.length) {
    r++
    head('Employer contributions')
    body(calc.employer, false)
  }
  if (state.notes.trim()) {
    r++
    put(r, 0, { v: 'Notes', s: 'label' }); put(r, 1, { v: state.notes, s: 'block' }); merges.push(`B${r + 1}:D${r + 1}`)
  }

  const heights = { 4: 15 * metaLines }
  return buildXlsx({
    sheets: [{ name: state.docTitle, columns: [{ width: 34 }, { width: 28 }, { width: 18 }, { width: 18 }], rows: rows.map((row) => row || []), rowHeights: heights, merges, fitToWidth: true }],
    styles,
    title: `${state.docTitle}${state.employee.name ? ` – ${state.employee.name}` : ''}`,
    creator: CREATOR,
    created: now,
  })
}

export function downloadXlsx({ state, calc }) {
  const bytes = buildStubXlsx(state, calc)
  const fileName = stubFileName(state, 'xlsx')
  saveBlob(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName)
  return { fileName }
}

/* ── Share ─────────────────────────────────────────────────────────────── */

export function shareText(state, calc, locale = 'en') {
  const when = state.period.payDate ? ` for ${formatIsoDate(state.period.payDate, locale)}` : ''
  const who = state.employee.name ? `Hi ${state.employee.name}, ` : 'Hi, '
  const company = state.company.name ? `\n\n${state.company.name}` : ''
  return `${who}please find your ${state.docTitle.toLowerCase()}${when} attached.${company}`
}

/**
 * WhatsApp / email: attaches the PDF through the share sheet where the browser
 * allows files; otherwise saves the PDF and opens a pre-filled message to attach it to.
 * @returns {Promise<{ mode: 'shared' | 'opened', fileName: string } | { mode: 'blocked', reason: string }>}
 */
export async function shareStub({ state, calc, channel }) {
  const result = await createPdf({ state, calc })
  if (!result.ok) return { mode: 'blocked', reason: 'complex-script' }
  const text = shareText(state, calc)
  const file = new File([result.blob], result.fileName, { type: 'application/pdf' })
  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: state.docTitle, text })
      return { mode: 'shared', fileName: result.fileName }
    } catch (error) {
      if (error?.name === 'AbortError') return { mode: 'shared', fileName: result.fileName }
    }
  }
  saveBlob(result.blob, result.fileName)
  const url = channel === 'email'
    ? mailtoUrl(state.employee.email, `${state.docTitle}${state.period.payDate ? ` – ${state.period.payDate}` : ''}`, text)
    : whatsappUrl(text)
  window.open(url, '_blank', 'noopener')
  return { mode: 'opened', fileName: result.fileName }
}
