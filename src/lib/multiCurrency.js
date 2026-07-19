/**
 * Multi-currency pricing display layer.
 *
 * All stored prices remain in PKR. This module handles:
 *   - Country → currency detection (locale + IP geolocation fallback)
 *   - Exchange rate fetching + localStorage caching (1-hr TTL)
 *   - Price conversion (PKR → target currency)
 *   - Display formatting via Intl.NumberFormat
 *   - Optional fixed regional pricing overrides
 */

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

export const STORAGE_KEY_CURRENCY = 'nexora_currency'
export const STORAGE_KEY_RATES = 'nexora_fx_rates'
export const STORAGE_KEY_RATES_TS = 'nexora_fx_rates_ts'

const RATES_CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

/* Supported display currencies */
export const SUPPORTED_CURRENCIES = ['PKR', 'USD', 'AED', 'SAR', 'INR', 'GBP', 'EUR']

/* ------------------------------------------------------------------ */
/*  Country → Currency mapping                                        */
/* ------------------------------------------------------------------ */

const COUNTRY_TO_CURRENCY = {
  PK: 'PKR',
  IN: 'INR',
  BD: 'BDT',
  AE: 'AED',
  SA: 'SAR',
  US: 'USD',
  GB: 'GBP',
  CA: 'CAD',
  AU: 'AUD',
  NZ: 'NZD',
  SG: 'SGD',
  MY: 'MYR',
  ID: 'IDR',
  TH: 'THB',
  PH: 'PHP',
  VN: 'VND',
  CN: 'CNY',
  JP: 'JPY',
  KR: 'KRW',
  // Europe → EUR
  DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR',
  BE: 'EUR', AT: 'EUR', PT: 'EUR', IE: 'EUR', FI: 'EUR',
  GR: 'EUR', PL: 'EUR', SE: 'EUR', DK: 'EUR', NO: 'EUR',
  CZ: 'EUR', HU: 'EUR', RO: 'EUR', BG: 'EUR', HR: 'EUR',
  // Middle East & Africa
  QA: 'QAR', KW: 'KWD', OM: 'OMR', BH: 'BHD',
  EG: 'EGP', NG: 'NGN', KE: 'KES', ZA: 'ZAR',
  // Americas
  MX: 'MXN', BR: 'BRL', AR: 'ARS', CL: 'CLP', CO: 'COP',
  // Other
  TR: 'TRY', RU: 'RUB', CH: 'CHF',
}

/* Map supported currencies back to the nearest supported one
   (e.g. BDT isn't a display option → maps to PKR as nearest) */
function nearestSupported(currencyCode) {
  if (SUPPORTED_CURRENCIES.includes(currencyCode)) return currencyCode
  // Map unsupported codes to the closest supported
  const map = {
    BDT: 'PKR', QAR: 'AED', KWD: 'AED', OMR: 'AED', BHD: 'AED',
    EGP: 'SAR', NGN: 'USD', KES: 'USD', ZAR: 'USD',
    SGD: 'USD', MYR: 'USD', IDR: 'USD', THB: 'USD', PHP: 'USD',
    VND: 'USD', CNY: 'USD', JPY: 'USD', KRW: 'USD',
    NZD: 'AUD', MXN: 'USD', BRL: 'USD', ARS: 'USD', CLP: 'USD',
    COP: 'USD', TRY: 'EUR', RUB: 'EUR', CHF: 'EUR',
    CAD: 'USD', // Keep CAD separate if needed
  }
  return map[currencyCode] || 'PKR'
}

/* ------------------------------------------------------------------ */
/*  Currency metadata                                                  */
/* ------------------------------------------------------------------ */

const CURRENCY_META = {
  PKR: { symbol: '₨', locale: 'en-PK', decimals: 0 },
  INR: { symbol: '₹', locale: 'en-IN', decimals: 0 },
  AED: { symbol: 'AED', locale: 'ar-AE', decimals: 0 },
  SAR: { symbol: 'SAR', locale: 'ar-SA', decimals: 0 },
  USD: { symbol: '$', locale: 'en-US', decimals: 2 },
  GBP: { symbol: '£', locale: 'en-GB', decimals: 2 },
  EUR: { symbol: '€', locale: 'en-DE', decimals: 2 },
  CAD: { symbol: 'CA$', locale: 'en-CA', decimals: 2 },
  AUD: { symbol: 'A$', locale: 'en-AU', decimals: 2 },
}

function metaFor(code) {
  return CURRENCY_META[code] || { symbol: code, locale: 'en-US', decimals: 0 }
}

/* ------------------------------------------------------------------ */
/*  Fallback exchange rates  (1 PKR = X)                               */
/* ------------------------------------------------------------------ */

