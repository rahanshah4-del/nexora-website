import { useEffect, useMemo, useState } from 'react'
import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi2'
import Button from '../ui/Button.jsx'
import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'
import { formatCurrency } from '../../utils/format.js'
import InventoryModal, { Field } from './InventoryModal.jsx'

function toNumber(value, fallback = 0) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

const blankLine = { productId: '', quantity: 1, unitCost: 0 }

function blankDraft() {
  return {
    reference: '',
    supplierId: '',
    taxRate: 0,
    notes: '',
    expectedDate: '',
    currency: 'PKR',
    items: [{ ...blankLine }],
  }
}

export default function PurchaseModal({ open, purchase, products = [], suppliers = [], onClose, onSave }) {
  const [draft, setDraft] = useState(blankDraft)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    Promise.resolve().then(() => {
      if (purchase) {
        setDraft({
          reference: purchase.reference || '',
          supplierId: purchase.supplierId || '',
          taxRate: purchase.taxRate || 0,
          notes: purchase.notes || '',
          expectedDate: purchase.expectedDate || '',
          currency: purchase.currency || 'PKR',
          items: purchase.items?.length
            ? purchase.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitCost: item.unitCost,
              }))
            : [{ ...blankLine }],
        })
      } else {
        setDraft(blankDraft())
      }
      setError('')
      setSaving(false)
    })
  }, [open, purchase])

  function update(key, value) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function updateLine(index, key, value) {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item, idx) => {
        if (idx !== index) return item
        const next = { ...item, [key]: value }
        // Auto-fill cost from the product's cost price when picking a product.
        if (key === 'productId') {
          const product = products.find((p) => p.id === value)
          if (product && !toNumber(item.unitCost)) next.unitCost = toNumber(product.costPrice)
        }
        return next
      }),
    }))
  }

  function addLine() {
    setDraft((current) => ({ ...current, items: [...current.items, { ...blankLine }] }))
  }

  function removeLine(index) {
    setDraft((current) => ({
      ...current,
      items: current.items.length > 1 ? current.items.filter((_, idx) => idx !== index) : current.items,
    }))
  }

  const totals = useMemo(() => {
    const subtotal = draft.items.reduce((sum, item) => sum + toNumber(item.quantity) * toNumber(item.unitCost), 0)
    const tax = subtotal * (toNumber(draft.taxRate) / 100)
    return { subtotal, tax, total: subtotal + tax }
  }, [draft.items, draft.taxRate])

  async function handleSubmit() {
    const supplier = suppliers.find((s) => s.id === draft.supplierId)
    const items = draft.items
      .filter((item) => item.productId && toNumber(item.quantity) > 0)
      .map((item) => {
        const product = products.find((p) => p.id === item.productId)
        return {
          productId: item.productId,
          productName: product?.name || '',
          sku: product?.sku || '',
          quantity: toNumber(item.quantity),
          unitCost: toNumber(item.unitCost),
          total: toNumber(item.quantity) * toNumber(item.unitCost),
        }
      })
    if (!draft.supplierId) {
      setError('Select a supplier')
      return
    }
    if (!items.length) {
      setError('Add at least one product line')
      return
    }
    setSaving(true)
    const result = await onSave?.({
      ...draft,
      supplierName: supplier?.name || '',
      items,
    })
    setSaving(false)
    if (result && result.ok === false) setError(result.error || 'Unable to save purchase order')
  }

  return (
    <InventoryModal
      open={open}
      size="lg"
      title={purchase ? 'Edit Purchase Order' : 'Create Purchase Order'}
      subtitle="Order stock from suppliers. Receiving adds stock automatically."
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel={saving ? 'Saving…' : purchase ? 'Save Order' : 'Create Order'}
      submitDisabled={saving}
      error={error}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Supplier *">
          <Select className="h-9 rounded-xl" value={draft.supplierId} onChange={(e) => update('supplierId', e.target.value)}>
            <option value="">Select supplier…</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Reference / PO No.">
          <Input className="h-9 rounded-xl" value={draft.reference} onChange={(e) => update('reference', e.target.value)} />
        </Field>
        <Field label="Expected Date">
          <Input className="h-9 rounded-xl" type="date" value={draft.expectedDate} onChange={(e) => update('expectedDate', e.target.value)} />
        </Field>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-white/5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300">Line Items</p>
          <Button variant="subtle" className="h-8 rounded-lg px-2 text-xs" type="button" onClick={addLine}>
            <HiOutlinePlus className="h-4 w-4" /> Add line
          </Button>
        </div>
        <div className="mt-3 space-y-2">
          {draft.items.map((item, index) => (
            <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_80px_110px_auto]">
              <Select
                className="h-9 rounded-xl bg-white dark:bg-slate-900"
                value={item.productId}
                onChange={(e) => updateLine(index, 'productId', e.target.value)}
              >
                <option value="">Select product…</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} {product.sku ? `(${product.sku})` : ''}
                  </option>
                ))}
              </Select>
              <Input
                className="h-9 rounded-xl bg-white dark:bg-slate-900"
                inputMode="numeric"
                placeholder="Qty"
                value={item.quantity}
                onChange={(e) => updateLine(index, 'quantity', Number(e.target.value || 0))}
              />
              <Input
                className="h-9 rounded-xl bg-white dark:bg-slate-900"
                inputMode="decimal"
                placeholder="Unit cost"
                value={item.unitCost}
                onChange={(e) => updateLine(index, 'unitCost', Number(e.target.value || 0))}
              />
              <button
                type="button"
                title="Remove line"
                aria-label="Remove line"
                onClick={() => removeLine(index)}
                className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-rose-500 transition hover:bg-rose-50 dark:border-slate-700 dark:bg-slate-900"
              >
                <HiOutlineTrash className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Field label="Tax (%)">
          <Input className="h-9 rounded-xl" inputMode="decimal" value={draft.taxRate} onChange={(e) => update('taxRate', Number(e.target.value || 0))} />
        </Field>
        <Field label="Currency">
          <Select className="h-9 rounded-xl" value={draft.currency} onChange={(e) => update('currency', e.target.value)}>
            <option>PKR</option>
            <option>USD</option>
            <option>AED</option>
            <option>SAR</option>
            <option>INR</option>
          </Select>
        </Field>
        <Field label="Notes">
          <Input className="h-9 rounded-xl" value={draft.notes} onChange={(e) => update('notes', e.target.value)} />
        </Field>
      </div>

      <div className="mt-4 space-y-1 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-300">
          <span>Subtotal</span>
          <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(totals.subtotal, draft.currency)}</span>
        </div>
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-300">
          <span>Tax</span>
          <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(totals.tax, draft.currency)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200/80 pt-1 text-slate-900 dark:border-slate-800 dark:text-white">
          <span className="font-semibold">Total</span>
          <span className="font-bold text-sky-700 dark:text-sky-300">{formatCurrency(totals.total, draft.currency)}</span>
        </div>
      </div>
    </InventoryModal>
  )
}
