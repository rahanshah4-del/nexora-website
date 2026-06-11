import { useMemo } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import Card from '../components/ui/Card.jsx'
import SalesHubModulePage from '../components/sales/SalesHubModulePage.jsx'
import { useSalesHubCollection } from '../hooks/useSalesHubCollection.js'
import { calculateDealMetrics, clampPercent, dealAmount } from '../lib/salesCalculations.js'
import { formatCurrency } from '../utils/format.js'
import { pipelineStages } from '../data/pipelineStages.js'

function normalizeDeal(row = {}) {
  return {
    ...row,
    title: row.title || 'Untitled deal',
    customerName: row.customerName || row.customer || '',
    leadName: row.leadName || row.lead || '',
    value: dealAmount(row),
    stage: row.stage || 'New Lead',
    probability: clampPercent(row.probability ?? row.winProbability ?? 30),
    expectedCloseDate: row.expectedCloseDate || '',
    owner: row.owner || row.assignedTo || '',
    priority: row.priority || 'Medium',
    source: row.source || '',
    status: row.status || 'Open',
    notes: row.notes || '',
  }
}

const config = {
  title: 'Deals',
  single: 'Deal',
  subtitle: 'Track opportunities, owners, value, probability, and forecast revenue.',
  modalSubtitle: 'Deals feed the Sales Hub pipeline and forecast calculations.',
  filterKey: 'stage',
  searchKeys: ['title', 'customerName', 'leadName', 'owner', 'source', 'notes'],
  searchPlaceholder: 'Search deals by title, customer, owner, source...',
  emptyDescription: 'Create your first deal to start forecasting revenue.',
  initial: () => ({
    title: '',
    customerName: '',
    leadName: '',
    value: 0,
    stage: 'New Lead',
    probability: 30,
    expectedCloseDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    owner: '',
    priority: 'Medium',
    source: '',
    status: 'Open',
    notes: '',
  }),
  sanitize: normalizeDeal,
  fields: [
    { key: 'title', label: 'Title', large: true },
    { key: 'customerName', label: 'Customer' },
    { key: 'leadName', label: 'Lead' },
    { key: 'value', label: 'Value', type: 'number', number: true },
    { key: 'stage', label: 'Stage', type: 'select', options: pipelineStages },
    { key: 'probability', label: 'Probability', type: 'number', number: true },
    { key: 'expectedCloseDate', label: 'Expected Close Date', type: 'date' },
    { key: 'owner', label: 'Owner' },
    { key: 'priority', label: 'Priority', type: 'select', options: ['High', 'Medium', 'Low'] },
    { key: 'source', label: 'Source' },
    { key: 'status', label: 'Status', type: 'select', options: ['Open', 'Won', 'Lost'] },
    { key: 'notes', label: 'Notes', type: 'textarea', large: true },
  ],
  summaryFields: [
    { key: 'customerName', label: 'Customer' },
    { key: 'value', label: 'Value', format: 'money' },
    { key: 'probability', label: 'Probability', format: 'percent' },
    { key: 'expectedCloseDate', label: 'Close Date' },
  ],
}

export default function DealsPage() {
  const api = useSalesHubCollection('salesDeals', { normalize: normalizeDeal, validate: (row) => (!row.title ? 'Deal title is required' : '') })
  const metrics = useMemo(() => calculateDealMetrics(api.rows), [api.rows])
  const chartRows = useMemo(() => {
    const map = new Map(pipelineStages.map((stage) => [stage, 0]))
    api.rows.forEach((deal) => map.set(deal.stage, (map.get(deal.stage) || 0) + deal.value))
    return Array.from(map.entries()).map(([stage, value]) => ({ stage, value }))
  }, [api.rows])

  return (
    <SalesHubModulePage
      config={config}
      api={api}
      metrics={[
        { label: 'Expected Revenue', value: formatCurrency(metrics.expectedRevenue, 'PKR'), helper: 'Probability weighted' },
        { label: 'Open Value', value: formatCurrency(metrics.openValue, 'PKR'), helper: `${metrics.openDeals} open deals` },
        { label: 'Won Value', value: formatCurrency(metrics.wonValue, 'PKR'), helper: `${metrics.wonDeals} won deals` },
        { label: 'Forecast Revenue', value: formatCurrency(metrics.forecastRevenue, 'PKR'), helper: 'Current forecast' },
      ]}
      chart={
        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-950 dark:text-white">Deal Value by Stage</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartRows}>
                <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => formatCurrency(value, 'PKR')} />
                <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      }
    />
  )
}
