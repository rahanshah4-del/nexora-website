import { useCallback, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HiOutlineArchiveBox, HiOutlineBanknotes, HiOutlineBeaker,
  HiOutlineClipboardDocumentList, HiOutlineExclamationTriangle,
  HiOutlinePlus, HiOutlineTrash, HiOutlineXMark,
} from 'react-icons/hi2'
import Button from '../ui/Button.jsx'
import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'
import { formatRestaurantCurrency } from '../../lib/restaurantPosCalculations.js'
import {
  computeInventoryDashboard,
  computeLowStockAlerts,
  computePurchaseRecommendations,
} from '../../reports/restaurant/restaurantInventoryIntelligence.js'

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: HiOutlineClipboardDocumentList },
  { id: 'ingredients', label: 'Ingredients', icon: HiOutlineBeaker },
  { id: 'recipes', label: 'Recipes', icon: HiOutlineArchiveBox },
  { id: 'waste', label: 'Waste', icon: HiOutlineExclamationTriangle },
  { id: 'purchases', label: 'Purchase Recs', icon: HiOutlineBanknotes },
]

function safeDate(d) {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString() } catch { return '' }
}

/* ─── Sub-component: Ingredient form ──────────────────────────── */

function IngredientForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || {
    name: '', category: 'Other', unit: 'pc', stockQuantity: 0,
    minStockAlert: 0, costPerUnit: 0, supplier: '', sku: '',
  })
  const update = (key, val) => setForm((f) => ({ ...f, [key]: val }))
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-500">Name</span>
          <Input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Chicken breast" />
        </label>
        <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-500">Category</span>
          <Select value={form.category} onChange={(e) => update('category', e.target.value)}>
            {['Meat','Poultry','Seafood','Vegetables','Fruits','Dairy','Grains','Spices','Oils','Beverages','Packaging','Other'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </label>
        <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-500">Unit</span>
          <Select value={form.unit} onChange={(e) => update('unit', e.target.value)}>
            {['pc','kg','g','l','ml','packet','dozen','cup','tbsp','tsp'].map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </Select>
        </label>
        <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-500">Stock Qty</span>
          <Input type="number" value={form.stockQuantity} onChange={(e) => update('stockQuantity', Number(e.target.value))} />
        </label>
        <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-500">Min Stock Alert</span>
          <Input type="number" value={form.minStockAlert} onChange={(e) => update('minStockAlert', Number(e.target.value))} />
        </label>
        <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-500">Cost per Unit</span>
          <Input type="number" value={form.costPerUnit} onChange={(e) => update('costPerUnit', Number(e.target.value))} />
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="subtle" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave?.(form)}>Save</Button>
      </div>
    </div>
  )
}

/* ─── Sub-component: Recipe form ──────────────────────────────── */

