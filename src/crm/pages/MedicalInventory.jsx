import { useEffect, useMemo, useState } from 'react'
import {
  HiOutlineArrowPath,
  HiOutlineArrowTrendingUp,
  HiOutlineArrowDownTray,
  HiOutlineBanknotes,
  HiOutlineBuildingStorefront,
  HiOutlineCalendarDays,
  HiOutlineCircleStack,
  HiOutlineClipboardDocumentList,
  HiOutlineCube,
  HiOutlineCurrencyDollar,
  HiOutlineExclamationTriangle,
  HiOutlineMagnifyingGlass,
  HiOutlinePencilSquare,
  HiOutlinePlus,
  HiOutlineTag,
  HiOutlineTrash,
  HiOutlineTruck,
} from 'react-icons/hi2'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Badge from '../components/ui/Badge.jsx'
import Input from '../components/ui/Input.jsx'
import Select from '../components/ui/Select.jsx'
import Toast from '../components/ui/Toast.jsx'
import { confirmAction } from '../components/ui/dialogActions.js'
import EmptyState from '../components/system/EmptyState.jsx'
import ProductModal from '../components/products/ProductModal.jsx'
import StockMovementModal from '../components/inventory/StockMovementModal.jsx'
import CategoryModal from '../components/inventory/CategoryModal.jsx'
import SupplierModal from '../components/inventory/SupplierModal.jsx'
import PurchaseModal from '../components/inventory/PurchaseModal.jsx'
import { useMedicineInventory } from '../hooks/useMedicineInventory.js'
import { useCategories } from '../hooks/useCategories.js'
import { useSuppliers } from '../hooks/useSuppliers.js'
import { usePurchases } from '../hooks/usePurchases.js'
import { useAccountTransactions } from '../hooks/useAccountTransactions.js'
import {
  calculatePurchasePaymentStatus,
  calculateSuppliersPayableSummary,
  calculateTotalPayables,
} from '../lib/financeCalculations.js'
import {
  MOVEMENT_TYPES,
  movementLabel,
  movementTone,
  useInventoryTransactions,
} from '../hooks/useInventoryTransactions.js'
import { isStockTracked, stockState, useInventoryStats } from '../hooks/useInventory.js'
import { formatCurrency } from '../utils/format.js'
import { cn } from '../utils/cn.js'

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: HiOutlineArrowTrendingUp },
  { key: 'medicines', label: 'Medicines', icon: HiOutlineCube },
  { key: 'stock', label: 'Stock', icon: HiOutlineCircleStack },
  { key: 'categories', label: 'Categories', icon: HiOutlineTag },
  { key: 'suppliers', label: 'Suppliers', icon: HiOutlineTruck },
  { key: 'purchases', label: 'Purchases', icon: HiOutlineClipboardDocumentList },
  { key: 'transactions', label: 'Transactions', icon: HiOutlineArrowPath },
  { key: 'reports', label: 'Reports', icon: HiOutlineArrowDownTray },
]

function toNumber(value, fallback = 0) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function formatDate(value) {
  if (!value) return '—'
  const date = value?.toDate ? value.toDate() : value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
}

