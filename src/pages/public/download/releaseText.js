/** Display helpers for the release card on /download/restaurant-pos. */

/** "September 25, 2026" from an ISO timestamp; '' when invalid. */
export function formatReleaseDate(iso) {
  const date = new Date(iso)
  if (!iso || Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

/**
 * Release notes are plain text. Consecutive lines starting with "- " become a
 * bullet list; other lines stay paragraphs (line breaks preserved).
 * Returns [{ type: 'text', text } | { type: 'list', items: [...] }].
 */
export function splitNotes(notes) {
  const blocks = []
  const lines = String(notes || '').replace(/\r\n?/g, '\n').split('\n')
  let paragraph = []
  const flushParagraph = () => {
    const text = paragraph.join('\n').trim()
    if (text) blocks.push({ type: 'text', text })
    paragraph = []
  }
  for (const line of lines) {
    const bullet = /^\s*-\s+(.*)$/.exec(line)
    if (bullet) {
      flushParagraph()
      const last = blocks[blocks.length - 1]
      if (last?.type === 'list') last.items.push(bullet[1].trim())
      else blocks.push({ type: 'list', items: [bullet[1].trim()] })
    } else if (!line.trim()) {
      flushParagraph()
    } else {
      paragraph.push(line)
    }
  }
  flushParagraph()
  return blocks
}

export function isSha256(value) {
  return typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value)
}
