/** Browser file helpers: save JSON, read a chosen file. */

export const MAX_IMPORT_BYTES = 25 * 1024 * 1024

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function readFileText(file, maxBytes = MAX_IMPORT_BYTES) {
  if (!file) throw new Error('No file chosen.')
  if (file.size > maxBytes) throw new Error('That file is too large to import.')
  return file.text()
}

/** "Northwind Studio" / "INV-2026-0001" → safe file-name part. */
export function fileSafe(value, fallback = 'document') {
  const safe = String(value || '').trim().replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60)
  return safe || fallback
}
