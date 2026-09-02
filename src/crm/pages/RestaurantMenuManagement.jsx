import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  HiOutlineBars3,
  HiOutlineBeaker,
  HiOutlineCloudArrowUp,
  HiOutlineDocumentDuplicate,
  HiOutlineMagnifyingGlass,
  HiOutlineNoSymbol,
  HiOutlinePencilSquare,
  HiOutlinePhoto,
  HiOutlinePlus,
  HiOutlineSquares2X2,
  HiOutlineTag,
  HiOutlineTrash,
} from 'react-icons/hi2'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import Input from '../components/ui/Input.jsx'
import Select from '../components/ui/Select.jsx'
import { hasRestaurantOffer, loadRestaurantMenuCategories, loadRestaurantMenuItems, saveRestaurantMenuCategories, saveRestaurantMenuItems } from '../data/restaurantMenu.js'
import { hasDemoMenuLoaded, hasUserCreatedItems, markDemoMenuLoaded, removeDemoItems, restaurantDemoFloors, restaurantDemoItems } from '../data/restaurantMenuDemo.js'
import { scopedKey } from '../lib/localDataEvents.js'
import { useTrackFirstActivity } from '../hooks/useReviewPrompt.js'
import { finalItemPrice, formatRestaurantCurrency, normalizeDiscountType, safeMoney } from '../lib/restaurantPosCalculations.js'
import { cn } from '../utils/cn.js'
import { useUser } from '../hooks/useUser.js'
import { useRestaurantIngredients, useRestaurantRecipes } from '../hooks/useRestaurantRecipes.js'
import { useRestaurantWasteTracking } from '../hooks/useRestaurantWasteTracking.js'
import RestaurantInventoryPanel from '../components/restaurant/RestaurantInventoryPanel.jsx'
import MenuImportModal from '../components/restaurant/MenuImportModal.jsx'
import MenuImportPreview from '../components/restaurant/MenuImportPreview.jsx'
import MenuImportSummary from '../components/restaurant/MenuImportSummary.jsx'
import { useMenuImport, IMPORT_STATE } from '../hooks/useMenuImport.js'

const blankItem = {
  name: '',
  category: 'Burgers',
  description: '',
  price: '',
  costPrice: '',
  sku: '',
  preparationTime: '',
  itemType: 'Food',
  availability: 'Available',
  status: 'Active',
  taxEnabled: true,
  serviceChargeEnabled: true,
  discountType: 'percentage',
  discountValue: '',
  offerTitle: '',
  offerStartDate: '',
  offerEndDate: '',
  happyHour: false,
  buyOneGetOne: false,
  comboOffer: false,
  tone: 'from-sky-600 to-indigo-500',
}

function Field({ label, className = '', children }) {
  return (
    <label className={cn('block min-w-0', className)}>
      <span className="mb-1.5 block text-xs font-semibold text-slate-500">{label}</span>
      {children}
    </label>
  )
}

function ToggleField({ label, checked, onChange }) {
  return (
    <label className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-slate-950" />
    </label>
  )
}