function formatExpiry(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

function expiryState(value) {
  if (!value) return { tone: 'default', label: 'No expiry set' }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return { tone: 'default', label: 'No expiry set' }
  const daysLeft = Math.ceil((date.getTime() - Date.now()) / 86400000)
  if (daysLeft < 0) return { tone: 'danger', label: 'Expired' }
  if (daysLeft <= 30) return { tone: 'warning', label: `Expires in ${daysLeft}d` }
  return { tone: 'success', label: 'Valid' }
}

function downloadCsv(filename, rows) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const escape = (val) => {
    const str = String(val ?? '')
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
  }
  const csv = [headers.join(','), ...rows.map((row) => headers.map((key) => escape(row[key])).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function MetricCard({ icon: Icon, label, value, tone = 'sky', hint }) {
  const tones = {
    sky: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
    rose: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
    indigo: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300',
  }
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', tones[tone])}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-0.5 truncate text-xl font-semibold text-slate-950 dark:text-white">{value}</p>
          {hint ? <p className="truncate text-xs text-slate-400">{hint}</p> : null}
        </div>
      </div>
    </Card>
  )
}

function SectionCard({ title, action, children }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-950 dark:text-white">{title}</p>
        {action}
      </div>
      {children}
    </Card>
  )
}

function SimpleTable({ columns, rows, empty }) {
  if (!rows.length) {
    return <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">{empty}</p>
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/10">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900/50 dark:text-slate-200">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em]">{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white dark:divide-white/10 dark:bg-slate-900/25">
            {rows.map((row, idx) => (
              <tr key={row.id ?? idx} className="transition hover:bg-slate-50 dark:hover:bg-white/5">
                {columns.map((c) => (
                  <td key={c.key} data-label={c.header || undefined} className="whitespace-nowrap px-4 py-3 text-slate-800 dark:text-slate-100">
                    {c.cell ? c.cell(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ReturnForm({ open, purchase, onClose, onReturn, currency }) {
  const [quantities, setQuantities] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open && purchase?.items) {
      const initial = {}
      purchase.items.forEach((item) => { initial[item.productId] = 0 })
      setQuantities(initial)
      setSaving(false)
      setError('')
    }
  }, [open, purchase])

  if (!open || !purchase) return null

  const items = purchase.items || []
  const returnItems = items
    .filter((item) => toNumber(quantities[item.productId], 0) > 0)
    .map((item) => ({
      productId: item.productId,
      productName: item.productName || item.name || '',
      sku: item.sku || '',
      quantity: toNumber(quantities[item.productId], 0),
    }))
  const totalReturnValue = returnItems.reduce((sum, ri) => {
    const found = items.find((i) => i.productId === ri.productId)
    return sum + ri.quantity * toNumber(found?.unitCost, 0)
  }, 0)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!returnItems.length) { setError('Enter return qty for at least one item'); return }
    setSaving(true)
    setError('')
    const result = await onReturn(purchase.id, returnItems)
    setSaving(false)
    if (result?.ok) {
      onClose()
    } else {
      setError(result?.error || 'Return failed')
    }
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/45 p-3 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <p className="text-base font-semibold text-slate-950">Return to Supplier</p>
        <p className="mt-1 text-sm text-slate-500">{purchase.reference || purchase.id}</p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {items.map((item) => (
            <div key={item.productId} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{item.productName || item.productId}</p>
                <p className="text-xs text-slate-500">Received: {toNumber(item.quantity)} · Unit cost: {formatCurrency(toNumber(item.unitCost), currency)}</p>
              </div>
              <Input
                className="h-9 w-20 rounded-xl text-center"
                inputMode="numeric"
                value={quantities[item.productId] ?? 0}
                onChange={(e) => {
                  const val = Math.min(Math.max(0, Number(e.target.value || 0)), toNumber(item.quantity))
                  setQuantities((prev) => ({ ...prev, [item.productId]: val }))
                }}
              />
            </div>
          ))}

          {totalReturnValue > 0 ? (
            <p className="text-right text-sm font-semibold text-slate-700">
              Return value: {formatCurrency(totalReturnValue, currency)}
            </p>
          ) : null}

          {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}

          <div className="flex gap-2">
            <Button className="rounded-xl" type="submit" disabled={saving}>
              {saving ? 'Returning...' : 'Return Items'}
            </Button>
            <Button variant="subtle" className="rounded-xl" type="button" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function IconAction({ label, danger, onClick, children }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        'grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
        danger && 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10',
      )}
    >
      {children}
    </button>
  )
}

function PaymentForm({ open, purchase, onClose, onPay, currency }) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('Cash')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setAmount(String(purchase?.balanceDue || purchase?.total || ''))
      setMethod('Cash')
      setSaving(false)
      setError('')
    }
  }, [open, purchase])

  if (!open || !purchase) return null

  const due = toNumber(purchase.balanceDue, toNumber(purchase.total))

  async function handleSubmit(e) {
    e.preventDefault()
    const paymentAmount = toNumber(amount, 0)
    if (paymentAmount <= 0) { setError('Enter a valid amount'); return }
    setSaving(true)
    setError('')
    const result = await onPay(purchase.id, paymentAmount, { paymentMethod: method })
    setSaving(false)
    if (result?.ok) {
      onClose()
    } else {
      setError(result?.error || 'Payment failed')
    }
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/45 p-3 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <p className="text-base font-semibold text-slate-950">Record Payment</p>
        <p className="mt-1 text-sm text-slate-500">{purchase.reference || purchase.id} — Due: {formatCurrency(due, currency)}</p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <p className="text-xs font-semibold text-slate-600">Amount *</p>
            <Input className="mt-1 h-9 rounded-xl" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600">Payment Method</p>
            <Select className="mt-1 h-9 rounded-xl" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option>Cash</option>
              <option>Bank Transfer</option>
              <option>Cheque</option>
              <option>JazzCash</option>
              <option>EasyPaisa</option>
            </Select>
          </div>

          {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}

          <div className="flex gap-2">
            <Button className="rounded-xl" type="submit" disabled={saving}>
              {saving ? 'Recording...' : 'Record Payment'}
            </Button>
            <Button variant="subtle" className="rounded-xl" type="button" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function MedicineDetailsModal({ open, medicine, onClose, onSave }) {
  const [batchNumber, setBatchNumber] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [manufacturer, setManufacturer] = useState('')
  const [requiresPrescription, setRequiresPrescription] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open && medicine) {
      setBatchNumber(medicine.batchNumber || '')
      setExpiryDate(medicine.expiryDate || '')
      setManufacturer(medicine.manufacturer || '')
      setRequiresPrescription(medicine.requiresPrescription === true)
      setSaving(false)
      setError('')
    }
  }, [open, medicine])

  if (!open || !medicine) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const result = await onSave(medicine.id, { batchNumber, expiryDate, manufacturer, requiresPrescription })
    setSaving(false)
    if (result?.ok) {
      onClose()
    } else {
      setError(result?.error || 'Unable to save medicine details')
    }
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/45 p-3 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <p className="text-base font-semibold text-slate-950">Batch & Expiry</p>
        <p className="mt-1 text-sm text-slate-500">{medicine.name}</p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <p className="text-xs font-semibold text-slate-600">Batch Number</p>
            <Input className="mt-1 h-9 rounded-xl" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="e.g. BN-2026-014" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600">Expiry Date</p>
            <Input className="mt-1 h-9 rounded-xl" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600">Manufacturer</p>
            <Input className="mt-1 h-9 rounded-xl" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} placeholder="e.g. GlaxoSmithKline" />
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={requiresPrescription} onChange={(e) => setRequiresPrescription(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            Requires prescription (Rx)
          </label>

          {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}

          <div className="flex gap-2">
            <Button className="rounded-xl" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Details'}
            </Button>
            <Button variant="subtle" className="rounded-xl" type="button" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function MedicalInventory() {
  console.log('[Medical Inventory Route] render start')
  const [tab, setTab] = useState('dashboard')
  const [toast, setToast] = useState('')

  const medicineApi = useMedicineInventory()
  const categoriesApi = useCategories()
  const suppliersApi = useSuppliers()
  const purchasesApi = usePurchases()
  const transactionsApi = useInventoryTransactions()
  const accountApi = useAccountTransactions({ enabled: true, limitCount: 50 })

  const { medicines } = medicineApi
  const stats = useInventoryStats(medicines, transactionsApi.transactions)

  // Modal state
  const [medicineModal, setMedicineModal] = useState({ open: false, medicine: null })
  const [detailsModal, setDetailsModal] = useState({ open: false, medicine: null })
  const [stockModal, setStockModal] = useState({ open: false, presetProductId: '', presetType: 'stock_in' })
  const [categoryModal, setCategoryModal] = useState({ open: false, category: null })
  const [supplierModal, setSupplierModal] = useState({ open: false, supplier: null })
  const [purchaseModal, setPurchaseModal] = useState({ open: false, purchase: null })
  const [paymentModal, setPaymentModal] = useState({ open: false, purchase: null })
  const [returnModal, setReturnModal] = useState({ open: false, purchase: null })

  const [medicineSearch, setMedicineSearch] = useState('')
  const [txnTypeFilter, setTxnTypeFilter] = useState('all')

  function notify(message) {
    setToast(message)
    window.setTimeout(() => setToast(''), 2200)
  }

  async function handleResult(promise, successMessage) {
    const result = await promise
    if (result?.ok) notify(successMessage)
    else notify(result?.error || 'Something went wrong')
    return result
  }

  const filteredMedicines = useMemo(() => {
    const q = medicineSearch.trim().toLowerCase()
    if (!q) return medicines
    return medicines.filter((medicine) =>
      [medicine.name, medicine.sku, medicine.barcode, medicine.category, medicine.brand, medicine.batchNumber, medicine.manufacturer]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q)),
    )
  }, [medicines, medicineSearch])

  const filteredTransactions = useMemo(() => {
    if (txnTypeFilter === 'all') return transactionsApi.transactions
    return transactionsApi.transactions.filter((txn) => txn.type === txnTypeFilter)
  }, [transactionsApi.transactions, txnTypeFilter])

  const currency = medicines[0]?.currency || 'PKR'

  const expiringSoonCount = useMemo(
    () => medicines.filter((medicine) => expiryState(medicine.expiryDate).tone === 'warning' || expiryState(medicine.expiryDate).tone === 'danger').length,
    [medicines],
  )

  // ---- Save handlers ----
  async function saveMedicine(draft) {
    const result = medicineModal.medicine
      ? await medicineApi.updateMedicine(medicineModal.medicine.id, draft)
      : await medicineApi.createMedicine(draft)
    if (result?.ok) {
      notify(medicineModal.medicine ? 'Medicine updated' : 'Medicine created')
      setMedicineModal({ open: false, medicine: null })
    } else {
      notify(result?.error || 'Unable to save medicine')
    }
  }

  async function saveMedicineDetails(id, draft) {
    const existing = medicines.find((item) => item.id === id)
    const result = await medicineApi.updateMedicine(id, { ...existing, ...draft })
    if (result?.ok) notify('Batch & expiry details updated')
    return result
  }

  return (
    <div className="min-w-0">
      {toast ? <Toast message={toast} onClose={() => setToast('')} /> : null}

      <PageHeader
        title="Medicine Inventory"
        subtitle="Manage medicines, batches, expiry dates, suppliers, purchases, and live stock value for your Medical Store POS workspace."
        right={
          <>
            <Button variant="subtle" className="rounded-2xl" type="button" onClick={() => setStockModal({ open: true, presetProductId: '', presetType: 'stock_in' })}>
              <HiOutlineCircleStack className="h-4 w-4" /> Stock movement
            </Button>
            <Button className="rounded-2xl" type="button" onClick={() => setMedicineModal({ open: true, medicine: null })}>
              <HiOutlinePlus className="h-4 w-4" /> Add medicine
            </Button>
          </>
        }
      />

      {expiringSoonCount > 0 ? (
        <Card className="mb-5 border-amber-200 bg-amber-50/70 p-4 dark:border-amber-500/20 dark:bg-amber-500/5">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              <HiOutlineCalendarDays className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Batches nearing expiry</p>
              <p className="mt-0.5 text-sm text-amber-700/90 dark:text-amber-200/80">
                {expiringSoonCount} medicine(s) are expired or expiring within 30 days. Review batches before selling.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      {/* Tabs */}
      <div className="mb-5 flex gap-1.5 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/70 p-1.5 dark:border-white/10 dark:bg-slate-900/40">
        {TABS.map((item) => {
          const Icon = item.icon
          const active = tab === item.key
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={cn(
                'focus-ring inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition',
                active
                  ? 'bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          )
        })}
      </div>

      {tab === 'dashboard' ? (
        <DashboardTab stats={stats} currency={currency} expiringSoonCount={expiringSoonCount} onView={() => setTab('medicines')} />
      ) : null}

      {tab === 'medicines' ? (
        <MedicinesTab
          medicines={filteredMedicines}
          search={medicineSearch}
          onSearch={setMedicineSearch}
          currency={currency}
          onAdd={() => setMedicineModal({ open: true, medicine: null })}
          onEdit={(medicine) => setMedicineModal({ open: true, medicine })}
          onDetails={(medicine) => setDetailsModal({ open: true, medicine })}
          onStock={(medicine) => setStockModal({ open: true, presetProductId: medicine.id, presetType: 'stock_in' })}
          onDelete={async (medicine) => {
            if (await confirmAction({ title: 'Delete medicine?', message: `Delete ${medicine.name}? This cannot be undone.`, confirmLabel: 'Delete Medicine' })) {
              handleResult(medicineApi.deleteMedicine(medicine.id), 'Medicine deleted')
            }
          }}
        />
      ) : null}

      {tab === 'stock' ? (
        <StockTab
          medicines={medicines}
          onMove={(presetType) => setStockModal({ open: true, presetProductId: '', presetType })}
          onProductMove={(medicine, presetType) => setStockModal({ open: true, presetProductId: medicine.id, presetType })}
          currency={currency}
        />
      ) : null}

      {tab === 'categories' ? (
        <CategoriesTab
          categories={categoriesApi.categories}
          medicines={medicines}
          onAdd={() => setCategoryModal({ open: true, category: null })}
          onEdit={(category) => setCategoryModal({ open: true, category })}
          onDelete={async (category) => {
            if (await confirmAction({ title: 'Delete category?', message: `Delete category ${category.name}?`, confirmLabel: 'Delete Category' })) {
              handleResult(categoriesApi.deleteCategory(category.id), 'Category deleted')
            }
          }}
        />
      ) : null}

      {tab === 'suppliers' ? (
        <SuppliersTab
          suppliers={suppliersApi.suppliers}
          purchases={purchasesApi.purchases}
          currency={currency}
          onAdd={() => setSupplierModal({ open: true, supplier: null })}
          onEdit={(supplier) => setSupplierModal({ open: true, supplier })}
          onDelete={async (supplier) => {
            if (await confirmAction({ title: 'Delete supplier?', message: `Delete supplier ${supplier.name}?`, confirmLabel: 'Delete Supplier' })) {
              handleResult(suppliersApi.deleteSupplier(supplier.id), 'Supplier deleted')
            }
          }}
        />
      ) : null}

      {tab === 'purchases' ? (
        <PurchasesTab
          purchases={purchasesApi.purchases}
          currency={currency}
          onAdd={() => setPurchaseModal({ open: true, purchase: null })}
          onEdit={(purchase) => setPurchaseModal({ open: true, purchase })}
          onReceive={async (purchase) => {
            if (await confirmAction({ tone: 'warning', badge: 'Stock Receipt', title: 'Receive purchase stock?', message: `Receive stock for ${purchase.reference || 'this order'}? Stock will be added to inventory.`, confirmLabel: 'Receive Stock' })) {
              await handleResult(purchasesApi.receivePurchase(purchase.id, transactionsApi.recordMovement), 'Stock received')
            }
          }}
          onPay={(purchase) => setPaymentModal({ open: true, purchase })}
          onReturn={(purchase) => setReturnModal({ open: true, purchase })}
          onDelete={async (purchase) => {
            if (await confirmAction({ title: 'Delete purchase order?', message: `Delete ${purchase.reference || 'this purchase order'}? This cannot be undone.`, confirmLabel: 'Delete Order' })) {
              handleResult(purchasesApi.deletePurchase(purchase.id), 'Purchase deleted')
            }
          }}
        />
      ) : null}

      {tab === 'transactions' ? (
        <TransactionsTab
          transactions={filteredTransactions}
          typeFilter={txnTypeFilter}
          onTypeFilter={setTxnTypeFilter}
        />
      ) : null}

      {tab === 'reports' ? (
        <ReportsTab medicines={medicines} purchases={purchasesApi.purchases} transactions={transactionsApi.transactions} stats={stats} currency={currency} />
      ) : null}

      {/* Modals */}
      <ProductModal
        open={medicineModal.open}
        product={medicineModal.medicine}
        onClose={() => setMedicineModal({ open: false, medicine: null })}
        onSave={saveMedicine}
      />
      <MedicineDetailsModal
        open={detailsModal.open}
        medicine={detailsModal.medicine}
        onClose={() => setDetailsModal({ open: false, medicine: null })}
        onSave={saveMedicineDetails}
      />
      <StockMovementModal
        open={stockModal.open}
        products={medicines}
        presetType={stockModal.presetType}
        presetProductId={stockModal.presetProductId}
        onClose={() => setStockModal({ open: false, presetProductId: '', presetType: 'stock_in' })}
        onSave={async (payload) => {
          const result = await transactionsApi.recordMovement(payload)
          if (result?.ok) {
            notify('Stock movement recorded')
            setStockModal({ open: false, presetProductId: '', presetType: 'stock_in' })
          }
          return result
        }}
      />
      <CategoryModal
        open={categoryModal.open}
        category={categoryModal.category}
        onClose={() => setCategoryModal({ open: false, category: null })}
        onSave={async (draft) => {
          const result = categoryModal.category
            ? await categoriesApi.updateCategory(categoryModal.category.id, draft)
            : await categoriesApi.createCategory(draft)
          if (result?.ok) {
            notify(categoryModal.category ? 'Category updated' : 'Category created')
            setCategoryModal({ open: false, category: null })
          }
          return result
        }}
      />
      <SupplierModal
        open={supplierModal.open}
        supplier={supplierModal.supplier}
        onClose={() => setSupplierModal({ open: false, supplier: null })}
        onSave={async (draft) => {
          const result = supplierModal.supplier
            ? await suppliersApi.updateSupplier(supplierModal.supplier.id, draft)
            : await suppliersApi.createSupplier(draft)
          if (result?.ok) {
            notify(supplierModal.supplier ? 'Supplier updated' : 'Supplier created')
            setSupplierModal({ open: false, supplier: null })
          }
          return result
        }}
      />
      <PurchaseModal
        open={purchaseModal.open}
        purchase={purchaseModal.purchase}
        products={medicines}
        suppliers={suppliersApi.suppliers}
        onClose={() => setPurchaseModal({ open: false, purchase: null })}
        onSave={async (draft) => {
          const result = purchaseModal.purchase
            ? await purchasesApi.updatePurchase(purchaseModal.purchase.id, draft)
            : await purchasesApi.createPurchase(draft)
          if (result?.ok) {
            notify(purchaseModal.purchase ? 'Purchase updated' : 'Purchase order created')
            setPurchaseModal({ open: false, purchase: null })
          }
          return result
        }}
      />

      <PaymentForm
        open={paymentModal.open}
        purchase={paymentModal.purchase}
        currency={currency}
        onClose={() => setPaymentModal({ open: false, purchase: null })}
        onPay={async (id, amount, opts) => {
          return purchasesApi.recordPurchasePayment(id, amount, {
            ...opts,
            createTransaction: accountApi.createTransaction,
          })
        }}
      />

      <ReturnForm
        open={returnModal.open}
        purchase={returnModal.purchase}
        currency={currency}
        onClose={() => setReturnModal({ open: false, purchase: null })}
        onReturn={async (id, returnItems) => {
          return purchasesApi.returnPurchaseItems(id, returnItems, transactionsApi.recordMovement)
        }}
      />
    </div>
  )
}

function MedicineThumb({ medicine }) {
  if (medicine.imageUrl) {
    return <img src={medicine.imageUrl} alt={medicine.name} className="h-9 w-9 rounded-lg border border-slate-200 object-cover" />
  }
  return (
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-indigo-100 bg-gradient-to-br from-indigo-50 to-sky-50 text-[11px] font-bold text-indigo-700">
      {String(medicine.name || 'M').slice(0, 2).toUpperCase()}
    </div>
  )
}

function DashboardTab({ stats, currency, expiringSoonCount, onView }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={HiOutlineCube} label="Total Medicines" value={stats.totalProducts} tone="indigo" hint={`${stats.trackedProducts} stock-tracked`} />
        <MetricCard icon={HiOutlineCircleStack} label="Total Stock" value={stats.totalStock} tone="sky" hint="units on hand" />
        <MetricCard icon={HiOutlineExclamationTriangle} label="Low Stock" value={stats.lowStockCount} tone="amber" hint="need reorder" />
        <MetricCard icon={HiOutlineCalendarDays} label="Expiring / Expired" value={expiringSoonCount} tone="rose" hint="within 30 days" />
        <MetricCard icon={HiOutlineBanknotes} label="Inventory Value" value={formatCurrency(stats.inventoryValue, currency)} tone="emerald" hint="at cost price" />
      </div>

      {stats.lowStockCount + stats.outOfStockCount > 0 ? (
        <Card className="border-amber-200 bg-amber-50/70 p-4 dark:border-amber-500/20 dark:bg-amber-500/5">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              <HiOutlineExclamationTriangle className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Stock attention needed</p>
              <p className="mt-0.5 text-sm text-amber-700/90 dark:text-amber-200/80">
                {stats.outOfStockCount} out of stock and {stats.lowStockCount} low-stock medicines. Reorder soon to avoid lost sales.
              </p>
              <Button variant="subtle" className="mt-3 rounded-xl" type="button" onClick={onView}>
                Review medicines
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Low stock medicines">
          <SimpleTable
            columns={[
              { key: 'name', header: 'Medicine', cell: (row) => <span className="font-semibold text-slate-900 dark:text-white">{row.name}</span> },
              { key: 'stockQuantity', header: 'Stock', cell: (row) => toNumber(row.stockQuantity) },
              { key: 'minStockAlert', header: 'Min', cell: (row) => toNumber(row.minStockAlert) },
              { key: 'status', header: 'Status', cell: (row) => { const s = stockState(row); return <Badge variant={s.tone}>{s.label}</Badge> } },
            ]}
            rows={[...stats.outOfStockItems, ...stats.lowStockItems].slice(0, 8)}
            empty="All stock levels are healthy."
          />
        </SectionCard>

        <SectionCard title="Recent stock movements">
          <SimpleTable
            columns={[
              { key: 'type', header: 'Type', cell: (row) => <Badge variant={movementTone(row.type)}>{movementLabel(row.type)}</Badge> },
              { key: 'productName', header: 'Medicine' },
              { key: 'delta', header: 'Change', cell: (row) => <span className={row.delta >= 0 ? 'font-semibold text-emerald-600' : 'font-semibold text-rose-600'}>{row.delta >= 0 ? '+' : ''}{row.delta}</span> },
              { key: 'createdAt', header: 'When', cell: (row) => formatDate(row.createdAt) },
            ]}
            rows={stats.recentMovements}
            empty="No stock movements recorded yet."
          />
        </SectionCard>
      </div>
    </div>
  )
}

function MedicinesTab({ medicines, search, onSearch, currency, onAdd, onEdit, onDetails, onStock, onDelete }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search by name, SKU, barcode, batch, manufacturer…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="rounded-2xl" type="button" onClick={onAdd}>
            <HiOutlinePlus className="h-4 w-4" /> Add medicine
          </Button>
        </div>
      </div>

      {medicines.length ? (
        <SimpleTable
          columns={[
            {
              key: 'name',
              header: 'Medicine',
              cell: (row) => (
                <div className="flex items-center gap-3">
                  <MedicineThumb medicine={row} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900 dark:text-white">{row.name}</p>
                    <p className="truncate text-xs text-slate-500">{row.sku || row.barcode || 'No SKU'}{row.manufacturer ? ` · ${row.manufacturer}` : ''}</p>
                  </div>
                </div>
              ),
            },
            { key: 'category', header: 'Category', cell: (row) => row.category || '—' },
            { key: 'batchNumber', header: 'Batch', cell: (row) => row.batchNumber || '—' },
            {
              key: 'expiryDate',
              header: 'Expiry',
              cell: (row) => {
                const s = expiryState(row.expiryDate)
                return (
                  <div className="space-y-1">
                    <p>{formatExpiry(row.expiryDate)}</p>
                    <Badge variant={s.tone}>{s.label}</Badge>
                  </div>
                )
              },
            },
            { key: 'requiresPrescription', header: 'Rx', cell: (row) => row.requiresPrescription ? <Badge variant="danger">Rx required</Badge> : <Badge variant="default">OTC</Badge> },
            { key: 'stockQuantity', header: 'Stock', cell: (row) => (isStockTracked(row) ? toNumber(row.stockQuantity) : '—') },
            { key: 'price', header: 'Price', cell: (row) => formatCurrency(row.price, row.currency || currency) },
            { key: 'status', header: 'Status', cell: (row) => { const s = stockState(row); return isStockTracked(row) ? <Badge variant={s.tone}>{s.label}</Badge> : <Badge variant="info">Service</Badge> } },
            {
              key: 'actions',
              header: '',
              cell: (row) => (
                <div className="flex items-center justify-end gap-1.5">
                  <IconAction label="Batch & expiry" onClick={() => onDetails(row)}><HiOutlineCalendarDays className="h-4 w-4" /></IconAction>
                  <IconAction label="Stock movement" onClick={() => onStock(row)}><HiOutlineCircleStack className="h-4 w-4" /></IconAction>
                  <IconAction label="Edit" onClick={() => onEdit(row)}><HiOutlinePencilSquare className="h-4 w-4" /></IconAction>
                  <IconAction label="Delete" danger onClick={() => onDelete(row)}><HiOutlineTrash className="h-4 w-4" /></IconAction>
                </div>
              ),
            },
          ]}
          rows={medicines}
          empty="No medicines found."
        />
      ) : (
        <EmptyState title="No medicines yet" description="Add your first medicine to start tracking inventory." actionLabel="Add medicine" onAction={onAdd} />
      )}
    </Card>
  )
}

function StockTab({ medicines, onMove, onProductMove, currency }) {
  const actions = [
    { type: 'stock_in', label: 'Stock In', icon: HiOutlinePlus, tone: 'emerald' },
    { type: 'stock_out', label: 'Stock Out', icon: HiOutlineArrowPath, tone: 'amber' },
    { type: 'adjustment', label: 'Adjustment', icon: HiOutlinePencilSquare, tone: 'indigo' },
    { type: 'opening', label: 'Opening', icon: HiOutlineCircleStack, tone: 'sky' },
    { type: 'damaged', label: 'Damaged', icon: HiOutlineExclamationTriangle, tone: 'rose' },
    { type: 'returned', label: 'Returned', icon: HiOutlineArrowPath, tone: 'sky' },
    { type: 'transfer', label: 'Transfer', icon: HiOutlineTruck, tone: 'indigo' },
  ]
  return (
    <div className="space-y-5">
      <Card className="p-4 sm:p-5">
        <p className="mb-3 text-sm font-semibold text-slate-950 dark:text-white">Quick stock actions</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.type}
                type="button"
                onClick={() => onMove(action.type)}
                className="focus-ring flex flex-col items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-3 text-center text-xs font-semibold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <Icon className="h-5 w-5 text-sky-600" />
                {action.label}
              </button>
            )
          })}
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <p className="mb-3 text-sm font-semibold text-slate-950 dark:text-white">Current stock levels</p>
        <SimpleTable
          columns={[
            { key: 'name', header: 'Medicine', cell: (row) => <span className="font-semibold text-slate-900 dark:text-white">{row.name}</span> },
            { key: 'sku', header: 'SKU', cell: (row) => row.sku || '—' },
            { key: 'batchNumber', header: 'Batch', cell: (row) => row.batchNumber || '—' },
            { key: 'stockQuantity', header: 'On hand', cell: (row) => toNumber(row.stockQuantity) },
            { key: 'value', header: 'Stock value', cell: (row) => formatCurrency(toNumber(row.stockQuantity) * toNumber(row.costPrice), row.currency || currency) },
            { key: 'status', header: 'Status', cell: (row) => { const s = stockState(row); return <Badge variant={s.tone}>{s.label}</Badge> } },
            { key: 'actions', header: '', cell: (row) => (
              <div className="flex justify-end">
                <IconAction label="Record movement" onClick={() => onProductMove(row, 'stock_in')}><HiOutlineCircleStack className="h-4 w-4" /></IconAction>
              </div>
            ) },
          ]}
          rows={medicines.filter(isStockTracked)}
          empty="No stock-tracked medicines yet."
        />
      </Card>
    </div>
  )
}

