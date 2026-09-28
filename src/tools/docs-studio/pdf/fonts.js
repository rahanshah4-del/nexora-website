/**
 * Unicode fonts for the PDF (public/fonts, SIL OFL — see OFL.txt there):
 * Noto Sans for every template, Noto Serif only for templates whose spec uses
 * the serif font (Minimal). Each family is fetched on the first download that
 * needs it, then kept in memory for the session. A failed fetch is not
 * cached, so the next click retries.
 */

export const PDF_FONT_FAMILY = 'NotoSans'
export const PDF_SERIF_FAMILY = 'NotoSerif'

export const FONT_FILES = Object.freeze({
  NotoSans: { regular: '/fonts/NotoSans-Regular.subset.ttf?v=1', bold: '/fonts/NotoSans-Bold.subset.ttf?v=1' },
  NotoSerif: { regular: '/fonts/NotoSerif-Regular.subset.ttf?v=1', bold: '/fonts/NotoSerif-Bold.subset.ttf?v=1' },
})
/** Back-compat alias: the Noto Sans URLs. */
export const FONT_URLS = FONT_FILES.NotoSans

const cache = new Map()

function toBase64(bytes) {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

/** Wraps raw TTF bytes in the shape renderPdf() expects. */
export function fontsFromBytes(regular, bold, family = PDF_FONT_FAMILY) {
  return { family, regular: toBase64(regular), bold: toBase64(bold) }
}

/**
 * @param {'NotoSans' | 'NotoSerif'} family
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<{ family: string, regular: string, bold: string }>} base64 TTFs
 */
export function loadPdfFontFamily(family, fetchImpl = globalThis.fetch) {
  if (!cache.has(family)) {
    const urls = FONT_FILES[family]
    if (!urls) return Promise.reject(new Error(`Unknown font family ${family}`))
    const promise = Promise.all([urls.regular, urls.bold].map(async (url) => {
      const response = await fetchImpl(url)
      if (!response.ok) throw new Error(`Font request failed (${response.status})`)
      return new Uint8Array(await response.arrayBuffer())
    })).then(([regular, bold]) => fontsFromBytes(regular, bold, family))
    promise.catch(() => { cache.delete(family) })
    cache.set(family, promise)
  }
  return cache.get(family)
}

/** Noto Sans (every PDF needs it). */
export function loadPdfFonts(fetchImpl = globalThis.fetch) {
  return loadPdfFontFamily(PDF_FONT_FAMILY, fetchImpl)
}

/** True when a resolved page layout uses the serif font anywhere. */
export function layoutNeedsSerif(layout) {
  const f = layout?.spec?.fonts
  return layout?.kind === 'page' && Boolean(f) && (f.headingId === 'serif' || f.bodyId === 'serif')
}

/** Test hook: forget the session cache. */
export function resetPdfFontCache() {
  cache.clear()
}

function register(pdf, fonts) {
  pdf.addFileToVFS(`${fonts.family}-Regular.ttf`, fonts.regular)
  pdf.addFont(`${fonts.family}-Regular.ttf`, fonts.family, 'normal')
  pdf.addFileToVFS(`${fonts.family}-Bold.ttf`, fonts.bold)
  pdf.addFont(`${fonts.family}-Bold.ttf`, fonts.family, 'bold')
  return fonts.family
}

/** Registers Noto Sans with one jsPDF instance; returns the family to use ('helvetica' without it). */
export function registerPdfFonts(pdf, fonts) {
  return fonts ? register(pdf, fonts) : 'helvetica'
}

/**
 * Registers the sans (and, if given, serif) fonts and maps the template's font
 * ids to jsPDF families. Without Noto: Helvetica / Times (WinAnsi text only).
 * @returns {{ body: string, heading: string }}
 */
export function registerTemplateFonts(pdf, { sans = null, serif = null } = {}, layout = null) {
  const sansFamily = registerPdfFonts(pdf, sans)
  // Serif without Noto Serif: Noto Sans keeps Unicode; only in full fallback mode use Times.
  const serifFamily = serif ? register(pdf, serif) : sans ? sansFamily : 'times'
  const f = layout?.spec?.fonts
  const pick = (id) => (id === 'serif' ? serifFamily : sansFamily)
  return { body: pick(f?.bodyId), heading: pick(f?.headingId) }
}
