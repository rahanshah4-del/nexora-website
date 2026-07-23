/**
 * Client-side fetch wrapper for the Nexora AI Gateway `/menu-import` endpoint.
 *
 * Usage:
 *   import { extractMenuFromImage, fetchMenuImportStats } from './menuImportWorker.js'
 *   const { items, stats } = await extractMenuFromImage({ imageUrl, existingCategories })
 */

const AI_GATEWAY_URL = import.meta.env.VITE_AI_GATEWAY_URL || 'https://nexora-ai-gateway.rahanshah4.workers.dev'

const MAX_RETRIES = 2
const RETRY_DELAY_MS = 1500

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Extract menu items from an image (URL or base64 data URL) via AI Gateway.
 *
 * @param {Object} params
 * @param {string}  params.imageUrl              — public download URL OR base64 data URL
 * @param {string}  [params.provider='gemini']
 * @param {number}  [params.confidenceThreshold=0.7]
 * @param {string[]}[params.existingCategories=[]]
 * @param {string[]}[params.existingItemNames=[]]
 * @param {string}  [params.language='auto']
 * @param {AbortSignal} [params.signal]
 * @returns {Promise<{items: Array, stats: Object}>}
 */
export async function extractMenuFromImage({
  imageUrl,
  provider = 'gemini',
  confidenceThreshold = 0.7,
  existingCategories = [],
  existingItemNames = [],
  language = 'auto',
  signal,
} = {}) {
  if (!imageUrl) throw new Error('imageUrl is required')

  const isBase64 = imageUrl.startsWith('data:')

  let lastError = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const body = {
        provider,
        confidenceThreshold,
        existingCategories,
        existingItemNames,
        language,
      }

      // Use imageBase64 for data URLs, imageUrl for HTTP URLs
      if (isBase64) {
        body.imageBase64 = imageUrl
      } else {
        body.imageUrl = imageUrl
      }

      const res = await fetch(`${AI_GATEWAY_URL}/menu-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      })

      const data = await res.json()

      if (!res.ok) {
        let errMsg = data.message || data.error || `Request failed: ${res.status}`
        // Append provider-level errors if available (e.g., all_providers_failed)
        if (Array.isArray(data.errors) && data.errors.length > 0) {
          errMsg += ' | ' + data.errors.join(' | ')
        }
        throw new Error(errMsg)
      }

      return data
    } catch (error) {
      if (error.name === 'AbortError') throw error
      lastError = error
      if (attempt < MAX_RETRIES && error.message?.includes('Server error')) {
        await delay(RETRY_DELAY_MS * (attempt + 1))
        continue
      }
      throw error
    }
  }

  throw lastError || new Error('Menu extraction failed after retries')
}

/**
 * Extract menu items from plain TEXT via DeepSeek (no vision required).
 */
export async function extractMenuFromText({
  text,
  confidenceThreshold = 0.7,
  existingCategories = [],
  existingItemNames = [],
  signal,
} = {}) {
  if (!text || !text.trim()) throw new Error('text is required')

  const res = await fetch(`${AI_GATEWAY_URL}/menu-extract-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: text.trim(), confidenceThreshold, existingCategories, existingItemNames }),
    signal,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || data.error || `Extraction failed: ${res.status}`)
  return data
}

/**
 * Fetch admin analytics for menu imports.
 */
export async function fetchMenuImportStats(adminKey) {
  const res = await fetch(`${AI_GATEWAY_URL}/menu-import/stats`, {
    headers: { Authorization: `Bearer ${adminKey}` },
  })
  if (!res.ok) throw new Error(`Stats fetch failed: ${res.status}`)
  return res.json()
}
