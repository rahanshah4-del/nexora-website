// Text of every page of a PDF, for pulling email addresses out of it. Only
// imported when a PDF is chosen (dynamic import in emailExtract.js).
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = workerUrl

export async function pdfText(bytes, { maxPages = 300 } = {}) {
  const task = getDocument({ data: bytes.slice(), enableXfa: false, disableAutoFetch: true, disableStream: true })
  let pdf
  try {
    pdf = await task.promise
  } catch (error) {
    throw new Error(error?.name === 'PasswordException' ? 'This PDF is password protected.' : 'That PDF could not be read.', { cause: error })
  }
  try {
    const pages = []
    for (let number = 1; number <= Math.min(pdf.numPages, maxPages); number += 1) {
      const page = await pdf.getPage(number)
      const content = await page.getTextContent()
      pages.push(content.items.map((item) => `${item.str || ''}${item.hasEOL ? '\n' : ' '}`).join(''))
    }
    return pages.join('\n')
  } finally {
    await pdf.destroy()
  }
}
