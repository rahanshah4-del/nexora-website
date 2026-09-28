/**
 * Currency list, metadata and locale-aware formatting/parsing.
 *
 * The minor-unit exponent comes from an embedded ISO 4217 table, NOT from
 * Intl: stored amounts are integers of the minor unit, so the exponent must be
 * identical on every device that ever opens a document. Intl reports CLDR's
 * display digits, which differ from ISO 4217 for a handful of currencies
 * (CLDR shows IQD, for example, with 0 decimals; ISO defines 3) and can change
 * between ICU versions. Intl is used only for symbols, names and formatting,
 * always with the fraction digits forced to the ISO exponent.
 */

import { parseScaledDecimal, scaledToDecimalString } from './money.js'

/** ISO 4217 currencies whose minor unit is not 2 decimals. */
const ISO_EXPONENTS = {
  BIF: 0, CLP: 0, DJF: 0, GNF: 0, ISK: 0, JPY: 0, KMF: 0, KRW: 0, PYG: 0, RWF: 0,
  UGX: 0, UYI: 0, VND: 0, VUV: 0, XAF: 0, XOF: 0, XPF: 0,
  BHD: 3, IQD: 3, JOD: 3, KWD: 3, LYD: 3, OMR: 3, TND: 3,
  CLF: 4, UYW: 4,
}

/** Used when Intl.supportedValuesOf is unavailable (older engines). */
export const FALLBACK_CURRENCIES = [
  'AED', 'ARS', 'AUD', 'BDT', 'BHD', 'BRL', 'CAD', 'CHF', 'CLP', 'CNY', 'COP', 'CZK',
  'DKK', 'EGP', 'EUR', 'GBP', 'GHS', 'HKD', 'HUF', 'IDR', 'ILS', 'INR', 'IQD', 'JOD',
  'JPY', 'KES', 'KRW', 'KWD', 'LKR', 'MAD', 'MXN', 'MYR', 'NGN', 'NOK', 'NPR', 'NZD',
  'OMR', 'PHP', 'PKR', 'PLN', 'QAR', 'RON', 'RUB', 'SAR', 'SEK', 'SGD', 'THB', 'TRY',
  'TWD', 'TZS', 'UAH', 'UGX', 'USD', 'VND', 'XAF', 'XOF', 'ZAR',
]

const CODE_PATTERN = /^[A-Z]{3}$/

let currencyList = null
let currencySet = null

/** Every ISO 4217 code this runtime knows, sorted; the fallback list otherwise. */
export function listCurrencies() {
  if (currencyList) return currencyList
  let codes = null
  try {
    if (typeof Intl.supportedValuesOf === 'function') codes = Intl.supportedValuesOf('currency')
  } catch {
    codes = null
  }
  const merged = new Set([...(codes && codes.length ? codes : []), ...FALLBACK_CURRENCIES])
  currencyList = Object.freeze([...merged].filter((c) => CODE_PATTERN.test(c)).sort())
  currencySet = new Set(currencyList)
  return currencyList
}

export function isKnownCurrency(code) {
  if (typeof code !== 'string' || !CODE_PATTERN.test(code)) return false
  listCurrencies()
  return currencySet.has(code)
}

/** Minor-unit exponent per ISO 4217 (2 unless listed otherwise). */
export function currencyExponent(code) {
  return Object.hasOwn(ISO_EXPONENTS, code) ? ISO_EXPONENTS[code] : 2
}

function safeLocale(locale) {
  try {
    return Intl.getCanonicalLocales(locale || 'en')[0] || 'en'
  } catch {
    return 'en'
  }
}

const formatterCache = new Map()

function numberFormat(locale, options) {
  const key = `${locale}|${JSON.stringify(options)}`
  let formatter = formatterCache.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options)
    formatterCache.set(key, formatter)
  }
  return formatter
}

function currencyPart(code, locale, display) {
  try {
    const parts = numberFormat(locale, { style: 'currency', currency: code, currencyDisplay: display }).formatToParts(1)
    return parts.find((p) => p.type === 'currency')?.value || code
  } catch {
    return code
  }
}

/**
 * @typedef {object} CurrencyMeta
 * @property {string} code
 * @property {number} exponent      ISO 4217 minor-unit digits
 * @property {string} symbol        e.g. "US$" in en-CA, "$" in en-US
 * @property {string} narrowSymbol  e.g. "$"
 * @property {string} name          e.g. "US Dollar"
 */

/**
 * @param {string} code
 * @param {string} [locale]  locale for symbol and name (default "en")
 * @returns {CurrencyMeta}
 */
