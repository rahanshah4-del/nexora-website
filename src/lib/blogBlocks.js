/**
 * Blog content blocks — turns the article text written in the Blog CMS (plain
 * text with light Markdown) into structured blocks and HTML.
 *
 * Stored shape stays the same: article.sections[] = { id, heading, paragraphs[] }.
 * Each paragraph string is one "block" and may now be:
 *   ### Heading / #### Heading         → h3 / h4   (# or ## inside a block → h2)
 *   **Short bold line**                → h3
 *   - item / * item / • item           → bullet list
 *   1. item / 1) item                  → numbered list
 *   | a | b |  + |---|---|  rows       → table (Markdown)
 *   a<TAB>b<TAB>c  (2+ lines)          → table (pasted from a spreadsheet)
 *   > quote                            → blockquote
 *   anything else                      → paragraph (single newlines kept as <br>)
 * Inline **bold**, __italic__, ==highlight==, `code` and links are handled by
 * blogContentFormatter.js through the `formatInline` callback.
 *
 * Shared by BlogArticlePage.jsx, scripts/prerender.mjs and the Blog CMS, so
 * the editor, the live page and the crawler HTML always agree.
 */

const HEADING = /^(#{1,4})\s+(.+?)\s*#*\s*$/
// A short line that is bold from start to end (ChatGPT's "heading" style).
const BOLD_LINE = /^\*\*([^*\n]{2,90})\*\*:?\s*$/
const BULLET = /^\s*(?:[-*+•▪●◦])\s+(.+)$/
const ORDERED = /^\s*\d{1,3}[.)]\s+(.+)$/
const QUOTE = /^\s*>\s?(.*)$/
const TABLE_ROW = /^\s*\|.*\|\s*$/
const TABLE_SEPARATOR = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/

export function escapeBlogHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function slugifyHeading(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[*_=`#]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function splitTableRow(line) {
  let row = line.trim()
  if (row.startsWith('|')) row = row.slice(1)
  if (row.endsWith('|')) row = row.slice(0, -1)
  return row.split('|').map((cell) => cell.trim())
}

function tableFromRows(rows) {
  const width = Math.max(...rows.map((r) => r.length))
  const pad = (r) => [...r, ...Array(Math.max(0, width - r.length)).fill('')].slice(0, width)
  const [header, ...body] = rows.map(pad)
  return { type: 'table', header, rows: body.filter((r) => r.some((cell) => cell !== '')) }
}

function parseMarkdownTable(lines) {
  const rows = lines.filter((line) => !TABLE_SEPARATOR.test(line)).map(splitTableRow)
  return tableFromRows(rows)
}

function isTsvTable(lines) {
  if (lines.length < 2) return false
  const counts = lines.map((line) => line.split('\t').length)
  return counts.every((c) => c >= 2) && counts.every((c) => c === counts[0])
}

/** Parses one stored paragraph string into an array of blocks. */
export function parseBlogBlock(text) {
  const raw = String(text ?? '').replace(/\r\n?/g, '\n').trim()
  if (!raw) return []
  const lines = raw.split('\n')

  if (isTsvTable(lines)) return [tableFromRows(lines.map((line) => line.split('\t').map((cell) => cell.trim())))]

  const blocks = []
  let i = 0
  let paragraph = []
  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: 'p', text: paragraph.join('\n') })
    paragraph = []
  }

  while (i < lines.length) {
    const line = lines[i]
    const heading = line.match(HEADING)
    if (heading) {
      flushParagraph()
      const level = Math.max(2, heading[1].length)
      blocks.push({ type: `h${level}`, text: heading[2].replace(/^\*\*(.+)\*\*$/, '$1') })
      i += 1
      continue
    }
    if (TABLE_ROW.test(line) && i + 1 < lines.length && TABLE_SEPARATOR.test(lines[i + 1])) {
      flushParagraph()
      const tableLines = []
      while (i < lines.length && TABLE_ROW.test(lines[i])) tableLines.push(lines[i++])
      blocks.push(parseMarkdownTable(tableLines))
      continue
    }
    if (BULLET.test(line) || ORDERED.test(line)) {
      flushParagraph()
      const ordered = !BULLET.test(line)
      const pattern = ordered ? ORDERED : BULLET
      const items = []
      while (i < lines.length && pattern.test(lines[i])) {
        items.push(lines[i].match(pattern)[1].trim())
        i += 1
      }
      blocks.push({ type: ordered ? 'ol' : 'ul', items })
      continue
    }
    const boldLine = line.trim().match(BOLD_LINE)
    if (boldLine && !paragraph.length) {
      flushParagraph()
      blocks.push({ type: 'h3', text: boldLine[1].trim() })
      i += 1
      continue
    }
    if (QUOTE.test(line)) {
      flushParagraph()
      const quote = []
      while (i < lines.length && QUOTE.test(lines[i])) quote.push(lines[i++].match(QUOTE)[1])
      blocks.push({ type: 'quote', text: quote.join('\n').trim() })
      continue
    }
    paragraph.push(line.trim())
    i += 1
  }
  flushParagraph()
  return blocks
}

/**
 * HTML for one stored paragraph string. `formatInline(escapedText)` receives
 * HTML-escaped text and returns inline HTML (bold, links, highlights…).
 */
export function renderBlogBlocksHtml(text, formatInline = (value) => value) {
  const inline = (value) => formatInline(escapeBlogHtml(value))
  return parseBlogBlock(text).map((block) => {
    switch (block.type) {
      case 'h2':
      case 'h3':
      case 'h4':
        return `<${block.type} id="${slugifyHeading(block.text)}">${inline(block.text)}</${block.type}>`
      case 'ul':
      case 'ol':
        return `<${block.type}>${block.items.map((item) => `<li>${inline(item)}</li>`).join('')}</${block.type}>`
      case 'quote':
        return `<blockquote><p>${inline(block.text).replace(/\n/g, '<br>')}</p></blockquote>`
      case 'table': {
        const head = `<thead><tr>${block.header.map((cell) => `<th scope="col">${inline(cell)}</th>`).join('')}</tr></thead>`
        const body = `<tbody>${block.rows.map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`).join('')}</tbody>`
        return `<div class="nx-table-wrap" role="region" aria-label="Table" tabindex="0"><table>${head}${body}</table></div>`
      }
      default:
        return `<p>${inline(block.text).replace(/\n/g, '<br>')}</p>`
    }
  }).join('')
}