const FALLBACK_RATES = {
  PKR: 1,
  USD: 0.0035,   // 1 USD ≈ 285 PKR
  GBP: 0.0028,   // 1 GBP ≈ 360 PKR
  EUR: 0.0032,   // 1 EUR ≈ 310 PKR
  AED: 0.0128,   // 1 AED ≈ 78 PKR
  SAR: 0.0132,   // 1 SAR ≈ 76 PKR
  INR: 0.292,    // 1 INR ≈ 3.42 PKR
  CAD: 0.0047,   // 1 CAD ≈ 213 PKR
  AUD: 0.0054,   // 1 AUD ≈ 185 PKR
}

/* ------------------------------------------------------------------ */
/*  Regional pricing overrides                                         */
/*                                                                     */
/*  Format: { "<planId>:<currencyCode>": { monthlyPrice, label } }      */
/*  If an override exists for a plan+currency combo, that price is     */
/*  used directly instead of converting the PKR base price.            */
/* ------------------------------------------------------------------ */

const REGIONAL_PRICE_OVERRIDES = {
  // Example entries (uncomment to activate):
  // "basic:USD":    { monthlyPrice: 20,  label: "$20/month" },
  // "standard:USD": { monthlyPrice: 59,  label: "$59/month" },
  // "basic:GBP":    { monthlyPrice: 16,  label: "£16/month" },
  // "standard:GBP": { monthlyPrice: 48,  label: "£48/month" },
}

/* ------------------------------------------------------------------ */
/*  Country / currency detection                                       */
/* ------------------------------------------------------------------ */

/**
 * Extract a country code from navigator.language (e.g. "en-US" → "US").
 * Returns null if the locale doesn't encode a region.
 */
function countryFromLocale() {
  if (typeof navigator === 'undefined') return null
  const lang = String(navigator.language || '').trim()
  const parts = lang.split('-')
  if (parts.length >= 2 && parts[1].length === 2) return parts[1].toUpperCase()
  // Try navigator.languages array for region info
  if (navigator.languages && navigator.languages.length) {
    for (const l of navigator.languages) {
      const p = String(l).trim().split('-')
      if (p.length >= 2 && p[1].length === 2) return p[1].toUpperCase()
    }
  }
  return null
}

/**
 * Maps a country code to the best supported currency.
 * Returns PKR as default when mapping is unavailable.
 */
export function currencyForCountry(countryCode) {
  const raw = COUNTRY_TO_CURRENCY[String(countryCode || '').toUpperCase()]
  return nearestSupported(raw || 'PKR')
}

/**
 * Auto-detect the visitor's currency.
 *
 * Strategy (ordered by priority):
 *   1. Browser locale (`navigator.language`) — instant, no network
 *   2. IP geolocation (`ipapi.co/json/`) — background refinement
 *   3. Default PKR if all else fails
 *
 * Returns { currency, country, method }.
 * Never throws — always returns a valid currency.
 */
export async function detectVisitorCurrency() {
  if (typeof window === 'undefined') return { currency: 'PKR', country: 'XX', method: 'default' }

  // Phase 1: Browser locale (instant)
  const localeCountry = countryFromLocale()
  if (localeCountry) {
    const currency = currencyForCountry(localeCountry)
    // Fire IP geolocation in background for future visits but return locale result immediately
    refineViaIpGeolocation().catch(() => {})
    return { currency, country: localeCountry, method: 'locale' }
  }

  // Phase 2: IP geolocation
  try {
    const ipResult = await fetchIpCountry()
    if (ipResult) {
      const currency = currencyForCountry(ipResult)
      return { currency, country: ipResult, method: 'ip' }
    }
  } catch { /* fall through */ }

  // Phase 3: Default
  return { currency: 'PKR', country: 'XX', method: 'default' }
}

/**
 * Fetch country code from free IP geolocation API.
 * Returns country code string or null.
 */
async function fetchIpCountry() {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal })
    clearTimeout(timeoutId)
    if (!res.ok) return null
    const data = await res.json()
    return String(data.country_code || data.country || '').toUpperCase() || null
  } catch {
    return null
  }
}

/**
 * Background IP geolocation — stores result silently without affecting current state.
 * Used to refine future currency choices.
 */
async function refineViaIpGeolocation() {
  try {
    const country = await fetchIpCountry()
    if (country) {
      // Store the detected country for future sessions
      try { localStorage.setItem('nexora_detected_country', country) } catch { /* quota */ }
    }
  } catch { /* silent */ }
}

/* ------------------------------------------------------------------ */
/*  Exchange rate loading                                              */
/* ------------------------------------------------------------------ */

