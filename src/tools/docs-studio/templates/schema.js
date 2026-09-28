/**
 * Template spec schema (v1) and its validator.
 *
 * A template is pure JSON data: colours, font ids from an allowlist, sizes,
 * spacing, enums and flags. It never contains HTML, CSS, URLs or code; the
 * renderers map every enum to their own class names / drawing routines and
 * every number to a unit they append themselves. That is what makes it safe
 * to accept specs from outside the bundle (Step 4: admin-uploaded templates
 * fetched at runtime) — validateTemplateSpec() is the only way in, so it is
 * deliberately strict:
 *
 *   - unknown keys are rejected at every level (no silent pass-through),
 *   - only plain objects / arrays / primitives (no accessors, no prototypes),
 *   - enums and booleans must match exactly, colours must be #rrggbb,
 *   - numbers must be finite and are clamped into their range (a warning),
 *   - the only free text (name, description) is length-limited and may not
 *     contain control characters or angle brackets.
 *
 * Omitted optional keys take the base value (see BASE_SPEC), so a remote spec
 * may be partial; the validated result is always complete and deep-frozen.
 */

export const TEMPLATE_SCHEMA_VERSION = 1

/** Font ids → CSS font stacks. Only these fonts are loaded by the site (Inter, Sora) or are system fonts. */
export const FONT_STACKS = Object.freeze({
  inter: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  sora: "'Sora', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
  system: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  serif: "'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, 'Times New Roman', serif",
  mono: "ui-monospace, 'SF Mono', 'Cascadia Mono', Menlo, Consolas, monospace",
})

export const ENUMS = Object.freeze({
  layout: ['stacked', 'sidebar'],
  font: Object.keys(FONT_STACKS),
  titleCase: ['upper', 'none'],
  labelCase: ['upper', 'none'],
  titleWeight: [500, 600, 700],
  headerStyle: ['band', 'fullBand', 'plain'],
  headerAlign: ['brandLeft', 'titleLeft'],
  titleColor: ['accent', 'text'],
  sidebarFill: ['accent', 'tint'],
  metaStyle: ['inline', 'boxed'],
  tableStyle: ['filled', 'tinted', 'underline', 'lined', 'boxed'],
  density: ['compact', 'normal', 'relaxed'],
  totalsStyle: ['plain', 'boxed'],
  balanceStyle: ['fill', 'text'],
  section: ['header', 'parties', 'meta', 'items', 'summary', 'notes', 'footer'],
})

const HEX = /^#[0-9a-fA-F]{6}$/
const ID = /^[a-z][a-z0-9-]{1,39}$/
// Control characters and angle brackets: plain text only.
// eslint-disable-next-line no-control-regex -- matching control characters is the point
const UNSAFE_TEXT = /[\u0000-\u001f\u007f-\u009f<>]/

// ── Schema description ──────────────────────────────────────────────────────
// Leaf kinds: num(min, max) · enumOf(values) · bool · color · text(max) · id · sections.

const num = (min, max) => ({ kind: 'number', min, max })
const enumOf = (values) => ({ kind: 'enum', values })
const bool = { kind: 'boolean' }
const color = { kind: 'color' }
const text = (max, { required = false } = {}) => ({ kind: 'text', max, required })

export const SCHEMA = Object.freeze({
  schemaVersion: { kind: 'version' },
  id: { kind: 'id' },
  name: text(40, { required: true }),
  description: text(160),
  layout: enumOf(ENUMS.layout),
  defaultAccent: color,
  fonts: { heading: enumOf(ENUMS.font), body: enumOf(ENUMS.font) },
  colors: { text: color, muted: color, faint: color, border: color, surface: color, paper: color },
  typography: {
    basePt: num(7, 12),
    smallPt: num(6, 11),
    labelPt: num(5, 10),
    brandPt: num(9, 28),
    titlePt: num(12, 40),
    numberPt: num(7, 16),
    partyPt: num(7, 14),
    tableHeadPt: num(5, 11),
    totalPt: num(8, 20),
    balancePt: num(8, 20),
    footerPt: num(6, 11),
    lineHeight: num(1.1, 1.8),
    titleWeight: enumOf(ENUMS.titleWeight),
    titleCase: enumOf(ENUMS.titleCase),
    labelCase: enumOf(ENUMS.labelCase),
  },
  page: { marginTopMm: num(6, 40), marginXMm: num(8, 30), marginBottomMm: num(8, 40) },
  spacing: { sectionMm: num(2, 14), columnGapMm: num(3, 20), metaGapMm: num(3, 20) },
  header: {
    style: enumOf(ENUMS.headerStyle),
    align: enumOf(ENUMS.headerAlign),
    bandHeightMm: num(1, 12),
    padTopMm: num(2, 30),
    padBottomMm: num(2, 30),
    logoMaxHeightMm: num(8, 40),
    logoMaxWidthMm: num(20, 90),
    titleColor: enumOf(ENUMS.titleColor),
  },
  sidebar: { widthMm: num(45, 85), fill: enumOf(ENUMS.sidebarFill) },
  meta: { style: enumOf(ENUMS.metaStyle) },
  table: { style: enumOf(ENUMS.tableStyle), zebra: bool, density: enumOf(ENUMS.density) },
  totals: { style: enumOf(ENUMS.totalsStyle), balance: enumOf(ENUMS.balanceStyle), widthMm: num(60, 110) },
  sections: { kind: 'sections' },
  show: { logo: bool, itemNumbers: bool, amountInWords: bool, stamp: bool, notes: bool, terms: bool, footer: bool, pageNumbers: bool },
  stamp: { opacity: num(0.05, 0.4), rotateDeg: num(-45, 45) },
})

