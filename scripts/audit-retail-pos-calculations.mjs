import assert from 'node:assert/strict'
import { calculateInventoryStats, stockState } from '../src/crm/hooks/useInventory.js'
import {
  calculateInvoiceTotals,
  calculateRevenue,
  getDashboardStats,
  invoiceBalanceDue,
} from '../src/crm/lib/calculations.js'

function closeTo(actual, expected, label) {
  assert.equal(Math.round(Number(actual) * 100) / 100, expected, label)
}

const products = [
  { id: 'p-1', name: 'Thermal Roll', productType: 'product', stockQuantity: 100, minStockAlert: 20, costPrice: 80, price: 120, status: 'active' },
  { id: 'p-2', name: 'Barcode Scanner', productType: 'product', stockQuantity: 5, minStockAlert: 5, costPrice: 4500, price: 6500, status: 'active' },
  { id: 'p-3', name: 'POS Setup Service', productType: 'service', stockQuantity: 0, minStockAlert: 0, costPrice: 0, price: 10000, status: 'active' },
  { id: 'p-4', name: 'Old Printer', productType: 'product', stockQuantity: 99, minStockAlert: 10, costPrice: 1000, price: 1500, status: 'archived' },
  { id: 'p-5', name: 'Cash Drawer', productType: 'product', stockQuantity: 0, minStockAlert: 2, costPrice: 3500, price: 5000, status: 'active' },
]

const transactions = [
  { id: 't-1', type: 'stock_in', productId: 'p-1', quantity: 100, delta: 100, createdAt: '2026-06-18T10:00:00.000Z' },
  { id: 't-2', type: 'sale', productId: 'p-2', quantity: 2, delta: -2, createdAt: '2026-06-19T10:00:00.000Z' },
]

const invoiceInput = {
  currency: 'PKR',
  customerName: 'Walk-in Customer',
  items: [
    { name: 'Thermal Roll', quantity: 10, price: 120, discountPercent: 10, taxRate: 5 },
    { name: 'Barcode Scanner', quantity: 1, price: 6500, discount: 500, taxRate: 0 },
  ],
  amountPaid: 2000,
}

const invoiceTotals = calculateInvoiceTotals(invoiceInput)
closeTo(invoiceTotals.subtotal, 7700, 'POS invoice subtotal')
closeTo(invoiceTotals.discountTotal, 620, 'POS invoice discount')
closeTo(invoiceTotals.taxAmount, 54, 'POS invoice tax')
closeTo(invoiceTotals.total, 7134, 'POS invoice total')
closeTo(invoiceTotals.balanceDue, 5134, 'POS invoice balance')

const inventoryStats = calculateInventoryStats(products, transactions)
assert.equal(inventoryStats.totalProducts, 4, 'archived products should not count')
assert.equal(inventoryStats.trackedProducts, 3, 'only product type items should be stock-tracked')
assert.equal(inventoryStats.totalStock, 105, 'total stock should sum tracked active products')
assert.equal(inventoryStats.lowStockCount, 1, 'low-stock count')
assert.equal(inventoryStats.outOfStockCount, 1, 'out-of-stock count')
closeTo(inventoryStats.inventoryValue, 30500, 'inventory cost value')
closeTo(inventoryStats.retailValue, 44500, 'inventory retail value')
closeTo(inventoryStats.potentialMargin, 14000, 'inventory potential margin')
assert.equal(inventoryStats.recentMovements[0].id, 't-2', 'recent movements should sort newest first')
assert.equal(stockState(products[1]).key, 'low-stock', 'stock state low')
assert.equal(stockState(products[4]).key, 'out-of-stock', 'stock state out')

const invoices = [
  { id: 'inv-1', total: 12000, amountPaid: 12000, status: 'paid', customerName: 'Walk-in' },
  { id: 'inv-2', total: invoiceTotals.total, amountPaid: invoiceTotals.amountPaid, status: 'partial_paid', customerName: 'Walk-in' },
]
const payments = [
  { id: 'pay-1', invoiceId: 'inv-1', amount: 12000, status: 'paid' },
  { id: 'pay-2', invoiceId: 'inv-2', amount: 2000, status: 'paid' },
]
const expenses = [
  { amount: 3000, status: 'approved' },
  { amount: 1000, status: 'pending' },
]

closeTo(invoiceBalanceDue(invoices[1]), 5134, 'partial retail invoice due')
closeTo(calculateRevenue({ invoices, payments }), 14000, 'retail revenue should use paid payments and avoid double-counting paid invoices')

const dashboardStats = getDashboardStats({
  invoices,
  payments,
  customers: [{ name: 'Walk-in', status: 'active' }],
  leads: [],
  expenses,
})
assert.equal(dashboardStats.pendingInvoices, 1, 'retail pending bills')
closeTo(dashboardStats.totalRevenue, 14000, 'retail dashboard revenue')
closeTo(dashboardStats.expenses, 3000, 'retail approved expenses')
closeTo(dashboardStats.profit, 11000, 'retail profit')

console.log('Retail / POS calculation audit passed')
console.table({
  products: inventoryStats.totalProducts,
  trackedProducts: inventoryStats.trackedProducts,
  stock: inventoryStats.totalStock,
  inventoryValue: inventoryStats.inventoryValue,
  retailValue: inventoryStats.retailValue,
  potentialMargin: inventoryStats.potentialMargin,
  invoiceTotal: invoiceTotals.total,
  revenue: dashboardStats.totalRevenue,
  profit: dashboardStats.profit,
})
