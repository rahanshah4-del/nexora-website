import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import Input from '../ui/Input.jsx'
import Badge from '../ui/Badge.jsx'
import Select from '../ui/Select.jsx'
import CurrencySelector from './CurrencySelector.jsx'
import { formatCurrency } from '../../utils/format.js'

function calcSubtotal(items) {
  return items.reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0), 0)
}

function createBlankInvoice() {
  const due = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  const rand = Math.floor(1000 + Math.random() * 9000)
  return {
    invoiceNumber: `INV-${rand}`,
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    items: [{ productId: '', name: '', sku: '', qty: 1, price: 0 }],
    taxRate: 0,
    discount: 0,
    currency: 'PKR',
    status: 'Pending',
    dueDate: due,
    recurring: false,
    notes: '',
  }
}

export default function InvoiceModal({ open, mode = 'detail', invoice, currency, products = [], onClose, onCreate }) {
  const [draft, setDraft] = useState(invoice || null)
  const [newInvoice, setNewInvoice] = useState(() => createBlankInvoice())
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    if (invoice) Promise.resolve().then(() => setDraft(invoice))
    if (mode === 'create') Promise.resolve().then(() => setNewInvoice(createBlankInvoice()))
  }, [open, invoice, mode])

  const totals = useMemo(() => {
    const subtotal = calcSubtotal(newInvoice.items)
    const discount = Math.min(Number(newInvoice.discount || 0), subtotal)
    const taxableAmount = Math.max(subtotal - discount, 0)
    const taxAmount = taxableAmount * ((Number(newInvoice.taxRate) || 0) / 100)
    const total = taxableAmount + taxAmount
    return { subtotal, discount, taxableAmount, taxAmount, total }
  }, [newInvoice])

  function updateItem(index, patch) {
    setNewInvoice((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }))
  }

  function selectProduct(index, productId) {
    const product = products.find((item) => item.id === productId)
    if (!product) {
      updateItem(index, { productId: '', name: '', sku: '', price: 0 })
      return
    }
    setNewInvoice((current) => ({
      ...current,
      currency: product.currency || current.currency || 'PKR',
      items: current.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              productId: product.id,
              name: product.name,
              sku: product.sku,
              price: product.price,
            }
          : item,
      ),
    }))
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl"
          >
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-900 dark:text-white">
                    {mode === 'create' ? 'Create Invoice' : 'Invoice Detail'}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    PDF export and subscription billing are placeholders.
                  </p>
                </div>
                <Badge variant="purple">Invoice</Badge>
              </div>

              {mode === 'detail' && draft ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="glass-muted rounded-2xl p-4">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Invoice</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{draft.invoiceNumber}</p>
                  </div>
                  <div className="glass-muted rounded-2xl p-4">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Status</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{draft.status}</p>
                  </div>
                  <div className="glass-muted rounded-2xl p-4 sm:col-span-2">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Customer</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                      {draft.customerName} — {draft.customerEmail}
                    </p>
                  </div>
                  <div className="glass-muted rounded-2xl p-4">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Total</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(draft.total ?? draft.totalUsd ?? 0, draft.currency || currency || 'PKR')}
                    </p>
                  </div>
                  <div className="glass-muted rounded-2xl p-4">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Due</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{draft.dueDate}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Items</p>
                    <div className="mt-2 space-y-2">
                      {draft.items.map((it, idx) => (
                        <div key={idx} className="glass-muted flex items-center justify-between gap-3 rounded-2xl p-3">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">{it.name}</span>
                          <span className="text-xs text-slate-600 dark:text-slate-300">
                            {it.qty} × {formatCurrency(it.price ?? it.priceUsd ?? 0, draft.currency || currency || 'PKR')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : mode === 'create' ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Invoice Number</label>
                    <Input className="mt-1" value={newInvoice.invoiceNumber} onChange={(e) => setNewInvoice((s) => ({ ...s, invoiceNumber: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Currency</label>
                    <div className="mt-1">
                      <CurrencySelector value={newInvoice.currency} onChange={(v) => setNewInvoice((s) => ({ ...s, currency: v }))} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Customer Name</label>
                    <Input className="mt-1" value={newInvoice.customerName} onChange={(e) => setNewInvoice((s) => ({ ...s, customerName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Customer Email</label>
                    <Input className="mt-1" type="email" value={newInvoice.customerEmail} onChange={(e) => setNewInvoice((s) => ({ ...s, customerEmail: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Due Date</label>
                    <Input className="mt-1" type="date" value={newInvoice.dueDate} onChange={(e) => setNewInvoice((s) => ({ ...s, dueDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Tax Rate (%)</label>
                    <Input className="mt-1" inputMode="decimal" value={newInvoice.taxRate} onChange={(e) => setNewInvoice((s) => ({ ...s, taxRate: Number(e.target.value || 0) }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Discount</label>
                    <Input className="mt-1" inputMode="decimal" value={newInvoice.discount} onChange={(e) => setNewInvoice((s) => ({ ...s, discount: Number(e.target.value || 0) }))} />
                  </div>

                  <div className="sm:col-span-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Invoice Items</p>
                      <Button
                        variant="subtle"
                        className="rounded-xl px-3 py-2 text-xs"
                        type="button"
                        onClick={() => setNewInvoice((s) => ({ ...s, items: [...s.items, { productId: '', name: '', sku: '', qty: 1, price: 0 }] }))}
                      >
                        Add Item
                      </Button>
                    </div>
                    <div className="mt-2 space-y-2">
                      {newInvoice.items.map((item, index) => (
                        <div key={index} className="rounded-2xl border border-slate-200/80 bg-white/80 p-3">
                          <div className="grid gap-2 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_80px_110px_auto]">
                            <Select value={item.productId} onChange={(event) => selectProduct(index, event.target.value)}>
                              <option value="">Manual item</option>
                              {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.name} ({product.sku || 'No SKU'})
                                </option>
                              ))}
                            </Select>
                            <Input
                              value={item.name}
                              placeholder="Item name"
                              onChange={(event) => updateItem(index, { name: event.target.value })}
                            />
                            <Input
                              inputMode="numeric"
                              value={item.qty}
                              onChange={(event) => updateItem(index, { qty: Number(event.target.value || 0) })}
                            />
                            <Input
                              inputMode="decimal"
                              value={item.price}
                              onChange={(event) => updateItem(index, { price: Number(event.target.value || 0) })}
                            />
                            <Button
                              variant="ghost"
                              className="rounded-xl px-3 py-2 text-xs text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                              type="button"
                              onClick={() =>
                                setNewInvoice((s) => ({
                                  ...s,
                                  items: s.items.length > 1 ? s.items.filter((_, itemIndex) => itemIndex !== index) : s.items,
                                }))
                              }
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Totals</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-4">
                      <div className="glass-muted rounded-2xl p-3">
                        <p className="text-xs text-slate-600 dark:text-slate-300">Subtotal</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(totals.subtotal, newInvoice.currency)}</p>
                      </div>
                      <div className="glass-muted rounded-2xl p-3">
                        <p className="text-xs text-slate-600 dark:text-slate-300">Discount</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(totals.discount, newInvoice.currency)}</p>
                      </div>
                      <div className="glass-muted rounded-2xl p-3">
                        <p className="text-xs text-slate-600 dark:text-slate-300">Tax</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(totals.taxAmount, newInvoice.currency)}</p>
                      </div>
                      <div className="glass-muted rounded-2xl p-3">
                        <p className="text-xs text-slate-600 dark:text-slate-300">Total</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(totals.total, newInvoice.currency)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-2">
                {mode === 'create' ? (
                  <Button
                    className="rounded-2xl"
                    type="button"
                    disabled={submitting}
                    onClick={async () => {
                      setSubmitting(true)
                      const res = await onCreate?.({
                        ...newInvoice,
                        items: newInvoice.items.filter((item) => item.name || item.productId),
                        subtotal: totals.subtotal,
                        discount: totals.discount,
                        taxableAmount: totals.taxableAmount,
                        taxAmount: totals.taxAmount,
                        total: totals.total,
                        subtotalUsd: totals.subtotal,
                        taxAmountUsd: totals.taxAmount,
                        totalUsd: totals.total,
                        currency: newInvoice.currency,
                        status: 'Pending',
                        createdAt: new Date().toISOString().slice(0, 10),
                      })
                      setSubmitting(false)
                      if (res?.ok) onClose?.()
                    }}
                  >
                    {submitting ? 'Creating…' : 'Create'}
                  </Button>
                ) : null}
                <Button variant="subtle" className="rounded-2xl" type="button" onClick={onClose}>
                  Close
                </Button>
                <Button variant="ghost" className="rounded-2xl" type="button">
                  Export PDF (Placeholder)
                </Button>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
