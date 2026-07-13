import { motion } from 'framer-motion'
import { useState, useMemo, useEffect } from 'react'
import { HiOutlinePlus, HiOutlineCheckCircle, HiOutlineArrowPath, HiOutlineTrash } from 'react-icons/hi2'
import { Link } from 'react-router-dom'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import Badge from '../components/ui/Badge.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Toast from '../components/ui/Toast.jsx'
import EmptyState from '../components/system/EmptyState.jsx'
import { useKitchenPrep } from '../hooks/useKitchenPrep.js'
import { useRestaurantRecipes } from '../hooks/useRestaurantRecipes.js'
import { PREP_STATUSES, generatePrepSheet } from '../lib/kitchenProductionCalculations.js'
import { loadRestaurantMenuItems } from '../data/restaurantMenu.js'
import { loadRestaurantMenuCategories } from '../data/restaurantMenu.js'

export default function KitchenPrepSheetPage() {
  const today = new Date().toISOString().slice(0, 10)
  const api = useKitchenPrep({ date: today })
  const { recipes } = useRestaurantRecipes()
  const [selectedDate, setSelectedDate] = useState(today)
  const [toast, setToast] = useState(null)

  function show(t, m) { setToast({ tone: t, message: m }); setTimeout(() => setToast(null), 1800) }

  const menuItems = useMemo(() => loadRestaurantMenuItems().filter((i) => i.status !== 'Inactive'), [])
  const prepSheet = useMemo(() => generatePrepSheet(menuItems, recipes, 'morning'), [menuItems, recipes])

  async function handleGenerateAll() {
    let count = 0
    for (const item of prepSheet) {
      const exists = api.prepItems.some((p) => p.menuItemId === item.menuItemId && String(p.prepDate) === selectedDate)
      if (exists) continue
      const res = await api.createPrepItem({
        menuItemId: item.menuItemId,
        menuItemName: item.menuItemName,
        menuItemCategory: item.category,
        prepDate: selectedDate,
        plannedQty: 10,
        ingredients: item.ingredients,
      })
      if (res.ok) count++
    }
    show('success', `${count} prep items generated for ${selectedDate}`)
  }

  async function handleToggleComplete(item) {
    const completed = item.status === 'completed' ? 0 : item.plannedQty
    const res = await api.updatePrepStatus(item.id, completed)
    if (!res.ok) show('error', res.error)
  }

  const todayItems = useMemo(() => api.prepItems.filter((p) => String(p.prepDate || p.date) === selectedDate), [api.prepItems, selectedDate])
  const pendingItems = todayItems.filter((p) => p.status !== 'completed')
  const completedItems = todayItems.filter((p) => p.status === 'completed')

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      {toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}
      <PageHeader title="Kitchen Prep Sheet" subtitle="Daily, shift-level prep planning with auto-generation from recipes."
        right={<><Link to="/app/kitchen-production"><Button variant="subtle" className="rounded-2xl">Dashboard</Button></Link>
        <Button className="rounded-2xl" onClick={handleGenerateAll}><HiOutlineArrowPath /> Generate Prep</Button></>} />

      <div className="mb-4">
        <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <p className="mb-3 text-sm font-bold text-slate-950">To Prep ({pendingItems.length})</p>
          {api.loading ? <div className="grid h-32 place-items-center text-sm text-slate-500">Loading...</div>
            : pendingItems.length === 0 ? <p className="text-sm text-slate-500 text-center py-8">All prep completed! 🎉</p>
            : <div className="space-y-2">
              {pendingItems.map((item) => {
                const ps = PREP_STATUSES.find((x) => x.id === item.status)
                return (
                  <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-950 text-sm">{item.menuItemName}</span>
                        {ps && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${ps.color}`}>{ps.label}</span>}
                      </div>
                      <p className="text-xs text-slate-500">{item.menuItemCategory} · Plan: {item.plannedQty} · Done: {item.completedQty || 0}</p>
                    </div>
                    <button onClick={() => handleToggleComplete(item)} className="rounded-xl border border-emerald-200 bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100">
                      <HiOutlineCheckCircle className="h-4 w-4" />
                    </button>
                  </div>
                )
              })}
            </div>}
        </Card>

        <Card className="p-5">
          <p className="mb-3 text-sm font-bold text-slate-950">Completed ({completedItems.length})</p>
          {completedItems.length === 0 ? <p className="text-sm text-slate-500 text-center py-8">No items completed yet.</p>
            : <div className="space-y-2">
              {completedItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-emerald-800 text-sm">{item.menuItemName}</span>
                      <Badge variant="success">Done</Badge>
                    </div>
                    <p className="text-xs text-emerald-600">{item.completedQty}/{item.plannedQty} completed</p>
                  </div>
                  <button onClick={() => handleToggleComplete(item)} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50">
                    <HiOutlineArrowPath className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>}
        </Card>
      </div>
    </motion.div>
  )
}
