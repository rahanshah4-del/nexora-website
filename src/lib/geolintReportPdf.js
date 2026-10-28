/**
 * The client's fix report as a PDF: before and after score, what the first audit found, the competitors,
 * and what happened on the order. Built in the browser; jsPDF is loaded only when the button is pressed.
 * Only what the client may see goes in (their own order view).
 */
import { toWinAnsi } from '../tools/docs-studio/pdf/text.js'
import { compareScores, formatMoney, planLabel } from './geolintFix.js'

const INK = [28, 28, 30]
const SUB = [110, 110, 118]
const LINE = [226, 232, 240]
const BLUE = [10, 132, 255]
const GREEN = [34, 160, 80]
const AMBER = [214, 140, 20]
const PRIORITY_COLOR = { critical: [200, 40, 40], high: [214, 100, 20], medium: [180, 140, 10], low: [110, 110, 118] }

const t = (v) => toWinAnsi(String(v ?? '').replace(/\u2192/g, '->'))
const score = (v) => (Number.isFinite(Number(v)) ? String(Math.round(Number(v) * 10) / 10) : '-')
const when = (iso) => {
  const d = new Date(iso || '')
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** Date the order was completed: the newest event, or the last update. */
export function completedAt(order) {
  const events = [...(order?.events || [])].map((e) => e.at).filter(Boolean).sort()
  return events.at(-1) || order?.updatedAt || order?.createdAt || ''
}

export function reportFileName(order) {
  return `GeoLint-Report-${String(order?.id || 'order').replace(/[^A-Za-z0-9-]/g, '')}.pdf`
}

export async function buildOrderReportPdf(order, { target = 90 } = {}) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const autoTable = autoTableModule.default
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 44
  const cmp = compareScores(order.before, order.after, target)
  const done = order.status === 'completed'

  // ---- header band
  doc.setFillColor(11, 31, 58)
  doc.rect(0, 0, W, 118, 'F')
  doc.setFillColor(...BLUE)
  doc.rect(0, 118, W, 3, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('NEXORA SOLUTIONS  |  GEOLINT', M, 40)
  doc.setFontSize(26)
  doc.text('Fix report', M, 74)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.setTextColor(190, 210, 235)
  doc.text(t(order.host || order.siteUrl || ''), M, 96)
  doc.setFontSize(10)
  doc.text(t(`Order ${order.id}`), W - M, 52, { align: 'right' })
  doc.text(t(done ? `Completed ${when(completedAt(order))}` : `Status: ${order.status}`), W - M, 70, { align: 'right' })

  // ---- score block
  let y = 150
  doc.setTextColor(...SUB)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('YOUR GEOLINT SCORE', M, y)
  y += 14
  const boxW = (W - M * 2 - 70) / 2
  const box = (x, label, value, fill, ink) => {
    doc.setFillColor(...fill)
    doc.roundedRect(x, y, boxW, 92, 12, 12, 'F')
    doc.setTextColor(...SUB)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(label, x + 18, y + 24)
    doc.setTextColor(...ink)
    doc.setFontSize(40)
    doc.text(value, x + 18, y + 68)
  }
  box(M, 'BEFORE', score(cmp.before), [241, 243, 247], INK)
  const afterFill = cmp.after === null ? [241, 243, 247] : cmp.reachedTarget ? [226, 246, 234] : [252, 240, 218]
  box(W - M - boxW, 'AFTER', cmp.after === null ? 'soon' : score(cmp.after), afterFill, cmp.after === null ? SUB : cmp.reachedTarget ? GREEN : AMBER)
  doc.setTextColor(...SUB)
  doc.setFontSize(26)
  doc.text('>', W / 2, y + 60, { align: 'center' })
  y += 92 + 18
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(...INK)
  if (cmp.gain !== null) {
    const line = `${cmp.gain >= 0 ? '+' : ''}${score(cmp.gain)} points. ${cmp.reachedTarget ? `The ${target}+ target is reached.` : `The ${target}+ target is not reached yet.`}`
    doc.text(t(line), M, y)
    y += 16
  }
  // bars
  const barW = W - M * 2
  const bar = (label, value, color) => {
    if (value === null) return
    doc.setFontSize(9)
    doc.setTextColor(...SUB)
    doc.text(label, M, y + 8)
    doc.setFillColor(...LINE)
    doc.roundedRect(M + 48, y, barW - 48, 10, 5, 5, 'F')
    doc.setFillColor(...color)
    doc.roundedRect(M + 48, y, Math.max(8, ((barW - 48) * Math.min(100, value)) / 100), 10, 5, 5, 'F')
    y += 20
  }
  bar('Before', cmp.before, [150, 156, 170])
  bar('After', cmp.after, cmp.reachedTarget ? GREEN : BLUE)
  doc.setFontSize(8.5)
  doc.setTextColor(...SUB)
  const note = order.before && order.after && !cmp.sameKind ? 'Note: before and after are different kinds of audit (page vs whole site), so the comparison is not like for like. ' : ''
  doc.text(doc.splitTextToSize(t(`${note}Both numbers come from the same GeoLint audit. The target is a goal, never a promise.`), W - M * 2), M, y + 6)
  y += 30

  // ---- tables
  const tableStyle = { theme: 'grid', styles: { font: 'helvetica', fontSize: 9.5, cellPadding: 6, textColor: INK, lineColor: LINE, lineWidth: 0.5 }, headStyles: { fillColor: [11, 31, 58], textColor: 255, fontStyle: 'bold' }, margin: { left: M, right: M } }
  const heading = (text) => {
    if (y > H - 120) { doc.addPage(); y = 56 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...INK)
    doc.text(t(text), M, y)
    y += 8
  }
  const after = () => { y = doc.lastAutoTable.finalY + 26 }

  heading('Order')
  autoTable(doc, {
    ...tableStyle, startY: y, theme: 'plain',
    styles: { ...tableStyle.styles, lineWidth: 0, cellPadding: { top: 4, bottom: 4, left: 0, right: 8 } },
    body: [
      ['Website', t(order.siteUrl || order.host)],
      ['Plan', t(`${planLabel(order.plan)} (${formatMoney(order.price)})`)],
      ['Placed', t(when(order.createdAt))],
      ...(done ? [['Completed', t(when(completedAt(order)))]] : []),
    ],
    columnStyles: { 0: { fontStyle: 'bold', textColor: SUB, cellWidth: 80 } },
  })
  after()

  const issues = order.before?.issues || []
  if (issues.length) {
    heading(`What the first audit found (${issues.length + (order.before?.moreIssues || 0)})`)
    autoTable(doc, {
      ...tableStyle, startY: y,
      head: [['Priority', 'Finding']],
      body: issues.slice(0, 40).map((i) => [String(i.priority || '').toUpperCase(), t(i.title)]),
      columnStyles: { 0: { cellWidth: 70, fontStyle: 'bold' } },
      didParseCell: (d) => { if (d.section === 'body' && d.column.index === 0) d.cell.styles.textColor = PRIORITY_COLOR[String(d.cell.raw).toLowerCase()] || SUB },
    })
    after()
    const extra = Math.max(0, issues.length - 40) + (order.before?.moreIssues || 0)
    if (extra > 0) { y -= 16; doc.setFontSize(9); doc.setTextColor(...SUB); doc.text(`+ ${extra} more findings in the full audit.`, M, y); y += 24 }
  }

  const comps = (order.competitors || []).filter((c) => c.scorePercent !== null && c.scorePercent !== undefined)
  if (comps.length) {
    heading('How you compare')
    autoTable(doc, {
      ...tableStyle, startY: y,
      head: [['Website', 'Score']],
      body: [[t(order.host), score(order.after?.scorePercent ?? order.before?.scorePercent)], ...comps.map((c) => [t(c.title || c.host), score(c.scorePercent)])],
      columnStyles: { 1: { cellWidth: 70, halign: 'right', fontStyle: 'bold' } },
    })
    after()
  }

  const events = order.events || []
  if (events.length) {
    heading('What happened')
    autoTable(doc, {
      ...tableStyle, startY: y,
      head: [['When', 'Update']],
      body: [...events].sort((a, b) => String(a.at).localeCompare(String(b.at))).map((e) => [when(e.at), t(e.note)]),
      columnStyles: { 0: { cellWidth: 100 } },
    })
    after()
  }

  // ---- footer on every page
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p += 1) {
    doc.setPage(p)
    doc.setDrawColor(...LINE)
    doc.line(M, H - 44, W - M, H - 44)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...SUB)
    doc.text(t(`Nexora Solutions  |  support@nexorasolution.us  |  Order ${order.id}`), M, H - 28)
    doc.text(`Page ${p} of ${pages}`, W - M, H - 28, { align: 'right' })
  }
  return doc
}

/** Builds the report and saves it as a file. */
export async function downloadOrderReport(order, options) {
  const doc = await buildOrderReportPdf(order, options)
  doc.save(reportFileName(order))
}
