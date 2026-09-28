/**
 * Logo upload: decode the chosen image, scale it to at most `maxSize` px on
 * the long side, and re-encode it (PNG, or JPEG for JPEG sources). Re-encoding
 * also strips metadata (EXIF, GPS) and turns SVGs into plain pixels, so no
 * script inside an SVG is ever stored or rendered. Browser-only.
 */

export const ACCEPTED_IMAGE_TYPES = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml'
const MAX_INPUT_BYTES = 10 * 1024 * 1024

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('This image could not be read.'))
    img.src = url
  })
}

/**
 * @param {File} file
 * @param {number} [maxSize]
 * @returns {Promise<{ blob: Blob, width: number, height: number }>}
 */
export async function resizeImageFile(file, maxSize = 600) {
  if (!file || !ACCEPTED_IMAGE_TYPES.split(',').includes(file.type)) throw new Error('Choose a PNG, JPG, WebP, GIF or SVG image.')
  if (file.size > MAX_INPUT_BYTES) throw new Error('That image is larger than 10 MB.')
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const width = img.naturalWidth || maxSize
    const height = img.naturalHeight || maxSize
    const scale = Math.min(1, maxSize / Math.max(width, height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const type = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png'
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('This image could not be processed.'))), type, 0.9)
    })
    return { blob, width: canvas.width, height: canvas.height }
  } finally {
    URL.revokeObjectURL(url)
  }
}
