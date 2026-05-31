import { planCatalog } from './moduleAccess.js'

export const plansDemo = planCatalog

export const subscriptionsDemo = [
  {
    id: 'SUB-001',
    userId: 'Demo',
    plan: 'Basic',
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
    plan: 'Basic',
    billingCycle: 'monthly',
    status: 'active',
    changedAt: '2026-05-01',
    note: 'Initial package',
  },
  {
    id: 'hist_2',
    plan: 'Standard',
    billingCycle: 'monthly',
    status: 'expired',
    changedAt: '2026-05-12',
    note: 'Standard package activated',
  },
]
