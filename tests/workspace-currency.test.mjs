import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import {
  currencyForCountry,
  currencyOptionCodes,
  currencySymbol,
  formatMoney,
  formatMoneyPdf,
  formatMoneyPlain,
  getActiveCurrencyCode,
  normalizeCurrencyCode,
  pdfSafeText,
  resolveWorkspaceCurrency,
  sanitizeCurrencySymbol,
  setActiveCurrency,
} from '../src/crm/lib/workspaceCurrency.js'
import { formatCurrency } from '../src/crm/utils/format.js'
import { formatTransportCurrency, formatTransportSignedCurrency } from '../src/crm/lib/transportCalculations.js'
import { formatRestaurantCurrency } from '../src/crm/lib/restaurantPosCalculations.js'
import { amountInWords } from '../src/crm/lib/invoiceHelpers.js'
import { buildReportThermalText } from '../src/crm/lib/printerService.js'
import { buildSalesHubReport } from '../src/crm/lib/salesHubReports.js'
import { buildSchoolReport } from '../src/crm/lib/schoolReports.js'
import { supportedCurrencyCodes } from '../src/crm/data/currency.js'

// Intl separates an ISO code from the digits with a no-break space.
const plain = (text) => text.replace(/\u00A0/g, ' ')

beforeEach(() => {
  setActiveCurrency({ code: 'PKR', symbol: '' })
})

test('PKR workspaces keep the exact output they had before', () => {
  assert.equal(plain(formatCurrency(1234567)), 'PKR 1,234,567')
  assert.equal(formatTransportCurrency(1234567), formatMoney(1234567))
  assert.equal(plain(formatTransportCurrency(1234567)), 'PKR 1,234,567')
  assert.equal(plain(formatTransportSignedCurrency(-1500)), '-PKR 1,500')
  assert.equal(plain(formatRestaurantCurrency(450.4)), 'PKR 450')
  assert.equal(amountInWords(1200), 'One Thousand Two Hundred Rupees Only')
})

test('India: INR uses ₹ and lakh/crore grouping everywhere', () => {
  setActiveCurrency({ code: 'INR' })
  assert.equal(getActiveCurrencyCode(), 'INR')
  assert.equal(formatCurrency(12345678), '₹1,23,45,678')
  assert.equal(formatTransportCurrency(250000), '₹2,50,000')
  assert.equal(formatTransportSignedCurrency(-250000), '-₹2,50,000')
  assert.equal(formatRestaurantCurrency(123456), '₹1,23,456')
  assert.equal(formatMoneyPlain(123456), 'INR 1,23,456')
  assert.equal(currencySymbol(), '₹')
  assert.equal(amountInWords(500), 'Five Hundred Rupees Only')
})

test('custom symbol from Settings is applied to the workspace currency only', () => {
  setActiveCurrency({ code: 'INR', symbol: 'Rs.' })
  assert.equal(formatCurrency(123456), 'Rs. 1,23,456')
  assert.equal(formatCurrency(-50), '-Rs. 50')
  assert.equal(formatMoneyPlain(99), 'Rs. 99')
  assert.equal(currencySymbol(), 'Rs.')
  // A document stored in another currency keeps its own formatting.
  assert.equal(formatCurrency(10, 'USD'), '$10')

  setActiveCurrency({ code: 'INR', symbol: '₹' })
  assert.equal(formatCurrency(1500.5, undefined, { maximumFractionDigits: 2 }), '₹1,500.50')
})

test('symbols are sanitized before they reach receipts, HTML and PDFs', () => {
  assert.equal(sanitizeCurrencySymbol('<b>Rs</b>'), 'bRs/b')
  assert.equal(sanitizeCurrencySymbol('  ₹  '), '₹')
  assert.equal(sanitizeCurrencySymbol('a"b\'c`d&e\\f'), 'abcdef')
  assert.equal(sanitizeCurrencySymbol('ABCDEFGHIJKL'), 'ABCDEFGH')
  assert.equal(sanitizeCurrencySymbol(42), '')
  setActiveCurrency({ code: 'PKR', symbol: '<script>' })
  assert.ok(!formatCurrency(1).includes('<'))
})

test('invalid codes fall back to the workspace currency, never crash', () => {
  setActiveCurrency({ code: 'INR' })
  assert.equal(normalizeCurrencyCode('inr'), 'INR')
  assert.equal(normalizeCurrencyCode('rupees', 'PKR'), 'PKR')
  assert.equal(formatCurrency(10, 'not-a-code'), '₹10')
  assert.equal(formatCurrency('1,000'), '₹1,000')
  assert.equal(formatCurrency(undefined), '₹0')
  setActiveCurrency({ code: 'b@d' })
  assert.equal(getActiveCurrencyCode(), 'PKR')
})

test('setup wizard: picking a country pre-selects its currency', () => {
  assert.equal(currencyForCountry('India'), 'INR')
  assert.equal(currencyForCountry('Pakistan'), 'PKR')
  assert.equal(currencyForCountry('Bangladesh'), 'BDT')
  assert.equal(currencyForCountry('Middle East'), 'AED')
  assert.equal(currencyForCountry('Europe'), 'EUR')
  assert.equal(currencyForCountry('Atlantis', 'USD'), 'USD')
  for (const code of ['PKR', 'INR', 'BDT', 'AED', 'SAR', 'USD', 'EUR', 'GBP']) {
    assert.ok(supportedCurrencyCodes.includes(code), `${code} is selectable`)
  }
})