function CategoriesTab({ categories, medicines, onAdd, onEdit, onDelete }) {
  const counts = useMemo(() => {
    const map = {}
    medicines.forEach((medicine) => {
      const key = (medicine.category || 'General').toLowerCase()
      map[key] = (map[key] || 0) + 1
    })
    return map
  }, [medicines])

  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-950 dark:text-white">Categories</p>
        <Button className="rounded-2xl" type="button" onClick={onAdd}>
          <HiOutlinePlus className="h-4 w-4" /> Add category
        </Button>
      </div>
      {categories.length ? (
        <SimpleTable
          columns={[
            { key: 'name', header: 'Name', cell: (row) => <span className="font-semibold text-slate-900 dark:text-white">{row.name}</span> },
            { key: 'description', header: 'Description', cell: (row) => row.description || '—' },
            { key: 'medicines', header: 'Medicines', cell: (row) => counts[String(row.name).toLowerCase()] || 0 },
            { key: 'status', header: 'Status', cell: (row) => <Badge variant={row.status === 'active' ? 'success' : 'default'}>{row.status}</Badge> },
            { key: 'actions', header: '', cell: (row) => (
              <div className="flex items-center justify-end gap-1.5">
                <IconAction label="Edit" onClick={() => onEdit(row)}><HiOutlinePencilSquare className="h-4 w-4" /></IconAction>
                <IconAction label="Delete" danger onClick={() => onDelete(row)}><HiOutlineTrash className="h-4 w-4" /></IconAction>
              </div>
            ) },
          ]}
          rows={categories}
          empty="No categories yet."
        />
      ) : (
        <EmptyState title="No categories yet" description="Create categories to organize your medicines." actionLabel="Add category" onAction={onAdd} />
      )}
    </Card>
  )
}

