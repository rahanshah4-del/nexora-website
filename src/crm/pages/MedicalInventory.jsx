import { useEffect, useMemo, useState } from 'react'
import {
  HiOutlineArrowPath,
  HiOutlineArrowDownTray,
  HiOutlineCalendarDays,
  HiOutlineCircleStack,
  HiOutlineClipboardDocumentList,
  HiOutlineCurrencyDollar,
  HiOutlineMagnifyingGlass,
  HiOutlinePencilSquare,
  HiOutlinePlus,
  HiOutlineTag,
  HiOutlineTrash,
  HiOutlineTruck,
} from 'react-icons/hi2'
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
import { calculateSuppliersPayableSummary } from '../lib/financeCalculations.js'
import {
  MOVEMENT_TYPES,
  movementLabel,
  movementTone,
  useInventoryTransactions,
} from '../hooks/useInventoryTransactions.js'
import { isStockTracked, stockState, useInventoryStats } from '../hooks/useInventory.js'
import { formatCurrency } from '../utils/format.js'

// ── Medical Store POS pastel design system ─────────────────────────────────
// Same tokens as src/crm/pages/dashboards/MedicalDashboard.jsx and the
// Medical Store variant of Sidebar.jsx — kept in sync deliberately so both
// pages read as one system. Local to this file only; the global Tailwind
// config is untouched, so other business types keep their existing look.
const PASTEL = {
  bg: '#F6F5FB',
  ink: '#1F2230',
  muted: '#8B8A99',
  mint: '#D9F2E3',
  blush: '#FBDEDE',
  sky: '#DCEBFB',
  lavender: '#E8E1FB',
  amberLight: '#FDECC8',
  green: '#8FD9A8',
  coral: '#F2A6A6',
  dark: '#1C1B29',
}

const KPI_TINTS = [PASTEL.mint, PASTEL.blush, PASTEL.sky, PASTEL.lavender]

function statusRowTint(tone) {
  if (tone === 'danger') return PASTEL.blush
  if (tone === 'warning') return PASTEL.amberLight
  if (tone === 'success' || tone === 'info') return PASTEL.mint
  return undefined
}

const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'medicines', label: 'Medicines' },
  { key: 'stock', label: 'Stock' },
  { key: 'categories', label: 'Categories' },
  { key: 'suppliers', label: 'Suppliers' },
  { key: 'purchases', label: 'Purchases' },
  { key: 'transactions', label: 'Transactions' },
  { key: 'reports', label: 'Reports' },
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

function medicineRowTint(medicine) {
  const stock = stockState(medicine)
  const expiry = expiryState(medicine.expiryDate)
  if (stock.tone === 'danger' || expiry.tone === 'danger') return PASTEL.blush
  if (stock.tone === 'warning' || expiry.tone === 'warning') return PASTEL.amberLight
  return PASTEL.mint
}

