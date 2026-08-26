// WhatsApp CRM — global pricing & integration configuration.
//
// A single, workspace-independent document that lets administrators change the
// public WhatsApp CRM pricing and integration information without code changes.
//
//   Firestore: settings/whatsappPricing
//
// Read by the WhatsApp CRM Settings page and the public information sections;
// written only by backend admins (enforced by Firestore rules). No secrets, no
// per-workspace data — this is global SaaS pricing metadata only.

export const WHATSAPP_PRICING_COLLECTION = 'settings'
export const WHATSAPP_PRICING_DOC_ID = 'whatsappPricing'

export const SUPPORTED_PRICING_CURRENCIES = ['PKR', 'USD', 'AED', 'SAR', 'GBP', 'EUR']

// Canonical defaults. Used as the initial draft, the reset target, and the
// fallback whenever the document is missing or partially filled.
export function defaultWhatsappPricing() {
  return {
    setupFee: 15000,
    monthlyFee: 5999,
    trialDays: 30,
    trialMessageLimit: 50,
    currency: 'PKR',
    metaBillingEnabled: true,
    lastUpdatedAt: null,
  }
}

function toPositiveInt(value, fallback) {
  const num = Number(value)
  if (!Number.isFinite(num) || num < 0) return fallback
  return Math.floor(num)
}

// Coerce a raw Firestore record into a safe, fully-populated pricing object.
export function normalizeWhatsappPricing(record = {}) {
  const safe = record || {}
  const defaults = defaultWhatsappPricing()
  const currency = String(safe.currency || '').trim().toUpperCase() || defaults.currency
  return {
    setupFee: toPositiveInt(safe.setupFee, defaults.setupFee),
    monthlyFee: toPositiveInt(safe.monthlyFee, defaults.monthlyFee),
    trialDays: toPositiveInt(safe.trialDays, defaults.trialDays),
    trialMessageLimit: toPositiveInt(safe.trialMessageLimit, defaults.trialMessageLimit),
    currency,
    metaBillingEnabled: safe.metaBillingEnabled !== false,
    lastUpdatedAt: safe.lastUpdatedAt || null,
  }
}

// Format a numeric amount with its currency. Falls back to a plain "CUR n,nnn"
// string for currencies Intl cannot resolve, so the UI never shows NaN.
export function formatPricingAmount(amount, currency = 'PKR') {
  const value = Number(amount) || 0
  const code = String(currency || 'PKR').trim().toUpperCase()
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `${code} ${value.toLocaleString('en-US')}`
  }
}
