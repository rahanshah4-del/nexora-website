import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BUILTIN_SPECS } from '../src/tools/docs-studio/templates/builtin.js'
import { getTemplate, hasTemplate, listTemplates, registerTemplate, unregisterTemplate } from '../src/tools/docs-studio/templates/registry.js'
import { BASE_SPEC, FONT_STACKS, MAX_TEMPLATE_JSON_BYTES, parseTemplateSpec, validateTemplateSpec } from '../src/tools/docs-studio/templates/schema.js'
import { cssVarsForPage, fitColumns, PAPERS, resolveLayout, resolvePageLayout, COLUMNS } from '../src/tools/docs-studio/templates/specs.js'

const valid = (overrides = {}) => ({ schemaVersion: 1, id: 'acme-blue', name: 'Acme blue', ...overrides })

test('the four built-ins are pure JSON data and validate cleanly', () => {
  assert.deepEqual(listTemplates().map((t) => t.id), ['classic', 'modern', 'minimal', 'corporate'])
  for (const spec of BUILTIN_SPECS) {
    assert.deepEqual(JSON.parse(JSON.stringify(spec)), spec, `${spec.id} survives a JSON round trip`)
    const result = validateTemplateSpec(spec)
    assert.equal(result.ok, true, `${spec.id}: ${result.errors?.join('; ')}`)
    assert.deepEqual(result.warnings, [], `${spec.id} needs no clamping`)
    // No functions, HTML or CSS anywhere: every string is an id, enum, hex colour or plain text.
    const strings = JSON.stringify(result.spec).match(/"(?:[^"\\]|\\.)*"/g).map((s) => JSON.parse(s))
    for (const s of strings) assert.doesNotMatch(s, /[<>{};()]|url|expression|javascript:/i, `${spec.id}: "${s}"`)
  }
  assert.deepEqual(new Set(listTemplates().map((t) => t.layout)), new Set(['stacked', 'sidebar']))
  assert.equal(getTemplate('corporate').header.style, 'fullBand')
  assert.equal(getTemplate('minimal').header.style, 'plain')
})

test('validator: a partial spec is completed from the base and deep-frozen', () => {
  const result = validateTemplateSpec(valid({ colors: { text: '#112233' } }))
  assert.equal(result.ok, true)
  assert.equal(result.spec.colors.text, '#112233')
  assert.equal(result.spec.colors.muted, BASE_SPEC.colors.muted)
  assert.deepEqual(result.spec.sections, BASE_SPEC.sections)
  assert.ok(Object.isFrozen(result.spec) && Object.isFrozen(result.spec.colors) && Object.isFrozen(result.spec.sections))
  assert.equal(validateTemplateSpec(valid({ defaultAccent: '#ABCDEF' })).spec.defaultAccent, '#abcdef')
})

test('validator: unknown keys are rejected at every level', () => {
  for (const bad of [
    valid({ css: 'body{}' }),
    valid({ colors: { text: '#000000', background: '#ffffff' } }),
    valid({ header: { style: 'band', html: '<b>x</b>' } }),
    valid({ show: { logo: true, script: true } }),
    JSON.parse('{"schemaVersion":1,"id":"x-y","name":"X","__proto__":{"polluted":true}}'),
    JSON.parse('{"schemaVersion":1,"id":"x-y","name":"X","colors":{"constructor":"#000000"}}'),
  ]) {
    const result = validateTemplateSpec(bad)
    assert.equal(result.ok, false, JSON.stringify(bad))
    assert.ok(result.errors.some((e) => /unknown key/.test(e)), result.errors.join('; '))
  }
  assert.equal({}.polluted, undefined)
})

test('validator: enums, booleans and types are checked exactly', () => {
  const cases = [
    [valid({ layout: 'grid' }), /layout: must be one of/],
    [valid({ header: { style: 'BAND' } }), /header.style/],
    [valid({ table: { style: 'filled', zebra: 'yes' } }), /table.zebra: must be true or false/],
    [valid({ fonts: { heading: 'Comic Sans MS', body: 'inter' } }), /fonts.heading/],
    [valid({ typography: { titleWeight: 900 } }), /titleWeight/],
    [valid({ typography: { basePt: '12' } }), /basePt: must be a finite number/],
    [valid({ typography: { basePt: Number.NaN } }), /finite number/],
    [valid({ sections: ['header', 'items', 'items', 'summary'] }), /must not repeat/],
    [valid({ sections: ['items', 'header', 'summary'] }), /must start with "header"/],
    [valid({ sections: ['header', 'items'] }), /must include "summary"/],
    [valid({ sections: ['header', 'items', 'summary', 'ads'] }), /unknown section/],
    [valid({ schemaVersion: 2 }), /schema version/],
    [{ id: 'abc', name: 'A' }, /schemaVersion: is required/],
    [valid({ id: 'Bad Id' }), /id:/],
    [valid({ name: '' }), /name: is required/],
    [valid({ name: '<img src=x onerror=alert(1)>' }), /plain text only/],
    [valid({ description: 'line\u0000break' }), /plain text only/],
    [valid({ description: 'x'.repeat(161) }), /at most 160/],
    [valid({ colors: [] }), /colors: must be an object/],
    ['not an object', /must be an object/],
    [null, /must be an object/],
  ]
  for (const [spec, pattern] of cases) {
    const result = validateTemplateSpec(spec)
    assert.equal(result.ok, false, JSON.stringify(spec))
    assert.ok(result.errors.some((e) => pattern.test(e)), `${JSON.stringify(spec)} → ${result.errors.join('; ')}`)
  }
})

