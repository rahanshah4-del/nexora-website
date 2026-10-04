/**
 * Clipboard HTML → Blog CMS Markdown.
 *
 * When an article is copied from ChatGPT, Google Docs or a web page, the
 * clipboard carries rich HTML. A plain <textarea> keeps only the text, so
 * headings, bold, lists and tables were lost (tables arrived as one cell per
 * line, leaving big gaps). The Blog CMS calls htmlToBlogMarkdown() on paste
 * and inserts Markdown that src/lib/blogBlocks.js renders back faithfully.
 *
 * Works on any DOM-like tree (nodeType / nodeName / childNodes / textContent),
 * so it is testable without a browser.
 */

const BLOCK_TAGS = new Set(['P', 'DIV', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'MAIN', 'ASIDE'])
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'META', 'LINK', 'HEAD', 'TITLE', 'NOSCRIPT', 'BUTTON', 'SVG', 'IMG', 'FIGURE', 'CANVAS'])

function tag(node) {
  return String(node?.nodeName || '').toUpperCase()
}

function collapse(text) {
  return String(text || '').replace(/[ \t\u00a0]+/g, ' ')
}

function isBoldStyle(node) {
  const style = typeof node.getAttribute === 'function' ? node.getAttribute('style') || '' : ''
  return /font-weight\s*:\s*(bold|[6-9]00)/i.test(style)
}

function inlineText(node) {
  if (!node) return ''
  if (node.nodeType === 3) return collapse(node.nodeValue)
  if (node.nodeType !== 1) return ''
  const name = tag(node)
  if (SKIP_TAGS.has(name)) return ''
  if (name === 'BR') return '\n'
  const inner = Array.from(node.childNodes || []).map(inlineText).join('')
  if (!inner.trim()) return inner
  if (name === 'STRONG' || name === 'B' || isBoldStyle(node)) {
    // Google Docs wraps whole documents in <b style="font-weight:normal">.
    if (/font-weight\s*:\s*(normal|400)/i.test(typeof node.getAttribute === 'function' ? node.getAttribute('style') || '' : '')) return inner
    const lead = inner.match(/^\s*/)[0]
    const trail = inner.match(/\s*$/)[0]
    return `${lead}**${inner.trim()}**${trail}`
  }
  if (name === 'EM' || name === 'I') {
    const lead = inner.match(/^\s*/)[0]
    const trail = inner.match(/\s*$/)[0]
    return `${lead}__${inner.trim()}__${trail}`
  }
  if (name === 'CODE') return `\`${inner.trim()}\``
  if (name === 'MARK') return `==${inner.trim()}==`
  if (name === 'A') {
    const href = typeof node.getAttribute === 'function' ? node.getAttribute('href') || '' : ''
    // Links stay as readable text; bare https URLs are auto-linked on render.
    return /^https?:\/\//i.test(href) && !inner.includes(href) ? `${inner} (${href})` : inner
  }
  return inner
}

function cellText(node) {
  return inlineText(node).replace(/\s*\n\s*/g, ' ').replace(/\|/g, '/').trim()
}

function tableToMarkdown(table) {
  const rows = []
  const walk = (node) => {
    for (const child of Array.from(node.childNodes || [])) {
      if (tag(child) === 'TR') rows.push(Array.from(child.childNodes || []).filter((c) => ['TD', 'TH'].includes(tag(c))).map(cellText))
      else if (child.nodeType === 1 && tag(child) !== 'TABLE') walk(child)
    }
  }
  walk(table)
  const filled = rows.filter((r) => r.some(Boolean))
  if (!filled.length) return ''
  const width = Math.max(...filled.map((r) => r.length))
  const pad = (r) => [...r, ...Array(width - r.length).fill('')]
  const [header, ...body] = filled.map(pad)
  return [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...body.map((r) => `| ${r.join(' | ')} |`),
  ].join('\n')
}

function listToMarkdown(list, ordered) {
  let n = 0
  return Array.from(list.childNodes || [])
    .filter((c) => tag(c) === 'LI')
    .map((li) => {
      n += 1
      // Nested lists are flattened into the parent item's text.
      const text = Array.from(li.childNodes || [])
        .map((c) => (['UL', 'OL'].includes(tag(c)) ? ` ${listToMarkdown(c, tag(c) === 'OL').replace(/\n/g, ' ')}` : inlineText(c)))
        .join('')
        .replace(/\s*\n\s*/g, ' ')
        .trim()
      return text ? `${ordered ? `${n}.` : '-'} ${text}` : ''
    })
    .filter(Boolean)
    .join('\n')
}

function blocksFrom(node, out) {
  for (const child of Array.from(node.childNodes || [])) {
    if (child.nodeType === 3) {
      const text = collapse(child.nodeValue).trim()
      if (text) out.push(text)
      continue
    }
    if (child.nodeType !== 1) continue
    const name = tag(child)
    if (SKIP_TAGS.has(name)) continue
    if (/^H[1-6]$/.test(name)) {
      // H1 is the post title (its own field); everything else keeps its level, min ##.
      const level = Math.min(4, Math.max(2, Number(name[1])))
      const text = cellText(child).replace(/^\*\*(.+)\*\*$/, '$1')
      if (text) out.push(`${'#'.repeat(level)} ${text}`)
    } else if (name === 'TABLE') {
      const md = tableToMarkdown(child)
      if (md) out.push(md)
    } else if (name === 'UL' || name === 'OL') {
      const md = listToMarkdown(child, name === 'OL')
      if (md) out.push(md)
    } else if (name === 'BLOCKQUOTE') {
      const text = inlineText(child).trim()
      if (text) out.push(text.split('\n').map((l) => `> ${l.trim()}`).join('\n'))
    } else if (name === 'PRE') {
      const text = String(child.textContent || '').trim()
      if (text) out.push(text)
    } else if (name === 'HR') {
      continue
    } else if (BLOCK_TAGS.has(name) && Array.from(child.childNodes || []).some((c) => c.nodeType === 1 && (BLOCK_TAGS.has(tag(c)) || /^H[1-6]$|^(TABLE|UL|OL|BLOCKQUOTE|PRE)$/.test(tag(c))))) {
      blocksFrom(child, out)
    } else {
      const text = inlineText(child).split('\n').map((l) => l.trim()).join('\n').trim()
      if (text) out.push(text)
    }
  }
  return out
}

/** Converts a parsed clipboard document/body into Blog CMS Markdown. */
export function htmlNodeToBlogMarkdown(root) {
  const body = root?.body || root
  return blocksFrom(body, []).join('\n\n').replace(/\n{3,}/g, '\n\n').trim()
}

/** Browser helper: clipboard HTML string → Markdown ('' when it has no structure worth keeping). */
export function htmlToBlogMarkdown(html) {
  if (!html || typeof DOMParser === 'undefined') return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return htmlNodeToBlogMarkdown(doc)
}
