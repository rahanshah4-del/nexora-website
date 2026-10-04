/**
 * QR code as a plain module matrix, so the HTML template (SVG rects) and the
 * PDF (vector squares) draw the identical code without a raster image.
 */
import QRCode from 'qrcode'

/** @returns {{ size: number, cells: boolean[] } | null} */
export function qrMatrix(payload) {
  const text = String(payload || '')
  if (!text) return null
  try {
    const { modules } = QRCode.create(text, { errorCorrectionLevel: 'M' })
    return { size: modules.size, cells: Array.from(modules.data, Boolean) }
  } catch {
    return null
  }
}

/** One SVG path ("M x y h1 v1 h-1 z" per dark module) for a compact inline SVG. */
export function qrPath(matrix) {
  if (!matrix) return ''
  const { size, cells } = matrix
  let d = ''
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (cells[y * size + x]) d += `M${x} ${y}h1v1h-1z`
    }
  }
  return d
}
