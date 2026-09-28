/**
 * The four built-in page templates, as plain JSON-serializable data (the same
 * shape an admin-uploaded template will have; see schema.js). Omitted keys
 * take BASE_SPEC values. Registered by registry.js through
 * validateTemplateSpec, exactly like a remote spec.
 */

export const CLASSIC_SPEC = {
  schemaVersion: 1,
  id: 'classic',
  name: 'Classic',
  description: 'A thin accent band, a filled table header and clear totals.',
  layout: 'stacked',
  defaultAccent: '#0071e3',
  header: { style: 'band', align: 'brandLeft', bandHeightMm: 4, padTopMm: 10, padBottomMm: 7, logoMaxHeightMm: 20, logoMaxWidthMm: 55, titleColor: 'accent' },
  table: { style: 'filled', zebra: true, density: 'normal' },
  totals: { style: 'plain', balance: 'fill', widthMm: 82 },
}

export const MODERN_SPEC = {
  schemaVersion: 1,
  id: 'modern',
  name: 'Modern',
  description: 'An accent side column with your details and bold type.',
  layout: 'sidebar',
  defaultAccent: '#4f46e5',
  fonts: { heading: 'sora', body: 'inter' },
  typography: {
    basePt: 9.5, smallPt: 8.5, labelPt: 7, brandPt: 14, titlePt: 32, numberPt: 10.5, partyPt: 10.5, tableHeadPt: 7.5,
    totalPt: 13, balancePt: 12, footerPt: 8, lineHeight: 1.5, titleWeight: 700, titleCase: 'none', labelCase: 'upper',
  },
  page: { marginTopMm: 16, marginXMm: 12, marginBottomMm: 16 },
  spacing: { sectionMm: 6, columnGapMm: 8, metaGapMm: 9 },
  header: { style: 'plain', align: 'titleLeft', bandHeightMm: 4, padTopMm: 18, padBottomMm: 6, logoMaxHeightMm: 18, logoMaxWidthMm: 46, titleColor: 'text' },
  sidebar: { widthMm: 58, fill: 'accent' },
  table: { style: 'underline', zebra: false, density: 'relaxed' },
  totals: { style: 'plain', balance: 'fill', widthMm: 76 },
  show: { logo: true, itemNumbers: false, amountInWords: true, stamp: true, notes: true, terms: true, footer: true, pageNumbers: true },
}

export const MINIMAL_SPEC = {
  schemaVersion: 1,
  id: 'minimal',
  name: 'Minimal',
  description: 'No colour blocks: elegant type, hairlines and generous space.',
  layout: 'stacked',
  defaultAccent: '#334155',
  fonts: { heading: 'serif', body: 'inter' },
  colors: { text: '#1c1917', muted: '#78716c', faint: '#a8a29e', border: '#e7e5e4', surface: '#fafaf9', paper: '#ffffff' },
  typography: {
    basePt: 9.5, smallPt: 8.5, labelPt: 6.5, brandPt: 15, titlePt: 28, numberPt: 9.5, partyPt: 10.5, tableHeadPt: 7,
    totalPt: 13, balancePt: 12, footerPt: 8, lineHeight: 1.5, titleWeight: 500, titleCase: 'none', labelCase: 'upper',
  },
  page: { marginTopMm: 20, marginXMm: 20, marginBottomMm: 18 },
  spacing: { sectionMm: 6.5, columnGapMm: 12, metaGapMm: 12 },
  header: { style: 'plain', align: 'titleLeft', bandHeightMm: 4, padTopMm: 2, padBottomMm: 8, logoMaxHeightMm: 16, logoMaxWidthMm: 50, titleColor: 'text' },
  table: { style: 'lined', zebra: false, density: 'normal' },
  totals: { style: 'plain', balance: 'text', widthMm: 80 },
  stamp: { opacity: 0.1, rotateDeg: -14 },
}

export const CORPORATE_SPEC = {
  schemaVersion: 1,
  id: 'corporate',
  name: 'Corporate',
  description: 'A full-width header band, boxed details and a formal totals box.',
  layout: 'stacked',
  defaultAccent: '#1e3a5f',
  colors: { text: '#111827', muted: '#4b5563', faint: '#9ca3af', border: '#d1d5db', surface: '#f3f4f6', paper: '#ffffff' },
  typography: {
    basePt: 9.5, smallPt: 8.5, labelPt: 7, brandPt: 16, titlePt: 22, numberPt: 10, partyPt: 10.5, tableHeadPt: 7.5,
    totalPt: 12, balancePt: 11.5, footerPt: 8, lineHeight: 1.45, titleWeight: 700, titleCase: 'upper', labelCase: 'upper',
  },
  page: { marginTopMm: 14, marginXMm: 16, marginBottomMm: 18 },
  spacing: { sectionMm: 6, columnGapMm: 8, metaGapMm: 8 },
  header: { style: 'fullBand', align: 'brandLeft', bandHeightMm: 4, padTopMm: 12, padBottomMm: 11, logoMaxHeightMm: 18, logoMaxWidthMm: 55, titleColor: 'text' },
  meta: { style: 'boxed' },
  table: { style: 'boxed', zebra: false, density: 'normal' },
  totals: { style: 'boxed', balance: 'fill', widthMm: 86 },
}

export const BUILTIN_SPECS = [CLASSIC_SPEC, MODERN_SPEC, MINIMAL_SPEC, CORPORATE_SPEC]
