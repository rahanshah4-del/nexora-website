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

// ── Second set: twenty designs that differ in layout, type, colour and table style ──
const P = (text, muted, faint, border, surface, paper = '#ffffff') => ({ text, muted, faint, border, surface, paper })
const H = (style, align, o = {}) => ({ style, align, bandHeightMm: 4, padTopMm: 10, padBottomMm: 7, logoMaxHeightMm: 18, logoMaxWidthMm: 50, titleColor: 'text', ...o })
const S = (id, name, description, o) => ({ schemaVersion: 1, layout: 'stacked', id, name, description, ...o })

export const MORE_SPECS = [
  S('swiss', 'Swiss', 'Large uppercase title, strict grid and a single red accent.', { defaultAccent: '#dc2626', fonts: { heading: 'inter', body: 'inter' }, colors: P('#0a0a0a', '#525252', '#a3a3a3', '#d4d4d4', '#f5f5f5'), typography: T({ titlePt: 34, titleCase: 'upper', titleWeight: 700 }), page: { marginTopMm: 22, marginXMm: 22, marginBottomMm: 18 }, header: H('plain', 'titleLeft', { titleColor: 'accent', padTopMm: 2, padBottomMm: 9 }), table: { style: 'lined', zebra: false, density: 'normal' }, totals: { style: 'plain', balance: 'text', widthMm: 78 } }),
  S('noir', 'Noir', 'Black header band, typewriter body on warm paper.', { defaultAccent: '#111111', fonts: { heading: 'mono', body: 'mono' }, colors: P('#1a1a1a', '#555555', '#999999', '#cfc9bd', '#f1ede4', '#fbfaf7'), typography: T({ basePt: 8.5, smallPt: 7.5, titlePt: 20, titleCase: 'upper' }), header: H('fullBand', 'brandLeft', { padTopMm: 12, padBottomMm: 10 }), meta: { style: 'boxed' }, table: { style: 'boxed', zebra: false, density: 'normal' }, totals: { style: 'boxed', balance: 'fill', widthMm: 84 } }),
  S('ocean', 'Ocean', 'Light blue side column and airy rows.', { layout: 'sidebar', defaultAccent: '#0369a1', fonts: { heading: 'sora', body: 'inter' }, colors: P('#0c1a2b', '#4b6076', '#94a3b8', '#d6e4ef', '#eef6fb'), typography: T({ titlePt: 30 }), page: { marginTopMm: 16, marginXMm: 12, marginBottomMm: 16 }, header: H('plain', 'titleLeft', { titleColor: 'accent', padTopMm: 16 }), sidebar: { widthMm: 60, fill: 'tint' }, table: { style: 'underline', zebra: false, density: 'relaxed' }, totals: { style: 'plain', balance: 'fill', widthMm: 76 } }),
  S('sunset', 'Sunset', 'Warm orange band, serif headings and zebra rows.', { defaultAccent: '#ea580c', fonts: { heading: 'serif', body: 'inter' }, colors: P('#2a1708', '#7c5a3a', '#b79f88', '#f0dccb', '#fff4ea'), typography: T({ titlePt: 28, titleWeight: 600 }), header: H('band', 'brandLeft', { bandHeightMm: 8, titleColor: 'accent' }), table: { style: 'filled', zebra: true, density: 'normal' }, totals: { style: 'plain', balance: 'fill', widthMm: 82 } }),
  S('forest', 'Forest', 'Deep green side column with a serif title.', { layout: 'sidebar', defaultAccent: '#166534', fonts: { heading: 'serif', body: 'inter' }, typography: T({ titlePt: 30, titleWeight: 500 }), page: { marginTopMm: 16, marginXMm: 12, marginBottomMm: 16 }, header: H('plain', 'titleLeft', { padTopMm: 16 }), sidebar: { widthMm: 66, fill: 'accent' }, table: { style: 'lined', zebra: false, density: 'normal' }, totals: { style: 'plain', balance: 'text', widthMm: 76 } }),
  S('royal', 'Royal', 'Purple band, boxed details and a formal totals box.', { defaultAccent: '#5b21b6', fonts: { heading: 'serif', body: 'inter' }, colors: P('#1e1b2e', '#5b5675', '#a39fb8', '#ddd6f0', '#f5f2fc'), typography: T({ titleCase: 'upper', titleWeight: 600 }), header: H('fullBand', 'brandLeft', { padTopMm: 13, padBottomMm: 12 }), meta: { style: 'boxed' }, table: { style: 'tinted', zebra: false, density: 'normal' }, totals: { style: 'boxed', balance: 'fill', widthMm: 86 } }),
  S('mono-tech', 'Mono Tech', 'Monospace everywhere, boxed grid, uppercase labels.', { defaultAccent: '#0ea5e9', fonts: { heading: 'mono', body: 'mono' }, colors: P('#0f172a', '#475569', '#94a3b8', '#cbd5e1', '#f1f5f9'), typography: T({ basePt: 8.5, smallPt: 7.5, titlePt: 22, titleCase: 'upper' }), page: { marginTopMm: 12, marginXMm: 12, marginBottomMm: 14 }, header: H('plain', 'brandLeft', { titleColor: 'accent' }), meta: { style: 'boxed' }, table: { style: 'boxed', zebra: false, density: 'compact' }, totals: { style: 'boxed', balance: 'text', widthMm: 80 } }),
  S('paper-cream', 'Paper Cream', 'Cream paper, all serif, brown hairlines. Feels handwritten.', { defaultAccent: '#92400e', fonts: { heading: 'serif', body: 'serif' }, colors: P('#2b2118', '#6f5e4b', '#a8957f', '#e3d5bd', '#f6eedd', '#fdf8ee'), typography: T({ titlePt: 28, titleWeight: 500 }), page: { marginTopMm: 18, marginXMm: 20, marginBottomMm: 18 }, header: H('plain', 'titleLeft', { titleColor: 'accent', padTopMm: 2, padBottomMm: 8 }), table: { style: 'lined', zebra: false, density: 'relaxed' }, totals: { style: 'plain', balance: 'text', widthMm: 80 } }),
  S('blush', 'Blush', 'Soft pink paper with a thick band and rounded Sora type.', { defaultAccent: '#db2777', fonts: { heading: 'sora', body: 'sora' }, colors: P('#3b1224', '#8a5568', '#c9a3b2', '#f5d3de', '#ffe9ef', '#fff8fa'), typography: T({ titlePt: 26, titleWeight: 600 }), header: H('band', 'titleLeft', { bandHeightMm: 7, titleColor: 'accent' }), table: { style: 'tinted', zebra: true, density: 'relaxed' }, totals: { style: 'plain', balance: 'fill', widthMm: 82 } }),
  S('slate-pro', 'Slate Pro', 'Narrow dark sidebar and a dense boxed table.', { layout: 'sidebar', defaultAccent: '#0f172a', fonts: { heading: 'inter', body: 'inter' }, typography: T({ basePt: 9, smallPt: 8, titlePt: 24, titleCase: 'upper' }), page: { marginTopMm: 14, marginXMm: 10, marginBottomMm: 14 }, header: H('plain', 'titleLeft', { padTopMm: 12 }), sidebar: { widthMm: 48, fill: 'accent' }, table: { style: 'boxed', zebra: false, density: 'compact' }, totals: { style: 'boxed', balance: 'fill', widthMm: 74 } }),
  S('mint', 'Mint', 'Fresh green tints on near-white paper.', { defaultAccent: '#059669', fonts: { heading: 'sora', body: 'inter' }, colors: P('#0b2a20', '#4a6b5f', '#9bb8ad', '#cfeadd', '#ecfdf5', '#fbfffd'), typography: T({ titlePt: 26 }), header: H('band', 'brandLeft', { bandHeightMm: 6, titleColor: 'accent' }), table: { style: 'tinted', zebra: false, density: 'relaxed' }, totals: { style: 'plain', balance: 'fill', widthMm: 80 } }),
  S('amber-line', 'Amber Line', 'Underlined rows, serif title and generous margins.', { defaultAccent: '#b45309', fonts: { heading: 'serif', body: 'inter' }, typography: T({ titlePt: 27, titleWeight: 600 }), page: { marginTopMm: 20, marginXMm: 22, marginBottomMm: 20 }, header: H('plain', 'brandLeft', { titleColor: 'accent', padTopMm: 2, padBottomMm: 8 }), table: { style: 'underline', zebra: false, density: 'relaxed' }, totals: { style: 'plain', balance: 'text', widthMm: 78 } }),
  S('steel', 'Steel', 'Grey full-width band, system font, zebra table.', { defaultAccent: '#475569', fonts: { heading: 'system', body: 'system' }, colors: P('#111827', '#4b5563', '#9ca3af', '#d1d5db', '#eef0f3'), typography: T({ titleCase: 'upper' }), header: H('fullBand', 'brandLeft', { padTopMm: 11, padBottomMm: 10 }), meta: { style: 'boxed' }, table: { style: 'filled', zebra: true, density: 'normal' }, totals: { style: 'boxed', balance: 'fill', widthMm: 84 } }),
  S('crimson', 'Crimson', 'Red band, serif title and a boxed total.', { defaultAccent: '#b91c1c', fonts: { heading: 'serif', body: 'inter' }, typography: T({ titlePt: 28, titleWeight: 700 }), header: H('band', 'titleLeft', { bandHeightMm: 5, titleColor: 'accent' }), table: { style: 'filled', zebra: false, density: 'normal' }, totals: { style: 'boxed', balance: 'fill', widthMm: 84 } }),
  S('indigo-night', 'Indigo Night', 'Deep indigo side column, light tinted table.', { layout: 'sidebar', defaultAccent: '#312e81', fonts: { heading: 'sora', body: 'inter' }, typography: T({ titlePt: 28 }), page: { marginTopMm: 16, marginXMm: 12, marginBottomMm: 16 }, header: H('plain', 'titleLeft', { titleColor: 'accent', padTopMm: 16 }), sidebar: { widthMm: 62, fill: 'accent' }, table: { style: 'tinted', zebra: false, density: 'normal' }, totals: { style: 'plain', balance: 'fill', widthMm: 76 } }),
  S('large-print', 'Large Print', 'Bigger type and roomy rows. Easy to read.', { defaultAccent: '#1d4ed8', typography: T({ basePt: 11, smallPt: 9.5, labelPt: 8, brandPt: 17, titlePt: 28, numberPt: 11.5, partyPt: 12, tableHeadPt: 9, totalPt: 14, balancePt: 13, footerPt: 9 }), page: { marginTopMm: 16, marginXMm: 16, marginBottomMm: 16 }, header: H('plain', 'brandLeft', { titleColor: 'accent', padTopMm: 2 }), table: { style: 'lined', zebra: false, density: 'relaxed' }, totals: { style: 'plain', balance: 'fill', widthMm: 88 } }),
  S('dense', 'Dense', 'Small type and tight boxes for long item lists.', { defaultAccent: '#7c3aed', typography: T({ basePt: 8, smallPt: 7, labelPt: 6, brandPt: 12, titlePt: 18, numberPt: 8.5, partyPt: 9, tableHeadPt: 6.5, totalPt: 10.5, balancePt: 10, footerPt: 7, lineHeight: 1.3 }), page: { marginTopMm: 8, marginXMm: 10, marginBottomMm: 10 }, spacing: { sectionMm: 3.5, columnGapMm: 5, metaGapMm: 5 }, header: H('band', 'brandLeft', { bandHeightMm: 3, padTopMm: 6, padBottomMm: 4, logoMaxHeightMm: 12, logoMaxWidthMm: 36, titleColor: 'accent' }), table: { style: 'boxed', zebra: true, density: 'compact' }, totals: { style: 'boxed', balance: 'text', widthMm: 72 } }),
  S('gazette', 'Gazette', 'Newspaper look: big serif caps, boxed details, ivory paper.', { defaultAccent: '#1f2937', fonts: { heading: 'serif', body: 'serif' }, colors: P('#161616', '#505050', '#8f8f8f', '#cfcabd', '#f1eee4', '#fffdf7'), typography: T({ titlePt: 32, titleCase: 'upper', titleWeight: 700, brandPt: 16 }), page: { marginTopMm: 14, marginXMm: 16, marginBottomMm: 16 }, header: H('plain', 'brandLeft', { padTopMm: 2, padBottomMm: 8 }), meta: { style: 'boxed' }, table: { style: 'lined', zebra: false, density: 'normal' }, totals: { style: 'boxed', balance: 'text', widthMm: 82 } }),
  S('pastel-side', 'Pastel Side', 'Slim lilac side column on cream paper.', { layout: 'sidebar', defaultAccent: '#a855f7', fonts: { heading: 'sora', body: 'inter' }, colors: P('#2a1636', '#6e5a80', '#b5a3c4', '#e6d9f1', '#f6effc', '#fffefb'), typography: T({ titlePt: 27 }), page: { marginTopMm: 16, marginXMm: 12, marginBottomMm: 16 }, header: H('plain', 'titleLeft', { titleColor: 'accent', padTopMm: 16 }), sidebar: { widthMm: 50, fill: 'tint' }, table: { style: 'underline', zebra: false, density: 'normal' }, totals: { style: 'plain', balance: 'fill', widthMm: 76 } }),
  S('teal-band', 'Teal Band', 'Full teal band, tinted rows and boxed details.', { defaultAccent: '#0d9488', fonts: { heading: 'inter', body: 'inter' }, colors: P('#0a2624', '#456b67', '#98b9b5', '#cfe6e3', '#ecf8f6'), typography: T({ titleCase: 'upper', titleWeight: 600 }), header: H('fullBand', 'titleLeft', { padTopMm: 12, padBottomMm: 11 }), meta: { style: 'boxed' }, table: { style: 'tinted', zebra: true, density: 'normal' }, totals: { style: 'plain', balance: 'fill', widthMm: 82 } }),
]

export const BUILTIN_SPECS = [CLASSIC_SPEC, MODERN_SPEC, MINIMAL_SPEC, CORPORATE_SPEC, ELEGANT_SPEC, BOLD_SPEC, COMPACT_SPEC, LEDGER_SPEC, SIDEBAR_TINT_SPEC, EXECUTIVE_SPEC, FRESH_SPEC, SIMPLE_SPEC, ...MORE_SPECS]
