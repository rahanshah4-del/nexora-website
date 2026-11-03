import { MAX_FILES, MAX_TOTAL_BYTES, decodedSize } from '../../workers/shared/outgoingAttachments.js'

const BLOCKED = /\.(exe|bat|cmd|com|scr|msi|js|jse|vbs|vbe|wsf|jar|ps1|sh|dll|lnk|iso|apk)$/i

function readBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error(`"${file.name}" could not be read.`))
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
    reader.readAsDataURL(file)
  })
}

/** Add picked files to the list already chosen. Returns { items, error } (error is a plain sentence, items stay valid). */
export async function addFiles(existing, fileList) {
  const items = [...existing]
  let error = ''
  for (const file of Array.from(fileList || [])) {
    if (items.length >= MAX_FILES) { error = `You can attach up to ${MAX_FILES} files.`; break }
    if (BLOCKED.test(file.name)) { error = `"${file.name}" is an executable file type and cannot be sent. Zip it or send a link instead.`; continue }
    const total = items.reduce((sum, item) => sum + item.size, 0) + file.size
    if (total > MAX_TOTAL_BYTES) { error = `"${file.name}" would pass the ${MAX_TOTAL_BYTES / 1048576} MB limit for attachments.`; continue }
    try {
      const content = await readBase64(file)
      items.push({ filename: file.name, content, content_type: file.type || 'application/octet-stream', size: decodedSize(content) })
    } catch (readError) { error = readError.message }
  }
  return { items, error }
}

/** What the API wants: no UI-only fields. */
export const toPayload = (items) => items.map(({ filename, content, content_type }) => ({ filename, content, content_type }))
