import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { HiOutlineArrowLeft } from 'react-icons/hi2'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { useProductionBatches } from '../hooks/useKitchenProduction.js'
import { useRestaurantIngredients, useRestaurantRecipes } from '../hooks/useRestaurantRecipes.js'
import { useRestaurantWasteTracking } from '../hooks/useRestaurantWasteTracking.js'
import { productionDashboardMetrics } from '../lib/kitchenProductionCalculations.js'
import { formatCurrency, formatCompact } from '../utils/format.js'
import { exportCsv, exportExcel } from '../lib/exporters.js'

export default function KitchenProductionReportsPage() {
  const batchesApi = useProductionBatches()
  const { ingredients } = useRestaurantIngredients()
  const { recipes } = useRestaurantRecipes()
  const wasteApi = useRestaurantWasteTracking()
  const metrics = useMemo(() => productionDashboardMetrics({ batches: batchesApi.batches, ingredients, recipes, wasteRecords: wasteApi.wasteRecords }), [batchesApi.batches, ingredients, recipes, wasteApi.wasteRecords])

  function exportReport(name, columns, rows) {
    exportCsv(`${name}-${new Date().toISOString().slice(0, 10)}.csv`, columns, rows)
  }

  const batchColumns = [
    { key: 'batchNumber', label: 'Batch' },
    { key: 'menuItemName', label: 'Item' },
    { key: 'plannedQty', label: 'Planned' },
    { key: 'actualQty', label: 'Actual' },
    { key: 'wasteQty', label: 'Waste' },
    { key: 'totalCost', label: 'Cost' },
    { key: 'status', label: 'Status' },
  ]

  const wasteColumns = [
    { key: 'ingredientName', label: 'Ingredient' },
    { key: 'quantity', label: 'Qty' },
    { key: 'totalCost', label: 'Cost' },
    { key: 'reason', label: 'Reason' },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader title="Production Reports" subtitle="Production summary, batch history, waste report, and ingredient consumption."
        right={<Link to="/app/kitchen-production"><Button variant="subtle" className="rounded-2xl"><HiOutlineArrowLeft /> Back</Button></Link>} />

      <div className="grid gap-5">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-slate-950">Production Summary</p>
            <Button variant="subtle" className="rounded-2xl text-xs" onClick={() => exportReport('production-summary', [
              { key: 'metric', label: 'Metric' }, { key: 'value', label: 'Value' },
            ], metrics ? [
              { metric: 'Total Batches', value: String(metrics.totalBatches) },
              { metric: 'Completed', value: String(metrics.completedBatches) },
              { metric: 'Yield %', value: `${metrics.yieldPct}%` },
              { metric: 'Waste %', value: `${metrics.wastePct}%` },
              { metric: 'Total Prod Cost', value: formatCurrency(metrics.totalProductionCost) },
              { metric: 'Avg Food Cost %', value: `${metrics.avgFoodCostPct}%` },
              { metric: 'Inventory Value', value: formatCurrency(metrics.totalInventoryValue) },
            ] : [])}>Export CSV</Button>
          </div>
          {metrics ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Metric label="Total Batches" value={String(metrics.totalBatches)} />
              <Metric label="Completed" value={String(metrics.completedBatches)} />
              <Metric label="Yield" value={`${metrics.yieldPct}%`} />
              <Metric label="Waste" value={`${metrics.wastePct}%`} />
              <Metric label="Prod Cost" value={formatCurrency(metrics.totalProductionCost)} />
              <Metric label="Avg Food Cost" value={`${metrics.avgFoodCostPct}%`} />
              <Metric label="Inventory" value={formatCurrency(metrics.totalInventoryValue)} />
              <Metric label="Low Stock" value={String(metrics.lowStockCount)} />
            </div>
          ) : <p className="text-sm text-slate-500">Loading...</p>}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-slate-950">Recipe Cost Analysis</p>
            <Button variant="subtle" className="rounded-2xl text-xs" onClick={() => exportReport('recipe-costs', [
              { key: 'name', label: 'Recipe' }, { key: 'recipeCost', label: 'Cost' },
              { key: 'sellingPrice', label: 'Price' }, { key: 'profitPerUnit', label: 'Profit' },
              { key: 'foodCostPct', label: 'Food Cost %' }, { key: 'marginPct', label: 'Margin %' },
            ], metrics?.recipeCosts || [])}>Export CSV</Button>
          </div>
          {metrics?.recipeCosts?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="text-xs font-bold uppercase text-slate-500">
                  <th className="px-3 py-2">Recipe</th><th className="px-3 py-2">Cost</th><th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Profit</th><th className="px-3 py-2">Food Cost %</th><th className="px-3 py-2">Margin</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics.recipeCosts.map((r) => (
                    <tr key={r.menuItemId}>
                      <td className="px-3 py-2 font-semibold text-slate-950" data-label="Recipe">{r.name || 'Unknown'}</td>
                      <td className="px-3 py-2" data-label="Cost">{formatCurrency(r.recipeCost)}</td>
                      <td className="px-3 py-2" data-label="Price">{formatCurrency(r.sellingPrice)}</td>
                      <td className="px-3 py-2 font-bold text-emerald-600" data-label="Profit">{formatCurrency(r.profitPerUnit)}</td>
                      <td className="px-3 py-2" data-label="Food Cost %"><span className={`font-bold ${r.foodCostPct > 60 ? 'text-rose-600' : 'text-emerald-600'}`}>{r.foodCostPct}%</span></td>
                      <td className="px-3 py-2 font-bold text-slate-950" data-label="Margin">{r.marginPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-sm text-slate-500">No recipe cost data available.</p>}
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-slate-950">Batch History</p>
              <Button variant="subtle" className="rounded-2xl text-xs" onClick={() => exportReport('batch-history', batchColumns, batchesApi.batches.map((b) => ({ ...b, totalCost: formatCurrency(b.totalCost || 0) })))}>Export</Button>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {batchesApi.batches.slice(0, 20).map((b) => (
                <div key={b.id} className="flex justify-between text-sm border-b border-slate-50 pb-1">
                  <span className="font-mono text-xs text-slate-500">{b.batchNumber}</span>
                  <span className="font-semibold text-slate-700">{b.menuItemName}</span>
                  <span className="text-xs text-slate-500">{b.plannedQty} → {b.actualQty || '—'}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-slate-950">Waste Report</p>
              <Button variant="subtle" className="rounded-2xl text-xs" onClick={() => exportReport('waste-report', wasteColumns, wasteApi.wasteRecords.map((w) => ({ ...w, totalCost: formatCurrency(w.totalCost || 0) })))}>Export</Button>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {wasteApi.wasteRecords.slice(0, 20).map((w) => (
                <div key={w.id} className="flex justify-between text-sm border-b border-slate-50 pb-1">
                  <span className="font-semibold text-slate-700">{w.ingredientName}</span>
                  <span className="text-xs text-slate-500">{w.quantity} · {formatCurrency(w.totalCost || 0)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}

function Metric({ label, value }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-semibold uppercase text-slate-400">{label}</p><p className="mt-1 text-lg font-bold text-slate-950">{value}</p></div>
}
