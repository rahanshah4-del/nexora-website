// Real PDF generation for the School ERP Reports Center (jsPDF + autotable).
// NOT a screenshot/canvas export — text + vector tables. Four templates:
// Modern A4, Classic A4, Minimal A4, and 58mm Thermal.
//
// Returns { doc, pdfTotal, fileName } so the caller can validate that the PDF
// total it renders matches the builder's calculatedTotal (PASS/FAIL badge),
// and can save / preview / print / share the same document.

export const SCHOOL_PDF_TEMPLATES = [
  { key: 'modern', label: 'Modern A4' },
  { key: 'classic', label: 'Classic A4' },
  { key: 'minimal', label: 'Minimal A4' },
  { key: 'thermal', label: '58mm Thermal' },
]

function num(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function cell(column, row) {
  const raw = typeof column.value === 'function' ? column.value(row) : row?.[column.key]
  if (raw === undefined || raw === null) return ''
  if (column.numeric) return num(raw).toLocaleString()
  return String(raw)
}

function fileSafe(value, fallback = 'report') {
  return String(value || fallback).replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-').toLowerCase()
}

async function loadDeps() {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  return { jsPDF, autoTable: autoTableModule.default }
}

// pdfTotal is summed from the SAME rows + amount column the PDF renders.
function computePdfTotal(report) {
  if (!report.amountKey) return report.rows.length
  return report.rows.reduce((sum, row) => sum + num(row[report.amountKey]), 0)
}

function buildA4(jsPDF, autoTable, report, meta, theme) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = theme.margin

  // Header
  if (theme.headerBand) {
    doc.setFillColor(theme.accent)
    doc.rect(0, 0, pageWidth, 70, 'F')
    doc.setTextColor('#ffffff')
  } else {
    doc.setTextColor('#0f172a')
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(theme.titleSize)
  doc.text(String(report.title), margin, theme.headerBand ? 34 : 50, { align: theme.center ? 'center' : 'left', ...(theme.center ? { x: pageWidth / 2 } : {}) })
  if (theme.center) doc.text(String(report.title), pageWidth / 2, 50, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  if (theme.headerBand) doc.setTextColor('#e2e8f0')
  else doc.setTextColor('#475569')
  const subY = theme.headerBand ? 54 : 70
  doc.text(String(meta.workspaceName || 'Workspace'), theme.center ? pageWidth / 2 : margin, subY, { align: theme.center ? 'center' : 'left' })

  // Meta line
  doc.setTextColor('#475569')
  doc.setFontSize(8.5)
  const metaY = theme.headerBand ? 92 : 92
  const metaText = `Report ID: ${meta.reportId}    |    ${meta.dateRange}    |    ${meta.approvedOnly ? 'Approved only' : 'All records'}    |    Generated: ${meta.generatedAt}`
  doc.text(metaText, theme.center ? pageWidth / 2 : margin, metaY, { align: theme.center ? 'center' : 'left' })

  if (theme.center) {
    doc.setDrawColor(theme.line)
    doc.line(margin, metaY + 8, pageWidth - margin, metaY + 8)
  }

  // Summary strip
  autoTable(doc, {
    startY: metaY + 16,
    margin: { left: margin, right: margin },
    theme: theme.tableTheme,
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 5, textColor: '#0f172a', lineColor: theme.line, lineWidth: theme.lineWidth },
    headStyles: { fillColor: theme.headFill, textColor: theme.headText, fontStyle: 'bold' },
    head: [(report.summary || []).map((s) => s.label)],
    body: [(report.summary || []).map((s) => s.value)],
  })

  // Main data table
  const columns = report.columns || []
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 14,
    margin: { left: margin, right: margin },
    theme: theme.tableTheme,
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: theme.cellPadding, textColor: '#0f172a', lineColor: theme.line, lineWidth: theme.lineWidth, overflow: 'linebreak' },
    headStyles: { fillColor: theme.headFill, textColor: theme.headText, fontStyle: 'bold' },
    alternateRowStyles: theme.striped ? { fillColor: '#f8fafc' } : undefined,
    head: [columns.map((c) => c.label)],
    body: report.rows.length
      ? report.rows.map((row) => columns.map((c) => cell(c, row)))
      : [columns.map((_, i) => (i === 0 ? 'No records found' : ''))],
    foot: report.amountKey
      ? [columns.map((c) => (c.key === report.amountKey ? `${meta.currency} ${computePdfTotal(report).toLocaleString()}` : (c.key === columns[0].key ? report.totalLabel : '')))]
      : undefined,
    footStyles: { fillColor: theme.headFill, textColor: theme.headText, fontStyle: 'bold' },
  })

  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    doc.setDrawColor(theme.line)
    doc.line(margin, pageHeight - 36, pageWidth - margin, pageHeight - 36)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor('#64748b')
    doc.text(String(meta.footer || 'NEXORA SOLUTION'), margin, pageHeight - 22)
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 22, { align: 'right' })
  }
  return doc
}

