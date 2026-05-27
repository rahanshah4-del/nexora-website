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

export function exportPdf() {
  window.print()
}
