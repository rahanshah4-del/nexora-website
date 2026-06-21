import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from './firebase.js'
import { workspaceCollectionPath } from './firestore.js'
import { normalizeBusinessType } from '../data/moduleAccess.js'

function isoDate(offsetDays = 0) {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  return date.toISOString()
}

function shortDate(offsetDays = 0) {
  return isoDate(offsetDays).slice(0, 10)
}

function invoiceNumber(batchId, index) {
  return `NX-${batchId.slice(-5).toUpperCase()}-${String(index + 1).padStart(3, '0')}`
}

function invoiceItem(name, amount) {
  return {
    name,
    description: 'Sales Hub test invoice item',
    quantity: 1,
    qty: 1,
    price: amount,
    rate: amount,
    discount: 0,
    discountPercent: 0,
    taxRate: 0,
    taxAmount: 0,
    taxableAmount: amount,
    lineSubtotal: amount,
    lineTotal: amount,
  }
}

function invoiceTotals(total, amountPaid = 0) {
  const paid = Math.min(Math.max(Number(amountPaid || 0), 0), total)
  return {
    subtotal: total,
    subtotalUsd: total,
    discount: 0,
    discountTotal: 0,
    taxableAmount: total,
    taxRate: 0,
    taxAmount: 0,
    taxAmountUsd: 0,
    taxTotal: 0,
    roundOff: 0,
    total,
    totalUsd: total,
    amountPaid: paid,
    partialPaidAmount: paid,
    balanceDue: Math.max(total - paid, 0),
  }
}

function customerRows(batchId) {
  const suffix = batchId.slice(-4)
  return [
    { name: `Atlas Traders Test ${suffix}`, email: `atlas.${batchId}@customer.test`, phone: '+92 300 4100001', company: 'Atlas Traders', customerType: 'Business', status: 'Active', source: 'sales-hub-test-seed' },
    { name: `Nova Retail Test ${suffix}`, email: `nova.${batchId}@customer.test`, phone: '+92 300 4100002', company: 'Nova Retail', customerType: 'Business', status: 'Active', source: 'sales-hub-test-seed' },
    { name: `Crescent Foods Test ${suffix}`, email: `crescent.${batchId}@customer.test`, phone: '+92 300 4100003', company: 'Crescent Foods', customerType: 'Business', status: 'Active', source: 'sales-hub-test-seed' },
  ]
}

function leadRows(batchId) {
  const suffix = batchId.slice(-4)
  return [
    { name: `Hamza Hot Lead ${suffix}`, email: `hamza.${batchId}@lead.test`, phone: '+92 300 4200001', company: 'Vertex Labs', status: 'Qualified', source: 'Website', dealValue: 185000, expectedValuePkr: 185000, replySpeed: 95, activityFrequency: 90, paymentHistory: 80, meetings: 3, lastContactDate: shortDate(0) },
    { name: `Sana New Lead ${suffix}`, email: `sana.${batchId}@lead.test`, phone: '+92 300 4200002', company: 'Blue Mart', status: 'New', source: 'Facebook', dealValue: 95000, expectedValuePkr: 95000, replySpeed: 72, activityFrequency: 66, paymentHistory: 45, meetings: 1, lastContactDate: shortDate(-2) },
    { name: `Bilal Converted Lead ${suffix}`, email: `bilal.${batchId}@lead.test`, phone: '+92 300 4200003', company: 'Prime Services', status: 'Converted', source: 'Referral', dealValue: 120000, expectedValuePkr: 120000, replySpeed: 88, activityFrequency: 85, paymentHistory: 90, meetings: 4, lastContactDate: shortDate(-1) },
    { name: `Areeba Follow-up Lead ${suffix}`, email: `areeba.${batchId}@lead.test`, phone: '+92 300 4200004', company: 'Apex Studio', status: 'Contacted', source: 'WhatsApp', dealValue: 65000, expectedValuePkr: 65000, replySpeed: 58, activityFrequency: 55, paymentHistory: 25, meetings: 1, lastContactDate: shortDate(-5) },
  ]
}