function buildThermal(jsPDF, report, meta) {
  const widthMm = 58
  const lineH = 4.2
  const headerH = 34
  const estHeight = Math.max(90, headerH + (report.rows.length + 4) * lineH + 20)
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [widthMm, estHeight] })
  const left = 3
  const right = widthMm - 3
  let y = 7

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(String(meta.workspaceName || 'School'), widthMm / 2, y, { align: 'center' })
  y += 4.5
  doc.setFontSize(7.5)
  doc.text(String(report.title), widthMm / 2, y, { align: 'center' })
  y += 4
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.text(String(meta.dateRange), widthMm / 2, y, { align: 'center' })
  y += 3.5
  doc.setLineWidth(0.2)
  doc.line(left, y, right, y)
  y += 3.5

  doc.setFontSize(6.5)
  const labelCol = report.columns[0]
  const amountCol = report.amountKey ? report.columns.find((c) => c.key === report.amountKey) : null
  if (report.rows.length === 0) {
    doc.text('No records found', widthMm / 2, y, { align: 'center' })
    y += lineH
  }
  report.rows.forEach((row) => {
    const label = String(cell(labelCol, row)).slice(0, 22)
    doc.text(label, left, y)
    if (amountCol) doc.text(String(cell(amountCol, row)), right, y, { align: 'right' })
    y += lineH
  })

  y += 1
  doc.line(left, y, right, y)
  y += 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.text(String(report.totalLabel), left, y)
  doc.text(`${meta.currency} ${computePdfTotal(report).toLocaleString()}`, right, y, { align: 'right' })
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(5.5)
  doc.text(`ID ${meta.reportId} · ${meta.generatedAt}`, widthMm / 2, y, { align: 'center' })
  return doc
}

const A4_THEMES = {
  modern: {
    margin: 40, titleSize: 18, headerBand: true, center: false, accent: '#4f46e5',
    tableTheme: 'striped', headFill: '#4f46e5', headText: '#ffffff', line: '#e2e8f0', lineWidth: 0.4, cellPadding: 5, striped: true,
  },
  classic: {
    margin: 44, titleSize: 18, headerBand: false, center: true, accent: '#0f172a',
    tableTheme: 'grid', headFill: '#0f172a', headText: '#ffffff', line: '#0f172a', lineWidth: 0.6, cellPadding: 6, striped: false,
  },
  minimal: {
    margin: 48, titleSize: 16, headerBand: false, center: false, accent: '#0f172a',
    tableTheme: 'plain', headFill: '#ffffff', headText: '#0f172a', line: '#e2e8f0', lineWidth: 0.3, cellPadding: 4, striped: false,
  },
}

export async function generateSchoolReportPdf(report, meta = {}, template = 'modern') {
  const { jsPDF, autoTable } = await loadDeps()
  const fullMeta = {
    workspaceName: 'Workspace',
    businessType: 'School ERP',
    dateRange: 'All time',
    generatedAt: '',
    reportId: '',
    currency: report.currency || 'PKR',
    footer: 'NEXORA SOLUTION — All rights reserved 2019-2026.',
    approvedOnly: true,
    ...meta,
  }
  const pdfTotal = computePdfTotal(report)
  const doc =
    template === 'thermal'
      ? buildThermal(jsPDF, report, fullMeta)
      : buildA4(jsPDF, autoTable, report, fullMeta, A4_THEMES[template] || A4_THEMES.modern)
  const fileName = `${fileSafe(report.title)}-${fileSafe(fullMeta.reportId)}.pdf`
  return { doc, pdfTotal, fileName }
}