function RecipeForm({ menuItem, ingredients = [], initial, onSave, onCancel }) {
  const [recipe, setRecipe] = useState(initial || { ingredients: [] })
  const [newIng, setNewIng] = useState({ ingredientId: '', name: '', quantity: 0, unit: 'pc', costPerUnit: 0 })
  const addIng = () => {
    if (!newIng.ingredientId) return
    setRecipe((r) => ({ ...r, ingredients: [...r.ingredients, { ...newIng, lineCost: Number(newIng.quantity) * Number(newIng.costPerUnit) }] }))
    setNewIng({ ingredientId: '', name: '', quantity: 0, unit: 'pc', costPerUnit: 0 })
  }
  const totalCost = useMemo(() => recipe.ingredients.reduce((s, i) => s + (Number(i.quantity) * Number(i.costPerUnit) || 0), 0), [recipe.ingredients])
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-bold text-slate-900">Recipe for: {menuItem?.name || 'Unknown'}</p>
      {menuItem?.price ? <p className="text-xs text-slate-500">Selling price: {formatRestaurantCurrency(menuItem.price)}</p> : null}
      {totalCost > 0 ? (
        <p className="text-xs font-semibold">
          <span className="text-slate-500">Total cost: </span>
          <span className={totalCost > (menuItem?.price || 0) * 0.6 ? 'text-rose-600' : 'text-emerald-600'}>
            {formatRestaurantCurrency(totalCost)} ({menuItem?.price ? ((totalCost / menuItem.price) * 100).toFixed(1) : 0}%)
          </span>
        </p>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-5">
        <select value={newIng.ingredientId} onChange={(e) => {
          const ing = ingredients.find((i) => (i.id || i.ingredientId) === e.target.value)
          setNewIng({ ingredientId: e.target.value, name: ing?.name || '', quantity: 0, unit: ing?.unit || 'pc', costPerUnit: ing?.costPerUnit || 0 })
        }} className="h-9 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300">
          <option value="">Select ingredient</option>
          {ingredients.filter((i) => String(i.status || 'active') !== 'archived').map((i) => (
            <option key={i.id || i.ingredientId} value={i.id || i.ingredientId}>{i.name} ({i.stockQuantity || 0} {i.unit || 'pc'})</option>
          ))}
        </select>
        <Input type="number" placeholder="Qty" value={newIng.quantity} onChange={(e) => setNewIng((n) => ({ ...n, quantity: Number(e.target.value) }))} />
        <select value={newIng.unit} onChange={(e) => setNewIng((n) => ({ ...n, unit: e.target.value }))} className="h-9 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300">
          {['pc','kg','g','l','ml','packet','dozen','cup','tbsp','tsp'].map((u) => (<option key={u} value={u}>{u}</option>))}
        </select>
        <Input type="number" placeholder="Cost/unit" value={newIng.costPerUnit} onChange={(e) => setNewIng((n) => ({ ...n, costPerUnit: Number(e.target.value) }))} />
        <Button onClick={addIng} disabled={!newIng.ingredientId || !newIng.quantity}>Add</Button>
      </div>
      {recipe.ingredients.length > 0 && (
        <div className="space-y-1">
          {recipe.ingredients.map((ing, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-xs">
              <span className="font-semibold text-slate-700">{ing.name}</span>
              <span className="text-slate-500">{ing.quantity} {ing.unit} × {formatRestaurantCurrency(ing.costPerUnit)} = {formatRestaurantCurrency(ing.lineCost)}</span>
              <button onClick={() => setRecipe((r) => ({ ...r, ingredients: r.ingredients.filter((_, idx) => idx !== i) }))} className="text-rose-500 hover:text-rose-700"><HiOutlineTrash className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="subtle" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave?.({ ...recipe, menuItemId: menuItem?.id, menuItemName: menuItem?.name, totalCost })}>Save Recipe</Button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   MAIN INVENTORY PANEL
   ══════════════════════════════════════════════════════════════════ */

export default function RestaurantInventoryPanel({
  ingredients = [],
  recipes = [],
  wasteRecords = [],
  itemSales = [],
  menuItems = [],
  currency = 'PKR',
  onSaveIngredient,
  onSaveRecipe,
  onRecordWaste,
  onClose,
}) {
  const [tab, setTab] = useState('dashboard')
  const [addingIngredient, setAddingIngredient] = useState(false)
  const [recipeForItem, setRecipeForItem] = useState(null)
  const [wasteForm, setWasteForm] = useState(null)

  const dashboard = useMemo(
    () => computeInventoryDashboard({ ingredients, recipes, wasteRecords, itemSales, menuItems }),
    [ingredients, recipes, wasteRecords, itemSales, menuItems],
  )
  const lowStockAlerts = useMemo(() => computeLowStockAlerts(ingredients), [ingredients])
  const purchaseRecs = useMemo(() => computePurchaseRecommendations(ingredients), [ingredients])

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-950/45 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="mx-auto my-8 max-w-5xl rounded-[1.25rem] border border-slate-200 bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="text-lg font-black text-slate-950">Inventory Intelligence</h2>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-sm font-black text-slate-500 hover:bg-slate-50">&times;</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-100 px-5 pt-3">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-t-xl px-3 py-2 text-xs font-bold transition ${
                tab === t.id ? 'bg-sky-50 text-sky-700 border border-slate-200 border-b-white' : 'text-slate-500 hover:text-slate-700'
              }`}
            ><t.icon className="h-4 w-4" />{t.label}</button>
          ))}
        </div>

        <div className="p-5">
          {/* ══ DASHBOARD ══ */}
          {tab === 'dashboard' && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className={`rounded-xl border p-4 ${dashboard.healthScore >= 80 ? 'border-emerald-200 bg-emerald-50' : dashboard.healthScore >= 50 ? 'border-amber-200 bg-amber-50' : 'border-rose-200 bg-rose-50'}`}>
                  <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Inventory Health</p>
                  <p className="mt-1 text-2xl font-black">{dashboard.healthScore}/100</p>
                  <p className="text-xs font-bold">{dashboard.healthLevel}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Total Value</p>
                  <p className="mt-1 text-lg font-bold">{formatRestaurantCurrency(dashboard.valuation.totalValue, currency)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Food Cost</p>
                  <p className={`mt-1 text-lg font-bold ${dashboard.foodCostAnalysis.foodCostPct > 40 ? 'text-rose-600' : dashboard.foodCostAnalysis.foodCostPct > 0 ? 'text-slate-900' : 'text-slate-400'}`}>
                    {dashboard.foodCostAnalysis.foodCostPct > 0 ? `${dashboard.foodCostAnalysis.foodCostPct}%` : 'N/A'}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Ingredients</p>
                  <p className="mt-1 text-lg font-bold">{dashboard.ingredientCount} <span className="text-xs font-normal text-slate-500">({dashboard.recipeCount} recipes)</span></p>
                </div>
              </div>

              {/* Low stock alerts */}
              {lowStockAlerts.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-black uppercase tracking-[0.1em] text-amber-700">Low Stock Alerts ({lowStockAlerts.length})</p>
                  <div className="mt-1 space-y-1">
                    {lowStockAlerts.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full text-[8px] font-black text-white ${a.severity === 'critical' ? 'bg-rose-500' : 'bg-amber-500'}`}>!</span>
                        <span className="text-slate-700">{a.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Purchase recommendations */}
              {purchaseRecs.length > 0 && (
                <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
                  <p className="text-xs font-black uppercase tracking-[0.1em] text-sky-700">Purchase Recommendations ({purchaseRecs.length})</p>
                  <div className="mt-1 space-y-1">
                    {purchaseRecs.slice(0, 5).map((r, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-sky-800">{r.ingredientName}</span>
                        <span className="text-sky-600">Order {r.reorderQuantity} {r.unit} (est. {formatRestaurantCurrency(r.estimatedCost, currency)})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ INGREDIENTS ══ */}
          {tab === 'ingredients' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-900">{ingredients.length} ingredients</p>
                <Button onClick={() => setAddingIngredient((p) => !p)}>{addingIngredient ? 'Cancel' : <><HiOutlinePlus className="h-4 w-4" /> Add Ingredient</>}</Button>
              </div>
              {addingIngredient && (
                <IngredientForm
                  onSave={(data) => { onSaveIngredient?.(data); setAddingIngredient(false) }}
                  onCancel={() => setAddingIngredient(false)}
                />
              )}
              <div className="grid gap-2">
                {ingredients.map((ing) => (
                  <div key={ing.id || ing.ingredientId} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{ing.name}</p>
                      <p className="text-xs text-slate-500">{ing.category} &middot; {ing.supplier ? `${ing.supplier} · ` : ''}{ing.sku || ''}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${Number(ing.stockQuantity) <= Number(ing.minStockAlert) ? 'text-rose-600' : 'text-slate-900'}`}>
                        {Number(ing.stockQuantity).toFixed(1)} {ing.unit || 'pc'}
                      </p>
                      <p className="text-xs text-slate-500">{formatRestaurantCurrency(ing.costPerUnit, currency)}/unit</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ RECIPES ══ */}
          {tab === 'recipes' && (
            <div className="space-y-3">
              <p className="text-sm font-bold text-slate-900">{recipes.length} recipes defined | {menuItems.length - recipes.length} items without recipe</p>
              <div className="grid gap-2">
                {menuItems.filter((m) => m.status !== 'Inactive').map((item) => {
                  const recipe = recipes.find((r) => r.menuItemId === item.id)
                  return (
                    <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.category} &middot; {formatRestaurantCurrency(item.price, currency)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {recipe ? (
                          <p className={`text-xs font-bold ${Number(recipe.totalCost) > Number(item.price) * 0.6 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            Cost: {formatRestaurantCurrency(recipe.totalCost, currency)} ({item.price ? ((recipe.totalCost / item.price) * 100).toFixed(0) : 0}%)
                          </p>
                        ) : <p className="text-xs text-slate-400">No recipe</p>}
                        <Button variant="subtle" onClick={() => setRecipeForItem(recipeForItem?.id === item.id ? null : item)}>
                          {recipeForItem?.id === item.id ? 'Close' : recipe ? 'Edit' : 'Add'}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
              {recipeForItem && (
                <RecipeForm
                  menuItem={recipeForItem}
                  ingredients={ingredients}
                  initial={recipes.find((r) => r.menuItemId === recipeForItem.id)}
                  onSave={(data) => { onSaveRecipe?.(data); setRecipeForItem(null) }}
                  onCancel={() => setRecipeForItem(null)}
                />
              )}
            </div>
          )}

          {/* ══ WASTE ══ */}
          {tab === 'waste' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-900">{wasteRecords.length} records | Total: {formatRestaurantCurrency(dashboard.wasteAnalysis.totalCost, currency)}</p>
                <Button onClick={() => setWasteForm(wasteForm ? null : {})}>{wasteForm ? 'Cancel' : 'Record Waste'}</Button>
              </div>
              {wasteForm && (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-500">Ingredient</span>
                      <select value={wasteForm.ingredientId || ''} onChange={(e) => {
                        const ing = ingredients.find((i) => (i.id || i.ingredientId) === e.target.value)
                        setWasteForm((f) => ({ ...f, ingredientId: e.target.value, ingredientName: ing?.name || '', costAtWaste: ing?.costPerUnit || 0, unit: ing?.unit || 'pc' }))
                      }} className="h-9 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300">
                        <option value="">Select ingredient</option>
                        {ingredients.map((i) => (
                          <option key={i.id || i.ingredientId} value={i.id || i.ingredientId}>{i.name} ({i.stockQuantity || 0} {i.unit || 'pc'})</option>
                        ))}
                      </select>
                    </label>
                    <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-500">Qty wasted</span>
                      <Input type="number" value={wasteForm.quantity || ''} onChange={(e) => setWasteForm((f) => ({ ...f, quantity: Number(e.target.value) }))} />
                    </label>
                    <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-500">Reason</span>
                      <Input value={wasteForm.reason || ''} onChange={(e) => setWasteForm((f) => ({ ...f, reason: e.target.value }))} placeholder="Spoilage, overproduction..." />
                    </label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="subtle" onClick={() => setWasteForm(null)}>Cancel</Button>
                    <Button onClick={() => { onRecordWaste?.(wasteForm); setWasteForm(null) }}>Record</Button>
                  </div>
                </div>
              )}
              <div className="space-y-1">
                {dashboard.wasteAnalysis.byReason.map((r, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-xs">
                    <span className="font-semibold text-slate-700">{r.reason}</span>
                    <span className="text-slate-500">{r.count}x &middot; {formatRestaurantCurrency(r.cost, currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ PURCHASE RECOMMENDATIONS ══ */}
          {tab === 'purchases' && (
            <div className="space-y-2">
              {purchaseRecs.length === 0 && <p className="text-sm text-slate-500">All ingredients are adequately stocked.</p>}
              {purchaseRecs.map((r, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{r.ingredientName}</p>
                    <p className="text-xs text-slate-500">Stock: {r.currentStock} {r.unit} (min: {r.minStockAlert})</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-sky-700">Order {r.reorderQuantity} {r.unit}</p>
                    <p className="text-xs text-slate-500">Est. {formatRestaurantCurrency(r.estimatedCost, currency)} &middot; {r.priority}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
