import { AnimatePresence, motion } from 'framer-motion'
import { memo, useEffect, useState } from 'react'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Card from '../ui/Card.jsx'
import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'

const blankProduct = {
  name: '',
  sku: '',
  category: 'General',
  price: 0,
  currency: 'PKR',
  stockQuantity: 0,
  status: 'active',
}

function ProductModal({ open, product, onClose, onSave }) {
  const [draft, setDraft] = useState(blankProduct)

  useEffect(() => {
    if (!open) return
    Promise.resolve().then(() => setDraft(product ? { ...blankProduct, ...product } : blankProduct))
  }, [open, product])

  function update(key, value) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            className="crm-modal-panel"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            transition={{ duration: 0.18 }}
            onClick={(event) => event.stopPropagation()}
          >
            <Card className="rounded-3xl p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-900 dark:text-white">
                    {product ? 'Edit Product' : 'Add Product'}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Products are saved to this workspace and can be used on invoices.
                  </p>
                </div>
                <Badge variant="purple">Product</Badge>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Product Name *</label>
                  <Input className="mt-1" value={draft.name} onChange={(event) => update('name', event.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">SKU *</label>
                  <Input className="mt-1" value={draft.sku} onChange={(event) => update('sku', event.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Category</label>
                  <Input className="mt-1" value={draft.category} onChange={(event) => update('category', event.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Currency</label>
                  <Select className="mt-1" value={draft.currency} onChange={(event) => update('currency', event.target.value)}>
                    <option>PKR</option>
                    <option>USD</option>
                    <option>AED</option>
                    <option>SAR</option>
                    <option>INR</option>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Price</label>
                  <Input
                    className="mt-1"
                    inputMode="decimal"
                    value={draft.price}
                    onChange={(event) => update('price', Number(event.target.value || 0))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Stock Quantity</label>
                  <Input
                    className="mt-1"
                    inputMode="numeric"
                    value={draft.stockQuantity}
                    onChange={(event) => update('stockQuantity', Number(event.target.value || 0))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Status</label>
                  <Select className="mt-1" value={draft.status} onChange={(event) => update('status', event.target.value)}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </Select>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button className="rounded-2xl" type="button" onClick={() => onSave?.(draft)}>
                  {product ? 'Save Product' : 'Create Product'}
                </Button>
                <Button variant="subtle" className="rounded-2xl" type="button" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export default memo(ProductModal)
