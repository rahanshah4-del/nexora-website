/**
 * Docs Studio engine — public API.
 *
 * Pure ESM with no React or DOM dependency: it runs unchanged in the browser,
 * in Node (tests, build scripts) and in a worker.
 */

export {
  QTY_SCALE, RATE_ONE, ROUNDING_MODES,
  roundDiv, roundToIncrement, allocate, apportion,
  parseScaledDecimal, scaledToDecimalString,
  percentToMicro, microToPercentString, quantityToMilli, milliToQuantityString,
} from './money.js'

export {
  FALLBACK_CURRENCIES, listCurrencies, isKnownCurrency, currencyExponent, getCurrencyMeta,
  formatMoney, parseMoneyInput, normalizeDecimalInput, localeSeparators, formatPercent, formatQuantity,
} from './currency.js'

export {
  isIsoDate, isoParts, todayIso, addDays, compareIsoDates, daysBetween, dueDateFromTerms, formatIsoDate,
} from './dates.js'

export {
  DOCUMENT_TYPES, DOCUMENT_TYPE_IDS, CONVERSIONS,
  getDocumentType, listDocumentTypes, canConvert, conversionTargets,
} from './documentTypes.js'

export {
  SCHEMA_VERSION, LIMITS, DEFAULT_OPTIONS, DEFAULT_APPEARANCE, PAPER_SIZES, THERMAL_PAPER_SIZES,
  LETTERHEAD_DEFAULTS, LETTERHEAD_LIMITS, normalizeLetterhead, primaryTax, taxIdsForNewLine,
  generateId, createDocument, createLine, createTax, createCharge, createPayment,
  normalizeDocument, normalizeParty, normalizeLine, normalizeTax, normalizeCharge,
  normalizePayment, normalizeDeposit, normalizeDiscount, normalizeOptions, normalizeAppearance,
  changeCurrency,
} from './model.js'

export { calculateDocument } from './calculate.js'
export { validateDocument, isDocumentValid, VALIDATION_MESSAGES } from './validate.js'
export { convertDocument } from './convert.js'
export { formatNumber, nextNumber, parseSeq, periodKey } from './numbering.js'
export { amountInWords, registerWordsLanguage, listWordsLanguages } from './words.js'

export {
  SHARE_LINK_MAX_LENGTH, SHARE_LINK_MAX_JSON_BYTES,
  migrate, serializeDocument, deserializeDocument, encodeForShareLink, decodeShareLink,
} from './serialization.js'
