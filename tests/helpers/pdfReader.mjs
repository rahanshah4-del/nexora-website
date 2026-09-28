/**
 * Minimal reader for the uncompressed PDFs jsPDF writes in tests
 * (compress: false): pages, page sizes, decoded text per page (through each
 * font's ToUnicode CMap, so custom-font text is checked as a viewer would
 * extract it), fonts, images and the /Info dictionary. Not a general parser.
 */

const PT_TO_MM = 25.4 / 72

function objects(pdf) {
  const map = new Map()
  for (const m of pdf.matchAll(/(\d+) 0 obj([\s\S]*?)endobj/g)) map.set(Number(m[1]), m[2])
  return map
}

function streamOf(body) {
  const m = /stream\r?\n([\s\S]*?)\r?\nendstream/.exec(body || '')
  return m ? m[1] : ''
}

function unescapeLiteral(s) {
  return s.replace(/\\([nrtbf()\\]|[0-7]{1,3})/g, (_, e) => {
    const simple = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '(': '(', ')': ')', '\\': '\\' }
    return simple[e] ?? String.fromCharCode(parseInt(e, 8))
  })
}

/** Literal PDF string → JS string (handles the UTF-16BE BOM form). */
export function decodePdfString(raw) {
  const s = unescapeLiteral(raw)
  if (s.charCodeAt(0) === 0xfe && s.charCodeAt(1) === 0xff) {
    let out = ''
    for (let i = 2; i + 1 < s.length; i += 2) out += String.fromCharCode((s.charCodeAt(i) << 8) | s.charCodeAt(i + 1))
    return out
  }
  return s
}

function parseToUnicode(cmap) {
  const map = new Map()
  for (const block of cmap.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const m of block[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) map.set(parseInt(m[1], 16), hexToText(m[2]))
  }
  for (const block of cmap.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const m of block[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) {
      const [lo, hi, dst] = [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]
      for (let g = lo; g <= hi; g++) map.set(g, String.fromCodePoint(dst + (g - lo)))
    }
  }
  return map
}

function hexToText(hex) {
  let out = ''
  for (let i = 0; i < hex.length; i += 4) out += String.fromCharCode(parseInt(hex.slice(i, i + 4), 16))
  return out
}

/**
 * @param {string | ArrayBuffer} input  jsPDF output ('string' or 'arraybuffer')
 */
export function readPdf(input) {
  const pdf = typeof input === 'string' ? input : Buffer.from(input).toString('latin1')
  const objs = objects(pdf)

  // Font resource names → { baseFont, cmap }
  const fonts = new Map()
  for (const body of objs.values()) {
    const dict = /\/Font\s*<<([\s\S]*?)>>/.exec(body)
    if (!dict || !/\/ProcSet/.test(body)) continue
    for (const m of dict[1].matchAll(/\/(\w+)\s+(\d+) 0 R/g)) {
      const fontObj = objs.get(Number(m[2])) || ''
      const toUni = /\/ToUnicode (\d+) 0 R/.exec(fontObj)
      fonts.set(m[1], {
        baseFont: (/\/BaseFont\s*\/([^\s/>]+)/.exec(fontObj) || [])[1] || '',
        cmap: toUni ? parseToUnicode(streamOf(objs.get(Number(toUni[1])))) : null,
      })
    }
  }

  const pages = []
  for (const body of objs.values()) {
    if (!/\/Type\s*\/Page\b(?!s)/.test(body)) continue
    const box = /\/MediaBox\s*\[\s*([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s*\]/.exec(body)
    const contents = /\/Contents (\d+) 0 R/.exec(body)
    const content = contents ? streamOf(objs.get(Number(contents[1]))) : ''
    let font = null
    const parts = []
    const decodeHex = (hex) => {
      const cmap = font?.cmap
      let out = ''
      for (let i = 0; i < hex.length; i += 4) {
        const g = parseInt(hex.slice(i, i + 4), 16)
        out += cmap?.get(g) ?? '�'
      }
      return out
    }
    for (const m of content.matchAll(/\/(\w+)\s+[\d.]+\s+Tf|<([0-9A-Fa-f]*)>\s*Tj|\(((?:\\.|[^\\)])*)\)\s*Tj|\[([^\]]*)\]\s*TJ|(\bET\b)/g)) {
      if (m[1]) font = fonts.get(m[1]) || null
      else if (m[2] !== undefined) parts.push(decodeHex(m[2]))
      else if (m[3] !== undefined) parts.push(unescapeLiteral(m[3]))
      else if (m[4] !== undefined) {
        for (const piece of m[4].matchAll(/<([0-9A-Fa-f]*)>|\(((?:\\.|[^\\)])*)\)/g)) parts.push(piece[1] !== undefined ? decodeHex(piece[1]) : unescapeLiteral(piece[2]))
      } else if (m[5]) parts.push('\n')
    }
    pages.push({
      widthMm: box ? (Number(box[3]) - Number(box[1])) * PT_TO_MM : 0,
      heightMm: box ? (Number(box[4]) - Number(box[2])) * PT_TO_MM : 0,
      // One entry per text-show operator (i.e. per drawn line), newline-separated.
      text: parts.join('\n').replace(/\n{2,}/g, '\n'),
      content,
    })
  }

  const info = {}
  const infoRef = /\/Info (\d+) 0 R/.exec(pdf)
  const infoBody = infoRef ? objs.get(Number(infoRef[1])) || '' : ''
  for (const m of infoBody.matchAll(/\/(\w+)\s*\(((?:\\.|[^\\)])*)\)/g)) info[m[1]] = decodePdfString(m[2])

  return {
    pageCount: pages.length,
    pages,
    text: pages.map((p) => p.text).join('\n'),
    fonts: [...fonts.values()].map((f) => f.baseFont),
    imageCount: [...objs.values()].filter((b) => /\/Subtype\s*\/Image/.test(b)).length,
    info,
  }
}
