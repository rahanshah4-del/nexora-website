/**
 * Kitchen Production & Recipe Automation — Pure Functions.
 * Zero side effects. No Firebase imports.
 */

// ─── Batch Statuses ──────────────────────────────────────────────────────────

export const BATCH_STATUSES = [
  { id: 'planned',    label: 'Planned',    color: 'text-amber-600 bg-amber-50' },
  { id: 'in_progress',label: 'In Progress',color: 'text-sky-600 bg-sky-50' },
  { id: 'completed',  label: 'Completed',  color: 'text-emerald-600 bg-emerald-50' },
  { id: 'cancelled',  label: 'Cancelled',  color: 'text-rose-600 bg-rose-50' },
]

export const BATCH_STATUS_TRANSITIONS = {
  planned:      ['in_progress', 'cancelled'],
  in_progress:  ['completed', 'cancelled'],
  completed:    [],
  cancelled:    [],
}

export const PREP_STATUSES = [
  { id: 'pending',   label: 'Pending',   color: 'text-amber-600 bg-amber-50' },
  { id: 'completed', label: 'Completed', color: 'text-emerald-600 bg-emerald-50' },
  { id: 'partial',   label: 'Partial',   color: 'text-sky-600 bg-sky-50' },
  { id: 'skipped',   label: 'Skipped',   color: 'text-slate-600 bg-slate-100' },
]

// ─── BOM Costing ─────────────────────────────────────────────────────────────

export function calculateRecipeCost(ingredients = []) {
  return (Array.isArray(ingredients) ? ingredients : []).reduce((sum, ing) => {
    const qty = Math.max(0, Number(ing.quantity || 0))
    const cost = Math.max(0, Number(ing.costPerUnit || 0))
    const lineCost = qty * cost
    return sum + lineCost
  }, 0)
}

export function calculateYield(plannedQty, actualQty) {
  const planned = Math.max(1, Number(plannedQty || 1))
  const actual = Math.max(0, Number(actualQty || 0))
  return Math.min(100, Math.round((actual / planned) * 100))
}

export function calculateWastePercent(plannedQty, wasteQty) {
  const planned = Math.max(1, Number(plannedQty || 1))
  const waste = Math.max(0, Number(wasteQty || 0))
  return Math.min(100, Math.round((waste / planned) * 100))
}

export function calculateProductionCost(recipeCost, plannedQty, actualQty) {
  const cost = Math.max(0, Number(recipeCost || 0))
  const planned = Math.max(1, Number(plannedQty || 1))
  const actual = Math.max(1, Number(actualQty || 1))
  return {
    totalPlannedCost: cost * planned,
    totalActualCost: cost * actual,
    costPerUnit: cost,
    costEfficiency: Math.min(100, Math.round((actual / planned) * 100)),
  }
}

export function calculateFoodCostPct(recipeCost, sellingPrice) {
  const cost = Math.max(0, Number(recipeCost || 0))
  const price = Math.max(1, Number(sellingPrice || 1))
  return Math.min(100, Math.round((cost / price) * 100))
}

export function calculateRecipeProfitability(recipeCost, sellingPrice, salesQty = 1) {
  const cost = Math.max(0, Number(recipeCost || 0))
  const price = Math.max(0, Number(sellingPrice || 0))
  const qty = Math.max(0, Number(salesQty || 0))
  return {
    costPerUnit: cost,
    sellingPrice: price,
    profitPerUnit: Math.max(0, price - cost),
    marginPct: price > 0 ? Math.round(((price - cost) / price) * 100) : 0,
    foodCostPct: price > 0 ? Math.round((cost / price) * 100) : 0,
    totalCost: cost * qty,
    totalRevenue: price * qty,
    totalProfit: Math.max(0, (price - cost) * qty),
  }
}

// ─── Batch Engine ────────────────────────────────────────────────────────────

export function generateBatchNumber(counter = 1) {
  const date = new Date()
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const seq = String(Math.max(1, Number(counter))).padStart(4, '0')
  return `BATCH-${y}${m}${d}-${seq}`
}

