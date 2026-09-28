/**
 * "Download PDF" in the browser. This module, jsPDF, jspdf-autotable and the
 * Noto Sans font are all loaded only when the button is clicked.
 */

import { buildPaperModel, pdfFileName } from '../templates/paperModel.js'
import { resolveLayout } from '../templates/specs.js'
import { modelNeedsComplexScript } from './complexScript.js'
import { loadPdfFonts } from './fonts.js'
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
  if (!assetId) return null
  const asset = await repo.getAsset(assetId)
  if (!asset?.blob) return null
  const dataUrl = greyscale ? await greyscaleDataUrl(asset.blob) : await blobToDataUrl(asset.blob)
  return { dataUrl, width: asset.width, height: asset.height, format: greyscale || asset.mime !== 'image/jpeg' ? 'PNG' : 'JPEG' }
}

/**
 * @returns {Promise<{ ok: true, fileName: string, fontFallback: boolean } | { ok: false, reason: 'complex-script' }>}
 * @throws on unexpected failures (the caller offers Print → Save as PDF)
 */
export async function downloadDocumentPdf({ doc, totals, amountWords, repo }) {
  const layout = resolveLayout(doc)
  const unicodeModel = buildPaperModel(doc, totals, { amountWords })
  // TODO(rtl): see complexScript.js — Arabic/Urdu/Hebrew go to the print path.
  if (modelNeedsComplexScript(unicodeModel)) return { ok: false, reason: 'complex-script' }

  const [{ jsPDF }, autoTableModule] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const autoTable = autoTableModule.autoTable || autoTableModule.default
  const fonts = await loadPdfFonts().catch(() => null)
  // Without the Unicode font: Helvetica, WinAnsi-safe text and ISO currency codes.
  const model = fonts ? unicodeModel : buildPaperModel(doc, totals, { amountWords, currencyDisplay: 'code', sanitize: toWinAnsi })
  const logo = await loadLogo(repo, doc.seller.logoAssetId, layout.kind === 'receipt').catch(() => null)
  const pdf = renderPdf({ jsPDF, autoTable, model, layout, fonts, logo })
  const fileName = pdfFileName(model)
  pdf.save(fileName)
  return { ok: true, fileName, fontFallback: !fonts }
}
