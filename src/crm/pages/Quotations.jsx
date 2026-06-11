import { useMemo } from 'react'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import SalesHubModulePage from '../components/sales/SalesHubModulePage.jsx'
import { useSalesHubCollection } from '../hooks/useSalesHubCollection.js'
import { calculateQuoteTotals, clampPercent, safeNumber } from '../lib/salesCalculations.js'
import { formatCurrency } from '../utils/format.js'

function parseItems(text) {
  return String(text || '')
    .split('\n')
    .map((line) => {
      const [name = '', qty = '1', unitPrice = '0'] = line.split('|').map((part) => part.trim())
      return { name, qty: Math.max(0, safeNumber(qty, 1)), unitPrice: Math.max(0, safeNumber(unitPrice)) }
    })
    .filter((item) => item.name)
}

function itemText(items = []) {
  return (Array.isArray(items) ? items : []).map((item) => `${item.name || ''} | ${item.qty || 1} | ${item.unitPrice || 0}`).join('\n')
}

function normalizeQuote(row = {}) {
  const items = Array.isArray(row.items) ? row.items : parseItems(row.itemsText)
  const totals = calculateQuoteTotals(items, row.discountPercent, row.taxPercent)
  return {
    ...row,
    title: row.title || row.quoteNumber || 'Untitled quote',
    quoteNumber: row.quoteNumber || `QT-${Date.now()}`,
    customerName: row.customerName || row.customer || '',
    items,
    itemsText: row.itemsText || itemText(items),
    discountPercent: totals.discountRate,
    taxPercent: totals.taxRate,
    validUntil: row.validUntil || '',
    status: row.status || 'Draft',
    notes: row.notes || '',
    ...totals,
  }
}

const config = {
  title: 'Quotations',
  single: 'Quotation',
  subtitle: 'Create, track, print, export, and convert professional Sales Hub quotations.',
  modalSubtitle: 'Add quote items as one line per item: Name | Qty | Unit Price.',
  filterKey: 'status',
  searchKeys: ['quoteNumber', 'customerName', 'status', 'notes'],
  searchPlaceholder: 'Search quotes by number, customer, status...',
  emptyDescription: 'Create a quotation to start tracking proposal outcomes.',
  initial: () => ({
    quoteNumber: `QT-${Date.now()}`,
    customerName: '',
    itemsText: 'Service package | 1 | 0',
    discountPercent: 0,
    taxPercent: 0,
    validUntil: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    status: 'Draft',
    notes: '',
  }),
  sanitize: normalizeQuote,
  fields: [
    { key: 'quoteNumber', label: 'Quote Number' },
    { key: 'customerName', label: 'Customer' },
    { key: 'itemsText', label: 'Items (Name | Qty | Unit Price)', type: 'textarea', large: true },
    { key: 'discountPercent', label: 'Discount %', type: 'number', number: true },
    { key: 'taxPercent', label: 'Tax %', type: 'number', number: true },
    { key: 'validUntil', label: 'Valid Until', type: 'date' },
    { key: 'status', label: 'Status', type: 'select', options: ['Draft', 'Sent', 'Accepted', 'Rejected', 'Expired'] },
    { key: 'notes', label: 'Notes', type: 'textarea', large: true },
  ],
  summaryFields: [
    { key: 'customerName', label: 'Customer' },
    { key: 'items', label: 'Items' },
    { key: 'grandTotal', label: 'Total', format: 'money' },
    { key: 'validUntil', label: 'Valid Until' },
  ],
}

function exportQuotes(rows) {
  const csv = ['Quote,Customer,Status,Subtotal,Discount,Tax,Grand Total', ...rows.map((row) => [
    row.quoteNumber,
    row.customerName,
    row.status,
    row.subtotal,
    row.discountTotal,
    row.taxTotal,
    row.grandTotal,
  ].join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'sales-hub-quotations.csv'
  link.click()
  URL.revokeObjectURL(url)
}

export default function QuotationsPage() {
  const api = useSalesHubCollection('salesQuotes', { normalize: normalizeQuote, validate: (row) => (!row.customerName ? 'Customer is required' : '') })
  const totals = useMemo(() => ({
    pending: api.rows.filter((row) => ['Draft', 'Sent'].includes(row.status)).length,
    accepted: api.rows.filter((row) => row.status === 'Accepted').length,
    acceptedValue: api.rows.filter((row) => row.status === 'Accepted').reduce((sum, row) => sum + row.grandTotal, 0),
    totalValue: api.rows.reduce((sum, row) => sum + row.grandTotal, 0),
  }), [api.rows])
  return (
    <SalesHubModulePage
      config={config}
      api={api}
      metrics={[
        { label: 'Pending Quotations', value: totals.pending, helper: 'Draft and sent' },
        { label: 'Accepted Quotations', value: totals.accepted, helper: 'Accepted by customers' },
        { label: 'Accepted Value', value: formatCurrency(totals.acceptedValue, 'PKR'), helper: 'Accepted quote total' },
        { label: 'Quote Pipeline', value: formatCurrency(totals.totalValue, 'PKR'), helper: 'All quote value' },
      ]}
      renderExtra={({ filteredRows }) => (
        <Card className="mt-4 p-5">
          <p className="text-sm font-semibold text-slate-950 dark:text-white">Quotation Actions</p>
          <p className="mt-1 text-xs text-slate-500">Use browser print for PDF preview/export. CSV export includes current filtered rows.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button className="rounded-2xl" type="button" onClick={() => window.print()}>PDF Preview / Print</Button>
            <Button variant="subtle" className="rounded-2xl" type="button" onClick={() => exportQuotes(filteredRows)}>Export Excel CSV</Button>
            <Button variant="ghost" className="rounded-2xl" type="button" onClick={() => window.alert('Select an accepted quote, then create the invoice from the existing invoice module.')}>Convert To Invoice</Button>
          </div>
        </Card>
      )}
    />
  )
}
