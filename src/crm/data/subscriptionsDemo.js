export const plansDemo = [
  {
    id: 'Free',
    name: 'Free',
    badge: 'Free',
    description: 'Basics for getting started',
    monthlyUsd: 0,
    yearlyUsd: 0,
    features: ['Core CRM', 'Basic invoices', 'Limited analytics'],
  },
  {
    id: 'Starter',
    name: 'Starter',
    badge: 'Pro',
    description: 'For solo and small teams',
    monthlyUsd: 29,
    yearlyUsd: 290,
    features: ['Starter dashboards', 'Team basics', 'Email alerts'],
  },
  {
    id: 'Business',
    name: 'Business',
    badge: 'Best',
    description: 'Advanced analytics + permissions',
    monthlyUsd: 79,
    yearlyUsd: 790,
    features: ['Advanced reports', 'RBAC & team', 'Export reports', 'Usage analytics'],
  },
  {
    id: 'Enterprise',
    name: 'Enterprise',
    badge: 'Enterprise',
    description: 'Multi-branch + audit + SLA',
    monthlyUsd: 199,
    yearlyUsd: 1990,
    features: ['Multi-branch', 'Audit logs', 'Dedicated support', 'Custom limits'],
  },
]

export const subscriptionsDemo = [
  {
    id: 'SUB-001',
    userId: 'demo',
    plan: 'Free',
    planStatus: 'active',
    billingCycle: 'monthly',
    expiresOn: '2026-06-21',
    renewsOn: '2026-06-21',
    usage: {
      storageUsedGb: 7.6,
      storageLimitGb: 10,
      teamMembersUsed: 4,
      teamMembersLimit: 5,
      reportsGenerated: 46,
      reportsLimit: 60,
      apiRequests: 82000,
      apiRequestsLimit: 100000,
    },
  },
]

export const subscriptionHistoryDemo = [
  {
    id: 'hist_1',
    plan: 'Free',
    billingCycle: 'monthly',
    status: 'active',
    changedAt: '2026-05-01',
    note: 'Initial plan',
  },
  {
    id: 'hist_2',
    plan: 'Starter',
    billingCycle: 'monthly',
    status: 'expired',
    changedAt: '2026-05-12',
    note: 'Trial ended (demo)',
  },
]

