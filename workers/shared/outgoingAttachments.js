/**
 * Files an admin attaches to a reply or a new email. Pure, shared by the Worker (authoritative check) and the
 * Control Centre (same limits shown before sending).
 */
export const MAX_FILES = 5
export const MAX_TOTAL_BYTES = 7 * 1024 * 1024
const BLOCKED = /\.(exe|bat|cmd|com|scr|msi|js|jse|vbs|vbe|wsf|jar|ps1|sh|dll|lnk|iso|apk)$/i

export const decodedSize = (base64) => Math.floor((String(base64 || '').replace(/=+$/, '').length * 3) / 4)

const cleanName = (name, i) => String(name || `attachment-${i + 1}`).replace(/[\\/:*?"<>|]+/g, '_').split('').filter((c) => c.charCodeAt(0) > 31).join('').trim().slice(0, 120) || `attachment-${i + 1}`

/**
 * input: [{ filename, content (base64), content_type }] -> { attachments, error }.
 * `error` is a plain sentence for the admin; attachments is [] when it is set.
 */
export function sanitizeAttachments(input) {
  if (input === undefined || input === null || (Array.isArray(input) && !input.length)) return { attachments: [], error: '' }
  if (!Array.isArray(input)) return { attachments: [], error: 'Attachments are not valid.' }
  if (input.length > MAX_FILES) return { attachments: [], error: `You can attach up to ${MAX_FILES} files.` }
  let total = 0
  const attachments = []
  for (const [i, item] of input.entries()) {
    const filename = cleanName(item?.filename, i)
    const content = String(item?.content || '')
    if (!content || !/^[A-Za-z0-9+/]+=*$/.test(content)) return { attachments: [], error: `"${filename}" could not be read. Attach it again.` }
    if (BLOCKED.test(filename)) return { attachments: [], error: `"${filename}" is an executable file type and cannot be sent. Zip it or send a link instead.` }
    total += decodedSize(content)
    attachments.push({ filename, content, content_type: String(item?.content_type || 'application/octet-stream').slice(0, 100) })
  }
  if (total > MAX_TOTAL_BYTES) return { attachments: [], error: `Attachments are too large (${(total / 1048576).toFixed(1)} MB). The limit is ${MAX_TOTAL_BYTES / 1048576} MB in total.` }
  return { attachments, error: '' }
}
