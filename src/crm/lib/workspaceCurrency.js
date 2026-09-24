// Single source of truth for the currency a workspace runs in.
//
// The workspace currency is chosen in the setup wizard and can be changed later
// in Settings (currency code + optional custom symbol). DashboardLayout resolves
// it from Firestore and publishes it here with setActiveCurrency(); every
// formatter, report, PDF and receipt reads it through getActiveCurrencyCode() /
// formatMoney() instead of hardcoding PKR.
import { currencyCatalog, supportedCurrencyCodes } from '../data/currency.js'

export const DEFAULT_CURRENCY = 'PKR'
export const MAX_CURRENCY_SYMBOL_LENGTH = 8
// Currencies whose amounts are spoken as "Rupees" and commonly written "Rs".
export const RUPEE_CURRENCIES = ['PKR', 'INR', 'LKR', 'NPR']

const catalogByCode = new Map(currencyCatalog.map((item) => [item.code, item]))

// Indian users expect lakh/crore grouping (₹1,23,456); everything else keeps the
// en-US formatting the app has always used.
const localeByCurrency = { INR: 'en-IN' }

export function normalizeCurrencyCode(value, fallback = '') {
  const code = typeof value === 'string' ? value.trim().toUpperCase() : ''
  return /^[A-Z]{3}$/.test(code) ? code : fallback
}

// Symbols end up in printable HTML, thermal receipts and PDFs, so only allow
// plain text: no markup characters, no control characters, bounded length.
export function sanitizeCurrencySymbol(value) {
  if (typeof value !== 'string') return ''
  return Array.from(
    value
      .replace(/[<>&"'`\\]/g, '')
      .replace(/\p{Cc}/gu, '')
      .replace(/\s+/g, ' ')
      .trim(),
  )
    .slice(0, MAX_CURRENCY_SYMBOL_LENGTH)
    .join('')
    .trim()
}

export function currencyInfo(code) {
  return catalogByCode.get(normalizeCurrencyCode(code)) || null
}

export function defaultSymbolForCurrency(code) {
  const normalized = normalizeCurrencyCode(code, DEFAULT_CURRENCY)
  return catalogByCode.get(normalized)?.symbol || normalized
}

export function localeForCurrency(code) {
  return localeByCurrency[normalizeCurrencyCode(code)] || 'en-US'
}

export function currencyForCountry(country, fallback = DEFAULT_CURRENCY) {
  const needle = typeof country === 'string' ? country.trim().toLowerCase() : ''
  if (!needle) return fallback
  const match = currencyCatalog.find((item) => item.countries.some((name) => name.toLowerCase() === needle))
  return match ? match.code : fallback
}

export function normalizeCurrencySettings(input = {}) {
  const source = typeof input === 'string' ? { code: input } : input || {}
  return {
    code: normalizeCurrencyCode(source.code ?? source.currency, DEFAULT_CURRENCY),
    symbol: sanitizeCurrencySymbol(source.symbol ?? source.currencySymbol ?? ''),
  }
}

function pickCurrencySource(source) {
  if (!source || typeof source !== 'object') return null
  const code = normalizeCurrencyCode(source.currency)
  if (!code) return null
  return { code, symbol: sanitizeCurrencySymbol(source.currencySymbol || '') }
}

// Resolution order (first one that has a currency wins):
//   1. businessSettings saved in Settings (only when the doc really stores one)
//   2. the workspace document (written by the setup wizard and Settings; every
//      staff member can read it, unlike businessSettings)
//   3. the owner's user profile (legacy setup-wizard location)
//   4. the last currency cached on this device
//   5. PKR
export function resolveWorkspaceCurrency({ savedBusinessSettings, workspaceDoc, userDoc, cached } = {}) {
  return (
    pickCurrencySource(savedBusinessSettings) ||
    pickCurrencySource(workspaceDoc) ||
    pickCurrencySource(userDoc) ||
    pickCurrencySource(cached) ||
    { code: DEFAULT_CURRENCY, symbol: '' }
  )
}

// ---------------------------------------------------------------------------
// Active workspace currency (module-level so plain JS helpers can read it)
// ---------------------------------------------------------------------------

// Written by DashboardLayout (useWorkspaceCurrencySync) while it renders, before
// any page renders. Pages are remounted when it changes, so reading it during
// render is always current.
let activeCurrency = { code: DEFAULT_CURRENCY, symbol: '' }

export function getActiveCurrency() {
  return activeCurrency
}

export function getActiveCurrencyCode() {
  return activeCurrency.code
}

export function setActiveCurrency(next) {
  const normalized = normalizeCurrencySettings(next)
  if (normalized.code === activeCurrency.code && normalized.symbol === activeCurrency.symbol) return false
  activeCurrency = normalized
  return true
}

// Custom symbol applies to the workspace currency only. Documents stored in a
// different currency (e.g. a USD invoice) keep their own ISO formatting.
function customSymbolFor(code) {
  return code === activeCurrency.code ? activeCurrency.symbol : ''
}

function toAmount(value) {
  const numeric = typeof value === 'string' ? Number(value.replace(/[,\s]/g, '')) : Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function symbolNeedsSpace(symbol) {
  return /[\p{L}\p{N}.]$/u.test(symbol)
}

function joinWithSymbol(parts, symbol) {
  let out = ''
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index]
    if (part.type === 'currency') {
      out += symbol
      const next = parts[index + 1]
      if (next && next.type === 'literal' && /^\s+$/.test(next.value)) index += 1
      const following = parts[index + 1]
      if (following && following.type !== 'literal' && symbolNeedsSpace(symbol)) out += ' '
      continue
    }
    if (part.type === 'literal' && /^\s+$/.test(part.value) && parts[index + 1]?.type === 'currency') {
      out += ' '
      continue
    }
    out += part.value
  }
  return out
}

export function formatMoney(value, currency, options = {}) {
  const amount = toAmount(value)
  const code = normalizeCurrencyCode(currency, activeCurrency.code)
  const maximumFractionDigits =
    typeof options.maximumFractionDigits === 'number' ? options.maximumFractionDigits : 0
  const minimumFractionDigits =
    typeof options.minimumFractionDigits === 'number'
      ? Math.min(options.minimumFractionDigits, maximumFractionDigits)
      : undefined
  const symbol = typeof options.symbol === 'string' ? sanitizeCurrencySymbol(options.symbol) : customSymbolFor(code)
  const locale = options.locale || localeForCurrency(code)
  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      maximumFractionDigits,
      ...(minimumFractionDigits !== undefined ? { minimumFractionDigits } : {}),
    })
    return symbol ? joinWithSymbol(formatter.formatToParts(amount), symbol) : formatter.format(amount)
  } catch {
    const label = symbol || code
    return `${amount < 0 ? '-' : ''}${label} ${Math.abs(amount).toFixed(maximumFractionDigits)}`
  }
}