/**
 * Load exchange rates with caching.
 *
 * Priority:
 *   1. localStorage cache (if fresh: < 1 hour old)
 *   2. Live API fetch (open.er-api.com, free, no API key)
 *   3. Hardcoded fallback rates
 *
 * Returns { rates: Object, source: 'cache' | 'live' | 'fallback' }
 */
export async function loadExchangeRates() {
  if (typeof window === 'undefined') return { rates: FALLBACK_RATES, source: 'fallback' }

  // 1. Check cache
  try {
    const tsRaw = localStorage.getItem(STORAGE_KEY_RATES_TS)
    const cached = localStorage.getItem(STORAGE_KEY_RATES)
    if (tsRaw && cached) {
      const age = Date.now() - Number(tsRaw)
      if (age < RATES_CACHE_TTL_MS) {
        return { rates: JSON.parse(cached), source: 'cache' }
      }
    }
  } catch { /* quota / parse error */ }

  // 2. Fetch live rates
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)
    const res = await fetch('https://open.er-api.com/v6/latest/PKR', { signal: controller.signal })
    clearTimeout(timeoutId)
    if (res.ok) {
      const data = await res.json()
      if (data && data.result === 'success' && data.rates) {
        // Cache the rates
        try {
          localStorage.setItem(STORAGE_KEY_RATES, JSON.stringify(data.rates))
          localStorage.setItem(STORAGE_KEY_RATES_TS, String(Date.now()))
        } catch { /* quota */ }
        return { rates: data.rates, source: 'live' }
      }
    }
  } catch { /* network error */ }

  // 3. Try stale cache
  try {
    const cached = localStorage.getItem(STORAGE_KEY_RATES)
    if (cached) return { rates: JSON.parse(cached), source: 'cache' }
  } catch { /* parse error */ }

  // 4. Fallback
  return { rates: FALLBACK_RATES, source: 'fallback' }
}

/* ------------------------------------------------------------------ */
/*  Price conversion                                                   */
/* ------------------------------------------------------------------ */

/**
 * Convert a PKR amount to the target currency.
 *
 * @param {number} pkrAmount  — The amount in PKR
 * @param {string} currency   — Target currency code (e.g. 'USD')
 * @param {Object} rates      — Exchange rates object { PKR: 1, USD: 0.0035, ... }
 * @returns {number|null}     — Converted amount, or null for 'custom' pricing
 */
export function convertPrice(pkrAmount, currency, rates = FALLBACK_RATES) {
  if (pkrAmount === null || pkrAmount === undefined) return null
  if (String(pkrAmount).toLowerCase() === 'custom') return null
  const amount = Number(pkrAmount)
  if (!Number.isFinite(amount)) return null
  if (amount === 0) return 0
  if (currency === 'PKR') return amount

  const rate = Number(rates[currency]) || FALLBACK_RATES[currency] || 0
  if (rate <= 0) return amount // safeguard: no valid rate → return PKR amount as-is

  const converted = amount * rate
  const { decimals } = metaFor(currency)
  if (decimals === 0) return Math.round(converted)
  return Math.round(converted * 100) / 100
}

/* ------------------------------------------------------------------ */
/*  Price formatting                                                   */
/* ------------------------------------------------------------------ */

/**
 * Format a PKR amount as a display string in the target currency.
 *
 * @param {number} pkrAmount  — Amount in PKR
 * @param {string} currency   — Target currency code
 * @param {Object} [rates]    — Exchange rates (defaults to fallback)
 * @returns {string}          — e.g. "$7.14", "PKR 2,000", "AED 73"
 */
export function formatPriceLabel(pkrAmount, currency = 'PKR', rates = FALLBACK_RATES) {
  if (String(pkrAmount).toLowerCase() === 'custom') return 'Custom Pricing'
  const converted = convertPrice(pkrAmount, currency, rates)
  if (converted === null) return 'Custom Pricing'
  if (typeof converted !== 'number' || !Number.isFinite(converted)) return 'Custom Pricing'

  const meta = metaFor(currency)
  const amount = Number(converted || 0)

  try {
    // PKR and INR: show symbol prefix for readability
    if (currency === 'PKR') {
      return `PKR ${amount.toLocaleString(meta.locale, { maximumFractionDigits: meta.decimals })}`
    }
    return new Intl.NumberFormat(meta.locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: meta.decimals,
    }).format(amount)
  } catch {
    // Fallback for any Intl edge case
    return `${meta.symbol} ${amount.toFixed(meta.decimals)}`
  }
}

/* ------------------------------------------------------------------ */
/*  Regional pricing helpers                                           */
/* ------------------------------------------------------------------ */