test('workspace currency resolution order', () => {
  const settings = { currency: 'AED', currencySymbol: 'Dhs' }
  const workspaceDoc = { currency: 'INR' }
  const userDoc = { currency: 'BDT' }
  const cached = { currency: 'USD' }
  assert.deepEqual(resolveWorkspaceCurrency({ savedBusinessSettings: settings, workspaceDoc, userDoc, cached }), { code: 'AED', symbol: 'Dhs' })
  assert.deepEqual(resolveWorkspaceCurrency({ savedBusinessSettings: null, workspaceDoc, userDoc, cached }), { code: 'INR', symbol: '' })
  assert.deepEqual(resolveWorkspaceCurrency({ workspaceDoc: {}, userDoc, cached }), { code: 'BDT', symbol: '' })
  assert.deepEqual(resolveWorkspaceCurrency({ cached }), { code: 'USD', symbol: '' })
  assert.deepEqual(resolveWorkspaceCurrency({}), { code: 'PKR', symbol: '' })
  // Garbage in Firestore never wins over a valid lower-priority source.
  assert.deepEqual(resolveWorkspaceCurrency({ savedBusinessSettings: { currency: '₹' }, workspaceDoc }), { code: 'INR', symbol: '' })
})

test('record currency dropdowns start with the workspace currency and keep old values', () => {
  setActiveCurrency({ code: 'INR' })
  const options = currencyOptionCodes('')
  assert.equal(options[0], 'INR')
  assert.equal(new Set(options).size, options.length)
  assert.equal(currencyOptionCodes('XAF')[0], 'XAF')
})

test('thermal receipt and report text use the workspace currency', () => {
  setActiveCurrency({ code: 'INR' })
  const text = buildReportThermalText({ report: { title: 'Sales', amountKey: 'amount', calculatedTotal: 150000, rows: [] } })
  assert.match(text, /INR 1,50,000/)
  assert.doesNotMatch(text, /PKR/)

  setActiveCurrency({ code: 'INR', symbol: 'Rs' })
  assert.match(buildReportThermalText({ report: { amountKey: 'amount', calculatedTotal: 900, rows: [] } }), /Rs 900/)
})

test('module reports default to the workspace currency', () => {
  setActiveCurrency({ code: 'INR' })
  const sales = buildSalesHubReport('invoices', { invoices: [], payments: [], expenses: [], deals: [], tasks: [], leads: [], customers: [], products: [], quotes: [] })
  assert.equal(sales.currency, 'INR')
  const school = buildSchoolReport('fee_collection', { fees: [], payments: [], students: [], filters: {} })
  assert.equal(school.currency, 'INR')
  assert.ok(school.summary.every((item) => !String(item.value).includes('PKR')))
})

test('PDF output never contains glyphs Helvetica cannot draw', () => {
  setActiveCurrency({ code: 'INR' })
  assert.equal(formatMoneyPdf(123456), 'INR 1,23,456')
  assert.equal(pdfSafeText('Total: ₹1,23,456'), 'Total: INR 1,23,456')
  setActiveCurrency({ code: 'INR', symbol: 'Rs.' })
  assert.equal(formatMoneyPdf(-500), '-Rs. 500')
  setActiveCurrency({ code: 'BDT', symbol: '৳' })
  assert.equal(formatMoneyPdf(1000), 'BDT 1,000')
  assert.equal(pdfSafeText('৳1,000'), 'BDT 1,000')
  // Unchanged where the glyph is printable.
  setActiveCurrency({ code: 'USD' })
  assert.equal(formatMoneyPdf(2500), '$2,500')
  setActiveCurrency({ code: 'PKR' })
  assert.equal(formatMoneyPdf(2500), 'PKR 2,500')
})

// Guard: a hardcoded PKR fallback anywhere in the CRM would silently show the
// wrong currency to non-Pakistani workspaces again.
test('no hardcoded PKR fallbacks in CRM source', () => {
  const allowed = new Set([
    'src/crm/data/currency.js',
    'src/crm/lib/workspaceCurrency.js',
    'src/crm/hooks/useBusinessSettings.js', // default shape; real value is resolved
    'src/crm/context/PreferencesContext.jsx', // device cache default
    'src/crm/components/onboarding/OnboardingWizard.jsx', // wizard's own default
    // Nexora's own subscription / WhatsApp pricing is billed in PKR.
    'src/crm/data/moduleAccess.js',
    'src/crm/hooks/useSubscriptions.js',
    'src/crm/pages/AdminUpgradeRequests.jsx',
    'src/crm/components/subscriptions/PlanCards.jsx',
    'src/crm/components/whatsapp/WhatsappConnectPricing.jsx',
    'src/crm/lib/whatsappPricing.js',
  ])
  const offenders = []
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) walk(path)
      else if (/\.(jsx?|mjs)$/.test(name) && !allowed.has(path)) {
        readFileSync(path, 'utf8').split('\n').forEach((line, index) => {
          if (/'PKR'|"PKR"|`PKR|PKR \$\{|PKR \{|\bRs \{|\bRs \$\{/.test(line) && !/^\s*\/\//.test(line) && !line.includes('// Nexora subscription billing')) {
            offenders.push(`${path}:${index + 1}: ${line.trim().slice(0, 100)}`)
          }
        })
      }
    }
  }
  walk('src/crm')
  assert.deepEqual(offenders, [])
})