function purchaseRowTint(row) {
  if (row.status !== 'received') return undefined
  if (row.paymentStatus && row.paymentStatus !== 'paid') return PASTEL.amberLight
  return PASTEL.mint
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

// ── Page-local presentational primitives (Medical Store POS only) ─────────
// Deliberately not shared/exported — Retail POS, Restaurant POS, School ERP
// etc. keep using the generic ui/Card, ui/Badge, ui/Button components.

function Panel({ className = '', children }) {
  return <div className={`rounded-2xl bg-white p-4 shadow-sm ${className}`}>{children}</div>
}

function PrimaryButton({ className = '', children, ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#1C1B29] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#141420] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

function SecondaryButton({ className = '', children, ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#1F2230]/15 bg-white px-3.5 py-2 text-sm font-medium text-[#1F2230] transition hover:bg-[#F6F5FB] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

function IconButton({ label, danger, onClick, children }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-[#1F2230]/55 transition hover:text-[#1F2230] ${danger ? 'hover:bg-[#FBDEDE]' : 'hover:bg-[#F6F5FB]'}`}
    >
      {children}
    </button>
  )
}

function StatusTag({ tone = 'default', children }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium text-[#1F2230]"
      style={{ backgroundColor: statusRowTint(tone) || '#EFEEF7' }}
    >
      {children}
    </span>
  )
}

function TabsBar({ tab, onChange }) {
  return (
    <div className="mb-5 flex flex-wrap gap-1.5">
      {TABS.map((item) => {
        const active = tab === item.key
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={`rounded-xl px-3.5 py-2 text-sm font-medium transition ${
              active ? 'bg-[#1C1B29] text-white' : 'text-[#1F2230]/55 hover:bg-white hover:text-[#1F2230]'
            }`}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

// Small decorative bar-chart glyph — matches MedicalDashboard.jsx's KPI cards.
function MiniBarsGlyph() {
  return (
    <div className="flex items-end gap-0.5 opacity-50">
      <span className="h-2 w-1 rounded-sm bg-[#1F2230]" />
      <span className="h-3.5 w-1 rounded-sm bg-[#1F2230]" />
      <span className="h-1.5 w-1 rounded-sm bg-[#1F2230]" />
      <span className="h-3 w-1 rounded-sm bg-[#1F2230]" />
    </div>
  )
}

function KpiCard({ tint, value, label, hint }) {
  return (
    <div className="rounded-2xl p-4 shadow-sm" style={{ backgroundColor: tint }}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-[#1F2230]/70">{label}</p>
        <MiniBarsGlyph />
      </div>
      <p className="mt-3 truncate text-2xl font-bold text-[#1F2230]">{value}</p>
      {hint ? <p className="mt-1 truncate text-xs text-[#1F2230]/60">{hint}</p> : null}
    </div>
  )
}

function SectionHeading({ children, action }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm font-semibold text-[#1F2230]">{children}</p>
      {action}
    </div>
  )
}

function DataTable({ columns, rows, empty, getRowTint }) {
  if (!rows.length) {
    return (
      <p className="rounded-2xl border border-dashed border-[#1F2230]/10 bg-white px-4 py-8 text-center text-sm text-[#8B8A99]">
        {empty}
      </p>
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[#1F2230]/10">
            {columns.map((c) => (
              <th key={c.key} className="whitespace-nowrap px-3 py-2 text-xs font-semibold text-[#8B8A99]">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const tint = getRowTint?.(row)
            return (
              <tr
                key={row.id ?? idx}
                className="border-b border-[#1F2230]/[0.06] last:border-b-0"
                style={tint ? { backgroundColor: tint } : undefined}
              >
                {columns.map((c) => (
                  <td key={c.key} data-label={c.header || undefined} className="whitespace-nowrap px-3 py-2.5 align-middle text-[#1F2230]">
                    {c.cell ? c.cell(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
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
    <div className="fixed inset-0 z-[70] grid place-items-center bg-[#1F2230]/45 p-3 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-sm" onClick={(e) => e.stopPropagation()}>
        <p className="text-base font-semibold text-[#1F2230]">Return to Supplier</p>
        <p className="mt-1 text-sm text-[#8B8A99]">{purchase.reference || purchase.id}</p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {items.map((item) => (
            <div key={item.productId} className="flex items-center gap-3 rounded-xl bg-[#F6F5FB] px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#1F2230]">{item.productName || item.productId}</p>
                <p className="text-xs text-[#8B8A99]">Received: {toNumber(item.quantity)} · Unit cost: {formatCurrency(toNumber(item.unitCost), currency)}</p>
              </div>
              <Input
                className="h-9 w-20 text-center"
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
            <p className="text-right text-sm font-medium text-[#1F2230]">
              Return value: {formatCurrency(totalReturnValue, currency)}
            </p>
          ) : null}

          {error ? <p className="text-xs font-medium text-[#1F2230]">{error}</p> : null}

          <div className="flex gap-2">
            <PrimaryButton type="submit" disabled={saving}>
              {saving ? 'Returning...' : 'Return Items'}
            </PrimaryButton>
            <SecondaryButton type="button" onClick={onClose}>
              Cancel
            </SecondaryButton>
          </div>
        </form>
      </div>
    </div>
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
    <div className="fixed inset-0 z-[70] grid place-items-center bg-[#1F2230]/45 p-3 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-sm" onClick={(e) => e.stopPropagation()}>
        <p className="text-base font-semibold text-[#1F2230]">Record Payment</p>
        <p className="mt-1 text-sm text-[#8B8A99]">{purchase.reference || purchase.id} — Due: {formatCurrency(due, currency)}</p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <p className="text-xs font-medium text-[#1F2230]/70">Amount *</p>
            <Input className="mt-1 h-9" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <p className="text-xs font-medium text-[#1F2230]/70">Payment Method</p>
            <Select className="mt-1 h-9" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option>Cash</option>
              <option>Bank Transfer</option>
              <option>Cheque</option>
              <option>JazzCash</option>
              <option>EasyPaisa</option>
            </Select>
          </div>

          {error ? <p className="text-xs font-medium text-[#1F2230]">{error}</p> : null}

          <div className="flex gap-2">
            <PrimaryButton type="submit" disabled={saving}>
              {saving ? 'Recording...' : 'Record Payment'}
            </PrimaryButton>
            <SecondaryButton type="button" onClick={onClose}>
              Cancel
            </SecondaryButton>
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
    <div className="fixed inset-0 z-[70] grid place-items-center bg-[#1F2230]/45 p-3 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-sm" onClick={(e) => e.stopPropagation()}>
        <p className="text-base font-semibold text-[#1F2230]">Batch & Expiry</p>
        <p className="mt-1 text-sm text-[#8B8A99]">{medicine.name}</p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <p className="text-xs font-medium text-[#1F2230]/70">Batch Number</p>
            <Input className="mt-1 h-9" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="e.g. BN-2026-014" />
          </div>
          <div>
            <p className="text-xs font-medium text-[#1F2230]/70">Expiry Date</p>
            <Input className="mt-1 h-9" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          </div>
          <div>
            <p className="text-xs font-medium text-[#1F2230]/70">Manufacturer</p>
            <Input className="mt-1 h-9" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} placeholder="e.g. GlaxoSmithKline" />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-[#1F2230]">
            <input type="checkbox" checked={requiresPrescription} onChange={(e) => setRequiresPrescription(e.target.checked)} className="h-4 w-4 rounded border-[#1F2230]/20 accent-[#1C1B29]" />
            Requires prescription (Rx)
          </label>

          {error ? <p className="text-xs font-medium text-[#1F2230]">{error}</p> : null}

          <div className="flex gap-2">
            <PrimaryButton type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Details'}
            </PrimaryButton>
            <SecondaryButton type="button" onClick={onClose}>
              Cancel
            </SecondaryButton>
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
    const isCreate = !medicineModal.medicine
    console.log('[DIAG] saveMedicine (Add Product / Create Product): about to call', {
      mode: isCreate ? 'createMedicine' : 'updateMedicine',
      editingId: medicineModal.medicine?.id || null,
      draft: JSON.parse(JSON.stringify(draft)),
      medicinesArrayLengthBeforeSave: medicines.length,
      timestamp: new Date().toISOString(),
    })
    const result = medicineModal.medicine
      ? await medicineApi.updateMedicine(medicineModal.medicine.id, draft)
      : await medicineApi.createMedicine(draft)
    console.log('[DIAG] saveMedicine (Add Product / Create Product): call returned', {
      mode: isCreate ? 'createMedicine' : 'updateMedicine',
      result,
      timestamp: new Date().toISOString(),
    })
    if (result?.ok) {
      notify(medicineModal.medicine ? 'Medicine updated' : 'Medicine created')
      setMedicineModal({ open: false, medicine: null })
    } else {
      notify(result?.error || 'Unable to save medicine')
    }
  }

  async function saveMedicineDetails(id, draft) {
    const existing = medicines.find((item) => item.id === id)
    console.log('[DIAG] saveMedicineDetails: about to call updateMedicine', {
      id,
      existingFound: Boolean(existing),
      existing: existing ? JSON.parse(JSON.stringify(existing)) : existing,
      draft: JSON.parse(JSON.stringify(draft)),
      mergedPayload: JSON.parse(JSON.stringify({ ...existing, ...draft })),
      medicinesArrayLength: medicines.length,
      medicinesArrayIds: medicines.map((m) => m.id),
      timestamp: new Date().toISOString(),
    })
    const result = await medicineApi.updateMedicine(id, { ...existing, ...draft })
    console.log('[DIAG] saveMedicineDetails: updateMedicine returned', {
      id,
      result,
      timestamp: new Date().toISOString(),
    })
    if (result?.ok) notify('Batch & expiry details updated')
    return result
  }

  return (
    <div className="min-w-0 p-4 sm:p-6" style={{ backgroundColor: PASTEL.bg, color: PASTEL.ink }}>
      {toast ? <Toast message={toast} onClose={() => setToast('')} /> : null}

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#8B8A99]">Medical Store POS</p>
          <h1 className="mt-1 text-2xl font-bold text-[#1F2230] sm:text-[1.75rem]">Medicine Inventory</h1>
          <p className="mt-1 max-w-xl text-sm text-[#8B8A99]">
            Medicines, batches, expiry dates, suppliers, purchases and live stock value.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton onClick={() => setStockModal({ open: true, presetProductId: '', presetType: 'stock_in' })}>
            <HiOutlineCircleStack className="h-4 w-4" /> Stock movement
          </SecondaryButton>
          <PrimaryButton onClick={() => setMedicineModal({ open: true, medicine: null })}>
            <HiOutlinePlus className="h-4 w-4" /> Add medicine
          </PrimaryButton>
        </div>
      </div>

      {expiringSoonCount > 0 ? (
        <div className="mb-5 flex items-start gap-3 rounded-2xl p-4 shadow-sm" style={{ backgroundColor: PASTEL.amberLight }}>
          <HiOutlineCalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[#1F2230]/70" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#1F2230]">Batches nearing expiry</p>
            <p className="mt-0.5 text-sm text-[#1F2230]/70">
              {expiringSoonCount} medicine(s) are expired or expiring within 30 days. Review batches before selling.
            </p>
          </div>
        </div>
      ) : null}

      <TabsBar tab={tab} onChange={setTab} />

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

      {/* Modals — shared components, styled as they are everywhere else */}
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
    return <img src={medicine.imageUrl} alt={medicine.name} className="h-8 w-8 rounded-xl object-cover" />
  }
  return (
    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#E8E1FB] text-[11px] font-semibold text-[#1F2230]">
      {String(medicine.name || 'M').slice(0, 2).toUpperCase()}
    </div>
  )
}

function DashboardTab({ stats, currency, expiringSoonCount, onView }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        <KpiCard tint={KPI_TINTS[0]} value={stats.totalProducts} label="Total medicines" hint={`${stats.trackedProducts} stock-tracked`} />
        <KpiCard tint={KPI_TINTS[1]} value={stats.totalStock} label="Total stock" hint="units on hand" />
        <KpiCard tint={KPI_TINTS[2]} value={stats.lowStockCount} label="Low stock" hint="need reorder" />
        <KpiCard tint={KPI_TINTS[3]} value={expiringSoonCount} label="Expiring / expired" hint="within 30 days" />
        <KpiCard tint={KPI_TINTS[0]} value={formatCurrency(stats.inventoryValue, currency)} label="Inventory value" hint="at cost price" />
      </div>

      {stats.lowStockCount + stats.outOfStockCount > 0 ? (
        <div className="flex items-start gap-3 rounded-2xl p-4 shadow-sm" style={{ backgroundColor: PASTEL.blush }}>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#1F2230]">Stock attention needed</p>
            <p className="mt-0.5 text-sm text-[#1F2230]/70">
              {stats.outOfStockCount} out of stock and {stats.lowStockCount} low-stock medicines. Reorder soon to avoid lost sales.
            </p>
            <SecondaryButton className="mt-3" onClick={onView}>
              Review medicines
            </SecondaryButton>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <SectionHeading>Low stock medicines</SectionHeading>
          <Panel className="p-2">
            <DataTable
              getRowTint={(row) => statusRowTint(stockState(row).tone)}
              columns={[
                { key: 'name', header: 'Medicine', cell: (row) => <span className="font-medium text-[#1F2230]">{row.name}</span> },
                { key: 'stockQuantity', header: 'Stock', cell: (row) => toNumber(row.stockQuantity) },
                { key: 'minStockAlert', header: 'Min', cell: (row) => toNumber(row.minStockAlert) },
                { key: 'status', header: 'Status', cell: (row) => <StatusTag tone={stockState(row).tone}>{stockState(row).label}</StatusTag> },
              ]}
              rows={[...stats.outOfStockItems, ...stats.lowStockItems].slice(0, 8)}
              empty="All stock levels are healthy."
            />
          </Panel>
        </div>

        <div>
          <SectionHeading>Recent stock movements</SectionHeading>
          <Panel className="p-2">
            <DataTable
              columns={[
                { key: 'type', header: 'Type', cell: (row) => <StatusTag tone={movementTone(row.type)}>{movementLabel(row.type)}</StatusTag> },
                { key: 'productName', header: 'Medicine' },
                { key: 'delta', header: 'Change', cell: (row) => <span style={{ color: row.delta >= 0 ? PASTEL.green : PASTEL.coral }} className="font-semibold">{row.delta >= 0 ? '+' : ''}{row.delta}</span> },
                { key: 'createdAt', header: 'When', cell: (row) => formatDate(row.createdAt) },
              ]}
              rows={stats.recentMovements}
              empty="No stock movements recorded yet."
            />
          </Panel>
        </div>
      </div>
    </div>
  )
}

function MedicinesTab({ medicines, search, onSearch, currency, onAdd, onEdit, onDetails, onStock, onDelete }) {
  return (
    <Panel>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1F2230]/35" />
          <Input
            className="pl-9"
            placeholder="Search by name, SKU, barcode, batch, manufacturer…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
        <PrimaryButton onClick={onAdd}>
          <HiOutlinePlus className="h-4 w-4" /> Add medicine
        </PrimaryButton>
      </div>

      {medicines.length ? (
        <DataTable
          getRowTint={medicineRowTint}
          columns={[
            {
              key: 'name',
              header: 'Medicine',
              cell: (row) => (
                <div className="flex items-center gap-3">
                  <MedicineThumb medicine={row} />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#1F2230]">{row.name}</p>
                    <p className="truncate text-xs text-[#8B8A99]">{row.sku || row.barcode || 'No SKU'}{row.manufacturer ? ` · ${row.manufacturer}` : ''}</p>
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
                    {s.tone !== 'success' ? <StatusTag tone={s.tone}>{s.label}</StatusTag> : null}
                  </div>
                )
              },
            },
            { key: 'requiresPrescription', header: 'Rx', cell: (row) => row.requiresPrescription ? <StatusTag tone="warning">Rx</StatusTag> : <span className="text-[#8B8A99]">OTC</span> },
            { key: 'stockQuantity', header: 'Stock', cell: (row) => (isStockTracked(row) ? toNumber(row.stockQuantity) : '—') },
            { key: 'price', header: 'Price', cell: (row) => formatCurrency(row.price, row.currency || currency) },
            {
              key: 'actions',
              header: '',
              cell: (row) => (
                <div className="flex items-center justify-end gap-1">
                  <IconButton label="Batch & expiry" onClick={() => onDetails(row)}><HiOutlineCalendarDays className="h-4 w-4" /></IconButton>
                  <IconButton label="Stock movement" onClick={() => onStock(row)}><HiOutlineCircleStack className="h-4 w-4" /></IconButton>
                  <IconButton label="Edit" onClick={() => onEdit(row)}><HiOutlinePencilSquare className="h-4 w-4" /></IconButton>
                  <IconButton label="Delete" danger onClick={() => onDelete(row)}><HiOutlineTrash className="h-4 w-4" /></IconButton>
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
    </Panel>
  )
}

function StockTab({ medicines, onMove, onProductMove, currency }) {
  const actions = [
    { type: 'stock_in', label: 'Stock In' },
    { type: 'stock_out', label: 'Stock Out' },
    { type: 'adjustment', label: 'Adjustment' },
    { type: 'opening', label: 'Opening' },
    { type: 'damaged', label: 'Damaged' },
    { type: 'returned', label: 'Returned' },
    { type: 'transfer', label: 'Transfer' },
  ]
  return (
    <div className="space-y-6">
      <div>
        <SectionHeading>Quick stock actions</SectionHeading>
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <SecondaryButton key={action.type} onClick={() => onMove(action.type)}>
              {action.label}
            </SecondaryButton>
          ))}
        </div>
      </div>

      <div>
        <SectionHeading>Current stock levels</SectionHeading>
        <Panel className="p-2">
          <DataTable
            getRowTint={(row) => statusRowTint(stockState(row).tone)}
            columns={[
              { key: 'name', header: 'Medicine', cell: (row) => <span className="font-medium text-[#1F2230]">{row.name}</span> },
              { key: 'sku', header: 'SKU', cell: (row) => row.sku || '—' },
              { key: 'batchNumber', header: 'Batch', cell: (row) => row.batchNumber || '—' },
              { key: 'stockQuantity', header: 'On hand', cell: (row) => toNumber(row.stockQuantity) },
              { key: 'value', header: 'Stock value', cell: (row) => formatCurrency(toNumber(row.stockQuantity) * toNumber(row.costPrice), row.currency || currency) },
              { key: 'status', header: 'Status', cell: (row) => <StatusTag tone={stockState(row).tone}>{stockState(row).label}</StatusTag> },
              { key: 'actions', header: '', cell: (row) => (
                <div className="flex justify-end">
                  <IconButton label="Record movement" onClick={() => onProductMove(row, 'stock_in')}><HiOutlineCircleStack className="h-4 w-4" /></IconButton>
                </div>
              ) },
            ]}
            rows={medicines.filter(isStockTracked)}
            empty="No stock-tracked medicines yet."
          />
        </Panel>
      </div>
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
    <Panel>
      <SectionHeading action={<PrimaryButton onClick={onAdd}><HiOutlinePlus className="h-4 w-4" /> Add category</PrimaryButton>}>
        Categories
      </SectionHeading>
      {categories.length ? (
        <DataTable
          columns={[
            { key: 'name', header: 'Name', cell: (row) => <span className="font-medium text-[#1F2230]">{row.name}</span> },
            { key: 'description', header: 'Description', cell: (row) => row.description || '—' },
            { key: 'medicines', header: 'Medicines', cell: (row) => counts[String(row.name).toLowerCase()] || 0 },
            { key: 'status', header: 'Status', cell: (row) => <StatusTag tone={row.status === 'active' ? 'success' : 'default'}>{row.status}</StatusTag> },
            { key: 'actions', header: '', cell: (row) => (
              <div className="flex items-center justify-end gap-1">
                <IconButton label="Edit" onClick={() => onEdit(row)}><HiOutlinePencilSquare className="h-4 w-4" /></IconButton>
                <IconButton label="Delete" danger onClick={() => onDelete(row)}><HiOutlineTrash className="h-4 w-4" /></IconButton>
              </div>
            ) },
          ]}
          rows={categories}
          empty="No categories yet."
        />
      ) : (
        <EmptyState title="No categories yet" description="Create categories to organize your medicines." actionLabel="Add category" onAction={onAdd} />
      )}
    </Panel>
  )
}

function SuppliersTab({ suppliers, purchases, currency, onAdd, onEdit, onDelete }) {
  const supplierSummaries = useMemo(
    () => calculateSuppliersPayableSummary(suppliers, purchases),
    [suppliers, purchases],
  )

  return (
    <Panel>
      <SectionHeading action={<PrimaryButton onClick={onAdd}><HiOutlinePlus className="h-4 w-4" /> Add supplier</PrimaryButton>}>
        Suppliers
      </SectionHeading>
      {suppliers.length ? (
        <DataTable
          getRowTint={(row) => (row.totalDue > 0 ? PASTEL.amberLight : PASTEL.mint)}
          columns={[
            { key: 'name', header: 'Supplier', cell: (row) => (
              <div className="min-w-0">
                <p className="truncate font-medium text-[#1F2230]">{row.supplier.name}</p>
                <p className="truncate text-xs text-[#8B8A99]">{row.supplier.company || row.supplier.email || '—'}</p>
              </div>
            ) },
            { key: 'phone', header: 'Phone', cell: (row) => row.supplier.phone || '—' },
            { key: 'purchases', header: 'Purchases', cell: (row) => formatCurrency(row.totalPurchases, currency) },
            { key: 'paid', header: 'Paid', cell: (row) => formatCurrency(row.totalPaid, currency) },
            { key: 'due', header: 'Balance due', cell: (row) => (
              <span className="font-medium text-[#1F2230]">
                {formatCurrency(row.balanceDue, currency)}
              </span>
            ) },
            { key: 'status', header: 'Status', cell: (row) => <StatusTag tone={row.supplier.status === 'active' ? 'success' : 'default'}>{row.supplier.status}</StatusTag> },
            { key: 'actions', header: '', cell: (row) => (
              <div className="flex items-center justify-end gap-1">
                <IconButton label="Edit" onClick={() => onEdit(row.supplier)}><HiOutlinePencilSquare className="h-4 w-4" /></IconButton>
                <IconButton label="Delete" danger onClick={() => onDelete(row.supplier)}><HiOutlineTrash className="h-4 w-4" /></IconButton>
              </div>
            ) },
          ]}
          rows={supplierSummaries}
          empty="No suppliers yet."
        />
      ) : (
        <EmptyState title="No suppliers yet" description="Add suppliers to manage purchases and ledgers." actionLabel="Add supplier" onAction={onAdd} />
      )}
    </Panel>
  )
}

function PurchasesTab({ purchases, currency, onAdd, onEdit, onReceive, onPay, onReturn, onDelete }) {
  return (
    <Panel>
      <SectionHeading action={<PrimaryButton onClick={onAdd}><HiOutlinePlus className="h-4 w-4" /> New purchase</PrimaryButton>}>
        Purchase orders
      </SectionHeading>
      {purchases.length ? (
        <DataTable
          getRowTint={purchaseRowTint}
          columns={[
            { key: 'reference', header: 'Reference', cell: (row) => <span className="font-medium text-[#1F2230]">{row.reference || row.id.slice(0, 6)}</span> },
            { key: 'supplierName', header: 'Supplier', cell: (row) => row.supplierName || '—' },
            { key: 'items', header: 'Items', cell: (row) => row.items?.length || 0 },
            { key: 'total', header: 'Total', cell: (row) => formatCurrency(row.total, row.currency || currency) },
            { key: 'paid', header: 'Paid', cell: (row) => formatCurrency(row.paidAmount || 0, row.currency || currency) },
            { key: 'due', header: 'Due', cell: (row) => {
              const due = row.balanceDue || row.total
              return <span className="font-medium text-[#1F2230]">{formatCurrency(due, row.currency || currency)}</span>
            } },
            { key: 'paymentStatus', header: 'Payment', cell: (row) => <StatusTag tone={row.paymentStatus === 'paid' ? 'success' : row.paymentStatus === 'partial' ? 'warning' : 'default'}>{row.paymentStatus || 'unpaid'}</StatusTag> },
            { key: 'status', header: 'Status', cell: (row) => <StatusTag tone={row.status === 'received' ? 'success' : row.status === 'cancelled' ? 'danger' : 'warning'}>{row.status}</StatusTag> },
            { key: 'createdAt', header: 'Created', cell: (row) => formatDate(row.createdAt) },
            { key: 'actions', header: '', cell: (row) => (
              <div className="flex items-center justify-end gap-1">
                {row.status !== 'received' ? (
                  <SecondaryButton className="px-2 py-1.5 text-xs" onClick={() => onReceive(row)}>
                    <HiOutlineArrowDownTray className="h-3.5 w-3.5" /> Receive
                  </SecondaryButton>
                ) : (
                  <>
                    {row.paymentStatus !== 'paid' ? (
                      <SecondaryButton className="px-2 py-1.5 text-xs" onClick={() => onPay(row)}>
                        <HiOutlineCurrencyDollar className="h-3.5 w-3.5" /> Pay
                      </SecondaryButton>
                    ) : null}
                    <SecondaryButton className="px-2 py-1.5 text-xs" onClick={() => onReturn(row)}>
                      <HiOutlineArrowPath className="h-3.5 w-3.5" /> Return
                    </SecondaryButton>
                  </>
                )}
                <IconButton label="Edit" onClick={() => onEdit(row)}><HiOutlinePencilSquare className="h-4 w-4" /></IconButton>
                <IconButton label="Delete" danger onClick={() => onDelete(row)}><HiOutlineTrash className="h-4 w-4" /></IconButton>
              </div>
            ) },
          ]}
          rows={purchases}
          empty="No purchase orders yet."
        />
      ) : (
        <EmptyState title="No purchase orders yet" description="Create a purchase order, then receive stock to add it to inventory." actionLabel="New purchase" onAction={onAdd} />
      )}
    </Panel>
  )
}

function TransactionsTab({ transactions, typeFilter, onTypeFilter }) {
  return (
    <Panel>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-[#1F2230]">Inventory transactions</p>
        <Select className="h-9 w-full sm:max-w-[200px]" value={typeFilter} onChange={(e) => onTypeFilter(e.target.value)}>
          <option value="all">All types</option>
          {Object.keys(MOVEMENT_TYPES).map((type) => (
            <option key={type} value={type}>{MOVEMENT_TYPES[type].label}</option>
          ))}
        </Select>
      </div>
      <DataTable
        getRowTint={(row) => statusRowTint(movementTone(row.type))}
        columns={[
          { key: 'type', header: 'Type', cell: (row) => <StatusTag tone={movementTone(row.type)}>{movementLabel(row.type)}</StatusTag> },
          { key: 'productName', header: 'Medicine', cell: (row) => <span className="font-medium text-[#1F2230]">{row.productName}</span> },
          { key: 'quantity', header: 'Qty', cell: (row) => row.quantity },
          { key: 'delta', header: 'Change', cell: (row) => <span style={{ color: row.delta >= 0 ? PASTEL.green : PASTEL.coral }} className="font-semibold">{row.delta >= 0 ? '+' : ''}{row.delta}</span> },
          { key: 'newQuantity', header: 'Balance', cell: (row) => row.newQuantity },
          { key: 'note', header: 'Note', cell: (row) => row.note || row.reference || '—' },
          { key: 'createdAt', header: 'When', cell: (row) => formatDate(row.createdAt) },
        ]}
        rows={transactions}
        empty="No transactions recorded yet."
      />
    </Panel>
  )
}

function ReportsTab({ medicines, purchases, transactions, stats, currency }) {
  const tracked = medicines.filter(isStockTracked)

  const reports = [
    {
      key: 'stock',
      title: 'Stock report',
      description: 'All medicines with current quantities and stock value.',
      icon: HiOutlineClipboardDocumentList,
      rows: () => tracked.map((p) => ({
        Medicine: p.name, SKU: p.sku, Category: p.category, Batch: p.batchNumber, Expiry: p.expiryDate, Stock: toNumber(p.stockQuantity),
        CostPrice: toNumber(p.costPrice), StockValue: toNumber(p.stockQuantity) * toNumber(p.costPrice),
      })),
    },
    {
      key: 'low-stock',
      title: 'Low stock report',
      description: 'Items at or below their minimum stock alert.',
      icon: HiOutlineTag,
      rows: () => [...stats.outOfStockItems, ...stats.lowStockItems].map((p) => ({
        Medicine: p.name, SKU: p.sku, Stock: toNumber(p.stockQuantity), MinAlert: toNumber(p.minStockAlert), Status: stockState(p).label,
      })),
    },
    {
      key: 'expiry',
      title: 'Expiry report',
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
      title: 'Inventory valuation report',
      description: 'Total inventory value at cost and retail price.',
      icon: HiOutlineCurrencyDollar,
      rows: () => tracked.map((p) => ({
        Medicine: p.name, Stock: toNumber(p.stockQuantity), CostValue: toNumber(p.stockQuantity) * toNumber(p.costPrice),
        RetailValue: toNumber(p.stockQuantity) * toNumber(p.price),
      })),
    },
    {
      key: 'purchases',
      title: 'Purchase report',
      description: 'All purchase orders and their totals.',
      icon: HiOutlineTruck,
      rows: () => purchases.map((p) => ({
        Reference: p.reference, Supplier: p.supplierName, Items: p.items?.length || 0, Total: toNumber(p.total), Status: p.status,
      })),
    },
    {
      key: 'movements',
      title: 'Medicine movement report',
      description: 'Full stock movement history across all medicines.',
      icon: HiOutlineArrowPath,
      rows: () => transactions.map((t) => ({
        Type: movementLabel(t.type), Medicine: t.productName, Quantity: t.quantity, Change: t.delta, Balance: t.newQuantity, Note: t.note,
      })),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <KpiCard tint={KPI_TINTS[0]} value={formatCurrency(stats.inventoryValue, currency)} label="Value at cost" />
        <KpiCard tint={KPI_TINTS[1]} value={formatCurrency(stats.retailValue, currency)} label="Value at retail" />
        <KpiCard tint={KPI_TINTS[2]} value={formatCurrency(stats.potentialMargin, currency)} label="Potential margin" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => {
          const Icon = report.icon
          const rows = report.rows()
          return (
            <Panel key={report.key} className="flex flex-col">
              <div className="flex items-center gap-2.5">
                <Icon className="h-4 w-4 text-[#1F2230]/60" />
                <p className="truncate text-sm font-medium text-[#1F2230]">{report.title}</p>
              </div>
              <p className="mt-0.5 text-xs text-[#8B8A99]">{rows.length} rows</p>
              <p className="mt-3 flex-1 text-sm text-[#1F2230]/70">{report.description}</p>
              <SecondaryButton
                className="mt-4"
                disabled={!rows.length}
                onClick={() => downloadCsv(`${report.key}-report.csv`, rows)}
              >
                <HiOutlineArrowDownTray className="h-4 w-4" /> Export CSV
              </SecondaryButton>
            </Panel>
          )
        })}
      </div>
    </div>
  )
}
