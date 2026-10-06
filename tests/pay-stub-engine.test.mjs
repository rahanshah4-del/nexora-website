/**
 * The Pay Stub / Payslip tool (src/tools/pay-stub): exact arithmetic, the
 * layout, and the PDF and Excel files it produces. Runs in Node with jsPDF and
 * the bundled Noto Sans font; no browser needed.
 *
 * Run: npm test   (node --test tests/*.test.mjs)
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { unzipSync, strFromU8 } from 'fflate'
import { jsPDF } from 'jspdf'
import { fontsFromBytes } from '../src/tools/docs-studio/pdf/fonts.js'
import {
  calculatePayStub, createContribution, createDeduction, createEarning, createPayStub, hasErrors,
  normalizeStub, periodForFrequency, samplePayStub, stubFileName,
} from '../src/tools/pay-stub/engine.js'
import { buildStubXlsx, createPdf, stubNeedsComplexScript } from '../src/tools/pay-stub/exporters.js'
import { TEMPLATES, layoutPayStub, layoutToSvg, wrapText } from '../src/tools/pay-stub/layout.js'

const FONT_DIR = new URL('../public/fonts/', import.meta.url)
const fonts = fontsFromBytes(
  new Uint8Array(readFileSync(new URL('NotoSans-Regular.subset.ttf', FONT_DIR))),
  new Uint8Array(readFileSync(new URL('NotoSans-Bold.subset.ttf', FONT_DIR))),
)
// A stand-in for text measuring: every character is half the font size wide.
const measure = (text, size) => text.length * size * 0.1764

function stub(patch = {}) {
  const base = createPayStub({ today: '2026-10-06' })
  return { ...base, currency: 'USD', ...patch }
}

test('gross to net: hourly, overtime multiplier, bonus, percent and fixed deductions are exact', () => {
  const state = stub({
    earnings: [
      createEarning({ label: 'Regular pay', type: 'hourly', hours: '160', rate: '25' }),
      createEarning({ label: 'Overtime', type: 'hourly', hours: '8', rate: '25', multiplier: '1.5' }),
      createEarning({ label: 'Bonus', amount: '200' }),
    ],
    deductions: [
      createDeduction({ label: 'Income tax', mode: 'percent', value: '12' }),
      createDeduction({ label: 'Pension', mode: 'percent', value: '5' }),
      createDeduction({ label: 'Health insurance', value: '150' }),
    ],
  })
  const calc = calculatePayStub(state)
  assert.equal(calc.gross, 450000)
  assert.deepEqual(calc.deductions.map((d) => d.amount), [54000, 22500, 15000])
  assert.equal(calc.totalDeductions, 91500)
  assert.equal(calc.net, 358500)
  assert.equal(calc.netWords, 'Three Thousand Five Hundred Eighty-Five Dollars Only')
  assert.deepEqual(calc.issues, [{ id: 'company', severity: 'warn', message: 'Add the employer or company name.' }, { id: 'employee', severity: 'warn', message: 'Add the employee name.' }])
  assert.equal(calc.earnings[1].detail, '8 hrs × $25.00 × 1.5')
})

test('sums are exact where binary floats are not (0.1 + 0.2, thirds, rounding)', () => {
  const state = stub({
    earnings: [createEarning({ amount: '0.10' }), createEarning({ amount: '0.20' }), createEarning({ amount: '1000.01' })],
    deductions: [createDeduction({ mode: 'percent', value: '33.3333' })],
  })
  const calc = calculatePayStub(state)
  assert.equal(calc.gross, 100031)
  assert.equal(calc.deductions[0].amount, 33344) // 1000.31 × 33.3333% = 333.4403…
  assert.equal(calc.net, calc.gross - calc.totalDeductions)
})

test('zero-decimal and three-decimal currencies use the right minor units', () => {
  const yen = calculatePayStub(stub({ currency: 'JPY', earnings: [createEarning({ amount: '250000' })], deductions: [createDeduction({ mode: 'percent', value: '10.5' })] }))
  assert.equal(yen.gross, 250000)
  assert.equal(yen.totalDeductions, 26250)
  const dinar = calculatePayStub(stub({ currency: 'KWD', earnings: [createEarning({ amount: '1234.567' })] }))
  assert.equal(dinar.gross, 1234567)
})

test('invalid or negative input is reported, blank counts as zero, negative net is an error', () => {
  const bad = calculatePayStub(stub({ earnings: [createEarning({ label: 'Pay', amount: 'abc' })] }))
  assert.ok(hasErrors(bad))
  assert.match(bad.issues.find((i) => i.severity === 'error').message, /Pay: the amount is not valid/)
  const negative = calculatePayStub(stub({ earnings: [createEarning({ amount: '-5' })] }))
  assert.ok(hasErrors(negative))
  const blank = calculatePayStub(stub({ earnings: [createEarning({ amount: '' })], deductions: [] }))
  assert.equal(blank.gross, 0)
  assert.ok(!hasErrors(blank))
  const over = calculatePayStub(stub({ earnings: [createEarning({ amount: '100' })], deductions: [createDeduction({ value: '150' })] }))
  assert.ok(hasErrors(over))
  assert.equal(over.netWords, '')
})

test('year-to-date totals and employer contributions stay separate from net pay', () => {
  const calc = calculatePayStub(stub({
    earnings: [createEarning({ amount: '3000', ytd: '27000' })],
    deductions: [createDeduction({ mode: 'percent', value: '10', ytd: '2700' })],
    employer: [createContribution({ mode: 'percent', value: '4' })],
  }))
  assert.equal(calc.net, 270000)
  assert.deepEqual(calc.ytd, { gross: 2700000, deductions: 270000, net: 2430000, hasYtd: true })
  assert.equal(calc.employerTotal, 12000)
})

test('pay periods follow the frequency', () => {
  assert.deepEqual(periodForFrequency('weekly', '2026-10-05'), { start: '2026-10-05', end: '2026-10-11' })
  assert.deepEqual(periodForFrequency('biweekly', '2026-10-05'), { start: '2026-10-05', end: '2026-10-18' })
  assert.deepEqual(periodForFrequency('semimonthly', '2026-10-06'), { start: '2026-10-01', end: '2026-10-15' })
  assert.deepEqual(periodForFrequency('semimonthly', '2026-10-20'), { start: '2026-10-16', end: '2026-10-31' })
  assert.deepEqual(periodForFrequency('monthly', '2028-02-10'), { start: '2028-02-01', end: '2028-02-29' })
})

test('a saved draft is sanitised: unknown values fall back, text is trimmed to limits, images must be data URLs', () => {
  const restored = normalizeStub({
    docTitle: 'Nonsense', currency: 'dollars', appearance: { template: 'x', accent: 'red', paper: 'Tabloid' },
    company: { name: 'A'.repeat(500), logo: { dataUrl: 'https://evil.example/x.png', width: 10, height: 10 } },
    earnings: [{ label: 'Pay', type: 'weird', amount: '5' }],
  })
  assert.equal(restored.docTitle, 'Pay Stub')
  assert.equal(restored.currency, 'USD')
  assert.deepEqual(restored.appearance, { template: 'modern', accent: '#0071e3', paper: 'A4' })
  assert.equal(restored.company.name.length, 200)
  assert.equal(restored.company.logo, null)
  assert.equal(restored.earnings[0].type, 'fixed')
  assert.deepEqual(normalizeStub(null).options.showWords, true)
})

test('file names are safe and descriptive', () => {
  const state = samplePayStub({ today: '2026-10-06' })
  assert.equal(stubFileName(state, 'pdf'), 'pay-stub-alex-morgan-2026-10-31.pdf')
  assert.equal(stubFileName({ ...state, employee: { ...state.employee, name: 'Zoë / O’Brien' } }, 'xlsx'), 'pay-stub-zoe-o-brien-2026-10-31.xlsx')
})

test('wrapText breaks on words, honours newlines and splits an overlong word', () => {
  assert.deepEqual(wrapText('one two three', 5, 10, false, (t) => t.length), ['one', 'two', 'three'])
  assert.deepEqual(wrapText('a\n\nb', 100, 10, false, measure), ['a', '', 'b'])
  const long = wrapText('x'.repeat(50), 20, 10, false, measure)
  assert.ok(long.length > 1 && long.every((l) => measure(l, 10) <= 20))
})

test('every template lays out inside the page and the SVG is well formed and escaped', () => {
  for (const template of Object.keys(TEMPLATES)) {
    const state = samplePayStub({ today: '2026-10-06' })
    state.appearance.template = template
    state.company.name = 'Fish & <Chips> "Ltd"'
    state.options.showYtd = true
    state.options.showEmployer = true
    const layout = layoutPayStub({ state, calc: calculatePayStub(state), measure })
    assert.ok(layout.height >= 279, template)
    for (const it of layout.items) {
      if (it.type === 'text') {
        assert.ok(it.x >= -0.01 && it.x <= layout.width + 0.01, `${template}: text x ${it.x}`)
        assert.ok(it.y > 0 && it.y <= layout.height, `${template}: text y ${it.y}`)
      }
    }
    const svg = layoutToSvg(layout)
    assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'))
    assert.ok(svg.includes('Fish &amp; &lt;Chips&gt; &quot;Ltd&quot;'), 'text is escaped')
    assert.ok(!/<Chips>/.test(svg))
  }
})

test('a long stub grows the page instead of overflowing it', () => {
  const state = samplePayStub({ today: '2026-10-06' })
  state.earnings = Array.from({ length: 20 }, (_, i) => createEarning({ label: `Shift ${i + 1}`, amount: '100' }))
  state.deductions = Array.from({ length: 20 }, (_, i) => createDeduction({ label: `Item ${i + 1}`, value: '1' }))
  const layout = layoutPayStub({ state, calc: calculatePayStub(state), measure })
  assert.ok(layout.height > 297)
  assert.ok(Math.max(...layout.items.filter((i) => i.type === 'text').map((i) => i.y)) < layout.height)
})

test('PDF: one valid page per template, and complex scripts are sent to the print path', async () => {
  for (const template of Object.keys(TEMPLATES)) {
    const state = samplePayStub({ today: '2026-10-06' })
    state.appearance.template = template
    const result = await createPdf({ state, calc: calculatePayStub(state), fonts, jsPDFClass: jsPDF })
    assert.ok(result.ok, template)
    const bytes = Buffer.from(await result.blob.arrayBuffer())
    assert.equal(bytes.subarray(0, 5).toString(), '%PDF-')
    assert.match(result.fileName, /^pay-stub-alex-morgan-2026-10-31\.pdf$/)
  }
  const arabic = samplePayStub({ today: '2026-10-06' })
  arabic.employee.name = 'محمد أحمد'
  assert.ok(stubNeedsComplexScript(arabic))
  const blocked = await createPdf({ state: arabic, calc: calculatePayStub(arabic), fonts, jsPDFClass: jsPDF })
  assert.deepEqual(blocked, { ok: false, reason: 'complex-script' })
})

test('PDF falls back to Helvetica and currency codes when the Unicode font is missing', async () => {
  const state = samplePayStub({ today: '2026-10-06' })
  state.currency = 'INR'
  const result = await createPdf({ state, calc: calculatePayStub(state), fonts: null, jsPDFClass: jsPDF })
  assert.ok(result.ok)
  assert.equal(result.fontFallback, true)
})

test('Excel: a real workbook with numeric amounts and date cells', () => {
  const state = samplePayStub({ today: '2026-10-06' })
  state.options.showEmployer = true
  const calc = calculatePayStub(state)
  const files = unzipSync(buildStubXlsx(state, calc, new Date('2026-10-06T00:00:00Z')))
  assert.ok(files['xl/worksheets/sheet1.xml'] && files['xl/styles.xml'] && files['[Content_Types].xml'])
  const sheet = strFromU8(files['xl/worksheets/sheet1.xml'])
  assert.ok(sheet.includes('<v>5166</v>'), 'gross pay is the number 5166')
  assert.ok(sheet.includes('<v>3847.49</v>'), 'net pay is the number 3847.49')
  assert.ok(/<v>46\d{3}<\/v>/.test(sheet), 'dates are Excel serial numbers')
  const strings = strFromU8(files['xl/sharedStrings.xml'])
  assert.ok(strings.includes('Alex Morgan') && strings.includes('Three Thousand Eight Hundred Forty-Seven Dollars'))
})
