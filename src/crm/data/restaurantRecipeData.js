/**
 * Pure data-model and validation helpers for Restaurant POS recipe/BOM engine.
 *
 * No Firebase imports, no browser APIs, no localStorage — only serializable
 * plain objects returned.
 */

/* ─── Supported values ─────────────────────────────────────────── */

const SUPPORTED_UNITS = Object.freeze([
  'pc', 'kg', 'g', 'l', 'ml', 'packet', 'dozen', 'cup', 'tbsp', 'tsp',
])

const SUPPORTED_INGREDIENT_CATEGORIES = Object.freeze([
  'Meat', 'Poultry', 'Seafood', 'Vegetables', 'Fruits', 'Dairy',
  'Grains', 'Spices', 'Oils', 'Beverages', 'Packaging', 'Other',
])

const DEDUCTION_STATUSES = Object.freeze([
  'pending', 'completed', 'failed',
])

/* ─── Helpers ──────────────────────────────────────────────────── */

function safeMoney(value) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

function rawNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function str(value) {
  return String(value ?? '').trim()
}

function arr(value) {
  return Array.isArray(value) ? value : []
}

/* ─── Normalizers ──────────────────────────────────────────────── */

export function normalizeUnit(value) {
  const raw = str(value).toLowerCase()
  if (SUPPORTED_UNITS.includes(raw)) return raw
  return 'pc'
}

export function normalizeIngredientCategory(value) {
  const raw = str(value)
  if (SUPPORTED_INGREDIENT_CATEGORIES.includes(raw)) return raw
  return 'Other'
}

export function normalizeDeductionStatus(value) {
  const raw = str(value).toLowerCase()
  if (DEDUCTION_STATUSES.includes(raw)) return raw
  return 'pending'
}

/* ─── Ingredient record ────────────────────────────────────────── */

export function createIngredientRecord(input = {}) {
  return {
    workspaceId: str(input.workspaceId),
    businessType: str(input.businessType),
    name: str(input.name),
    category: normalizeIngredientCategory(input.category),
    unit: normalizeUnit(input.unit),
    stockQuantity: safeMoney(input.stockQuantity),
    minStockAlert: safeMoney(input.minStockAlert),
    costPerUnit: safeMoney(input.costPerUnit),
    supplier: str(input.supplier),
    sku: str(input.sku),
    notes: str(input.notes),
    status: str(input.status) || 'active',
    lastRestockedAt: input.lastRestockedAt || '',
    createdAt: input.createdAt || '',
    updatedAt: input.updatedAt || '',
  }
}

export function validateIngredient(record = {}) {
  const errors = []
  if (!record.workspaceId) errors.push('workspaceId is required')
  if (!record.name) errors.push('Ingredient name is required')
  if (record.stockQuantity < 0) errors.push('Stock quantity cannot be negative')
  if (record.costPerUnit < 0) errors.push('Cost per unit cannot be negative')
  return { valid: errors.length === 0, errors, record }
}

/* ─── Recipe (BOM) record ──────────────────────────────────────── */

export function createRecipeRecord(input = {}) {
  const rawIngredients = arr(input.ingredients)
  const ingredients = rawIngredients.map((ing) => ({
    ingredientId: str(ing.ingredientId),
    name: str(ing.name),
    quantity: safeMoney(ing.quantity),
    unit: normalizeUnit(ing.unit),
    costPerUnit: safeMoney(ing.costPerUnit),
    lineCost: safeMoney(ing.quantity) * safeMoney(ing.costPerUnit),
  }))

  const totalCost = ingredients.reduce((sum, ing) => sum + ing.lineCost, 0)

  return {
    workspaceId: str(input.workspaceId),
    businessType: str(input.businessType),
    menuItemId: str(input.menuItemId),
    menuItemName: str(input.menuItemName),
    ingredients,
    totalCost,
    yield_: rawNumber(input.yield) || 1,
    preparationNotes: str(input.preparationNotes),
    version: Math.max(1, Math.floor(rawNumber(input.version) || 1)),
    status: str(input.status) || 'active',
    createdAt: input.createdAt || '',
    updatedAt: input.updatedAt || '',
  }
}

export function validateRecipe(record = {}) {
  const errors = []
  if (!record.workspaceId) errors.push('workspaceId is required')
  if (!record.menuItemId) errors.push('menuItemId is required')
  if (!arr(record.ingredients).length) errors.push('At least one ingredient is required')
  if (record.totalCost < 0) errors.push('Total cost cannot be negative')
  return { valid: errors.length === 0, errors, record }
}

