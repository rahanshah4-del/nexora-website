/**
 * Blog Internal Link Engine.
 *
 * Single source of truth for term → URL mapping.
 * Used by:
 *   - AI highlight extraction (blogHighlights.js — AI suggests links)
 *   - Client-side rendering (blogContentFormatter.js — injectAiHighlightSpans)
 *   - SSR prerendering (scripts/prerender.mjs — autoLinkTerms)
 *
 * All routes are absolute paths relative to the Nexora site root.
 */

/**
 * Term → route path mapping.
 * Keys are normalized (lowercase, trimmed). Values are URL paths.
 * Keep this list synced with PUBLIC_ROUTES in prerender.mjs.
 */
export const KNOWN_ROUTES = {
  // POS & Industry Solutions
  'restaurant pos': '/restaurant-pos',
  'retail pos': '/retail-pos',
  'school erp': '/school-erp',
  'medical store pos': '/solutions/medical-store-pos',
  'pharmacy pos': '/solutions/medical-store-pos',
  'property erp': '/solutions/property-erp',
  'transport': '/transport',
  'transport management': '/transport',
  'fleet management': '/transport',
  'whatsapp crm': '/whatsapp-crm',

  // Solutions
  'crm': '/solutions/crm',
  'pos': '/restaurant-pos',
  'inventory': '/solutions/inventory-management',
  'inventory management': '/solutions/inventory-management',
  'barcode': '/solutions/inventory-management',
  'email marketing': '/solutions/email-marketing',
  'reports': '/solutions/reports-analytics',
  'reports & analytics': '/solutions/reports-analytics',
  'analytics': '/solutions/reports-analytics',
  'team permissions': '/solutions/team-permissions',
  'role-based access': '/solutions/team-permissions',

  // ERP terms
  'erp': '/school-erp',
  'kot': '/restaurant-pos',
  'kitchen display': '/restaurant-pos',
  'table management': '/restaurant-pos',
  'billing': '/restaurant-pos',
  'invoice': '/restaurant-pos',
  'ledger': '/restaurant-pos',
  'payment gateway': '/restaurant-pos',

  // Pages
  'pricing': '/pricing',
  'contact': '/contact',
  'about': '/about',

  // Common business terms (link to relevant solution)
  'cloud pos': '/restaurant-pos',
  'cloud-based': '/restaurant-pos',
  'multi branch': '/restaurant-pos',
  'multi-currency': '/restaurant-pos',
  'discount engine': '/restaurant-pos',
  'loyalty program': '/restaurant-pos',
  'promo code': '/restaurant-pos',
  'payroll': '/school-erp',
  'attendance': '/school-erp',
  'fee management': '/school-erp',
  'student records': '/school-erp',
  'waitlist': '/restaurant-pos',
  'reservation': '/restaurant-pos',
  'delivery zone': '/restaurant-pos',
  'tax compliance': '/solutions/reports-analytics',
  'data encryption': '/solutions/team-permissions',
  'backup': '/solutions/team-permissions',
  'scalable': '/restaurant-pos',
  'integration': '/restaurant-pos',
  'subscription': '/pricing',
}

/** Normalize a term for lookup — lowercase, trimmed, no extra spaces */
function normalizeTerm(term) {
  return String(term || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Resolve a term to its internal link path.
 * @param {string} term — the term to look up (e.g., "CRM", "Restaurant POS")
 * @returns {string|null} — the route path (e.g., "/solutions/crm") or null
 */
export function resolveInternalLink(term) {
  const key = normalizeTerm(term)
  // Exact match
  if (KNOWN_ROUTES[key]) return KNOWN_ROUTES[key]
  // Partial match — check if the term contains a known key
  for (const [knownTerm, path] of Object.entries(KNOWN_ROUTES)) {
    if (key.includes(knownTerm) || knownTerm.includes(key)) return path
  }
  return null
}

/**
 * Auto-link first occurrence of each known term in a text block.
 * Only the first occurrence per term gets an <a> tag.
 *
 * @param {string} text — HTML or plain text content
 * @returns {string} — content with first-occurrence links injected
 */
export function autoLinkTerms(text) {
  let result = String(text || '')
  const alreadyLinked = new Set()
  const placeholders = []

  // Sort terms by length (longest first) to avoid substring collisions
  const sortedTerms = Object.keys(KNOWN_ROUTES).sort((a, b) => b.length - a.length)

  for (const term of sortedTerms) {
    if (alreadyLinked.has(term)) continue
    const path = KNOWN_ROUTES[term]
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Match term with word boundaries, but NOT inside existing <a> tags
    const regex = new RegExp(`(\\b${escaped}\\b)(?![^<]*<\\/a>)`, 'gi')
    let count = 0
    result = result.replace(regex, (match) => {
      if (count >= 1) return match
      count++
      const placeholder = `\x00AUTOLINK${placeholders.length}\x00`
      placeholders.push({ placeholder, replacement: `<a href="${path}" class="auto-internal-link">${match}</a>` })
      return placeholder
    })
    if (count > 0) alreadyLinked.add(term)
  }

  // Restore placeholders (already protected from further regex matches)
  for (const { placeholder, replacement } of placeholders) {
    result = result.replace(placeholder, replacement)
  }

  return result
}
