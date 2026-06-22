export const PROMO_CODE_COLLECTION = 'promoCodes'

export function normalizePromoCode(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 32)
}

function promoDate(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null)
  return date && !Number.isNaN(date.getTime()) ? date : null
}

export function evaluatePromoCode(promo, { planId, billingCycle, amount, now = new Date() } = {}) {
  const originalAmount = Number(amount)
  if (!promo?.code || promo.active !== true) return { valid: false, error: 'This promo code is inactive.' }
  if (!Number.isFinite(originalAmount) || originalAmount <= 0) return { valid: false, error: 'Promo codes cannot be used with custom pricing.' }

  const startsAt = promoDate(promo.startsAt)
  const expiresAt = promoDate(promo.expiresAt)
  if (!startsAt || !expiresAt || now < startsAt) return { valid: false, error: 'This promo code is not active yet.' }
  if (now >= expiresAt) return { valid: false, error: 'This promo code has expired.' }

  const plans = Array.isArray(promo.applicablePlanIds) ? promo.applicablePlanIds : []
  if (!plans.includes('all') && !plans.includes(String(planId || '').toLowerCase())) {
    return { valid: false, error: 'This promo code is not valid for the selected plan.' }
  }
  const cycles = Array.isArray(promo.billingCycles) ? promo.billingCycles : []
  if (!cycles.includes(billingCycle)) return { valid: false, error: `This promo code is not valid for ${billingCycle} billing.` }
  if (originalAmount < Number(promo.minOrderAmount || 0)) return { valid: false, error: `Minimum order amount is ${Number(promo.minOrderAmount || 0).toLocaleString()}.` }
  if (Number(promo.usageLimit || 0) > 0 && Number(promo.usedCount || 0) >= Number(promo.usageLimit)) {
    return { valid: false, error: 'This promo code has reached its usage limit.' }
  }

  const rawDiscount = promo.discountType === 'percentage'
    ? originalAmount * (Number(promo.discountValue || 0) / 100)
    : Number(promo.discountValue || 0)
  const maxDiscount = Number(promo.maxDiscount || 0)
  const discountAmount = Math.min(originalAmount, Math.max(0, maxDiscount > 0 ? Math.min(rawDiscount, maxDiscount) : rawDiscount))
  const finalAmount = Math.max(0, Number((originalAmount - discountAmount).toFixed(2)))
  if (discountAmount <= 0 || finalAmount <= 0) return { valid: false, error: 'This promo code does not produce a valid checkout amount.' }

  return {
    valid: true,
    promoCode: normalizePromoCode(promo.code),
    promoCodeId: promo.id || normalizePromoCode(promo.code),
    discountType: promo.discountType,
    discountValue: Number(promo.discountValue || 0),
    originalAmount,
    discountAmount: Number(discountAmount.toFixed(2)),
    finalAmount,
  }
}
