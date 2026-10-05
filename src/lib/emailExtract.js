/**
 * Pull email addresses out of an uploaded file (PDF, Word, Excel, CSV, text).
 * Only the addresses are kept; names, phone numbers and the rest are ignored.
 * Pure helpers here are unit tested; PDF reading lives in pdfText.js and is
 * loaded only when a PDF is picked.
 */
const EMAIL_IN_TEXT = /[a-z0-9._%+'-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/gi

/** All unique, lower-case addresses found in `text`, in order of appearance. */
export function extractEmails(text) {
  const seen = new Set()
  const out = []
  for (const match of String(text || '').matchAll(EMAIL_IN_TEXT)) {
    const email = match[0].replace(/^[.'%+-]+/, '').toLowerCase()
    if (email.length > 254 || seen.has(email)) continue
    seen.add(email)
    out.push(email)
  }
  return out
}

const u16 = (view, at) => view.getUint16(at, true)
const u32 = (view, at) => view.getUint32(at, true)

async function inflateRaw(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/** Text of the zip entries whose name passes `wanted` (docx / xlsx are zips). */
export async function zipEntryTexts(bytes, wanted) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let end = -1
  for (let at = bytes.length - 22; at >= Math.max(0, bytes.length - 65557); at -= 1) {
    if (u32(view, at) === 0x06054b50) { end = at; break }
  }
  if (end < 0) throw new Error('This is not a valid Word or Excel file.')
  const count = u16(view, end + 10)
  let at = u32(view, end + 16)
  const decoder = new TextDecoder()
  const texts = []
  for (let index = 0; index < count && texts.length < 60; index += 1) {
    if (u32(view, at) !== 0x02014b50) break
    const method = u16(view, at + 10)
    const size = u32(view, at + 20)
    const nameLen = u16(view, at + 28)
    const extraLen = u16(view, at + 30)
    const commentLen = u16(view, at + 32)
    const local = u32(view, at + 42)
    const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLen))
    at += 46 + nameLen + extraLen + commentLen
    if (!wanted(name) || size > 30_000_000) continue
    const dataStart = local + 30 + u16(view, local + 26) + u16(view, local + 28)
    const raw = bytes.subarray(dataStart, dataStart + size)
    const data = method === 0 ? raw : method === 8 ? await inflateRaw(raw) : null
    if (data) texts.push(decoder.decode(data))
  }
  return texts
}

const xmlToText = (xml) => xml.replace(/<\/(?:w:p|row|si|c)>|<w:tab\/>|<w:br\/>/g, ' ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')

/** Old binary .doc: no parser, so scan the raw bytes as 8-bit and as UTF-16 text. */
function scanBinary(bytes) {
  return `${new TextDecoder('latin1').decode(bytes)}\n${new TextDecoder('utf-16le').decode(bytes.subarray(0, bytes.length - (bytes.length % 2)))}`
}

/** @param {File} file @returns {Promise<string[]>} the email addresses inside the file */
export async function emailsFromFile(file) {
  const name = String(file?.name || '').toLowerCase()
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    const { pdfText } = await import('./pdfText.js')
    return extractEmails(await pdfText(bytes))
  }
  if (name.endsWith('.docx') || name.endsWith('.xlsx')) {
    const isDocx = name.endsWith('.docx')
    const parts = await zipEntryTexts(bytes, (entry) => (isDocx ? /^word\/(document|header\d*|footer\d*|_rels\/document\.xml)/.test(entry) : /^xl\/(sharedStrings|worksheets\/)/.test(entry)))
    return extractEmails(parts.map((part) => `${xmlToText(part)} ${part.replace(/mailto:/gi, ' ')}`).join('\n'))
  }
  if (name.endsWith('.doc')) return extractEmails(scanBinary(bytes))
  return extractEmails(new TextDecoder().decode(bytes))
}
