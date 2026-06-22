// Native Sales Hub PDF reports. Text and vector tables only; no screenshots.
export const SALES_PDF_TEMPLATES = [
  { value: 'modern', label: 'Modern A4' },
  { value: 'classic', label: 'Classic A4' },
  { value: 'minimal', label: 'Minimal A4' },
  { value: 'thermal', label: '58mm Thermal' },
]

function number(value) {
  const result = Number(value)
  return Number.isFinite(result) ? result : 0
}

function cell(column, row, currency) {
  const value = typeof column.value === 'function' ? column.value(row) : row?.[column.key]
  if (column.money) return `${currency} ${number(value).toLocaleString()}`
  if (column.numeric) return number(value).toLocaleString()
  return value == null || value === '' ? '-' : String(value)
}

function fileSafe(value) {
  return String(value || 'sales-report').replace(/[^a-z0-9]+/gi, '-').replace(/-+/g, '-').toLowerCase()
}

async function dependencies() {
  const [{ jsPDF }, tableModule] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  return { jsPDF, autoTable: tableModule.default }
}

const themes = {
  modern: { accent: '#0369a1', head: '#075985', theme: 'striped', margin: 38, title: 19 },
  classic: { accent: '#0f172a', head: '#0f172a', theme: 'grid', margin: 42, title: 18 },
  minimal: { accent: '#0f172a', head: '#ffffff', headText: '#0f172a', theme: 'plain', margin: 46, title: 17 },
}

function buildA4(jsPDF, autoTable, report, meta, style) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: report.columns.length > 5 ? 'landscape' : 'portrait' })
  const width = doc.internal.pageSize.getWidth()
  const height = doc.internal.pageSize.getHeight()
  doc.setFillColor(style.accent)
  doc.rect(0, 0, width, 68, 'F')
  doc.setTextColor('#ffffff')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(style.title)
  doc.text(report.title, style.margin, 31)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`${meta.workspaceName}  |  ${meta.dateRange}`, style.margin, 50)

  autoTable(doc, {
    startY: 84,
    margin: { left: style.margin, right: style.margin },
    theme: style.theme,
    head: [(report.summary || []).map((item) => item.label)],
    body: [(report.summary || []).map((item) => item.money ? `${meta.currency} ${number(item.value).toLocaleString()}` : String(item.value))],
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 5, textColor: '#0f172a', lineColor: '#cbd5e1' },
    headStyles: { fillColor: style.head, textColor: style.headText || '#ffffff', fontStyle: 'bold' },
  })

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 14,
    margin: { left: style.margin, right: style.margin, bottom: 48 },
    theme: style.theme,
    head: [report.columns.map((column) => column.label)],
    body: report.rows.length ? report.rows.map((row) => report.columns.map((column) => cell(column, row, meta.currency))) : [report.columns.map((_, index) => index ? '' : 'No records found')],
    foot: [report.columns.map((column, index) => {
      if (index === 0) return report.totalLabel || 'Total'
      if (report.amountKey && column.key === report.amountKey) return `${meta.currency} ${number(report.totalValue).toLocaleString()}`
      if (!report.amountKey && index === report.columns.length - 1) return number(report.totalValue).toLocaleString()
      return ''
    })],
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 5, textColor: '#0f172a', lineColor: '#cbd5e1', overflow: 'linebreak' },
    headStyles: { fillColor: style.head, textColor: style.headText || '#ffffff', fontStyle: 'bold' },
    footStyles: { fillColor: style.accent, textColor: '#ffffff', fontStyle: 'bold' },
  })

  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page)
    doc.setDrawColor('#cbd5e1')
    doc.line(style.margin, height - 35, width - style.margin, height - 35)
    doc.setTextColor('#64748b')
    doc.setFontSize(7.5)
    doc.text(`${meta.reportId}  |  Generated ${meta.generatedAt}`, style.margin, height - 20)
    doc.text(`Page ${page} of ${pages}`, width - style.margin, height - 20, { align: 'right' })
  }
  return doc
}

function buildThermal(jsPDF, report, meta) {
  const width = 58
  const summaryHeight = (report.summary || []).length * 4
  const rowHeight = report.rows.reduce((sum) => sum + 8, 0)
  const height = Math.max(90, 48 + summaryHeight + rowHeight)
  const doc = new jsPDF({ unit: 'mm', format: [width, height], orientation: 'portrait' })
  const left = 3
  const right = width - 3
  let y = 6
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(String(meta.workspaceName), width / 2, y, { align: 'center', maxWidth: 50 })
  y += 5
  doc.setFontSize(7.5)
  doc.text(report.title, width / 2, y, { align: 'center', maxWidth: 50 })
  y += 4
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(5.5)
  doc.text(meta.dateRange, width / 2, y, { align: 'center' })
  y += 3
  doc.line(left, y, right, y)
  y += 3
  ;(report.summary || []).forEach((item) => {
    doc.setFontSize(6)
    doc.text(item.label.slice(0, 22), left, y)
    const value = item.money ? `${meta.currency} ${number(item.value).toLocaleString()}` : String(item.value)
    doc.text(value.slice(0, 20), right, y, { align: 'right' })
    y += 3.5
  })
  doc.line(left, y, right, y)
  y += 3.5
  const primary = report.columns[0]
  const secondary = report.columns.find((column) => column.money || column.numeric) || report.columns[1]
  if (!report.rows.length) {
    doc.text('No records found', width / 2, y, { align: 'center' })
    y += 5
  }
  report.rows.forEach((row, index) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.3)
    doc.text(`${index + 1}. ${cell(primary, row, meta.currency)}`.slice(0, 34), left, y)
    y += 3
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(5.6)
    const value = secondary ? cell(secondary, row, meta.currency) : ''
    doc.text(secondary?.label || '', left + 2, y)
    doc.text(String(value).slice(0, 22), right, y, { align: 'right' })
    y += 4
  })
  doc.line(left, y, right, y)
  y += 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.text(report.totalLabel || 'Total', left, y)
  const total = report.amountKey ? `${meta.currency} ${number(report.totalValue).toLocaleString()}` : number(report.totalValue).toLocaleString()
  doc.text(total, right, y, { align: 'right' })
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(5)
  doc.text(`${meta.reportId} | ${meta.generatedAt}`, width / 2, y, { align: 'center' })
  return doc
}

export async function generateSalesHubReportPdf(report, meta = {}, template = 'modern') {
  const { jsPDF, autoTable } = await dependencies()
  const completeMeta = {
    workspaceName: 'Nexora Workspace',
    dateRange: 'All time',
    reportId: `SAL-${Date.now()}`,
    generatedAt: new Date().toLocaleString(),
    currency: report.currency || 'PKR',
    ...meta,
  }
  const doc = template === 'thermal'
    ? buildThermal(jsPDF, report, completeMeta)
    : buildA4(jsPDF, autoTable, report, completeMeta, themes[template] || themes.modern)
  return { doc, fileName: `${fileSafe(report.title)}-${fileSafe(completeMeta.reportId)}.pdf` }
}
