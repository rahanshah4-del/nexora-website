/**
 * AI Menu Import — Client-side settings defaults.
 *
 * In production, the Control Centre writes these into the
 * `platformSettings/main` Firestore document. The hook reads
 * them via the `useUser()` context or falls back to these defaults.
 */

export const MENU_IMPORT_DEFAULTS = {
  /** Master toggle — when false, "Import with AI" button is hidden */
  enabled: true,

  /** AI provider for vision extraction */
  ocrProvider: 'gemini',

  /** Maximum upload file size in megabytes */
  maxUploadSizeMB: 10,

  /** Allowed file extensions (without dots) */
  allowedFileTypes: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],

  /** MIME types corresponding to allowed extensions */
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ],

  /** AI confidence threshold (0-1). Items below this are flagged with warnings. */
  confidenceThreshold: 0.7,

  /** Estimated cost price coefficient × extracted price (0-1) */
  costPriceCoefficient: 0.4,

  /** Maximum items per import (safety limit) */
  maxItemsPerImport: 500,
}

/**
 * Merge platform settings overrides into defaults.
 * @param {Object|null} platformSettings — from Firestore `platformSettings/main.aiMenuImport`
 * @returns {Object} resolved settings
 */
export function resolveMenuImportSettings(platformSettings) {
  const overrides = platformSettings?.aiMenuImport || {}
  const flags = platformSettings?.featureFlags || {}

  return {
    ...MENU_IMPORT_DEFAULTS,
    ...overrides,
    enabled: flags.aiMenuImport !== false && (overrides.enabled !== false),
  }
}
