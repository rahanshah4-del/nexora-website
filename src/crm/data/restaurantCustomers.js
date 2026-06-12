export const restaurantCustomersStorageKey = 'nexora.restaurant.customers.v2'

export const restaurantCustomersSeed = [
  {
    id: 'cust-walkin',
    name: 'Walk-in Guest',
    phone: '',
    address: '',
    creditBalance: 0,
    paidAmount: 0,
    lastVisit: '2026-06-12',
    notes: 'Default counter customer.',
    orderHistory: [],
  },
]

export function loadRestaurantCustomers() {
  if (typeof window === 'undefined') return restaurantCustomersSeed
  try {
    const stored = window.localStorage.getItem(restaurantCustomersStorageKey)
    const parsed = stored ? JSON.parse(stored) : null
    return Array.isArray(parsed) && parsed.length ? parsed : restaurantCustomersSeed
  } catch {
    return restaurantCustomersSeed
  }
}

export function saveRestaurantCustomers(customers) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(restaurantCustomersStorageKey, JSON.stringify(customers))
}

export function applyRestaurantCustomerPayment(customers, customerId, payment) {
  const paid = Math.max(0, Number(payment?.paidAmount || 0))
  const total = Math.max(0, Number(payment?.total || 0))
  const due = Math.max(0, total - paid)
  const today = new Date().toISOString().slice(0, 10)
  return customers.map((customer) => {
    if (customer.id !== customerId) return customer
    return {
      ...customer,
      creditBalance: Math.max(0, Number(customer.creditBalance || 0) + due),
      paidAmount: Math.max(0, Number(customer.paidAmount || 0) + Math.min(paid, total)),
      lastVisit: today,
      orderHistory: [
        {
          orderNumber: payment?.orderNumber || '#45266',
          total,
          paid: Math.min(paid, total),
          due,
          method: payment?.paymentMethod || 'Cash',
          date: today,
        },
        ...(customer.orderHistory || []),
      ],
    }
  })
}
