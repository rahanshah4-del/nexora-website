/**
 * Complex scripts in the downloaded PDF.
 *
 * TODO(rtl): Arabic, Urdu, Persian and Hebrew are NOT supported by the jsPDF
 * renderer yet. They need (1) a font with those glyphs, (2) contextual shaping
 * (Arabic joining forms, Urdu Nastaliq ligatures) and (3) bidi reordering —
 * none of which jsPDF does itself. Until a shaper is registered here, any
 * document containing such text is sent to the HTML print path
 * (Print → Save as PDF), where the browser shapes and orders the text
 * correctly. To add support later: implement a ComplexScriptShaper (for
 * example on top of HarfBuzz WASM + a bidi algorithm), register it with
 * registerComplexScriptShaper(), and have renderPdf.js pass every string
 * through shapeForPdf() with the matching font registered.
 */

/**
 * @typedef {object} ComplexScriptShaper
 * @property {string} name
 * @property {(text: string) => boolean} supports
 * @property {(text: string) => { text: string, direction: 'ltr' | 'rtl' }} shape  visual-order text for jsPDF
 * @property {{ family: string, regular: Uint8Array, bold?: Uint8Array }} font
 */

const RTL_OR_COMPLEX = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/

let shaper = null

/** @param {ComplexScriptShaper | null} value */
export function registerComplexScriptShaper(value) {
  shaper = value
}

export function containsComplexScript(text) {
  return RTL_OR_COMPLEX.test(String(text ?? ''))
}

/** True when some text in the paper model needs a shaper we do not have. */
export function modelNeedsComplexScript(model) {
  const strings = []
  const walk = (value) => {
    if (typeof value === 'string') strings.push(value)
    else if (Array.isArray(value)) value.forEach(walk)
    else if (value && typeof value === 'object') Object.values(value).forEach(walk)
  }
  walk(model)
  return strings.some((s) => containsComplexScript(s) && !(shaper && shaper.supports(s)))
}

/** Hook for a future shaper; identity until one is registered. */
export function shapeForPdf(text) {
  return shaper && shaper.supports(text) ? shaper.shape(text).text : text
}