export default function RestaurantMenuManagementPage() {
  const { workspaceId, businessType, userId, firebaseUser } = useUser()
  const trackFirstActivity = useTrackFirstActivity()
  const { ingredients, addIngredient } = useRestaurantIngredients({ enabled: Boolean(workspaceId) })
  const { recipes, saveRecipe } = useRestaurantRecipes({ enabled: Boolean(workspaceId) })
  const { wasteRecords, recordWaste } = useRestaurantWasteTracking({ enabled: Boolean(workspaceId) })
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All Menu')
  const [statusFilter, setStatusFilter] = useState('all')
  const [offerFilter, setOfferFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form, setForm] = useState(blankItem)
  const [items, setItems] = useState(() => loadRestaurantMenuItems())
  const [categories, setCategories] = useState(() => loadRestaurantMenuCategories())
  const [newCategory, setNewCategory] = useState('')
  const [viewMode, setViewMode] = useState('list')
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [confirmAction, setConfirmAction] = useState(null)
  const [demoLoaded, setDemoLoaded] = useState(() => hasDemoMenuLoaded())
  const [demoLoading, setDemoLoading] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)

  // AI Menu Import hook
  const menuImport = useMenuImport({
    workspaceId,
    existingItems: items,
    existingCategories: categories,
    onImportComplete: (importedItems, newCategories) => {
      setItems(current => [...importedItems, ...current])
      if (newCategories.length > 0) {
        setCategories(current => {
          const merged = [...current, ...newCategories]
          return [...new Set(merged)]
        })
      }
    },
  })

  // Show demo button only when: demo never loaded AND no user-created items exist
  const showDemoButton = !demoLoaded && !hasUserCreatedItems(items)

  function loadDemoMenu() {
    trackFirstActivity()
    setDemoLoading(true)
    // Small delay so the spinner shows briefly (perceived performance)
    setTimeout(() => {
      // 1. Load demo menu items
      setItems((current) => {
        const existingKeys = new Set(current.map((item) => `${item.name}::${item.category}`))
        const fresh = restaurantDemoItems.filter((demo) => !existingKeys.has(`${demo.name}::${demo.category}`))
        return [...fresh, ...current]
      })
      // 2. Save demo tables to localStorage (same key used by RestaurantTables page)
      try {
        const tablesKey = scopedKey('nexora.restaurant.tables.v1')
        window.localStorage.setItem(tablesKey, JSON.stringify(restaurantDemoFloors))
      } catch { /* Ignore storage failures */ }
      // 3. Also write demo tables to Firestore (fire-and-forget)
      try {
        import('../data/restaurantFirestoreSync.js').then(({ syncDemoTablesToFirestore }) => {
          syncDemoTablesToFirestore(workspaceId, userId || firebaseUser?.uid, restaurantDemoFloors)
        }).catch(() => {})
      } catch { /* dynamic import failed — silently skip */ }
      markDemoMenuLoaded()
      setDemoLoaded(true)
      setDemoLoading(false)
    }, 400)
  }

  useEffect(() => {
    saveRestaurantMenuItems(items, workspaceId, userId || firebaseUser?.uid)
  }, [items, workspaceId, userId, firebaseUser])

  useEffect(() => {
    saveRestaurantMenuCategories(categories)
  }, [categories])

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return items.filter((item) => {
      const matchesQuery = !needle || [item.name, item.category, item.sku, item.description].some((value) => String(value || '').toLowerCase().includes(needle))
      const matchesCategory = category === 'All Menu' || item.category === category
      const matchesStatus = statusFilter === 'all' || String(item.status).toLowerCase() === statusFilter
      const hasOffer = hasRestaurantOffer(item)
      const matchesOffer = offerFilter === 'all' || (offerFilter === 'offers' ? hasOffer : !hasOffer)
      return matchesQuery && matchesCategory && matchesStatus && matchesOffer
    })
  }, [category, items, offerFilter, query, statusFilter])

  function openModal(item = null) {
    setModalOpen(true)
    setEditingItem(item)
    const firstCategory = categories.find((row) => row !== 'All Menu') || blankItem.category
    setForm(item ? { ...item, discountType: normalizeDiscountType(item.discountType) } : { ...blankItem, category: firstCategory })
  }

  function closeModal() {
    setModalOpen(false)
    setEditingItem(null)
    setForm(blankItem)
  }

  function updateField(field, value) {
    const moneyFields = new Set(['price', 'costPrice', 'discountValue'])
    setForm((current) => ({ ...current, [field]: moneyFields.has(field) ? String(safeMoney(value)) : value }))
  }

  function normalizedForm() {
    return {
      ...form,
      id: form.id || `menu-${Date.now()}`,
      price: safeMoney(form.price),
      costPrice: safeMoney(form.costPrice),
      discountType: normalizeDiscountType(form.discountType),
      discountValue: normalizeDiscountType(form.discountType) === 'none' ? 0 : safeMoney(form.discountValue),
    }
  }

  function saveItem() {
    trackFirstActivity()
    const next = normalizedForm()
    const isRealItem = !String(next.id || '').startsWith('demo-')
    setItems((current) => {
      // When saving the first real item after demo was loaded, remove all demo items
      const base = isRealItem && demoLoaded ? removeDemoItems(current) : current
      if (editingItem) return base.map((item) => (item.id === editingItem.id ? next : item))
      return [next, ...base]
    })
    closeModal()
  }

  function duplicateItem(item) {
    setItems((current) => [{ ...item, id: `${item.id}-copy-${Date.now()}`, name: `${item.name} Copy`, sku: `${item.sku}-COPY` }, ...current])
  }

  function toggleItem(item) {
    setItems((current) => current.map((row) => (row.id === item.id ? { ...row, status: row.status === 'Active' ? 'Inactive' : 'Active' } : row)))
  }

  function deleteItemNow(item) {
    setItems((current) => current.filter((row) => row.id !== item.id))
  }

  function requestDeleteItem(item, afterDelete) {
    setConfirmAction({
      title: 'Delete menu item?',
      message: `${item.name} will be removed from the menu. This action cannot be undone.`,
      confirmLabel: 'OK, Delete',
      onConfirm: () => {
        deleteItemNow(item)
        afterDelete?.()
      },
    })
  }

  function addCategory() {
    const label = newCategory.trim()
    if (!label) return
    setCategories((current) => (current.some((item) => item.toLowerCase() === label.toLowerCase()) ? current : [...current, label]))
    setCategory(label)
    setNewCategory('')
  }

  function openCategoryModal() {
    if (category === 'All Menu') return
    setEditingCategory(category)
    setCategoryName(category)
    setCategoryModalOpen(true)
  }

  function closeCategoryModal() {
    setCategoryModalOpen(false)
    setEditingCategory('')
    setCategoryName('')
  }

  function saveCategoryEdit() {
    const nextName = categoryName.trim()
    if (!editingCategory || !nextName || editingCategory === 'All Menu') return
    const duplicate = categories.some((item) => item.toLowerCase() === nextName.toLowerCase() && item !== editingCategory)
    if (duplicate) return
    setCategories((current) => current.map((item) => (item === editingCategory ? nextName : item)))
    setItems((current) => current.map((item) => (item.category === editingCategory ? { ...item, category: nextName } : item)))
    if (category === editingCategory) setCategory(nextName)
    if (form.category === editingCategory) setForm((current) => ({ ...current, category: nextName }))
    closeCategoryModal()
  }

  function requestRemoveCategory(targetCategory = category) {
    if (!targetCategory || targetCategory === 'All Menu') return
    const fallbackCategory = categories.find((item) => item !== 'All Menu' && item !== targetCategory) || 'Burgers'
    const affectedItems = items.filter((item) => item.category === targetCategory).length
    setConfirmAction({
      title: 'Remove category?',
      message: affectedItems
        ? `${targetCategory} has ${affectedItems} item(s). They will move to ${fallbackCategory}.`
        : `${targetCategory} will be removed from category filters.`,
      confirmLabel: 'OK, Remove',
      onConfirm: () => {
        setCategories((current) => current.filter((item) => item !== targetCategory))
        setItems((current) => current.map((item) => (item.category === targetCategory ? { ...item, category: fallbackCategory } : item)))
        if (category === targetCategory) setCategory('All Menu')
        if (form.category === targetCategory) setForm((current) => ({ ...current, category: fallbackCategory }))
        closeCategoryModal()
      },
    })
  }

  function confirmPendingAction() {
    const action = confirmAction
    setConfirmAction(null)
    action?.onConfirm?.()
  }

  return (
    <>
      <AnimatePresence>
        {inventoryOpen ? (
          <RestaurantInventoryPanel
            ingredients={ingredients}
            recipes={recipes}
            wasteRecords={wasteRecords}
            itemSales={[]}
            menuItems={items}
            currency="PKR"
            onSaveIngredient={(data) => addIngredient(data)}
            onSaveRecipe={(data) => saveRecipe(data)}
            onRecordWaste={(data) => recordWaste(data)}
            onClose={() => setInventoryOpen(false)}
          />
        ) : null}
      </AnimatePresence>
      <motion.div
        className="min-w-0 space-y-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card className="rounded-[1.35rem] p-4 sm:p-5">
          <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <Badge variant="warning">Restaurant POS</Badge>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">Menu Management</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                Manage menu items, pricing, availability, offers, and discounts.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="subtle" onClick={() => setImportModalOpen(true)} className="!rounded-full !bg-white/80 !backdrop-blur-xl !border-slate-200/50 !shadow-[0_2px_12px_-2px_rgba(123,97,255,0.18)] hover:!shadow-[0_6px_20px_-4px_rgba(123,97,255,0.28)] hover:!-translate-y-px !transition-all !duration-300 !px-3.5 !gap-1.5">
                <img src="/nexora-ai-logo.png" alt="AI" className="h-5 w-5 rounded-md object-cover shadow-[0_1px_4px_rgba(123,97,255,0.3)]" />
                <span className="text-[12.5px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">Import with AI</span>
              </Button>
              <Button type="button" variant="subtle" onClick={() => setInventoryOpen(true)}>
                <HiOutlineBeaker className="h-4 w-4" />
                Inventory Intelligence
              </Button>
              <Button type="button" onClick={() => openModal()}>
                <HiOutlinePlus className="h-4 w-4" />
                Add Item
              </Button>
            </div>
          </div>

          <div className="mt-5 grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_180px_160px_160px_auto]">
            <div className="relative min-w-0">
              <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search menu item, SKU, or category" className="pl-9" />
            </div>
            <Select value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((item) => <option key={item}>{item}</option>)}
            </Select>
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
            <Select value={offerFilter} onChange={(event) => setOfferFilter(event.target.value)}>
              <option value="all">All offers</option>
              <option value="offers">Offer / Discount</option>
              <option value="regular">No offer</option>
            </Select>
            <div className="flex rounded-2xl border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn('flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition', viewMode === 'grid' ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-50')}
              >
                <HiOutlineSquares2X2 className="h-4 w-4" />
                Grid View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={cn('flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition', viewMode === 'list' ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-50')}
              >
                <HiOutlineBars3 className="h-4 w-4" />
                List View
              </button>
            </div>
          </div>
          <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
            <Input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="Create category e.g. BBQ, Pizza, Desserts" />
            <Button type="button" variant="subtle" onClick={addCategory}>
              <HiOutlinePlus className="h-4 w-4" />
              Add Category
            </Button>
            <Button type="button" variant="subtle" disabled={category === 'All Menu'} onClick={openCategoryModal}>
              <HiOutlinePencilSquare className="h-4 w-4" />
              Edit Category
            </Button>
            <Button type="button" variant="subtle" disabled={category === 'All Menu'} onClick={() => requestRemoveCategory(category)}>
              <HiOutlineTrash className="h-4 w-4" />
              Remove Category
            </Button>
          </div>
        </Card>

        {viewMode === 'grid' ? (
        <div className="grid min-w-0 gap-2 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredItems.map((item) => (
            <Card key={item.id} className="rounded-[1rem] p-2.5">
              <div className={cn('relative h-16 overflow-hidden rounded-xl bg-gradient-to-br', item.tone)}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_24%,rgba(255,255,255,0.42),transparent_32%),radial-gradient(circle_at_78%_76%,rgba(15,23,42,0.25),transparent_36%)]" />
                <div className="absolute bottom-1.5 left-1.5 grid h-8 w-8 place-items-center rounded-lg bg-white/90 text-[11px] font-black text-slate-950 shadow-sm">
                  {item.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                {hasRestaurantOffer(item) ? (
                  <Badge variant="warning" className="absolute right-1.5 top-1.5 bg-white/90 px-1.5 py-0.5 text-[9.5px]">
                    <HiOutlineTag className="mr-1 h-3.5 w-3.5" />
                    Offer
                  </Badge>
                ) : null}
              </div>

              <div className="mt-2 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-950 dark:text-white">{item.name}</p>
                    <p className="mt-0.5 truncate text-[10.5px] text-slate-500">{item.category} • {item.sku}</p>
                  </div>
                  <Badge variant={item.status === 'Active' ? 'success' : 'default'} className="px-1.5 py-0.5 text-[9.5px]">{item.status}</Badge>
                </div>
                <p className="mt-1.5 line-clamp-2 min-h-8 text-[11px] leading-4 text-slate-500">{item.description}</p>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  <div className="rounded-xl bg-slate-50 p-1.5">
                    <p className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-slate-400">Price</p>
                    <p className="mt-0.5 text-xs font-black text-slate-950">{formatRestaurantCurrency(item.price)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-1.5">
                    <p className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-slate-400">Final</p>
                    <p className="mt-0.5 text-xs font-black text-slate-950">{formatRestaurantCurrency(finalItemPrice(item))}</p>
                  </div>
                </div>
                <div className="mt-1.5 rounded-xl bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">
                  {safeMoney(item.discountValue) > 0 ? `${item.discountValue}${normalizeDiscountType(item.discountType) === 'percentage' ? '%' : ' PKR'} discount` : 'No discount'}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Button type="button" variant="subtle" className="h-8 flex-1 px-2.5 text-xs" onClick={() => openModal(item)}>
                    <HiOutlinePencilSquare className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button type="button" variant="subtle" className="h-8 px-2.5 text-xs" onClick={() => duplicateItem(item)} title="Duplicate item">
                    <HiOutlineDocumentDuplicate className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="subtle" className="h-8 px-2.5 text-xs" onClick={() => toggleItem(item)} title={item.status === 'Active' ? 'Disable item' : 'Enable item'}>
                    <HiOutlineNoSymbol className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="subtle" className="h-8 px-2.5 text-xs" onClick={() => requestDeleteItem(item)} title="Delete item">
                    <HiOutlineTrash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
        ) : (
          <Card className="overflow-hidden rounded-[1.1rem] p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Item name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Discount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="bg-white">
                      <td className="px-4 py-3" data-label="Item name">
                        <p className="font-semibold text-slate-950">{item.name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{item.sku}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600" data-label="Category">{item.category}</td>
                      <td className="px-4 py-3" data-label="Price">
                        <p className="font-bold text-slate-950">{formatRestaurantCurrency(finalItemPrice(item))}</p>
                        <p className="text-xs text-slate-500">Base {formatRestaurantCurrency(item.price)}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600" data-label="Discount">
                        {safeMoney(item.discountValue) > 0 ? `${item.discountValue}${normalizeDiscountType(item.discountType) === 'percentage' ? '%' : ' PKR'}` : 'None'}
                      </td>
                      <td className="px-4 py-3" data-label="Status">
                        <Badge variant={item.status === 'Active' ? 'success' : 'default'}>{item.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <Button type="button" variant="subtle" className="h-8 px-2.5 text-xs" onClick={() => openModal(item)}><HiOutlinePencilSquare className="h-4 w-4" />Edit</Button>
                          <Button type="button" variant="subtle" className="h-8 px-2.5 text-xs" onClick={() => duplicateItem(item)} title="Duplicate item"><HiOutlineDocumentDuplicate className="h-4 w-4" /></Button>
                          <Button type="button" variant="subtle" className="h-8 px-2.5 text-xs" onClick={() => toggleItem(item)} title={item.status === 'Active' ? 'Disable item' : 'Enable item'}><HiOutlineNoSymbol className="h-4 w-4" /></Button>
                          <Button type="button" variant="subtle" className="h-8 px-2.5 text-xs" onClick={() => requestDeleteItem(item)} title="Delete item"><HiOutlineTrash className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </motion.div>

      {modalOpen ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 px-3 py-4 backdrop-blur-sm">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-hidden rounded-[1.15rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-2.5">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Menu Item</p>
                <h2 className="mt-1 text-lg font-black text-slate-950">{editingItem ? 'Edit Item' : 'Add Item'}</h2>
              </div>
              <button type="button" onClick={closeModal} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-sm font-black text-slate-500 hover:bg-slate-50" aria-label="Close menu item modal">
                x
              </button>
            </div>

            <div className="max-h-[calc(100dvh-11rem)] overflow-y-auto px-4 py-3">
              <div className="grid gap-3 md:grid-cols-[150px_minmax(0,1fr)]">
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3 text-center">
                  <div className="mx-auto grid h-20 w-full place-items-center rounded-xl bg-white text-slate-400">
                    <HiOutlinePhoto className="h-8 w-8" />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-slate-950">Image placeholder</p>
                  <p className="mt-1 text-[11px] leading-4 text-slate-500">Upload UI placeholder.</p>
                  <Button type="button" variant="subtle" className="mt-2 h-8 w-full text-xs">Upload</Button>
                </div>

                <div className="grid min-w-0 gap-2.5 md:grid-cols-2">
                  <Field label="Item name">
                    <Input value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Menu item name" />
                  </Field>
                  <Field label="Category">
                    <Select value={form.category} onChange={(event) => updateField('category', event.target.value)}>
                      {categories.filter((item) => item !== 'All Menu').map((item) => <option key={item}>{item}</option>)}
                    </Select>
                  </Field>
                  <Field label="Item type">
                    <Select value={form.itemType} onChange={(event) => updateField('itemType', event.target.value)}>
                      <option>Food</option>
                      <option>Drink</option>
                      <option>Combo</option>
                      <option>Add-on</option>
                    </Select>
                  </Field>
                  <Field label="Description" className="md:col-span-2">
                    <textarea value={form.description} onChange={(event) => updateField('description', event.target.value)} className="min-h-16 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-300" placeholder="Short item description" />
                  </Field>
                  <Field label="Price">
                    <Input value={form.price} onChange={(event) => updateField('price', event.target.value)} placeholder="0" />
                  </Field>
                  <Field label="Cost price">
                    <Input value={form.costPrice} onChange={(event) => updateField('costPrice', event.target.value)} placeholder="0" />
                  </Field>
                  <Field label="SKU/code">
                    <Input value={form.sku} onChange={(event) => updateField('sku', event.target.value)} placeholder="SKU" />
                  </Field>
                  <Field label="Preparation time">
                    <Input value={form.preparationTime} onChange={(event) => updateField('preparationTime', event.target.value)} placeholder="12 min" />
                  </Field>
                  <Field label="Availability">
                    <Select value={form.availability} onChange={(event) => updateField('availability', event.target.value)}>
                      <option>Available</option>
                      <option>Out of Stock</option>
                    </Select>
                  </Field>
                  <Field label="Status">
                    <Select value={form.status} onChange={(event) => updateField('status', event.target.value)}>
                      <option>Active</option>
                      <option>Inactive</option>
                    </Select>
                  </Field>
                  <ToggleField label="Tax enabled" checked={Boolean(form.taxEnabled)} onChange={(value) => updateField('taxEnabled', value)} />
                  <ToggleField label="Service charge enabled" checked={Boolean(form.serviceChargeEnabled)} onChange={(value) => updateField('serviceChargeEnabled', value)} />
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-black text-slate-950">Offers / Discounts</p>
                <div className="mt-2.5 grid gap-2.5 md:grid-cols-2">
                  <Field label="Discount type">
                    <Select value={form.discountType} onChange={(event) => updateField('discountType', event.target.value)}>
                      <option value="none">None</option>
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed amount</option>
                    </Select>
                  </Field>
                  <Field label="Discount value">
                    <Input value={form.discountValue} onChange={(event) => updateField('discountValue', event.target.value)} placeholder="0" />
                  </Field>
                  <Field label="Offer title">
                    <Input value={form.offerTitle} onChange={(event) => updateField('offerTitle', event.target.value)} placeholder="Happy Hour" />
                  </Field>
                  <Field label="Offer start date">
                    <Input type="date" value={form.offerStartDate} onChange={(event) => updateField('offerStartDate', event.target.value)} />
                  </Field>
                  <Field label="Offer end date">
                    <Input type="date" value={form.offerEndDate} onChange={(event) => updateField('offerEndDate', event.target.value)} />
                  </Field>
                  <div className="grid gap-2 md:col-span-2 md:grid-cols-3">
                    <ToggleField label="Happy hour" checked={Boolean(form.happyHour)} onChange={(value) => updateField('happyHour', value)} />
                    <ToggleField label="Buy 1 Get 1" checked={Boolean(form.buyOneGetOne)} onChange={(value) => updateField('buyOneGetOne', value)} />
                    <ToggleField label="Combo offer" checked={Boolean(form.comboOffer)} onChange={(value) => updateField('comboOffer', value)} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-4 py-2.5 sm:flex-row sm:flex-wrap sm:justify-end">
              <Button type="button" variant="subtle" onClick={closeModal}>Cancel</Button>
              <Button type="button" variant="subtle" disabled={!editingItem} onClick={() => editingItem && duplicateItem(editingItem)}>
                <HiOutlineDocumentDuplicate className="h-4 w-4" />
                Duplicate Item
              </Button>
              <Button type="button" variant="subtle" disabled={!editingItem} onClick={() => editingItem && toggleItem(editingItem)}>
                <HiOutlineNoSymbol className="h-4 w-4" />
                {editingItem?.status === 'Active' ? 'Disable Item' : 'Enable Item'}
              </Button>
              <Button type="button" variant="subtle" disabled={!editingItem} onClick={() => editingItem && requestDeleteItem(editingItem, closeModal)}>
                <HiOutlineTrash className="h-4 w-4" />
                Delete Item
              </Button>
              <Button type="button" onClick={saveItem}>Save Item</Button>
            </div>
          </div>
        </div>
      ) : null}

      {categoryModalOpen ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/45 px-3 py-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[1.15rem] border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Menu Category</p>
              <h2 className="mt-1 text-lg font-black text-slate-950">Edit Category</h2>
            </div>
            <div className="space-y-3 px-4 py-4">
              <Field label="Category name">
                <Input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Category name" />
              </Field>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                Removing a category asks for confirmation first. Existing items are moved to another category.
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="subtle" onClick={closeCategoryModal}>Cancel</Button>
              <Button type="button" variant="subtle" onClick={() => requestRemoveCategory(editingCategory)}>
                <HiOutlineTrash className="h-4 w-4" />
                Remove
              </Button>
              <Button type="button" onClick={saveCategoryEdit}>Save Category</Button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmAction ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/50 px-3 py-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-[1.15rem] border border-slate-200 bg-white shadow-2xl">
            <div className="px-4 py-4">
              <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-rose-50 text-rose-600">
                <HiOutlineTrash className="h-5 w-5" />
              </div>
              <h2 className="mt-3 text-center text-lg font-black text-slate-950">{confirmAction.title}</h2>
              <p className="mt-2 text-center text-sm leading-6 text-slate-500">{confirmAction.message}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
              <Button type="button" variant="subtle" onClick={() => setConfirmAction(null)}>Cancel</Button>
              <Button type="button" onClick={confirmPendingAction}>{confirmAction.confirmLabel || 'OK'}</Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── AI Menu Import Modals ── */}
      {importModalOpen && menuImport.state === IMPORT_STATE.PREVIEWING ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/20 px-4 py-6 backdrop-blur-md">
          <MenuImportPreview
            items={menuImport.previewItems}
            stats={menuImport.extractionStats}
            onUpdateItem={menuImport.updatePreviewItem}
            onToggleItem={menuImport.toggleItem}
            onSelectAll={menuImport.selectAll}
            onDeselectWarnings={menuImport.deselectWarnings}
            onDeselectDuplicates={menuImport.deselectDuplicates}
            onSave={menuImport.saveSelectedItems}
            onBack={menuImport.backToUpload}
          />
        </div>
      ) : importModalOpen && menuImport.state === IMPORT_STATE.DONE ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/20 px-4 py-6 backdrop-blur-md">
          <MenuImportSummary
            summary={menuImport.summary}
            stats={menuImport.extractionStats}
            fileName={menuImport.file?.name}
            onDone={() => {
              menuImport.reset()
              setImportModalOpen(false)
            }}
          />
        </div>
      ) : (
        <MenuImportModal
          open={importModalOpen}
          onClose={() => {
            menuImport.reset()
            setImportModalOpen(false)
          }}
          importCtx={menuImport}
        />
      )}

    </>
  )
}
