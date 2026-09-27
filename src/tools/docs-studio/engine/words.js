/**
 * Amount in words ("One Thousand Two Hundred Dollars and Five Cents").
 *
 * Languages plug into a registry keyed by language code; each supplies its own
 * number words and currency unit names. English ships here with both the
 * Western (thousand / million / billion) and Indian (thousand / lakh / crore)
 * systems. An unregistered language falls back to English.
 *
 * English style: Title Case, hyphenated 21–99 ("Thirty-Four"), no "and"
 * inside a number ("One Hundred Five"): "and" only joins the major and minor
 * units, so it can never be misread as a decimal point.
 */

import { currencyExponent } from './currency.js'
import { absBig } from './money.js'

/**
 * @typedef {object} WordsLanguage
 * @property {(n: bigint, system: 'western' | 'indian') => string} numberToWords  n ≥ 0
 * @property {(code: string) => ({ major: [string, string], minor: [string, string] | null } | null)} units
 *   [singular, plural] unit names, or null when the currency has none registered
 * @property {(parts: { negative: boolean, majorWords: string, majorUnit: string, minorWords: string | null, minorUnit: string | null, only: boolean }) => string} join
 * @property {(parts: { negative: boolean, code: string, majorWords: string, minor: bigint, exponent: number }) => string} fallback
 */

const registry = new Map()

/** Registers (or replaces) a language, e.g. registerWordsLanguage('fr', { … }). */
export function registerWordsLanguage(code, language) {
  registry.set(String(code).toLowerCase(), language)
}

export function listWordsLanguages() {
  return [...registry.keys()]
}

function languageFor(code) {
  const key = String(code || 'en').toLowerCase()
  return registry.get(key) || registry.get(key.split('-')[0]) || registry.get('en')
}

/**
 * @param {number | bigint} minor   amount in minor units
 * @param {string} currency         ISO 4217
 * @param {{ lang?: string, system?: 'western' | 'indian', only?: boolean }} [options]
 *   only: append "Only" (customary on South Asian and Gulf documents)
 */
export function amountInWords(minor, currency, { lang = 'en', system = 'western', only = false } = {}) {
  const language = languageFor(lang)
  const code = String(currency || '').toUpperCase()
  const exponent = currencyExponent(code)
  let value
  try {
    value = typeof minor === 'bigint' ? minor : BigInt(Math.trunc(Number(minor) || 0))
  } catch {
    value = 0n
  }
  const negative = value < 0n
  const abs = absBig(value)
  const scale = 10n ** BigInt(exponent)
  const major = abs / scale
  const minorPart = abs % scale
  const sys = system === 'indian' ? 'indian' : 'western'
  const majorWords = language.numberToWords(major, sys)
  const units = language.units(code)
  if (!units) return language.fallback({ negative, code, majorWords, minor: minorPart, exponent })
  const hasMinor = minorPart > 0n && units.minor
  return language.join({
    negative,
    majorWords,
    majorUnit: units.major[major === 1n ? 0 : 1],
    minorWords: hasMinor ? language.numberToWords(minorPart, sys) : null,
    minorUnit: hasMinor ? units.minor[minorPart === 1n ? 0 : 1] : null,
    only,
  })
}

// ── English ──────────────────────────────────────────────────────────────────

const ONES = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

const WESTERN_SCALES = [
  [10n ** 18n, 'Quintillion'],
  [10n ** 15n, 'Quadrillion'],
  [10n ** 12n, 'Trillion'],
  [10n ** 9n, 'Billion'],
  [10n ** 6n, 'Million'],
  [10n ** 3n, 'Thousand'],
]

function belowHundred(n) {
  if (n < 20) return ONES[n]
  const rest = n % 10
  return `${TENS[Math.floor(n / 10)]}${rest ? `-${ONES[rest]}` : ''}`
}

function belowThousand(n) {
  const hundreds = Math.floor(n / 100)
  const rest = n % 100
  const parts = []
  if (hundreds) parts.push(`${ONES[hundreds]} Hundred`)
  if (rest || !hundreds) parts.push(belowHundred(rest))
  return parts.join(' ')
}

function westernWords(n) {
  if (n < 1000n) return belowThousand(Number(n))
  const parts = []
  let rest = n
  for (const [size, label] of WESTERN_SCALES) {
    if (rest >= size) {
      const count = rest / size
      parts.push(`${count >= 1000n ? westernWords(count) : belowThousand(Number(count))} ${label}`)
      rest %= size
    }
  }
  if (rest > 0n) parts.push(belowThousand(Number(rest)))
  return parts.join(' ')
}