function paymentStatusTone(status) {
  if (status === 'paid') return 'success'
  if (status === 'partial') return 'warning'
  return 'default'
}

function SuppliersTab({ suppliers, purchases, currency, onAdd, onEdit, onDelete }) {
  const supplierSummaries = useMemo(
    () => calculateSuppliersPayableSummary(suppliers, purchases),
    [suppliers, purchases],
  )

  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-950 dark:text-white">Suppliers</p>
        <Button className="rounded-2xl" type="button" onClick={onAdd}>
          <HiOutlinePlus className="h-4 w-4" /> Add supplier
        </Button>
      </div>
      {suppliers.length ? (
        <SimpleTable
          columns={[
            { key: 'name', header: 'Supplier', cell: (row) => (
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900 dark:text-white">{row.supplier.name}</p>
                <p className="truncate text-xs text-slate-500">{row.supplier.company || row.supplier.email || '—'}</p>
              </div>
            ) },
            { key: 'phone', header: 'Phone', cell: (row) => row.supplier.phone || '—' },
            { key: 'purchases', header: 'Purchases', cell: (row) => formatCurrency(row.totalPurchases, currency) },
            { key: 'paid', header: 'Paid', cell: (row) => formatCurrency(row.totalPaid, currency) },
            { key: 'due', header: 'Balance Due', cell: (row) => (
              <span className={row.totalDue > 0 ? 'font-semibold text-rose-600' : 'text-slate-600'}>
                {formatCurrency(row.balanceDue, currency)}
              </span>
            ) },
            { key: 'status', header: 'Status', cell: (row) => <Badge variant={row.supplier.status === 'active' ? 'success' : 'default'}>{row.supplier.status}</Badge> },
            { key: 'actions', header: '', cell: (row) => (
              <div className="flex items-center justify-end gap-1.5">
                <IconAction label="Edit" onClick={() => onEdit(row.supplier)}><HiOutlinePencilSquare className="h-4 w-4" /></IconAction>
                <IconAction label="Delete" danger onClick={() => onDelete(row.supplier)}><HiOutlineTrash className="h-4 w-4" /></IconAction>
              </div>
            ) },
          ]}
          rows={supplierSummaries}
          empty="No suppliers yet."
        />
      ) : (
        <EmptyState title="No suppliers yet" description="Add suppliers to manage purchases and ledgers." actionLabel="Add supplier" onAction={onAdd} />
      )}
    </Card>
  )
}

