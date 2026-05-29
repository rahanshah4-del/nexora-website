import { AnimatePresence, motion } from 'framer-motion'
import { memo, useEffect, useState } from 'react'
import { HiOutlinePhoto, HiOutlineXMark } from 'react-icons/hi2'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'

const blankProduct = {
  imageUrl: '',
  name: '',
  sku: '',
  barcode: '',
  category: 'General',
  brand: '',
  costPrice: 0,
  price: 0,
  currency: 'PKR',
  taxRate: 0,
  discount: 0,
  stockQuantity: 0,
  minStockAlert: 5,
  productType: 'product',
  description: '',
  warehouse: '',
  branch: '',
  supplier: '',
  status: 'active',
}

function Field({ label, children, className = '' }) {
  return (
    <label className={className}>
      <span className="text-[11px] font-semibold text-slate-600">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

function ProductModal({ open, product, onClose, onSave }) {
  const [draft, setDraft] = useState(blankProduct)

  useEffect(() => {
    if (!open) return
    Promise.resolve().then(() => setDraft(product ? { ...blankProduct, ...product } : blankProduct))
  }, [open, product])

  useEffect(() => {
    if (!open) return undefined
    function handleEscape(event) {
      if (event.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  function update(key, value) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function handleImage(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => update('imageUrl', String(reader.result || ''))
    reader.readAsDataURL(file)
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex justify-end overflow-hidden bg-slate-950/35 p-2 backdrop-blur-sm sm:p-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            className="flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/80 bg-white shadow-[0_24px_90px_-40px_rgba(15,23,42,0.55)]"
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 32 }}
            transition={{ duration: 0.18 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 bg-white/95 px-4 py-3 sm:px-5">
              <div>
                <p className="text-base font-semibold text-slate-950">{product ? 'Edit Product' : 'Add Product'}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Configure inventory, billing, supplier, and branch details.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="purple" className="rounded-xl capitalize">{draft.productType}</Badge>
                <button
                  type="button"
                  title="Close"
                  aria-label="Close"
                  onClick={onClose}
                  className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  <HiOutlineXMark className="text-lg" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              <div className="grid gap-3 lg:grid-cols-[180px_1fr]">
                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-indigo-50/60 p-3">
                  <div className="grid aspect-square place-items-center overflow-hidden rounded-2xl border border-white bg-white shadow-sm">
                    {draft.imageUrl ? (
                      <img className="h-full w-full object-cover" src={draft.imageUrl} alt={draft.name || 'Product'} />
                    ) : (
                      <div className="grid place-items-center text-center text-slate-500">
                        <HiOutlinePhoto className="mx-auto text-3xl text-indigo-500" />
                        <span className="mt-2 block text-xs font-semibold">Product Image</span>
                      </div>
                    )}
                  </div>
                  <label className="mt-3 flex h-9 cursor-pointer items-center justify-center rounded-xl border border-indigo-100 bg-white text-xs font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50">
                    Upload Image
                    <input className="sr-only" type="file" accept="image/*" onChange={handleImage} />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Product Name *" className="sm:col-span-2">
                    <Input className="h-9 rounded-xl" value={draft.name} onChange={(event) => update('name', event.target.value)} />
                  </Field>
                  <Field label="SKU *">
                    <Input className="h-9 rounded-xl" value={draft.sku} onChange={(event) => update('sku', event.target.value)} />
                  </Field>
                  <Field label="Barcode">
                    <Input className="h-9 rounded-xl" value={draft.barcode} onChange={(event) => update('barcode', event.target.value)} />
                  </Field>
                  <Field label="Category">
                    <Input className="h-9 rounded-xl" value={draft.category} onChange={(event) => update('category', event.target.value)} />
                  </Field>
                  <Field label="Brand">
                    <Input className="h-9 rounded-xl" value={draft.brand} onChange={(event) => update('brand', event.target.value)} />
                  </Field>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Cost Price">
                  <Input className="h-9 rounded-xl" inputMode="decimal" value={draft.costPrice} onChange={(event) => update('costPrice', Number(event.target.value || 0))} />
                </Field>
                <Field label="Selling Price">
                  <Input className="h-9 rounded-xl" inputMode="decimal" value={draft.price} onChange={(event) => update('price', Number(event.target.value || 0))} />
                </Field>
                <Field label="Tax (%)">
                  <Input className="h-9 rounded-xl" inputMode="decimal" value={draft.taxRate} onChange={(event) => update('taxRate', Number(event.target.value || 0))} />
                </Field>
                <Field label="Discount">
                  <Input className="h-9 rounded-xl" inputMode="decimal" value={draft.discount} onChange={(event) => update('discount', Number(event.target.value || 0))} />
                </Field>
                <Field label="Quantity">
                  <Input className="h-9 rounded-xl" inputMode="numeric" value={draft.stockQuantity} onChange={(event) => update('stockQuantity', Number(event.target.value || 0))} />
                </Field>
                <Field label="Min Stock Alert">
                  <Input className="h-9 rounded-xl" inputMode="numeric" value={draft.minStockAlert} onChange={(event) => update('minStockAlert', Number(event.target.value || 0))} />
                </Field>
                <Field label="Currency">
                  <Select className="h-9 rounded-xl" value={draft.currency} onChange={(event) => update('currency', event.target.value)}>
                    <option>PKR</option>
                    <option>USD</option>
                    <option>AED</option>
                    <option>SAR</option>
                    <option>INR</option>
                  </Select>
                </Field>
                <Field label="Product Type">
                  <Select className="h-9 rounded-xl" value={draft.productType} onChange={(event) => update('productType', event.target.value)}>
                    <option value="product">Product</option>
                    <option value="service">Service</option>
                    <option value="subscription">Subscription</option>
                    <option value="digital">Digital Product</option>
                  </Select>
                </Field>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Inventory</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <Field label="Warehouse">
                    <Input className="h-9 rounded-xl bg-white" value={draft.warehouse} onChange={(event) => update('warehouse', event.target.value)} />
                  </Field>
                  <Field label="Branch">
                    <Input className="h-9 rounded-xl bg-white" value={draft.branch} onChange={(event) => update('branch', event.target.value)} />
                  </Field>
                  <Field label="Supplier">
                    <Input className="h-9 rounded-xl bg-white" value={draft.supplier} onChange={(event) => update('supplier', event.target.value)} />
                  </Field>
                </div>
              </div>

              <Field label="Description" className="mt-4 block">
                <textarea
                  className="focus-ring min-h-24 w-full resize-y rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-sky-300"
                  value={draft.description}
                  onChange={(event) => update('description', event.target.value)}
                />
              </Field>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 bg-white px-4 py-3 sm:px-5">
              <p className="text-xs text-slate-500">Invoices deduct stock automatically after payment approval.</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="subtle" className="h-10 rounded-xl" type="button" onClick={onClose}>
                  Cancel
                </Button>
                <Button className="h-10 rounded-xl" type="button" onClick={() => onSave?.(draft)}>
                  {product ? 'Save Product' : 'Create Product'}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export default memo(ProductModal)