/** Indian system: 12,34,567 → Twelve Lakh Thirty-Four Thousand Five Hundred Sixty-Seven. */
function indianWords(n) {
  if (n < 1000n) return belowThousand(Number(n))
  const parts = []
  let rest = n
  const crore = 10n ** 7n
  if (rest >= crore) {
    parts.push(`${indianWords(rest / crore)} Crore`)
    rest %= crore
  }
  if (rest >= 100000n) {
    parts.push(`${belowHundred(Number(rest / 100000n))} Lakh`)
    rest %= 100000n
  }
  if (rest >= 1000n) {
    parts.push(`${belowHundred(Number(rest / 1000n))} Thousand`)
    rest %= 1000n
  }
  if (rest > 0n) parts.push(belowThousand(Number(rest)))
  return parts.join(' ')
}

const same = (word) => [word, word]
const regular = (word) => [word, `${word}s`]

/** ~40 widely used currencies: [major, minor] as [singular, plural]. */
const EN_UNITS = {
  USD: [regular('Dollar'), regular('Cent')],
  EUR: [regular('Euro'), regular('Cent')],
  GBP: [regular('Pound'), ['Penny', 'Pence']],
  JPY: [same('Yen'), null],
  CNY: [same('Yuan'), same('Fen')],
  INR: [regular('Rupee'), ['Paisa', 'Paise']],
  PKR: [regular('Rupee'), same('Paisa')],
  BDT: [same('Taka'), same('Poisha')],
  LKR: [regular('Rupee'), regular('Cent')],
  NPR: [regular('Rupee'), same('Paisa')],
  AED: [regular('Dirham'), same('Fils')],
  SAR: [regular('Riyal'), regular('Halala')],
  QAR: [regular('Riyal'), regular('Dirham')],
  OMR: [regular('Rial'), same('Baisa')],
  KWD: [regular('Dinar'), same('Fils')],
  BHD: [regular('Dinar'), same('Fils')],
  JOD: [regular('Dinar'), same('Fils')],
  EGP: [regular('Pound'), regular('Piastre')],
  CAD: [regular('Dollar'), regular('Cent')],
  AUD: [regular('Dollar'), regular('Cent')],
  NZD: [regular('Dollar'), regular('Cent')],
  SGD: [regular('Dollar'), regular('Cent')],
  HKD: [regular('Dollar'), regular('Cent')],
  CHF: [regular('Franc'), regular('Centime')],
  SEK: [['Krona', 'Kronor'], same('Öre')],
  NOK: [['Krone', 'Kroner'], same('Øre')],
  DKK: [['Krone', 'Kroner'], same('Øre')],
  PLN: [regular('Zloty'), ['Grosz', 'Groszy']],
  ZAR: [same('Rand'), regular('Cent')],
  NGN: [same('Naira'), same('Kobo')],
  KES: [regular('Shilling'), regular('Cent')],
  GHS: [regular('Cedi'), regular('Pesewa')],
  TRY: [same('Lira'), same('Kurus')],
  BRL: [['Real', 'Reais'], regular('Centavo')],
  MXN: [regular('Peso'), regular('Centavo')],
  PHP: [regular('Peso'), regular('Centavo')],
  MYR: [same('Ringgit'), same('Sen')],
  IDR: [same('Rupiah'), same('Sen')],
  THB: [same('Baht'), same('Satang')],
  KRW: [same('Won'), null],
  VND: [same('Dong'), null],
  RUB: [regular('Ruble'), regular('Kopek')],
}

registerWordsLanguage('en', {
  numberToWords(n, system) {
    return system === 'indian' ? indianWords(n) : westernWords(n)
  },
  units(code) {
    const entry = EN_UNITS[code]
    return entry ? { major: entry[0], minor: entry[1] } : null
  },
  join({ negative, majorWords, majorUnit, minorWords, minorUnit, only }) {
    const text = `${majorWords} ${majorUnit}${minorWords ? ` and ${minorWords} ${minorUnit}` : ''}`
    return `${negative ? 'Minus ' : ''}${text}${only ? ' Only' : ''}`
  },
  // Unknown unit names: "MUR One Thousand Two Hundred Thirty-Four and 56/100".
  fallback({ negative, code, majorWords, minor, exponent }) {
    const fraction = minor > 0n ? ` and ${minor.toString().padStart(exponent, '0')}/${10n ** BigInt(exponent)}` : ''
    return `${negative ? 'Minus ' : ''}${code || '???'} ${majorWords}${fraction}`
  },
})
