/**
 * Restaurant POS Inventory Intelligence Engine
 *
 * Pure functions for food cost analysis, inventory valuation, waste tracking,
 * low-stock alerts, and purchase recommendations.
 *
 * No Firebase, no browser APIs, no side effects.
 */

/* ─── Helpers ──────────────────────────────────────────────────── */

function num(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function pct(value, total) {
  return total > 0 ? (value / total) * 100 : 0
}

function arr(source) {
  return Array.isArray(source) ? source : []
}

function safeMoney(value) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

/* ─── Food Cost Analysis ───────────────────────────────────────── */

/**
 * Compute food cost metrics from recipes, ingredient stock, and order data.
 *
 * @param {Object} params
 * @param {Array} params.recipes — recipe records with ingredients
 * @param {Array} params.ingredients — ingredient stock records
 * @param {Array} params.menuItems — restaurant menu items (with price/costPrice)
 * @param {Array} params.itemSales — item sales from the report model
 * @returns {Object} foodCostAnalysis
 */
export function computeFoodCostAnalysis({ recipes = [], ingredients = [], menuItems = [], itemSales = [] } = {}) {
  const recipeRows = arr(recipes)
  const ingredientRows = arr(ingredients)
  const menuItemRows = arr(menuItems)
  const itemSalesRows = arr(itemSales)

  if (!recipeRows.length) {
    return {
      totalFoodCost: 0,
      totalSales: 0,
      foodCostPct: 0,
      recipeCount: 0,
      ingredientCount: ingredientRows.length,
      itemCosts: [],
      menuItemMargins: [],
      note: 'No recipes defined. Add recipes to see food cost analysis.',
    }
  }

  // Map menu items by id for quick lookup
  const menuItemMap = {}
  menuItemRows.forEach((item) => {
    menuItemMap[item.id] = item
  })

  // Map item sales by id for quick lookup
  const salesMap = {}
  itemSalesRows.forEach((sale) => {
    salesMap[sale.id || sale.itemId] = sale
  })

  // Compute per-item food costs and margins
  const itemCosts = []
  let totalFoodCost = 0
  let totalSales = 0

  recipeRows.forEach((recipe) => {
    const recipeCost = safeMoney(recipe.totalCost)
    const yield_ = Math.max(1, num(recipe.yield_))
    const costPerYield = recipeCost / yield_

    const menuItem = menuItemMap[recipe.menuItemId]
    const sellingPrice = menuItem ? safeMoney(menuItem.price) : 0
    const salesQty = salesMap[recipe.menuItemId]
      ? num(salesMap[recipe.menuItemId].quantity)
      : 0
    const salesRevenue = salesQty * sellingPrice

    totalFoodCost += costPerYield * Math.max(salesQty, 1)
    totalSales += salesRevenue || sellingPrice

    itemCosts.push({
      menuItemId: recipe.menuItemId,
      menuItemName: recipe.menuItemName || menuItem?.name || 'Unknown',
      recipeCost,
      costPerYield,
      yield_,
      sellingPrice,
      salesQty: Math.max(0, salesQty),
      salesRevenue,
      margin: sellingPrice > 0 ? sellingPrice - costPerYield : 0,
      marginPct: sellingPrice > 0 ? ((sellingPrice - costPerYield) / sellingPrice) * 100 : 0,
      costPct: sellingPrice > 0 ? (costPerYield / sellingPrice) * 100 : 0,
    })
  })

  const foodCostPct = totalSales > 0 ? (totalFoodCost / totalSales) * 100 : 0

  // Highest/lowest margin items
  const sortedByMargin = [...itemCosts].sort((a, b) => b.marginPct - a.marginPct)
  const highestMargin = sortedByMargin.slice(0, 5)
  const lowestMargin = [...sortedByMargin].reverse().filter((i) => i.sellingPrice > 0).slice(0, 5)

  return {
    totalFoodCost: Math.round(totalFoodCost),
    totalSales: Math.round(totalSales),
    foodCostPct: Math.round(foodCostPct * 100) / 100,
    recipeCount: recipeRows.length,
    ingredientCount: ingredientRows.length,
    itemCosts,
    highestMargin,
    lowestMargin,
    menuItemMargins: itemCosts,
    note: '',
  }
}

/* ─── Inventory Valuation ──────────────────────────────────────── */

/**
 * Compute current inventory value from ingredient stock.
 *
 * @param {Array} ingredients — ingredient stock records
 * @returns {Object} inventoryValuation
 */
export function computeInventoryValuation(ingredients = []) {
  const rows = arr(ingredients)
  if (!rows.length) {
    return {
      totalValue: 0,
      totalItems: 0,
      activeItems: 0,
      lowStockItems: [],
      outOfStockItems: [],
      byCategory: [],
      valueBreakdown: [],
      note: 'No ingredients tracked.',
    }
  }

  const active = rows.filter((i) => String(i.status || 'active').toLowerCase() !== 'archived')
  const categoryMap = {}
  let totalValue = 0

  active.forEach((ing) => {
    const stock = safeMoney(ing.stockQuantity)
    const cost = safeMoney(ing.costPerUnit)
    const value = stock * cost
    totalValue += value

    const cat = ing.category || 'Other'
    if (!categoryMap[cat]) categoryMap[cat] = { category: cat, quantity: 0, value: 0, count: 0 }
    categoryMap[cat].quantity += stock
    categoryMap[cat].value += value
    categoryMap[cat].count += 1
  })

  const lowStock = active.filter((i) => {
    const min = safeMoney(i.minStockAlert)
    return min > 0 && safeMoney(i.stockQuantity) <= min && safeMoney(i.stockQuantity) > 0
  })
  const outOfStock = active.filter((i) => safeMoney(i.stockQuantity) <= 0)

  return {
    totalValue: Math.round(totalValue),
    totalItems: rows.length,
    activeItems: active.length,
    lowStockItems: lowStock.length,
    outOfStockItems: outOfStock.length,
    lowStockDetail: lowStock.map((i) => ({
      id: i.id || i.ingredientId,
      name: i.name,
      stock: safeMoney(i.stockQuantity),
      minAlert: safeMoney(i.minStockAlert),
      unit: i.unit || 'pc',
    })),
    outOfStockDetail: outOfStock.map((i) => ({
      id: i.id || i.ingredientId,
      name: i.name,
      unit: i.unit || 'pc',
    })),
    byCategory: Object.values(categoryMap).sort((a, b) => b.value - a.value),
    valueBreakdown: Object.entries(categoryMap)
      .map(([cat, data]) => ({
        category: cat,
        value: Math.round(data.value),
        share: totalValue > 0 ? Math.round((data.value / totalValue) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value),
  }
}

/* ─── Low Stock Alerts ─────────────────────────────────────────── */

/**
 * Generate low-stock alerts from ingredient stock.
 *
 * @param {Array} ingredients — ingredient list
 * @returns {Array} alerts
 */
export function computeLowStockAlerts(ingredients = []) {
  const rows = arr(ingredients)
  const alerts = []

  rows.forEach((ing) => {
    const stock = safeMoney(ing.stockQuantity)
    const min = safeMoney(ing.minStockAlert)

    if (stock <= 0) {
      alerts.push({
        type: 'out_of_stock',
        severity: 'critical',
        category: 'inventory',
        ingredientId: ing.id || ing.ingredientId,
        ingredientName: ing.name || 'Unknown',
        currentStock: stock,
        minStock: min,
        unit: ing.unit || 'pc',
        message: `"${ing.name || 'Unknown'}" is out of stock.`,
      })
    } else if (min > 0 && stock <= min) {
      alerts.push({
        type: 'low_stock',
        severity: 'warning',
        category: 'inventory',
        ingredientId: ing.id || ing.ingredientId,
        ingredientName: ing.name || 'Unknown',
        currentStock: stock,
        minStock: min,
        unit: ing.unit || 'pc',
        message: `"${ing.name || 'Unknown'}" is low on stock (${stock} ${ing.unit || 'pc'} remaining, min ${min}).`,
      })
    }
  })

  return alerts
}

/* ─── Purchase Recommendations ─────────────────────────────────── */

/**
 * Generate purchase recommendations for low-stock ingredients.
 *
 * @param {Array} ingredients — ingredient list
 * @param {Object} usageRates — optional { ingredientId: dailyUsage }
 * @returns {Array} recommendations
 */
export function computePurchaseRecommendations(ingredients = [], usageRates = {}) {
  const rows = arr(ingredients)
  const recommendations = []

  rows.forEach((ing) => {
    const stock = safeMoney(ing.stockQuantity)
    const min = safeMoney(ing.minStockAlert)
    const costPerUnit = safeMoney(ing.costPerUnit)

    if (stock < min || stock <= 0) {
      const dailyUsage = num(usageRates[ing.id || ing.ingredientId]) || 1
      const daysUntilEmpty = dailyUsage > 0 ? Math.floor(stock / dailyUsage) : 0
      const reorderQty = Math.ceil((min * 2) - stock)
      const estimatedCost = reorderQty * costPerUnit

      recommendations.push({
        ingredientId: ing.id || ing.ingredientId,
        ingredientName: ing.name || 'Unknown',
        currentStock: stock,
        minStockAlert: min,
        unit: ing.unit || 'pc',
        reorderQuantity: Math.max(0, reorderQty),
        estimatedCost: Math.round(estimatedCost),
        daysUntilEmpty,
        priority: stock <= 0 ? 'critical' : daysUntilEmpty <= 1 ? 'high' : daysUntilEmpty <= 3 ? 'medium' : 'low',
      })
    }
  })

  return recommendations.sort((a, b) => {
    const p = { critical: 0, high: 1, medium: 2, low: 3 }
    return (p[a.priority] || 99) - (p[b.priority] || 99)
  })
}

/* ─── Waste Analysis ───────────────────────────────────────────── */

/**
 * Compute waste metrics from waste records.
 *
 * @param {Array} wasteRecords — waste tracking records
 * @returns {Object} wasteAnalysis
 */
export function computeWasteAnalysis(wasteRecords = []) {
  const rows = arr(wasteRecords)
  if (!rows.length) {
    return {
      totalWaste: 0,
      totalCost: 0,
      recordCount: 0,
      byReason: [],
      byIngredient: [],
      note: 'No waste records.',
    }
  }

  const reasonMap = {}
  const ingredientMap = {}
  let totalCost = 0

  rows.forEach((w) => {
    const cost = safeMoney(w.totalCost)
    totalCost += cost
    const qty = safeMoney(w.quantity)

    const reason = w.reason || 'Other'
    if (!reasonMap[reason]) reasonMap[reason] = { reason, quantity: 0, cost: 0, count: 0 }
    reasonMap[reason].quantity += qty
    reasonMap[reason].cost += cost
    reasonMap[reason].count += 1

    const name = w.ingredientName || 'Unknown'
    if (!ingredientMap[name]) ingredientMap[name] = { ingredient: name, quantity: 0, cost: 0, count: 0 }
    ingredientMap[name].quantity += qty
    ingredientMap[name].cost += cost
    ingredientMap[name].count += 1
  })

  return {
    totalWaste: rows.reduce((s, w) => s + safeMoney(w.quantity), 0),
    totalCost: Math.round(totalCost),
    recordCount: rows.length,
    byReason: Object.values(reasonMap).sort((a, b) => b.cost - a.cost),
    byIngredient: Object.values(ingredientMap).sort((a, b) => b.cost - a.cost),
    note: '',
  }
}

/* ─── Inventory KPIs ───────────────────────────────────────────── */

/**
 * Compute a comprehensive inventory KPI dashboard.
 *
 * @param {Object} params
 * @returns {Object} inventoryDashboard
 */
export function computeInventoryDashboard({
  ingredients = [],
  recipes = [],
  wasteRecords = [],
  itemSales = [],
  menuItems = [],
} = {}) {
  const valuation = computeInventoryValuation(ingredients)
  const lowStockAlerts = computeLowStockAlerts(ingredients)
  const purchaseRecs = computePurchaseRecommendations(ingredients)
  const wasteAnalysis = computeWasteAnalysis(wasteRecords)
  const foodCost = computeFoodCostAnalysis({ recipes, ingredients, menuItems, itemSales })

  // Inventory health score (0-100)
  let healthScore = 100
  if (valuation.activeItems > 0) {
    const lowStockPct = valuation.lowStockItems / valuation.activeItems
    const outOfStockPct = valuation.outOfStockItems / valuation.activeItems
    healthScore -= lowStockPct * 30
    healthScore -= outOfStockPct * 40
  }
  if (foodCost.foodCostPct > 0) {
    // Ideal food cost 28-35%, penalize outside that range
    if (foodCost.foodCostPct > 40) healthScore -= (foodCost.foodCostPct - 40) * 0.5
    if (foodCost.foodCostPct < 20 && foodCost.foodCostPct > 0) healthScore -= (20 - foodCost.foodCostPct) * 0.3
  }
  if (wasteAnalysis.totalCost > 0 && valuation.totalValue > 0) {
    const wastePct = wasteAnalysis.totalCost / valuation.totalValue * 100
    if (wastePct > 5) healthScore -= (wastePct - 5) * 0.5
  }
  healthScore = Math.max(0, Math.min(100, Math.round(healthScore)))

  return {
    healthScore,
    healthLevel: healthScore >= 80 ? 'Good' : healthScore >= 50 ? 'Warning' : 'Critical',
    valuation,
    lowStockAlerts,
    purchaseRecommendations: purchaseRecs,
    wasteAnalysis,
    foodCostAnalysis: foodCost,
    recipeCount: recipes.length,
    ingredientCount: ingredients.length,
    totalAlerts: lowStockAlerts.length,
    criticalAlerts: lowStockAlerts.filter((a) => a.severity === 'critical').length,
    warningAlerts: lowStockAlerts.filter((a) => a.severity === 'warning').length,
  }
}
