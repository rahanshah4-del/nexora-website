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

const T = (o) => ({
  basePt: 9.5, smallPt: 8.5, labelPt: 7, brandPt: 15, titlePt: 24, numberPt: 10, partyPt: 10.5, tableHeadPt: 7.5,
  totalPt: 12.5, balancePt: 11.5, footerPt: 8, lineHeight: 1.45, titleWeight: 700, titleCase: 'none', labelCase: 'upper', ...o,
})

export const ELEGANT_SPEC = {
  schemaVersion: 1, id: 'elegant', name: 'Elegant', description: 'Serif headings, gold-toned rules and a calm, premium feel.',
  layout: 'stacked', defaultAccent: '#9a7b2f', fonts: { heading: 'serif', body: 'serif' },
  colors: { text: '#26211a', muted: '#6f6658', faint: '#a79d8c', border: '#e4dccb', surface: '#faf7f0', paper: '#ffffff' },
  typography: T({ titlePt: 30, titleWeight: 500, brandPt: 16 }),
  page: { marginTopMm: 18, marginXMm: 20, marginBottomMm: 18 },
  header: { style: 'plain', align: 'titleLeft', bandHeightMm: 4, padTopMm: 2, padBottomMm: 8, logoMaxHeightMm: 18, logoMaxWidthMm: 50, titleColor: 'accent' },
  table: { style: 'lined', zebra: false, density: 'relaxed' }, totals: { style: 'plain', balance: 'text', widthMm: 80 },
}

export const BOLD_SPEC = {
  schemaVersion: 1, id: 'bold', name: 'Bold', description: 'A big colour header band with large white title type.',
  layout: 'stacked', defaultAccent: '#e11d48', fonts: { heading: 'sora', body: 'inter' },
  typography: T({ titlePt: 26, titleCase: 'upper', brandPt: 15 }),
  page: { marginTopMm: 6, marginXMm: 15, marginBottomMm: 16 },
  header: { style: 'fullBand', align: 'brandLeft', bandHeightMm: 4, padTopMm: 14, padBottomMm: 12, logoMaxHeightMm: 20, logoMaxWidthMm: 55, titleColor: 'text' },
  table: { style: 'filled', zebra: true, density: 'normal' }, totals: { style: 'plain', balance: 'fill', widthMm: 82 },
}

export const COMPACT_SPEC = {
  schemaVersion: 1, id: 'compact', name: 'Compact', description: 'Tight spacing so long item lists fit on fewer pages.',
  layout: 'stacked', defaultAccent: '#0f766e',
  typography: T({ basePt: 8.5, smallPt: 7.5, labelPt: 6.5, brandPt: 13, titlePt: 20, numberPt: 9, partyPt: 9.5, tableHeadPt: 7, totalPt: 11, balancePt: 10.5, footerPt: 7.5, lineHeight: 1.35 }),
  page: { marginTopMm: 10, marginXMm: 12, marginBottomMm: 12 }, spacing: { sectionMm: 4, columnGapMm: 6, metaGapMm: 6 },
  header: { style: 'band', align: 'brandLeft', bandHeightMm: 3, padTopMm: 7, padBottomMm: 5, logoMaxHeightMm: 14, logoMaxWidthMm: 42, titleColor: 'accent' },
  table: { style: 'tinted', zebra: false, density: 'compact' }, totals: { style: 'plain', balance: 'fill', widthMm: 76 },
}

export const LEDGER_SPEC = {
  schemaVersion: 1, id: 'ledger', name: 'Ledger', description: 'Everything boxed in fine lines, like an accounting ledger.',
  layout: 'stacked', defaultAccent: '#334155', fonts: { heading: 'inter', body: 'mono' },
  colors: { text: '#111827', muted: '#4b5563', faint: '#9ca3af', border: '#9ca3af', surface: '#f3f4f6', paper: '#ffffff' },
  typography: T({ basePt: 8.5, smallPt: 7.5, titlePt: 20, titleCase: 'upper' }),
  page: { marginTopMm: 14, marginXMm: 14, marginBottomMm: 16 },
  header: { style: 'plain', align: 'brandLeft', bandHeightMm: 4, padTopMm: 2, padBottomMm: 6, logoMaxHeightMm: 16, logoMaxWidthMm: 48, titleColor: 'text' },
  meta: { style: 'boxed' }, table: { style: 'boxed', zebra: false, density: 'normal' }, totals: { style: 'boxed', balance: 'text', widthMm: 84 },
}

