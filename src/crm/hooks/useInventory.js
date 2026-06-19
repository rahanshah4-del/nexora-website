import { useMemo } from 'react'

function toNumber(value, fallback = 0) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

// Tracked physical products only (services/digital/subscription don't carry stock).
export function isStockTracked(product) {
  return String(product?.productType || 'product').toLowerCase() === 'product'
}

export function stockState(product) {
  const stock = toNumber(product.stockQuantity)
  const min = Math.max(toNumber(product.minStockAlert), 0)
  if (stock <= 0) return { key: 'out-of-stock', label: 'Out Of Stock', tone: 'danger' }
  if (min > 0 && stock <= min) return { key: 'low-stock', label: 'Low Stock', tone: 'warning' }
  return { key: 'in-stock', label: 'In Stock', tone: 'success' }
}

// Derives dashboard metrics from the products collection + transaction ledger.
export function calculateInventoryStats(products = [], transactions = []) {
  const productRows = Array.isArray(products) ? products : []
  const transactionRows = Array.isArray(transactions) ? transactions : []
  const activeProducts = productRows.filter((product) => String(product.status || 'active').toLowerCase() !== 'archived')
  const tracked = activeProducts.filter(isStockTracked)
  const lowStock = []
  const outOfStock = []
  let totalStock = 0
  let inventoryValue = 0
  let retailValue = 0

  tracked.forEach((product) => {
    const qty = Math.max(0, toNumber(product.stockQuantity))
    totalStock += qty
    inventoryValue += qty * Math.max(0, toNumber(product.costPrice))
    retailValue += qty * Math.max(0, toNumber(product.price))
    const state = stockState({ ...product, stockQuantity: qty })
    if (state.key === 'out-of-stock') outOfStock.push(product)
    else if (state.key === 'low-stock') lowStock.push(product)
  })

  const recentMovements = [...transactionRows]
    .sort((a, b) => {
      const at = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime()
      const bt = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime()
      return bt - at
    })
    .slice(0, 8)

  return {
    totalProducts: activeProducts.length,
    trackedProducts: tracked.length,
    totalStock,
    lowStockItems: lowStock,
    outOfStockItems: outOfStock,
    lowStockCount: lowStock.length,
    outOfStockCount: outOfStock.length,
    inventoryValue,
    retailValue,
    potentialMargin: retailValue - inventoryValue,
    recentMovements,
  }
}

export function useInventoryStats(products = [], transactions = []) {
  return useMemo(() => calculateInventoryStats(products, transactions), [products, transactions])
}
