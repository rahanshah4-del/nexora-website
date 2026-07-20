/**
 * Blog content formatter — enriches plain article text with:
 *  - Highlighted business terms (auto-detected)
 *  - ==highlight== markers → Apple-style yellow marker highlight
 *  - **bold** markers → bold text
 *  - __italic__ markers → italic text (optional)
 *  - `code` markers → inline code
 *
 * Used by both BlogArticlePage (React) and prerender.mjs (SSG).
 */

const BUSINESS_TERMS = [
  'POS', 'CRM', 'ERP', 'KOT', 'BOGO', 'SKU', 'API', 'UI', 'UX',
  'inventory management', 'point of sale', 'customer relationship management',
  'enterprise resource planning', 'kitchen order ticket', 'barcode',
  'WhatsApp CRM', 'Restaurant POS', 'Retail POS', 'School ERP',
  'Property ERP', 'Medical Store POS', 'Transport Management',
  'cloud-based', 'real-time', 'automation', 'dashboard',
  'analytics', 'reporting', 'payment gateway', 'ledger',
  'multi-currency', 'role-based access', 'two-factor authentication',
  'data encryption', 'backup', 'scalable', 'integration',
  'subscription', 'billing', 'invoice', 'inventory',
  'attendance', 'payroll', 'fee management', 'student records',
  'table management', 'kitchen display', 'waitlist', 'reservation',
  'delivery zone', 'fleet management', 'loyalty program',
  'promo code', 'discount engine', 'tax compliance',
  'Nexora', 'Nexora Solution', 'Pakistan',
]

// Sort by length descending so longer terms match first
const SORTED_TERMS = [...BUSINESS_TERMS].sort((a, b) => b.length - a.length)

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Formats plain text into React JSX or HTML string.
 * @param {string} text - The raw paragraph text
 * @param {object} options
 * @param {boolean} options.html - Return HTML string instead of JSX array
 * @param {boolean} options.autoHighlight - Auto-highlight business terms (default true)
 * @returns {Array|string} - JSX elements array or HTML string
 */
export function formatBlogContent(text, { html = false, autoHighlight = true } = {}) {
  if (!text || typeof text !== 'string') return text

  // Step 1: Protect already-formatted content
  const protectedBlocks = []
  const protect = (match) => {
    protectedBlocks.push(match)
    return `\x00PROTECTED${protectedBlocks.length - 1}\x00`
  }

  // Protect inline code: `code`
  let processed = text.replace(/`([^`]+)`/g, (_, code) => protect(`<code class="bg-slate-100 text-rose-700 px-1.5 py-0.5 rounded text-[0.9em] font-mono font-semibold">${code}</code>`))

  // Protect URLs
  processed = processed.replace(/(https?:\/\/[^\s]+)/g, (url) => protect(`<a href="${url}" target="_blank" rel="noreferrer" class="text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-800">${url}</a>`))

  // Step 2: ==highlight== → marker-style highlight (Apple yellow)
  processed = processed.replace(/==([^=]+)==/g, (_, content) => {
    if (html) return `<mark class="blog-highlight">${content}</mark>`
    return protect(`<mark class="blog-highlight">${content}</mark>`)
  })

  // Step 3: **bold**
  processed = processed.replace(/\*\*([^*]+)\*\*/g, (_, content) => {
    if (html) return `<strong class="font-extrabold text-slate-950">${content}</strong>`
    return protect(`<strong class="font-extrabold text-slate-950">${content}</strong>`)
  })

  // Step 4: __italic__
  processed = processed.replace(/__([^_]+)__/g, (_, content) => {
    if (html) return `<em class="italic text-slate-700">${content}</em>`
    return protect(`<em class="italic text-slate-700">${content}</em>`)
  })

  // Step 5: Auto-highlight business terms (only if autoHighlight is true)
  if (autoHighlight) {
    for (const term of SORTED_TERMS) {
      const regex = new RegExp(`(?<!<[^>]*)(?<!\\w)(${escapeRegex(term)})(?!\\w)(?![^<]*>)`, 'gi')
      processed = processed.replace(regex, (match) => {
        if (html) return `<span class="blog-term">${match}</span>`
        return protect(`<span class="blog-term">${match}</span>`)
      })
    }
  }

  // Step 6: Handle tip/note/warning prefixes
  processed = processed.replace(/^(\*\*(?:Tip|Note|Warning|Important|Pro Tip|Heads Up|Key Point):\*\*)\s*/i, (match) => {
    const type = match.toLowerCase()
    const isWarning = type.includes('warning') || type.includes('important')
    const isTip = type.includes('tip') || type.includes('pro tip')
    const tone = isWarning
      ? 'border-amber-300 bg-amber-50 text-amber-900'
      : isTip
        ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
        : 'border-blue-300 bg-blue-50 text-blue-900'
    const icon = isWarning ? '⚠️' : isTip ? '💡' : '📝'
    if (html) return `<span class="blog-tip-badge ${tone}">${icon} ${match.replace(/\*\*/g, '')}</span>`
    return protect(`<span class="blog-tip-badge ${tone}">${icon} ${match.replace(/\*\*/g, '')}</span>`)
  })

  // Restore protected blocks
  protectedBlocks.forEach((block, index) => {
    processed = processed.replace(`\x00PROTECTED${index}\x00`, block)
  })

  if (html) return processed
  return processed
}

/**
 * Simple version for the prerender script that returns HTML string only.
 */
export function formatBlogContentHtml(text) {
  return formatBlogContent(text, { html: true, autoHighlight: true })
}
