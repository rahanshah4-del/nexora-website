/**
 * Email Marketing module segments for the sendMarketingCampaign function.
 *
 * Server-side copy of src/lib/marketingModules.js: the functions package is
 * deployed on its own and cannot import from src/. Keep both in sync —
 * tests/marketing-modules.test.mjs fails if they classify any value differently.
 */

// [segment key, explicit values from src/lib/moduleRegistry.js (type, id,
// label, legacy types, aliases), lower-cased]
const MODULE_SEGMENTS = [
  ['crm', ['general crm', 'general-crm', 'nexora sales hub', 'general business', 'healthcare / hospital', 'software agency', 'custom enterprise', 'crm', 'sales-hub', 'nexora-sales-hub', 'sales hub']],
  ['retail', ['retail / pos', 'retail-pos', 'retail / inventory', 'inventory / pharma', 'retail', 'pos', 'retail pos']],
  ['school', ['school erp', 'school-erp', 'school']],
  ['property', ['property erp', 'property-erp', 'property']],
  ['restaurant', ['restaurant pos', 'restaurant-pos', 'restaurant / pos', 'restaurant / canteen', 'restaurant']],
  ['transport', ['transport / rental', 'transport-rental', 'transport / logistics', 'transport', 'fleet']],
  ['whatsapp', ['whatsapp crm', 'whatsapp-crm', 'whatsapp']],
  ['pharmacy', ['pharmaflow', 'medical-store-pos', 'medical store pos', 'medical', 'pharmacy', 'medicine', 'pharmacy pos']],
]

const SEGMENT_BY_VALUE = new Map(MODULE_SEGMENTS.flatMap(([key, values]) => values.map((value) => [value, key])))

// Word fallback for unrecognised values. Order matters: specific module words
// run before the generic 'pos' and 'erp' checks, which match whole words only.
const MODULE_WORD_FALLBACK = [
  ['whatsapp', ['whatsapp']],
  ['pharmacy', ['medical', 'pharmacy', 'medicine', 'pharma']],
  ['restaurant', ['restaurant', 'canteen', 'kitchen']],
  ['retail', ['retail', 'inventory']],
  ['transport', ['transport', 'fleet']],
  ['property', ['property', 'real estate']],
  ['school', ['school', /\berp\b/]],
  ['restaurant', [/\bpos\b/]],
  ['crm', ['crm', 'sales']],
]

/** Allowed selectedModule values for a campaign. */
export const MARKETING_MODULE_KEYS = new Set(['all', ...MODULE_SEGMENTS.map(([key]) => key)])

/** Segment key for any stored value; '' if nothing matches. */
export function moduleFromValue(value) {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!text) return ''
  if (SEGMENT_BY_VALUE.has(text)) return SEGMENT_BY_VALUE.get(text)
  const match = MODULE_WORD_FALLBACK.find(([, words]) => words.some((word) => (word instanceof RegExp ? word.test(text) : text.includes(word))))
  return match ? match[0] : ''
}
