export const BUSINESS_SERVICES_COLLECTION = 'businessServices'
export const BUSINESS_SERVICE_REQUESTS_COLLECTION = 'businessServiceRequests'

export const businessServicePriceTypes = ['monthly', 'one-time', 'custom']

export const businessServiceRequestStatuses = [
  'New',
  'Under Review',
  'Proposal Sent',
  'Approved',
  'Active',
  'Rejected',
  'Closed',
]

export const defaultBusinessServices = [
  {
    id: 'back-office-setup',
    title: 'Back Office Setup',
    description: 'Initial workflows, tools, records, and admin processes prepared for daily operations.',
    startingPrice: 25000,
    priceType: 'one-time',
    enabled: true,
    featured: true,
    sortOrder: 10,
  },
  {
    id: 'data-entry-operator',
    title: 'Data Entry Operator',
    description: 'Dedicated support for clean customer, product, invoice, and operational data entry.',
    startingPrice: 45000,
    priceType: 'monthly',
    enabled: true,
    featured: false,
    sortOrder: 20,
  },
  {
    id: 'virtual-assistant',
    title: 'Virtual Assistant',
    description: 'Remote assistant support for scheduling, follow-ups, coordination, and admin tasks.',
    startingPrice: 50000,
    priceType: 'monthly',
    enabled: true,
    featured: true,
    sortOrder: 30,
  },
  {
    id: 'accounting-bookkeeping',
    title: 'Accounting / Bookkeeping',
    description: 'Routine bookkeeping, expense tracking, invoice support, and finance record cleanup.',
    startingPrice: 35000,
    priceType: 'monthly',
    enabled: true,
    featured: false,
    sortOrder: 40,
  },
  {
    id: 'customer-support',
    title: 'Customer Support',
    description: 'Customer query handling, ticket follow-up, and support desk coordination.',
    startingPrice: 55000,
    priceType: 'monthly',
    enabled: true,
    featured: false,
    sortOrder: 50,
  },
  {
    id: 'lead-generation',
    title: 'Lead Generation',
    description: 'Prospect list building, outreach support, and lead qualification assistance.',
    startingPrice: 40000,
    priceType: 'monthly',
    enabled: true,
    featured: false,
    sortOrder: 60,
  },
  {
    id: 'social-media-management',
    title: 'Social Media Management',
    description: 'Content scheduling, page management, message tracking, and basic reporting.',
    startingPrice: 45000,
    priceType: 'monthly',
    enabled: true,
    featured: false,
    sortOrder: 70,
  },
  {
    id: 'website-management',
    title: 'Website Management',
    description: 'Website updates, content changes, page maintenance, and basic technical support.',
    startingPrice: 30000,
    priceType: 'monthly',
    enabled: true,
    featured: false,
    sortOrder: 80,
  },
  {
    id: 'custom-development',
    title: 'Custom Development',
    description: 'Custom modules, integrations, workflow automation, and tailored business tools.',
    startingPrice: 0,
    priceType: 'custom',
    enabled: true,
    featured: true,
    sortOrder: 90,
  },
]

export function normalizeBusinessService(record = {}, fallbackId = '') {
  const base = record || {}
  const id = String(base.id || fallbackId || '').trim()
  const title = String(base.title || '').trim()
  return {
    id,
    title,
    description: String(base.description || '').trim(),
    startingPrice: Math.max(0, Math.floor(Number(base.startingPrice || 0) || 0)),
    priceType: businessServicePriceTypes.includes(base.priceType) ? base.priceType : 'custom',
    enabled: base.enabled !== false,
    featured: base.featured === true,
    sortOrder: Number.isFinite(Number(base.sortOrder)) ? Number(base.sortOrder) : 999,
    createdAt: base.createdAt || null,
    updatedAt: base.updatedAt || null,
  }
}

export function sortBusinessServices(services = []) {
  return [...services].sort((a, b) => {
    const order = Number(a.sortOrder || 999) - Number(b.sortOrder || 999)
    if (order !== 0) return order
    return String(a.title || '').localeCompare(String(b.title || ''))
  })
}

export function enabledBusinessServices(services = []) {
  return sortBusinessServices(services).filter((service) => service.enabled !== false)
}

export function formatBusinessServicePrice(service = {}) {
  if (service.priceType === 'custom' || !Number(service.startingPrice)) return 'Custom pricing'
  return `Rs ${Number(service.startingPrice).toLocaleString('en-PK')}`
}

export function businessServicePriceTypeLabel(priceType = 'custom') {
  if (priceType === 'monthly') return 'Monthly'
  if (priceType === 'one-time') return 'One-time'
  return 'Custom'
}

export function businessServiceDocId(title = '') {
  return String(title || 'business-service')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80) || 'business-service'
}