export function calculateBatchRequirements(recipe = {}, plannedQty = 1) {
  const qty = Math.max(1, Number(plannedQty))
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : []
  return ingredients.map((ing) => ({
    ingredientId: ing.ingredientId || ing.id,
    ingredientName: ing.name,
    unit: ing.unit,
    requiredQty: Math.max(0, Number(ing.quantity || 0)) * qty,
    costPerUnit: Math.max(0, Number(ing.costPerUnit || 0)),
    lineCost: Math.max(0, Number(ing.quantity || 0)) * Math.max(0, Number(ing.costPerUnit || 0)) * qty,
  }))
}

export function validateBatchStockAvailability(requirements = [], ingredients = []) {
  const ingredientMap = new Map((Array.isArray(ingredients) ? ingredients : []).map((i) => [i.id || i.ingredientId, i]))
  return (Array.isArray(requirements) ? requirements : []).map((req) => {
    const stock = ingredientMap.get(req.ingredientId)
    const available = stock ? Math.max(0, Number(stock.stockQuantity || 0)) : 0
    return {
      ...req,
      available,
      sufficient: available >= req.requiredQty,
      shortfall: Math.max(0, req.requiredQty - available),
    }
  })
}

// ─── Prep Planning ───────────────────────────────────────────────────────────

export function generatePrepSheet(menuItems = [], recipes = [], shift = 'morning') {
  const items = Array.isArray(menuItems) ? menuItems : []
  const recipeMap = new Map((Array.isArray(recipes) ? recipes : []).map((r) => [r.menuItemId, r]))
  return items.map((item) => {
    const recipe = recipeMap.get(item.id)
    if (!recipe) return null
    const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : []
    return {
      menuItemId: item.id,
      menuItemName: item.name,
      category: item.category,
      preparationTime: Number(item.preparationTime || 0),
      ingredients: ingredients.map((ing) => ({
        ingredientId: ing.ingredientId,
        ingredientName: ing.name,
        quantity: Number(ing.quantity || 0),
        unit: ing.unit,
      })),
    }
  }).filter(Boolean)
}

export function estimatePrepTime(recipe = {}) {
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : []
  return Math.max(5, ingredients.length * 3)
}

// ─── Semi-Finished Product Categories ────────────────────────────────────────

export const SEMI_FINISHED_CATEGORIES = [
  { id: 'sauce',    label: 'Sauce' },
  { id: 'dough',    label: 'Dough' },
  { id: 'gravy',    label: 'Gravy' },
  { id: 'marinade', label: 'Marinade' },
  { id: 'mix',      label: 'Mix' },
  { id: 'other',    label: 'Other' },
]

// ─── Production BI Dashboard ────────────────────────────────────────────────