/* ─── Deduction record (ingredient deduction on order payment) ─── */

export function createDeductionRecord(input = {}) {
  return {
    workspaceId: str(input.workspaceId),
    businessType: str(input.businessType),
    orderNumber: str(input.orderNumber),
    menuItemId: str(input.menuItemId),
    menuItemName: str(input.menuItemName),
    quantity: Math.max(1, Math.floor(rawNumber(input.quantity) || 1)),
    ingredientId: str(input.ingredientId),
    ingredientName: str(input.ingredientName),
    ingredientQty: safeMoney(input.ingredientQty),
    unit: normalizeUnit(input.unit),
    costAtDeduction: safeMoney(input.costAtDeduction),
    totalCost: safeMoney(input.ingredientQty) * safeMoney(input.costAtDeduction),
    status: normalizeDeductionStatus(input.status),
    businessDay: str(input.businessDay),
    deductedAt: input.deductedAt || '',
    notes: str(input.notes),
    createdAt: input.createdAt || '',
    updatedAt: input.updatedAt || '',
  }
}

/* ─── Waste record ─────────────────────────────────────────────── */

export function createWasteRecord(input = {}) {
  return {
    workspaceId: str(input.workspaceId),
    businessType: str(input.businessType),
    ingredientId: str(input.ingredientId),
    ingredientName: str(input.ingredientName),
    quantity: safeMoney(input.quantity),
    unit: normalizeUnit(input.unit),
    costAtWaste: safeMoney(input.costAtWaste),
    totalCost: safeMoney(input.quantity) * safeMoney(input.costAtWaste),
    reason: str(input.reason),
    recordedBy: str(input.recordedBy),
    businessDay: str(input.businessDay),
    occurredAt: input.occurredAt || '',
    notes: str(input.notes),
    createdAt: input.createdAt || '',
    updatedAt: input.updatedAt || '',
  }
}

export function validateWaste(record = {}) {
  const errors = []
  if (!record.workspaceId) errors.push('workspaceId is required')
  if (!record.ingredientId) errors.push('ingredientId is required')
  if (record.quantity <= 0) errors.push('Quantity must be greater than zero')
  if (!record.reason) errors.push('Waste reason is required')
  return { valid: errors.length === 0, errors, record }
}

/* ─── Stock adjustment (restock / adjust) ──────────────────────── */

export function createStockAdjustmentRecord(input = {}) {
  return {
    workspaceId: str(input.workspaceId),
    businessType: str(input.businessType),
    ingredientId: str(input.ingredientId),
    ingredientName: str(input.ingredientName),
    type: str(input.type) || 'restock', // restock | adjustment | loss
    previousStock: safeMoney(input.previousStock),
    adjustment: rawNumber(input.adjustment),
    newStock: safeMoney(input.previousStock) + rawNumber(input.adjustment),
    unit: normalizeUnit(input.unit),
    costPerUnit: safeMoney(input.costPerUnit),
    totalCost: Math.abs(rawNumber(input.adjustment)) * safeMoney(input.costPerUnit),
    reason: str(input.reason),
    referenceNumber: str(input.referenceNumber),
    recordedBy: str(input.recordedBy),
    createdAt: input.createdAt || '',
    updatedAt: input.updatedAt || '',
  }
}

/* ─── Purchase recommendation ──────────────────────────────────── */

export function buildPurchaseRecommendation(ingredient = {}, dailyUsage = 0) {
  const stock = safeMoney(ingredient.stockQuantity)
  const minStock = safeMoney(ingredient.minStockAlert)
  const costPerUnit = safeMoney(ingredient.costPerUnit)

  if (stock >= minStock) return null

  const daysUntilEmpty = dailyUsage > 0 ? Math.floor(stock / dailyUsage) : 0
  const reorderQty = Math.ceil((minStock * 2) - stock)
  const estimatedCost = reorderQty * costPerUnit

  return {
    ingredientId: ingredient.id || str(ingredient.ingredientId),
    ingredientName: ingredient.name || '',
    currentStock: stock,
    minStockAlert: minStock,
    unit: normalizeUnit(ingredient.unit),
    reorderQuantity: Math.max(0, reorderQty),
    estimatedCost,
    daysUntilEmpty,
    priority: stock <= 0 ? 'critical' : daysUntilEmpty <= 1 ? 'high' : daysUntilEmpty <= 3 ? 'medium' : 'low',
  }
}

export { SUPPORTED_UNITS, SUPPORTED_INGREDIENT_CATEGORIES, DEDUCTION_STATUSES }
