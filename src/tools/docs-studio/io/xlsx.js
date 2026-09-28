/**
 * A small XLSX (Office Open XML SpreadsheetML) writer on fflate — just what
 * the document export needs: several sheets, shared strings, real numbers and
 * dates, named cell styles (font, fill, border, alignment, number format),
 * column widths, row heights, merged cells and frozen panes.
 *
 * Output follows ECMA-376 part ordering rules (Excel is strict about element
 * order); it opens in Excel, Google Sheets, LibreOffice and Numbers.
 */

import { strToU8, zipSync } from 'fflate'

const NS_MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
const NS_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const NS_PKG_REL = 'http://schemas.openxmlformats.org/package/2006/relationships'
const REL_TYPE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'

// Characters XML 1.0 does not allow (control chars other than tab/newline/CR, lone surrogates, U+FFFE/F).
// eslint-disable-next-line no-control-regex -- stripping control characters is the point
const INVALID_XML = /[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g

export function xmlEscape(value) {
  return String(value ?? '').replace(INVALID_XML, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** 0 → "A", 25 → "Z", 26 → "AA". */
export function columnName(index) {
  let n = index + 1
  let name = ''
  while (n > 0) {
    const r = (n - 1) % 26
    name = String.fromCharCode(65 + r) + name
    n = Math.floor((n - 1) / 26)
  }
  return name
}

/** "2026-09-27" → Excel serial day number (1900 date system). */
export function excelDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''))
  if (!m) return null
  return (Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) - Date.UTC(1899, 11, 30)) / 86_400_000
}

/** Sheet names: ≤ 31 chars, none of : \ / ? * [ ] */
export function safeSheetName(name) {
  return String(name || 'Sheet').replace(/[:\\/?*[\]]/g, ' ').trim().slice(0, 31) || 'Sheet'
}

const argb = (hex) => `FF${String(hex || '#000000').replace('#', '').toUpperCase()}`

/**
 * Registers named styles and serialises styles.xml.
 * Style: { bold?, italic?, size?, color?, fill?, numFmt?: string | number, halign?, valign?, wrap?, border?: 'bottom' | 'top' | 'box' | 'none', borderColor? }
 */
function buildStyles(named) {
  const numFmts = []
  const fonts = ['<font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font>']
  const fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>']
  const borders = ['<border><left/><right/><top/><bottom/><diagonal/></border>']
  const xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>']
  const index = { default: 0 }
  const intern = (list, xml) => {
    const at = list.indexOf(xml)
    if (at >= 0) return at
    list.push(xml)
    return list.length - 1
  }
  const numFmtId = (fmt) => {
    if (fmt === undefined || fmt === null) return 0
    if (typeof fmt === 'number') return fmt
    const existing = numFmts.find((f) => f.code === fmt)
    if (existing) return existing.id
    const id = 164 + numFmts.length
    numFmts.push({ id, code: fmt })
    return id
  }
  for (const [name, s] of Object.entries(named)) {
    const font = `<font>${s.bold ? '<b/>' : ''}${s.italic ? '<i/>' : ''}<sz val="${s.size || 11}"/>${s.color ? `<color rgb="${argb(s.color)}"/>` : '<color theme="1"/>'}<name val="Calibri"/><family val="2"/></font>`
    const fontId = intern(fonts, font)
    const fillId = s.fill ? intern(fills, `<fill><patternFill patternType="solid"><fgColor rgb="${argb(s.fill)}"/><bgColor indexed="64"/></patternFill></fill>`) : 0
    const line = `style="thin"><color rgb="${argb(s.borderColor || '#D1D5DB')}"/>`
    const side = (on, tag) => (on ? `<${tag} ${line}</${tag}>` : `<${tag}/>`)
    const b = s.border || 'none'
    const borderId = b === 'none' ? 0 : intern(borders, `<border>${side(b === 'box', 'left')}${side(b === 'box', 'right')}${side(b === 'box' || b === 'top', 'top')}${side(b === 'box' || b === 'bottom', 'bottom')}<diagonal/></border>`)
    const fmt = numFmtId(s.numFmt)
    const align = s.halign || s.valign || s.wrap
      ? `<alignment${s.halign ? ` horizontal="${s.halign}"` : ''}${s.valign ? ` vertical="${s.valign}"` : ''}${s.wrap ? ' wrapText="1"' : ''}/>`
      : ''
    const attrs = [`numFmtId="${fmt}"`, `fontId="${fontId}"`, `fillId="${fillId}"`, `borderId="${borderId}"`, 'xfId="0"',
      fmt ? 'applyNumberFormat="1"' : '', fontId ? 'applyFont="1"' : '', fillId ? 'applyFill="1"' : '', borderId ? 'applyBorder="1"' : '', align ? 'applyAlignment="1"' : ''].filter(Boolean).join(' ')
    index[name] = xfs.length
    xfs.push(align ? `<xf ${attrs}>${align}</xf>` : `<xf ${attrs}/>`)
  }
  const xml = `${XML_HEAD}<styleSheet xmlns="${NS_MAIN}">`
    + (numFmts.length ? `<numFmts count="${numFmts.length}">${numFmts.map((f) => `<numFmt numFmtId="${f.id}" formatCode="${xmlEscape(f.code)}"/>`).join('')}</numFmts>` : '')
    + `<fonts count="${fonts.length}">${fonts.join('')}</fonts>`
    + `<fills count="${fills.length}">${fills.join('')}</fills>`
    + `<borders count="${borders.length}">${borders.join('')}</borders>`
    + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    + `<cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs>`
    + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
    + '</styleSheet>'
  return { xml, index }
}

