/**
 * Loyalty & Membership — Validation Helpers.
 * Pure functions. Zero side effects.
 */

import { MEMBERSHIP_TIERS } from './loyaltyCalculations.js'

// ─── Account Validation ──────────────────────────────────────────────────────

export function validateLoyaltyEnrollment(payload = {}) {
  const errors = []
  if (!payload.customerId) errors.push('Customer is required')
  if (!payload.customerName?.trim()) errors.push('Customer name is required')
  return { valid: errors.length === 0, errors }
}

export function validateTierConfig(tier = {}) {
  const errors = []
  if (!tier.id) errors.push('Tier ID is required')
  if (tier.minSpend !== undefined && (typeof tier.minSpend !== 'number' || tier.minSpend < 0)) errors.push('Invalid minimum spend')
  if (tier.discountPct !== undefined && (typeof tier.discountPct !== 'number' || tier.discountPct < 0 || tier.discountPct > 100)) errors.push('Discount must be 0-100')
  return { valid: errors.length === 0, errors }
}

// ─── Points Validation ───────────────────────────────────────────────────────

export function validatePointsAdjustment(payload = {}) {
  const errors = []
  if (!payload.accountId) errors.push('Account ID is required')
  if (!payload.points || typeof payload.points !== 'number' || payload.points <= 0) errors.push('Points must be a positive number')
  if (!payload.reason?.trim()) errors.push('Reason is required for manual adjustment')
  return { valid: errors.length === 0, errors }
}

export function validatePointsRedemption(account = {}, payload = {}) {
  const errors = []
  if (!account) errors.push('Account not found')
  if (!payload.rewardId) errors.push('Reward is required')
  const currentPoints = Number(account.currentPoints || 0)
  const cost = Number(payload.pointsCost || payload.points || 0)
  if (cost <= 0) errors.push('Invalid points cost')
  else if (currentPoints < cost) errors.push(`Insufficient points. Have ${currentPoints}, need ${cost}`)
  return { valid: errors.length === 0, errors }
}

// ─── Negative Balance Prevention ──────────────────────────────────────────────

export function validateNegativeBalance(currentBalance = 0, debitAmount = 0) {
  if (debitAmount <= 0) return { valid: false, error: 'Amount must be positive' }
  if (Number(currentBalance) < Number(debitAmount)) return { valid: false, error: 'Insufficient balance' }
  return { valid: true, error: null }
}

// ─── Duplicate Prevention ────────────────────────────────────────────────────

export function checkDuplicateEnrollment(existingAccounts = [], customerId = '') {
  const duplicate = (Array.isArray(existingAccounts) ? existingAccounts : []).find(
    (a) => a.customerId === customerId && a.status !== 'cancelled' && a.status !== 'Cancelled',
  )
  return { isDuplicate: Boolean(duplicate), existingAccount: duplicate }
}

export function checkDuplicateCoupon(existingCoupons = [], code = '') {
  const dup = (Array.isArray(existingCoupons) ? existingCoupons : []).find(
    (c) => c.code === code,
  )
  return { isDuplicate: Boolean(dup), existingCoupon: dup }
}

export function checkDuplicateReferral(existingReferrals = [], invitedEmail = '', referrerId = '') {
  const dup = (Array.isArray(existingReferrals) ? existingReferrals : []).find(
    (r) => r.invitedEmail === invitedEmail && r.referrerId === referrerId,
  )
  return { isDuplicate: Boolean(dup), existingReferral: dup }
}

// ─── Expiration Validation ────────────────────────────────────────────────────

export function isExpired(timestamp) {
  if (!timestamp) return false
  const date = typeof timestamp?.toDate === 'function' ? timestamp.toDate() : new Date(timestamp)
  return Number.isNaN(date.getTime()) ? false : date.getTime() < Date.now()
}

export function daysUntilExpiry(timestamp) {
  if (!timestamp) return null
  const date = typeof timestamp?.toDate === 'function' ? timestamp.toDate() : new Date(timestamp)
  if (Number.isNaN(date.getTime())) return null
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

// ─── Reward Eligibility Validation ────────────────────────────────────────────

export function validateRewardDefinition(reward = {}) {
  const errors = []
  if (!reward.name?.trim()) errors.push('Reward name is required')
  if (!reward.type) errors.push('Reward type is required')
  if (reward.requiredTier && reward.requiredTier !== 'any' && !MEMBERSHIP_TIERS.find((t) => t.id === reward.requiredTier)) {
    errors.push(`Invalid tier: ${reward.requiredTier}`)
  }
  return { valid: errors.length === 0, errors }
}

// ─── Coupon Validation ────────────────────────────────────────────────────────

export function validateCouponDefinition(coupon = {}) {
  const errors = []
  if (!coupon.name?.trim()) errors.push('Coupon name is required')
  if (!coupon.discountType) errors.push('Discount type is required')
  if (coupon.discountType === 'percentage' && (typeof coupon.discountValue !== 'number' || coupon.discountValue <= 0 || coupon.discountValue > 100)) {
    errors.push('Percentage discount must be between 1 and 100')
  }
  if (coupon.discountType === 'fixed' && (typeof coupon.discountValue !== 'number' || coupon.discountValue <= 0)) {
    errors.push('Fixed discount must be a positive number')
  }
  if (coupon.expiresAt && isExpired(coupon.expiresAt)) errors.push('Coupon expiry is in the past')
  return { valid: errors.length === 0, errors }
}

// ─── Campaign Validation ──────────────────────────────────────────────────────

export function validateCampaignDefinition(campaign = {}) {
  const errors = []
  if (!campaign.name?.trim()) errors.push('Campaign name is required')
  if (!campaign.type) errors.push('Campaign type is required')
  if (campaign.startsAt && campaign.endsAt) {
    const start = typeof campaign.startsAt?.toDate === 'function' ? campaign.startsAt.toDate() : new Date(campaign.startsAt)
    const end = typeof campaign.endsAt?.toDate === 'function' ? campaign.endsAt.toDate() : new Date(campaign.endsAt)
    if (start >= end) errors.push('Start date must be before end date')
  }
  return { valid: errors.length === 0, errors }
}

// ─── Wallet Validation ────────────────────────────────────────────────────────

export function validateWalletTransaction(payload = {}) {
  const errors = []
  if (!payload.accountId) errors.push('Account ID is required')
  if (!payload.type) errors.push('Transaction type is required (gift/store_credit/refund_credit/reward)')
  if (!payload.direction) errors.push('Direction is required (credit/debit)')
  if (typeof payload.amount !== 'number' || payload.amount <= 0) errors.push('Amount must be a positive number')
  if (!payload.description?.trim()) errors.push('Description is required')
  return { valid: errors.length === 0, errors }
}

// ─── Workspace / Permission Validation ────────────────────────────────────────

export function validateWorkspaceAccess(workspaceId, resourceId) {
  if (!workspaceId) return { valid: false, error: 'Workspace not found' }
  if (!resourceId) return { valid: false, error: 'Resource not found' }
  return { valid: true, error: null }
}
