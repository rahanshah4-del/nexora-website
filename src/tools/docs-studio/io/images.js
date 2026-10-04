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

/**
 * Signature / company stamp upload: resized PNG with the paper background made
 * transparent, so a photo of a signature on white paper sits cleanly over the
 * document (and over the stamp). Near-white pixels fade out smoothly.
 * @returns {Promise<{ blob: Blob, width: number, height: number }>}
 */
export async function prepareMarkImage(file, maxSize = 600) {
  const resized = await resizeImageFile(file, maxSize)
  if (file.type === 'image/svg+xml') return resized
  const url = URL.createObjectURL(resized.blob)
  try {
    const img = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = resized.width
    canvas.height = resized.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const d = data.data
    for (let i = 0; i < d.length; i += 4) {
      const lightness = Math.min(d[i], d[i + 1], d[i + 2])
      if (lightness >= 235) d[i + 3] = 0
      else if (lightness >= 200) d[i + 3] = Math.round(d[i + 3] * (235 - lightness) / 35)
    }
    ctx.putImageData(data, 0, 0)
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('This image could not be processed.'))), 'image/png')
    })
    return { blob, width: canvas.width, height: canvas.height }
  } finally {
    URL.revokeObjectURL(url)
  }
}