/**
 * Check for a fixed regional price override for a given plan + currency.
 *
 * @param {string} planId    — e.g. 'basic', 'standard'
 * @param {string} currency  — e.g. 'USD', 'EUR'
 * @returns {Object|null}    — { monthlyPrice, label } or null
 */
export function getRegionalPriceOverride(planId, currency) {
  if (currency === 'PKR') return null
  const key = `${String(planId).toLowerCase()}:${currency}`
  return REGIONAL_PRICE_OVERRIDES[key] || null
}

/* ------------------------------------------------------------------ */
/*  Plan price formatting (combines all of the above)                  */
/* ------------------------------------------------------------------ */

/**
 * Format a plan's price for display.
 *
 * Logic:
 *   1. Enterprise / custom → "Custom Pricing"
 *   2. Free trial (price 0) → localized "Free" or "0"
 *   3. Regional override → use fixed price label
 *   4. Otherwise → convert PKR base → format
 *
 * @param {Object} plan          — Plan object from platformPlans.js
 * @param {string} billingCycle  — 'monthly' or 'yearly'
 * @param {string} currency      — Target display currency
 * @param {Object} [rates]       — Exchange rates
 * @returns {string}
 */
export function formatPlanPrice(plan, billingCycle = 'monthly', currency = 'PKR', rates = FALLBACK_RATES) {
  if (!plan) return ''

  const planId = String(plan.id || plan.planName || '').toLowerCase()

  // Custom / Enterprise pricing
  const monthlyRaw = plan.monthlyPrice ?? plan.price
  if (String(monthlyRaw).toLowerCase() === 'custom') return 'Custom Pricing'

  // Free trial
  if (planId === 'free-trial' || planId === 'free_trial' || Number(monthlyRaw) === 0) {
    return formatPriceLabel(0, currency, rates)
  }

  // Regional override
  const override = getRegionalPriceOverride(planId, currency)
  if (override) return override.label

  // Calculate PKR amount
  const pkrAmount = getPlanPkrAmount(plan, billingCycle)
  if (pkrAmount === null) return 'Custom Pricing'

  return formatPriceLabel(pkrAmount, currency, rates)
}

/**
 * Extract the raw PKR amount from a plan for a given billing cycle.
 *
 * @param {Object} plan
 * @param {string} cycle — 'monthly' or 'yearly'
 * @returns {number|null}
 */
export function getPlanPkrAmount(plan, cycle = 'monthly') {
  if (!plan) return null
  const raw = String(plan.monthlyPrice ?? plan.price ?? '').toLowerCase()
  if (raw === 'custom') return null

  if (cycle === 'yearly' && plan.yearlyPrice && String(plan.yearlyPrice).toLowerCase() !== 'custom') {
    return Number(plan.yearlyPrice) || null
  }

  return Number(plan.monthlyPrice ?? plan.price) || 0
}

/**
 * Get the billing period suffix for a plan.
 *
 * @param {Object} plan
 * @param {string} billingCycle
 * @param {string} currency
 * @returns {string} — e.g. '/month', '/year', or '' for custom
 */
export function getBillingPeriodSuffix(plan, billingCycle = 'monthly', currency = 'PKR') {
  const monthlyRaw = plan?.monthlyPrice ?? plan?.price
  if (String(monthlyRaw).toLowerCase() === 'custom') return ''
  const planId = String(plan?.id || '').toLowerCase()
  if (planId === 'free-trial' || planId === 'free_trial' || Number(monthlyRaw) === 0) return ''
  return billingCycle === 'yearly' ? '/year' : '/month'
}

/**
 * Get the raw converted number for a plan (for use in comparison, analytics, etc.)
 *
 * @param {Object} plan
 * @param {string} billingCycle
 * @param {string} currency
 * @param {Object} [rates]
 * @returns {number|null}
 */
export function getPlanConvertedAmount(plan, billingCycle = 'monthly', currency = 'PKR', rates = FALLBACK_RATES) {
  if (!plan) return null

  const planId = String(plan.id || plan.planName || '').toLowerCase()
  const override = getRegionalPriceOverride(planId, currency)
  if (override) return override.monthlyPrice

  const pkrAmount = getPlanPkrAmount(plan, billingCycle)
  if (pkrAmount === null || pkrAmount === 0) return pkrAmount

  return convertPrice(pkrAmount, currency, rates)
}

/**
 * Get a short currency symbol/prefix for inline use.
 */
export function getCurrencyPrefix(code) {
  const meta = metaFor(code)
  if (code === 'PKR') return 'PKR '
  return meta.symbol
}
