import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

function escapeCell(value) {
  const text = value === null || value === undefined ? '' : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

function downloadText(filename, content, type = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function exportCsv(filename, columns, rows) {
  const header = columns.map((column) => escapeCell(column.label)).join(',')
  const body = rows
    .map((row) => columns.map((column) => escapeCell(typeof column.value === 'function' ? column.value(row) : row[column.key])).join(','))
    .join('\n')
  downloadText(filename, `${header}\n${body}`)
}

export function exportExcel(filename, columns, rows) {
  const header = columns.map((column) => `<th>${escapeCell(column.label).slice(1, -1)}</th>`).join('')
  const body = rows
    .map((row) => `<tr>${columns.map((column) => `<td>${escapeCell(typeof column.value === 'function' ? column.value(row) : row[column.key]).slice(1, -1)}</td>`).join('')}</tr>`)
    .join('')
  downloadText(
    filename,
    `<html><body><table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></body></html>`,
    'application/vnd.ms-excel;charset=utf-8;',
  )
}

function exportValue(column, row) {
  return typeof column.value === 'function' ? column.value(row) : row[column.key]
}

export function exportPdf(filename = 'nexora-export.pdf', columns = [], rows = [], title = 'Nexora Export') {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`

  doc.setTextColor('#0f172a')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(title, 40, 42)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor('#64748b')
  doc.text(`Generated at: ${new Date().toLocaleString()}`, 40, 58)

  autoTable(doc, {
    startY: 78,
    margin: { left: 40, right: 40 },
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 5, textColor: '#0f172a', lineColor: '#e2e8f0', lineWidth: 0.5, overflow: 'linebreak' },
    headStyles: { fillColor: '#f1f5f9', textColor: '#334155', fontStyle: 'bold' },
    head: [columns.map((column) => column.label)],
    body: rows.map((row) => columns.map((column) => String(exportValue(column, row) ?? ''))),
  })

  doc.save(safeFilename)
}
