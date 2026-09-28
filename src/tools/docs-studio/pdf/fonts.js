/**
 * Noto Sans subset for the PDF (public/fonts, SIL OFL — see OFL.txt there).
 * Fetched on the first "Download PDF" only, then kept in memory for the rest
 * of the session. A failed fetch is not cached, so the next click retries.
 */

export const PDF_FONT_FAMILY = 'NotoSans'
export const FONT_URLS = Object.freeze({
  regular: '/fonts/NotoSans-Regular.subset.ttf?v=1',
  bold: '/fonts/NotoSans-Bold.subset.ttf?v=1',
})

let cached = null

function toBase64(bytes) {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

/** Wraps raw TTF bytes in the shape renderPdf() expects. */
export function fontsFromBytes(regular, bold) {
  return { family: PDF_FONT_FAMILY, regular: toBase64(regular), bold: toBase64(bold) }
}

/**
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<{ family: string, regular: string, bold: string }>} base64 TTFs
 */
export function loadPdfFonts(fetchImpl = globalThis.fetch) {
  if (!cached) {
    cached = Promise.all(Object.values(FONT_URLS).map(async (url) => {
      const response = await fetchImpl(url)
      if (!response.ok) throw new Error(`Font request failed (${response.status})`)
      return new Uint8Array(await response.arrayBuffer())
    })).then(([regular, bold]) => fontsFromBytes(regular, bold))
    cached.catch(() => { cached = null })
  }
  return cached
}

/** Test hook: forget the session cache. */
export function resetPdfFontCache() {
  cached = null
}

/** Registers the fonts with one jsPDF instance; returns the family to use. */
export function registerPdfFonts(pdf, fonts) {
  if (!fonts) return 'helvetica'
  pdf.addFileToVFS('NotoSans-Regular.ttf', fonts.regular)
  pdf.addFont('NotoSans-Regular.ttf', fonts.family, 'normal')
  pdf.addFileToVFS('NotoSans-Bold.ttf', fonts.bold)
  pdf.addFont('NotoSans-Bold.ttf', fonts.family, 'bold')
  return fonts.family
}