function productRows(batchId) {
  const suffix = batchId.slice(-4)
  return [
    { name: `CRM Starter Test ${suffix}`, title: `CRM Starter Test ${suffix}`, sku: `CRM-ST-${suffix}`, category: 'Software', description: 'Starter Sales Hub test package.', unitPrice: 45000, costPrice: 18000, tax: 0, status: 'Active', source: 'sales-hub-test-seed' },
    { name: `CRM Business Test ${suffix}`, title: `CRM Business Test ${suffix}`, sku: `CRM-BZ-${suffix}`, category: 'Software', description: 'Business Sales Hub test package.', unitPrice: 95000, costPrice: 38000, tax: 0, status: 'Active', source: 'sales-hub-test-seed' },
    { name: `Onboarding Service Test ${suffix}`, title: `Onboarding Service Test ${suffix}`, sku: `SVC-ON-${suffix}`, category: 'Service', description: 'Implementation and onboarding service.', unitPrice: 30000, costPrice: 10000, tax: 0, status: 'Active', source: 'sales-hub-test-seed' },
  ]
}

function dealRows(customers, batchId, currency) {
  const suffix = batchId.slice(-4)
  return [
    { dealId: `NXD-${suffix}-01`, title: `Atlas CRM Rollout Test ${suffix}`, customerId: customers[0].id, customerName: customers[0].name, value: 185000, currency, stage: 'Proposal', probability: 60, expectedRevenue: 111000, expectedCloseDate: shortDate(12), owner: 'Sales Admin', priority: 'High', source: 'Website', status: 'Open', sourceTag: 'sales-hub-test-seed' },
    { dealId: `NXD-${suffix}-02`, title: `Nova Retail Upgrade Test ${suffix}`, customerId: customers[1].id, customerName: customers[1].name, value: 95000, currency, stage: 'Negotiation', probability: 80, expectedRevenue: 76000, expectedCloseDate: shortDate(7), owner: 'Sales Admin', priority: 'High', source: 'Referral', status: 'Open', sourceTag: 'sales-hub-test-seed' },
    { dealId: `NXD-${suffix}-03`, title: `Crescent Support Plan Test ${suffix}`, customerId: customers[2].id, customerName: customers[2].name, value: 72000, currency, stage: 'Won', probability: 100, expectedRevenue: 72000, expectedCloseDate: shortDate(-4), owner: 'Account Manager', priority: 'Medium', source: 'WhatsApp', status: 'Won', sourceTag: 'sales-hub-test-seed' },
    { dealId: `NXD-${suffix}-04`, title: `Legacy Migration Test ${suffix}`, customerName: 'Legacy Systems Test', value: 56000, currency, stage: 'Lost', probability: 0, expectedRevenue: 0, expectedCloseDate: shortDate(-8), owner: 'Sales Admin', priority: 'Low', source: 'Cold Call', status: 'Lost', sourceTag: 'sales-hub-test-seed' },
  ]
}

function taskRows(batchId) {
  const suffix = batchId.slice(-4)
  return [
    { title: `Call Atlas decision maker ${suffix}`, type: 'Call', customerName: 'Atlas Traders', dueDate: shortDate(-1), owner: 'Sales Admin', priority: 'High', status: 'Overdue', source: 'sales-hub-test-seed' },
    { title: `Send Nova revised proposal ${suffix}`, type: 'Email', customerName: 'Nova Retail', dueDate: shortDate(0), owner: 'Sales Admin', priority: 'High', status: 'Today', source: 'sales-hub-test-seed' },
    { title: `Crescent onboarding meeting ${suffix}`, type: 'Meeting', customerName: 'Crescent Foods', dueDate: shortDate(3), owner: 'Account Manager', priority: 'Medium', status: 'Upcoming', source: 'sales-hub-test-seed' },
    { title: `Verify converted lead notes ${suffix}`, type: 'Reminder', customerName: 'Prime Services', dueDate: shortDate(-2), owner: 'Sales Admin', priority: 'Low', status: 'Completed', completedAt: isoDate(-2), source: 'sales-hub-test-seed' },
  ]
}

