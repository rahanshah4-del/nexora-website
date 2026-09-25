/**
 * Email Marketing module segments (pure: no Firebase imports, so Node tests
 * can load it). The segment key is stored as `moduleInterest` on
 * marketingSubscribers and computed at read time for users, workspaces,
 * upgrade requests, leads and customers.
 */
import { MODULE_REGISTRY, resolveModuleStrict } from './moduleRegistry.js'

// Values are the moduleInterest keys: crm, restaurant, transport, school and
// property as before; retail, whatsapp and pharmacy added. Labels come from
// the shared module registry.
export const MODULE_OPTIONS = [
  { value: 'all', label: 'All' },
  ...MODULE_REGISTRY.map((module) => ({ value: module.marketingKey, label: module.label })),
]

// Word fallback for values the registry does not recognise. Order matters:
// specific module words run before the generic 'pos' and 'erp' checks, so
// 'pos' no longer swallows retail and 'erp' no longer swallows property.
// 'erp' and 'pos' match whole words only ('Enterprise' is not School ERP).
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

/** Segment key for any stored value: registry marketingKey first, then the word fallback; '' if nothing matches. */
export function moduleFromValue(value) {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!text) return ''
  const module = resolveModuleStrict(text)
  if (module) return module.marketingKey
  const match = MODULE_WORD_FALLBACK.find(([, words]) => words.some((word) => (word instanceof RegExp ? word.test(text) : text.includes(word))))
  return match ? match[0] : ''
}