test('validator: colours must be #rrggbb — no CSS can be smuggled in', () => {
  for (const color of ['red', '#fff', '#12345g', '#123456; background:url(//evil)', 'rgb(0,0,0)', 'expression(alert(1))', '#1234567', ' #123456']) {
    const result = validateTemplateSpec(valid({ colors: { text: color } }))
    assert.equal(result.ok, false, color)
    assert.ok(result.errors.some((e) => /colors.text: must be a #rrggbb colour/.test(e)))
  }
})

test('validator: numbers are clamped into range with a warning', () => {
  const result = validateTemplateSpec(valid({ typography: { titlePt: 400, basePt: 1 }, stamp: { opacity: 5, rotateDeg: -90 } }))
  assert.equal(result.ok, true)
  assert.equal(result.spec.typography.titlePt, 40)
  assert.equal(result.spec.typography.basePt, 7)
  assert.equal(result.spec.stamp.opacity, 0.4)
  assert.equal(result.spec.stamp.rotateDeg, -45)
  assert.equal(result.warnings.length, 4)
})

test('validator: only plain data objects (no accessors, class instances or symbols)', () => {
  const withGetter = valid()
  Object.defineProperty(withGetter, 'layout', { enumerable: true, get: () => 'stacked' })
  assert.equal(validateTemplateSpec(withGetter).ok, false)
  class Spec { constructor() { Object.assign(this, valid()) } }
  assert.equal(validateTemplateSpec(new Spec()).ok, false)
  assert.equal(validateTemplateSpec({ ...valid(), [Symbol('x')]: 1 }).ok, false)
  assert.equal(validateTemplateSpec(valid({ layout: () => 'stacked' })).ok, false)
})

test('parseTemplateSpec: JSON text with a size cap', () => {
  assert.equal(parseTemplateSpec(JSON.stringify(valid())).ok, true)
  assert.equal(parseTemplateSpec('{not json').ok, false)
  assert.equal(parseTemplateSpec(JSON.stringify(valid({ description: 'x' })) + ' '.repeat(MAX_TEMPLATE_JSON_BYTES)).ok, false)
  assert.equal(parseTemplateSpec({}).ok, false)
})

test('registry: register / get / list; built-ins cannot be replaced; unknown ids fall back to Classic', () => {
  const added = registerTemplate(valid({ id: 'test-remote', name: 'Remote one', layout: 'sidebar' }))
  assert.equal(added.ok, true)
  assert.equal(hasTemplate('test-remote'), true)
  assert.equal(getTemplate('test-remote').layout, 'sidebar')
  assert.ok(listTemplates().some((t) => t.id === 'test-remote'))
  const hijack = registerTemplate(valid({ id: 'classic', name: 'Evil classic' }))
  assert.equal(hijack.ok, false)
  assert.equal(getTemplate('classic').name, 'Classic')
  assert.equal(registerTemplate(valid({ id: 'broken', name: 'Broken', colors: { text: 'red' } })).ok, false)
  assert.equal(hasTemplate('broken'), false)
  assert.equal(unregisterTemplate('classic'), false)
  assert.equal(unregisterTemplate('test-remote'), true)
  assert.equal(getTemplate('nope').id, 'classic')
  assert.equal(getTemplate(undefined).id, 'classic')
})

test('resolved layout: CSS variables are only units, hex colours and allowlisted font stacks', () => {
  for (const t of listTemplates()) {
    const { spec, paper } = resolveLayout({ templateId: t.id, appearance: { paperSize: 'A4' } })
    for (const [name, value] of Object.entries(cssVarsForPage(spec, paper, '#0071e3'))) {
      const ok = /^-?\d+(\.\d+)?(mm|pt|deg|%)?$/.test(value) || /^#[0-9a-f]{6}$/.test(value) || Object.values(FONT_STACKS).includes(value)
      assert.ok(ok, `${t.id} ${name}: ${value}`)
    }
  }
})

test('letterhead variant: stacked, no band, safe-area margins, business block optional', () => {
  const letterhead = { imageAssetId: 'a', pdfAssetId: '', topMm: 50, bottomMm: 30, leftMm: 20, rightMm: 15, hideBusinessHeader: true, pages: 'all' }
  for (const t of listTemplates()) {
    const spec = resolvePageLayout(t, { paper: PAPERS.A4, letterhead })
    assert.equal(spec.layout, 'stacked', t.id)
    assert.equal(spec.header.htmlStyle, 'plain', t.id)
    assert.equal(spec.header.showBrand, false)
    assert.deepEqual([spec.marginTopMm, spec.marginBottomMm, spec.marginLeftMm, spec.marginRightMm], [50, 30, 20, 15])
    assert.equal(spec.show.pageNumbers, false)
    assert.equal(spec.table.style, t.table.style, 'keeps the table style')
  }
  assert.equal(resolvePageLayout(getTemplate('classic'), { letterhead: { ...letterhead, hideBusinessHeader: false } }).header.showBrand, true)
})

test('fitColumns: narrow areas move the unit into qty and keep ≥ 40 mm for the description', () => {
  assert.deepEqual(fitColumns(COLUMNS, 178).columns, COLUMNS)
  const narrow = fitColumns(COLUMNS, 120)
  assert.equal(narrow.unitInQty, true)
  assert.ok(!narrow.columns.some((c) => c.key === 'unit'))
  const fixed = narrow.columns.reduce((sum, c) => sum + (c.widthMm || 0), 0)
  assert.ok(120 - fixed >= 39.9, `description gets ${120 - fixed} mm`)
})
