/**
 * Optional monthly add-ons shown on /pricing. Prices are PKR and go through the
 * currency selector (formatPrice). `free: true` shows "Free" instead of a price.
 * Pay-annually copy follows PLATFORM_YEARLY_DISCOUNT (20%), the rule the plans use.
 */
export const ADD_ONS = [
  { id: 'terminal', title: 'Additional Terminal', amount: 1000, unit: '/mo', text: 'Each extra POS terminal or tablet on any plan. Add as many as your counter needs.' },
  { id: 'user', title: 'Additional User', amount: 500, unit: '/mo', text: 'Need more team members than your plan includes? Each additional staff member or manager account is billed monthly.' },
  { id: 'owner-app', title: 'Owner App', from: true, amount: 5000, unit: '/mo per branch', text: 'On iPhone and Android: today’s sales, net profit, your full P&L, branch comparison and shift cash reconciliation, in your pocket.' },
  { id: 'online-ordering', title: 'Online Ordering Website', from: true, amount: 40000, once: true, then: 5000, unit: '/mo', text: 'Your own branded ordering site on your own domain, with the menu synced from your POS and updates handled by our team. No commission on orders.' },
  { id: 'compliance', title: 'PRA / FBR Compliance', free: true, wide: true, text: 'For businesses that must report to PRA or FBR. Free on every plan and every module (Restaurant, Retail and the rest): ask us and we switch it on for your account. No extra charge.' },
  { id: 'annual', title: 'Pay Annually', label: 'Save 20%', text: 'Pay yearly instead of monthly and get 20% off your plan price. Setup and data migration are free either way.' },
  { id: 'branches', title: 'Per-Branch Pricing', label: 'Your own plan per branch', text: 'Each branch is its own subscription with its own plan, users and data. You can mix plans across branches.' },
]