/** Every value a spec can hold, with the Classic look. Optional keys fall back to these. */
export const BASE_SPEC = Object.freeze({
  schemaVersion: TEMPLATE_SCHEMA_VERSION,
  id: 'base',
  name: 'Base',
  description: '',
  layout: 'stacked',
  defaultAccent: '#0071e3',
  fonts: { heading: 'inter', body: 'inter' },
  colors: { text: '#0f172a', muted: '#64748b', faint: '#94a3b8', border: '#e2e8f0', surface: '#f8fafc', paper: '#ffffff' },
  typography: {
    basePt: 9.5, smallPt: 8.5, labelPt: 7, brandPt: 15, titlePt: 24, numberPt: 10, partyPt: 10.5, tableHeadPt: 7.5,
    totalPt: 12, balancePt: 11, footerPt: 8, lineHeight: 1.45, titleWeight: 700, titleCase: 'upper', labelCase: 'upper',
  },
  page: { marginTopMm: 14, marginXMm: 16, marginBottomMm: 16 },
  spacing: { sectionMm: 5.5, columnGapMm: 8, metaGapMm: 9 },
  header: { style: 'band', align: 'brandLeft', bandHeightMm: 4, padTopMm: 10, padBottomMm: 7, logoMaxHeightMm: 20, logoMaxWidthMm: 55, titleColor: 'accent' },
  sidebar: { widthMm: 64, fill: 'accent' },
  meta: { style: 'inline' },
  table: { style: 'filled', zebra: true, density: 'normal' },
  totals: { style: 'plain', balance: 'fill', widthMm: 82 },
  sections: ['header', 'parties', 'meta', 'items', 'summary', 'notes', 'footer'],
  show: { logo: true, itemNumbers: true, amountInWords: true, stamp: true, notes: true, terms: true, footer: true, pageNumbers: true },
  stamp: { opacity: 0.13, rotateDeg: -18 },
})

// ── Validation ──────────────────────────────────────────────────────────────

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/** Own, enumerable, string-keyed data properties only (no getters, no symbols). */
function dataEntries(value, path, errors) {
  if (Object.getOwnPropertySymbols(value).length) errors.push(`${path || 'spec'}: symbol keys are not allowed`)
  const entries = []
  for (const key of Object.getOwnPropertyNames(value)) {
    const desc = Object.getOwnPropertyDescriptor(value, key)
    if (!desc || !('value' in desc) || !desc.enumerable) {
      errors.push(`${join(path, key)}: must be a plain data property`)
      continue
    }
    entries.push([key, desc.value])
  }
  return entries
}

const join = (path, key) => (path ? `${path}.${key}` : key)