export function getCurrencyMeta(code, locale = 'en') {
  const upper = String(code || '').toUpperCase()
  const loc = safeLocale(locale)
  const symbol = currencyPart(upper, loc, 'symbol')
  const narrowSymbol = currencyPart(upper, loc, 'narrowSymbol') || symbol
  let name
  try {
    name = new Intl.DisplayNames([loc], { type: 'currency' }).of(upper) || upper
  } catch {
    name = upper
  }
  return { code: upper, exponent: currencyExponent(upper), symbol, narrowSymbol, name }
}

/**
 * Formats integer minor units, e.g. formatMoney(123456, 'INR', 'en-IN') →
 * "₹1,234.56". Exact for any size (the decimal string is handed to Intl, so
 * no float conversion). Unknown codes fall back to "XYZ 1,234.56".
 * @param {number | bigint} minor
 * @param {string} currency
 * @param {string} [locale]
 * @param {{ display?: 'symbol' | 'narrowSymbol' | 'code' | 'name', signDisplay?: string }} [options]
 */
export function formatMoney(minor, currency, locale = 'en', { display = 'symbol', signDisplay = 'auto' } = {}) {
  const code = String(currency || '').toUpperCase()
  const exponent = currencyExponent(code)
  const decimal = scaledToDecimalString(typeof minor === 'bigint' ? minor : BigInt(Math.trunc(Number(minor) || 0)), exponent)
  const loc = safeLocale(locale)
  try {
    if (!isKnownCurrency(code)) throw new RangeError('unknown currency')
    return numberFormat(loc, {
      style: 'currency',
      currency: code,
      currencyDisplay: display,
      signDisplay,
      minimumFractionDigits: exponent,
      maximumFractionDigits: exponent,
    }).format(decimal)
  } catch {
    const plain = numberFormat(loc, { minimumFractionDigits: exponent, maximumFractionDigits: exponent }).format(decimal)
    return `${code || '???'} ${plain}`
  }
}

/** The locale's decimal and grouping separators, e.g. { decimal: ',', group: '.' } for de-DE. */
export function localeSeparators(locale = 'en') {
  const parts = numberFormat(safeLocale(locale), { useGrouping: true }).formatToParts(12345.6)
  return {
    decimal: parts.find((p) => p.type === 'decimal')?.value || '.',
    group: parts.find((p) => p.type === 'group')?.value || ',',
  }
}

/**
 * Normalizes locale-formatted user input ("1.234,5" in de-DE, "1,234.5" in
 * en-US, "₹ 12,34,567.89") to a plain decimal string, or null.
 */
export function normalizeDecimalInput(input, locale = 'en') {
  const { decimal, group } = localeSeparators(locale)
  let s = String(input ?? '').trim()
  if (!s) return null
  const negative = /^[-\u2212(]/.test(s) || /-$/.test(s)
  // Drop currency symbols/codes, spaces (incl. NBSP / narrow NBSP) and grouping.
  s = s.replace(/[\s\u00a0\u202f]/g, '')
  if (group && group !== decimal) s = s.split(group).join('')
  if (decimal !== '.') s = s.replace(decimal, '.')
  s = s.replace(/[^\d.]/g, '')
  if (!/^\d*\.?\d*$/.test(s) || s === '' || s === '.') return null
  return negative ? `-${s}` : s
}

/**
 * Parses money typed in `locale` into minor units of `currency`. Extra
 * decimals are rounded (half-up) and flagged.
 * @returns {{ ok: true, minor: number, rounded: boolean } | { ok: false }}
 */
export function parseMoneyInput(input, currency, locale = 'en') {
  const decimal = normalizeDecimalInput(input, locale)
  if (decimal === null) return { ok: false }
  const exponent = currencyExponent(String(currency || '').toUpperCase())
  const minor = parseScaledDecimal(decimal, exponent)
  if (minor === null) return { ok: false }
  const fraction = decimal.split('.')[1] || ''
  return { ok: true, minor: Number(minor), rounded: fraction.length > exponent }
}

/** 72500 rate_micro → "7.25%" in `locale`. */
export function formatPercent(rateMicro, locale = 'en') {
  const fraction = scaledToDecimalString(BigInt(Math.trunc(Number(rateMicro) || 0)), 6)
  return numberFormat(safeLocale(locale), { style: 'percent', maximumFractionDigits: 4 }).format(fraction)
}

/** 2500 qty_milli → "2.5" in `locale`. */
export function formatQuantity(qtyMilli, locale = 'en') {
  const decimal = scaledToDecimalString(BigInt(Math.trunc(Number(qtyMilli) || 0)), 3)
  return numberFormat(safeLocale(locale), { maximumFractionDigits: 3 }).format(decimal)
}
