export const clientPortalDemo = {
  project: {
    name: 'NEXORA CRM Implementation',
    status: 'In Progress',
    steps: [
      { id: 's1', label: 'Kickoff', done: true },
      { id: 's2', label: 'Requirements', done: true },
      { id: 's3', label: 'Implementation', done: true },
      { id: 's4', label: 'QA & UAT', done: false },
      { id: 's5', label: 'Go Live', done: false },
    ],
    lastUpdate: '2026-05-22',
  },
  invoices: [
    {
      id: 'INV-1047',
      invoiceNumber: 'INV-1047',
      customerName: 'Demo Client',
      customerEmail: 'demo@nexora.solutions',
      totalUsd: 950,
      currency: 'USD',
      status: 'Pending',
      dueDate: '2026-05-30',
      createdAt: '2026-05-18',
    },
    {
      id: 'INV-1042',
      invoiceNumber: 'INV-1042',
      customerName: 'Demo Client',
      customerEmail: 'demo@nexora.solutions',
      totalUsd: 1200,
      currency: 'USD',
      status: 'Paid',
      dueDate: '2026-05-12',
      createdAt: '2026-05-02',
    },
  ],
  payments: [
    {
      id: 'PAY-201',
      invoiceId: 'INV-1042',
      customerName: 'Demo Client',
      amountUsd: 1200,
      currency: 'USD',
      paymentMethod: 'Manual',
      paymentStatus: 'Paid',
      paidAt: '2026-05-10',
      reference: 'TXN-889122',
    },
  ],
  subscription: {
    plan: 'Free',
    planStatus: 'inactive',
    billingCycle: 'monthly',
    nextBillingDate: '—',
    seats: 1,
  },
  activity: [
    { id: 'a1', title: 'Invoice created', detail: 'Invoice INV-1047 created', badge: 'Invoices', time: '2d ago' },
    { id: 'a2', title: 'Payment received', detail: 'Payment confirmed for INV-1042', badge: 'Payments', time: '12d ago' },
    { id: 'a3', title: 'Project update', detail: 'Implementation milestone completed', badge: 'Project', time: '2w ago' },
  ],
}

