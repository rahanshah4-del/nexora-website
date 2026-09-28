/**
 * Helvetica fallback: jsPDF's built-in fonts only encode WinAnsi (CP1252).
 * When the Unicode font cannot be loaded, every string is passed through
 * toWinAnsi() and amounts use ISO codes ("INR 1,234.56") instead of symbols.
 */

// CP1252 characters outside Latin-1.
const CP1252_EXTRA = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ')

const REPLACEMENTS = {
  '\u202f': ' ', // narrow no-break space (fr-FR grouping)
  '\u2009': ' ', // thin space
  '\u2007': ' ', // figure space
  '\u2212': '-', // minus sign
  '\u2010': '-',
  '\u2011': '-',
  '\u2012': '-',
  '\u2032': "'",
  '\u2033': '"',
  '\u00a0': ' ',
}

export function isWinAnsi(ch) {
  const code = ch.codePointAt(0)
  return ch === '\n' || (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || CP1252_EXTRA.has(ch)
}

/** Replaces what WinAnsi cannot encode ("?" as the last resort). */
export function toWinAnsi(text) {
  let out = ''
  for (const ch of String(text ?? '').normalize('NFC')) {
    const mapped = REPLACEMENTS[ch] ?? ch
    if (isWinAnsi(mapped)) out += mapped
    else {
      const base = mapped.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      out += base && [...base].every(isWinAnsi) ? base : '?'
    }
  }
  return out
}
