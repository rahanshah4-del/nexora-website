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

import { absoluteUrl } from './seoStructuredData.js'

// Raw URLs typed into a CMS post body become <a> tags below. A same-site URL
// pasted without its trailing slash (https://nexorasolution.us/blog/some-post)
// used to be linked verbatim, so every crawler following it hit a 301 and Search
// Console filed the page under "Page with redirect". Same-site URLs are now
// rewritten to the canonical trailing-slash form, the one absoluteUrl() gives
// <link rel="canonical">. External URLs and file URLs (.png, .pdf) are untouched.
const SITE_URL_RE = /^https?:\/\/(?:www\.)?nexorasolution\.(?:us|online)(?=[/?#]|$)/i
const TRAILING_PUNCTUATION_RE = /[.,;:!?)\]]+$/

export function canonicalSiteHref(url) {
  const value = String(url || '')
  if (!SITE_URL_RE.test(value)) return null
  const rest = value.replace(SITE_URL_RE, '')
  const path = rest.split(/[?#]/)[0]
  if (/\.[a-z0-9]{1,6}$/i.test(path.split('/').pop() || '')) return null
  return absoluteUrl(rest.startsWith('/') ? rest : `/${rest}`)
}

const BUSINESS_TERMS = [
  'POS', 'CRM', 'ERP', 'KOT', 'BOGO', 'SKU', 'API', 'UI', 'UX',
  'inventory management', 'point of sale', 'customer relationship management',
  'enterprise resource planning', 'kitchen order ticket', 'barcode',
  'WhatsApp CRM', 'Restaurant POS', 'Retail POS', 'School ERP',
  'Property ERP', 'PharmaFlow', 'Transport Management',
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

export const HIGHLIGHT_BUDGET_PER_ARTICLE = 10

/**
 * One article's share of auto-highlights. formatBlogContent() runs once per
 * paragraph, so without shared state every paragraph re-highlights every term it
 * contains — one post carried 94 of them (billing 23, pos 21, inventory 19).
 * Pass the same budget through an article's paragraphs to highlight each term on
 * its first occurrence only, up to a cap. Omit it and behaviour is unchanged.
 */
export function createHighlightBudget(remaining = HIGHLIGHT_BUDGET_PER_ARTICLE) {
  return { seen: new Set(), remaining }
}

/**
 * Formats plain text into React JSX or HTML string.
 * @param {string} text - The raw paragraph text
 * @param {object} options
 * @param {boolean} options.html - Return HTML string instead of JSX array
 * @param {boolean} options.autoHighlight - Auto-highlight business terms (default true)
 * @param {{seen: Set<string>, remaining: number}} [options.budget] - Shared per-article
 *   highlight budget from createHighlightBudget(); unlimited when omitted
 * @returns {Array|string} - JSX elements array or HTML string
 */
export function formatBlogContent(text, { html = false, autoHighlight = true, budget = null } = {}) {
  if (!text || typeof text !== 'string') return text

  // Step 1: Protect already-formatted content
  const protectedBlocks = []
  const protect = (match) => {
    protectedBlocks.push(match)
    return `\x00PROTECTED${protectedBlocks.length - 1}\x00`
  }

  // Protect inline code: `code`
  let processed = text.replace(/`([^`]+)`/g, (_, code) => protect(`<code class="bg-slate-100 text-rose-700 px-1.5 py-0.5 rounded text-[0.9em] font-mono font-semibold">${code}</code>`))

  // Protect Markdown links: [text](/internal-path/) and [text](https://...).
  // The text arrives HTML-escaped already. Only site paths and http(s) URLs are
  // linked, so "[x](javascript:...)" stays plain text.
  processed = processed.replace(/\[([^\]\n]+)\]\(((?:\/(?!\/)|https?:\/\/)[^)\s]*)\)/g, (_, label, target) => {
    const site = target.startsWith('/') || SITE_URL_RE.test(target)
    const href = target.startsWith('/') ? target : (canonicalSiteHref(target) || target)
    const attrs = site ? '' : ' target="_blank" rel="noreferrer noopener"'
    return protect(`<a href="${href}"${attrs} class="text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-800">${label}</a>`)
  })

  // Protect URLs
  processed = processed.replace(/(https?:\/\/[^\s]+)/g, (match) => {
    // Sentence punctuation after a same-site URL ("…/pricing.") is not part of it.
    const isSiteUrl = SITE_URL_RE.test(match)
    const trailing = isSiteUrl ? (match.match(TRAILING_PUNCTUATION_RE)?.[0] || '') : ''
    const url = trailing ? match.slice(0, -trailing.length) : match
    const href = canonicalSiteHref(url) || url
    return protect(`<a href="${href}" target="_blank" rel="noreferrer" class="text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-800">${url}</a>${trailing}`)
  })

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
  // Note: uses \b word-boundary matching (not lookbehind) — lookbehind
  // assertions ((?<!...)) throw "invalid group specifier name" on Safari
  // versions before 16.4, crashing the entire blog page. Splitting on HTML
  // tags first keeps term-matching out of tag markup without needing
  // lookaround at all.
  if (autoHighlight) {
    const segments = processed.split(/(<[^>]+>)/g)
    for (let i = 0; i < segments.length; i += 2) {
      let segment = segments[i]
      if (!segment) continue
      for (const term of SORTED_TERMS) {
        const key = term.toLowerCase()
        if (budget) {
          if (budget.remaining <= 0) break
          if (budget.seen.has(key)) continue
        }
        // Without a budget the old 'gi' behaviour is kept verbatim; with one,
        // 'i' stops at the first match so a term is highlighted once per article.
        const regex = new RegExp(`\\b(${escapeRegex(term)})\\b`, budget ? 'i' : 'gi')
        let matched = false
        segment = segment.replace(regex, (match) => {
          matched = true
          // Always protect, in both the HTML and JSX paths: SORTED_TERMS runs
          // longest-first, so an unprotected span let a shorter term match
          // inside one already inserted ("pos" inside <span>POS system</span>)
          // and nest a second span inside the first.
          return protect(`<span class="blog-term">${match}</span>`)
        })
        if (budget && matched) {
          budget.seen.add(key)
          budget.remaining -= 1
        }
      }
      segments[i] = segment
    }
    processed = segments.join('')
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

/**
 * Inject AI-generated highlight spans into an HTML string.
 *
 * Wraps verbatim text matches with:
 *   <span class="ai-highlight" data-highlight-id="..." data-category="..."
 *         data-explanation="..." data-link="..." data-color="...">text</span>
 *
 * - Sorts highlights by text length (longest first) to avoid substring collisions.
 * - Only wraps the FIRST occurrence of each highlight per paragraph (single-pass).
 * - Skips matches inside existing HTML tags.
 * - No-op if aiHighlights is empty or undefined.
 *
 * @param {string} htmlString — the formatted HTML for a paragraph
 * @param {Array} aiHighlights — array of { id, text, category, explanation, internalLink, color }
 * @returns {string} — HTML with <span class="ai-highlight"> injected
 */
export function injectAiHighlightSpans(htmlString, aiHighlights) {
  if (!aiHighlights || !aiHighlights.length) return htmlString
  if (!htmlString || typeof htmlString !== 'string') return htmlString

  // Sort by text length (longest first) to avoid substring overlap
  const sorted = [...aiHighlights].sort((a, b) =>
    String(b.text || '').length - String(a.text || '').length
  )

  let result = htmlString

  for (const hl of sorted) {
    const text = String(hl.text || '').trim()
    if (!text || text.length < 2) continue

    // Escape for regex
    const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Match only outside existing HTML tags (negative lookahead for >)
    const regex = new RegExp(`(${escaped})(?![^<]*>)`, 'i')

    const explanation = String(hl.explanation || '').replace(/"/g, '&quot;')
    const link = hl.internalLink ? String(hl.internalLink).replace(/"/g, '&quot;') : ''
    const category = String(hl.category || 'feature')
    const color = String(hl.color || '').replace(/"/g, '&quot;')
    const id = String(hl.id || '').replace(/"/g, '&quot;')

    const replacement = `<span class="ai-highlight" data-highlight-id="${id}" data-category="${category}" data-explanation="${explanation}" data-link="${link}" data-color="${color}">$1</span>`

    // Only replace first occurrence per highlight
    result = result.replace(regex, replacement)
  }

  return result
}
