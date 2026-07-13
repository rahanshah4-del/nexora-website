import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { HiOutlineCube, HiOutlineCheckCircle, HiOutlineClock, HiOutlineChartBar, HiOutlineCurrencyDollar, HiOutlineExclamationTriangle, HiOutlineArrowRight, HiOutlineFire } from 'react-icons/hi2'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { useProductionBatches } from '../hooks/useKitchenProduction.js'
import { useRestaurantIngredients } from '../hooks/useRestaurantRecipes.js'
import { useRestaurantRecipes } from '../hooks/useRestaurantRecipes.js'
import { useRestaurantWasteTracking } from '../hooks/useRestaurantWasteTracking.js'
import { productionDashboardMetrics } from '../lib/kitchenProductionCalculations.js'
import { formatCompact, formatCurrency } from '../utils/format.js'

export default function KitchenProductionDashboard() {
  const batchesApi = useProductionBatches()
  const { ingredients } = useRestaurantIngredients()
  const { recipes } = useRestaurantRecipes()
  const wasteApi = useRestaurantWasteTracking()
  const metrics = useMemo(() => productionDashboardMetrics({ batches: batchesApi.batches, ingredients, recipes, wasteRecords: wasteApi.wasteRecords }), [batchesApi.batches, ingredients, recipes, wasteApi.wasteRecords])
  const loading = batchesApi.loading

  const stats = useMemo(() => metrics ? [
    { icon: HiOutlineCube, label: 'Total Batches', value: formatCompact(metrics.totalBatches), helper: `${metrics.activeBatches} active`, tone: 'sky' },
    { icon: HiOutlineCheckCircle, label: 'Completed', value: formatCompact(metrics.completedBatches), helper: `${metrics.yieldPct}% yield`, tone: 'emerald' },
    { icon: HiOutlineChartBar, label: 'Food Cost', value: `${metrics.avgFoodCostPct}%`, helper: 'Average across recipes', tone: 'violet' },
    { icon: HiOutlineCurrencyDollar, label: 'Prod Cost', value: formatCurrency(metrics.totalProductionCost), helper: 'Completed batches', tone: 'amber' },
    { icon: HiOutlineFire, label: 'Waste', value: `${metrics.wastePct}%`, helper: formatCurrency(metrics.totalWasteCost), tone: 'rose' },
    { icon: HiOutlineCurrencyDollar, label: 'Inventory Value', value: formatCurrency(metrics.totalInventoryValue), helper: `${metrics.lowStockCount} low stock items`, tone: 'sky' },
  ] : [], [metrics])

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <PageHeader title="Kitchen Production" subtitle="Production batches, prep planning, BOM costing, and waste tracking."
        right={<div className="flex gap-2 flex-wrap">
          <Link to="/app/kitchen-production/batches"><Badge variant="info">Batches ({batchesApi.activeBatches.length})</Badge></Link>
          <Link to="/app/kitchen-production/prep"><Badge variant="purple">Prep</Badge></Link>
          <Link to="/app/kitchen-production/waste"><Badge variant="warning">Waste</Badge></Link>
        </div>} />
      <div className="crm-auto-grid gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            {loading ? <div className="h-16 animate-pulse rounded bg-slate-100" /> : (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{s.label}</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{s.value}</p>
                  <p className="mt-1 text-xs text-slate-500">{s.helper}</p>
                </div>
                <s.icon className={`h-8 w-8 shrink-0 text-${s.tone}-500 opacity-40`} />
              </div>
            )}
          </Card>
        ))}
      </div>
      {metrics?.topExpensiveRecipes?.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="p-5">
            <p className="mb-3 text-sm font-bold text-slate-950">Top Expensive Recipes (Food Cost %)</p>
            <div className="space-y-2">
              {metrics.topExpensiveRecipes.slice(0, 5).map((r) => (
                <div key={r.menuItemId} className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700">{r.name || 'Unknown'}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">{formatCurrency(r.recipeCost)}</span>
                    <span className={`font-bold ${r.foodCostPct > 60 ? 'text-rose-600' : 'text-emerald-600'}`}>{r.foodCostPct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <p className="mb-3 text-sm font-bold text-slate-950">Quick Actions</p>
            <div className="space-y-2">
              <Link to="/app/kitchen-production/batches" className="flex items-center justify-between rounded-xl border border-slate-200 p-3 hover:border-sky-200 hover:bg-sky-50">
                <span className="text-sm font-semibold text-slate-700">New Production Batch</span><HiOutlineArrowRight className="h-4 w-4 text-sky-600" />
              </Link>
              <Link to="/app/kitchen-production/prep" className="flex items-center justify-between rounded-xl border border-slate-200 p-3 hover:border-sky-200 hover:bg-sky-50">
                <span className="text-sm font-semibold text-slate-700">Daily Prep Sheet</span><HiOutlineArrowRight className="h-4 w-4 text-sky-600" />
              </Link>
              <Link to="/app/kitchen-production/waste" className="flex items-center justify-between rounded-xl border border-slate-200 p-3 hover:border-sky-200 hover:bg-sky-50">
                <span className="text-sm font-semibold text-slate-700">Record Waste</span><HiOutlineArrowRight className="h-4 w-4 text-sky-600" />
              </Link>
            </div>
          </Card>
        </div>
      )}
    </motion.div>
  )
}