function quoteRows(batchId, currency) {
  const suffix = batchId.slice(-4).toUpperCase()
  const rows = [
    { customerName: 'Atlas Traders', status: 'Sent', amount: 185000, validUntil: shortDate(14) },
    { customerName: 'Nova Retail', status: 'Accepted', amount: 95000, validUntil: shortDate(10) },
    { customerName: 'Apex Studio', status: 'Draft', amount: 65000, validUntil: shortDate(21) },
  ]
  return rows.map((row, index) => {
    const items = [{ name: index === 1 ? 'CRM Business' : 'CRM Starter & Services', qty: 1, unitPrice: row.amount }]
    return {
      title: `QT-${suffix}-${index + 1}`,
      quoteNumber: `QT-${suffix}-${String(index + 1).padStart(2, '0')}`,
      customerName: row.customerName,
      items,
      itemsText: `${items[0].name} | 1 | ${row.amount}`,
      currency,
      discountPercent: 0,
      discountRate: 0,
      discountTotal: 0,
      taxPercent: 0,
      taxRate: 0,
      taxTotal: 0,
      subtotal: row.amount,
      grandTotal: row.amount,
      validUntil: row.validUntil,
      status: row.status,
      source: 'sales-hub-test-seed',
    }
  })
}

function activityRows(batchId) {
  const suffix = batchId.slice(-4)
  return [
    { title: `Atlas proposal sent ${suffix}`, type: 'Quote Change', relatedTo: 'Atlas Traders', owner: 'Sales Admin', activityDate: shortDate(0), status: 'Logged', notes: 'Test proposal activity.', source: 'sales-hub-test-seed' },
    { title: `Nova negotiation call ${suffix}`, type: 'Call', relatedTo: 'Nova Retail', owner: 'Sales Admin', activityDate: shortDate(-1), status: 'Follow-up Needed', notes: 'Test sales call activity.', source: 'sales-hub-test-seed' },
    { title: `Crescent deal won ${suffix}`, type: 'Deal Change', relatedTo: 'Crescent Foods', owner: 'Account Manager', activityDate: shortDate(-4), status: 'Completed', notes: 'Test won deal activity.', source: 'sales-hub-test-seed' },
  ]
}