/**
 * @typedef {{ v: string | number | boolean | null, t?: 'n' | 's' | 'b' | 'd', s?: string }} Cell  t 'd': v is an ISO date
 * @typedef {{ name: string, columns?: { width: number }[], rows: (Cell | null)[][], rowHeights?: Record<number, number>, merges?: string[], freezeRows?: number, fitToWidth?: boolean }} Sheet
 *   fitToWidth: print one page wide (portrait)
 * @param {{ sheets: Sheet[], styles?: Record<string, object>, title?: string, creator?: string, created?: Date }} workbook
 * @returns {Uint8Array}
 */
export function buildXlsx({ sheets, styles = {}, title = '', creator = '', created = new Date() }) {
  const { xml: stylesXml, index: styleIndex } = buildStyles(styles)
  const strings = []
  const stringIndex = new Map()
  const sst = (text) => {
    const key = String(text)
    if (!stringIndex.has(key)) {
      stringIndex.set(key, strings.length)
      strings.push(key)
    }
    return stringIndex.get(key)
  }
  let stringRefs = 0

  const sheetXml = (sheet) => {
    const rows = sheet.rows
    const width = Math.max(1, ...rows.map((r) => r.length))
    const dim = `A1:${columnName(width - 1)}${Math.max(rows.length, 1)}`
    const freeze = sheet.freezeRows
      ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${sheet.freezeRows}" topLeftCell="A${sheet.freezeRows + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${sheet.freezeRows + 1}" sqref="A${sheet.freezeRows + 1}"/></sheetView></sheetViews>`
      : '<sheetViews><sheetView workbookViewId="0"/></sheetViews>'
    const cols = sheet.columns?.length
      ? `<cols>${sheet.columns.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.width}" customWidth="1"/>`).join('')}</cols>`
      : ''
    const body = rows.map((row, r) => {
      const ht = sheet.rowHeights?.[r + 1]
      const cells = row.map((cell, c) => {
        if (!cell) return ''
        const ref = `${columnName(c)}${r + 1}`
        const s = cell.s && styleIndex[cell.s] ? ` s="${styleIndex[cell.s]}"` : ''
        const { v } = cell
        if (v === null || v === undefined || v === '') return s ? `<c r="${ref}"${s}/>` : ''
        if (cell.t === 'd') {
          const serial = excelDate(v)
          return serial === null ? `<c r="${ref}"${s}/>` : `<c r="${ref}"${s}><v>${serial}</v></c>`
        }
        if (typeof v === 'number') return Number.isFinite(v) ? `<c r="${ref}"${s}><v>${v}</v></c>` : `<c r="${ref}"${s}/>`
        if (typeof v === 'boolean') return `<c r="${ref}"${s} t="b"><v>${v ? 1 : 0}</v></c>`
        stringRefs++
        return `<c r="${ref}"${s} t="s"><v>${sst(v)}</v></c>`
      }).join('')
      return `<row r="${r + 1}"${ht ? ` ht="${ht}" customHeight="1"` : ''}>${cells}</row>`
    }).join('')
    const merges = sheet.merges?.length ? `<mergeCells count="${sheet.merges.length}">${sheet.merges.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : ''
    // Element order is fixed by the schema: sheetPr, dimension, sheetViews, sheetFormatPr, cols, sheetData, mergeCells, pageMargins, pageSetup.
    const sheetPr = sheet.fitToWidth ? '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>' : ''
    const pageSetup = sheet.fitToWidth ? '<pageSetup orientation="portrait" fitToWidth="1" fitToHeight="0"/>' : ''
    return `${XML_HEAD}<worksheet xmlns="${NS_MAIN}" xmlns:r="${NS_REL}">${sheetPr}<dimension ref="${dim}"/>${freeze}<sheetFormatPr defaultRowHeight="15"/>${cols}<sheetData>${body}</sheetData>${merges}<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>${pageSetup}</worksheet>`
  }

  const names = []
  const files = {}
  sheets.forEach((sheet, i) => {
    let name = safeSheetName(sheet.name)
    while (names.includes(name)) name = safeSheetName(`${name.slice(0, 28)} ${i + 1}`)
    names.push(name)
    files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(sheetXml(sheet))
  })
  const sheetOverrides = sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')
  files['[Content_Types].xml'] = strToU8(`${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheetOverrides}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`)
  files['_rels/.rels'] = strToU8(`${XML_HEAD}<Relationships xmlns="${NS_PKG_REL}"><Relationship Id="rId1" Type="${REL_TYPE}/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="${REL_TYPE}/extended-properties" Target="docProps/app.xml"/></Relationships>`)
  const iso = created.toISOString().replace(/\.\d{3}Z$/, 'Z')
  files['docProps/core.xml'] = strToU8(`${XML_HEAD}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xmlEscape(title)}</dc:title><dc:creator>${xmlEscape(creator)}</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${iso}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${iso}</dcterms:modified></cp:coreProperties>`)
  files['docProps/app.xml'] = strToU8(`${XML_HEAD}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Nexora Docs Studio</Application><DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop><HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant><vt:variant><vt:i4>${names.length}</vt:i4></vt:variant></vt:vector></HeadingPairs><TitlesOfParts><vt:vector size="${names.length}" baseType="lpstr">${names.map((n) => `<vt:lpstr>${xmlEscape(n)}</vt:lpstr>`).join('')}</vt:vector></TitlesOfParts><LinksUpToDate>false</LinksUpToDate><SharedDoc>false</SharedDoc><HyperlinksChanged>false</HyperlinksChanged><AppVersion>16.0300</AppVersion></Properties>`)
  files['xl/workbook.xml'] = strToU8(`${XML_HEAD}<workbook xmlns="${NS_MAIN}" xmlns:r="${NS_REL}"><bookViews><workbookView xWindow="0" yWindow="0" windowWidth="28800" windowHeight="12300"/></bookViews><sheets>${names.map((n, i) => `<sheet name="${xmlEscape(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`)
  files['xl/_rels/workbook.xml.rels'] = strToU8(`${XML_HEAD}<Relationships xmlns="${NS_PKG_REL}">${names.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${REL_TYPE}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${names.length + 1}" Type="${REL_TYPE}/styles" Target="styles.xml"/><Relationship Id="rId${names.length + 2}" Type="${REL_TYPE}/sharedStrings" Target="sharedStrings.xml"/></Relationships>`)
  files['xl/styles.xml'] = strToU8(stylesXml)
  files['xl/sharedStrings.xml'] = strToU8(`${XML_HEAD}<sst xmlns="${NS_MAIN}" count="${stringRefs}" uniqueCount="${strings.length}">${strings.map((t) => `<si><t xml:space="preserve">${xmlEscape(t)}</t></si>`).join('')}</sst>`)
  // [Content_Types].xml first, as Office writes it (some readers sniff it).
  const ordered = { '[Content_Types].xml': files['[Content_Types].xml'] }
  for (const [path, data] of Object.entries(files)) if (path !== '[Content_Types].xml') ordered[path] = data
  return zipSync(ordered, { level: 6 })
}