export function productionDashboardMetrics({
  batches = [], ingredients = [], recipes = [],
  menuItems = [], deductions = [], wasteRecords = [],
} = {}) {
  const batchList = Array.isArray(batches) ? batches : []
  const completedBatches = batchList.filter((b) => b.status === 'completed')
  const totalPlanned = batchList.reduce((s, b) => s + Math.max(0, Number(b.plannedQty || 0)), 0)
  const totalActual = completedBatches.reduce((s, b) => s + Math.max(0, Number(b.actualQty || 0)), 0)
  const totalYield = totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 100
  const batchWaste = completedBatches.reduce((s, b) => s + Math.max(0, Number(b.wasteQty || 0)), 0)
  const wastePct = totalPlanned > 0 ? Math.round((batchWaste / totalPlanned) * 100) : 0

  const wasteList = Array.isArray(wasteRecords) ? wasteRecords : []
  const totalWasteCost = wasteList.reduce((s, w) => s + Math.max(0, Number(w.totalCost || 0)), 0)

  const recipeList = Array.isArray(recipes) ? recipes : []
  const itemList = Array.isArray(menuItems) ? menuItems : []
  const menuPriceMap = new Map(itemList.map((i) => [i.id, Number(i.price || 0)]))
  const recipeCosts = recipeList.map((r) => ({
    menuItemId: r.menuItemId,
    name: r.menuItemName,
    recipeCost: Number(r.totalCost || 0),
    sellingPrice: menuPriceMap.get(r.menuItemId) || 0,
    foodCostPct: calculateFoodCostPct(r.totalCost, menuPriceMap.get(r.menuItemId) || 1),
    ...calculateRecipeProfitability(r.totalCost, menuPriceMap.get(r.menuItemId) || 0, 1),
  }))

  const ingredientList = Array.isArray(ingredients) ? ingredients : []
  const totalInventoryValue = ingredientList.reduce((s, i) => s + (Math.max(0, Number(i.stockQuantity || 0)) * Math.max(0, Number(i.costPerUnit || 0))), 0)
  const lowStock = ingredientList.filter((i) => Number(i.stockQuantity || 0) <= Number(i.minStockAlert || 0))

  return {
    totalBatches: batchList.length,
    completedBatches: completedBatches.length,
    activeBatches: batchList.filter((b) => b.status === 'in_progress').length,
    plannedBatches: batchList.filter((b) => b.status === 'planned').length,
    totalPlannedQty: totalPlanned,
    totalActualQty: totalActual,
    yieldPct: totalYield,
    wastePct,
    totalBatchWaste: batchWaste,
    totalWasteCost,
    recipeCosts: recipeCosts.sort((a, b) => b.foodCostPct - a.foodCostPct),
    topExpensiveRecipes: [...recipeCosts].sort((a, b) => b.recipeCost - a.recipeCost).slice(0, 5),
    topProfitableRecipes: [...recipeCosts].sort((a, b) => b.profitPerUnit - a.profitPerUnit).slice(0, 5),
    totalInventoryValue,
    lowStockCount: lowStock.length,
    lowStockItems: lowStock,
    avgFoodCostPct: recipeCosts.length > 0 ? Math.round(recipeCosts.reduce((s, r) => s + r.foodCostPct, 0) / recipeCosts.length) : 0,
    totalProductionCost: completedBatches.reduce((s, b) => s + Math.max(0, Number(b.totalCost || 0)), 0),
  }
}

// ─── Validation ──────────────────────────────────────────────────────────────

export function validateBatch(payload = {}) {
  const errors = []
  if (!payload.menuItemId) errors.push('Menu item is required')
  if (!payload.plannedQty || Number(payload.plannedQty) <= 0) errors.push('Planned quantity must be positive')
  return { valid: errors.length === 0, errors }
}

export function validatePrepItem(payload = {}) {
  const errors = []
  if (!payload.menuItemId) errors.push('Menu item is required')
  if (!payload.prepDate) errors.push('Prep date is required')
  if (!payload.plannedQty || Number(payload.plannedQty) <= 0) errors.push('Planned quantity must be positive')
  return { valid: errors.length === 0, errors }
}

export function validateProductionWaste(payload = {}) {
  const errors = []
  if (!payload.ingredientId) errors.push('Ingredient is required')
  if (!payload.quantity || Number(payload.quantity) <= 0) errors.push('Quantity must be positive')
  if (!payload.reason?.trim()) errors.push('Reason is required')
  return { valid: errors.length === 0, errors }
}

// ─── Finished Inventory ──────────────────────────────────────────────────────

export function finishedInventoryRecord(payload = {}) {
  return {
    batchId: payload.batchId || '',
    menuItemId: payload.menuItemId,
    menuItemName: String(payload.menuItemName || '').trim(),
    category: payload.category || 'semi_finished',
    quantity: Math.max(0, Number(payload.quantity || 0)),
    unit: payload.unit || 'units',
    costPerUnit: Math.max(0, Number(payload.costPerUnit || 0)),
    expiryDate: payload.expiryDate || null,
    notes: String(payload.notes || '').trim(),
    status: 'available',
  }
}

// ─── Default Settings ────────────────────────────────────────────────────────

export const KITCHEN_PRODUCTION_SETTINGS_DEFAULTS = {
  enableAutoDeduction: true,
  enableBatchProduction: true,
  enablePrepPlanning: true,
  enableSemiFinished: true,
  enableWasteTracking: true,
  negativeStockPrevention: true,
  requireManagerWasteApproval: false,
  defaultBatchSize: 10,
  prepLeadTimeHours: 2,
  expiryAlertDays: 3,
  autoCompleteBatches: false,
}
