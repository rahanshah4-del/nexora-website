export const kpis = {
  totalRevenue: 248750,
  totalCustomers: 1428,
  activeLeads: 312,
  monthlySales: 874,
}

export const revenueSeries = [
  { month: 'Jan', revenue: 32000 },
  { month: 'Feb', revenue: 41000 },
  { month: 'Mar', revenue: 38000 },
  { month: 'Apr', revenue: 52000 },
  { month: 'May', revenue: 61000 },
  { month: 'Jun', revenue: 57750 },
]

export const salesSeries = [
  { week: 'W1', sales: 120 },
  { week: 'W2', sales: 180 },
  { week: 'W3', sales: 155 },
  { week: 'W4', sales: 219 },
]

export const recentCustomers = [
  {
    id: 'CUS-10021',
    name: 'Ayesha Khan',
    company: 'Skyline Retail',
    email: 'ayesha@skylineretail.com',
    plan: 'Pro',
    status: 'Active',
    spend: 12400,
    createdAt: '2026-05-18',
  },
  {
    id: 'CUS-10020',
    name: 'Omar Ali',
    company: 'Nova Logistics',
    email: 'omar@novalogistics.io',
    plan: 'Standard',
    status: 'Active',
    spend: 3200,
    createdAt: '2026-05-17',
  },
  {
    id: 'CUS-10019',
    name: 'Fatima Noor',
    company: 'BrightLabs',
    email: 'fatima@brightlabs.ai',
    plan: 'Standard',
    status: 'At Risk',
    spend: 8600,
    createdAt: '2026-05-16',
  },
  {
    id: 'CUS-10018',
    name: 'Hassan Raza',
    company: 'Aurum Fintech',
    email: 'hassan@aurumfintech.com',
    plan: 'Pro',
    status: 'Active',
    spend: 9400,
    createdAt: '2026-05-15',
  },
  {
    id: 'CUS-10017',
    name: 'Zara Siddiqui',
    company: 'Studio Atlas',
    email: 'zara@studioatlas.design',
    plan: 'Free',
    status: 'Trial',
    spend: 0,
    createdAt: '2026-05-14',
  },
]

export const leads = [
  { id: 'LD-201', name: 'Bilal Ahmed', source: 'Website', stage: 'Qualified', score: 78, replySpeed: 70, meetingsAttended: 2, paymentHistory: 0, activityFrequency: 62 },
  { id: 'LD-202', name: 'Sara Malik', source: 'Referral', stage: 'Contacted', score: 62, replySpeed: 58, meetingsAttended: 1, paymentHistory: 0, activityFrequency: 55 },
  { id: 'LD-203', name: 'James Carter', source: 'LinkedIn', stage: 'Proposal', score: 88, replySpeed: 86, meetingsAttended: 3, paymentHistory: 40, activityFrequency: 78 },
  { id: 'LD-204', name: 'Emily Stone', source: 'Ad Campaign', stage: 'New', score: 55, replySpeed: 42, meetingsAttended: 0, paymentHistory: 0, activityFrequency: 38 },
  { id: 'LD-205', name: 'Noah Park', source: 'Webinar', stage: 'Negotiation', score: 92, replySpeed: 90, meetingsAttended: 4, paymentHistory: 65, activityFrequency: 84 },
]

export const pipeline = [
  { stage: 'New', value: 46 },
  { stage: 'Qualified', value: 68 },
  { stage: 'Proposal', value: 35 },
  { stage: 'Negotiation', value: 21 },
  { stage: 'Won', value: 14 },
]

export const activityTimeline = [
  {
    id: 'a1',
    title: 'Deal moved to Negotiation',
    detail: 'Aurum Fintech — $18,000 ARR',
    time: '10:24 AM',
    badge: 'Pipeline',
  },
  {
    id: 'a2',
    title: 'New customer onboarded',
    detail: 'Skyline Retail added 12 seats',
    time: '09:05 AM',
    badge: 'Customers',
  },
  {
    id: 'a3',
    title: 'Lead qualified',
    detail: 'James Carter — score 88',
    time: 'Yesterday',
    badge: 'Leads',
  },
  {
    id: 'a4',
    title: 'Monthly report generated',
    detail: 'Revenue analytics exported',
    time: '2 days ago',
    badge: 'Reports',
  },
]