function purchaseStatusTone(status) {
  if (status === 'received') return 'success'
  if (status === 'cancelled') return 'danger'
  return 'warning'
}

function PurchasesTab({ purchases, currency, onAdd, onEdit, onReceive, onPay, onReturn, onDelete }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-950 dark:text-white">Purchase orders</p>
        <Button className="rounded-2xl" type="button" onClick={onAdd}>
          <HiOutlinePlus className="h-4 w-4" /> New purchase
        </Button>
      </div>
      {purchases.length ? (
        <SimpleTable
          columns={[
            { key: 'reference', header: 'Reference', cell: (row) => <span className="font-semibold text-slate-900 dark:text-white">{row.reference || row.id.slice(0, 6)}</span> },
            { key: 'supplierName', header: 'Supplier', cell: (row) => row.supplierName || '—' },
            { key: 'items', header: 'Items', cell: (row) => row.items?.length || 0 },
            { key: 'total', header: 'Total', cell: (row) => formatCurrency(row.total, row.currency || currency) },
            { key: 'paid', header: 'Paid', cell: (row) => formatCurrency(row.paidAmount || 0, row.currency || currency) },
            { key: 'due', header: 'Due', cell: (row) => {
              const due = row.balanceDue || row.total
              return <span className={due > 0 ? 'font-semibold text-rose-600' : 'text-emerald-600'}>{formatCurrency(due, row.currency || currency)}</span>
            } },
            { key: 'paymentStatus', header: 'Payment', cell: (row) => <Badge variant={paymentStatusTone(row.paymentStatus || 'unpaid')}>{row.paymentStatus || 'unpaid'}</Badge> },
            { key: 'status', header: 'Status', cell: (row) => <Badge variant={purchaseStatusTone(row.status)} className="capitalize">{row.status}</Badge> },
            { key: 'createdAt', header: 'Created', cell: (row) => formatDate(row.createdAt) },
            { key: 'actions', header: '', cell: (row) => (
              <div className="flex items-center justify-end gap-1.5">
                {row.status !== 'received' ? (
                  <Button variant="subtle" className="h-8 rounded-lg px-2 text-xs" type="button" onClick={() => onReceive(row)}>
                    <HiOutlineArrowDownTray className="h-4 w-4" /> Receive
                  </Button>
                ) : (
                  <>
                    {row.paymentStatus !== 'paid' ? (
                      <Button variant="subtle" className="h-8 rounded-lg bg-emerald-50 px-2 text-xs text-emerald-700 hover:bg-emerald-100" type="button" onClick={() => onPay(row)}>
                        <HiOutlineCurrencyDollar className="h-4 w-4" /> Pay
                      </Button>
                    ) : null}
                    <Button variant="subtle" className="h-8 rounded-lg bg-amber-50 px-2 text-xs text-amber-700 hover:bg-amber-100" type="button" onClick={() => onReturn(row)}>
                      <HiOutlineArrowPath className="h-4 w-4" /> Return
                    </Button>
                  </>
                )}
                <IconAction label="Edit" onClick={() => onEdit(row)}><HiOutlinePencilSquare className="h-4 w-4" /></IconAction>
                <IconAction label="Delete" danger onClick={() => onDelete(row)}><HiOutlineTrash className="h-4 w-4" /></IconAction>
              </div>
            ) },
          ]}
          rows={purchases}
          empty="No purchase orders yet."
        />
      ) : (
        <EmptyState title="No purchase orders yet" description="Create a purchase order, then receive stock to add it to inventory." actionLabel="New purchase" onAction={onAdd} />
      )}
    </Card>
  )
}

