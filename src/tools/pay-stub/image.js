/** Logo / signature upload: downscaled in the browser and kept as a data URL (never uploaded). */

export const ACCEPTED_IMAGES = 'image/png,image/jpeg,image/webp,image/gif'
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024

/**
 * @param {File} file
 * @param {{ maxSize?: number }} [options]  longest side in pixels
 * @returns {Promise<{ dataUrl: string, width: number, height: number }>}
 */
export async function prepareImage(file, { maxSize = 480 } = {}) {
  if (!file || !/^image\/(png|jpeg|webp|gif)$/.test(file.type)) throw new Error('Choose a PNG, JPG, WebP or GIF image.')
  if (file.size > MAX_IMAGE_BYTES) throw new Error('That image is larger than 8 MB.')
  const bitmap = await createImageBitmap(file)
  const ratio = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * ratio))
  const height = Math.max(1, Math.round(bitmap.height * ratio))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()
  // PNG keeps transparency (logos, signatures); jsPDF and SVG both read it.
  return { dataUrl: canvas.toDataURL('image/png'), width, height }
}