/** Plain words of a block (no Markdown symbols) — for word counts. */
export function blockPlainText(text) {
  return parseBlogBlock(text).map((block) => {
    if (block.type === 'table') return [...block.header, ...block.rows.flat()].join(' ')
    if (block.items) return block.items.join(' ')
    return block.text
  }).join(' ').replace(/[*_=`]/g, '')
}

/**
 * CMS editor text → sections. Lines starting with "## " start a new section
 * (its heading feeds the table of contents); text before the first one goes
 * into an intro section headed `introHeading`. Blocks are split on blank lines.
 */
export function contentToSections(content, introHeading = 'Article guide') {
  const text = String(content ?? '').replace(/\r\n?/g, '\n')
  const sections = []
  let current = { heading: String(introHeading || '').trim() || 'Article guide', lines: [] }
  const push = () => {
    const paragraphs = current.lines.join('\n').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    if (paragraphs.length) sections.push({ heading: current.heading, paragraphs })
  }
  for (const line of text.split('\n')) {
    const match = line.match(/^##\s+(.+?)\s*#*\s*$/)
    if (match && !line.startsWith('###')) {
      push()
      current = { heading: match[1].replace(/^\*\*(.+)\*\*$/, '$1').trim(), lines: [] }
    } else {
      current.lines.push(line)
    }
  }
  push()
  const used = new Map()
  return sections.map((section) => {
    const base = slugifyHeading(section.heading) || 'section'
    const n = (used.get(base) || 0) + 1
    used.set(base, n)
    return { id: n > 1 ? `${base}-${n}` : base, ...section }
  })
}

/** Sections → CMS editor text (inverse of contentToSections). */
export function sectionsToContent(sections = []) {
  return sections.map((section, index) => {
    const body = (section.paragraphs || []).join('\n\n')
    return index === 0 ? body : `## ${section.heading}\n\n${body}`
  }).filter(Boolean).join('\n\n')
}