function TransactionsTab({ transactions, typeFilter, onTypeFilter }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-slate-950 dark:text-white">Inventory transactions</p>
        <Select className="h-9 w-full rounded-xl sm:max-w-[200px]" value={typeFilter} onChange={(e) => onTypeFilter(e.target.value)}>
          <option value="all">All types</option>
          {Object.keys(MOVEMENT_TYPES).map((type) => (
            <option key={type} value={type}>{MOVEMENT_TYPES[type].label}</option>
          ))}
        </Select>
      </div>
      <SimpleTable
        columns={[
          { key: 'type', header: 'Type', cell: (row) => <Badge variant={movementTone(row.type)}>{movementLabel(row.type)}</Badge> },
          { key: 'productName', header: 'Medicine', cell: (row) => <span className="font-semibold text-slate-900 dark:text-white">{row.productName}</span> },
          { key: 'quantity', header: 'Qty', cell: (row) => row.quantity },
          { key: 'delta', header: 'Change', cell: (row) => <span className={row.delta >= 0 ? 'font-semibold text-emerald-600' : 'font-semibold text-rose-600'}>{row.delta >= 0 ? '+' : ''}{row.delta}</span> },
          { key: 'newQuantity', header: 'Balance', cell: (row) => row.newQuantity },
          { key: 'note', header: 'Note', cell: (row) => row.note || row.reference || '—' },
          { key: 'createdAt', header: 'When', cell: (row) => formatDate(row.createdAt) },
        ]}
        rows={transactions}
        empty="No transactions recorded yet."
      />
    </Card>
  )
}

