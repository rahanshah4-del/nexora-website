function daysAgo(d) {
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export const supportTicketsDemo = [
  {
    id: 'TCK-101',
    ticketNumber: 'TCK-101',
    customerName: 'Skyline Retail',
    customerEmail: 'support@skyline-retail.com',
    subject: 'Invoice export not showing totals',
    message: 'When exporting an invoice (PDF coming soon), totals are missing from the preview.',
    status: 'Open',
    priority: 'High',
    assignedTo: 'Support Agent',
    comments: [
      { id: 'c1', author: 'Customer', message: 'Happens for INV-1047 as well.', createdAt: daysAgo(3) },
      { id: 'c2', author: 'Support Agent', message: 'Thanks—checking formatting rules.', createdAt: daysAgo(2) },
    ],
    createdAt: daysAgo(4),
    updatedAt: daysAgo(2),
  },
  {
    id: 'TCK-102',
    ticketNumber: 'TCK-102',
    customerName: 'Aurum Fintech',
    customerEmail: 'ops@aurum.com',
    subject: 'Need billing cycle change',
    message: 'Please switch our subscription billing cycle to yearly.',
    status: 'In Progress',
    priority: 'Medium',
    assignedTo: 'Accountant',
    comments: [{ id: 'c1', author: 'Accountant', message: 'Confirming annual pricing and next billing date.', createdAt: daysAgo(5) }],
    createdAt: daysAgo(6),
    updatedAt: daysAgo(4),
  },
  {
    id: 'TCK-103',
    ticketNumber: 'TCK-103',
    customerName: 'BrightLabs',
    customerEmail: 'hello@brightlabs.io',
    subject: 'Can we add 5 more team seats?',
    message: 'We need 5 additional seats for next month. Please advise.',
    status: 'Resolved',
    priority: 'Low',
    assignedTo: 'Manager',
    comments: [{ id: 'c1', author: 'Manager', message: 'Approved. Please submit a Standard package request for more seats.', createdAt: daysAgo(12) }],
    createdAt: daysAgo(14),
    updatedAt: daysAgo(12),
  },
]