// What Intl prints for a currency on its own (₹, $, PKR, AED ...).
export function intlCurrencySymbol(currency) {
  const code = normalizeCurrencyCode(currency, activeCurrency.code)
  try {
    const parts = new Intl.NumberFormat(localeForCurrency(code), { style: 'currency', currency: code }).formatToParts(0)
    return parts.find((part) => part.type === 'currency')?.value || code
  } catch {
    return code
  }
}

// The symbol shown next to amounts: the custom workspace symbol when set,
// otherwise the Intl symbol.
export function currencySymbol(currency) {
  const code = normalizeCurrencyCode(currency, activeCurrency.code)
  return customSymbolFor(code) || intlCurrencySymbol(code)
}

// Label for plain-text output (thermal receipts, AI prompts, notifications):
// the custom symbol when one is set, otherwise the ISO code, which every
// thermal printer code page can print.
export function currencyTextLabel(currency) {
  const code = normalizeCurrencyCode(currency, activeCurrency.code)
  return customSymbolFor(code) || code
}

// "INR 1,23,456" / "Rs 1,200" — plain-text money without Intl currency glyphs.
export function formatMoneyPlain(value, currency, options = {}) {
  const amount = toAmount(value)
  const code = normalizeCurrencyCode(currency, activeCurrency.code)
  const maximumFractionDigits =
    typeof options.maximumFractionDigits === 'number' ? options.maximumFractionDigits : 0
  const digits = Math.abs(amount).toLocaleString(localeForCurrency(code), { maximumFractionDigits })
  return `${amount < 0 ? '-' : ''}${currencyTextLabel(code)} ${digits}`
}

// Options for a per-record currency dropdown: workspace currency first, then
// every supported currency. A stored value outside the catalog (older records)
// stays selectable instead of silently switching.
export function currencyOptionCodes(value) {
  const workspaceCode = activeCurrency.code
  const codes = [workspaceCode, ...supportedCurrencyCodes.filter((code) => code !== workspaceCode)]
  const current = normalizeCurrencyCode(value)
  return current && !codes.includes(current) ? [current, ...codes] : codes
}

// jsPDF's built-in Helvetica only has WinAnsi glyphs: $, £, € and Latin text
// print, but ₹, ৳, ₦ ... come out as garbage. PDFs use this instead of
// formatMoney: same output when every character is printable, otherwise the
// custom symbol (if printable) or the ISO code ("INR 1,23,456").
const PDF_SAFE_TEXT = /^[\u0020-\u007E\u00A0-\u00FF\u20AC]*$/

export function formatMoneyPdf(value, currency, options = {}) {
  const formatted = formatMoney(value, currency, options).replace(/\u00A0/g, ' ')
  if (PDF_SAFE_TEXT.test(formatted)) return formatted
  const code = normalizeCurrencyCode(currency, activeCurrency.code)
  const label = currencyTextLabel(code)
  const amount = toAmount(value)
  const maximumFractionDigits =
    typeof options.maximumFractionDigits === 'number' ? options.maximumFractionDigits : 0
  const digits = Math.abs(amount).toLocaleString(localeForCurrency(code), { maximumFractionDigits })
  return `${amount < 0 ? '-' : ''}${PDF_SAFE_TEXT.test(label) ? label : code} ${digits}`
}

const PDF_GLYPH_CODES = { '₹': 'INR', '৳': 'BDT', '₦': 'NGN', '₺': 'TRY', '؋': 'AFN', '₨': 'Rs' }

// For PDF exporters that receive already-formatted strings: swaps currency
// glyphs Helvetica cannot draw (and a non-Latin custom symbol) for the code.
export function pdfSafeText(value) {
  let text = String(value ?? '')
  if (!PDF_SAFE_TEXT.test(text)) {
    const custom = activeCurrency.symbol
    if (custom && !PDF_SAFE_TEXT.test(custom)) text = text.split(custom).join(`${activeCurrency.code} `)
    text = text.replace(/[₹৳₦₺؋₨]/g, (glyph) => `${PDF_GLYPH_CODES[glyph]} `).replace(/ {2,}/g, ' ')
  }
  return text.replace(/\u00A0/g, ' ')
}