function ReportsTab({ medicines, purchases, transactions, stats, currency }) {
  const tracked = medicines.filter(isStockTracked)

  const reports = [
    {
      key: 'stock',
      title: 'Stock Report',
      description: 'All medicines with current quantities and stock value.',
      icon: HiOutlineCube,
      rows: () => tracked.map((p) => ({
        Medicine: p.name, SKU: p.sku, Category: p.category, Batch: p.batchNumber, Expiry: p.expiryDate, Stock: toNumber(p.stockQuantity),
        CostPrice: toNumber(p.costPrice), StockValue: toNumber(p.stockQuantity) * toNumber(p.costPrice),
      })),
    },
    {
      key: 'low-stock',
      title: 'Low Stock Report',
      description: 'Items at or below their minimum stock alert.',
      icon: HiOutlineExclamationTriangle,
      rows: () => [...stats.outOfStockItems, ...stats.lowStockItems].map((p) => ({
        Medicine: p.name, SKU: p.sku, Stock: toNumber(p.stockQuantity), MinAlert: toNumber(p.minStockAlert), Status: stockState(p).label,
      })),
    },
    {
      key: 'expiry',
      title: 'Expiry Report',
      description: 'Medicines that are expired or expiring within 30 days.',
      icon: HiOutlineCalendarDays,
      rows: () => tracked
        .filter((p) => ['warning', 'danger'].includes(expiryState(p.expiryDate).tone))
        .map((p) => ({
          Medicine: p.name, SKU: p.sku, Batch: p.batchNumber, Expiry: p.expiryDate, Status: expiryState(p.expiryDate).label, Stock: toNumber(p.stockQuantity),
        })),
    },
    {
      key: 'valuation',
      title: 'Inventory Valuation Report',
      description: 'Total inventory value at cost and retail price.',
      icon: HiOutlineBanknotes,
      rows: () => tracked.map((p) => ({
        Medicine: p.name, Stock: toNumber(p.stockQuantity), CostValue: toNumber(p.stockQuantity) * toNumber(p.costPrice),
        RetailValue: toNumber(p.stockQuantity) * toNumber(p.price),
      })),
    },
    {
      key: 'purchases',
      title: 'Purchase Report',
      description: 'All purchase orders and their totals.',
      icon: HiOutlineClipboardDocumentList,
      rows: () => purchases.map((p) => ({
        Reference: p.reference, Supplier: p.supplierName, Items: p.items?.length || 0, Total: toNumber(p.total), Status: p.status,
      })),
    },
    {
      key: 'movements',
      title: 'Medicine Movement Report',
      description: 'Full stock movement history across all medicines.',
      icon: HiOutlineArrowPath,
      rows: () => transactions.map((t) => ({
        Type: movementLabel(t.type), Medicine: t.productName, Quantity: t.quantity, Change: t.delta, Balance: t.newQuantity, Note: t.note,
      })),
    },
  ]

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard icon={HiOutlineBanknotes} label="Value at cost" value={formatCurrency(stats.inventoryValue, currency)} tone="emerald" />
        <MetricCard icon={HiOutlineBuildingStorefront} label="Value at retail" value={formatCurrency(stats.retailValue, currency)} tone="sky" />
        <MetricCard icon={HiOutlineArrowTrendingUp} label="Potential margin" value={formatCurrency(stats.potentialMargin, currency)} tone="indigo" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => {
          const Icon = report.icon
          const rows = report.rows()
          return (
            <Card key={report.key} className="flex flex-col p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{report.title}</p>
                  <p className="text-xs text-slate-500">{rows.length} rows</p>
                </div>
              </div>
              <p className="mt-3 flex-1 text-sm text-slate-600 dark:text-slate-300">{report.description}</p>
              <Button
                variant="subtle"
                className="mt-4 rounded-xl"
                type="button"
                disabled={!rows.length}
                onClick={() => downloadCsv(`${report.key}-report.csv`, rows)}
              >
                <HiOutlineArrowDownTray className="h-4 w-4" /> Export CSV
              </Button>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
