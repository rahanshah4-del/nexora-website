/**
 * "Download PDF" in the browser. This module, jsPDF, jspdf-autotable and the
 * Noto Sans font are all loaded only when a PDF is made; Noto Serif only for
 * serif templates; pdf-lib (letterheadMerge.js) only for PDF letterheads.
 */

import { saveBlob } from '../io/files.js'
import { buildPaperModel, pdfFileName } from '../templates/paperModel.js'
import { resolveLayout } from '../templates/specs.js'
import { modelNeedsComplexScript } from './complexScript.js'
import { PDF_SERIF_FAMILY, layoutNeedsSerif, loadPdfFontFamily, loadPdfFonts } from './fonts.js'
import { renderPdf } from './renderPdf.js'
import { toWinAnsi } from './text.js'

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/** Greyscale PNG of a logo (thermal printers are monochrome). */
async function greyscaleDataUrl(blob) {
  const bitmap = await createImageBitmap(blob)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0)
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const d = image.data
  for (let i = 0; i < d.length; i += 4) {
    const l = Math.round(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2])
    d[i] = l; d[i + 1] = l; d[i + 2] = l
  }
  ctx.putImageData(image, 0, 0)
  return canvas.toDataURL('image/png')
}

async function loadLogo(repo, assetId, greyscale) {
  if (!assetId || !repo) return null
  const asset = await repo.getAsset(assetId)
  if (!asset?.blob) return null
  const dataUrl = greyscale ? await greyscaleDataUrl(asset.blob) : await blobToDataUrl(asset.blob)
  return { dataUrl, width: asset.width, height: asset.height, format: greyscale || asset.mime !== 'image/jpeg' ? 'PNG' : 'JPEG' }
}

async function assetBytes(repo, assetId) {
  if (!repo || !assetId) return null
  const asset = await repo.getAsset(assetId)
  return asset?.blob ? { bytes: new Uint8Array(await asset.blob.arrayBuffer()), mime: asset.mime } : null
}

/**
 * Builds the PDF for `doc` as a Blob (for download or the share sheet).
 * @param {{ doc: object, totals: object, amountWords: string, repo?: object | null }} input
 *   repo: the asset store (logo, letterhead); null on the share view page
 * @returns {Promise<{ ok: true, blob: Blob, fileName: string, fontFallback: boolean, letterhead: 'vector' | 'image' | null }
 *   | { ok: false, reason: 'complex-script' }>}
 * @throws on unexpected failures (the caller offers Print → Save as PDF)
 */
export async function createDocumentPdf({ doc, totals, amountWords, repo = null }) {
  const layout = resolveLayout(doc)
  const unicodeModel = buildPaperModel(doc, totals, { amountWords })
  // TODO(rtl): see complexScript.js — Arabic/Urdu/Hebrew go to the print path.
  if (modelNeedsComplexScript(unicodeModel)) return { ok: false, reason: 'complex-script' }

  const needsSerif = layoutNeedsSerif(layout)
  const [{ jsPDF }, autoTableModule, fonts, serifFonts] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    loadPdfFonts().catch(() => null),
    needsSerif ? loadPdfFontFamily(PDF_SERIF_FAMILY).catch(() => null) : null,
  ])
  const autoTable = autoTableModule.autoTable || autoTableModule.default
  // Without the Unicode font: Helvetica, WinAnsi-safe text and ISO currency codes.
  const model = fonts ? unicodeModel : buildPaperModel(doc, totals, { amountWords, currencyDisplay: 'code', sanitize: toWinAnsi })
  const logo = await loadLogo(repo, doc.seller.logoAssetId, layout.kind === 'receipt').catch(() => null)
  const lh = layout.kind === 'page' ? layout.spec.letterhead : null
  const render = (letterhead) => renderPdf({ jsPDF, autoTable, model, layout, fonts, serifFonts, logo, letterhead })
  const imageLetterhead = async () => {
    const image = await assetBytes(repo, lh?.imageAssetId).catch(() => null)
    return image ? { data: image.bytes, format: image.mime === 'image/jpeg' ? 'JPEG' : 'PNG' } : null
  }

  let bytes = null
  let letterheadMode = null
  const letterheadPdf = lh?.pdfAssetId ? await assetBytes(repo, lh.pdfAssetId).catch(() => null) : null
  if (letterheadPdf) {
    // Vector letterhead under the content; any failure → the rendered image.
    try {
      const { mergeLetterhead } = await import('./letterheadMerge.js')
      const content = render(null).output('arraybuffer')
      bytes = await mergeLetterhead(content, letterheadPdf.bytes, { pages: lh.pages, fit: layout.spec.letterheadFit })
      letterheadMode = 'vector'
    } catch {
      bytes = null
    }
  }
  if (!bytes) {
    const image = lh ? await imageLetterhead() : null
    bytes = new Uint8Array(render(image).output('arraybuffer'))
    letterheadMode = image ? 'image' : null
  }
  const blob = new Blob([bytes], { type: 'application/pdf' })
  return { ok: true, blob, fileName: pdfFileName(model), fontFallback: !fonts, letterhead: letterheadMode }
}

/**
 * Builds and saves the PDF.
 * @returns {Promise<{ ok: true, fileName: string, fontFallback: boolean, letterhead: 'vector' | 'image' | null } | { ok: false, reason: 'complex-script' }>}
 */
export async function downloadDocumentPdf(input) {
  const result = await createDocumentPdf(input)
  if (!result.ok) return result
  saveBlob(result.blob, result.fileName)
  return { ok: true, fileName: result.fileName, fontFallback: result.fontFallback, letterhead: result.letterhead }
}