function checkLeaf(rule, value, path, errors, warnings) {
  switch (rule.kind) {
    case 'number': {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        errors.push(`${path}: must be a finite number`)
        return undefined
      }
      const clamped = Math.min(rule.max, Math.max(rule.min, value))
      if (clamped !== value) warnings.push(`${path}: ${value} clamped to ${clamped} (allowed ${rule.min}–${rule.max})`)
      return Math.round(clamped * 100) / 100
    }
    case 'enum':
      if (!rule.values.includes(value)) {
        errors.push(`${path}: must be one of ${rule.values.map((v) => JSON.stringify(v)).join(', ')}`)
        return undefined
      }
      return value
    case 'boolean':
      if (typeof value !== 'boolean') {
        errors.push(`${path}: must be true or false`)
        return undefined
      }
      return value
    case 'color':
      if (typeof value !== 'string' || !HEX.test(value)) {
        errors.push(`${path}: must be a #rrggbb colour`)
        return undefined
      }
      return value.toLowerCase()
    case 'text':
      if (typeof value !== 'string') {
        errors.push(`${path}: must be a string`)
        return undefined
      }
      if (value.length > rule.max) {
        errors.push(`${path}: at most ${rule.max} characters`)
        return undefined
      }
      if (UNSAFE_TEXT.test(value)) {
        errors.push(`${path}: plain text only (no control characters or < >)`)
        return undefined
      }
      if (rule.required && !value.trim()) {
        errors.push(`${path}: is required`)
        return undefined
      }
      return value.trim()
    case 'id':
      if (typeof value !== 'string' || !ID.test(value)) {
        errors.push(`${path}: 2–40 characters, lowercase letters, digits and "-", starting with a letter`)
        return undefined
      }
      return value
    case 'version':
      if (value !== TEMPLATE_SCHEMA_VERSION) {
        errors.push(`${path}: unsupported schema version (expected ${TEMPLATE_SCHEMA_VERSION})`)
        return undefined
      }
      return value
    case 'sections': {
      if (!Array.isArray(value) || value.length > ENUMS.section.length) {
        errors.push(`${path}: must be an array of at most ${ENUMS.section.length} section ids`)
        return undefined
      }
      const bad = value.filter((s) => !ENUMS.section.includes(s))
      if (bad.length) errors.push(`${path}: unknown section ${bad.map((s) => JSON.stringify(s)).join(', ')}`)
      if (new Set(value).size !== value.length) errors.push(`${path}: sections must not repeat`)
      if (value[0] !== 'header') errors.push(`${path}: must start with "header"`)
      for (const required of ['items', 'summary']) if (!value.includes(required)) errors.push(`${path}: must include "${required}"`)
      return bad.length ? undefined : [...value]
    }
    default:
      errors.push(`${path}: unsupported`)
      return undefined
  }
}

const isLeafRule = (rule) => typeof rule.kind === 'string'

function checkNode(schema, base, value, path, errors, warnings) {
  if (!isPlainObject(value)) {
    errors.push(`${path || 'spec'}: must be an object`)
    return base
  }
  const out = {}
  const seen = new Set()
  for (const [key, child] of dataEntries(value, path, errors)) {
    const childPath = join(path, key)
    if (!Object.prototype.hasOwnProperty.call(schema, key)) {
      errors.push(`${childPath}: unknown key`)
      continue
    }
    seen.add(key)
    const rule = schema[key]
    out[key] = isLeafRule(rule) ? checkLeaf(rule, child, childPath, errors, warnings) : checkNode(rule, base[key], child, childPath, errors, warnings)
  }
  for (const key of Object.keys(schema)) {
    if (seen.has(key)) continue
    const rule = schema[key]
    if (isLeafRule(rule) && (rule.kind === 'id' || rule.kind === 'version' || rule.required)) errors.push(`${join(path, key)}: is required`)
    out[key] = structuredClone(base[key])
  }
  return out
}

function deepFreeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}

/**
 * @param {unknown} input  a template spec (e.g. from JSON.parse)
 * @returns {{ ok: true, spec: object, warnings: string[] } | { ok: false, errors: string[], warnings: string[] }}
 */
export function validateTemplateSpec(input) {
  const errors = []
  const warnings = []
  const spec = checkNode(SCHEMA, BASE_SPEC, input, '', errors, warnings)
  if (errors.length) return { ok: false, errors, warnings }
  return { ok: true, spec: deepFreeze(spec), warnings }
}

export const MAX_TEMPLATE_JSON_BYTES = 16 * 1024

/** JSON text (e.g. fetched from the Control Center) → validated spec. Never throws. */
export function parseTemplateSpec(jsonText) {
  if (typeof jsonText !== 'string') return { ok: false, errors: ['spec: expected JSON text'], warnings: [] }
  if (new TextEncoder().encode(jsonText).length > MAX_TEMPLATE_JSON_BYTES) {
    return { ok: false, errors: [`spec: larger than ${MAX_TEMPLATE_JSON_BYTES / 1024} KB`], warnings: [] }
  }
  let parsed
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    return { ok: false, errors: ['spec: not valid JSON'], warnings: [] }
  }
  return validateTemplateSpec(parsed)
}