export const SIDEBAR_TINT_SPEC = {
  schemaVersion: 1, id: 'soft-side', name: 'Soft Sidebar', description: 'A light tinted side column with your details.',
  layout: 'sidebar', defaultAccent: '#0891b2', fonts: { heading: 'sora', body: 'inter' },
  typography: T({ titlePt: 28, brandPt: 14 }),
  page: { marginTopMm: 16, marginXMm: 12, marginBottomMm: 16 }, spacing: { sectionMm: 6, columnGapMm: 8, metaGapMm: 9 },
  header: { style: 'plain', align: 'titleLeft', bandHeightMm: 4, padTopMm: 18, padBottomMm: 6, logoMaxHeightMm: 18, logoMaxWidthMm: 46, titleColor: 'accent' },
  sidebar: { widthMm: 56, fill: 'tint' }, table: { style: 'underline', zebra: false, density: 'relaxed' }, totals: { style: 'plain', balance: 'fill', widthMm: 76 },
}

export const EXECUTIVE_SPEC = {
  schemaVersion: 1, id: 'executive', name: 'Executive', description: 'Dark navy band, serif title and a formal boxed total.',
  layout: 'stacked', defaultAccent: '#14213d', fonts: { heading: 'serif', body: 'inter' },
  typography: T({ titlePt: 24, titleCase: 'upper', brandPt: 17 }),
  page: { marginTopMm: 12, marginXMm: 18, marginBottomMm: 18 },
  header: { style: 'fullBand', align: 'brandLeft', bandHeightMm: 4, padTopMm: 12, padBottomMm: 11, logoMaxHeightMm: 18, logoMaxWidthMm: 55, titleColor: 'text' },
  meta: { style: 'boxed' }, table: { style: 'underline', zebra: false, density: 'normal' }, totals: { style: 'boxed', balance: 'fill', widthMm: 86 },
}

export const FRESH_SPEC = {
  schemaVersion: 1, id: 'fresh', name: 'Fresh', description: 'Friendly rounded type with a green accent and tinted rows.',
  layout: 'stacked', defaultAccent: '#16a34a', fonts: { heading: 'sora', body: 'sora' },
  typography: T({ titlePt: 26, titleWeight: 600 }),
  header: { style: 'band', align: 'titleLeft', bandHeightMm: 5, padTopMm: 10, padBottomMm: 7, logoMaxHeightMm: 20, logoMaxWidthMm: 55, titleColor: 'accent' },
  table: { style: 'tinted', zebra: true, density: 'relaxed' }, totals: { style: 'plain', balance: 'fill', widthMm: 82 },
}

export const SIMPLE_SPEC = {
  schemaVersion: 1, id: 'simple', name: 'Simple', description: 'Plain black and white, ideal for photocopies and fax.',
  layout: 'stacked', defaultAccent: '#111111',
  colors: { text: '#000000', muted: '#444444', faint: '#888888', border: '#bbbbbb', surface: '#f2f2f2', paper: '#ffffff' },
  typography: T({ titleCase: 'upper' }),
  header: { style: 'plain', align: 'brandLeft', bandHeightMm: 4, padTopMm: 2, padBottomMm: 7, logoMaxHeightMm: 18, logoMaxWidthMm: 50, titleColor: 'text' },
  table: { style: 'lined', zebra: false, density: 'normal' }, totals: { style: 'plain', balance: 'text', widthMm: 80 },
}

export const BUILTIN_SPECS = [CLASSIC_SPEC, MODERN_SPEC, MINIMAL_SPEC, CORPORATE_SPEC, ELEGANT_SPEC, BOLD_SPEC, COMPACT_SPEC, LEDGER_SPEC, SIDEBAR_TINT_SPEC, EXECUTIVE_SPEC, FRESH_SPEC, SIMPLE_SPEC]
