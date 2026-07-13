/**
 * Loyalty & Membership — Points Engine, Tier Logic, Reward Logic.
 * Pure functions. Zero side effects. No Firebase imports.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

export const MEMBERSHIP_TIERS = [
  { id: 'bronze',   label: 'Bronze',   minSpend: 0,         minVisits: 0,      minPoints: 0,      color: '#cd7f32', benefits: ['Basic rewards'], discountPct: 0, priorityService: false },
  { id: 'silver',   label: 'Silver',   minSpend: 10000,     minVisits: 5,      minPoints: 500,    color: '#c0c0c0', benefits: ['Basic rewards', 'Birthday bonus'], discountPct: 5, priorityService: false },
  { id: 'gold',     label: 'Gold',     minSpend: 50000,     minVisits: 15,     minPoints: 2500,   color: '#ffd700', benefits: ['All Silver benefits', 'Free delivery', 'Exclusive offers'], discountPct: 10, priorityService: false },
  { id: 'platinum', label: 'Platinum', minSpend: 200000,    minVisits: 40,     minPoints: 10000,  color: '#e5e4e2', benefits: ['All Gold benefits', 'Priority service', 'Cashback rewards'], discountPct: 15, priorityService: true },
  { id: 'vip',      label: 'VIP',      minSpend: 500000,    minVisits: 100,    minPoints: 25000,  color: '#b9f2ff', benefits: ['All Platinum benefits', 'Dedicated manager', 'Exclusive events', 'Gift vouchers'], discountPct: 20, priorityService: true },
]

export const POINT_EARNING_RULES_DEFAULTS = {
  perAmountSpent: 10,             // 1 point per X currency spent
  perItemCategoryBonus: {},       // { categoryId: pointsMultiplier }
  birthdayBonusPoints: 500,       // Points awarded on birthday
  referralBonusPoints: 200,       // Points awarded for successful referral
  signupBonusPoints: 100,         // Points awarded on enrollment
  pointValueInCurrency: 0.5,      // Each point = X currency in rewards
  roundingThreshold: 1,           // Minimum points to round up
  maxPointsPerTransaction: 10000, // Cap points per order
}

export const REWARD_TYPES = [
  { id: 'free_product',     label: 'Free Product',    icon: 'HiOutlineGift' },
  { id: 'pct_discount',     label: '% Discount',      icon: 'HiOutlineReceiptPercent' },
  { id: 'fixed_discount',   label: 'Fixed Discount',  icon: 'HiOutlineBanknotes' },
  { id: 'free_delivery',    label: 'Free Delivery',   icon: 'HiOutlineTruck' },
  { id: 'gift_voucher',     label: 'Gift Voucher',    icon: 'HiOutlineTicket' },
  { id: 'cashback',         label: 'Cashback',         icon: 'HiOutlineCurrencyDollar' },
  { id: 'coupon_conversion', label: 'Coupon Conversion', icon: 'HiOutlineTag' },
]

export const CAMPAIGN_TYPES = [
  { id: 'double_points_day',  label: 'Double Points Day',  multiplier: 2 },
  { id: 'weekend_bonus',      label: 'Weekend Bonus',      multiplier: 1.5 },
  { id: 'happy_hour',         label: 'Happy Hour',          multiplier: 3 },
  { id: 'festival_rewards',   label: 'Festival Rewards',    multiplier: 2 },
  { id: 'product_promotion',  label: 'Product Promotion',   multiplier: 2 },
]

export const ANALYTICS_KPI_DEFAULTS = {
  totalMembers: 0,
  activeMembers: 0,
  dormantMembers: 0,
  totalPointsIssued: 0,
  totalPointsRedeemed: 0,
  totalRewardsRedeemed: 0,
  totalCouponsGenerated: 0,
  totalCouponsUsed: 0,
  totalReferrals: 0,
  totalReferralEarnings: 0,
  totalWalletBalance: 0,
  totalStoreCredit: 0,
  totalGiftBalance: 0,
  totalRefundCredit: 0,
  vipCount: 0,
  repeatRate: 0,
  retentionRate: 0,
  averageVisits: 0,
  lifetimeValue: 0,
  averageBasket: 0,
  redemptionRate: 0,
  tierDistribution: { bronze: 0, silver: 0, gold: 0, platinum: 0, vip: 0 },
}

// ─── Tier Logic ──────────────────────────────────────────────────────────────

export function tierById(tierId) {
  return MEMBERSHIP_TIERS.find((t) => t.id === tierId) || MEMBERSHIP_TIERS[0]
}

export function calculateTier(customer = {}) {
  const lifetimeSpend = Number(customer.lifetimeSpend || 0)
  const visits = Number(customer.posOrdersCount || customer.visits || 0)
  const points = Number(customer.lifetimePoints || customer.points || 0)

  let assigned = MEMBERSHIP_TIERS[0]
  for (const tier of MEMBERSHIP_TIERS) {
    if (lifetimeSpend >= tier.minSpend && visits >= tier.minVisits && points >= tier.minPoints) {
      assigned = tier
    }
  }
  return assigned
}

export function tierProgress(customer = {}) {
  const current = calculateTier(customer)
  const currentIdx = MEMBERSHIP_TIERS.findIndex((t) => t.id === current.id)
  const nextTier = MEMBERSHIP_TIERS[currentIdx + 1]
  if (!nextTier) return { current, nextTier: null, progress: 100, nextLabel: 'Maximum tier reached' }

  const spendPct = nextTier.minSpend > 0 ? Math.min(100, (Number(customer.lifetimeSpend || 0) / nextTier.minSpend) * 100) : 100
  const visitsPct = nextTier.minVisits > 0 ? Math.min(100, (Number(customer.posOrdersCount || customer.visits || 0) / nextTier.minVisits) * 100) : 100
  const pointsPct = nextTier.minPoints > 0 ? Math.min(100, (Number(customer.lifetimePoints || customer.points || 0) / nextTier.minPoints) * 100) : 100
  const progress = Math.round(Math.min(100, Math.max(spendPct, visitsPct, pointsPct)))

  const remaining = {
    spend: Math.max(0, nextTier.minSpend - Number(customer.lifetimeSpend || 0)),
    visits: Math.max(0, nextTier.minVisits - Number(customer.posOrdersCount || customer.visits || 0)),
    points: Math.max(0, nextTier.minPoints - Number(customer.lifetimePoints || customer.points || 0)),
  }

  return { current, nextTier, progress, remaining, nextLabel: nextTier.label }
}

// ─── Points Engine ──────────────────────────────────────────────────────────

export function calculateEarnedPoints({ amount = 0, categoryId = '', itemCategoryMultiplier = 1, rules = POINT_EARNING_RULES_DEFAULTS, activeCampaigns = [] } = {}) {
  const amt = Math.max(0, Number(amount))
  if (amt <= 0) return 0

  const baseRate = Math.max(1, Number(rules.perAmountSpent) || 10)
  let points = Math.floor(amt / baseRate)

  // Category multiplier from rules
  const catMultiplier = Number(rules.perItemCategoryBonus?.[categoryId]) || itemCategoryMultiplier || 1
  points = Math.floor(points * catMultiplier)

  // Active campaign multipliers
  for (const campaign of activeCampaigns) {
    if (campaign.active !== false && campaign.multiplier) {
      points = Math.floor(points * Number(campaign.multiplier))
    }
  }

  const maxPoints = Number(rules.maxPointsPerTransaction) || 10000
  return Math.min(points, maxPoints)
}

export function calculateReversePoints(refundAmount = 0, rules = POINT_EARNING_RULES_DEFAULTS) {
  const amt = Math.max(0, Number(refundAmount))
  if (amt <= 0) return 0
  const baseRate = Math.max(1, Number(rules.perAmountSpent) || 10)
  return Math.ceil(amt / baseRate)
}

export function calculatePointsForCurrency(points = 0, rules = POINT_EARNING_RULES_DEFAULTS) {
  return Math.floor(Math.max(0, Number(points)) * Number(rules.pointValueInCurrency || 0.5))
}

export function calculateRequiredPointsForReward(reward = {}) {
  const base = Number(reward.pointsCost || reward.minimumPoints || 0)
  if (reward.type === 'pct_discount' && reward.discountValue) {
    return Math.max(base, Number(reward.discountValue) * 20)
  }
  if (reward.type === 'fixed_discount' && reward.discountValue) {
    return Math.max(base, Number(reward.discountValue) / 0.5)
  }
  return base
}

// ─── Reward Eligibility ──────────────────────────────────────────────────────

export function isRewardEligible(account = {}, reward = {}) {
  if (!account || !reward) return false
  if (reward.active === false) return false
  const tier = calculateTier(account)
  if (reward.requiredTier && reward.requiredTier !== 'any' && tier.id !== reward.requiredTier && MEMBERSHIP_TIERS.findIndex((t) => t.id === reward.requiredTier) > MEMBERSHIP_TIERS.findIndex((t) => t.id === tier.id)) return false
  const requiredPoints = calculateRequiredPointsForReward(reward)
  if (Number(account.currentPoints || 0) < requiredPoints) return false
  return true
}

export function rewardsForTier(tierId, rewards = []) {
  const tierIdx = MEMBERSHIP_TIERS.findIndex((t) => t.id === tierId)
  return rewards.filter((r) => {
    if (r.active === false) return false
    if (!r.requiredTier || r.requiredTier === 'any') return true
    const reqIdx = MEMBERSHIP_TIERS.findIndex((t) => t.id === r.requiredTier)
    return tierIdx >= reqIdx
  })
}

// ─── Coupon Generation ────────────────────────────────────────────────────────

export function generateCouponCode({ prefix = 'LOY', length = 8 } = {}) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `${prefix}-${code}`
}

export function generateBarcodeData(couponCode = '') {
  // Code128 barcode-compatible encoding
  const sanitized = couponCode.replace(/[^A-Z0-9-]/g, '').toUpperCase()
  return `*${sanitized}*`
}

export function generateQRData({ couponCode = '', workspaceId = '', type = 'coupon' } = {}) {
  return JSON.stringify({ type, code: couponCode, workspace: workspaceId, ts: Date.now() })
}

// ─── Coupon Validation ────────────────────────────────────────────────────────

export function isCouponValid(coupon = {}) {
  if (!coupon || coupon.active === false) return false
  const now = Date.now()
  if (coupon.expiresAt) {
    const exp = typeof coupon.expiresAt?.toDate === 'function' ? coupon.expiresAt.toDate().getTime() : new Date(coupon.expiresAt).getTime()
    if (now > exp) return false
  }
  if (coupon.startsAt) {
    const start = typeof coupon.startsAt?.toDate === 'function' ? coupon.startsAt.toDate().getTime() : new Date(coupon.startsAt).getTime()
    if (now < start) return false
  }
  if (coupon.usageLimit > 0 && (coupon.usedCount || 0) >= coupon.usageLimit) return false
  return true
}

export function applyCouponDiscount(cartTotal = 0, coupon = {}) {
  if (!isCouponValid(coupon)) return { valid: false, discount: 0, finalTotal: cartTotal }
  const total = Math.max(0, Number(cartTotal))
  if (coupon.minOrderAmount && total < Number(coupon.minOrderAmount)) return { valid: false, discount: 0, finalTotal: total, reason: 'Minimum order not met' }

  let discount = 0
  if (coupon.discountType === 'percentage') {
    discount = Math.floor((total * Number(coupon.discountValue || 0)) / 100)
    if (coupon.maxDiscount) discount = Math.min(discount, Number(coupon.maxDiscount))
  } else if (coupon.discountType === 'fixed') {
    discount = Math.min(Number(coupon.discountValue || 0), total)
  } else if (coupon.type === 'free_product' && coupon.freeProductName) {
    return { valid: true, discount: 0, finalTotal: total, freeProduct: coupon.freeProductName, type: 'free_product' }
  } else if (coupon.type === 'free_delivery') {
    return { valid: true, discount: 0, finalTotal: total, type: 'free_delivery' }
  }

  return { valid: true, discount, finalTotal: Math.max(0, total - discount), type: coupon.discountType || coupon.type }
}

// ─── Referral Logic ──────────────────────────────────────────────────────────

export function calculateReferralReward(referral = {}, rules = POINT_EARNING_RULES_DEFAULTS) {
  if (!referral || referral.status !== 'converted') return 0
  return Math.max(0, Number(rules.referralBonusPoints || 200))
}

export function referralEarnings(referrals = []) {
  return referrals
    .filter((r) => r.status === 'converted' && r.rewardStatus === 'awarded')
    .reduce((sum, r) => sum + Number(r.rewardPoints || r.rewardAmount || 0), 0)
}

// ─── Birthday Detection ──────────────────────────────────────────────────────

export function isBirthdayMonth(customer = {}) {
  const dob = customer.dateOfBirth || customer.dob
  if (!dob) return false
  const birthDate = typeof dob?.toDate === 'function' ? dob.toDate() : new Date(dob)
  if (Number.isNaN(birthDate.getTime())) return false
  const now = new Date()
  return birthDate.getMonth() === now.getMonth()
}

export function isBirthdayToday(customer = {}) {
  const dob = customer.dateOfBirth || customer.dob
  if (!dob) return false
  const birthDate = typeof dob?.toDate === 'function' ? dob.toDate() : new Date(dob)
  if (Number.isNaN(birthDate.getTime())) return false
  const now = new Date()
  return birthDate.getMonth() === now.getMonth() && birthDate.getDate() === now.getDate()
}

export function daysUntilBirthday(customer = {}) {
  const dob = customer.dateOfBirth || customer.dob
  if (!dob) return null
  const birthDate = typeof dob?.toDate === 'function' ? dob.toDate() : new Date(dob)
  if (Number.isNaN(birthDate.getTime())) return null
  const now = new Date()
  const nextBirthday = new Date(now.getFullYear(), birthDate.getMonth(), birthDate.getDate())
  if (nextBirthday < now) nextBirthday.setFullYear(now.getFullYear() + 1)
  return Math.ceil((nextBirthday - now) / (1000 * 60 * 60 * 24))
}

// ─── Wallet Logic ────────────────────────────────────────────────────────────

export function calculateWalletBalance(walletEntries = []) {
  return (Array.isArray(walletEntries) ? walletEntries : []).reduce(
    (acc, entry) => {
      const amt = Number(entry.amount || 0)
      if (entry.type === 'gift' && entry.direction === 'credit') acc.giftBalance += amt
      else if (entry.type === 'gift' && entry.direction === 'debit') acc.giftBalance = Math.max(0, acc.giftBalance - amt)
      else if (entry.type === 'store_credit' && entry.direction === 'credit') acc.storeCredit += amt
      else if (entry.type === 'store_credit' && entry.direction === 'debit') acc.storeCredit = Math.max(0, acc.storeCredit - amt)
      else if (entry.type === 'refund_credit' && entry.direction === 'credit') acc.refundCredit += amt
      else if (entry.type === 'refund_credit' && entry.direction === 'debit') acc.refundCredit = Math.max(0, acc.refundCredit - amt)
      else if (entry.type === 'reward' && entry.direction === 'credit') acc.rewardBalance += amt
      else if (entry.type === 'reward' && entry.direction === 'debit') acc.rewardBalance = Math.max(0, acc.rewardBalance - amt)
      return acc
    },
    { giftBalance: 0, storeCredit: 0, refundCredit: 0, rewardBalance: 0, total: 0 },
  )
}

export function walletSummary(walletEntries = []) {
  const balances = calculateWalletBalance(walletEntries)
  balances.total = balances.giftBalance + balances.storeCredit + balances.refundCredit + balances.rewardBalance
  return balances
}

// ─── Customer Analytics KPIs ─────────────────────────────────────────────────

export function calculateLoyaltyAnalytics({ accounts = [], pointsLedger = [], redemptions = [], coupons = [], referrals = [], walletEntries = [], orders = [] } = {}) {
  const memberList = Array.isArray(accounts) ? accounts : []
  const totalMembers = memberList.length
  const activeMembers = memberList.filter((a) => a.status === 'active' || a.status === 'Active').length
  const dormantMembers = memberList.filter((a) => {
    if (a.status === 'dormant' || a.status === 'inactive') return true
    if (a.lastActivityAt) {
      const last = typeof a.lastActivityAt?.toDate === 'function' ? a.lastActivityAt.toDate() : new Date(a.lastActivityAt)
      const daysSince = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24)
      return daysSince > 90
    }
    return false
  }).length

  const totalPointsIssued = (Array.isArray(pointsLedger) ? pointsLedger : [])
    .filter((e) => e.type === 'earned' || e.type === 'bonus' || e.type === 'referral' || e.type === 'birthday')
    .reduce((sum, e) => sum + Number(e.points || 0), 0)

  const totalPointsRedeemed = (Array.isArray(pointsLedger) ? pointsLedger : [])
    .filter((e) => e.type === 'redeemed')
    .reduce((sum, e) => sum + Number(e.points || 0), 0)

  const totalRewardsRedeemed = (Array.isArray(redemptions) ? redemptions : []).length
  const totalCouponsGenerated = (Array.isArray(coupons) ? coupons : []).length
  const totalCouponsUsed = (Array.isArray(coupons) ? coupons : []).filter((c) => c.usedCount > 0).length
  const totalReferrals = (Array.isArray(referrals) ? referrals : []).length
  const totalReferralEarnings = (Array.isArray(referrals) ? referrals : [])
    .filter((r) => r.rewardStatus === 'awarded')
    .reduce((sum, r) => sum + Number(r.rewardPoints || r.rewardAmount || 0), 0)

  const walletBal = walletSummary(walletEntries)
  const vipCount = memberList.filter((a) => a.tier === 'vip' || a.currentTier === 'vip').length

  // Order-based KPIs
  const orderList = Array.isArray(orders) ? orders : []
  const customersWithOrders = new Set(orderList.filter((o) => o.customerId).map((o) => o.customerId)).size
  const repeatCustomers = orderList.filter((o) => o.customerId && memberList.some((a) => a.customerId === o.customerId && (a.posOrdersCount || a.visits || 0) >= 2)).length
  const repeatRate = customersWithOrders > 0 ? Math.round((repeatCustomers / customersWithOrders) * 100) : 0
  const retentionRate = totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0
  const averageVisits = totalMembers > 0 ? Math.round((orderList.length / totalMembers) * 10) / 10 : 0
  const lifetimeValue = totalMembers > 0 ? Math.round(orderList.reduce((s, o) => s + Number(o.total || 0), 0) / totalMembers) : 0
  const averageBasket = orderList.length > 0 ? Math.round(orderList.reduce((s, o) => s + Number(o.total || 0), 0) / orderList.length) : 0
  const redemptionRate = totalPointsIssued > 0 ? Math.round((totalPointsRedeemed / totalPointsIssued) * 100) : 0

  const tierDistribution = { bronze: 0, silver: 0, gold: 0, platinum: 0, vip: 0 }
  memberList.forEach((a) => {
    const t = (a.tier || a.currentTier || 'bronze').toLowerCase()
    if (tierDistribution[t] !== undefined) tierDistribution[t]++
  })

  return {
    totalMembers, activeMembers, dormantMembers,
    totalPointsIssued, totalPointsRedeemed, totalRewardsRedeemed,
    totalCouponsGenerated, totalCouponsUsed,
    totalReferrals, totalReferralEarnings,
    totalWalletBalance: walletBal.total,
    totalStoreCredit: walletBal.storeCredit,
    totalGiftBalance: walletBal.giftBalance,
    totalRefundCredit: walletBal.refundCredit,
    vipCount, repeatRate, retentionRate, averageVisits, lifetimeValue, averageBasket, redemptionRate,
    tierDistribution,
  }
}

// ─── Campaign Eligibility ────────────────────────────────────────────────────

export function isCampaignActive(campaign = {}) {
  if (!campaign || campaign.active === false) return false
  const now = Date.now()
  if (campaign.startsAt) {
    const start = typeof campaign.startsAt?.toDate === 'function' ? campaign.startsAt.toDate().getTime() : new Date(campaign.startsAt).getTime()
    if (now < start) return false
  }
  if (campaign.endsAt) {
    const end = typeof campaign.endsAt?.toDate === 'function' ? campaign.endsAt.toDate().getTime() : new Date(campaign.endsAt).getTime()
    if (now > end) return false
  }
  return true
}

export function activeCampaignsForToday(campaigns = []) {
  return (Array.isArray(campaigns) ? campaigns : []).filter((c) => {
    if (!isCampaignActive(c)) return false
    const daysOfWeek = c.daysOfWeek
    if (Array.isArray(daysOfWeek) && daysOfWeek.length > 0) {
      const today = new Date().getDay()
      if (!daysOfWeek.includes(today)) return false
    }
    if (c.type === 'happy_hour' && c.happyHourStart && c.happyHourEnd) {
      const now = new Date()
      const hrs = now.getHours() + now.getMinutes() / 60
      if (hrs < Number(c.happyHourStart) || hrs > Number(c.happyHourEnd)) return false
    }
    return true
  })
}

// ─── Membership ID Generation ────────────────────────────────────────────────

export function generateMembershipId({ prefix = 'MEM', workspaceCode = 'NX', counter = 1 } = {}) {
  const num = String(Math.max(1, Number(counter))).padStart(6, '0')
  return `${prefix}-${workspaceCode}-${num}`
}

export function generateQRPayload({ workspaceId = '', accountId = '', membershipId = '' } = {}) {
  return JSON.stringify({ type: 'membership', ws: workspaceId, acc: accountId, mem: membershipId, ts: Date.now() })
}

// ─── Default Settings ────────────────────────────────────────────────────────

export const LOYALTY_SETTINGS_DEFAULTS = {
  autoEnrollCustomers: true,
  enablePointsEngine: true,
  enableRewardsEngine: true,
  enableCouponSystem: true,
  enableReferralSystem: true,
  enableBirthdayAutomation: true,
  enableWallet: true,
  enableCampaigns: true,
  pointEarningRules: { ...POINT_EARNING_RULES_DEFAULTS },
  defaultTier: 'bronze',
  membershipIdPrefix: 'MEM',
  birthdayCouponDaysBefore: 3,
  birthdayCouponValidDays: 14,
  birthdayCouponDiscountType: 'percentage',
  birthdayCouponDiscountValue: 10,
  birthdayCouponMaxDiscount: 500,
  autoDowngradeAfterDays: 180,
  referralCouponDiscountType: 'percentage',
  referralCouponDiscountValue: 5,
  referralCouponValidDays: 30,
}
