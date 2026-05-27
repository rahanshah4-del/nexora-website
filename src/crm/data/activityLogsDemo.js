function minutesAgo(min) {
  return new Date(Date.now() - min * 60 * 1000).toISOString()
}

function hoursAgo(h) {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString()
}

function daysAgo(d) {
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString()
}

export const activityLogsDemo = [
  {
    id: 'act_1',
    userId: 'Demo',
    userName: 'Admin User',
    module: 'Auth',
    action: 'Login',
    description: 'User logged in successfully.',
    priority: 'low',
    createdAt: minutesAgo(18),
    metadata: { provider: 'password' },
  },
  {
    id: 'act_2',
    userId: 'Demo',
    userName: 'Admin User',
    module: 'Invoices',
    action: 'Invoice Updated',
    description: 'Invoice INV-1047 status changed to Pending.',
    priority: 'medium',
    createdAt: hoursAgo(3),
    metadata: { invoiceNumber: 'INV-1047', status: 'Pending' },
  },
  {
    id: 'act_3',
    userId: 'Demo',
    userName: 'Manager',
    module: 'Team',
    action: 'Role Changed',
    description: 'Updated role for Ayesha to Manager.',
    priority: 'medium',
    createdAt: hoursAgo(10),
    metadata: { member: 'Ayesha', role: 'Manager' },
  },
  {
    id: 'act_4',
    userId: 'Demo',
    userName: 'Accountant',
    module: 'Payments',
    action: 'Payment Approved',
    description: 'Manual payment approved for INV-1042.',
    priority: 'high',
    createdAt: daysAgo(1),
    metadata: { invoiceNumber: 'INV-1042', method: 'Manual' },
  },
  {
    id: 'act_5',
    userId: 'Demo',
    userName: 'Support Agent',
    module: 'Support',
    action: 'Ticket Updated',
    description: 'Ticket TCK-102 moved to In Progress.',
    priority: 'medium',
    createdAt: daysAgo(3),
    metadata: { ticketNumber: 'TCK-102', status: 'In Progress' },
  },
  {
    id: 'act_6',
    userId: 'Demo',
    userName: 'Admin User',
    module: 'Subscriptions',
    action: 'Plan Changed',
    description: 'Subscription upgraded to Business (approved).',
    priority: 'high',
    createdAt: daysAgo(7),
    metadata: { from: 'Free', to: 'Business', billingCycle: 'monthly' },
  },
]
