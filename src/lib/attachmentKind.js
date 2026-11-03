/** How the browser can show a file inline: 'image' | 'pdf' | 'text' | 'none'. SVG/HTML are never previewed (scripts). */
const IMAGE = /^(image\/(png|jpe?g|gif|webp|bmp|avif))$/i
const EXT = { png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image', bmp: 'image', avif: 'image', pdf: 'pdf', txt: 'text', csv: 'text', log: 'text', md: 'text', json: 'text' }

export function previewKind(filename = '', contentType = '') {
  const type = String(contentType).toLowerCase().split(';')[0].trim()
  if (IMAGE.test(type)) return 'image'
  if (type === 'application/pdf') return 'pdf'
  if (['text/plain', 'text/csv', 'application/json', 'text/markdown'].includes(type)) return 'text'
  const ext = String(filename).toLowerCase().split('.').pop()
  return EXT[ext] || 'none'
}

/** Best MIME type to give the Blob so the browser renders it. */
export function mimeFor(filename = '', contentType = '') {
  const kind = previewKind(filename, contentType)
  const type = String(contentType).toLowerCase().split(';')[0].trim()
  if (kind === 'pdf') return 'application/pdf'
  if (kind === 'text') return 'text/plain'
  if (kind === 'image') {
    if (/^image\//.test(type)) return type
    const ext = String(filename).toLowerCase().split('.').pop()
    return `image/${ext === 'jpg' ? 'jpeg' : ext}`
  }
  return type || 'application/octet-stream'
}
