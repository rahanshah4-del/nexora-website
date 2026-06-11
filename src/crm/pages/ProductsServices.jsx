import { useMemo } from 'react'
import SalesHubModulePage from '../components/sales/SalesHubModulePage.jsx'
import { useSalesHubCollection } from '../hooks/useSalesHubCollection.js'
import { calculateProductMetrics, clampPercent, moneyRound, safeNumber } from '../lib/salesCalculations.js'
import { formatCurrency } from '../utils/format.js'

function normalizeProduct(row = {}) {
  const unitPrice = Math.max(0, safeNumber(row.unitPrice ?? row.price))
  const costPrice = Math.max(0, safeNumber(row.costPrice))
  return {
    ...row,
    title: row.name || row.title || 'Untitled product',
    name: row.name || row.title || '',
    sku: row.sku || '',
    category: row.category || 'General',
    description: row.description || '',
    unitPrice,
    costPrice,
    tax: clampPercent(row.tax ?? row.taxRate),
    status: row.status || 'Active',
    grossMargin: moneyRound(Math.max(0, unitPrice - costPrice)),
    marginPercent: unitPrice ? moneyRound(((unitPrice - costPrice) / unitPrice) * 100) : 0,
  }
}

const config = {
  title: 'Products & Services',
  single: 'Product',
  subtitle: 'Manage sellable products, services, pricing, tax, and margin performance.',
  modalSubtitle: 'Products and services are isolated to the Sales Hub workspace.',
  filterKey: 'status',
  searchKeys: ['name', 'sku', 'category', 'description', 'status'],
  searchPlaceholder: 'Search products and services by name, SKU, category...',
  emptyDescription: 'Add a product or service to build quote and invoice lines faster.',
  initial: () => ({ name: '', sku: '', category: 'General', description: '', unitPrice: 0, costPrice: 0, tax: 0, status: 'Active' }),
  sanitize: normalizeProduct,
  fields: [
    { key: 'name', label: 'Name', large: true },
    { key: 'sku', label: 'SKU' },
    { key: 'category', label: 'Category' },
    { key: 'unitPrice', label: 'Unit Price', type: 'number', number: true },
    { key: 'costPrice', label: 'Cost Price', type: 'number', number: true },
    { key: 'tax', label: 'Tax %', type: 'number', number: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive', 'Archived'] },
    { key: 'description', label: 'Description', type: 'textarea', large: true },
  ],
  summaryFields: [
    { key: 'sku', label: 'SKU' },
    { key: 'category', label: 'Category' },
    { key: 'unitPrice', label: 'Unit Price', format: 'money' },
    { key: 'marginPercent', label: 'Margin', format: 'percent' },
  ],
}

export default function ProductsServicesPage() {
  const api = useSalesHubCollection('salesProducts', { normalize: normalizeProduct, validate: (row) => (!row.name ? 'Name is required' : '') })
  const metrics = useMemo(() => calculateProductMetrics(api.rows), [api.rows])
  return (
    <SalesHubModulePage
      config={config}
      api={api}
      metrics={[
        { label: 'Products & Services', value: metrics.totalProducts, helper: 'Active catalog items' },
        { label: 'Gross Margin', value: formatCurrency(metrics.grossMargin, 'PKR'), helper: 'Price minus cost' },
        { label: 'Margin %', value: `${metrics.marginPercent}%`, helper: 'Average catalog margin' },
        { label: 'Average Price', value: formatCurrency(metrics.averagePrice, 'PKR'), helper: 'Mean unit price' },
      ]}
    />
  )
}
