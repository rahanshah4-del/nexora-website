/**
 * Renders page 1 of a PDF letterhead to a canvas with pdf.js. This module is
 * the only importer of pdfjs-dist and is itself loaded only after a visitor
 * picks a PDF letterhead (dynamic import in letterhead.js), so pdf.js and its
 * worker never load on normal visits. pdf.js 6 has no eval-based code path;
 * scripting / XFA stay off, and the worker parses the file off the main thread.
 */

// The "legacy" build: the modern one needs Map.prototype.getOrInsertComputed
// and other features only the newest browsers ship; legacy adds polyfills.
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = workerUrl

/**
 * @param {Uint8Array} bytes
 * @param {{ widthPx?: number }} [options]
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function renderPdfFirstPage(bytes, { widthPx = 2480 } = {}) {
  // pdf.js transfers (detaches) the buffer it is given; keep the caller's copy intact.
  const task = getDocument({ data: bytes.slice(), enableXfa: false, disableAutoFetch: true, disableStream: true })
  let pdf
  try {
    pdf = await task.promise
  } catch (error) {
    throw new Error(error?.name === 'PasswordException' ? 'Password-protected PDFs cannot be used as a letterhead.' : 'That PDF could not be read.', { cause: error })
  }
  try {
    const page = await pdf.getPage(1)
    const base = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: widthPx / base.width })
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    const canvasContext = canvas.getContext('2d')
    canvasContext.fillStyle = '#ffffff'
    canvasContext.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvas, canvasContext, viewport }).promise
    return canvas
  } finally {
    // Frees the document and terminates its worker.
    await task.destroy()
  }
}