export async function seedSalesHubTestData({
  workspaceId,
  userId,
  businessType = 'General CRM',
  currency = 'PKR',
} = {}) {
  if (!workspaceId || !userId) {
    return { ok: false, error: 'Login/workspace required before adding Sales Hub test data.' }
  }
  if (!db) {
    return { ok: false, error: 'Secure Cloud Sync is not available right now.' }
  }

  const normalizedBusinessType = normalizeBusinessType(businessType) || 'General CRM'
  const batchId = `test-${Date.now().toString(36)}`
  const seedMeta = { seedBatchId: batchId }
  const batch = writeBatch(db)
  const queueRows = (collectionName, rows) => rows.map((row) => {
    const ref = doc(collection(db, workspaceCollectionPath(workspaceId, collectionName)))
    const payload = {
      ...row,
      ...seedMeta,
      ownerId: workspaceId,
      userId: workspaceId,
      workspaceId,
      businessType: normalizedBusinessType,
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    batch.set(ref, payload)
    return { id: ref.id, ...row, ...seedMeta }
  })

  const customers = queueRows('customers', customerRows(batchId))
  const leads = queueRows('leads', leadRows(batchId))
  const products = queueRows('salesProducts', productRows(batchId))
  const deals = queueRows('salesDeals', dealRows(customers, batchId, currency))
  const tasks = queueRows('salesTasks', taskRows(batchId))
  const quotes = queueRows('salesQuotes', quoteRows(batchId, currency))
  const activities = queueRows('salesActivities', activityRows(batchId))

  const invoiceInputs = [
    { customer: customers[0], total: 85000, paid: 85000, status: 'paid', method: 'Bank Transfer' },
    { customer: customers[1], total: 120000, paid: 45000, status: 'partial_paid', method: 'Card' },
    { customer: customers[2], total: 68000, paid: 0, status: 'pending', method: 'Bank Transfer' },
  ]
  const invoices = []
  const payments = []
  for (let index = 0; index < invoiceInputs.length; index += 1) {
    const input = invoiceInputs[index]
    const number = invoiceNumber(batchId, index)
    const totals = invoiceTotals(input.total, input.paid)
    const [invoice] = queueRows('invoices', [{
        ...seedMeta,
        source: 'sales-hub-test-seed',
        invoiceNumber: number,
        customerId: input.customer.id,
        customerName: input.customer.name,
        customerEmail: input.customer.email,
        customerPhone: input.customer.phone,
        issueDate: shortDate(-5),
        invoiceDate: shortDate(-5),
        dueDate: shortDate(10),
        items: [invoiceItem('Nexora Sales Hub Package', input.total)],
        currency,
        status: input.status,
        paymentStatus: input.status,
        approvalStatus: input.status === 'pending' ? 'pending' : 'approved',
        requiresApproval: input.status === 'pending',
        approvedAt: input.status === 'pending' ? null : isoDate(-4),
        paidAt: input.paid > 0 ? isoDate(-3) : null,
        lastPaymentAt: input.paid > 0 ? isoDate(-3) : null,
        lastPaymentDate: input.paid > 0 ? isoDate(-3) : null,
        paymentMethod: input.method,
        paymentHistory: [],
        notes: 'Sales Hub dashboard test invoice.',
        ...totals,
      }])
    invoices.push({ id: invoice.id, invoiceNumber: number })

    if (input.paid > 0) {
      const [payment] = queueRows('payments', [{
          ...seedMeta,
          source: 'sales-hub-test-seed',
          invoiceId: invoice.id,
          invoiceNumber: number,
          customerId: input.customer.id,
          customerName: input.customer.name,
          amount: input.paid,
          amountPaid: input.paid,
          amountUsd: input.paid,
          appliedAmount: input.paid,
          currency,
          paymentMethod: input.method,
          paymentStatus: input.status === 'paid' ? 'paid' : 'partial_paid',
          status: input.status === 'paid' ? 'paid' : 'partial_paid',
          approvalStatus: 'approved',
          paidAt: isoDate(-3),
          approvedAt: isoDate(-3),
          approvedBy: userId,
        }])
      payments.push({ id: payment.id })
    }
  }

  const expenses = queueRows('expenses', [
    { title: `Sales Campaign Test ${batchId.slice(-4)}`, category: 'Marketing', amount: 22000, currency, paymentMethod: 'Bank Transfer', paidBy: 'Sales Admin', status: 'approved', approvalStatus: 'approved', requiresApproval: false, approvedAt: isoDate(-2), source: 'sales-hub-test-seed' },
    { title: `Client Visit Test ${batchId.slice(-4)}`, category: 'Travel', amount: 8500, currency, paymentMethod: 'Cash', paidBy: 'Sales Admin', status: 'pending', approvalStatus: 'pending', requiresApproval: true, source: 'sales-hub-test-seed' },
  ])
  const tickets = queueRows('supportTickets', [
    { subject: `Atlas onboarding help ${batchId.slice(-4)}`, title: `Atlas onboarding help ${batchId.slice(-4)}`, customerName: 'Atlas Traders', priority: 'High', status: 'Open', description: 'Sales Hub test support ticket.', source: 'sales-hub-test-seed' },
    { subject: `Nova invoice question ${batchId.slice(-4)}`, title: `Nova invoice question ${batchId.slice(-4)}`, customerName: 'Nova Retail', priority: 'Medium', status: 'In Progress', description: 'Sales Hub test support ticket.', source: 'sales-hub-test-seed' },
  ])
  const activityLogs = queueRows('activityLogs', [
    { action: 'Test deal created', module: 'Sales Hub', description: `Atlas CRM Rollout ${batchId.slice(-4)} added to pipeline.`, status: 'success', source: 'sales-hub-test-seed' },
    { action: 'Test payment recorded', module: 'Invoices', description: `Payment recorded for ${invoices[0].invoiceNumber}.`, status: 'success', source: 'sales-hub-test-seed' },
    { action: 'Test task scheduled', module: 'Tasks', description: `Nova follow-up ${batchId.slice(-4)} scheduled.`, status: 'info', source: 'sales-hub-test-seed' },
  ])

  try {
    await batch.commit()
  } catch (error) {
    console.warn('[Sales Hub Test Seed Failed]', {
      workspaceId,
      businessType: normalizedBusinessType,
      batchId,
      code: error?.code || 'unknown',
      message: error?.message || String(error || ''),
    })
    throw error
  }

  return {
    ok: true,
    batchId,
    counts: {
      customers: customers.length,
      leads: leads.length,
      invoices: invoices.length,
      payments: payments.length,
      expenses: expenses.length,
      deals: deals.length,
      tasks: tasks.length,
      quotes: quotes.length,
      products: products.length,
      activities: activities.length + activityLogs.length,
      tickets: tickets.length,
    },
  }
}
