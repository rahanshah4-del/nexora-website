/**
 * Letterhead upload → { image, pdf }: a full-page image to draw behind the
 * document (every renderer uses it), plus the original PDF bytes when the
 * upload was a PDF (kept for Step 3B, which overlays the real vector
 * letterhead with pdf-lib for print-quality PDFs).
 *
 * Images are decoded and re-encoded (drops metadata; SVG is not accepted),
 * capped at 2480 px wide (A4 at 300 dpi). PDFs are rendered by pdf.js, which
 * is loaded only here, on demand (see pdfLetterhead.js). Browser-only.
 */

import { MAX_ASSET_BYTES } from '../storage/repository.js'

export const ACCEPTED_LETTERHEAD_TYPES = 'image/png,image/jpeg,image/webp,application/pdf'
export const LETTERHEAD_WIDTH_PX = 2480
const MAX_INPUT_BYTES = 10 * 1024 * 1024

export function isPdfFile(file) {
  return file?.type === 'application/pdf' || /\.pdf$/i.test(file?.name || '')
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('The letterhead could not be processed.'))), type, quality)
  })
}

/** PNG (sharp text and lines) unless that is too large for storage; then JPEG. */
async function encodeCanvas(canvas, preferJpeg) {
  if (!preferJpeg) {
    const png = await canvasToBlob(canvas, 'image/png')
    if (png.size <= MAX_ASSET_BYTES) return png
  }
  for (const quality of [0.92, 0.85, 0.75]) {
    const jpeg = await canvasToBlob(canvas, 'image/jpeg', quality)
    if (jpeg.size <= MAX_ASSET_BYTES) return jpeg
  }
  throw new Error('That letterhead is too detailed to store. Try a smaller file.')
}

function whiteCanvas(width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.imageSmoothingQuality = 'high'
  return { canvas, ctx }
}

/**
 * @param {File} file
 * @returns {Promise<{ image: { blob: Blob, width: number, height: number }, pdf: { blob: Blob } | null }>}
 */
export async function prepareLetterhead(file) {
  if (!file) throw new Error('Choose a file.')
  if (file.size > MAX_INPUT_BYTES) throw new Error('That file is larger than 10 MB.')

  if (isPdfFile(file)) {
    const bytes = new Uint8Array(await file.arrayBuffer())
    if (String.fromCharCode(...bytes.subarray(0, 5)) !== '%PDF-') throw new Error('That file is not a PDF.')
    const { renderPdfFirstPage } = await import('./pdfLetterhead.js')
    const canvas = await renderPdfFirstPage(bytes, { widthPx: LETTERHEAD_WIDTH_PX })
    const blob = await encodeCanvas(canvas, false)
    return { image: { blob, width: canvas.width, height: canvas.height }, pdf: { blob: new Blob([bytes], { type: 'application/pdf' }) } }
  }

  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Choose a PNG, JPG or PDF letterhead.')
  let bitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('That image could not be read.')
  }
  try {
    const scale = Math.min(1, LETTERHEAD_WIDTH_PX / bitmap.width)
    const { canvas, ctx } = whiteCanvas(Math.max(1, Math.round(bitmap.width * scale)), Math.max(1, Math.round(bitmap.height * scale)))
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await encodeCanvas(canvas, file.type === 'image/jpeg')
    return { image: { blob, width: canvas.width, height: canvas.height }, pdf: null }
  } finally {
    bitmap.close?.()
  }
}
