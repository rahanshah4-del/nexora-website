import { useEffect, useMemo, useState } from 'react'
import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'
import InventoryModal, { Field } from './InventoryModal.jsx'
import { MOVEMENT_TYPES } from '../../hooks/useInventoryTransactions.js'

const blank = {
  productId: '',
  type: 'stock_in',
  quantity: 0,
  unitCost: 0,
  note: '',
  reference: '',
  fromBranch: '',
  toBranch: '',
}

// Stock-impacting movements available from the manual stock screen.
const MANUAL_TYPES = ['stock_in', 'stock_out', 'adjustment', 'opening', 'damaged', 'returned', 'transfer']

function toNumber(value, fallback = 0) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

export default function StockMovementModal({ open, products = [], presetType, presetProductId, onClose, onSave }) {
  const [draft, setDraft] = useState(blank)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    Promise.resolve().then(() => {
      setDraft({
        ...blank,
        type: presetType || 'stock_in',
        productId: presetProductId || '',
      })
      setError('')
      setSaving(false)
    })
  }, [open, presetType, presetProductId])

  const selectedProduct = useMemo(
    () => products.find((item) => item.id === draft.productId) || null,
    [products, draft.productId],
  )

  function update(key, value) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const config = MOVEMENT_TYPES[draft.type]
  const isAdjustment = config?.direction === 'set'
  const isTransfer = config?.direction === 'none'

  const previewQuantity = useMemo(() => {
    if (!selectedProduct) return null
    const current = toNumber(selectedProduct.stockQuantity)
    const qty = toNumber(draft.quantity)
    if (isAdjustment) return Math.max(0, qty)
    if (config?.direction === 1) return current + Math.abs(qty)
    if (config?.direction === -1) return Math.max(0, current - Math.abs(qty))
    return current
  }, [selectedProduct, draft.quantity, config, isAdjustment])

  async function handleSubmit() {
    if (!draft.productId) {
      setError('Select a product')
      return
    }
    if (!isAdjustment && toNumber(draft.quantity) <= 0) {
      setError('Quantity must be greater than zero')
      return
    }
    setSaving(true)
    const result = await onSave?.({
      ...draft,
      productName: selectedProduct?.name || '',
      sku: selectedProduct?.sku || '',
    })
    setSaving(false)
    if (result && result.ok === false) setError(result.error || 'Unable to record movement')
  }

  return (
    <InventoryModal
      open={open}
      title="Record Stock Movement"
      subtitle="Stock in/out, adjustments, opening, damaged, returns and transfers."
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel={saving ? 'Saving…' : 'Record Movement'}
      submitDisabled={saving}
      error={error}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Movement Type *">
          <Select className="h-9 rounded-xl" value={draft.type} onChange={(e) => update('type', e.target.value)}>
            {MANUAL_TYPES.map((type) => (
              <option key={type} value={type}>
                {MOVEMENT_TYPES[type].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Product *">
          <Select className="h-9 rounded-xl" value={draft.productId} onChange={(e) => update('productId', e.target.value)}>
            <option value="">Select product…</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} {product.sku ? `(${product.sku})` : ''} — {toNumber(product.stockQuantity)} in stock
              </option>
            ))}
          </Select>
        </Field>

        <Field label={isAdjustment ? 'New Quantity (set to) *' : 'Quantity *'}>
          <Input
            className="h-9 rounded-xl"
            inputMode="numeric"
            value={draft.quantity}
            onChange={(e) => update('quantity', Number(e.target.value || 0))}
          />
        </Field>
        <Field label="Unit Cost">
          <Input
            className="h-9 rounded-xl"
            inputMode="decimal"
            value={draft.unitCost}
            onChange={(e) => update('unitCost', Number(e.target.value || 0))}
          />
        </Field>

        {isTransfer ? (
          <>
            <Field label="From Branch / Warehouse">
              <Input className="h-9 rounded-xl" value={draft.fromBranch} onChange={(e) => update('fromBranch', e.target.value)} />
            </Field>
            <Field label="To Branch / Warehouse">
              <Input className="h-9 rounded-xl" value={draft.toBranch} onChange={(e) => update('toBranch', e.target.value)} />
            </Field>
          </>
        ) : null}

        <Field label="Reference">
          <Input className="h-9 rounded-xl" value={draft.reference} onChange={(e) => update('reference', e.target.value)} />
        </Field>
        <Field label="Note" className="sm:col-span-2">
          <Input className="h-9 rounded-xl" value={draft.note} onChange={(e) => update('note', e.target.value)} />
        </Field>
      </div>

      {selectedProduct ? (
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm dark:border-slate-800 dark:bg-white/5">
          <span className="text-slate-500 dark:text-slate-300">
            Current stock: <span className="font-semibold text-slate-900 dark:text-white">{toNumber(selectedProduct.stockQuantity)}</span>
          </span>
          {previewQuantity != null && !isTransfer ? (
            <span className="text-slate-500 dark:text-slate-300">
              After movement: <span className="font-semibold text-sky-700 dark:text-sky-300">{previewQuantity}</span>
            </span>
          ) : null}
        </div>
      ) : null}
    </InventoryModal>
  )
}
