import assert from 'node:assert/strict'
import {
  contractDisplayStatus,
  contractLateFee,
  contractOutstandingBalance,
  contractStats,
  maintenanceBalanceDue,
  maintenanceStats,
} from '../src/crm/lib/propertyCalculations.js'

const now = new Date('2026-06-22T12:00:00Z')
const contracts = [
  { id: 'c1', status: 'Active', startDate: '2026-01-01', endDate: '2026-12-31', monthlyRent: 50000, securityDeposit: 100000, advancePayment: 50000, paidAmount: 150000, paymentDueDay: 5, lateFeeType: 'Percent', lateFeeValue: 2 },
  { id: 'c2', status: 'Draft', startDate: '2026-07-01', endDate: '2027-06-30', monthlyRent: 30000, securityDeposit: 60000 },
  { id: 'c3', status: 'Terminated', startDate: '2026-01-01', endDate: '2026-12-31', monthlyRent: 25000, securityDeposit: 50000 },
]
const maintenance = [
  { id: 'm1', status: 'Open', dueDate: '2026-06-20', estimatedCost: 10000, actualCost: 8000, paidAmount: 3000, assignedTo: 'Vendor A', createdAt: '2026-06-10' },
  { id: 'm2', status: 'Completed', completionDate: '2026-06-15', estimatedCost: 5000, actualCost: 4500, paidAmount: 4500, assignedTo: 'Vendor B' },
  { id: 'm3', status: 'Cancelled', estimatedCost: 9000, actualCost: 0, paidAmount: 0 },
]

const contractSummary = contractStats(contracts, now)
assert.equal(contractSummary.active, 1, 'only running contracts count as active')
assert.equal(contractSummary.draft, 1, 'draft contracts count')
assert.equal(contractSummary.terminated, 1, 'terminated contracts count')
assert.equal(contractSummary.monthlyRentExpected, 50000, 'monthly expected rent uses active contracts only')
assert.equal(contractSummary.depositHeld, 100000, 'deposit held uses active contracts only')
assert.equal(contractSummary.outstandingTotal, 400000, 'outstanding excludes draft and terminated contracts')
assert.equal(contractDisplayStatus(contracts[1], now), 'Draft', 'draft display status')
assert.equal(contractLateFee(contracts[0], now), 1000, 'percentage late fee')
assert.equal(contractOutstandingBalance(contracts[0]), 400000, 'outstanding contract value minus advance and paid amount')

const maintenanceSummary = maintenanceStats(maintenance, now)
assert.equal(maintenanceSummary.total, 3, 'all maintenance requests visible for audit')
assert.equal(maintenanceSummary.pending, 1, 'cancelled maintenance is not pending')
assert.equal(maintenanceSummary.completed, 1, 'completed maintenance count')
assert.equal(maintenanceSummary.overdue, 1, 'overdue open maintenance count')
assert.equal(maintenanceSummary.pendingCost, 5000, 'pending cost uses open request balance only')
assert.equal(maintenanceBalanceDue(maintenance[0]), 5000, 'maintenance balance due')

console.log('Property ERP calculation audit passed')
console.table({ activeContracts: contractSummary.active, monthlyRentExpected: contractSummary.monthlyRentExpected, outstanding: contractSummary.outstandingTotal, pendingMaintenance: maintenanceSummary.pending, pendingCost: maintenanceSummary.pendingCost })
