/**
 * Vector letterheads: puts page 1 of the visitor's original PDF letterhead
 * UNDER each page of the jsPDF output, so the letterhead prints at full
 * vector quality (instead of the 300 dpi image used on screen). The content's
 * own streams are untouched (text stays selectable); the letterhead is added
 * as a Form XObject drawn by a new content stream placed first.
 *
 * The only importer of pdf-lib, loaded only for documents with a PDF
 * letterhead (dynamic import in downloadPdf.js).
 */

import {
  PDFDocument, concatTransformationMatrix, drawObject, popGraphicsState, pushGraphicsState,
} from 'pdf-lib'

const MM_TO_PT = 72 / 25.4

/**
 * @param {Uint8Array | ArrayBuffer} contentBytes  the jsPDF output
 * @param {Uint8Array | ArrayBuffer} letterheadBytes  the original letterhead PDF
 * @param {{ pages: 'all' | 'first', fit: { x: number, y: number, w: number, h: number } }} options
 *   fit: where the letterhead goes, in mm from the top left (specs.js letterheadPlacement)
 * @returns {Promise<Uint8Array>}
 * @throws when either file cannot be read (the caller falls back to the image letterhead)
 */
export async function mergeLetterhead(contentBytes, letterheadBytes, { pages, fit }) {
  const doc = await PDFDocument.load(contentBytes, { updateMetadata: false })
  const source = await PDFDocument.load(letterheadBytes, { updateMetadata: false, ignoreEncryption: false })
  if (!source.getPageCount()) throw new Error('The letterhead PDF has no pages.')
  const [letterhead] = await doc.embedPdf(source, [0])
  doc.getPages().forEach((page, index) => {
    if (pages === 'first' && index > 0) return
    const { height } = page.getSize()
    const w = fit.w * MM_TO_PT
    const h = fit.h * MM_TO_PT
    const x = fit.x * MM_TO_PT
    const y = height - fit.y * MM_TO_PT - h
    const name = page.node.newXObject('Letterhead', letterhead.ref)
    const stream = doc.context.contentStream([
      pushGraphicsState(),
      concatTransformationMatrix(w / letterhead.width, 0, 0, h / letterhead.height, x, y),
      drawObject(name),
      popGraphicsState(),
    ])
    // newXObject() normalized Contents to an array: draw the letterhead first.
    page.node.Contents().insert(0, doc.context.register(stream))
  })
  return doc.save({ useObjectStreams: false })
}
