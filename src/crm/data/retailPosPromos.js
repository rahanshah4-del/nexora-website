export const retailPosPromoCodes = {
  'WELCOME-NEXORA': { type: 'percent', value: 5, label: '5% welcome promo' },
  NEXORA5: { type: 'percent', value: 5, label: '5% promo' },
  NEXORA10: { type: 'percent', value: 10, label: '10% promo' },
  SAVE100: { type: 'flat', value: 100, label: 'PKR 100 off' },
}

export const retailPosDiscountTips = [
  'Only approved promo codes apply discount in POS Billing.',
  'POS tax default applies automatically but cashier can still adjust it.',
  'Invoice tax default applies to new invoice rows without product-specific tax.',
  'Promo discount is saved with POS Orders and Retail reports.',
]
